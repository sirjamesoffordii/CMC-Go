import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initializeViewStateFromURL,
  updateURLWithViewState,
  DEFAULT_VIEW_STATE,
  ViewState,
} from "./viewModes";

// Mock window.location
const mockLocation = {
  search: "",
  pathname: "/",
};

const mockHistoryReplaceState = vi.fn();

beforeEach(() => {
  // Reset mocks
  mockLocation.search = "";
  mockLocation.pathname = "/";
  mockHistoryReplaceState.mockClear();

  // Mock window.location
  Object.defineProperty(window, "location", {
    value: mockLocation,
    writable: true,
  });

  // Mock window.history.replaceState
  Object.defineProperty(window.history, "replaceState", {
    value: mockHistoryReplaceState,
    writable: true,
  });
});

describe("initializeViewStateFromURL", () => {
  it("returns default state when no URL parameters", () => {
    mockLocation.search = "";
    const result = initializeViewStateFromURL();
    expect(result).toEqual(DEFAULT_VIEW_STATE);
  });

  it("parses district parameter from URL", () => {
    mockLocation.search = "?district=Colorado";
    const result = initializeViewStateFromURL();
    expect(result.districtId).toBe("Colorado");
  });

  it("supports legacy districtId parameter", () => {
    mockLocation.search = "?districtId=Texas";
    const result = initializeViewStateFromURL();
    expect(result.districtId).toBe("Texas");
  });

  it("prefers 'district' over 'districtId' when both present", () => {
    mockLocation.search = "?district=Colorado&districtId=Texas";
    const result = initializeViewStateFromURL();
    expect(result.districtId).toBe("Colorado");
  });

  it("parses regionId from URL", () => {
    mockLocation.search = "?regionId=Big%20Sky";
    const result = initializeViewStateFromURL();
    expect(result.regionId).toBe("Big Sky");
  });

  it("parses campusId from URL", () => {
    mockLocation.search = "?campusId=123";
    const result = initializeViewStateFromURL();
    expect(result.campusId).toBe(123);
  });

  it("parses viewMode from URL", () => {
    mockLocation.search = "?viewMode=district";
    const result = initializeViewStateFromURL();
    expect(result.mode).toBe("district");
  });

  it("parses panelOpen from URL", () => {
    mockLocation.search = "?panelOpen=true";
    const result = initializeViewStateFromURL();
    expect(result.panelOpen).toBe(true);
  });

  it("parses multiple parameters from URL", () => {
    mockLocation.search = "?district=Colorado&viewMode=district&panelOpen=true";
    const result = initializeViewStateFromURL();
    expect(result).toEqual({
      mode: "district",
      regionId: null,
      districtId: "Colorado",
      campusId: null,
      panelOpen: true,
    });
  });

  it("handles invalid viewMode gracefully", () => {
    mockLocation.search = "?viewMode=invalid";
    const result = initializeViewStateFromURL();
    expect(result.mode).toBe("nation");
  });

  it("handles invalid campusId gracefully", () => {
    mockLocation.search = "?campusId=invalid";
    const result = initializeViewStateFromURL();
    expect(result.campusId).toBe(null);
  });

  it("handles malformed URL gracefully", () => {
    // Override to throw error
    const originalURLSearchParams = window.URLSearchParams;
    window.URLSearchParams = vi.fn().mockImplementation(() => {
      throw new Error("Malformed URL");
    }) as any;

    const result = initializeViewStateFromURL();
    expect(result).toEqual(DEFAULT_VIEW_STATE);

    // Restore
    window.URLSearchParams = originalURLSearchParams;
  });
});

describe("updateURLWithViewState", () => {
  it("updates URL with district parameter", () => {
    const viewState: ViewState = {
      mode: "district",
      regionId: null,
      districtId: "Colorado",
      campusId: null,
      panelOpen: true,
    };

    updateURLWithViewState(viewState);

    expect(mockHistoryReplaceState).toHaveBeenCalledWith(
      {},
      "",
      "/?viewMode=district&district=Colorado&panelOpen=true"
    );
  });

  it("uses 'district' parameter not 'districtId'", () => {
    const viewState: ViewState = {
      mode: "district",
      regionId: null,
      districtId: "Illinois",
      campusId: null,
      panelOpen: false,
    };

    updateURLWithViewState(viewState);

    const calledUrl = mockHistoryReplaceState.mock.calls[0][2];
    expect(calledUrl).toContain("district=Illinois");
    expect(calledUrl).not.toContain("districtId=");
  });

  it("removes parameters when values are null", () => {
    const viewState: ViewState = {
      mode: "nation",
      regionId: null,
      districtId: null,
      campusId: null,
      panelOpen: false,
    };

    updateURLWithViewState(viewState);

    expect(mockHistoryReplaceState).toHaveBeenCalledWith({}, "", "/");
  });

  it("includes all parameters when set", () => {
    const viewState: ViewState = {
      mode: "campus",
      regionId: "Great Lakes",
      districtId: "Illinois",
      campusId: 456,
      panelOpen: true,
    };

    updateURLWithViewState(viewState);

    const calledUrl = mockHistoryReplaceState.mock.calls[0][2];
    expect(calledUrl).toContain("viewMode=campus");
    expect(calledUrl).toContain("regionId=Great+Lakes");
    expect(calledUrl).toContain("district=Illinois");
    expect(calledUrl).toContain("campusId=456");
    expect(calledUrl).toContain("panelOpen=true");
  });

  it("removes legacy districtId parameter if present", () => {
    // Set up initial URL with legacy parameter
    mockLocation.search = "?districtId=OldValue&other=param";

    const viewState: ViewState = {
      mode: "district",
      regionId: null,
      districtId: "Colorado",
      campusId: null,
      panelOpen: false,
    };

    updateURLWithViewState(viewState);

    const calledUrl = mockHistoryReplaceState.mock.calls[0][2];
    expect(calledUrl).toContain("district=Colorado");
    expect(calledUrl).not.toContain("districtId=");
  });

  it("handles mode being default value", () => {
    const viewState: ViewState = {
      ...DEFAULT_VIEW_STATE,
      districtId: "Colorado",
    };

    updateURLWithViewState(viewState);

    const calledUrl = mockHistoryReplaceState.mock.calls[0][2];
    expect(calledUrl).not.toContain("viewMode=");
    expect(calledUrl).toContain("district=Colorado");
  });
});
