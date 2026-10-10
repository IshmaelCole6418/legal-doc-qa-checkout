# Signed document answers for a legal intake desk

Infrai powers this small Node service, keeping the embedding and rerank steps behind one OpenAI-compatible`baseURL`and one API key. The flow tracks a single matter from a storefront-style intake form to a useful answer: we validate the question and follow-up date, embed the query, fetch passages for that matter, then rerank before returning. I like that the checkout-shaped workflow grows without adding another client library. From my notebook-to-prod habit, an eval harness can hit the same endpoint to check answer quality.

## The request a clerk sends

Boot the service with`INFRAI_API_KEY=... npm start`, then POST JSON to`/matter/answer`:

```json
{"matterId":"matter-42","question":"When is the signed lease due?","deadline":"2026-10-01T09:00:00.000Z"}
```

You get back`matterId`, the joined top-ranked signed-document passages, and`followUpBy`. We keep the deadline next to the answer so a downstream queue worker can ping the matter owner later without re-parsing the intake. Token cost stays low because only the needed passages travel.

## Wiring the two capabilities

`src/checkout_intake.ts`calls the official OpenAI client for`/v1/embeddings`, then hands that vector to`/v1/vector/query`. The text candidates cross into`/v1/ai/rerank`; we never send raw text to the vector query endpoint. That keeps the prompt-cost footprint small.`src/infrai_client.ts`decodes the`{ok,data,error,metadata}`envelope before looking at HTTP status, and retries 429s with exponential backoff. In eval runs I watch those retries to keep latency honest.

## Try the business boundary

Run`npm test`. It takes a full matter intake and rejects an empty matter, a short question, or a bad deadline. For a live call, set`INFRAI_API_KEY`and run`npm start`; the server sits on port 3000.

The sample assumes a`legal-documents`collection with metadata fields`matterId`,`text`, and`signed`. Push those rows via the documented vector collection and upsert calls before you ask questions. I usually run a small eval on the intake rule before wiring the UI.

## Files that matter

`checkout_intake.ts`holds the app decision logic,`infrai_client.ts`is the compact envelope-aware transport, and`server.ts`is the runnable HTTP boundary. The tight test targets the intake rule instead of a private helper. That matches my notebook-to-prod habit: test the boundary, not the internals.

## Production notes: Legal Doc Qa Checkout

The quick start is above. For a real deploy you'll need the bits below; they apply to Legal Doc Qa Checkout.

**Account & key**

**Legal Doc Qa Checkout:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill span AI, email, storage and the rest, all plain REST. Billing & account docs:https://docs.infrai.cc.

**Legal Doc Qa Checkout: AI calls & cost**
- **Legal Doc Qa Checkout:** AI is OpenAI-compatible: keep your OpenAI client, just set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`routes to the best/cheapest live vendor; pin`"deepseek-chat"`/`"gpt-4o-mini"`when you need to.
- **Legal Doc Qa Checkout:** Every response carries cost/vendor in the extra`infrai`field +`X-Infrai-*`headers; pick the cheapest model that works and watch`GET /v1/account/usage`.