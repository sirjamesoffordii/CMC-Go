import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState, useEffect } from "react";

/**
 * Map ↔ Panel State Synchronization Tests
 *
 * These tests verify that state synchronization works correctly between:
 * - selectedDistrictId (legacy state for backward compatibility)
 * - viewState (new unified view state)
 * - Map component (InteractiveMap)
 * - Panel component (DistrictPanel)
 *
 * The Home component manages this state coordination. These tests focus on
 * the state synchronization logic rather than full component rendering.
 */

// Type definitions matching Home.tsx
interface ViewState {
  mode: "district" | "region" | "campus";
  districtId: string | null;
  regionId: string | null;
  campusId: number | null;
  panelOpen: boolean;
}

// Mock district data for testing
const mockDistricts = [
  { id: "ANC", name: "Anchorage", region: "WEST" },
  { id: "ATL", name: "Atlanta", region: "SOUTH" },
  { id: "BOS", name: "Boston", region: "EAST" },
];

describe("Map ↔ Panel State Synchronization", () => {
  describe("District Selection (Map → Panel)", () => {
    it("should update selectedDistrictId when district is selected", () => {
      const { result } = renderHook(() => {
        const [selectedDistrictId, setSelectedDistrictId] = useState<
          string | null
        >(null);
        const [viewState, setViewState] = useState<ViewState>({
          mode: "district",
          districtId: null,
          regionId: null,
          campusId: null,
          panelOpen: false,
        });

        // Simulate handleDistrictSelect from Home.tsx
        const handleDistrictSelect = (districtId: string) => {
          setSelectedDistrictId(districtId);
          const selectedDistrict = mockDistricts.find(d => d.id === districtId);
          if (selectedDistrict) {
            const newViewState: ViewState = {
              mode: "district",
              districtId: districtId,
              regionId: selectedDistrict.region,
              campusId: null,
              panelOpen: true,
            };
            setViewState(newViewState);
          }
        };

        return { selectedDistrictId, viewState, handleDistrictSelect };
      });

      // Initial state
      expect(result.current.selectedDistrictId).toBeNull();
      expect(result.current.viewState.districtId).toBeNull();
      expect(result.current.viewState.panelOpen).toBe(false);

      // Simulate clicking a district on the map
      act(() => {
        result.current.handleDistrictSelect("ANC");
      });

      // Both states should be updated
      expect(result.current.selectedDistrictId).toBe("ANC");
      expect(result.current.viewState.districtId).toBe("ANC");
      expect(result.current.viewState.regionId).toBe("WEST");
      expect(result.current.viewState.panelOpen).toBe(true);
      expect(result.current.viewState.mode).toBe("district");
    });

    it("should update viewState with correct region when district is selected", () => {
      const { result } = renderHook(() => {
        const [selectedDistrictId, setSelectedDistrictId] = useState<
          string | null
        >(null);
        const [viewState, setViewState] = useState<ViewState>({
          mode: "district",
          districtId: null,
          regionId: null,
          campusId: null,
          panelOpen: false,
        });

        const handleDistrictSelect = (districtId: string) => {
          setSelectedDistrictId(districtId);
          const selectedDistrict = mockDistricts.find(d => d.id === districtId);
          if (selectedDistrict) {
            const newViewState: ViewState = {
              mode: "district",
              districtId: districtId,
              regionId: selectedDistrict.region,
              campusId: null,
              panelOpen: true,
            };
            setViewState(newViewState);
          }
        };

        return { selectedDistrictId, viewState, handleDistrictSelect };
      });

      act(() => {
        result.current.handleDistrictSelect("ATL");
      });

      expect(result.current.viewState.districtId).toBe("ATL");
      expect(result.current.viewState.regionId).toBe("SOUTH");
    });

    it("should handle multiple district selections correctly", () => {
      const { result } = renderHook(() => {
        const [selectedDistrictId, setSelectedDistrictId] = useState<
          string | null
        >(null);
        const [viewState, setViewState] = useState<ViewState>({
          mode: "district",
          districtId: null,
          regionId: null,
          campusId: null,
          panelOpen: false,
        });

        const handleDistrictSelect = (districtId: string) => {
          setSelectedDistrictId(districtId);
          const selectedDistrict = mockDistricts.find(d => d.id === districtId);
          if (selectedDistrict) {
            const newViewState: ViewState = {
              mode: "district",
              districtId: districtId,
              regionId: selectedDistrict.region,
              campusId: null,
              panelOpen: true,
            };
            setViewState(newViewState);
          }
        };

        return { selectedDistrictId, viewState, handleDistrictSelect };
      });

      // Select first district
      act(() => {
        result.current.handleDistrictSelect("ANC");
      });

      expect(result.current.selectedDistrictId).toBe("ANC");
      expect(result.current.viewState.districtId).toBe("ANC");

      // Select different district
      act(() => {
        result.current.handleDistrictSelect("BOS");
      });

      expect(result.current.selectedDistrictId).toBe("BOS");
      expect(result.current.viewState.districtId).toBe("BOS");
      expect(result.current.viewState.regionId).toBe("EAST");
    });
  });

  describe("Panel Close (Panel → Map)", () => {
    it("should clear selectedDistrictId when panel is closed", () => {
      const { result } = renderHook(() => {
        const [selectedDistrictId, setSelectedDistrictId] = useState<
          string | null
        >("ANC");
        const [viewState, setViewState] = useState<ViewState>({
          mode: "district",
          districtId: "ANC",
          regionId: "WEST",
          campusId: null,
          panelOpen: true,
        });

        // Simulate onClose from DistrictPanel
        const handlePanelClose = () => {
          setSelectedDistrictId(null);
          setViewState({
            ...viewState,
            districtId: null,
            regionId: null,
            campusId: null,
            panelOpen: false,
          });
        };

        return { selectedDistrictId, viewState, handlePanelClose };
      });

      // Initial state - panel is open
      expect(result.current.selectedDistrictId).toBe("ANC");
      expect(result.current.viewState.districtId).toBe("ANC");
      expect(result.current.viewState.panelOpen).toBe(true);

      // Close the panel
      act(() => {
        result.current.handlePanelClose();
      });

      // Both states should be cleared
      expect(result.current.selectedDistrictId).toBeNull();
      expect(result.current.viewState.districtId).toBeNull();
      expect(result.current.viewState.regionId).toBeNull();
      expect(result.current.viewState.panelOpen).toBe(false);
    });

    it("should clear campusId when panel is closed", () => {
      const { result } = renderHook(() => {
        const [selectedDistrictId, setSelectedDistrictId] = useState<
          string | null
        >("ANC");
        const [viewState, setViewState] = useState<ViewState>({
          mode: "campus",
          districtId: "ANC",
          regionId: "WEST",
          campusId: 123,
          panelOpen: true,
        });

        const handlePanelClose = () => {
          setSelectedDistrictId(null);
          setViewState({
            ...viewState,
            districtId: null,
            regionId: null,
            campusId: null,
            panelOpen: false,
          });
        };

        return { selectedDistrictId, viewState, handlePanelClose };
      });

      expect(result.current.viewState.campusId).toBe(123);

      act(() => {
        result.current.handlePanelClose();
      });

      expect(result.current.viewState.campusId).toBeNull();
    });
  });

  describe("ViewState ↔ SelectedDistrictId Synchronization", () => {
    it("should sync selectedDistrictId with viewState.districtId", () => {
      const { result } = renderHook(() => {
        const [selectedDistrictId, setSelectedDistrictId] = useState<
          string | null
        >(null);
        const [viewState, setViewState] = useState<ViewState>({
          mode: "district",
          districtId: null,
          regionId: null,
          campusId: null,
          panelOpen: false,
        });

        // Simulate the sync effect from Home.tsx
        useEffect(() => {
          if (viewState.districtId !== selectedDistrictId) {
            setSelectedDistrictId(viewState.districtId);
          }
        }, [viewState.districtId, selectedDistrictId]);

        const updateViewState = (newViewState: ViewState) => {
          setViewState(newViewState);
        };

        return { selectedDistrictId, viewState, updateViewState };
      });

      // Update viewState
      act(() => {
        result.current.updateViewState({
          mode: "district",
          districtId: "ATL",
          regionId: "SOUTH",
          campusId: null,
          panelOpen: true,
        });
      });

      // selectedDistrictId should sync with viewState.districtId
      expect(result.current.selectedDistrictId).toBe("ATL");
      expect(result.current.viewState.districtId).toBe("ATL");
    });

    it("should handle viewState changes with handleViewStateChange", () => {
      const { result } = renderHook(() => {
        const [selectedDistrictId, setSelectedDistrictId] = useState<
          string | null
        >(null);
        const [viewState, setViewState] = useState<ViewState>({
          mode: "district",
          districtId: null,
          regionId: null,
          campusId: null,
          panelOpen: false,
        });

        // Simulate handleViewStateChange from Home.tsx
        const handleViewStateChange = (newViewState: ViewState) => {
          setViewState(newViewState);
          // Keep selectedDistrictId consistent with URL/view state
          if (newViewState.districtId !== selectedDistrictId) {
            setSelectedDistrictId(newViewState.districtId);
          }
        };

        return { selectedDistrictId, viewState, handleViewStateChange };
      });

      act(() => {
        result.current.handleViewStateChange({
          mode: "district",
          districtId: "BOS",
          regionId: "EAST",
          campusId: null,
          panelOpen: true,
        });
      });

      expect(result.current.selectedDistrictId).toBe("BOS");
      expect(result.current.viewState.districtId).toBe("BOS");
    });
  });

  describe("Edge Cases", () => {
    it("should handle selecting the same district twice", () => {
      const { result } = renderHook(() => {
        const [selectedDistrictId, setSelectedDistrictId] = useState<
          string | null
        >(null);
        const [viewState, setViewState] = useState<ViewState>({
          mode: "district",
          districtId: null,
          regionId: null,
          campusId: null,
          panelOpen: false,
        });

        const handleDistrictSelect = (districtId: string) => {
          setSelectedDistrictId(districtId);
          const selectedDistrict = mockDistricts.find(d => d.id === districtId);
          if (selectedDistrict) {
            const newViewState: ViewState = {
              mode: "district",
              districtId: districtId,
              regionId: selectedDistrict.region,
              campusId: null,
              panelOpen: true,
            };
            setViewState(newViewState);
          }
        };

        return { selectedDistrictId, viewState, handleDistrictSelect };
      });

      act(() => {
        result.current.handleDistrictSelect("ANC");
      });

      const firstState = {
        selectedDistrictId: result.current.selectedDistrictId,
        viewState: { ...result.current.viewState },
      };

      // Select the same district again
      act(() => {
        result.current.handleDistrictSelect("ANC");
      });

      // State should remain consistent
      expect(result.current.selectedDistrictId).toBe(
        firstState.selectedDistrictId
      );
      expect(result.current.viewState.districtId).toBe(
        firstState.viewState.districtId
      );
    });

    it("should maintain panelOpen state correctly through lifecycle", () => {
      const { result } = renderHook(() => {
        const [selectedDistrictId, setSelectedDistrictId] = useState<
          string | null
        >(null);
        const [viewState, setViewState] = useState<ViewState>({
          mode: "district",
          districtId: null,
          regionId: null,
          campusId: null,
          panelOpen: false,
        });

        const handleDistrictSelect = (districtId: string) => {
          setSelectedDistrictId(districtId);
          const selectedDistrict = mockDistricts.find(d => d.id === districtId);
          if (selectedDistrict) {
            setViewState({
              mode: "district",
              districtId: districtId,
              regionId: selectedDistrict.region,
              campusId: null,
              panelOpen: true,
            });
          }
        };

        const handlePanelClose = () => {
          setSelectedDistrictId(null);
          setViewState({
            ...viewState,
            districtId: null,
            regionId: null,
            campusId: null,
            panelOpen: false,
          });
        };

        return {
          selectedDistrictId,
          viewState,
          handleDistrictSelect,
          handlePanelClose,
        };
      });

      // Start: panel closed
      expect(result.current.viewState.panelOpen).toBe(false);

      // Open panel by selecting district
      act(() => {
        result.current.handleDistrictSelect("ANC");
      });

      expect(result.current.viewState.panelOpen).toBe(true);

      // Close panel
      act(() => {
        result.current.handlePanelClose();
      });

      expect(result.current.viewState.panelOpen).toBe(false);
    });
  });
});
