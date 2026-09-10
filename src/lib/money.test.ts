import assert from "node:assert/strict";
import { test } from "vitest";
import { formatMoney, parseAmount, toPrimary } from "./money";

const usd = { primaryCurrency: "USD" as const, copPerUsd: 4000 };
const cop = { primaryCurrency: "COP" as const, copPerUsd: 4000 };

test("parseAmount reads US-style input", () => {
  assert.equal(parseAmount("1250.75", "USD"), 1250.75);
  assert.equal(parseAmount("1,250.75", "USD"), 1250.75);
  assert.equal(parseAmount("$1,250", "USD"), 1250);
  assert.equal(parseAmount("12.5", "USD"), 12.5);
  assert.equal(parseAmount("1,250", "USD"), 1250);
});

test("parseAmount reads Colombian-style input", () => {
  // The whole point of the currency argument: dots are thousands marks here.
  assert.equal(parseAmount("1.250.000", "COP"), 1250000);
  assert.equal(parseAmount("1.250", "COP"), 1250);
  assert.equal(parseAmount("$ 450.000", "COP"), 450000);
  assert.equal(parseAmount("1,250,000", "COP"), 1250000);
});

test("parseAmount treats European decimals on USD as decimals", () => {
  assert.equal(parseAmount("12,50", "USD"), 12.5);
  assert.equal(parseAmount("1.250.000", "USD"), 1250000);
});

test("parseAmount rejects junk", () => {
  assert.equal(parseAmount("", "USD"), null);
  assert.equal(parseAmount("abc", "USD"), null);
  assert.equal(parseAmount("-5", "USD"), 5);
});

test("toPrimary converts both directions", () => {
  assert.equal(toPrimary(100, "USD", usd), 100);
  assert.equal(toPrimary(400000, "COP", usd), 100);
  assert.equal(toPrimary(100, "USD", cop), 400000);
  assert.equal(toPrimary(400000, "COP", cop), 400000);
});

test("toPrimary survives a zeroed rate instead of returning Infinity", () => {
  const broken = { primaryCurrency: "USD" as const, copPerUsd: 0 };
  assert.equal(toPrimary(400000, "COP", broken), 0);
  assert.equal(toPrimary(100, "USD", broken), 100);
});

test("formatMoney shows cents for dollars and none for pesos", () => {
  assert.equal(formatMoney(1250.5, "USD"), "$1,250.50");
  // Intl separates the COP code with a non-breaking space.
  assert.equal(formatMoney(1250000, "COP"), "COP\u00a01,250,000");
});
