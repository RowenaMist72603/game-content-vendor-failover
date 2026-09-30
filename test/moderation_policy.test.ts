import { describe, expect, it } from "vitest";
import { placeInQueue, playerAssetSchema } from "../src/moderation_policy.js";

describe("moderation queue placement", () => {
  it("prioritizes a live-event asset that needs human review", () => {
    const asset = playerAssetSchema.parse({
      assetId: "asset-stage-banner-42",
      playerId: "creator-17",
      kind: "banner",
      title: "Final round stage banner",
      description: "A banner submitted for tonight's final round.",
      liveEvent: { eventId: "finals-night", startsAt: "2027-02-18T20:00:00.000Z" },
    });

    expect(placeInQueue(asset, { action: "review", reason: "Check licensed team artwork" })).toEqual({
      assetId: "asset-stage-banner-42",
      queue: "live-event-priority",
      action: "review",
      reason: "Check licensed team artwork",
    });
  });
});
