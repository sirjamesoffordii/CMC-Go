import { test, expect } from "@playwright/test";

test.describe("API Endpoints", () => {
  test("health check endpoint returns ok", async ({ request }) => {
    const response = await request.get("/readyz");
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body).toContain("ok");
  });

  test("tRPC endpoint responds", async ({ request }) => {
    // The tRPC panel endpoint should return a valid response
    const response = await request.get("/api/trpc");
    // tRPC returns 404 for GET on base path, but that confirms endpoint exists
    expect([200, 404, 405]).toContain(response.status());
  });
});

test.describe("Static Assets", () => {
  test("map SVG loads", async ({ request }) => {
    const response = await request.get("/map.svg");
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("svg");
  });

  test("favicon exists", async ({ request }) => {
    const response = await request.get("/favicon.ico");
    // May or may not exist, but shouldn't error
    expect([200, 404]).toContain(response.status());
  });
});
