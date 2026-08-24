import test from "node:test";
import assert from "node:assert/strict";

import { formatLocation, maskIp, sanitizePath, visitAction } from "../src/index.js";

test("masks IPv4 without retaining the middle octets", () => {
  assert.equal(maskIp("120.34.56.31"), "120.***.***.31");
});

test("masks IPv6 more aggressively", () => {
  assert.equal(maskIp("2408:8207:1234:5678::1"), "2408:****:****:****");
});

test("accepts only local page paths", () => {
  assert.equal(sanitizePath("/G80/G80-1000/?from=test#top"), "/G80/G80-1000/");
  assert.equal(sanitizePath("https://example.com/"), null);
  assert.equal(sanitizePath("//example.com/"), null);
});

test("formats Chinese country, province and city names for the public list", () => {
  assert.deepEqual(formatLocation("CN", "Guangdong", "Guangzhou"), {
    country: "中国",
    region: "广东",
    location: "中国 · 广东 · 广州"
  });
});

test("uses China Hong Kong as a complete location name", () => {
  assert.deepEqual(formatLocation("HK", "Hong Kong", "Hong Kong"), {
    country: "中国香港",
    region: "",
    location: "中国香港"
  });
});

test("translates Berlin for German visits", () => {
  assert.deepEqual(formatLocation("DE", "Berlin", "Berlin"), {
    country: "德国",
    region: "柏林",
    location: "德国 · 柏林"
  });
});

test("ignores rapid refreshes from the same IP", () => {
  assert.equal(visitAction(1_000, 1_059), "ignore");
});

test("updates the existing row within the rolling three-hour window", () => {
  assert.equal(visitAction(12 * 60 * 60, 14 * 60 * 60), "update");
  assert.equal(visitAction(12 * 60 * 60, 15 * 60 * 60), "update");
});

test("inserts a new row after the three-hour window", () => {
  assert.equal(visitAction(12 * 60 * 60, 15 * 60 * 60 + 1), "insert");
});
