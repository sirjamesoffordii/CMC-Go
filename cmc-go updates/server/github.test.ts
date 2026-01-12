import { describe, expect, it } from "vitest";

describe("GitHub API Integration", () => {
  it("validates GitHub API token is set", async () => {
    const token = process.env.GITHUB_API_TOKEN;
    expect(token).toBeDefined();
    expect(token).not.toBe("");
  });

  it("can authenticate with GitHub API", async () => {
    const token = process.env.GITHUB_API_TOKEN;
    if (!token) {
      throw new Error("GITHUB_API_TOKEN not set");
    }

    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          "Accept": "application/vnd.github.v3+json",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("login");
    } catch (error) {
      throw new Error(`GitHub API authentication failed: ${error}`);
    }
  });
});
