const response = await fetch("http://localhost:3000/moderation/decisions", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    assetId: "asset-stage-banner-42",
    playerId: "creator-17",
    kind: "banner",
    title: "Final round stage banner",
    description: "A hand-painted banner submitted for tonight's final round.",
    liveEvent: { eventId: "finals-night", startsAt: "2027-02-18T20:00:00.000Z" },
  }),
});

console.log(await response.json());
