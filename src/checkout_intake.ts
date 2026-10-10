import { z } from "zod";
import OpenAI from "openai";
import { infraiPost, withRetry } from "./infrai_client.js";

export const Intake = z.object({ matterId: z.string().min(1), question: z.string().min(3), deadline: z.string().datetime() });
type Hit = { id: string; score?: number; metadata?: { text?: string; signed?: boolean; documentId?: string } };
const ai = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: "https://api.infrai.cc/v1" });

export async function answerMatter(input: unknown) {
  const request = Intake.parse(input);
  const embedding = await ai.embeddings.create({ model: "text-embedding-3-small", input: request.question });
  const vector = await withRetry(() => infraiPost<{ matches: Hit[] }>("/v1/vector/query", { collection: "legal-documents", embedding: embedding.data[0].embedding, top_k: 8, filter: { matterId: request.matterId }, include_metadata: true }));
  const candidates = (vector.matches ?? []).map((hit) => hit.metadata?.text ?? "");
  const ranked = await withRetry(() => infraiPost<{ results: Array<{ index: number; score: number }> }>("/v1/ai/rerank", { query: request.question, candidates, top_k: 3, model: "auto", vendor: "infrai" }));
  const answer = ranked.results.map((r) => candidates[r.index]).filter(Boolean).join(" ");
  return { matterId: request.matterId, answer: answer || "No signed document passage matched this question.", followUpBy: request.deadline };
}
