import { describe, it, expect, beforeEach } from "vitest";
import { initializeViewStateFromURL, DEFAULT_VIEW_STATE } from "./viewModes";

describe("viewModes", () => {
  beforeEach(() => {
    // Reset URL before each test
    window.history.replaceState({}, "", "/");
  });

  it("should use default view state when no URL params", () => {
    const state = initializeViewStateFromURL();
    expect(state).toEqual(DEFAULT_VIEW_STATE);
    expect(state.districtId).toBe("SouthTexas");
    expect(state.panelOpen).toBe(true);
    expect(state.mode).toBe("district");
  });

  it("should respect URL params when provided", () => {
    window.history.replaceState(
      {},
      "",
      "/?districtId=Colorado&panelOpen=false"
    );
    const state = initializeViewStateFromURL();
    expect(state.districtId).toBe("Colorado");
    expect(state.panelOpen).toBe(false);
  });

  it("should fall back to defaults for missing URL params", () => {
    window.history.replaceState({}, "", "/?viewMode=nation");
    const state = initializeViewStateFromURL();
    expect(state.mode).toBe("nation");
    expect(state.districtId).toBe("SouthTexas"); // Falls back to default
    expect(state.panelOpen).toBe(true); // Falls back to default
  });
});
