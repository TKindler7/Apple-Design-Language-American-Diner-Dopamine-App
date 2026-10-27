import test from "node:test";
import assert from "node:assert/strict";
import { specialStatus } from "../special.js";

const local = (hour, minute = 0, second = 0, millisecond = 0) =>
  new Date(2026, 9, 27, hour, minute, second, millisecond);

test("the daily offer stays inactive before 08:00 and counts down to opening", () => {
  assert.deepEqual(specialStatus(local(0)), { active: false, remainingSeconds: 8 * 60 * 60 });
  assert.deepEqual(specialStatus(local(7, 30)), { active: false, remainingSeconds: 30 * 60 });
  assert.deepEqual(specialStatus(local(7, 59, 59, 999)), { active: false, remainingSeconds: 1 });
});

test("the offer starts at exactly 08:00 and counts down to local midnight", () => {
  assert.deepEqual(specialStatus(local(8)), { active: true, remainingSeconds: 16 * 60 * 60 });
  assert.deepEqual(specialStatus(local(12, 30)), { active: true, remainingSeconds: 11.5 * 60 * 60 });
  assert.deepEqual(specialStatus(local(23, 59, 59)), { active: true, remainingSeconds: 1 });
  assert.deepEqual(specialStatus(local(23, 59, 59, 999)), { active: true, remainingSeconds: 1 });
});

test("midnight closes the offer and begins a new countdown to 08:00", () => {
  assert.deepEqual(specialStatus(local(24)), { active: false, remainingSeconds: 8 * 60 * 60 });
});

test("reading the offer clock does not mutate its input", () => {
  const now = local(20, 17, 34, 123);
  const timestamp = now.getTime();
  specialStatus(now);
  assert.equal(now.getTime(), timestamp);
});

test("an invalid clock cannot activate an offer or produce a NaN countdown", () => {
  assert.deepEqual(specialStatus(new Date(NaN)), { active: false, remainingSeconds: 0 });
  assert.deepEqual(specialStatus(null), { active: false, remainingSeconds: 0 });
});
