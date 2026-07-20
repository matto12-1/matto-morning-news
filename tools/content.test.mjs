import { test } from "node:test";
import assert from "node:assert/strict";
import { pickIssueDate, todayISO } from "../assets/content.js";

test("exact today match", () => {
  assert.equal(pickIssueDate(["2026-07-20", "2026-07-21"], "2026-07-21"), "2026-07-21");
});

test("fallback to latest before today", () => {
  assert.equal(pickIssueDate(["2026-07-19", "2026-07-20"], "2026-07-21"), "2026-07-20");
});

test("ignores future issues", () => {
  assert.equal(pickIssueDate(["2026-07-19", "2026-07-30"], "2026-07-21"), "2026-07-19");
});

test("no past issue returns null", () => {
  assert.equal(pickIssueDate(["2026-07-25"], "2026-07-21"), null);
});

test("todayISO applies KST offset", () => {
  // 2026-07-20T20:00:00Z + 9h = 2026-07-21 05:00 KST
  const now = Date.parse("2026-07-20T20:00:00Z");
  assert.equal(todayISO(9 * 60, now), "2026-07-21");
});
