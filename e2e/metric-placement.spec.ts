import { test, expect, type Page } from "@playwright/test";

const REGIONS = [
  "Big Sky",
  "Great Lakes",
  "Great Plains North",
  "Great Plains South",
  "Mid-Atlantic",
  "Northeast",
  "Northwest",
  "South Central",
  "Southeast",
  "Texico",
  "West Coast",
] as const;

async function login(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

  await page.locator("#login-email").fill("Admin@cmcgo.app");
  await page.locator("#login-password").fill("Admin1234");
  await page.getByRole("button", { name: "Sign In" }).click();

  await page.waitForURL((url: URL) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });
  await page.goto("/");
}

test.describe("regional district metric placement", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 590, height: 1016 });
    await login(page);
  });

  for (const region of REGIONS) {
    test(`${region}: metrics render outside district shapes`, async ({ page }) => {
      await page.evaluate(regionId => {
        localStorage.setItem("cmc-scope-filter", "REGION");
        localStorage.setItem("cmc-scope-region", regionId);
        localStorage.removeItem("cmc-scope-district");
      }, region);
      await page.reload();

      const expandButton = page.getByLabel("Expand metrics");
      if ((await expandButton.count()) > 0) {
        await expandButton.first().click();
      }

      await page.locator('[data-metric-toggle="yes"]').first().click();
      await page.locator('[data-metric-toggle="maybe"]').first().click();
      await page.locator('[data-metric-toggle="no"]').first().click();
      await page.locator('[data-metric-toggle="notInvited"]').first().click();

      await page.waitForTimeout(1500);

      const placement = await page.evaluate(activeRegion => {
        const groups = Array.from(
          document.querySelectorAll<SVGGElement>(
            "g.metric-label-group[data-metric-id]"
          )
        );

        const overlaps: string[] = [];
        const metricOverlaps: Array<[string, string]> = [];
        const farAway: Array<{ districtId: string; distance: number }> = [];
        const placementIssues: string[] = [];

        const groupByDistrictId = new Map<
          string,
          { g: SVGGElement; bbox: DOMRect }
        >();

        for (const group of groups) {
          const districtId = group.getAttribute("data-metric-id");
          if (!districtId) continue;
          // getBBox() returns SVGRect; normalize to a plain object for later calculations
          const b = group.getBBox();
          groupByDistrictId.set(districtId, {
            g: group,
            bbox: new DOMRect(b.x, b.y, b.width, b.height),
          });
        }

        const metricBBoxes = Object.fromEntries(
          Array.from(groupByDistrictId.entries()).map(([districtId, v]) => [
            districtId,
            {
              x: Math.round(v.bbox.x),
              y: Math.round(v.bbox.y),
              w: Math.round(v.bbox.width),
              h: Math.round(v.bbox.height),
            },
          ])
        );

        const viewBox = groups[0]?.ownerSVGElement?.getAttribute("viewBox");

        const ids = Array.from(groupByDistrictId.keys());
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const a = groupByDistrictId.get(ids[i])!.bbox;
            const b = groupByDistrictId.get(ids[j])!.bbox;
            const intersects = !(
              a.x + a.width <= b.x + 1 ||
              b.x + b.width <= a.x + 1 ||
              a.y + a.height <= b.y + 1 ||
              b.y + b.height <= a.y + 1
            );
            if (intersects) {
              metricOverlaps.push([ids[i], ids[j]]);
            }
          }
        }

        for (const group of groups) {
          const districtId = group.getAttribute("data-metric-id");
          if (!districtId) continue;

          const path = document.querySelector<SVGGraphicsElement>(
            `path#${CSS.escape(districtId)}`
          );
          if (!path) continue;

          const g = group.getBBox();
          const p = path.getBBox();

          const intersects = !(
            g.x + g.width < p.x ||
            g.x > p.x + p.width ||
            g.y + g.height < p.y ||
            g.y > p.y + p.height
          );

          if (intersects) {
            overlaps.push(districtId);
          }

          const dx = Math.max(p.x - (g.x + g.width), g.x - (p.x + p.width), 0);
          const dy = Math.max(
            p.y - (g.y + g.height),
            g.y - (p.y + p.height),
            0
          );
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 170) {
            farAway.push({
              districtId,
              distance: Math.round(distance),
            });
          }

          // Texico-specific expectations (user-requested)
          if (activeRegion === "Texico") {
            const gCenterX = g.x + g.width / 2;
            const gCenterY = g.y + g.height / 2;
            const pCenterX = p.x + p.width / 2;
            const pCenterY = p.y + p.height / 2;

            if (districtId === "WestTexas") {
              // should be below the district (not to the left)
              if (!(gCenterY > pCenterY + 12)) {
                placementIssues.push("WestTexas-not-below");
              }
            }

            if (districtId === "SouthTexas") {
              // should be moved right and down a bit
              if (!(gCenterX > pCenterX + 12 && gCenterY > pCenterY + 8)) {
                placementIssues.push("SouthTexas-not-right-down");
              }
            }
          }
        }

        return {
          renderedGroups: groups.length,
          overlaps,
          metricOverlaps,
          farAway,
          placementIssues,
          debug: {
            viewBox,
            metricBBoxes,
          },
        };
      }, region);

      await page.screenshot({
        path: `test-results/metric-placement/${region.replace(/\s+/g, "-").toLowerCase()}.png`,
        fullPage: true,
      });

      expect(placement.renderedGroups).toBeGreaterThan(0);
      expect(placement.overlaps).toEqual([]);
      expect(
        placement.metricOverlaps,
        placement.metricOverlaps.length > 0
          ? `debug=${JSON.stringify(placement.debug)}`
          : undefined
      ).toEqual([]);
      expect(placement.farAway).toEqual([]);
      expect(placement.placementIssues).toEqual([]);
    });
  }
});
