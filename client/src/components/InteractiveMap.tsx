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
import { DISTRICT_REGION_MAP, resolveDistrictSvgPath } from "@/lib/regions";
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
  isTableOpen?: boolean; // Table drawer open (mobile)
}

// Base region label positions - outside map bounds (x: 180-880, y: 120-500 in 960x600 viewBox)
// Metrics must stay clear of map SVG; positions chosen to be proximate to each region
const baseRegionPositions: Record<
  string,
  {
    baseX: number;
    baseY: number;
    labelDirection: "above" | "below" | "left" | "right";
  }
> = {
  // TOP ROW - above map (y < 120); baseY shifted down so labels aren't clipped by 0.88 scale
  Northwest: { baseX: 200, baseY: 72, labelDirection: "above" },
  "Big Sky": { baseX: 380, baseY: 72, labelDirection: "above" },
  "Great Plains North": { baseX: 540, baseY: 72, labelDirection: "above" },
  "Great Plains South": { baseX: 680, baseY: 72, labelDirection: "above" },
  "Great Lakes": { baseX: 780, baseY: 72, labelDirection: "above" },

  // RIGHT SIDE - right of map (x > 880); baseX 920 keeps block in viewBox (960) and clear
  Northeast: { baseX: 930, baseY: 200, labelDirection: "right" },
  "Mid-Atlantic": { baseX: 930, baseY: 330, labelDirection: "right" },
  Southeast: { baseX: 930, baseY: 470, labelDirection: "right" },

  // LEFT SIDE - left of map (x < 140)
  "West Coast": { baseX: 128, baseY: 260, labelDirection: "left" },

  // BOTTOM ROW - below map (y > 500); baseY 512 keeps block in viewBox (600) with ~12px buffer from map
  Texico: { baseX: 420, baseY: 524, labelDirection: "below" },
  "South Central": { baseX: 640, baseY: 524, labelDirection: "below" },
};

// Map boundaries (from comment: x: 180-880, y: 120-500 in 960x600 viewBox)
const MAP_BOUNDS = {
  left: 180,
  right: 880,
  top: 120,
  bottom: 500,
  viewBoxHeight: 600,
};

// Tighter map bounds on mobile so metrics fit within viewBox without overlap
const MAP_BOUNDS_MOBILE = {
  left: 100,
  right: 780, // Leave room for Chi Alpha toggle on right
  top: 80,
  bottom: 520,
  viewBoxWidth: 960,
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
const boundsOverlap = (
  a: MetricBounds,
  b: MetricBounds,
  padding = 0
): boolean => {
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
  direction: "above" | "below" | "left" | "right",
  options?: {
    metricWidth?: number;
    extraTopHeight?: number;
    baselineMode?: {
      metricCount: number;
      lineHeight: number;
      topPad?: number;
      bottomPad?: number;
      constraints?: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
      };
    };
  }
): MetricBounds => {
  const metricWidth = options?.metricWidth ?? 80;
  const extraTopHeight = options?.extraTopHeight ?? 0;
  const metricHeight = totalHeight + extraTopHeight;

  // Baseline mode: labelY is the baseline of the first metric line.
  // This matches how district metric groups are rendered in region scope.
  if (options?.baselineMode) {
    const topPad = options.baselineMode.topPad ?? 6;
    const bottomPad = options.baselineMode.bottomPad ?? 6;
    const topToBaseline = options.baselineMode.lineHeight * 2 + topPad;
    const height =
      (options.baselineMode.metricCount + 1) * options.baselineMode.lineHeight +
      topPad +
      bottomPad;
    return {
      region,
      x: labelX - metricWidth / 2,
      y: labelY - topToBaseline,
      width: metricWidth,
      height,
      direction,
    };
  }

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
  >,
  boundsOptions?: {
    metricWidth?: number;
    extraTopHeight?: number;
    baselineMode?: {
      metricCount: number;
      lineHeight: number;
      topPad?: number;
      bottomPad?: number;
      constraints?: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
      };
    };
  }
): MetricBounds[] => {
  const resolved = bounds.map(b => ({ ...b }));
  const isBaselineMode = !!boundsOptions?.baselineMode;
  const maxIterations = isBaselineMode ? 200 : 30;
  const shiftStep = isBaselineMode ? 10 : 3;
  const minSpacing = isBaselineMode ? 14 : 0;
  const overlapPad = isBaselineMode ? 4 : 0;

  const getOverlapX = (a: MetricBounds, b: MetricBounds): number => {
    const left = Math.max(a.x - overlapPad, b.x - overlapPad);
    const right = Math.min(
      a.x + a.width + overlapPad,
      b.x + b.width + overlapPad
    );
    return right - left;
  };

  const getOverlapY = (a: MetricBounds, b: MetricBounds): number => {
    const top = Math.max(a.y - overlapPad, b.y - overlapPad);
    const bottom = Math.min(
      a.y + a.height + overlapPad,
      b.y + b.height + overlapPad
    );
    return bottom - top;
  };

  const getPreferredAxis = (
    direction: MetricBounds["direction"]
  ): "x" | "y" => {
    // If a label is placed left/right of its anchor, prefer shifting vertically
    // to keep it near the anchor without drifting further sideways.
    if (direction === "left" || direction === "right") return "y";
    return "x";
  };

  const topPad = boundsOptions?.baselineMode?.topPad ?? 6;
  const lineHeight = boundsOptions?.baselineMode?.lineHeight ?? 0;
  const topToBaseline = boundsOptions?.baselineMode
    ? lineHeight * 2 + topPad
    : 0;

  const constraints = boundsOptions?.baselineMode?.constraints;
  const clampBaselineAnchor = (anchor: { x: number; y: number }) => {
    if (!constraints) return anchor;
    return {
      x: Math.min(Math.max(anchor.x, constraints.minX), constraints.maxX),
      y: Math.min(Math.max(anchor.y, constraints.minY), constraints.maxY),
    };
  };

  // Store anchor positions for easier manipulation.
  // - Normal mode: treat anchors as the visual center.
  // - Baseline mode: treat anchors as (labelX, labelY) where labelY is the
  //   baseline of the first metric line (matches rendering).
  const anchors: Array<{
    x: number;
    y: number;
    region: string;
    direction: MetricBounds["direction"];
  }> = resolved.map(b => ({
    x: b.x + b.width / 2,
    y: isBaselineMode ? b.y + topToBaseline : b.y + b.height / 2,
    region: b.region,
    direction: b.direction,
  }));

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasCollision = false;

    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        if (boundsOverlap(resolved[i], resolved[j], overlapPad)) {
          hasCollision = true;
          const baseI = basePositions[resolved[i].region];
          const baseJ = basePositions[resolved[j].region];
          if (!baseI || !baseJ) continue;

          const overlapX = getOverlapX(resolved[i], resolved[j]);
          const overlapY = getOverlapY(resolved[i], resolved[j]);

          // Baseline mode (district metrics): aggressively separate blocks by pushing
          // both items apart along the chosen axis.
          if (isBaselineMode) {
            const dx = anchors[j].x - anchors[i].x;
            const dy = anchors[j].y - anchors[i].y;
            const dirX = dx >= 0 ? 1 : -1;
            const dirY = dy >= 0 ? 1 : -1;

            const preferredI = getPreferredAxis(resolved[i].direction);
            const preferredJ = getPreferredAxis(resolved[j].direction);

            // Even if both items share the same "preferred" axis, choose the axis
            // that resolves the collision with the smallest movement.
            const useAxis: "x" | "y" = overlapX <= overlapY ? "x" : "y";

            const moveApart = (axis: "x" | "y") => {
              if (axis === "x") {
                const needed = Math.max(0, overlapX) + minSpacing + 1;
                const amt = Math.min(Math.max(needed / 2, shiftStep), 100);
                anchors[i].x -= dirX * amt;
                anchors[j].x += dirX * amt;
              } else {
                const needed = Math.max(0, overlapY) + minSpacing + 1;
                const amt = Math.min(Math.max(needed / 2, shiftStep), 100);
                anchors[i].y -= dirY * amt;
                anchors[j].y += dirY * amt;
              }

              const clampedI = clampBaselineAnchor({
                x: anchors[i].x,
                y: anchors[i].y,
              });
              const clampedJ = clampBaselineAnchor({
                x: anchors[j].x,
                y: anchors[j].y,
              });
              anchors[i].x = clampedI.x;
              anchors[i].y = clampedI.y;
              anchors[j].x = clampedJ.x;
              anchors[j].y = clampedJ.y;
            };

            moveApart(useAxis);

            resolved[i] = getMetricBounds(
              resolved[i].region,
              anchors[i].x,
              anchors[i].y,
              resolved[i].height,
              resolved[i].direction as "above" | "below" | "left" | "right",
              boundsOptions
            );
            resolved[j] = getMetricBounds(
              resolved[j].region,
              anchors[j].x,
              anchors[j].y,
              resolved[j].height,
              resolved[j].direction as "above" | "below" | "left" | "right",
              boundsOptions
            );

            // If clamping prevented separation along the preferred axis,
            // try the other axis as a fallback.
            if (boundsOverlap(resolved[i], resolved[j], overlapPad)) {
              moveApart(useAxis === "x" ? "y" : "x");
              resolved[i] = getMetricBounds(
                resolved[i].region,
                anchors[i].x,
                anchors[i].y,
                resolved[i].height,
                resolved[i].direction as "above" | "below" | "left" | "right",
                boundsOptions
              );
              resolved[j] = getMetricBounds(
                resolved[j].region,
                anchors[j].x,
                anchors[j].y,
                resolved[j].height,
                resolved[j].direction as "above" | "below" | "left" | "right",
                boundsOptions
              );
            }

            continue;
          }

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
          anchors[i].x += shiftIX;
          anchors[i].y += shiftIY;
          anchors[j].x += shiftJX;
          anchors[j].y += shiftJY;

          // Recalculate bounds from centers
          resolved[i] = getMetricBounds(
            resolved[i].region,
            anchors[i].x,
            anchors[i].y,
            resolved[i].height,
            resolved[i].direction as "above" | "below" | "left" | "right",
            boundsOptions
          );
          resolved[j] = getMetricBounds(
            resolved[j].region,
            anchors[j].x,
            anchors[j].y,
            resolved[j].height,
            resolved[j].direction as "above" | "below" | "left" | "right",
            boundsOptions
          );
        }
      }
    }

    if (!hasCollision) break;
  }

  return resolved;
};

// Mobile-specific position overrides (fit within viewBox, avoid overlap)
const getMobileBaseOverride = (
  region: string
): { baseX?: number; baseY?: number } | null => {
  switch (region) {
    case "Northeast":
    case "Mid-Atlantic":
    case "Southeast":
      return { baseX: 820 }; // Right of map (780), stays clear of map SVG
    case "Northwest":
    case "Big Sky":
    case "Great Plains North":
    case "Great Plains South":
    case "Great Lakes":
      return { baseY: 45 }; // Push up to avoid overlap with map top
    case "West Coast":
      return { baseX: 70 }; // Pull right slightly to avoid left edge cutoff
    case "Texico":
    case "South Central":
      return { baseY: 512 }; // Below map bottom (520), fits in viewBox
    default:
      return null;
  }
};

// Base position type for regions and districts
type BasePosition = {
  baseX: number;
  baseY: number;
  labelDirection: "above" | "below" | "left" | "right";
};

type ViewBoxBounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

// Dynamic positioning function with collision detection
const getDynamicPosition = (
  region: string,
  activeMetricCount: number,
  totalHeight: number,
  allRegions: string[],
  allTotalHeights: Record<string, number>,
  isMobile?: boolean,
  customPositions?: Record<string, BasePosition>,
  viewBoxBounds?: ViewBoxBounds
): {
  labelX: number;
  labelY: number;
  labelDirection: "above" | "below" | "left" | "right";
} => {
  const positions = customPositions ?? baseRegionPositions;
  const base = positions[region];
  if (!base) return { labelX: 0, labelY: 0, labelDirection: "above" };

  const bounds = isMobile ? MAP_BOUNDS_MOBILE : MAP_BOUNDS;
  // Collision bounds are intentionally conservative for district metrics because
  // the visible text (district name) can be wider than the numeric stack.
  const metricWidth = customPositions ? 110 : 80;
  const derivedLineHeight =
    activeMetricCount > 0 ? totalHeight / activeMetricCount : 0;

  const baselineConstraints =
    customPositions && viewBoxBounds && activeMetricCount > 0
      ? (() => {
          const edgePad = 2;
          const halfW = metricWidth / 2;
          const minX = viewBoxBounds.minX + halfW + edgePad;
          const maxX =
            viewBoxBounds.minX + viewBoxBounds.width - halfW - edgePad;
          const minY = viewBoxBounds.minY + edgePad + derivedLineHeight;
          const maxY =
            viewBoxBounds.minY +
            viewBoxBounds.height -
            edgePad -
            (activeMetricCount - 1) * derivedLineHeight;
          return { minX, maxX, minY, maxY };
        })()
      : undefined;
  const boundsOptions = customPositions
    ? {
        metricWidth,
        baselineMode: {
          metricCount: activeMetricCount,
          lineHeight: derivedLineHeight,
          topPad: 6,
          bottomPad: 6,
          constraints: baselineConstraints,
        },
      }
    : { metricWidth };
  const mobileOverride =
    !customPositions && isMobile ? getMobileBaseOverride(region) : null;
  let labelX = mobileOverride?.baseX ?? base.baseX;
  let labelY = mobileOverride?.baseY ?? base.baseY;

  const isBottomRegion =
    region === "Texico" ||
    region === "South Central" ||
    (!customPositions && base.labelDirection === "below");

  // Calculate metric bounds
  const metricPadding = 15; // Buffer from map SVG to prevent overlap
  const textHeight = totalHeight;

  // Check if metrics would overlap with map and calculate required offset
  // Skip for custom positions (per-district in region scope) — metrics sit on the map
  let requiredOffset = 0;

  if (!customPositions) {
    switch (base.labelDirection) {
      case "above": {
        const metricBottom = labelY + textHeight / 2;
        if (metricBottom > bounds.top - metricPadding) {
          requiredOffset = metricBottom - (bounds.top - metricPadding);
        }
        labelY -= requiredOffset;
        break;
      }
      case "below": {
        const metricTop = labelY - textHeight / 2;
        const wouldTouchMap = metricTop < bounds.bottom + metricPadding;
        const wouldGoOffScreen =
          labelY + textHeight / 2 > bounds.viewBoxHeight - 15;

        if (wouldGoOffScreen) {
          requiredOffset =
            labelY + textHeight / 2 - (bounds.viewBoxHeight - 15);
          labelY -= requiredOffset;
        } else if (wouldTouchMap) {
          requiredOffset = bounds.bottom + metricPadding - metricTop;
          labelY += requiredOffset;
        }
        break;
      }
      case "right": {
        const metricLeft = labelX - metricWidth / 2;
        if (metricLeft < bounds.right + metricPadding) {
          requiredOffset = bounds.right + metricPadding - metricLeft;
        }
        labelX += requiredOffset;
        break;
      }
      case "left": {
        const metricRight = labelX + metricWidth / 2;
        if (metricRight > bounds.left - metricPadding) {
          requiredOffset = metricRight - (bounds.left - metricPadding);
        }
        labelX -= requiredOffset;
        break;
      }
    }
  }

  // Now check for collisions with other regions
  const allBounds: MetricBounds[] = [];

  const clampDistrictAnchorToViewBox = (
    anchorX: number,
    anchorY: number,
    lineHeight: number
  ): { x: number; y: number } => {
    if (!customPositions || !viewBoxBounds || activeMetricCount <= 0) {
      return { x: anchorX, y: anchorY };
    }

    const edgePad = 2;
    const halfW = metricWidth / 2;
    const minX = viewBoxBounds.minX + halfW + edgePad;
    const maxX = viewBoxBounds.minX + viewBoxBounds.width - halfW - edgePad;

    // District labels (region scope) are always above the metrics.
    const minY = viewBoxBounds.minY + edgePad + lineHeight;
    const maxY =
      viewBoxBounds.minY +
      viewBoxBounds.height -
      edgePad -
      (activeMetricCount - 1) * lineHeight;

    return {
      x: Math.min(Math.max(anchorX, minX), maxX),
      y: Math.min(Math.max(anchorY, minY), maxY),
    };
  };

  // First, calculate all initial positions
  allRegions.forEach(r => {
    const rBase = positions[r];
    if (!rBase) return;

    const rMobileOverride =
      !customPositions && isMobile ? getMobileBaseOverride(r) : null;
    let rX = rMobileOverride?.baseX ?? rBase.baseX;
    let rY = rMobileOverride?.baseY ?? rBase.baseY;
    const rHeight = allTotalHeights[r] || 0;

    // Apply map boundary adjustments (skip for custom/district positions)
    if (!customPositions) {
      let rOffset = 0;
      switch (rBase.labelDirection) {
        case "above": {
          const rMetricBottom = rY + rHeight / 2;
          if (rMetricBottom > bounds.top - metricPadding) {
            rOffset = rMetricBottom - (bounds.top - metricPadding);
          }
          rY -= rOffset;
          break;
        }
        case "below": {
          const rMetricTop = rY - rHeight / 2;
          const rWouldTouchMap = rMetricTop < bounds.bottom + metricPadding;
          const rWouldGoOffScreen =
            rY + rHeight / 2 > bounds.viewBoxHeight - 15;
          if (rWouldGoOffScreen) {
            rOffset = rY + rHeight / 2 - (bounds.viewBoxHeight - 15);
            rY -= rOffset;
          } else if (rWouldTouchMap) {
            rOffset = bounds.bottom + metricPadding - rMetricTop;
            rY += rOffset;
          }

          // Extra clamp ONLY for bottom regions so their stacks don't go off-screen.
          if (rBase.labelDirection === "below") {
            const rLineHeight = activeMetricCount === 1 ? 26 : 22;
            const rLastBaseline = rY + (activeMetricCount - 1) * rLineHeight;
            const rMaxBaseline = bounds.viewBoxHeight - 18;
            if (rLastBaseline > rMaxBaseline) {
              rY -= rLastBaseline - rMaxBaseline;
            }
          }
          break;
        }
        case "right": {
          const rMetricLeft = rX - metricWidth / 2;
          if (rMetricLeft < bounds.right + metricPadding) {
            rOffset = bounds.right + metricPadding - rMetricLeft;
          }
          rX += rOffset;
          break;
        }
        case "left": {
          const rMetricRight = rX + metricWidth / 2;
          if (rMetricRight > bounds.left - metricPadding) {
            rOffset = rMetricRight - (bounds.left - metricPadding);
          }
          rX -= rOffset;
          break;
        }
      }
    }

    // For custom/district positions under a zoomed viewBox, clamp the anchor
    // for *all* bounds before collision resolution so we don't reintroduce
    // overlaps via per-label clamping later.
    if (customPositions && viewBoxBounds && activeMetricCount > 0) {
      const rLineHeight = rHeight / activeMetricCount;
      const clamped = clampDistrictAnchorToViewBox(rX, rY, rLineHeight);
      rX = clamped.x;
      rY = clamped.y;
    }

    allBounds.push(
      getMetricBounds(r, rX, rY, rHeight, rBase.labelDirection, boundsOptions)
    );
  });

  // Resolve collisions
  let resolvedBounds = resolveCollisions(allBounds, positions, boundsOptions);

  // In baseline mode, collision resolution can push bounds outside the viewBox;
  // clamp them back and resolve again so final DOM positions stay collision-free.
  if (customPositions && viewBoxBounds && activeMetricCount > 0) {
    const baselineTopPad = boundsOptions?.baselineMode?.topPad ?? 6;
    const baselineLineHeight = boundsOptions?.baselineMode?.lineHeight ?? 0;
    const baselineTopToBaseline = baselineLineHeight * 2 + baselineTopPad;

    for (let pass = 0; pass < 2; pass++) {
      const clampedBounds = resolvedBounds.map(b => {
        const anchorX = b.x + b.width / 2;
        const anchorY = b.y + baselineTopToBaseline;
        const clamped = clampDistrictAnchorToViewBox(
          anchorX,
          anchorY,
          baselineLineHeight
        );
        const bBase = positions[b.region];
        const bHeight = allTotalHeights[b.region] || 0;
        return getMetricBounds(
          b.region,
          clamped.x,
          clamped.y,
          bHeight,
          bBase?.labelDirection ?? b.direction,
          boundsOptions
        );
      });

      resolvedBounds = resolveCollisions(
        clampedBounds,
        positions,
        boundsOptions
      );
    }
  }

  // Find the resolved position for this region
  const resolved = resolvedBounds.find(b => b.region === region);
  if (resolved) {
    labelX = resolved.x + resolved.width / 2;
    if (customPositions && derivedLineHeight > 0) {
      labelY = resolved.y + derivedLineHeight * 2 + 6;
    } else {
      labelY = resolved.y + resolved.height / 2;
    }
  }

  // Final clamp ONLY for bottom regions.
  if (
    isBottomRegion &&
    base.labelDirection === "below" &&
    activeMetricCount > 0
  ) {
    const lineHeight = activeMetricCount === 1 ? 26 : 22;
    const lastBaseline = labelY + (activeMetricCount - 1) * lineHeight;
    const maxBaseline = bounds.viewBoxHeight - 18;
    if (lastBaseline > maxBaseline) {
      labelY -= lastBaseline - maxBaseline;
    }
  }

  // Mobile: clamp to viewBox edges so metrics never go off-screen or overlap Chi Alpha toggle
  // Skip for custom positions (per-district in region scope) — zoomed viewBox differs
  if (isMobile && !customPositions) {
    const halfW = metricWidth / 2;
    const vw = MAP_BOUNDS_MOBILE.viewBoxWidth;
    const vh = MAP_BOUNDS_MOBILE.viewBoxHeight;
    const edgePad = 10;
    const rightSidePad = 180; // Space for Chi Alpha toggle + screen edge (viewBox units)
    if (base.labelDirection === "right") {
      labelX = Math.min(labelX, vw - halfW - rightSidePad);
    } else if (base.labelDirection === "left") {
      labelX = Math.max(labelX, halfW + edgePad);
    } else if (base.labelDirection === "above") {
      const lineH = activeMetricCount === 1 ? 28 : 22;
      const blockHeight = activeMetricCount * lineH;
      const minY = blockHeight + edgePad;
      labelY = Math.max(labelY, minY);
    } else if (base.labelDirection === "below") {
      const lineH = activeMetricCount === 1 ? 28 : 22;
      const blockHeight = activeMetricCount * lineH;
      labelY = Math.min(labelY, vh - blockHeight - edgePad);
    }
  }

  // For custom/district positions under a zoomed viewBox, clamp within the current viewBox
  if (customPositions && viewBoxBounds && activeMetricCount > 0) {
    const edgePad = 8;
    const halfW = metricWidth / 2;
    const minX = viewBoxBounds.minX + halfW + edgePad;
    const maxX = viewBoxBounds.minX + viewBoxBounds.width - halfW - edgePad;

    const derivedLineHeight = totalHeight / activeMetricCount;
    // District labels (region scope) are always above the metrics.
    const minY = viewBoxBounds.minY + edgePad + derivedLineHeight;
    const maxY =
      viewBoxBounds.minY +
      viewBoxBounds.height -
      edgePad -
      (activeMetricCount - 1) * derivedLineHeight;

    labelX = Math.min(Math.max(labelX, minX), maxX);
    labelY = Math.min(Math.max(labelY, minY), maxY);
  }

  // Final clamp: prevent overlap with map SVG
  // Skip map-boundary clamping when using custom positions (e.g. per-district
  // bubbles in region scope) — those sit inside the map, not at its edges.
  if (!customPositions) {
    const mapPad = 15;
    const mapPadBelow = 5; // Tighter for below (limited space between map bottom and viewBox)
    const mapLeft = bounds.left;
    const mapRight = bounds.right;
    const mapTop = bounds.top;
    const mapBottom = bounds.bottom;
    switch (base.labelDirection) {
      case "above":
        if (labelY > mapTop - mapPad) labelY = mapTop - mapPad;
        break;
      case "below": {
        const minY = mapBottom + mapPadBelow;
        if (labelY < minY) {
          // Only clamp if block would still fit in viewBox
          const blockH =
            (activeMetricCount === 1 ? 26 : 22) * activeMetricCount;
          if (minY + blockH <= bounds.viewBoxHeight - 18) labelY = minY;
        }
        break;
      }
      case "right":
        if (labelX - metricWidth / 2 < mapRight + mapPad) {
          labelX = mapRight + mapPad + metricWidth / 2;
        }
        break;
      case "left":
        if (labelX + metricWidth / 2 > mapLeft - mapPad) {
          labelX = mapLeft - mapPad - metricWidth / 2;
        }
        break;
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

const buildDistrictMetricPositions = (
  districtIds: string[],
  viewBoxBounds?: ViewBoxBounds
): Record<string, BasePosition> => {
  const idsWithCentroids = districtIds.filter(id => !!districtCentroids[id]);
  if (idsWithCentroids.length === 0) return {};

  // A couple dense clusters consistently end up with one persistent overlap
  // even after collision resolution; add a tiny initial stagger so the solver
  // has an easier time finding a non-overlapping layout.
  const hasGreatPlainsSouthCluster =
    idsWithCentroids.includes("Iowa") &&
    idsWithCentroids.includes("Nebraska") &&
    idsWithCentroids.includes("NorthernMissouri");
  const hasAppalachianKentucky =
    idsWithCentroids.includes("Appalachian") &&
    idsWithCentroids.includes("Kentucky");
  const isGreatPlainsSouth =
    hasGreatPlainsSouthCluster &&
    idsWithCentroids.includes("Kansas") &&
    idsWithCentroids.includes("SouthernMissouri");
  const isMidAtlantic =
    idsWithCentroids.includes("Appalachian") &&
    idsWithCentroids.includes("Kentucky") &&
    idsWithCentroids.includes("Tennessee") &&
    idsWithCentroids.includes("NorthCarolina") &&
    idsWithCentroids.includes("Potomac");

  const center = idsWithCentroids.reduce(
    (acc, id) => {
      const centroid = districtCentroids[id];
      return {
        x: acc.x + centroid.x,
        y: acc.y + centroid.y,
      };
    },
    { x: 0, y: 0 }
  );

  const regionCenterX = center.x / idsWithCentroids.length;
  const regionCenterY = center.y / idsWithCentroids.length;
  const horizontalOffset = hasGreatPlainsSouthCluster ? 64 : 48;
  const verticalOffset = hasGreatPlainsSouthCluster ? 46 : 38;
  const sideNudge = hasGreatPlainsSouthCluster ? 14 : 10;
  const metricWidth = 80;
  const edgePad = 8;
  const isTexico =
    idsWithCentroids.includes("WestTexas") &&
    idsWithCentroids.includes("NorthTexas") &&
    idsWithCentroids.includes("SouthTexas");

  return idsWithCentroids.reduce<Record<string, BasePosition>>((acc, id) => {
    const centroid = districtCentroids[id];
    const dx = centroid.x - regionCenterX;
    const dy = centroid.y - regionCenterY;

    let labelDirection: BasePosition["labelDirection"] = "below";
    let baseX = centroid.x;
    let baseY = centroid.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx >= 0) {
        labelDirection = "right";
        baseX += horizontalOffset;
      } else {
        labelDirection = "left";
        baseX -= horizontalOffset;
      }
      if (dy > sideNudge) baseY += sideNudge;
      if (dy < -sideNudge) baseY -= sideNudge;
    } else {
      if (dy >= 0) {
        labelDirection = "below";
        baseY += verticalOffset;
      } else {
        labelDirection = "above";
        baseY -= verticalOffset;
      }
      if (dx > sideNudge) baseX += sideNudge;
      if (dx < -sideNudge) baseX -= sideNudge;
    }

    // Texico specific adjustments (user-verified expectations)
    if (isTexico) {
      if (id === "WestTexas") {
        // Bring West Texas below the district (not off to the left)
        labelDirection = "below";
        baseX = centroid.x;
        baseY = centroid.y + verticalOffset + 22;
      } else if (id === "SouthTexas") {
        // Move South Texas to the right and down some more
        labelDirection = "right";
        baseX = centroid.x + horizontalOffset + 18;
        baseY = centroid.y + verticalOffset + 18;
      }
      // NorthTexas should remain as computed (it's already good).
    }

    if (isMidAtlantic) {
      // Potomac sits tight against North Carolina under the zoomed viewBox.
      // A tiny right nudge breaks the last persistent overlap.
      if (id === "Potomac") {
        baseX += 18;
      }
    }

    // Great Plains South is the densest 5-district cluster; use a stable,
    // hand-tuned offset layout to avoid metric-vs-metric overlaps.
    if (isGreatPlainsSouth) {
      const layout: Record<
        string,
        { dx: number; dy: number; dir: BasePosition["labelDirection"] }
      > = {
        Iowa: { dx: 96, dy: -46, dir: "above" },
        Nebraska: { dx: -64, dy: -46, dir: "above" },
        Kansas: { dx: -96, dy: 46, dir: "below" },
        NorthernMissouri: { dx: 20, dy: 46, dir: "below" },
        SouthernMissouri: { dx: 64, dy: 92, dir: "below" },
      };

      const p = layout[id];
      if (p) {
        labelDirection = p.dir;
        baseX = centroid.x + p.dx;
        baseY = centroid.y + p.dy;
      }
    }

    // If we're zoomed into a region, prefer flipping left/right placement for edge districts
    // so metrics remain visible without requiring large clamping shifts.
    if (viewBoxBounds && !isGreatPlainsSouth) {
      const minVisibleX = viewBoxBounds.minX + metricWidth / 2 + edgePad;
      const maxVisibleX =
        viewBoxBounds.minX + viewBoxBounds.width - metricWidth / 2 - edgePad;

      if (labelDirection === "left" && baseX < minVisibleX) {
        labelDirection = "right";
        baseX = centroid.x + horizontalOffset;
      } else if (labelDirection === "right" && baseX > maxVisibleX) {
        labelDirection = "left";
        baseX = centroid.x - horizontalOffset;
      }
    }

    if (hasAppalachianKentucky) {
      if (id === "Appalachian") baseY -= 16;
      if (id === "Kentucky") baseY += 16;
    }

    acc[id] = { baseX, baseY, labelDirection };
    return acc;
  }, {});
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
  isTableOpen = false,
}: InteractiveMapProps) {
  const { isAuthenticated } = usePublicAuth();
  const isMobile = useIsMobile();
  const canHover = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false
    );
  }, []);
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

  const zoomViewBoxBounds = useMemo<ViewBoxBounds | undefined>(() => {
    if (!zoomViewBox) return undefined;
    const parts = zoomViewBox.trim().split(/\s+/).map(Number);
    if (parts.length !== 4 || parts.some(n => Number.isNaN(n)))
      return undefined;
    const [minX, minY, width, height] = parts;
    return { minX, minY, width, height };
  }, [zoomViewBox]);

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
      // Show only user's district (resolve to SVG path for composite districts)
      const svgPath = resolveDistrictSvgPath(userDistrictId);
      return districts.filter(d => d.id === svgPath);
    }
    // Default to all if no valid filter
    return districts;
  }, [districts, scopeFilter, userRegionId, userDistrictId]);

  // Metric toggles state
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(new Set());
  const [metricsExpanded, setMetricsExpanded] = useState(true);
  const shouldCollapseForNationalMobile =
    isMobile &&
    scopeFilter === "NATIONAL" &&
    (!!selectedDistrictId || isTableOpen);

  useEffect(() => {
    if (shouldCollapseForNationalMobile) {
      setMetricsExpanded(false);
    } else {
      setMetricsExpanded(true);
    }
  }, [shouldCollapseForNationalMobile]);

  // Line width matches the label above (Chi Alpha / region name)
  const labelRef = useRef<HTMLSpanElement>(null);
  const labelCRef = useRef<HTMLSpanElement>(null);
  const [labelWidthPx, setLabelWidthPx] = useState(0);
  const [labelCWidthPx, setLabelCWidthPx] = useState(0);
  useLayoutEffect(() => {
    const labelEl = labelRef.current;
    const labelCEl = labelCRef.current;
    if (!labelEl && !labelCEl) return;
    const ro = new ResizeObserver(() => {
      if (labelEl) {
        setLabelWidthPx(labelEl.offsetWidth);
      }
      if (labelCEl) {
        setLabelCWidthPx(labelCEl.offsetWidth);
      }
    });
    if (labelEl) {
      ro.observe(labelEl);
      setLabelWidthPx(labelEl.offsetWidth);
    }
    if (labelCEl) {
      ro.observe(labelCEl);
      setLabelCWidthPx(labelCEl.offsetWidth);
    }
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

  const { data: regionNeeds } = trpc.metrics.regionNeeds.useQuery(
    { region: userRegionId ?? "" },
    { enabled: scopeFilter === "REGION" && !!userRegionId }
  );

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

  const needsSummary =
    scopeFilter === "REGION" && userRegionId ? regionNeeds : needsAggregate;

  // Determine the label to display:
  // - NATIONAL scope: show selected district's region when one is selected, else "Chi Alpha"
  // - If hovering over a region (and not national), show that region name
  // - If in REGION scope filter, show user's region name
  // - If in DISTRICT scope filter, show user's district name
  // - Otherwise show "Chi Alpha"
  const getDisplayLabel = (): string => {
    if (scopeFilter === "REGION" && userRegionId) return userRegionId;
    if (scopeFilter === "DISTRICT" && userDistrictId) return userDistrictId;
    if (scopeFilter === "NATIONAL") {
      // When a district is selected, show its region name (works on mobile with drawer open)
      if (selectedDistrictId) {
        const selectedDistrict = districts.find(
          d => d.id === selectedDistrictId
        );
        const region =
          selectedDistrict?.region || DISTRICT_REGION_MAP[selectedDistrictId];
        if (region) return region;
      }
      if (hoveredRegion) return hoveredRegion;
      return "Chi Alpha";
    }
    if (hoveredRegion) return hoveredRegion;
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

  // Clear hover state when switching to national view so label updates immediately
  useEffect(() => {
    if (scopeFilter === "NATIONAL") {
      setHoveredRegion(null);
      setHoveredRegionLabel(null);
    }
  }, [scopeFilter]);

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

    // On mobile: reposition Alaska (closer to Washington, left side) and Hawaii (under Arizona/SoCal)
    const applyMobileReposition = (svg: SVGSVGElement) => {
      if (!isMobile) return;
      const ns = "http://www.inkscape.org/namespaces/inkscape";
      const getLabel = (p: Element) =>
        p.getAttributeNS(ns, "label") || p.getAttribute("inkscape:label") || "";
      const paths = svg.querySelectorAll("path");
      paths.forEach(p => {
        const label = getLabel(p);
        if (label === "Alaska") {
          (p as SVGPathElement).setAttribute("transform", "translate(4, 6)");
        } else if (label === "Hawaii") {
          (p as SVGPathElement).setAttribute("transform", "translate(16, 0)");
        }
      });
    };
    applyMobileReposition(clickSvg);
    applyMobileReposition(visualSvg);

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
    const getPathBaseTransform = (pathId: string) =>
      isMobile && pathId === "Alaska"
        ? "translate(4, 6)"
        : isMobile && pathId === "Hawaii"
          ? "translate(16, 0)"
          : "translateY(0)";
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
      "Penn-Del": "#8A5A5A", // liberty brick
      SouthernNewEngland: "#6A5A6A", // vineyard plum
      Connecticut: "#5A7A7A", // harbor teal
      Maine: "#4A5A5A", // granite
      Massachusetts: "#8A4A5A", // cranberry
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
    // Other districts in same region on hover - subtle lightening (not too bright)
    const REGION_HOVER_FILTER =
      "brightness(1.12) saturate(1.03) drop-shadow(0 1px 2px rgba(0,0,0,0.12))";
    // Mobile: region brightens more when district selected (better visibility on small screens)
    const REGION_HOVER_FILTER_MOBILE =
      "brightness(1.22) saturate(1.06) drop-shadow(0 1px 3px rgba(0,0,0,0.15))";
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
          pathId === resolveDistrictSvgPath(userDistrictId) &&
          (districtColors[pathId] || districtColors[userDistrictId]));

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
      path.style.transform = getPathBaseTransform(pathId);

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
          if (pathId !== resolveDistrictSvgPath(userDistrictId)) {
            shouldHide = true;
          }
        }
      }

      // Apply styling based on dimming/hiding logic
      const isInSelectedRegion =
        selectedDistrictId && selectedRegion && region === selectedRegion;
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
        // Districts outside selected region - normal brightness
        path.style.filter = BASE_FILTER;
        path.style.opacity = "1";
        path.style.visibility = "visible";
      } else if (isInSelectedRegion) {
        // Districts in selected region (not the selected one) - lighten like region hover
        path.style.filter =
          isMobile && selectedDistrictId
            ? REGION_HOVER_FILTER_MOBILE
            : REGION_HOVER_FILTER;
        path.style.opacity = "1";
        path.style.visibility = "visible";
      } else {
        path.style.filter = BASE_FILTER;
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
          isHiddenByScope = pathId !== resolveDistrictSvgPath(userDistrictId);
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

        // On non-hover devices, mouseenter can fire but mouseleave often never
        // does, leaving hover brightness stuck on a district even while idle.
        // Clear hover state immediately after tap to prevent sticky highlight.
        if (!canHover) {
          setHoveredDistrict(null);
          setHoveredRegion(null);
          setTooltipPos(null);

          // Restore the raised path to its original z-order
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
        }
      };
      path.addEventListener("click", clickHandler);

      // Touch / coarse-pointer devices cannot reliably "leave" hover.
      // Skip hover listeners entirely so districts never get stuck lit.
      if (!canHover) return;

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
              ? `${getPathBaseTransform(vPathId)} translateY(-0.5px)`
              : getPathBaseTransform(vPathId);
          } else {
            // Other regions stay at their base appearance.
            vPath.style.opacity = "1";
            vPath.style.filter =
              selectedDistrictId === vPathId ? SELECTED_FILTER : BASE_FILTER;
            vPath.style.strokeWidth =
              selectedDistrictId === vPathId
                ? BORDER_WIDTH_SELECTED
                : BORDER_WIDTH;
            vPath.style.transform = getPathBaseTransform(vPathId);
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

        // Restore to default state: selected district bright, region lightened, others base
        visualPaths.forEach(vPath => {
          const vPathId = getPathId(vPath);
          if (!vPathId) return;

          if (selectedDistrictId === vPathId) {
            vPath.style.filter = SELECTED_FILTER;
          } else if (
            selectedDistrictId &&
            selectedRegion &&
            (districtMap.get(vPathId)?.region ||
              DISTRICT_REGION_MAP[vPathId]) === selectedRegion
          ) {
            vPath.style.filter = REGION_HOVER_FILTER;
          } else {
            vPath.style.filter = BASE_FILTER;
          }
          vPath.style.opacity = "1";
          vPath.style.strokeWidth = BORDER_WIDTH;
          vPath.style.transform = getPathBaseTransform(vPathId);
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
          isVisible = pathId === resolveDistrictSvgPath(userDistrictId);
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
        const paddingX = width * (isDistrictScope ? 0.8 : 0.4);
        const paddingY = height * (isDistrictScope ? 0.8 : 0.4);

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
    viewState,
    onDistrictSelect,
    onNationalClick,
    scopeFilter,
    userRegionId,
    userDistrictId,
    originalViewBox,
    isMobile,
    canHover,
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
          className={`absolute right-0 z-50 flex flex-col items-end gap-0.5 bg-transparent transition-all duration-300 ${
            isMobile ? "top-6" : "top-5 sm:top-6"
          } ${isMobile ? "right-2 pr-4 max-w-[85%]" : "-mr-2"}`}
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
            <span
              aria-hidden
              ref={labelCRef}
              className={`font-beach font-medium text-slate-800 tracking-wide leading-none ${selectedDistrictId ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl"}`}
              style={{
                position: "absolute",
                left: "-9999px",
                whiteSpace: "nowrap",
                visibility: "hidden",
              }}
            >
              C
            </span>
          </div>

          {/* "metrics" label + horizontal line (on hover) + collapsible metrics */}
          <div
            className={`flex flex-col items-end w-full bg-transparent transition-all duration-300 ${selectedDistrictId ? "mt-2" : "mt-3"} ${selectedDistrictId ? "max-w-none sm:max-w-[12rem]" : "max-w-none sm:max-w-[16rem]"}`}
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
                  width: labelWidthPx
                    ? `${isMobile ? Math.round(labelWidthPx * 0.92) : labelWidthPx}px`
                    : undefined,
                  transform: metricsExpanded ? "scaleX(1)" : "scaleX(0)",
                  transition:
                    "opacity 0.25s ease-out, transform 1s cubic-bezier(0.22, 1, 0.36, 1)",
                  transitionDelay: metricsExpanded ? "0ms" : "1s, 0ms", // fade after line recedes
                }}
              />
              <span
                className={`font-medium text-slate-500 uppercase tracking-wider leading-none shrink-0 ${isMobile ? "text-[9px]" : "text-[10px]"}`}
              >
                Metrics
              </span>
              <svg
                className={`text-slate-400 group-hover:text-slate-600 transition-all duration-300 ease-out flex-shrink-0 w-3.5 h-3.5 ${
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
                className={`flex flex-col items-end pt-0 pr-1 mt-1.5 overflow-hidden transition-all duration-300 ${isMobile ? "gap-1" : selectedDistrictId ? "gap-2" : "gap-3"}`}
              >
                {/* Yes - closest to line: slides out first, back in last */}
                <button
                  data-metric-toggle="yes"
                  onClick={() => toggleMetric("yes")}
                  className={`flex items-center transition-all hover:scale-105 w-full justify-end min-w-0 ${isMobile ? "gap-1.5" : "gap-2"}`}
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
                    className={`font-medium text-slate-700 whitespace-nowrap tracking-tight ${isMobile ? "text-base" : selectedDistrictId ? "text-xl md:text-2xl" : "text-xl md:text-4xl"}`}
                    style={{
                      lineHeight: "1",
                      minWidth: isMobile
                        ? "4rem"
                        : selectedDistrictId
                          ? "6rem"
                          : "8.5rem",
                      textAlign: "right",
                    }}
                  >
                    Yes
                  </span>
                  <span
                    className={`font-semibold text-slate-900 tabular-nums ${isMobile ? "text-base" : selectedDistrictId ? "text-xl md:text-2xl" : "text-xl md:text-4xl"}`}
                    style={{
                      lineHeight: "1",
                      width: isMobile ? "2.5rem" : "4rem",
                      textAlign: "center",
                    }}
                  >
                    {showPublicPlaceholder ? "—" : displayedTotals.yes}
                  </span>
                  <div
                    className={`rounded-full border-2 transition-all duration-200 flex-shrink-0 flex items-center justify-center ${isMobile ? "w-3.5 h-3.5" : "w-6 h-6"} ${
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
                  data-metric-toggle="maybe"
                  onClick={() => toggleMetric("maybe")}
                  className={`flex items-center transition-all hover:scale-105 w-full justify-end min-w-0 ${isMobile ? "gap-1.5" : "gap-2"}`}
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
                    className={`font-medium text-slate-700 whitespace-nowrap tracking-tight ${isMobile ? "text-sm" : selectedDistrictId ? "text-lg md:text-xl" : "text-lg md:text-[1.65rem]"}`}
                    style={{
                      lineHeight: "1",
                      minWidth: isMobile
                        ? "4rem"
                        : selectedDistrictId
                          ? "6rem"
                          : "8.5rem",
                      textAlign: "right",
                    }}
                  >
                    Maybe
                  </span>
                  <span
                    className={`font-semibold text-slate-900 tracking-tight tabular-nums ${isMobile ? "text-sm" : selectedDistrictId ? "text-lg md:text-xl" : "text-lg md:text-[1.65rem]"}`}
                    style={{
                      lineHeight: "1",
                      width: isMobile ? "2.5rem" : "4rem",
                      textAlign: "center",
                    }}
                  >
                    {showPublicPlaceholder ? "—" : displayedTotals.maybe}
                  </span>
                  <div
                    className={`rounded-full border-2 transition-all duration-200 flex-shrink-0 flex items-center justify-center ${isMobile ? "w-3.5 h-3.5" : "w-5 h-5"} ${
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
                  data-metric-toggle="no"
                  onClick={() => toggleMetric("no")}
                  className={`flex items-center transition-all hover:scale-105 w-full justify-end min-w-0 ${isMobile ? "gap-1.5" : "gap-2"}`}
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
                    className={`font-medium text-slate-700 whitespace-nowrap tracking-tight ${isMobile ? "text-sm" : selectedDistrictId ? "text-base md:text-lg" : "text-base md:text-2xl"}`}
                    style={{
                      lineHeight: "1",
                      minWidth: isMobile
                        ? "4rem"
                        : selectedDistrictId
                          ? "6rem"
                          : "8.5rem",
                      textAlign: "right",
                    }}
                  >
                    No
                  </span>
                  <span
                    className={`font-semibold text-slate-900 tracking-tight tabular-nums ${isMobile ? "text-sm" : selectedDistrictId ? "text-base md:text-lg" : "text-base md:text-2xl"}`}
                    style={{
                      lineHeight: "1",
                      width: isMobile ? "2.5rem" : "4rem",
                      textAlign: "center",
                    }}
                  >
                    {showPublicPlaceholder ? "—" : displayedTotals.no}
                  </span>
                  <div
                    className={`rounded-full border-2 transition-all duration-200 flex-shrink-0 flex items-center justify-center ${isMobile ? "w-3 h-3" : "w-4 h-4"} ${
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
                  data-metric-toggle="notInvited"
                  onClick={() => toggleMetric("notInvited")}
                  className={`flex items-center transition-all hover:scale-105 w-full justify-end min-w-0 ${isMobile ? "gap-1.5" : "gap-2"}`}
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
                    className={`font-medium text-slate-700 whitespace-nowrap tracking-tight ${isMobile ? "text-xs" : selectedDistrictId ? "text-sm md:text-base" : "text-sm md:text-[1.2rem]"}`}
                    style={{
                      lineHeight: "1",
                      minWidth: isMobile
                        ? "4rem"
                        : selectedDistrictId
                          ? "6rem"
                          : "8.5rem",
                      textAlign: "right",
                    }}
                  >
                    Not Invited Yet
                  </span>
                  <span
                    className={`font-semibold text-slate-900 tracking-tight tabular-nums ${isMobile ? "text-xs" : selectedDistrictId ? "text-sm md:text-base" : "text-sm md:text-[1.2rem]"}`}
                    style={{
                      lineHeight: "1",
                      width: isMobile ? "2.5rem" : "4rem",
                      textAlign: "center",
                    }}
                  >
                    {showPublicPlaceholder ? "—" : displayedTotals.notInvited}
                  </span>
                  <div
                    className={`rounded-full border-2 transition-all duration-200 flex-shrink-0 flex items-center justify-center ${isMobile ? "w-3 h-3" : "w-4 h-4"} ${
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
          className={`absolute left-0 z-40 flex flex-col items-start transition-all duration-300 ${selectedDistrictId ? "top-5 sm:top-5 gap-1" : "top-5 sm:top-6 gap-1 sm:gap-2"} ${isMobile ? "pl-4" : "pl-1 sm:pl-2"}`}
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
          {!shouldCollapseForNationalMobile && (
            <div className="flex-shrink-0">
              <div className="inline-flex flex-col gap-y-0.5">
                <div className="flex items-baseline gap-x-2">
                  <span
                    className={`font-medium text-slate-500 shrink-0 text-left ${isMobile ? "text-[11px]" : selectedDistrictId ? "text-xs" : "text-sm"}`}
                  >
                    Needs Met:
                  </span>
                  <span
                    className={`font-semibold text-slate-700 tabular-nums min-w-0 ${isMobile ? "text-[11px]" : selectedDistrictId ? "text-xs" : "text-sm"}`}
                  >
                    {needsSummary ? needsSummary.metNeeds : "—"}{" "}
                    <span className="text-slate-500 font-medium">/</span>{" "}
                    {needsSummary ? needsSummary.totalNeeds : "—"}
                  </span>
                </div>
                <div className="flex items-baseline gap-x-2">
                  <span
                    className={`font-medium text-slate-500 shrink-0 text-left ${isMobile ? "text-[11px]" : selectedDistrictId ? "text-xs" : "text-sm"}`}
                  >
                    Funds Received:
                  </span>
                  <span
                    className={`text-slate-600 tabular-nums min-w-0 ${isMobile ? "text-[11px]" : selectedDistrictId ? "text-xs" : "text-sm"}`}
                  >
                    {needsSummary
                      ? `$${(needsSummary.metFinancial / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                      : "—"}{" "}
                    <span className="text-slate-500 font-medium">/</span>{" "}
                    {needsSummary
                      ? `$${(needsSummary.totalFinancial / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
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
          className="absolute inset-0 pointer-events-none z-10 transition-transform duration-300 ease-out"
          style={{
            filter: "blur(0.3px) brightness(0.82)", // Slightly darker map with same subtle blur
            transform: selectedDistrictId
              ? isMobile
                ? "scale(0.95) translate(-20px, -15px)"
                : "scale(1.02) translate(-20px, -26px)" // Slightly larger when panel open
              : isMobile
                ? "scale(0.95) translate(-20px, -15px)" // Smaller on mobile to fit in top half
                : "scale(0.88) translate(-20px, -10px)", // National map moved down a little
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
            className={`absolute inset-0 flex items-center justify-center z-40 pointer-events-none transition-transform duration-300 ease-out`}
            style={{
              transform: selectedDistrictId
                ? isMobile
                  ? "scale(1)"
                  : "scale(1.02)"
                : isMobile
                  ? "scale(1)" // XAN stays fixed while map scales up
                  : "scale(0.88)",
              transformOrigin: "center",
            }}
          >
            <button
              type="button"
              aria-label="Open XAN (National Team)"
              className="absolute cursor-pointer pointer-events-auto focus-visible:outline-none group/xan transition-all duration-300 ease-out"
              style={{
                left: isMobile
                  ? selectedDistrictId || isTableOpen
                    ? "calc(13% - 14px)"
                    : selectedDistrictId
                      ? "calc(18% - 14px)"
                      : "calc(15% - 14px)"
                  : selectedDistrictId
                    ? "calc(8% - 19px)"
                    : "calc(6% - 19px)",
                bottom: isMobile
                  ? selectedDistrictId || isTableOpen
                    ? "30%"
                    : selectedDistrictId
                      ? "34%"
                      : "39%"
                  : selectedDistrictId
                    ? "12%"
                    : "16%",
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
                  width: selectedDistrictId
                    ? isMobile
                      ? "1.6vw"
                      : "2.2vw"
                    : isMobile
                      ? "2.5vw"
                      : "3.5vw",
                  height: selectedDistrictId
                    ? isMobile
                      ? "1.6vw"
                      : "2.2vw"
                    : isMobile
                      ? "2.5vw"
                      : "3.5vw",
                  minWidth: selectedDistrictId
                    ? isMobile
                      ? "20px"
                      : "24px"
                    : isMobile
                      ? "26px"
                      : "38px",
                  minHeight: selectedDistrictId
                    ? isMobile
                      ? "20px"
                      : "24px"
                    : isMobile
                      ? "26px"
                      : "38px",
                }}
              >
                <span
                  className={`text-white font-semibold ${selectedDistrictId ? "text-[9px]" : isMobile ? "text-[10px]" : "text-sm"}`}
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
          className="absolute inset-0 z-30 transition-transform duration-300 ease-out"
          style={{
            opacity: 0,
            pointerEvents: "auto",
            transform: selectedDistrictId
              ? isMobile
                ? "scale(0.95) translate(-20px, -15px)"
                : "scale(1.02) translate(-20px, -26px)" // Match visual layer when panel open
              : isMobile
                ? "scale(0.95) translate(-20px, -15px)"
                : "scale(0.88) translate(-20px, -10px)", // National map moved down a little
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

        {/* Metric Overlays */}
        <div
          className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none transition-transform duration-300 ease-out"
          style={{
            transform: selectedDistrictId
              ? isMobile
                ? "scale(0.95) translate(-20px, -15px)"
                : "scale(1.02) translate(-20px, -26px)"
              : isMobile
                ? "scale(0.95) translate(-20px, -15px)"
                : "scale(0.88) translate(-20px, -10px)",
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

                // When scope is REGION, show per-district bubbles; otherwise per-region
                const isRegionScope = scopeFilter === "REGION" && userRegionId;
                const baseDistrictPositions =
                  isRegionScope && filteredDistricts.length > 0
                    ? buildDistrictMetricPositions(
                        filteredDistricts.map(d => d.id),
                        zoomViewBoxBounds
                      )
                    : {};
                const regionsToConsider = isRegionScope
                  ? Object.keys(baseDistrictPositions)
                  : scopeFilter === "REGION" && userRegionId
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
                const displayLabels: Record<string, string> = {};

                regionsToConsider.forEach(regionOrDistrictId => {
                  const stats = isRegionScope
                    ? districtStats[regionOrDistrictId] || {
                        yes: 0,
                        maybe: 0,
                        no: 0,
                        notInvited: 0,
                        total: 0,
                      }
                    : regionStats[regionOrDistrictId] || {
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
                    allRegions.push(regionOrDistrictId);
                    allMetricsToShow[regionOrDistrictId] = metricsToShow;
                    displayLabels[regionOrDistrictId] = isRegionScope
                      ? (districts.find(d => d.id === regionOrDistrictId)
                          ?.name ?? regionOrDistrictId)
                      : regionOrDistrictId;
                    const isSingleMetric = metricsToShow.length === 1;
                    const lineHeight = isRegionScope
                      ? isMobile
                        ? isSingleMetric
                          ? 20
                          : 16
                        : isSingleMetric
                          ? 18
                          : 15
                      : isMobile
                        ? isSingleMetric
                          ? 28
                          : 22
                        : isSingleMetric
                          ? 26
                          : 22;
                    allTotalHeights[regionOrDistrictId] =
                      metricsToShow.length * lineHeight;
                  }
                });

                const customPositionsForPositioning =
                  isRegionScope && Object.keys(baseDistrictPositions).length > 0
                    ? baseDistrictPositions
                    : undefined;

                return allRegions.map(region => {
                  const stats = isRegionScope
                    ? districtStats[region] || {
                        yes: 0,
                        maybe: 0,
                        no: 0,
                        notInvited: 0,
                        total: 0,
                      }
                    : regionStats[region] || {
                        yes: 0,
                        maybe: 0,
                        no: 0,
                        notInvited: 0,
                        total: 0,
                      };
                  const metricsToShow = allMetricsToShow[region];

                  if (!metricsToShow || metricsToShow.length === 0) return null;

                  const isSingleMetric = metricsToShow.length === 1;
                  const lineHeight = isRegionScope
                    ? isMobile
                      ? isSingleMetric
                        ? 20
                        : 16
                      : isSingleMetric
                        ? 18
                        : 15
                    : isMobile
                      ? isSingleMetric
                        ? 28
                        : 22
                      : isSingleMetric
                        ? 26
                        : 22;
                  const isHovered = hoveredRegionLabel === region;
                  const totalHeight = allTotalHeights[region];
                  const labelText = displayLabels[region] ?? region;

                  // Calculate position with collision detection
                  const pos = getDynamicPosition(
                    region,
                    activeMetrics.size,
                    totalHeight,
                    allRegions,
                    allTotalHeights,
                    isMobile,
                    customPositionsForPositioning,
                    zoomViewBoxBounds
                  );
                  const direction = pos.labelDirection;

                  // Region label: above metrics for most regions; Northeast has name below (right-side layout)
                  // District labels (region scope) always above metrics
                  const nameX = pos.labelX;
                  const nameBelow =
                    !isRegionScope &&
                    (region === "Northeast" ||
                      region === "Mid-Atlantic" ||
                      region === "Southeast" ||
                      region === "Great Plains South");
                  const lastBaseline =
                    pos.labelY + (metricsToShow.length - 1) * lineHeight;
                  const nameY = nameBelow
                    ? lastBaseline + lineHeight
                    : pos.labelY - lineHeight;
                  const nameAnchor: "start" | "middle" | "end" = "middle";

                  const districtCollisionRect = isRegionScope
                    ? (() => {
                        const width = 110;
                        const topPad = 6;
                        const bottomPad = 6;
                        const topToBaseline = lineHeight * 2 + topPad;
                        const height =
                          (metricsToShow.length + 1) * lineHeight +
                          topPad +
                          bottomPad;
                        return {
                          x: pos.labelX - width / 2,
                          y: pos.labelY - topToBaseline,
                          width,
                          height,
                        };
                      })()
                    : null;

                  return (
                    <g
                      key={region}
                      data-metric-id={region}
                      className="metric-label-group"
                      style={{ pointerEvents: "none" }}
                    >
                      {/* Invisible hit area for hover detection */}
                      <rect
                        x={districtCollisionRect?.x ?? pos.labelX - 40}
                        y={
                          districtCollisionRect?.y ??
                          (nameBelow ? pos.labelY - 30 : pos.labelY - 55)
                        }
                        width={districtCollisionRect?.width ?? 80}
                        height={
                          districtCollisionRect?.height ??
                          (nameBelow ? totalHeight + 70 : totalHeight + 70)
                        }
                        fill="transparent"
                        rx="4"
                      />

                      {/* Region/district name - above metrics (except Northeast: below) */}
                      <text
                        x={nameX}
                        y={nameY}
                        textAnchor={nameAnchor}
                        fontSize={
                          isRegionScope
                            ? isMobile
                              ? isSingleMetric
                                ? "8px"
                                : "7px"
                              : isSingleMetric
                                ? "9px"
                                : "8px"
                            : isMobile
                              ? isSingleMetric
                                ? "11px"
                                : "10px"
                              : isSingleMetric
                                ? "13px"
                                : "12px"
                        }
                        fontWeight="700"
                        letterSpacing="0.5px"
                        className="select-none fill-black"
                        style={{
                          textTransform: "uppercase",
                          fontFamily: "system-ui, -apple-system, sans-serif",
                          opacity: 1,
                        }}
                      >
                        {labelText}
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

                        const dotRadius = isRegionScope
                          ? isMobile
                            ? isSingleMetric
                              ? 4
                              : 3
                            : isSingleMetric
                              ? 3.5
                              : 3
                          : isMobile
                            ? isSingleMetric
                              ? 7
                              : 5
                            : isSingleMetric
                              ? 6
                              : 5;

                        return (
                          <g key={metric.label}>
                            {/* Colored dot */}
                            <circle
                              cx={
                                pos.labelX -
                                (isRegionScope
                                  ? isSingleMetric
                                    ? 16
                                    : 12
                                  : isSingleMetric
                                    ? 26
                                    : 18)
                              }
                              cy={
                                pos.labelY +
                                index * lineHeight -
                                (isRegionScope
                                  ? isSingleMetric
                                    ? 4
                                    : 3
                                  : isSingleMetric
                                    ? 6
                                    : 4)
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
                              fill="#000000"
                              fontSize={
                                isRegionScope
                                  ? isMobile
                                    ? isSingleMetric
                                      ? "14px"
                                      : "10px"
                                    : isSingleMetric
                                      ? "13px"
                                      : "10px"
                                  : isMobile
                                    ? isSingleMetric
                                      ? "22px"
                                      : "15px"
                                    : isSingleMetric
                                      ? "22px"
                                      : "15px"
                              }
                              fontWeight="700"
                              letterSpacing="-0.3px"
                              className="select-none"
                              style={{
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
