import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Breadcrumb } from "./Breadcrumb";
import { ViewState } from "@/types/viewModes";
import { District, Campus, Person } from "../../../drizzle/schema";

describe("Breadcrumb", () => {
  const mockDistrict: District = {
    id: "Colorado",
    name: "Colorado",
    region: "Big Sky",
    leftNeighbor: null,
    rightNeighbor: null,
  };

  const mockCampus: Campus = {
    id: 1,
    name: "University of Colorado",
    districtId: "Colorado",
    location: null,
    primaryContactId: null,
    notes: null,
    isActive: true,
    isPublic: true,
  };

  const mockPerson: Person = {
    id: 1,
    personId: "person-1",
    name: "John Doe",
    primaryDistrictId: "Colorado",
    primaryCampusId: 1,
    primaryRole: "Campus Director",
    status: "Yes",
    householdId: null,
    spouseAttending: false,
    childrenCount: 0,
    guestsCount: 0,
    depositPaid: false,
    needsMet: false,
  };

  it("does not render when only at home", () => {
    const viewState: ViewState = {
      mode: "nation",
      regionId: null,
      districtId: null,
      campusId: null,
      panelOpen: false,
    };

    const { container } = render(
      <Breadcrumb
        viewState={viewState}
        selectedDistrict={null}
        selectedCampus={null}
        selectedPerson={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders breadcrumb for district view", () => {
    const viewState: ViewState = {
      mode: "district",
      regionId: "Big Sky",
      districtId: "Colorado",
      campusId: null,
      panelOpen: true,
    };

    render(
      <Breadcrumb
        viewState={viewState}
        selectedDistrict={mockDistrict}
        selectedCampus={null}
        selectedPerson={null}
      />
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Big Sky")).toBeInTheDocument();
    expect(screen.getByText("Colorado")).toBeInTheDocument();
  });

  it("renders breadcrumb for campus view", () => {
    const viewState: ViewState = {
      mode: "campus",
      regionId: "Big Sky",
      districtId: "Colorado",
      campusId: 1,
      panelOpen: true,
    };

    render(
      <Breadcrumb
        viewState={viewState}
        selectedDistrict={mockDistrict}
        selectedCampus={mockCampus}
        selectedPerson={null}
      />
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Big Sky")).toBeInTheDocument();
    expect(screen.getByText("Colorado")).toBeInTheDocument();
    expect(screen.getByText("University of Colorado")).toBeInTheDocument();
  });

  it("renders breadcrumb with person", () => {
    const viewState: ViewState = {
      mode: "campus",
      regionId: "Big Sky",
      districtId: "Colorado",
      campusId: 1,
      panelOpen: true,
    };

    render(
      <Breadcrumb
        viewState={viewState}
        selectedDistrict={mockDistrict}
        selectedCampus={mockCampus}
        selectedPerson={mockPerson}
      />
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("calls onHomeClick when Home is clicked", async () => {
    const user = userEvent.setup();
    const onHomeClick = vi.fn();
    const viewState: ViewState = {
      mode: "district",
      regionId: "Big Sky",
      districtId: "Colorado",
      campusId: null,
      panelOpen: true,
    };

    render(
      <Breadcrumb
        viewState={viewState}
        selectedDistrict={mockDistrict}
        selectedCampus={null}
        selectedPerson={null}
        onHomeClick={onHomeClick}
      />
    );

    const homeButton = screen.getByText("Home");
    await user.click(homeButton);

    expect(onHomeClick).toHaveBeenCalledTimes(1);
  });

  it("calls onDistrictClick when district is clicked", async () => {
    const user = userEvent.setup();
    const onDistrictClick = vi.fn();
    const viewState: ViewState = {
      mode: "campus",
      regionId: "Big Sky",
      districtId: "Colorado",
      campusId: 1,
      panelOpen: true,
    };

    render(
      <Breadcrumb
        viewState={viewState}
        selectedDistrict={mockDistrict}
        selectedCampus={mockCampus}
        selectedPerson={null}
        onDistrictClick={onDistrictClick}
      />
    );

    const districtButton = screen.getByText("Colorado");
    await user.click(districtButton);

    expect(onDistrictClick).toHaveBeenCalledWith("Colorado");
  });

  it("shows active state for current location", () => {
    const viewState: ViewState = {
      mode: "district",
      regionId: "Big Sky",
      districtId: "Colorado",
      campusId: null,
      panelOpen: true,
    };

    render(
      <Breadcrumb
        viewState={viewState}
        selectedDistrict={mockDistrict}
        selectedCampus={null}
        selectedPerson={null}
      />
    );

    const colorado = screen.getByText("Colorado");
    expect(colorado).toHaveAttribute("aria-current", "page");
  });
});
