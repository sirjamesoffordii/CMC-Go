import { describe, expect, it } from "vitest";

// Optional integration test: only runs when token is provided.
describe("GitHub API Integration (optional)", () => {
  const token = process.env.GITHUB_API_TOKEN;

  it("skips when GITHUB_API_TOKEN is not set", async () => {
    if (!token) {
      expect(true).toBe(true);
      return;
    }
    expect(token).not.toBe("");
  });

  it("can authenticate with GitHub API when token is set", async () => {
    if (!token) return;

    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("login");
  });
});
