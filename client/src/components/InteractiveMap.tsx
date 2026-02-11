import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  memo,
  useCallback,
} from "react";
import { District } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import { calculateDistrictStats, DistrictStats } from "@/utils/districtStats";
import { ViewState } from "@/types/viewModes";
import { DISTRICT_REGION_MAP } from "@/lib/regions";
import { usePublicAuth } from "@/_core/hooks/usePublicAuth";
import { useIsMobile } from "@/hooks/useIsMobile";

// Scope filter type for map filtering
type ScopeLevel = "NATIONAL" | "REGION" | "DISTRICT";

interface InteractiveMapProps {
  districts: District[];
  selectedDistrictId: string | null;
  onDistrictSelect: (districtId: string) => void;
  onBackgroundClick?: () => void;
  onNationalClick?: () => void;
  viewState?: ViewState; // Optional for backward compatibility
  scopeFilter?: ScopeLevel; // Filter map display by scope level
  userRegionId?: string | null; // User's region for REGION scope filtering
  userDistrictId?: string | null; // User's district for DISTRICT scope filtering
}

// Base region label positions - closest to map (for 1 metric active)
// The map roughly occupies: x: 180-880, y: 120-500 in the 960x600 viewBox
const baseRegionPositions: Record<
  string,
  {
    baseX: number;
    baseY: number;
    labelDirection: "above" | "below" | "left" | "right";
  }
> = {
  // TOP ROW - pushed away from map edge to prevent overlap
  Northwest: { baseX: 200, baseY: 80, labelDirection: "above" },
  "Big Sky": { baseX: 380, baseY: 80, labelDirection: "above" },
  "Great Plains North": { baseX: 540, baseY: 80, labelDirection: "above" },
  "Great Plains South": { baseX: 680, baseY: 80, labelDirection: "above" },
  "Great Lakes": { baseX: 780, baseY: 100, labelDirection: "above" },

  // RIGHT SIDE - pushed away from map edge
  Northeast: { baseX: 900, baseY: 200, labelDirection: "right" },
  "Mid-Atlantic": { baseX: 900, baseY: 330, labelDirection: "right" },
  Southeast: { baseX: 915, baseY: 470, labelDirection: "right" },

  // LEFT SIDE - pushed away from map edge
  "West Coast": { baseX: 100, baseY: 300, labelDirection: "left" },

  // BOTTOM ROW - closer to map edge
  Texico: { baseX: 400, baseY: 470, labelDirection: "below" },
  "South Central": { baseX: 640, baseY: 470, labelDirection: "below" },
};

// Map boundaries (from comment: x: 180-880, y: 120-500 in 960x600 viewBox)
const MAP_BOUNDS = {
  left: 180,
  right: 880,
  top: 120,
  bottom: 500,
  viewBoxHeight: 600,
};

const DEFAULT_VIEWBOX = "0 0 960 600";

const parseViewBox = (svgText: string) => {
  const match = svgText.match(/viewBox="([^"]+)"/);
  if (!match) return null;
  const [minX, minY, width, height] = match[1].trim().split(/\s+/).map(Number);
  if ([minX, minY, width, height].some(Number.isNaN)) return null;
  return { minX, minY, width, height };
};

// Metric label bounds for collision detection
interface MetricBounds {
  region: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: "above" | "below" | "left" | "right";
}

// Check if two bounds overlap
const boundsOverlap = (a: MetricBounds, b: MetricBounds): boolean => {
  const padding = 0; // No extra spacing between labels
  return !(
    a.x + a.width + padding < b.x ||
    b.x + b.width + padding < a.x ||
    a.y + a.height + padding < b.y ||
    b.y + b.height + padding < a.y
  );
};

// Calculate metric bounds from position
const getMetricBounds = (
  region: string,
  labelX: number,
  labelY: number,
  totalHeight: number,
  direction: "above" | "below" | "left" | "right"
): MetricBounds => {
  const metricWidth = 80;
  const metricHeight = totalHeight;

  let x = labelX - metricWidth / 2;
  let y = labelY - metricHeight / 2;
  let width = metricWidth;
  let height = metricHeight;

  // Adjust based on direction to include the full label area
  if (direction === "above") {
    y = labelY - metricHeight;
    height = metricHeight;
  } else if (direction === "below") {
    y = labelY;
    height = metricHeight;
  } else if (direction === "left") {
    x = labelX - metricWidth;
    width = metricWidth;
  } else if (direction === "right") {
    x = labelX;
    width = metricWidth;
  }

  return { region, x, y, width, height, direction };
};

// Resolve collisions by shifting positions intelligently
const resolveCollisions = (
  bounds: MetricBounds[],
  basePositions: Record<
    string,
    {
      baseX: number;
      baseY: number;
      labelDirection: "above" | "below" | "left" | "right";
    }
  >
): MetricBounds[] => {
  const resolved = bounds.map(b => ({ ...b }));
  const maxIterations = 30;
  const shiftStep = 3;
  const minSpacing = 0;

  // Store center positions for easier manipulation
  const centers: Array<{
    x: number;
    y: number;
    region: string;
    direction: string;
  }> = resolved.map(b => ({
    x: b.x + b.width / 2,
    y: b.y + b.height / 2,
    region: b.region,
    direction: b.direction,
  }));

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasCollision = false;

    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        if (boundsOverlap(resolved[i], resolved[j])) {
          hasCollision = true;
          const baseI = basePositions[resolved[i].region];
          const baseJ = basePositions[resolved[j].region];
          if (!baseI || !baseJ) continue;

          // Calculate overlap amount
          const overlapX = Math.min(
            resolved[i].x + resolved[i].width - resolved[j].x,
            resolved[j].x + resolved[j].width - resolved[i].x
          );
          const overlapY = Math.min(
            resolved[i].y + resolved[i].height - resolved[j].y,
            resolved[j].y + resolved[j].height - resolved[i].y
          );

          // Determine shift direction based on label direction and overlap
          let shiftIX = 0,
            shiftIY = 0,
            shiftJX = 0,
            shiftJY = 0;

          // For labels in same direction, shift them apart
          if (baseI.labelDirection === baseJ.labelDirection) {
            if (
              baseI.labelDirection === "above" ||
              baseI.labelDirection === "below"
            ) {
              // Shift horizontally
              const dx = centers[j].x - centers[i].x;
              if (Math.abs(dx) < minSpacing) {
                shiftIX = -shiftStep;
                shiftJX = shiftStep;
              } else {
                shiftIX = dx > 0 ? -shiftStep : shiftStep;
                shiftJX = dx > 0 ? shiftStep : -shiftStep;
              }
            } else {
              // Shift vertically
              const dy = centers[j].y - centers[i].y;
              if (Math.abs(dy) < minSpacing) {
                shiftIY = -shiftStep;
                shiftJY = shiftStep;
              } else {
                shiftIY = dy > 0 ? -shiftStep : shiftStep;
                shiftJY = dy > 0 ? shiftStep : -shiftStep;
              }
            }
          } else {
            // Different directions - shift perpendicular to avoid map
            if (
              baseI.labelDirection === "above" ||
              baseI.labelDirection === "below"
            ) {
              shiftIX =
                overlapX > overlapY
                  ? centers[j].x > centers[i].x
                    ? -shiftStep
                    : shiftStep
                  : 0;
              shiftIY =
                overlapX <= overlapY
                  ? centers[j].y > centers[i].y
                    ? -shiftStep
                    : shiftStep
                  : 0;
            } else {
              shiftIX =
                overlapX <= overlapY
                  ? centers[j].x > centers[i].x
                    ? -shiftStep
                    : shiftStep
                  : 0;
              shiftIY =
                overlapX > overlapY
                  ? centers[j].y > centers[i].y
                    ? -shiftStep
                    : shiftStep
                  : 0;
            }
          }

          // Apply shifts
          centers[i].x += shiftIX;
          centers[i].y += shiftIY;
          centers[j].x += shiftJX;
          centers[j].y += shiftJY;

          // Recalculate bounds from centers
          resolved[i] = getMetricBounds(
            resolved[i].region,
            centers[i].x,
            centers[i].y,
            resolved[i].height,
            resolved[i].direction as "above" | "below" | "left" | "right"
          );
          resolved[j] = getMetricBounds(
            resolved[j].region,
            centers[j].x,
            centers[j].y,
            resolved[j].height,
            resolved[j].direction as "above" | "below" | "left" | "right"
          );
        }
      }
    }

    if (!hasCollision) break;
  }

  return resolved;
};

// Dynamic positioning function with collision detection
const getDynamicPosition = (
  region: string,
  activeMetricCount: number,
  totalHeight: number,
  allRegions: string[],
  allTotalHeights: Record<string, number>
): {
  labelX: number;
  labelY: number;
  labelDirection: "above" | "below" | "left" | "right";
} => {
  const base = baseRegionPositions[region];
  if (!base) return { labelX: 0, labelY: 0, labelDirection: "above" };

  let labelX = base.baseX;
  let labelY = base.baseY;

  const isBottomRegion = region === "Texico" || region === "South Central";

  // Calculate metric bounds
  const metricWidth = 80;
  const metricPadding = 0; // No extra padding from map edge
  const textHeight = totalHeight;

  // Check if metrics would overlap with map and calculate required offset
  let requiredOffset = 0;

  switch (base.labelDirection) {
    case "above": {
      const metricBottom = labelY + textHeight / 2;
      if (metricBottom > MAP_BOUNDS.top - metricPadding) {
        requiredOffset = metricBottom - (MAP_BOUNDS.top - metricPadding);
      }
      labelY -= requiredOffset;
      break;
    }
    case "below": {
      const metricTop = labelY - textHeight / 2;
      const wouldTouchMap = metricTop < MAP_BOUNDS.bottom + metricPadding;
      const wouldGoOffScreen =
        labelY + textHeight / 2 > MAP_BOUNDS.viewBoxHeight - 15;

      if (wouldGoOffScreen) {
        requiredOffset =
          labelY + textHeight / 2 - (MAP_BOUNDS.viewBoxHeight - 15);
        labelY -= requiredOffset;
      } else if (wouldTouchMap) {
        requiredOffset = MAP_BOUNDS.bottom + metricPadding - metricTop;
        labelY += requiredOffset;
      }
      break;
    }
    case "right": {
      const metricLeft = labelX - metricWidth / 2;
      if (metricLeft < MAP_BOUNDS.right + metricPadding) {
        requiredOffset = MAP_BOUNDS.right + metricPadding - metricLeft;
      }
      labelX += requiredOffset;
      break;
    }
    case "left": {
      const metricRight = labelX + metricWidth / 2;
      if (metricRight > MAP_BOUNDS.left - metricPadding) {
        requiredOffset = metricRight - (MAP_BOUNDS.left - metricPadding);
      }
      labelX -= requiredOffset;
      break;
    }
  }

  // Now check for collisions with other regions
  const allBounds: MetricBounds[] = [];

  // First, calculate all initial positions
  allRegions.forEach(r => {
    const rBase = baseRegionPositions[r];
    if (!rBase) return;

    let rX = rBase.baseX;
    let rY = rBase.baseY;
    const rHeight = allTotalHeights[r] || 0;

    // Apply map boundary adjustments
    let rOffset = 0;
    switch (rBase.labelDirection) {
      case "above": {
        const rMetricBottom = rY + rHeight / 2;
        if (rMetricBottom > MAP_BOUNDS.top - metricPadding) {
          rOffset = rMetricBottom - (MAP_BOUNDS.top - metricPadding);
        }
        rY -= rOffset;
        break;
      }
      case "below": {
        const rMetricTop = rY - rHeight / 2;
        const rWouldTouchMap = rMetricTop < MAP_BOUNDS.bottom + metricPadding;
        const rWouldGoOffScreen =
          rY + rHeight / 2 > MAP_BOUNDS.viewBoxHeight - 15;
        if (rWouldGoOffScreen) {
          rOffset = rY + rHeight / 2 - (MAP_BOUNDS.viewBoxHeight - 15);
          rY -= rOffset;
        } else if (rWouldTouchMap) {
          rOffset = MAP_BOUNDS.bottom + metricPadding - rMetricTop;
          rY += rOffset;
        }

        // Extra clamp ONLY for bottom regions so their stacks don't go off-screen.
        if (r === "Texico" || r === "South Central") {
          const rLineHeight = activeMetricCount === 1 ? 26 : 22;
          const rLastBaseline = rY + (activeMetricCount - 1) * rLineHeight;
          const rMaxBaseline = MAP_BOUNDS.viewBoxHeight - 18;
          if (rLastBaseline > rMaxBaseline) {
            rY -= rLastBaseline - rMaxBaseline;
          }
        }
        break;
      }
      case "right": {
        const rMetricLeft = rX - metricWidth / 2;
        if (rMetricLeft < MAP_BOUNDS.right + metricPadding) {
          rOffset = MAP_BOUNDS.right + metricPadding - rMetricLeft;
        }
        rX += rOffset;
        break;
      }
      case "left": {
        const rMetricRight = rX + metricWidth / 2;
        if (rMetricRight > MAP_BOUNDS.left - metricPadding) {
          rOffset = rMetricRight - (MAP_BOUNDS.left - metricPadding);
        }
        rX -= rOffset;
        break;
      }
    }

    allBounds.push(getMetricBounds(r, rX, rY, rHeight, rBase.labelDirection));
  });

  // Resolve collisions
  const resolvedBounds = resolveCollisions(allBounds, baseRegionPositions);

  // Find the resolved position for this region
  const resolved = resolvedBounds.find(b => b.region === region);
  if (resolved) {
    labelX = resolved.x + resolved.width / 2;
    labelY = resolved.y + resolved.height / 2;
  }

  // Final clamp ONLY for bottom regions.
  if (
    isBottomRegion &&
    base.labelDirection === "below" &&
    activeMetricCount > 0
  ) {
    const lineHeight = activeMetricCount === 1 ? 26 : 22;
    const lastBaseline = labelY + (activeMetricCount - 1) * lineHeight;
    const maxBaseline = MAP_BOUNDS.viewBoxHeight - 18;
    if (lastBaseline > maxBaseline) {
      labelY -= lastBaseline - maxBaseline;
    }
  }

  return { labelX, labelY, labelDirection: base.labelDirection };
};

// District centroids for pie chart positioning (based on new SVG)
const districtCentroids: Record<string, { x: number; y: number }> = {
  Alabama: { x: 646, y: 376 },
  Alaska: { x: 110, y: 92 },
  Appalachian: { x: 707, y: 266 },
  Arizona: { x: 284, y: 330 },
  Arkansas: { x: 577, y: 333 },
  Colorado: { x: 406, y: 274 },
  Georgia: { x: 698, y: 363 },
  Hawaii: { x: 122, y: 380 },
  Illinois: { x: 600, y: 254 },
  Indiana: { x: 638, y: 257 },
  Iowa: { x: 560, y: 216 },
  Kansas: { x: 498, y: 274 },
  Kentucky: { x: 645, y: 279 },
  Louisiana: { x: 585, y: 408 },
  Michigan: { x: 649, y: 166 },
  Minnesota: { x: 543, y: 133 },
  Mississippi: { x: 602, y: 373 },
  Montana: { x: 322, y: 134 },
  Nebraska: { x: 475, y: 223 },
  NewJersey: { x: 781, y: 223 },
  NewMexico: { x: 370, y: 353 },
  NewYork: { x: 762, y: 178 },
  NorthCarolina: { x: 742, y: 302 },
  NorthDakota: { x: 478, y: 126 },
  "NorthernCal-Nevada": { x: 199, y: 246 },
  NorthernNewEnglend: { x: 818, y: 122 },
  NorthernNewEngland: { x: 818, y: 122 },
  NorthernMissouri: { x: 557, y: 262 },
  NorthTexas: { x: 501, y: 367 },
  Ohio: { x: 686, y: 235 },
  Oklahoma: { x: 494, y: 335 },
  Oregon: { x: 230, y: 139 },
  PeninsularFlorida: { x: 725, y: 428 },
  "Penn-Del": { x: 750, y: 207 },
  Potomac: { x: 757, y: 254 },
  SouthCarolina: { x: 719, y: 337 },
  SouthDakota: { x: 480, y: 185 },
  SouthernCalifornia: { x: 228, y: 313 },
  SouthernNewEngland: { x: 806, y: 180 },
  SouthIdaho: { x: 299, y: 156 },
  SouthernMissouri: { x: 581, y: 291 },
  SouthTexas: { x: 503, y: 430 },
  Tennessee: { x: 650, y: 312 },
  Utah: { x: 323, y: 239 },
  Washington: { x: 238, y: 100 },
  WestFlorida: { x: 666, y: 401 },
  WestTexas: { x: 422, y: 390 },
  "Wisconsin-NorthMichigan": { x: 597, y: 154 },
  Wyoming: { x: 377, y: 195 },
};

export const InteractiveMap = memo(function InteractiveMap({
  districts,
  selectedDistrictId,
  onDistrictSelect,
  onBackgroundClick,
  onNationalClick,
  viewState,
  scopeFilter = "NATIONAL",
  userRegionId,
  userDistrictId,
}: InteractiveMapProps) {
  const { isAuthenticated } = usePublicAuth();
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const visualContainerRef = useRef<HTMLDivElement>(null);
  const pieContainerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );

  // Zoom viewBox for scope filtering - null means use default "0 0 960 600"
  const [zoomViewBox, setZoomViewBox] = useState<string | null>(null);
  const originalViewBox = useMemo(() => parseViewBox(svgContent), [svgContent]);

  // Filter districts based on scope
  const filteredDistricts = useMemo(() => {
    if (scopeFilter === "NATIONAL") {
      return districts; // Show all
    }
    if (scopeFilter === "REGION" && userRegionId) {
      // Show only districts in user's region
      return districts.filter(d => {
        const districtRegion = d.region || DISTRICT_REGION_MAP[d.id];
        return districtRegion === userRegionId;
      });
    }
    if (scopeFilter === "DISTRICT" && userDistrictId) {
      // Show only user's district
      return districts.filter(d => d.id === userDistrictId);
    }
    // Default to all if no valid filter
    return districts;
  }, [districts, scopeFilter, userRegionId, userDistrictId]);

  // Metric toggles state
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(new Set());
  const [metricsExpanded, setMetricsExpanded] = useState(true);

  // Line width matches the label above (Chi Alpha / region name)
  const labelRef = useRef<HTMLSpanElement>(null);
  const [labelWidthPx, setLabelWidthPx] = useState(0);
  useLayoutEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setLabelWidthPx(el.offsetWidth);
    });
    ro.observe(el);
    // Initial measurement
    setLabelWidthPx(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // Hovered region for metric labels (shows region name on hover)
  const [hoveredRegionLabel, setHoveredRegionLabel] = useState<string | null>(
    null
  );

  // Protected queries: only run when authenticated (public map uses aggregate endpoints)
  const { data: allPeople = [] } = trpc.people.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch all campuses to count campuses per district
  const { data: allCampuses = [] } = trpc.campuses.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch metrics from server for accurate totals
  const { data: serverMetrics } = trpc.metrics.get.useQuery();

  // Fetch aggregate needs summary (public - no person identifiers)
  const { data: needsAggregate } = trpc.metrics.needsAggregate.useQuery();

  // Fetch aggregate district and region metrics (public - everyone can see these)
  // These must be declared BEFORE useMemo hooks that use them
  const { data: allDistrictMetrics = [] } =
    trpc.metrics.allDistricts.useQuery();
  const { data: allRegionMetrics = [] } = trpc.metrics.allRegions.useQuery();

  // Calculate national totals - ensure all people are counted accurately
  // Total should be the sum of all statuses (each person belongs to exactly one status)
  const nationalTotals = useMemo(() => {
    // If allPeople is empty (not logged in or no scope), fall back to regional metrics
    // Sum up all regional metrics to get national totals (public endpoint, works for everyone)
    if (allPeople.length === 0 && allRegionMetrics.length > 0) {
      let yes = 0;
      let maybe = 0;
      let no = 0;
      let notInvited = 0;

      allRegionMetrics.forEach(metric => {
        yes += metric.going;
        maybe += metric.maybe;
        no += metric.notGoing;
        notInvited += metric.notInvited;
      });

      const total = yes + maybe + no + notInvited;
      const invited = yes + maybe + no;

      return {
        yes,
        maybe,
        no,
        notInvited,
        total,
        invited,
      };
    }

    // Count each person exactly once in the appropriate status bucket
    let yes = 0;
    let maybe = 0;
    let no = 0;
    let notInvited = 0;

    allPeople.forEach(person => {
      const status = person.status || "Not Invited";
      switch (status) {
        case "Yes":
          yes++;
          break;
        case "Maybe":
          maybe++;
          break;
        case "No":
          no++;
          break;
        case "Not Invited":
        default:
          // Handle null, undefined, or "Not Invited" status
          notInvited++;
          break;
      }
    });

    const invited = yes + maybe + no;
    // Total is the sum of all statuses - each person belongs to exactly one status
    const total = yes + maybe + no + notInvited;

    // Verify totals match allPeople.length (should always be true)
    if (total !== allPeople.length) {
      console.warn(
        `[Metrics] Total mismatch: sum of statuses ${total}, actual people count ${allPeople.length}.`
      );
    }

    // Use server metrics if available and totals match
    if (serverMetrics) {
      const serverYes = serverMetrics.going || 0;
      const serverMaybe = serverMetrics.maybe || 0;
      const serverNo = serverMetrics.notGoing || 0;
      const serverNotInvited = serverMetrics.notInvited || 0;
      const serverTotal = serverYes + serverMaybe + serverNo + serverNotInvited;
      const serverInvited = serverYes + serverMaybe + serverNo;

      // Use server metrics if they sum correctly
      if (serverTotal === total || serverTotal === allPeople.length) {
        return {
          yes: serverYes,
          maybe: serverMaybe,
          no: serverNo,
          notInvited: serverNotInvited,
          total: serverTotal, // Use sum of statuses from server
          invited: serverInvited,
        };
      }
    }

    return {
      yes,
      maybe,
      no,
      notInvited,
      total, // Sum of all statuses
      invited,
    };
  }, [allPeople, serverMetrics, allRegionMetrics]);

  const showPublicPlaceholder =
    !isAuthenticated && allRegionMetrics.length === 0;
  const showOverlayPlaceholder =
    !isAuthenticated && allDistrictMetrics.length === 0;
  const invitedPercent =
    nationalTotals.total > 0
      ? Math.round((nationalTotals.invited / nationalTotals.total) * 100)
      : 0;

  // Calculate days until CMC
  const cmcDate = new Date("2026-07-06");
  const today = new Date();
  const daysUntilCMC = Math.abs(
    Math.ceil((cmcDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Calculate regional totals using aggregate metrics (preferred) or fallback to allPeople
  // Everyone can see regional aggregate numbers
  const regionalTotals = useMemo(() => {
    const totals: Record<string, typeof nationalTotals> = {};

    // Use aggregate region metrics if available (works for everyone)
    if (allRegionMetrics.length > 0) {
      for (const metric of allRegionMetrics) {
        totals[metric.region] = {
          yes: metric.going,
          maybe: metric.maybe,
          no: metric.notGoing,
          notInvited: metric.notInvited,
          total: metric.total,
          invited: metric.going + metric.maybe + metric.notGoing,
        };
      }
    } else {
      // Fallback to calculating from allPeople (for authenticated users with scope)
      // Initialize all regions from districts in database
      districts.forEach(district => {
        if (district.region && !totals[district.region]) {
          totals[district.region] = {
            yes: 0,
            maybe: 0,
            no: 0,
            notInvited: 0,
            total: 0,
            invited: 0,
          };
        }
      });

      // Also initialize regions from the constant DISTRICT_REGION_MAP (for districts not yet in database)
      Object.values(DISTRICT_REGION_MAP).forEach(region => {
        if (!totals[region]) {
          totals[region] = {
            yes: 0,
            maybe: 0,
            no: 0,
            notInvited: 0,
            total: 0,
            invited: 0,
          };
        }
      });

      // Group people by region using district lookup
      // Use both database districts and the constant mapping
      const DISTRICT_REGION_MAPLocal = new Map<string, string>();
      districts.forEach(district => {
        if (district.region) {
          DISTRICT_REGION_MAPLocal.set(district.id, district.region);
        }
      });
      // Add districts from constant mapping (for districts not yet in database)
      Object.entries(DISTRICT_REGION_MAP).forEach(([districtId, region]) => {
        if (!DISTRICT_REGION_MAPLocal.has(districtId)) {
          DISTRICT_REGION_MAPLocal.set(districtId, region);
        }
      });

      // Count people by region and status
      allPeople.forEach(person => {
        const districtId = person.primaryDistrictId;
        if (!districtId) return; // Skip people without a district

        const region = DISTRICT_REGION_MAPLocal.get(districtId);
        if (!region || !totals[region]) return; // Skip if no region or region not initialized

        // Count this person in the appropriate status bucket
        const status = person.status || "Not Invited";
        switch (status) {
          case "Yes":
            totals[region].yes++;
            totals[region].invited++;
            break;
          case "Maybe":
            totals[region].maybe++;
            totals[region].invited++;
            break;
          case "No":
            totals[region].no++;
            totals[region].invited++;
            break;
          case "Not Invited":
          default:
            // Handle null, undefined, or "Not Invited" status
            totals[region].notInvited++;
            break;
        }
        totals[region].total++;
      });

      // Recalculate totals as sum of statuses for each region to ensure accuracy
      Object.keys(totals).forEach(region => {
        const regionTotals = totals[region];
        regionTotals.total =
          regionTotals.yes +
          regionTotals.maybe +
          regionTotals.no +
          regionTotals.notInvited;
        regionTotals.invited =
          regionTotals.yes + regionTotals.maybe + regionTotals.no;
      });
    }

    return totals;
  }, [districts, allPeople, allRegionMetrics, nationalTotals.total]);

  // Calculate stats for each district using aggregate metrics (preferred) or fallback to allPeople
  const districtStats = useMemo(() => {
    const stats: Record<string, DistrictStats> = {};

    // Use aggregate metrics if available (works for everyone, even without people.list access)
    if (allDistrictMetrics.length > 0) {
      for (const metric of allDistrictMetrics) {
        stats[metric.districtId] = {
          yes: metric.going,
          maybe: metric.maybe,
          no: metric.notGoing,
          notInvited: metric.notInvited,
          total: metric.total,
        };
      }
    } else if (isAuthenticated) {
      // Fallback to calculating from allPeople (for authenticated users with scope)
      districts.forEach(district => {
        stats[district.id] = calculateDistrictStats(allPeople, district.id);
      });
    }

    return stats;
  }, [districts, allPeople, allDistrictMetrics, isAuthenticated]);

  // Get displayed totals based on hover state and scope filter
  // Returns the same shape as nationalTotals (includes 'invited' field)
  const getDisplayedTotals = (): typeof nationalTotals => {
    // If hovering over a region, show that region's totals (or zeros if no data)
    if (hoveredRegion) {
      return (
        regionalTotals[hoveredRegion] ?? {
          yes: 0,
          maybe: 0,
          no: 0,
          notInvited: 0,
          total: 0,
          invited: 0,
        }
      );
    }
    // If in REGION scope, show that region's totals
    if (
      scopeFilter === "REGION" &&
      userRegionId &&
      regionalTotals[userRegionId]
    ) {
      return regionalTotals[userRegionId];
    }
    // If in DISTRICT scope, show that district's totals
    if (
      scopeFilter === "DISTRICT" &&
      userDistrictId &&
      districtStats[userDistrictId]
    ) {
      const stats = districtStats[userDistrictId];
      return {
        ...stats,
        invited: stats.yes + stats.maybe + stats.no,
      };
    }
    // Default to national totals
    return nationalTotals;
  };
  const displayedTotals = getDisplayedTotals();

  // Determine the label to display:
  // - If hovering over a region, show that region name
  // - If in REGION scope filter, show user's region name
  // - If in DISTRICT scope filter, show user's district name
  // - Otherwise show "Chi Alpha"
  const getDisplayLabel = (): string => {
    if (hoveredRegion) return hoveredRegion;
    if (scopeFilter === "REGION" && userRegionId) return userRegionId;
    if (scopeFilter === "DISTRICT" && userDistrictId) return userDistrictId;
    return "Chi Alpha";
  };
  const displayedLabel = getDisplayLabel();

  const toggleMetric = (metric: string) => {
    setActiveMetrics(prev => {
      const next = new Set(prev);
      if (next.has(metric)) {
        next.delete(metric);
      } else {
        next.add(metric);
      }
      return next;
    });
  };

  const clearAllMetrics = () => {
    setActiveMetrics(new Set());
  };

  useEffect(() => {
    // Load SVG content
    fetch("/map.svg")
      .then(res => res.text())
      .then(svg => setSvgContent(svg))
      .catch(err => console.error("Failed to load map:", err));
  }, []);

  useEffect(() => {
    if (!svgContent || !svgContainerRef.current || !visualContainerRef.current)
      return;

    // Setup click layer (invisible)
    const clickContainer = svgContainerRef.current;
    clickContainer.innerHTML = svgContent;

    // Setup visual layer (what user sees)
    const visualContainer = visualContainerRef.current;
    visualContainer.innerHTML = svgContent;

    const clickSvg = clickContainer.querySelector("svg");
    const visualSvg = visualContainer.querySelector("svg");
    if (!clickSvg || !visualSvg) return;

    // Make both SVGs responsive and properly scaled
    [clickSvg, visualSvg].forEach(svg => {
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.style.display = "block";
      svg.style.maxWidth = "100%";
      svg.style.maxHeight = "100%";
    });

    const applyMapScale = (svg: SVGSVGElement) => {
      if (!originalViewBox) return;
      const key = `${originalViewBox.minX},${originalViewBox.minY},${originalViewBox.width},${originalViewBox.height}`;
      if (svg.dataset.mapScaleKey === key) return;

      const targetWidth = 960;
      const targetHeight = 600;
      const scaleX = targetWidth / originalViewBox.width;
      const scaleY = targetHeight / originalViewBox.height;
      const translateX = -originalViewBox.minX;
      const translateY = -originalViewBox.minY;

      const group =
        svg.querySelector('g[inkscape\\:label="Districts"]') ||
        svg.querySelector("g");
      if (!group) return;

      group.setAttribute(
        "transform",
        `translate(${translateX} ${translateY}) scale(${scaleX} ${scaleY})`
      );
      svg.dataset.mapScaleKey = key;
    };

    applyMapScale(clickSvg);
    applyMapScale(visualSvg);

    // Get all path elements from both SVGs
    const clickPaths = clickSvg.querySelectorAll("path");
    const visualPaths = visualSvg.querySelectorAll("path");

    const getPathId = (p: Element): string =>
      p.getAttribute("inkscape:label") ||
      p.getAttributeNS(
        "http://www.inkscape.org/namespaces/inkscape",
        "label"
      ) ||
      p.getAttribute("id") ||
      "";
    const pathOrder = Array.from(visualPaths).map(getPathId);
    const movedPathRef: {
      current: {
        path: SVGPathElement;
        parent: Element;
        originalIndex: number;
      } | null;
    } = { current: null };

    // Regional color mapping – deeper, richer palette with slight brightness
    // Goal: refined colors with more depth and richness, slightly brighter
    const regionColors: Record<string, string> = {
      Northwest: "#6295AA", // slightly brighter coastal blue
      "Big Sky": "#8F8257", // slightly brighter warm stone
      "Great Plains North": "#645978", // slightly brighter purple
      "Great Lakes": "#56819B", // slightly brighter steel blue
      "Great Plains South": "#B0944E", // slightly brighter golden wheat
      "Mid-Atlantic": "#A8705C", // slightly brighter terracotta clay
      Northeast: "#AB5470", // slightly brighter rose
      "South Central": "#9F5A57", // slightly brighter brick
      Southeast: "#568969", // slightly brighter sage
      Texico: "#9F588A", // slightly brighter pink-purple magenta
      "West Coast": "#A77649", // slightly brighter warm amber
    };

    // District-specific colors for region/district scope views
    // Used when zoomed into a region to differentiate districts
    // Keys must match district IDs in DISTRICT_REGION_MAP (camelCase)
    // Each region has its own unique palette with clearly distinct colors
    const districtColors: Record<string, string> = {
      // Northwest region - pacific evergreen palette (teals, slate, pine)
      Alaska: "#2D6A7A", // deep teal
      NorthIdaho: "#4A7C59", // pine green
      Oregon: "#7A9E8E", // sage mist
      Washington: "#3D5A6E", // puget slate

      // Big Sky region - mountain palette (sky blue, terracotta, sage, sand)
      Colorado: "#5B8FA8", // mountain sky
      Montana: "#C4956A", // terracotta
      SouthIdaho: "#8B9F72", // high desert sage
      Utah: "#D4A574", // red rock sand
      Wyoming: "#7A8B5A", // prairie grass

      // Great Plains North - northern lights palette (violet, wheat, lake blue)
      Minnesota: "#4A6670", // lake slate
      NorthDakota: "#8B7355", // wheat brown
      SouthDakota: "#6B5B7A", // prairie violet
      "Wisconsin-NorthMichigan": "#5A7A6A", // north woods

      // Great Lakes region - industrial palette (steel, rust, navy, concrete)
      Illinois: "#7A8A9A", // industrial steel
      Indiana: "#A67A5A", // rust
      Michigan: "#4A6A8A", // great lake blue
      Ohio: "#8A7A6A", // concrete

      // Great Plains South - harvest palette (corn green, wheat gold, copper)
      Iowa: "#6A8A5A", // corn green
      Kansas: "#C4A454", // wheat gold
      Nebraska: "#B8945A", // harvest amber
      NorthernMissouri: "#9A7A4A", // copper
      SouthernMissouri: "#7A6A4A", // burnt umber

      // Mid-Atlantic region - colonial palette (burgundy, navy, forest, brass)
      Appalachian: "#5A7A5A", // mountain laurel
      Kentucky: "#7A5A4A", // bourbon brown
      NorthCarolina: "#5A6A7A", // colonial blue
      Potomac: "#8A6A5A", // federal brick
      Tennessee: "#9A7A5A", // whiskey amber
      Virginia: "#6A5A6A", // williamsburg plum
      WestVirginia: "#6A7A5A", // rhododendron

      // Northeast region - new england palette (cranberry, slate, hunter, maple)
      NewJersey: "#7A6A5A", // brownstone
      NewYork: "#4A5A7A", // empire slate
      NorthernNewEngland: "#5A6A5A", // pine
      NorthernNewEnglend: "#5A6A5A", // pine (typo variant)
      "Penn-Del": "#8A5A5A", // liberty brick
      SouthernNewEngland: "#6A5A6A", // vineyard plum
      Connecticut: "#5A7A7A", // harbor teal
      Maine: "#4A5A5A", // granite
      Massachusetts: "#8A4A5A", // cranberry
      NewHampshire: "#6A7A5A", // maple
      Pennsylvania: "#7A5A4A", // keystone brown
      Vermont: "#5A8A6A", // green mountain

      // South Central region - cajun palette (bayou, red clay, mustard)
      Arkansas: "#8A6A4A", // ozark amber
      Louisiana: "#4A6A5A", // bayou green
      Oklahoma: "#9A5A4A", // red earth

      // Southeast region - southern palette (peach, magnolia, moss, coral)
      Alabama: "#9A7A6A", // red clay
      Georgia: "#8A6A5A", // peach
      Mississippi: "#6A7A6A", // spanish moss
      PeninsularFlorida: "#5A8A8A", // turquoise
      SouthCarolina: "#7A8A6A", // palmetto
      WestFlorida: "#8A8A6A", // sand dune
      Florida: "#5A8A8A", // turquoise

      // Texico region - southwest palette (sage, terracotta, sand, brick)
      NewMexico: "#568969", // sage green
      NorthTexas: "#A77649", // amber brown
      SouthTexas: "#8F8257", // warm stone
      WestTexas: "#9F5A57", // brick red

      // West Coast region - california palette (pacific, redwood, poppy, desert)
      Arizona: "#C47A5A", // sedona red
      Hawaii: "#4A8A9A", // pacific blue
      "NorthernCal-Nevada": "#7A5A4A", // redwood
      SouthernCalifornia: "#D4A44A", // golden poppy
      Nevada: "#AA8A6A", // mojave tan
      NorthCalifornia: "#7A5A4A", // redwood
      SouthCalifornia: "#D4A44A", // golden poppy
    };

    // Premium map styling constants - clean, subtle design
    const BORDER_COLOR = "rgba(255,255,255,0.85)"; // soft white borders
    const BORDER_WIDTH = "0.3"; // clean borders
    const BORDER_WIDTH_HOVER = "0.3"; // keep subtle stroke change only
    const BORDER_WIDTH_SELECTED = "0.4"; // emphasis for selected
    const TRANSITION = "all 200ms ease-out"; // smooth transitions
    const DIM_OPACITY = "1"; // keep opacity full, use brightness for dimming
    const DIM_FILTER = "brightness(0.65)"; // darken non-hovered regions

    // Subtle shadow for depth on inactive map
    const BASE_FILTER = "drop-shadow(0 1px 2px rgba(0,0,0,0.08))";
    // Hovered district - brighter with almost no glow (tiny shadow)
    const HOVER_FILTER =
      "brightness(1.55) saturate(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.22))";
    // Other districts in same region on hover - noticeable brightness boost
    const REGION_HOVER_FILTER =
      "brightness(1.3) saturate(1.06) drop-shadow(0 1px 2px rgba(0,0,0,0.15))";
    // Selected district - modest step above hover, still very tight shadow
    const SELECTED_FILTER =
      "brightness(1.45) saturate(1.08) drop-shadow(0 2px 3px rgba(0,0,0,0.2))";
    const GREYED_OUT_FILTER = "brightness(0.6)";
    const GREYED_OUT_OPACITY = "1";

    // View mode dimming logic
    // Determine which districts should be fully visible based on viewState
    const activeRegionId = viewState?.regionId || null;
    const activeDistrictId = viewState?.districtId || selectedDistrictId;
    const activeCampusId = viewState?.campusId || null;

    // For campus mode, find the district containing the active campus
    let activeDistrictForCampus: string | null = null;
    if (viewState?.mode === "campus" && activeCampusId) {
      const campus = allCampuses.find(c => c.id === activeCampusId);
      activeDistrictForCampus = campus?.districtId || null;
    }

    // Get selected district's region for greyed out effect (fallback to legacy behavior)
    const selectedDistrict = districts.find(d => d.id === selectedDistrictId);
    const selectedRegion =
      selectedDistrict?.region ||
      (selectedDistrictId
        ? DISTRICT_REGION_MAP[selectedDistrictId]
        : undefined);

    // Create district lookup map for performance
    const districtMap = new Map(districts.map(d => [d.id, d]));

    // Style visual paths (what user sees)
    visualPaths.forEach(path => {
      const pathId =
        path.getAttribute("inkscape:label") ||
        path.getAttributeNS(
          "http://www.inkscape.org/namespaces/inkscape",
          "label"
        ) ||
        path.getAttribute("id");
      if (!pathId) return;

      const district = districtMap.get(pathId);
      // Get region from district in database, or from mapping if not in database yet
      const region = district?.region || DISTRICT_REGION_MAP[pathId];

      // Use district-specific colors ONLY when:
      // 1. We're in REGION scope AND have a userRegionId AND the district is in that region, OR
      // 2. We're in DISTRICT scope AND have a userDistrictId
      // This prevents showing district colors on national view
      let baseColor: string;
      const shouldShowDistrictColor =
        (scopeFilter === "REGION" &&
          userRegionId &&
          region === userRegionId &&
          districtColors[pathId]) ||
        (scopeFilter === "DISTRICT" &&
          userDistrictId &&
          pathId === userDistrictId &&
          districtColors[pathId]);

      if (shouldShowDistrictColor) {
        baseColor = districtColors[pathId];
      } else {
        baseColor = region ? regionColors[region] || "#e5e7eb" : "#e5e7eb";
      }

      path.style.fill = baseColor;
      path.style.stroke = BORDER_COLOR;
      path.style.strokeWidth = BORDER_WIDTH;
      path.style.strokeLinejoin = "round";
      path.style.strokeLinecap = "round";
      path.style.filter = BASE_FILTER;
      path.style.strokeDasharray = "";
      path.style.transition = TRANSITION;
      path.style.transformOrigin = "center";
      path.style.transform = "translateY(0)";

      // View mode dimming logic
      let shouldDim = false;
      let isSelected = false;

      if (viewState) {
        const pathDistrict = districtMap.get(pathId);
        const pathRegion = pathDistrict?.region || DISTRICT_REGION_MAP[pathId];

        switch (viewState.mode) {
          case "region":
            // Region mode: only active region fully visible
            if (activeRegionId) {
              isSelected = pathId === activeDistrictId;
              shouldDim = pathRegion !== activeRegionId;
            } else {
              // No active region - show all (fallback)
              isSelected = pathId === activeDistrictId;
              shouldDim = false;
            }
            break;

          case "district":
            // District mode: only districts in active region fully visible
            if (activeRegionId) {
              isSelected = pathId === activeDistrictId;
              shouldDim = pathRegion !== activeRegionId;
            } else if (activeDistrictId) {
              // Fallback: use selected district's region
              const activeDistrict = districtMap.get(activeDistrictId);
              const activeRegion =
                activeDistrict?.region || DISTRICT_REGION_MAP[activeDistrictId];
              isSelected = pathId === activeDistrictId;
              shouldDim = pathRegion !== activeRegion;
            } else {
              isSelected = pathId === selectedDistrictId;
              shouldDim = false;
            }
            break;

          case "campus":
            // Campus mode: only district containing active campus fully visible
            if (activeDistrictForCampus) {
              isSelected = pathId === activeDistrictForCampus;
              shouldDim = pathId !== activeDistrictForCampus;
            } else {
              // No active campus district - show all (fallback)
              isSelected = pathId === activeDistrictId;
              shouldDim = false;
            }
            break;
        }
      } else {
        // Legacy behavior: when a district is selected, apply shadow and lighting effects
        if (selectedDistrictId && selectedRegion) {
          const isInSelectedRegion = region && region === selectedRegion;
          isSelected = pathId === selectedDistrictId;
          shouldDim = !isSelected && !isInSelectedRegion;
        } else {
          isSelected = pathId === selectedDistrictId;
          shouldDim = false;
        }
      }

      // Additional scope filter - hide districts outside the scope completely
      // If scope filter restricts view, hide districts outside the scope
      let shouldHide = false;
      if (scopeFilter !== "NATIONAL") {
        const pathDistrict = districtMap.get(pathId);
        const pathRegion = pathDistrict?.region || DISTRICT_REGION_MAP[pathId];

        if (scopeFilter === "REGION" && userRegionId) {
          // Only show districts in user's region, hide all others
          if (pathRegion !== userRegionId) {
            shouldHide = true;
          }
        } else if (scopeFilter === "DISTRICT" && userDistrictId) {
          // Only show user's district, hide all others
          if (pathId !== userDistrictId) {
            shouldHide = true;
          }
        }
      }

      // Apply styling based on dimming/hiding logic
      if (shouldHide) {
        // Completely hide districts outside scope
        path.style.opacity = "0";
        path.style.visibility = "hidden";
        path.style.pointerEvents = "none";
      } else if (isSelected) {
        path.style.filter = SELECTED_FILTER;
        path.style.opacity = "1";
        path.style.visibility = "visible";
      } else if (shouldDim) {
        // Previously: darkened non-selected regions with DIM_FILTER.
        // Per UI feedback, keep other districts at the normal brightness even when a district is active/hovered.
        path.style.filter = BASE_FILTER;
        path.style.opacity = "1";
        path.style.visibility = "visible";
      } else {
        path.style.filter = BASE_FILTER; // 3D floating effect
        path.style.opacity = "1";
        path.style.visibility = "visible";
      }
    });

    // Setup click handlers on invisible layer
    clickPaths.forEach(path => {
      const pathId =
        path.getAttribute("inkscape:label") ||
        path.getAttributeNS(
          "http://www.inkscape.org/namespaces/inkscape",
          "label"
        ) ||
        path.getAttribute("id");
      if (!pathId) return;

      // Allow clicking on all districts, even if not in database yet
      const district = districtMap.get(pathId);

      // Get region once for this path
      const pathRegion = district?.region || DISTRICT_REGION_MAP[pathId];

      // Check if this district should be hidden based on scope filter
      let isHiddenByScope = false;
      if (scopeFilter !== "NATIONAL") {
        if (scopeFilter === "REGION" && userRegionId) {
          isHiddenByScope = pathRegion !== userRegionId;
        } else if (scopeFilter === "DISTRICT" && userDistrictId) {
          isHiddenByScope = pathId !== userDistrictId;
        }
      }

      // Disable interaction for hidden districts
      if (isHiddenByScope) {
        path.style.cursor = "default";
        path.style.pointerEvents = "none";
        return; // Skip adding event handlers for hidden districts
      }

      path.style.cursor = "pointer";
      path.style.pointerEvents = "auto";

      // Click handler - allow clicking even if district not in database
      const clickHandler = (e: MouseEvent) => {
        e.stopPropagation();
        onDistrictSelect(pathId);
      };
      path.addEventListener("click", clickHandler);

      // Hover behavior: region lighting + raise; move hovered path to top of stack
      const mouseEnterHandler = (e: MouseEvent) => {
        setHoveredDistrict(pathId);
        if (pathRegion) {
          setHoveredRegion(pathRegion);
        }
        setTooltipPos({ x: e.clientX, y: e.clientY });

        // Restore any previously moved path so we only ever have one "on top"
        if (movedPathRef.current) {
          const {
            path: prevPath,
            parent,
            originalIndex,
          } = movedPathRef.current;
          const sibling = parent.children[originalIndex] || null;
          parent.insertBefore(prevPath, sibling);
          movedPathRef.current = null;
        }

        const hoveredVisualPath = Array.from(visualPaths).find(
          p => getPathId(p) === pathId
        );
        if (hoveredVisualPath?.parentNode) {
          const parent = hoveredVisualPath.parentNode as Element;
          const originalIndex = pathOrder.indexOf(pathId);
          if (originalIndex !== -1) {
            parent.appendChild(hoveredVisualPath);
            movedPathRef.current = {
              path: hoveredVisualPath as SVGPathElement,
              parent,
              originalIndex,
            };
          }
        }

        visualPaths.forEach(vPath => {
          const vPathId = getPathId(vPath);
          if (!vPathId) return;

          const vDistrict = districtMap.get(vPathId);
          const vRegion = vDistrict?.region || DISTRICT_REGION_MAP[vPathId];
          const isInSameRegion =
            vRegion && pathRegion && vRegion === pathRegion;
          const isHoveredDistrict = vPathId === pathId;

          if (isInSameRegion) {
            // Whole region lights up; hovered district is brightest and subtly raises.
            vPath.style.opacity = "1";
            vPath.style.filter = isHoveredDistrict
              ? selectedDistrictId === vPathId
                ? SELECTED_FILTER
                : HOVER_FILTER
              : REGION_HOVER_FILTER;
            vPath.style.strokeWidth =
              selectedDistrictId === vPathId && isHoveredDistrict
                ? BORDER_WIDTH_SELECTED
                : BORDER_WIDTH;
            // Very subtle raise for the hovered district only
            vPath.style.transform = isHoveredDistrict
              ? "translateY(-0.5px)"
              : "translateY(0)";
          } else {
            // Other regions stay at their base appearance.
            vPath.style.opacity = "1";
            vPath.style.filter =
              selectedDistrictId === vPathId ? SELECTED_FILTER : BASE_FILTER;
            vPath.style.strokeWidth =
              selectedDistrictId === vPathId
                ? BORDER_WIDTH_SELECTED
                : BORDER_WIDTH;
            vPath.style.transform = "translateY(0)";
          }
        });
      };
      path.addEventListener("mouseenter", mouseEnterHandler);

      // Throttle mousemove to improve performance
      let mousemoveTimeout: number | null = null;
      const mouseMoveHandler = (e: MouseEvent) => {
        if (mousemoveTimeout) return;
        mousemoveTimeout = window.setTimeout(() => {
          setTooltipPos({ x: e.clientX, y: e.clientY });
          mousemoveTimeout = null;
        }, 16); // ~60fps
      };
      path.addEventListener("mousemove", mouseMoveHandler);

      const mouseLeaveHandler = () => {
        setHoveredDistrict(null);
        setHoveredRegion(null);
        setTooltipPos(null);
        if (mousemoveTimeout) {
          clearTimeout(mousemoveTimeout);
          mousemoveTimeout = null;
        }

        // Put the raised path back in its original order
        if (movedPathRef.current) {
          const { path, parent, originalIndex } = movedPathRef.current;
          const sibling = parent.children[originalIndex] || null;
          parent.insertBefore(path, sibling);
          movedPathRef.current = null;
        }

        // Restore all districts to their default state
        visualPaths.forEach(vPath => {
          const vPathId = getPathId(vPath);
          if (!vPathId) return;

          if (selectedDistrictId === vPathId) {
            vPath.style.filter = SELECTED_FILTER;
          } else {
            vPath.style.filter = BASE_FILTER;
          }
          vPath.style.opacity = "1";
          vPath.style.strokeWidth = BORDER_WIDTH;
          vPath.style.transform = "translateY(0)";
        });
      };
      path.addEventListener("mouseleave", mouseLeaveHandler);
    });

    // XAN button will be added as a separate element in JSX that transforms with the map

    // Calculate zoom viewBox based on visible districts for scope filtering
    const shouldZoom =
      (scopeFilter === "REGION" && userRegionId) ||
      (scopeFilter === "DISTRICT" && userDistrictId);

    if (shouldZoom && originalViewBox) {
      // Calculate the scale factors we used to transform the SVG
      const scaleX = 960 / originalViewBox.width;
      const scaleY = 600 / originalViewBox.height;
      const translateX = -originalViewBox.minX;
      const translateY = -originalViewBox.minY;

      // Collect bounding boxes of all visible paths in scaled coordinates
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      let hasVisiblePaths = false;

      visualPaths.forEach(path => {
        const pathId =
          path.getAttribute("inkscape:label") ||
          path.getAttributeNS(
            "http://www.inkscape.org/namespaces/inkscape",
            "label"
          ) ||
          path.getAttribute("id");
        if (!pathId) return;

        const district = districtMap.get(pathId);
        const pathRegion = district?.region || DISTRICT_REGION_MAP[pathId];

        // Check if this path is visible based on scope
        let isVisible = false;
        if (scopeFilter === "REGION" && userRegionId) {
          isVisible = pathRegion === userRegionId;
        } else if (scopeFilter === "DISTRICT" && userDistrictId) {
          isVisible = pathId === userDistrictId;
        }

        if (isVisible) {
          try {
            const bbox = path.getBBox();
            // Transform the bounding box to the scaled coordinate system
            const scaledX = (bbox.x + translateX) * scaleX;
            const scaledY = (bbox.y + translateY) * scaleY;
            const scaledWidth = bbox.width * scaleX;
            const scaledHeight = bbox.height * scaleY;

            minX = Math.min(minX, scaledX);
            minY = Math.min(minY, scaledY);
            maxX = Math.max(maxX, scaledX + scaledWidth);
            maxY = Math.max(maxY, scaledY + scaledHeight);
            hasVisiblePaths = true;
          } catch {
            // getBBox can throw if element is not rendered
          }
        }
      });

      if (hasVisiblePaths && minX !== Infinity) {
        // Add padding around the visible area
        // Use more padding for district scope to avoid being too zoomed in
        const width = maxX - minX;
        const height = maxY - minY;
        const isDistrictScope = scopeFilter === "DISTRICT";
        const paddingX = width * (isDistrictScope ? 0.8 : 0.2);
        const paddingY = height * (isDistrictScope ? 0.8 : 0.2);

        const viewBoxX = Math.max(0, minX - paddingX);
        const viewBoxY = Math.max(0, minY - paddingY);
        const viewBoxWidth = Math.min(960, width + paddingX * 2);
        const viewBoxHeight = Math.min(600, height + paddingY * 2);

        const newViewBox = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`;
        setZoomViewBox(newViewBox);

        // Apply the viewBox to both SVGs
        clickSvg.setAttribute("viewBox", newViewBox);
        visualSvg.setAttribute("viewBox", newViewBox);
      } else {
        setZoomViewBox(null);
        clickSvg.setAttribute("viewBox", DEFAULT_VIEWBOX);
        visualSvg.setAttribute("viewBox", DEFAULT_VIEWBOX);
      }
    } else {
      // Reset to default viewBox for national view
      setZoomViewBox(null);
      clickSvg.setAttribute("viewBox", DEFAULT_VIEWBOX);
      visualSvg.setAttribute("viewBox", DEFAULT_VIEWBOX);
    }

    // Cleanup
    return () => {
      // Remove all event listeners by cloning paths
      clickPaths.forEach(path => {
        const newPath = path.cloneNode(true);
        path.replaceWith(newPath);
      });
      // Remove XAN buttons on cleanup
      [visualSvg, clickSvg].forEach(svg => {
        const xanButton = svg.querySelector('[data-xan-button="true"]');
        if (xanButton) {
          xanButton.remove();
        }
      });
    };
  }, [
    svgContent,
    districts,
    selectedDistrictId,
    onDistrictSelect,
    onNationalClick,
    scopeFilter,
    userRegionId,
    userDistrictId,
    originalViewBox,
  ]);

  // Generate pie chart SVG
  const generatePieChart = (stats: DistrictStats, size: number = 40) => {
    const { yes, maybe, no, notInvited, total } = stats;

    const radius = size / 2;
    const center = size / 2;

    // If no people, show empty gray circle with "No Data" text
    if (total === 0) {
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${center}" cy="${center}" r="${radius}" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1" />
          <text x="${center}" y="${center - 2}" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="#64748b" font-weight="500">No</text>
          <text x="${center}" y="${center + 10}" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="#64748b" font-weight="500">Data</text>
        </svg>
      `;
    }

    // Calculate percentages
    const yesPercent = yes / total;
    const maybePercent = maybe / total;
    const noPercent = no / total;
    const notInvitedPercent = notInvited / total;

    // Professional status colors - muted, sophisticated palette
    const colors = {
      yes: "#047857", // emerald-700 - professional green
      maybe: "#ca8a04", // yellow-600 - more yellow tone
      no: "#b91c1c", // red-700 - professional red
      notInvited: "#64748b", // slate-500 - professional gray
    };

    let currentAngle = -90; // Start at top

    const createArc = (startAngle: number, endAngle: number, color: string) => {
      const start = (startAngle * Math.PI) / 180;
      const end = (endAngle * Math.PI) / 180;

      const x1 = center + radius * Math.cos(start);
      const y1 = center + radius * Math.sin(start);
      const x2 = center + radius * Math.cos(end);
      const y2 = center + radius * Math.sin(end);

      const largeArc = endAngle - startAngle > 180 ? 1 : 0;

      return `
        <path d="M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z"
              fill="${color}" stroke="white" stroke-width="1" />
      `;
    };

    let arcs = "";

    if (yesPercent > 0) {
      const angle = yesPercent * 360;
      arcs += createArc(currentAngle, currentAngle + angle, colors.yes);
      currentAngle += angle;
    }

    if (maybePercent > 0) {
      const angle = maybePercent * 360;
      arcs += createArc(currentAngle, currentAngle + angle, colors.maybe);
      currentAngle += angle;
    }

    if (noPercent > 0) {
      const angle = noPercent * 360;
      arcs += createArc(currentAngle, currentAngle + angle, colors.no);
      currentAngle += angle;
    }

    if (notInvitedPercent > 0) {
      const angle = notInvitedPercent * 360;
      arcs += createArc(currentAngle, currentAngle + angle, colors.notInvited);
    }

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${arcs}
      </svg>
    `;
  };

  // Helper function to convert district ID to display name
  const getDistrictDisplayName = (districtId: string): string => {
    const district = districts.find(d => d.id === districtId);
    if (district?.name) return district.name;
    // Convert ID to display name (e.g., "SouthTexas" -> "South Texas")
    // Handle hyphens: add spaces on both sides
    return districtId
      .replace(/-/g, " - ") // Add spaces around hyphens
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between lowercase and uppercase
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // Add space between two capitals followed by lowercase
      .replace(/\s+/g, " ") // Normalize multiple spaces to single space
      .trim()
      .replace(/^./, str => str.toUpperCase());
  };

  const isMobile = useIsMobile();

  // Render tooltip (hidden on mobile to avoid overlap and improve touch UX)
  const renderTooltip = () => {
    if (isMobile || !hoveredDistrict || !tooltipPos) return null;

    const district = districts.find(d => d.id === hoveredDistrict);
    // Calculate stats using shared utility to ensure consistency with DistrictPanel
    // This handles both districts in the database and districts created on-the-fly
    const stats =
      districtStats[hoveredDistrict] ||
      calculateDistrictStats(allPeople, hoveredDistrict);
    const invited = stats.yes + stats.maybe + stats.no;
    const pieChartSvg = generatePieChart(stats, 80); // Larger pie chart for tooltip

    return (
      <div
        className="fixed z-50 bg-white backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/80 p-4 pointer-events-none tooltip-animate"
        style={{
          left: tooltipPos.x + 15,
          top: tooltipPos.y + 15,
        }}
      >
        <div
          className="text-gray-800 mb-3 flex items-baseline justify-between gap-2"
          style={{
            fontSize: "18px",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          {(() => {
            const campusCount = allCampuses.filter(
              c => c.districtId === hoveredDistrict
            ).length;
            return (
              <>
                <span>
                  {getDistrictDisplayName(hoveredDistrict)}
                  {campusCount > 0 && (
                    <span
                      className="text-gray-600 ml-1"
                      style={{ fontSize: "18px", fontWeight: 400 }}
                    >
                      ({campusCount} {campusCount === 1 ? "campus" : "campuses"}
                      )
                    </span>
                  )}
                </span>
                {stats.total > 0 && (
                  <span
                    className="text-gray-700 tabular-nums"
                    style={{ fontSize: "18px", fontWeight: 500 }}
                  >
                    {stats.total}
                  </span>
                )}
              </>
            );
          })()}
        </div>

        {/* Pie Chart and Stats Side by Side */}
        <div className="flex gap-4 items-center">
          {/* Pie Chart */}
          {pieChartSvg && (
            <div
              className="flex-shrink-0"
              dangerouslySetInnerHTML={{ __html: pieChartSvg }}
            />
          )}

          {/* Stats */}
          <div
            className="flex-1"
            style={{ fontSize: "15px", lineHeight: "1.6" }}
          >
            <div className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#047857]"></div>
                <span className="text-gray-600">Yes:</span>
              </div>
              <span
                className="text-gray-800"
                style={{ fontWeight: 500, fontSize: "15px" }}
              >
                {stats.yes}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ca8a04]"></div>
                <span className="text-gray-600">Maybe:</span>
              </div>
              <span
                className="text-gray-800"
                style={{ fontWeight: 500, fontSize: "15px" }}
              >
                {stats.maybe}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#b91c1c]"></div>
                <span className="text-gray-600">No:</span>
              </div>
              <span
                className="text-gray-800"
                style={{ fontWeight: 500, fontSize: "15px" }}
              >
                {stats.no}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#64748b]"></div>
                <span className="text-gray-600 whitespace-nowrap">
                  Not Invited Yet:
                </span>
              </div>
              <span
                className="text-gray-800"
                style={{ fontWeight: 500, fontSize: "15px" }}
              >
                {stats.notInvited}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Map always fills the available container - scoping is handled via zoom/filter
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        maxWidth: "100%",
        maxHeight: "100%",
      }}
    >
      <div className="relative w-full h-full">
        {/* Top Right - Chi Alpha label + metrics (shrink when district panel open) */}
        <div
          className={`absolute right-0 z-50 flex flex-col items-end gap-0.5 bg-transparent -mr-2 transition-all duration-300 ${selectedDistrictId ? "top-5" : "top-6"}`}
        >
          <div className="flex items-center justify-end">
            <span
              className={`font-beach font-medium text-slate-800 drop-shadow-lg transition-all duration-300 tracking-wide inline-block leading-none mr-0 sm:mr-1 ${selectedDistrictId ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl"}`}
              style={{
                transform: "scaleX(1.08)",
                transformOrigin: "right center",
              }}
              ref={labelRef}
            >
              {displayedLabel}
            </span>
          </div>

          {/* "metrics" label + horizontal line (on hover) + collapsible metrics */}
          <div
            className={`flex flex-col items-end w-full bg-transparent transition-all duration-300 ${selectedDistrictId ? "max-w-[12rem] mt-2" : "max-w-[16rem] mt-3"}`}
          >
            <button
              onClick={() => setMetricsExpanded(!metricsExpanded)}
              className="group flex flex-row items-center justify-end w-full gap-1 py-0 px-0.5 -my-1 -mx-0.5"
              aria-label={
                metricsExpanded ? "Collapse metrics" : "Expand metrics"
              }
            >
              <div
                className={`h-px bg-slate-400 relative z-10 origin-right ${
                  metricsExpanded
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                } ml-4`}
                style={{
                  width: labelWidthPx ? `${labelWidthPx}px` : undefined,
                  transform: metricsExpanded ? "scaleX(1)" : "scaleX(0)",
                  transition:
                    "opacity 0.25s ease-out, transform 1s cubic-bezier(0.22, 1, 0.36, 1)",
                  transitionDelay: metricsExpanded ? "0ms" : "1s, 0ms", // fade after line recedes
                }}
              />
              <span
                className={`font-medium text-slate-500 uppercase tracking-wider leading-none shrink-0 ${selectedDistrictId ? "text-[9px]" : "text-[10px]"}`}
              >
                Metrics
              </span>
              <svg
                className={`text-slate-400 group-hover:text-slate-600 transition-all duration-300 ease-out flex-shrink-0 ${selectedDistrictId ? "w-3 h-3" : "w-3.5 h-3.5"} ${
                  metricsExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Metrics panel: line expands first; metrics slide out from the line one by one */}
            <div
              className="relative overflow-hidden w-full bg-transparent"
              style={{
                transition:
                  "max-height 1.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease-out",
                transitionDelay: metricsExpanded ? "0.4s" : "0ms",
                maxHeight: metricsExpanded ? "500px" : "0px",
                opacity: metricsExpanded ? 1 : 0,
              }}
            >
              <div
                className={`flex flex-col items-end pt-0 pr-1 mt-1.5 overflow-hidden transition-all duration-300 ${selectedDistrictId ? "gap-2" : "gap-3"}`}
              >
                {/* Yes - closest to line: slides out first, back in last */}
                <button
                  onClick={() => toggleMetric("yes")}
                  className="flex items-center gap-2 transition-all hover:scale-105 w-full justify-end min-w-0"
                  style={{
                    filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))",
                    transform: metricsExpanded
                      ? "translateX(0)"
                      : "translateX(100%)",
                    transition: "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
                    transitionDelay: metricsExpanded ? "0.15s" : "0.9s",
                  }}
                >
                  <span
                    className={`font-medium text-slate-700 whitespace-nowrap tracking-tight ${selectedDistrictId ? "text-2xl" : "text-4xl"}`}
                    style={{
                      lineHeight: "1",
                      minWidth: selectedDistrictId ? "6rem" : "8.5rem",
                      textAlign: "right",
                    }}
                  >
                    Yes
                  </span>
                  <span
                    className={`font-semibold text-slate-900 tabular-nums ${selectedDistrictId ? "text-2xl" : "text-4xl"}`}
                    style={{
                      lineHeight: "1",
                      width: "4rem",
                      textAlign: "center",
                    }}
                  >
                    {showPublicPlaceholder ? "—" : displayedTotals.yes}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 transition-all duration-200 flex-shrink-0 flex items-center justify-center ${
                      activeMetrics.has("yes")
                        ? "bg-emerald-700 border-emerald-700"
                        : "border-slate-300 hover:border-emerald-600 bg-white"
                    }`}
                    style={{
                      boxShadow: activeMetrics.has("yes")
                        ? "0 4px 12px rgba(4, 120, 87, 0.3), 0 2px 4px rgba(0, 0, 0, 0.12)"
                        : "0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    {activeMetrics.has("yes") && (
                      <svg
                        className="w-full h-full text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </button>
                {/* Maybe - slides out from line 2nd, back into line 3rd */}
                <button
                  onClick={() => toggleMetric("maybe")}
                  className="flex items-center gap-2 transition-all hover:scale-105 w-full justify-end min-w-0"
                  style={{
                    filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))",
                    transform: metricsExpanded
                      ? "translateX(0)"
                      : "translateX(100%)",
                    transition: "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
                    transitionDelay: metricsExpanded ? "0.45s" : "0.6s",
                  }}
                >
                  <span
                    className={`font-medium text-slate-700 whitespace-nowrap tracking-tight ${selectedDistrictId ? "text-xl" : "text-[1.65rem]"}`}
                    style={{
                      lineHeight: "1",
                      minWidth: selectedDistrictId ? "6rem" : "8.5rem",
                      textAlign: "right",
                    }}
                  >
                    Maybe
                  </span>
                  <span
                    className={`font-semibold text-slate-900 tracking-tight tabular-nums ${selectedDistrictId ? "text-xl" : "text-[1.65rem]"}`}
                    style={{
                      lineHeight: "1",
                      width: "4rem",
                      textAlign: "center",
                    }}
                  >
                    {showPublicPlaceholder ? "—" : displayedTotals.maybe}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex-shrink-0 flex items-center justify-center ${
                      activeMetrics.has("maybe")
                        ? "bg-yellow-600 border-yellow-600"
                        : "border-slate-300 hover:border-yellow-600 bg-white"
                    }`}
                    style={{
                      boxShadow: activeMetrics.has("maybe")
                        ? "0 4px 12px rgba(180, 83, 9, 0.3), 0 2px 4px rgba(0, 0, 0, 0.12)"
                        : "0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    {activeMetrics.has("maybe") && (
                      <svg
                        className="w-full h-full text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </button>
                {/* No - slides out from line 3rd, back into line 2nd */}
                <button
                  onClick={() => toggleMetric("no")}
                  className="flex items-center gap-2 transition-all hover:scale-105 w-full justify-end min-w-0"
                  style={{
                    filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))",
                    transform: metricsExpanded
                      ? "translateX(0)"
                      : "translateX(100%)",
                    transition: "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
                    transitionDelay: metricsExpanded ? "0.75s" : "0.3s",
                  }}
                >
                  <span
                    className={`font-medium text-slate-700 whitespace-nowrap tracking-tight ${selectedDistrictId ? "text-lg" : "text-2xl"}`}
                    style={{
                      lineHeight: "1",
                      minWidth: selectedDistrictId ? "6rem" : "8.5rem",
                      textAlign: "right",
                    }}
                  >
                    No
                  </span>
                  <span
                    className={`font-semibold text-slate-900 tracking-tight tabular-nums ${selectedDistrictId ? "text-lg" : "text-2xl"}`}
                    style={{
                      lineHeight: "1",
                      width: "4rem",
                      textAlign: "center",
                    }}
                  >
                    {showPublicPlaceholder ? "—" : displayedTotals.no}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-200 flex-shrink-0 flex items-center justify-center ${
                      activeMetrics.has("no")
                        ? "bg-red-700 border-red-700"
                        : "border-slate-300 hover:border-red-700 bg-white"
                    }`}
                    style={{
                      boxShadow: activeMetrics.has("no")
                        ? "0 4px 12px rgba(185, 28, 28, 0.3), 0 2px 4px rgba(0, 0, 0, 0.12)"
                        : "0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    {activeMetrics.has("no") && (
                      <svg
                        className="w-full h-full text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </button>
                {/* Not Invited Yet - farthest from line: slides out last, back in first */}
                <button
                  onClick={() => toggleMetric("notInvited")}
                  className="flex items-center gap-2 transition-all hover:scale-105 w-full justify-end min-w-0"
                  style={{
                    filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))",
                    transform: metricsExpanded
                      ? "translateX(0)"
                      : "translateX(100%)",
                    transition: "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
                    transitionDelay: metricsExpanded ? "1.05s" : "0ms",
                  }}
                >
                  <span
                    className={`font-medium text-slate-700 whitespace-nowrap tracking-tight ${selectedDistrictId ? "text-base" : "text-[1.2rem]"}`}
                    style={{
                      lineHeight: "1",
                      minWidth: selectedDistrictId ? "6rem" : "8.5rem",
                      textAlign: "right",
                    }}
                  >
                    Not Invited Yet
                  </span>
                  <span
                    className={`font-semibold text-slate-900 tracking-tight tabular-nums ${selectedDistrictId ? "text-base" : "text-[1.2rem]"}`}
                    style={{
                      lineHeight: "1",
                      width: "4rem",
                      textAlign: "center",
                    }}
                  >
                    {showPublicPlaceholder ? "—" : displayedTotals.notInvited}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-200 flex-shrink-0 flex items-center justify-center ${
                      activeMetrics.has("notInvited")
                        ? "bg-slate-500 border-slate-500"
                        : "border-slate-300 hover:border-slate-400 bg-white"
                    }`}
                    style={{
                      boxShadow: activeMetrics.has("notInvited")
                        ? "0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15)"
                        : "0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    {activeMetrics.has("notInvited") && (
                      <svg
                        className="w-full h-full text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Top Left Invited / Total + Needs (shrink when district panel open) */}
        <div
          className={`absolute left-0 z-40 flex flex-col items-start pl-1 sm:pl-2 transition-all duration-300 ${selectedDistrictId ? "top-5 sm:top-5 gap-1" : "top-5 sm:top-6 gap-1 sm:gap-2"}`}
        >
          <div
            className="flex items-center gap-3"
            style={{ filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))" }}
          >
            <span
              className={`font-semibold text-slate-900 whitespace-nowrap tracking-tight ${selectedDistrictId ? "text-xl sm:text-2xl" : "text-2xl sm:text-4xl"}`}
              style={{
                lineHeight: "1",
                textAlign: "left",
              }}
            >
              Invited
            </span>

            <div
              className="flex items-baseline gap-2 tabular-nums"
              style={{ lineHeight: "1" }}
            >
              <span
                className={`font-bold text-slate-900 tracking-tight ${selectedDistrictId ? "text-xl sm:text-2xl" : "text-2xl sm:text-4xl"}`}
              >
                {showPublicPlaceholder ? "—" : displayedTotals.invited}
              </span>
              <span
                className={`font-normal text-slate-400 ${selectedDistrictId ? "text-base sm:text-lg" : "text-lg sm:text-xl"}`}
              >
                /
              </span>
              <span
                className={`font-normal text-slate-400 tracking-tight ${selectedDistrictId ? "text-sm sm:text-base" : "text-base sm:text-lg"}`}
              >
                {showPublicPlaceholder ? "—" : displayedTotals.total}
              </span>
            </div>

            <div
              className={
                selectedDistrictId
                  ? "w-4 h-4 flex-shrink-0"
                  : "w-6 h-6 flex-shrink-0"
              }
            />
          </div>

          {/* Needs summary - left-aligned with Invited */}
          <div className="hidden sm:block flex-shrink-0">
            <div className="inline-flex flex-col gap-y-0.5">
              <div className="flex items-baseline gap-x-2">
                <span
                  className={`font-medium text-slate-500 shrink-0 text-left ${selectedDistrictId ? "text-xs" : "text-sm"}`}
                >
                  Needs Met:
                </span>
                <span
                  className={`font-semibold text-slate-700 tabular-nums min-w-0 ${selectedDistrictId ? "text-xs" : "text-sm"}`}
                >
                  {needsAggregate ? needsAggregate.metNeeds : "—"}{" "}
                  <span className="text-slate-500 font-medium">/</span>{" "}
                  {needsAggregate ? needsAggregate.totalNeeds : "—"}
                </span>
              </div>
              <div className="flex items-baseline gap-x-2">
                <span
                  className={`font-medium text-slate-500 shrink-0 text-left ${selectedDistrictId ? "text-xs" : "text-sm"}`}
                >
                  Funds Received:
                </span>
                <span
                  className={`text-slate-600 tabular-nums min-w-0 ${selectedDistrictId ? "text-xs" : "text-sm"}`}
                >
                  {needsAggregate
                    ? `$${(needsAggregate.metFinancial / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    : "—"}{" "}
                  <span className="text-slate-500 font-medium">/</span>{" "}
                  {needsAggregate
                    ? `$${(needsAggregate.totalFinancial / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Background click layer - captures clicks on empty space */}
        <div
          className="absolute inset-0 z-0"
          onClick={_e => {
            // Trigger background click when clicking on empty space
            if (onBackgroundClick) {
              onBackgroundClick();
            }
          }}
        />

        {/* Visual layer - smooth, gap-free appearance with subtle blur */}
        <div
          ref={visualContainerRef}
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            filter: "blur(0.3px) brightness(0.82)", // Slightly darker map with same subtle blur
            transform: selectedDistrictId
              ? "scale(1.02) translate(-20px, -26px)" // Slightly larger when panel open
              : "scale(0.88) translate(-20px, -26px)", // A bit smaller; map nudged up and left
            transformOrigin: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />

        {/* Pie charts layer - removed per user request */}

        {/* XAN National Button - Positioned so it stays on screen; when panel open, nudge inward */}
        {scopeFilter === "NATIONAL" && (
          <div
            className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
            style={{
              transform: selectedDistrictId ? "scale(1.02)" : "scale(0.88)",
              transformOrigin: "center",
            }}
          >
            <button
              type="button"
              aria-label="Open XAN (National Team)"
              className="absolute cursor-pointer pointer-events-auto focus-visible:outline-none group/xan"
              style={{
                left: selectedDistrictId ? "8%" : "5%",
                bottom: selectedDistrictId ? "15%" : "13%",
                transform: "translate(-50%, 50%)",
              }}
              onClick={e => {
                e.stopPropagation();
                onNationalClick?.();
              }}
            >
              <div
                className="rounded-full bg-black group-hover/xan:bg-red-700 flex items-center justify-center transition-all duration-300 ease-out focus-visible:ring-2 focus-visible:ring-black/60 shadow-lg group-hover/xan:-translate-y-2 group-hover/xan:shadow-xl"
                style={{
                  width: selectedDistrictId ? "2.5vw" : "4vw",
                  height: selectedDistrictId ? "2.5vw" : "4vw",
                  minWidth: selectedDistrictId ? "28px" : "44px",
                  minHeight: selectedDistrictId ? "28px" : "44px",
                }}
              >
                <span
                  className={`text-white font-semibold ${selectedDistrictId ? "text-[10px]" : "text-sm"}`}
                >
                  XAN
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Invisible SVG click zones */}
        <div
          ref={svgContainerRef}
          className="absolute inset-0 z-30"
          style={{
            opacity: 0,
            pointerEvents: "auto",
            transform: selectedDistrictId
              ? "scale(1.02) translate(-20px, -26px)" // Match visual layer when panel open
              : "scale(0.88) translate(-20px, -26px)", // A bit smaller; map nudged up and left
            transformOrigin: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={e => {
            // If clicking on the SVG container itself (not a path), close panels
            if (
              e.target === e.currentTarget ||
              (e.target as HTMLElement).tagName === "svg"
            ) {
              if (onBackgroundClick) {
                onBackgroundClick();
              }
            }
          }}
        />

        {/* Metric Overlays - Anchored to Region Labels around map edges; below metrics dropdown (z-50) and toolbar (z-[100]) */}
        <div
          className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
          style={{
            transform: selectedDistrictId ? "scale(1.02)" : "scale(0.88)",
            transformOrigin: "center",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={zoomViewBox || "0 0 960 600"}
            preserveAspectRatio="xMidYMid meet"
          >
            {activeMetrics.size > 0 &&
              (() => {
                // Aggregate stats by region - prefer districtStats, fall back to regionalTotals
                const regionStats: Record<string, DistrictStats> = {};
                const districtRegionLookup = new Map<string, string>();
                districts.forEach(d => {
                  if (d.region) districtRegionLookup.set(d.id, d.region);
                });
                Object.entries(districtStats).forEach(([districtId, stats]) => {
                  const region =
                    districtRegionLookup.get(districtId) ||
                    DISTRICT_REGION_MAP[districtId] ||
                    "Unknown";
                  if (!regionStats[region]) {
                    regionStats[region] = {
                      yes: 0,
                      maybe: 0,
                      no: 0,
                      notInvited: 0,
                      total: 0,
                    };
                  }
                  regionStats[region].yes += stats.yes;
                  regionStats[region].maybe += stats.maybe;
                  regionStats[region].no += stats.no;
                  regionStats[region].notInvited += stats.notInvited;
                  regionStats[region].total += stats.total;
                });

                // Fall back to regionalTotals (from allRegionMetrics public endpoint)
                // for any region that has no data from districtStats
                Object.keys(baseRegionPositions).forEach(region => {
                  const existing = regionStats[region];
                  if (
                    (!existing || existing.total === 0) &&
                    regionalTotals[region]
                  ) {
                    const rt = regionalTotals[region];
                    regionStats[region] = {
                      yes: rt.yes,
                      maybe: rt.maybe,
                      no: rt.no,
                      notInvited: rt.notInvited,
                      total: rt.total,
                    };
                  }
                });

                // Pre-calculate all regions and their heights for collision detection
                // When scope is REGION, only show that region's bubbles (e.g. Texico only)
                const regionsToConsider =
                  scopeFilter === "REGION" && userRegionId
                    ? baseRegionPositions[userRegionId]
                      ? [userRegionId]
                      : Object.keys(baseRegionPositions)
                    : Object.keys(baseRegionPositions);

                const allRegions: string[] = [];
                const allTotalHeights: Record<string, number> = {};
                const allMetricsToShow: Record<
                  string,
                  Array<{ label: string; value: number }>
                > = {};

                regionsToConsider.forEach(region => {
                  const stats = regionStats[region] || {
                    yes: 0,
                    maybe: 0,
                    no: 0,
                    notInvited: 0,
                    total: 0,
                  };
                  const metricsToShow: Array<{ label: string; value: number }> =
                    [];
                  if (activeMetrics.has("yes"))
                    metricsToShow.push({ label: "Yes", value: stats.yes });
                  if (activeMetrics.has("maybe"))
                    metricsToShow.push({ label: "Maybe", value: stats.maybe });
                  if (activeMetrics.has("no"))
                    metricsToShow.push({ label: "No", value: stats.no });
                  if (activeMetrics.has("notInvited"))
                    metricsToShow.push({
                      label: "Not Invited",
                      value: stats.notInvited,
                    });

                  if (metricsToShow.length > 0) {
                    allRegions.push(region);
                    allMetricsToShow[region] = metricsToShow;
                    const isSingleMetric = metricsToShow.length === 1;
                    const lineHeight = isSingleMetric ? 26 : 22;
                    allTotalHeights[region] = metricsToShow.length * lineHeight;
                  }
                });

                return allRegions.map(region => {
                  const stats = regionStats[region] || {
                    yes: 0,
                    maybe: 0,
                    no: 0,
                    notInvited: 0,
                    total: 0,
                  };
                  const metricsToShow = allMetricsToShow[region];

                  if (!metricsToShow || metricsToShow.length === 0) return null;

                  const isSingleMetric = metricsToShow.length === 1;
                  const lineHeight = isSingleMetric ? 26 : 22;
                  const isHovered = hoveredRegionLabel === region;
                  const totalHeight = allTotalHeights[region];

                  // Calculate position with collision detection
                  const pos = getDynamicPosition(
                    region,
                    activeMetrics.size,
                    totalHeight,
                    allRegions,
                    allTotalHeights
                  );
                  const direction = pos.labelDirection;

                  // Region label: always directly under the metric stack (no padding/margins)
                  const lastBaseline =
                    pos.labelY + (metricsToShow.length - 1) * lineHeight;
                  const nameX = pos.labelX;
                  const nameY = lastBaseline + lineHeight;
                  const nameAnchor: "start" | "middle" | "end" = "middle";

                  return (
                    <g
                      key={region}
                      className="metric-label-group cursor-pointer"
                      style={{ pointerEvents: "auto" }}
                      onMouseEnter={() => setHoveredRegionLabel(region)}
                      onMouseLeave={() => setHoveredRegionLabel(null)}
                    >
                      {/* Invisible hit area for hover detection */}
                      <rect
                        x={pos.labelX - 40}
                        y={pos.labelY - 30}
                        width={80}
                        height={totalHeight + 55}
                        fill="transparent"
                        rx="4"
                      />

                      {/* Region name - only visible on hover, bigger with more spacing */}
                      <text
                        x={nameX}
                        y={nameY}
                        textAnchor={nameAnchor}
                        fill="#64748b"
                        fontSize={isSingleMetric ? "13px" : "12px"}
                        fontWeight="600"
                        letterSpacing="0.5px"
                        className="select-none"
                        style={{
                          textTransform: "uppercase",
                          fontFamily: "system-ui, -apple-system, sans-serif",
                          opacity: isHovered ? 1 : 0,
                          transition: "opacity 0.15s ease",
                        }}
                      >
                        {region}
                      </text>

                      {/* Metric values with colored dots */}
                      {metricsToShow.map((metric, index) => {
                        // Professional color mapping for each metric type
                        const dotColor =
                          metric.label === "Yes"
                            ? "#047857" // emerald-700
                            : metric.label === "Maybe"
                              ? "#ca8a04" // yellow-600
                              : metric.label === "No"
                                ? "#b91c1c" // red-700
                                : "#64748b"; // slate-500 for Not Invited

                        const dotRadius = isSingleMetric ? 6 : 5;

                        return (
                          <g key={metric.label}>
                            {/* Colored dot */}
                            <circle
                              cx={pos.labelX - (isSingleMetric ? 26 : 18)}
                              cy={
                                pos.labelY +
                                index * lineHeight -
                                (isSingleMetric ? 6 : 4)
                              }
                              r={dotRadius}
                              fill={dotColor}
                              className="select-none"
                            />
                            {/* Metric number */}
                            <text
                              x={pos.labelX}
                              y={pos.labelY + index * lineHeight}
                              textAnchor="middle"
                              fill={isHovered ? "#0f172a" : "#334155"}
                              fontSize={isSingleMetric ? "22px" : "15px"}
                              fontWeight="700"
                              letterSpacing="-0.3px"
                              className="select-none"
                              style={{
                                transition: "fill 0.15s ease",
                                fontFamily:
                                  "system-ui, -apple-system, sans-serif",
                              }}
                            >
                              {showOverlayPlaceholder ? "—" : metric.value}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                });
              })()}
          </svg>
        </div>
      </div>

      {/* Tooltip */}
      {renderTooltip()}
    </div>
  );
});
