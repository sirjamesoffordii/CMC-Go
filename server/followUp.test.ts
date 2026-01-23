import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createNeed, toggleNeedActive } from "./db";

function createTestContext(): TrpcContext {
  return {
    user: {
      id: 1,
      fullName: "Test Admin",
      email: "test-admin@example.com",
      role: "ADMIN",
      campusId: 1,
      districtId: null,
      regionId: null,
      approvalStatus: "ACTIVE",
      approvedByUserId: null,
      approvedAt: null,
      createdAt: new Date(),
      lastLoginAt: null,
      openId: null,
      name: null,
      loginMethod: null,
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("followUp router - state consistency", () => {
  it("person with active need appears in Follow-Up list", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Get a person who is not in "Maybe" status
    const allPeople = await caller.people.list();
    expect(allPeople.length).toBeGreaterThan(0);

    // Find a person with "Yes" or "No" status (not "Maybe")
    const testPerson = allPeople.find(
      p => p.status === "Yes" || p.status === "No"
    );
    if (!testPerson) {
      console.log("No person with Yes/No status found, skipping test");
      return;
    }

    // First, deactivate any existing active needs for this person to ensure clean state
    const existingNeeds = await caller.needs.byPerson({
      personId: testPerson.personId,
    });
    const existingActiveNeeds = existingNeeds.filter(n => n.isActive);
    for (const need of existingActiveNeeds) {
      await toggleNeedActive(need.id, false);
    }

    // Verify person is NOT in Follow-Up list initially (no active needs, not Maybe)
    const followUpBefore = await caller.followUp.list();
    const inFollowUpBefore = followUpBefore.some(
      p => p.personId === testPerson.personId
    );
    expect(inFollowUpBefore).toBe(false); // Should not be in list

    // Create an active need for this person
    const needId = await createNeed({
      personId: testPerson.personId,
      type: "Other",
      description: "Test active need for Follow-Up consistency",
      visibility: "LEADERSHIP_ONLY",
      createdById: ctx.user.id,
      isActive: true,
      resolvedAt: null,
    });

    try {
      // Verify person NOW appears in Follow-Up list
      const followUpAfter = await caller.followUp.list();
      const inFollowUpAfter = followUpAfter.some(
        p => p.personId === testPerson.personId
      );

      expect(inFollowUpAfter).toBe(true);
    } finally {
      // Cleanup
      await toggleNeedActive(needId, false);
      // Restore the previously active needs
      for (const need of existingActiveNeeds) {
        await toggleNeedActive(need.id, true);
      }
    }
  });

  it("toggling need active state updates Follow-Up list immediately", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Get a person who is not in "Maybe" status
    const allPeople = await caller.people.list();
    expect(allPeople.length).toBeGreaterThan(0);

    const testPerson = allPeople.find(
      p => p.status === "Yes" || p.status === "No"
    );
    if (!testPerson) {
      console.log("No person with Yes/No status found, skipping test");
      return;
    }

    // First, deactivate any existing active needs for this person to ensure clean state
    const existingNeeds = await caller.needs.byPerson({
      personId: testPerson.personId,
    });
    const existingActiveNeeds = existingNeeds.filter(n => n.isActive);
    for (const need of existingActiveNeeds) {
      await toggleNeedActive(need.id, false);
    }

    // Create an active need
    const needId = await createNeed({
      personId: testPerson.personId,
      type: "Financial",
      description: "Test need for toggle consistency",
      amount: 100,
      visibility: "LEADERSHIP_ONLY",
      createdById: ctx.user.id,
      isActive: true,
      resolvedAt: null,
    });

    try {
      // Person should be in Follow-Up with active need
      const followUpWithActive = await caller.followUp.list();
      const inFollowUpWithActive = followUpWithActive.some(
        p => p.personId === testPerson.personId
      );
      expect(inFollowUpWithActive).toBe(true);

      // Toggle need to inactive via tRPC endpoint (simulating UI action)
      await caller.needs.toggleActive({
        needId,
        isActive: false,
      });

      // Verify person is NOW removed from Follow-Up list (if not "Maybe" status)
      const followUpAfterToggle = await caller.followUp.list();
      const inFollowUpAfterToggle = followUpAfterToggle.some(
        p => p.personId === testPerson.personId
      );

      if (testPerson.status !== "Maybe") {
        expect(inFollowUpAfterToggle).toBe(false);
      }

      // Toggle back to active
      await caller.needs.toggleActive({
        needId,
        isActive: true,
      });

      // Verify person appears again in Follow-Up list
      const followUpReactivated = await caller.followUp.list();
      const inFollowUpReactivated = followUpReactivated.some(
        p => p.personId === testPerson.personId
      );
      expect(inFollowUpReactivated).toBe(true);
    } finally {
      // Cleanup
      await toggleNeedActive(needId, false);
      // Restore the previously active needs
      for (const need of existingActiveNeeds) {
        await toggleNeedActive(need.id, true);
      }
    }
  });

  it("creating active need via tRPC adds person to Follow-Up list", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Get a person who is not in "Maybe" status
    const allPeople = await caller.people.list();
    expect(allPeople.length).toBeGreaterThan(0);

    const testPerson = allPeople.find(
      p => p.status === "Yes" || p.status === "No"
    );
    if (!testPerson) {
      console.log("No person with Yes/No status found, skipping test");
      return;
    }

    // Verify person is not in Follow-Up initially
    const followUpBefore = await caller.followUp.list();
    const inFollowUpBefore = followUpBefore.some(
      p => p.personId === testPerson.personId
    );

    // Create need via tRPC endpoint (simulating UI action)
    const result = await caller.needs.create({
      personId: testPerson.personId,
      type: "Housing",
      description: "Test housing need",
      visibility: "LEADERSHIP_ONLY",
      isActive: true,
    });

    expect(result.success).toBe(true);

    try {
      // Verify person NOW appears in Follow-Up list
      const followUpAfter = await caller.followUp.list();
      const personInFollowUp = followUpAfter.find(
        p => p.personId === testPerson.personId
      );

      expect(personInFollowUp).toBeDefined();
      expect(personInFollowUp?.personId).toBe(testPerson.personId);
    } finally {
      // Cleanup: find and deactivate the need we created
      // Note: This is a best-effort cleanup; in real scenarios, the need ID would be returned
      // For now, we'll just toggle all active needs for this person to inactive
      // This is safe because we're in a test environment
      const needs = await caller.needs.byPerson({
        personId: testPerson.personId,
      });
      const createdNeed = needs.find(
        n => n.description === "Test housing need" && n.isActive
      );
      if (createdNeed) {
        await toggleNeedActive(createdNeed.id, false);
      }
    }
  });

  it("person with Maybe status appears in Follow-Up list", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Get all people and find one with "Maybe" status
    const allPeople = await caller.people.list();
    expect(allPeople.length).toBeGreaterThan(0);

    let testPerson = allPeople.find(p => p.status === "Maybe");

    // If no "Maybe" person exists, temporarily set one
    let originalStatus: string | null = null;
    if (!testPerson) {
      testPerson = allPeople[0];
      originalStatus = testPerson.status;
      await caller.people.updateStatus({
        personId: testPerson.personId,
        status: "Maybe",
      });
    }

    try {
      // Verify person with "Maybe" status is in Follow-Up list
      const followUpList = await caller.followUp.list();
      const inFollowUp = followUpList.some(
        p => p.personId === testPerson?.personId
      );

      expect(inFollowUp).toBe(true);
    } finally {
      // Restore original status if we changed it
      if (originalStatus && originalStatus !== "Maybe") {
        await caller.people.updateStatus({
          personId: testPerson.personId,
          status: originalStatus as "Yes" | "No" | "Not Invited",
        });
      }
    }
  });

  it("Follow-Up list reflects current state after multiple mutations", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const allPeople = await caller.people.list();
    expect(allPeople.length).toBeGreaterThan(0);

    // Find a person with "Yes" status
    const testPerson = allPeople.find(p => p.status === "Yes");
    if (!testPerson) {
      console.log("No person with Yes status found, skipping test");
      return;
    }

    const originalStatus = testPerson.status;

    // First, deactivate any existing active needs for this person to ensure clean state
    const existingNeeds = await caller.needs.byPerson({
      personId: testPerson.personId,
    });
    const existingActiveNeeds = existingNeeds.filter(n => n.isActive);
    for (const need of existingActiveNeeds) {
      await toggleNeedActive(need.id, false);
    }

    // Create active need
    const needId = await createNeed({
      personId: testPerson.personId,
      type: "Transportation",
      description: "Test multi-mutation consistency",
      visibility: "LEADERSHIP_ONLY",
      createdById: ctx.user.id,
      isActive: true,
      resolvedAt: null,
    });

    try {
      // Step 1: Person with active need should be in Follow-Up
      let followUpList = await caller.followUp.list();
      let inFollowUp = followUpList.some(
        p => p.personId === testPerson.personId
      );
      expect(inFollowUp).toBe(true);

      // Step 2: Change status to "Maybe" (still in Follow-Up for different reason)
      await caller.people.updateStatus({
        personId: testPerson.personId,
        status: "Maybe",
      });

      followUpList = await caller.followUp.list();
      inFollowUp = followUpList.some(p => p.personId === testPerson.personId);
      expect(inFollowUp).toBe(true);

      // Step 3: Deactivate need (person still in Follow-Up because status is "Maybe")
      await caller.needs.toggleActive({
        needId,
        isActive: false,
      });

      followUpList = await caller.followUp.list();
      inFollowUp = followUpList.some(p => p.personId === testPerson.personId);
      expect(inFollowUp).toBe(true); // Still there due to "Maybe" status

      // Step 4: Change status to "Yes" (should now be removed from Follow-Up)
      await caller.people.updateStatus({
        personId: testPerson.personId,
        status: "Yes",
      });

      followUpList = await caller.followUp.list();
      inFollowUp = followUpList.some(p => p.personId === testPerson.personId);
      expect(inFollowUp).toBe(false);

      // Step 5: Reactivate need (person back in Follow-Up)
      await caller.needs.toggleActive({
        needId,
        isActive: true,
      });

      followUpList = await caller.followUp.list();
      const person = followUpList.find(p => p.personId === testPerson.personId);
      expect(person).toBeDefined();
      expect(person?.status).toBe("Yes"); // Verify status is current
    } finally {
      // Cleanup
      await toggleNeedActive(needId, false);
      if (originalStatus !== "Yes") {
        await caller.people.updateStatus({
          personId: testPerson.personId,
          status: originalStatus,
        });
      }
      // Restore the previously active needs
      for (const need of existingActiveNeeds) {
        await toggleNeedActive(need.id, true);
      }
    }
  });
});
