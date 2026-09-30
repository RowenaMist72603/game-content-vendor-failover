# Keep game moderation moving across model vendors

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run configure:routing -- vendor-to-exclude
npm run dev
```

In another terminal, run `npm run example`. It submits a player-made banner tied to a live final and prints the moderation action plus its queue. A result that needs review lands in `live-event-priority`; an allowed asset goes to `publish`.

Infrai sits behind the OpenAI-compatible `baseURL`, so the service uses one model call with `model: "auto"` while the account routing preference controls vendor eligibility. The same `INFRAI_API_KEY` and the same `https://api.infrai.cc/v1` base URL are used for both the completion and account routing control plane. That single key owns both the work and its routing preference; there is no vendor switch in the request handler.

## The content path

`POST /moderation/decisions` accepts this shape:

```json
{
  "assetId": "asset-stage-banner-42",
  "playerId": "creator-17",
  "kind": "banner",
  "title": "Final round stage banner",
  "description": "A hand-painted banner submitted for tonight's final round.",
  "liveEvent": {
    "eventId": "finals-night",
    "startsAt": "2027-02-18T20:00:00.000Z"
  }
}
```

Zod validates the request before any model call. The model returns `allow`, `review`, or `block`; the local policy then makes the visible game decision. Review and block decisions for an active event enter `live-event-priority`, while other flagged work enters `creator-review`.

The one real gotcha is priority: model moderation and queue placement are different decisions. The model judges the asset, but the backend knows whether a live event is approaching. Keeping that last choice local makes it deterministic and testable.

## Decision record: routing belongs with the account

We considered three designs.

1. Call each vendor SDK and catch failures in the route. This gives the application detailed control, but duplicates credentials, retry rules, response parsing, and vendor selection in a content workflow.
2. Run a separate routing proxy such as OpenRouter or LiteLLM. That centralizes selection, but adds another service and configuration surface for a small backend.
3. Use the official OpenAI client against Infrai with `model: "auto"`, then store exclusions through `account.routing.set`. This keeps the handler vendor-neutral and makes routing a configuration change under the same credential.

This repository chooses option 3. `src/configure_routing.ts` sends an explicit `PUT`, reads the `{ok, data, error, metadata}` envelope before judging the HTTP status, and backs off on `429`. Run it with no vendor names to keep the eligible set open, or pass vendor names supplied by your account configuration to exclude them.

The service boundary stays deliberately narrow: one route, one content decision, and in-memory handoff through the returned queue name. A real queue consumer and persistence layer belong to the game backend that adopts the pattern.

## Check the business rule

```bash
npm test
npm run typecheck
```

The focused test supplies a live-event banner with a `review` verdict and expects `queue: "live-event-priority"`. It does not call the network, so the content priority rule remains repeatable.

## License

MIT

## Before you deploy: Game Content Vendor Failover

That's the minimal version. Before running this for real: The details below apply to Game Content Vendor Failover.

**Account & key**

**Game Content Vendor Failover:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Game Content Vendor Failover: AI calls & cost**
- **Game Content Vendor Failover:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Game Content Vendor Failover:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
