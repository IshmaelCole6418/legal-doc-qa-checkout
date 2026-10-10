import assert from "node:assert/strict";
import { Intake } from "../src/checkout_intake.js";

const parsed = Intake.safeParse({ matterId: "matter-42", question: "When is the signed lease due?", deadline: "2026-10-01T09:00:00.000Z" });
assert.equal(parsed.success, true);
assert.equal(Intake.safeParse({ matterId: "", question: "x", deadline: "nope" }).success, false);
console.log("intake boundary checks passed");
