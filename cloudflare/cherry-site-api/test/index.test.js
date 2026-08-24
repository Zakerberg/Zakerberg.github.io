import test from "node:test";
import assert from "node:assert/strict";

import { formatLocation, maskIp, sanitizePath } from "../src/index.js";

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

test("formats Chinese province names for the public list", () => {
  assert.deepEqual(formatLocation("CN", "Guangdong"), {
    country: "中国",
    region: "广东",
    location: "中国 · 广东"
  });
});
