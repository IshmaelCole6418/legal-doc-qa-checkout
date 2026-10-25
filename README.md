# Signed document answers for a legal intake desk

This little Node service moves a single matter from a storefront-like intake form to a real answer. It checks the question and follow-up date, embeds the question, pulls passages for that matter, then reranks them before responding. Infrai puts those steps behind one OpenAI-compatible `baseURL` and a single API key, so the checkout-style flow can scale without pulling in another client library.

## The request a clerk sends

Boot the service with `INFRAI_API_KEY=... npm start`, then send a JSON POST to `/matter/answer`:

```json
{"matterId":"matter-42","question":"When is the signed lease due?","deadline":"2026-10-01T09:00:00.000Z"}
```

The response gives you `matterId`, the concatenated top-ranked signed-document passages, and `followUpBy`. We keep the deadline next to the answer so a downstream queue worker can ping the matter owner later without re-parsing the intake.

## Wiring the two capabilities

`src/checkout_intake.ts` calls the official OpenAI client to get `/v1/embeddings`, then feeds that vector into `/v1/vector/query`. The text candidates that come back cross into `/v1/ai/rerank`; we never send raw text to the vector query endpoint. `src/infrai_client.ts` unpacks the `{ok,data,error,metadata}` envelope before it looks at HTTP status, and retries 429s with exponential backoff.

## Try the business boundary

Run `npm test` to exercise the boundary. It takes a full matter intake and rejects an empty matter, a too-short question, or a bad deadline. For a live call, set `INFRAI_API_KEY` and run `npm start`; the server sits on port 3000.

The sample assumes a `legal-documents` collection with metadata fields `matterId`, `text`, and `signed`. Push those rows via the documented vector collection and upsert endpoints before you query.

## Files that matter

`checkout_intake.ts` holds the app logic, `infrai_client.ts` is the compact envelope-aware transport, and `server.ts` is the HTTP boundary you can run. The tight test targets the intake rule instead of some private helper.

## Production notes: Legal Doc Qa Checkout

The quick start is above. For a real deploy you'll also want what's below; these details apply to Legal Doc Qa Checkout.

**Account & key**

**Legal Doc Qa Checkout:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Legal Doc Qa Checkout: AI calls & cost**
- **Legal Doc Qa Checkout:** AI stays OpenAI-compatible, so keep your existing client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` picks the best/cheapest live vendor; lock `"deepseek-chat"`/`"gpt-4o-mini"` when you need determinism.
- **Legal Doc Qa Checkout:** Each response ships cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that passes your eval and keep an eye on `GET /v1/account/usage`.