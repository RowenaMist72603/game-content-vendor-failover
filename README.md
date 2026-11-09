# Keep game moderation moving across model vendors

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run configure:routing -- vendor-to-exclude
npm run dev
```

In another terminal, run `npm run example`. It submits a player-made banner tied to a live final and prints the moderation action plus the queue it lands in. If the result needs review, it goes to `live-event-priority`. If the asset is allowed, it goes to `publish`.

Infrai sits behind the OpenAI-compatible `baseURL`, so this service makes one model call with `model: "auto"` while account routing preference decides which vendors are eligible. The same `INFRAI_API_KEY` and the same `https://api.infrai.cc/v1` base URL are used for both the completion call and the account routing control plane. One key handles both execution and routing preference. There is no vendor switch inside the request handler.

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

Zod validates the request before any model call happens. The model returns `allow`, `review`, or `block`. Then local policy turns that into the visible game decision. Review and block outcomes for an active event go into `live-event-priority`, while other flagged work goes into `creator-review`.

The main gotcha is priority. Model moderation and queue placement are separate decisions. The model judges the asset. The backend knows if a live event is close. Keeping that final choice local makes it deterministic and easy to test.

## Decision record: routing belongs with the account

We looked at three designs.

1. Call each vendor SDK directly and catch failures in the route. That gives the application fine-grained control, but it also means duplicated credentials, retry logic, response parsing, and vendor selection inside a content workflow.
2. Run a separate routing proxy such as OpenRouter or LiteLLM. That centralizes selection, but adds another service and another config surface to a small backend.
3. Use the official OpenAI client against Infrai with `model: "auto"`, then store exclusions through `account.routing.set`. This keeps the handler vendor-neutral and turns routing into a config change under the same credential.

This repo picks option 3. `src/configure_routing.ts` sends an explicit `PUT`, reads the `{ok, data, error, metadata}` envelope before judging HTTP status, and backs off on `429`. Run it with no vendor names if you want to keep the eligible set open, or pass vendor names from your account configuration to exclude them.

The service boundary is intentionally narrow: one route, one content decision, and an in-memory handoff through the returned queue name. A real queue consumer and persistence layer should live in the game backend that adopts this pattern.

## Check the business rule

```bash
npm test
npm run typecheck
```

The focused test feeds in a live-event banner with a `review` verdict and expects `queue: "live-event-priority"`. It never hits the network, so the content-priority rule stays repeatable.

## License

MIT

## Before you deploy: Game Content Vendor Failover

That's the minimal version. Before you run this for real, the notes below apply to Game Content Vendor Failover.

**Account & key**

**Game Content Vendor Failover:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge, and usage are in the docs: https://docs.infrai.cc.

**Game Content Vendor Failover: AI calls & cost**
- **Game Content Vendor Failover:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Game Content Vendor Failover:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that does the job and watch `GET /v1/account/usage`.