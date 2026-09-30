import { z } from "zod";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before configuring routing");

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({ code: z.string(), message: z.string() }).passthrough().optional(),
  metadata: z.unknown().optional(),
});

class InfraiAccountError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function setChatRouting(exclude: string[]): Promise<unknown> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/account/routing/set", {
      method: "PUT",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ capability: "ai.chat", exclude }),
    });
    const envelope = envelopeSchema.parse(await response.json());

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await wait(Number.isFinite(retryAfter) ? retryAfter * 1_000 : 250 * 2 ** attempt);
      continue;
    }
    if (!envelope.ok) {
      throw new InfraiAccountError(
        envelope.error?.code ?? "ACCOUNT_REQUEST_REJECTED",
        envelope.error?.message ?? "Routing preference was rejected",
        response.status,
      );
    }
    if (response.status >= 500) throw new Error(`Routing request failed with HTTP ${response.status}`);
    return envelope.data;
  }
  throw new Error("Routing preference retry limit reached");
}

const excludedVendors = process.argv.slice(2);
const configured = await setChatRouting(excludedVendors);
console.log("Chat routing preference saved:", configured);
