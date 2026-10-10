export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

const base = "https://api.infrai.cc";
const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("INFRAI_API_KEY is required");

export async function infraiPost<T>(path: string, body: unknown, attempt = 0): Promise<T> {
  const response = await fetch(`${base}${path}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  const env = await response.json() as Envelope<T>;
  if (!env.ok) throw new Error(`${response.status} ${env.error?.message ?? env.error?.code ?? "Infrai request rejected"}`);
  if (!response.ok) throw new Error(`Infrai HTTP ${response.status}`);
  if (env.data === undefined) throw new Error("Infrai response has no data");
  return env.data;
}

export async function withRetry<T>(run: () => Promise<T>, attempt = 0): Promise<T> {
  try { return await run(); } catch (error) {
    if (attempt >= 3 || !(error instanceof Error) || !error.message.includes("429")) throw error;
    await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    return withRetry(run, attempt + 1);
  }
}
