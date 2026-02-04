import { adminProcedure, router } from "./trpc";

/**
 * API endpoint metadata for the console API explorer
 */
interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  isPublic: boolean;
}

/**
 * Console router for admin API exploration tools
 * Used by the ConsoleAPI page for listing and testing endpoints
 */
export const consoleRouter = router({
  apiEndpoints: router({
    /**
     * List all available API endpoints in the system
     * This is metadata about the tRPC API surface for admin exploration
     */
    list: adminProcedure.query((): ApiEndpoint[] => {
      // Return metadata about the app's API endpoints
      // These are the main tRPC endpoints available in the system
      return [
        // Auth endpoints
        {
          id: "auth-me",
          method: "GET",
          path: "/api/trpc/auth.me",
          description: "Get current authenticated user",
          isPublic: true,
        },
        {
          id: "auth-login",
          method: "POST",
          path: "/api/trpc/auth.login",
          description: "Authenticate with email and password",
          isPublic: true,
        },
        {
          id: "auth-logout",
          method: "POST",
          path: "/api/trpc/auth.logout",
          description: "Clear authentication session",
          isPublic: false,
        },

        // People endpoints
        {
          id: "people-list",
          method: "GET",
          path: "/api/trpc/people.list",
          description: "List all people (with authorization scope)",
          isPublic: false,
        },
        {
          id: "people-get",
          method: "GET",
          path: "/api/trpc/people.get",
          description: "Get a person by ID",
          isPublic: false,
        },
        {
          id: "people-create",
          method: "POST",
          path: "/api/trpc/people.create",
          description: "Create a new person",
          isPublic: false,
        },
        {
          id: "people-update",
          method: "POST",
          path: "/api/trpc/people.update",
          description: "Update a person's details",
          isPublic: false,
        },
        {
          id: "people-delete",
          method: "POST",
          path: "/api/trpc/people.delete",
          description: "Delete a person",
          isPublic: false,
        },

        // Districts endpoints
        {
          id: "districts-list",
          method: "GET",
          path: "/api/trpc/districts.list",
          description: "List all districts",
          isPublic: true,
        },
        {
          id: "districts-get",
          method: "GET",
          path: "/api/trpc/districts.get",
          description: "Get a district by ID",
          isPublic: true,
        },

        // Campuses endpoints
        {
          id: "campuses-list",
          method: "GET",
          path: "/api/trpc/campuses.list",
          description: "List all campuses",
          isPublic: false,
        },
        {
          id: "campuses-create",
          method: "POST",
          path: "/api/trpc/campuses.create",
          description: "Create a new campus",
          isPublic: false,
        },

        // Users/Admin endpoints
        {
          id: "admin-users-list",
          method: "GET",
          path: "/api/trpc/admin.users.list",
          description: "List all users (admin only)",
          isPublic: false,
        },
        {
          id: "admin-users-create",
          method: "POST",
          path: "/api/trpc/admin.users.create",
          description: "Create a new user (admin only)",
          isPublic: false,
        },

        // Settings endpoints
        {
          id: "settings-get",
          method: "GET",
          path: "/api/trpc/settings.get",
          description: "Get application settings",
          isPublic: false,
        },
        {
          id: "settings-update",
          method: "POST",
          path: "/api/trpc/settings.update",
          description: "Update application settings",
          isPublic: false,
        },

        // Needs endpoints
        {
          id: "needs-list",
          method: "GET",
          path: "/api/trpc/needs.list",
          description: "List all needs",
          isPublic: false,
        },
        {
          id: "needs-create",
          method: "POST",
          path: "/api/trpc/needs.create",
          description: "Create a new need",
          isPublic: false,
        },

        // Notes endpoints
        {
          id: "notes-list",
          method: "GET",
          path: "/api/trpc/notes.list",
          description: "List all notes for a person",
          isPublic: false,
        },
        {
          id: "notes-create",
          method: "POST",
          path: "/api/trpc/notes.create",
          description: "Create a new note",
          isPublic: false,
        },

        // System endpoints
        {
          id: "system-health",
          method: "GET",
          path: "/api/trpc/system.health",
          description: "System health check",
          isPublic: true,
        },

        // Import endpoints
        {
          id: "import-preview",
          method: "POST",
          path: "/api/trpc/import.preview",
          description: "Preview CSV import",
          isPublic: false,
        },
        {
          id: "import-execute",
          method: "POST",
          path: "/api/trpc/import.execute",
          description: "Execute CSV import",
          isPublic: false,
        },

        // Households endpoints
        {
          id: "households-list",
          method: "GET",
          path: "/api/trpc/households.list",
          description: "List all households",
          isPublic: false,
        },
        {
          id: "households-create",
          method: "POST",
          path: "/api/trpc/households.create",
          description: "Create a new household",
          isPublic: false,
        },
      ];
    }),
  }),
});
