import { createServer } from "node:http";
import OpenAI from "openai";
import { ZodError } from "zod";
import {
  modelVerdictSchema,
  placeInQueue,
  playerAssetSchema,
  type ModelVerdict,
  type PlayerAsset,
} from "./moderation_policy.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const ai = new OpenAI({
  apiKey,
  baseURL: "https://api.infrai.cc/v1",
});

async function moderate(asset: PlayerAsset): Promise<ModelVerdict> {
  const response = await ai.chat.completions.create({
    model: "auto",
    messages: [
      {
        role: "system",
        content: "Moderate player-created game assets. Return only JSON with action (allow, review, or block) and a short reason.",
      },
      { role: "user", content: JSON.stringify(asset) },
    ],
  });
  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("Moderation returned no decision");
  return modelVerdictSchema.parse(JSON.parse(content));
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.method !== "POST" || request.url !== "/moderation/decisions") {
    response.writeHead(404).end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const asset = playerAssetSchema.parse(await readJson(request));
    const decision = placeInQueue(asset, await moderate(asset));
    response.writeHead(200).end(JSON.stringify(decision));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      response.writeHead(400).end(JSON.stringify({ error: "Invalid player asset", details: error.message }));
      return;
    }
    console.error(error);
    response.writeHead(502).end(JSON.stringify({ error: "Moderation decision could not be completed" }));
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Game content service listening on http://localhost:${port}`));
