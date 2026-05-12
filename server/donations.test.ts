import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";
import {
  createDonation,
  getCompletedDonors,
  getDonationFundingDemand,
  getDonationProgress,
} from "./db";
import {
  DONATION_CAMPAIGN_DEADLINE_ISO,
  DONATION_CAMPAIGN_DEADLINE_LABEL,
  DONATION_CAMPAIGN_GOAL_CENTS,
  DONATION_CAMPAIGN_STARTING_FUNDED_PERSON_COUNT,
  DONATION_CAMPAIGN_STARTING_FUNDS_GIVEN_CENTS,
  DONATION_CAMPAIGN_STARTING_DONORS,
  DONATION_CAMPAIGN_STARTING_RAISED_CENTS,
  getDonorInitials,
} from "../shared/const";

const stripeSessionsCreateMock = vi.hoisted(() => vi.fn());

vi.mock("stripe", () => {
  return {
    default: class Stripe {
      checkout = {
        sessions: {
          create: stripeSessionsCreateMock,
        },
      };
    },
  };
});

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createDonation: vi.fn(),
    getDonationProgress: vi.fn(),
    getCompletedDonors: vi.fn(),
    getDonationFundingDemand: vi.fn(),
  };
});

function createPublicContext(origin = "https://cmcgo.app"): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      get: (name: string) => {
        if (name.toLowerCase() === "origin") return origin;
        if (name.toLowerCase() === "host") return new URL(origin).host;
        return undefined;
      },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

afterEach(() => {
  vi.clearAllMocks();
  ENV.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
});

describe("donations router", () => {
  it("includes the starting raised amount in public campaign progress", async () => {
    (getDonationProgress as Mock).mockResolvedValue({
      totalRaisedCents: 75_00,
      donorCount: 2,
    });
    (getCompletedDonors as Mock).mockResolvedValue([
      { name: "Stripe Donor", amountCents: 50_00 },
      { name: "Anonymous donor", amountCents: 25_00 },
    ]);
    (getDonationFundingDemand as Mock).mockResolvedValue({
      fundsGivenCents: DONATION_CAMPAIGN_STARTING_FUNDS_GIVEN_CENTS,
      fundedPersonCount: DONATION_CAMPAIGN_STARTING_FUNDED_PERSON_COUNT,
      peopleStillNeedFunding: 4,
      totalNeedCents: 3_500_00,
    });

    const caller = appRouter.createCaller(createPublicContext());
    const progress = await caller.donations.progress();

    const expectedDonors = [
      ...DONATION_CAMPAIGN_STARTING_DONORS.map(d => ({
        name: d.name,
        amountCents: d.amountCents,
        initials: d.initials,
      })),
      {
        name: "Stripe Donor",
        amountCents: 50_00,
        initials: getDonorInitials("Stripe Donor"),
      },
      {
        name: "Anonymous donor",
        amountCents: 25_00,
        initials: getDonorInitials("Anonymous donor"),
      },
    ];

    expect(progress).toEqual({
      totalRaisedCents: DONATION_CAMPAIGN_STARTING_RAISED_CENTS + 75_00,
      onlineRaisedCents: 75_00,
      startingRaisedCents: DONATION_CAMPAIGN_STARTING_RAISED_CENTS,
      donorCount: expectedDonors.length,
      donors: expectedDonors,
      fundingSummary: {
        fundsGivenCents: DONATION_CAMPAIGN_STARTING_FUNDS_GIVEN_CENTS,
        fundedPersonCount: DONATION_CAMPAIGN_STARTING_FUNDED_PERSON_COUNT,
        fundsAvailableCents:
          DONATION_CAMPAIGN_STARTING_RAISED_CENTS +
          75_00 -
          DONATION_CAMPAIGN_STARTING_FUNDS_GIVEN_CENTS,
        peopleStillNeedFunding: 4,
        totalNeedCents: 3_500_00,
      },
      goalCents: 3_500_00,
      deadlineIso: DONATION_CAMPAIGN_DEADLINE_ISO,
      deadlineLabel: DONATION_CAMPAIGN_DEADLINE_LABEL,
    });
  });

  it("creates a Stripe Checkout Session and records a pending donation", async () => {
    ENV.STRIPE_SECRET_KEY = "sk_test_mock";
    stripeSessionsCreateMock.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
    (createDonation as Mock).mockResolvedValue(1);

    const caller = appRouter.createCaller(
      createPublicContext("http://localhost:3010")
    );
    const result = await caller.donations.createCheckoutSession({
      amountCents: 25_00,
      donorName: "Test Donor",
      donorEmail: "donor@example.com",
    });

    expect(result).toEqual({
      sessionUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
    expect(stripeSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        success_url: "http://localhost:3010/donate?success=true",
        cancel_url: "http://localhost:3010/donate?canceled=true",
        customer_email: "donor@example.com",
        metadata: expect.objectContaining({
          campaign: "cmc-2026-missionary-fund",
          donorEmail: "donor@example.com",
          donorName: "Test Donor",
        }),
        payment_intent_data: {
          receipt_email: "donor@example.com",
          metadata: expect.objectContaining({
            campaign: "cmc-2026-missionary-fund",
            donorEmail: "donor@example.com",
            donorName: "Test Donor",
          }),
        },
      })
    );
    expect(createDonation).toHaveBeenCalledWith({
      stripeSessionId: "cs_test_123",
      amountCents: 25_00,
      donorName: "Test Donor",
      donorEmail: "donor@example.com",
      status: "pending",
    });
  });
});
