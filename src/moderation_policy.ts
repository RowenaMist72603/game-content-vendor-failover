import { z } from "zod";

export const playerAssetSchema = z.object({
  assetId: z.string().min(1),
  playerId: z.string().min(1),
  kind: z.enum(["skin", "banner", "level", "chat-sticker"]),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(2_000),
  liveEvent: z.object({
    eventId: z.string().min(1),
    startsAt: z.string().datetime(),
  }).optional(),
});

export type PlayerAsset = z.infer<typeof playerAssetSchema>;

export const modelVerdictSchema = z.object({
  action: z.enum(["allow", "review", "block"]),
  reason: z.string().min(1).max(240),
});

export type ModelVerdict = z.infer<typeof modelVerdictSchema>;

export type ModerationDecision = {
  assetId: string;
  queue: "publish" | "creator-review" | "live-event-priority";
  action: ModelVerdict["action"];
  reason: string;
};

export function placeInQueue(asset: PlayerAsset, verdict: ModelVerdict): ModerationDecision {
  const queue = verdict.action === "allow"
    ? "publish"
    : asset.liveEvent
      ? "live-event-priority"
      : "creator-review";

  return {
    assetId: asset.assetId,
    queue,
    action: verdict.action,
    reason: verdict.reason,
  };
}
