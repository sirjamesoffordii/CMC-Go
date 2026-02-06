/**
 * District Panel Components
 *
 * This module exports reusable types, constants, and utilities for the DistrictPanel.
 * The refactoring is incremental - the main DistrictPanel.tsx still contains the
 * UI rendering, but type definitions and helper functions are now centralized.
 *
 * Benefits:
 * - Single source of truth for status mappings and role constants
 * - Reusable form state types and defaults
 * - Helper functions can be imported elsewhere
 * - Reduces duplication and improves maintainability
 */

// Types and constants
export {
  statusMap,
  reverseStatusMap,
  campusRoles,
  defaultPersonForm,
  defaultCampusForm,
  mapRoleToAuthoritative,
  getLastName,
  statusSortOrder,
  sortPeopleByStatus,
} from "./types";

export type {
  FigmaStatus,
  DbStatus,
  CampusRole,
  NeedType,
  PersonFormState,
  CampusFormState,
  CampusWithPeople,
  PersonWithNeeds,
  DistrictStats,
  NeedsSummary,
} from "./types";
