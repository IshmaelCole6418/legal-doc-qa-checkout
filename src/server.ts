import { createServer } from "node:http";
import { answerMatter } from "./checkout_intake.js";

createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/matter/answer") { res.writeHead(404); res.end(); return; }
  try {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const result = await answerMatter(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(result));
  } catch (error) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request" })); }
}).listen(3000);
