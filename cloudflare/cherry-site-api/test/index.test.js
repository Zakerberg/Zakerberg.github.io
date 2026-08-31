import test from "node:test";
import assert from "node:assert/strict";

import { formatLocation, isBlockedNetwork, maskIp, networkMetadata, sanitizePath, shouldChallengeRequest, verifyAttemptCount, verifyAttemptWindow, visitAction } from "../src/index.js";

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

test("adds postal code when Cloudflare provides more detailed geolocation", () => {
  assert.deepEqual(formatLocation("SG", "Singapore", "Singapore", "238801"), {
    country: "新加坡",
    region: "",
    location: "新加坡 · 邮编 238801"
  });
});

test("marks explicit VPN networks as suspected proxy or VPN traffic", () => {
  assert.deepEqual(networkMetadata(9009, "M247 Europe SRL VPN"), {
    network: "M247 Europe SRL VPN · AS9009",
    riskLevel: "high",
    riskLabel: "疑似代理/VPN"
  });
});

test("marks data-center networks as a lower-confidence proxy or VPN risk", () => {
  assert.deepEqual(networkMetadata(24940, "Hetzner Online GmbH"), {
    network: "Hetzner Online GmbH · AS24940",
    riskLevel: "medium",
    riskLabel: "疑似代理/VPN"
  });
});

test("does not mark ordinary access networks as VPN traffic", () => {
  assert.deepEqual(networkMetadata(4134, "CHINANET-BACKBONE"), {
    network: "CHINANET-BACKBONE · AS4134",
    riskLevel: "",
    riskLabel: ""
  });
});

test("blocks a configured ASN even when the source IP changes", () => {
  assert.equal(isBlockedNetwork("43.***.***.224", 132203, { BLOCKED_ASNS: "132203" }), true);
  assert.equal(isBlockedNetwork("43.***.***.70", 132203, { BLOCKED_ASNS: "AS132203" }), true);
  assert.equal(isBlockedNetwork("43.***.***.70", 4134, { BLOCKED_ASNS: "132203" }), false);
});

test("ignores rapid refreshes from the same IP", () => {
  assert.equal(visitAction(1_000, 1_059), "ignore");
});

test("updates the existing row within the rolling six-hour window", () => {
  assert.equal(visitAction(12 * 60 * 60, 14 * 60 * 60), "update");
  assert.equal(visitAction(12 * 60 * 60, 18 * 60 * 60), "update");
});

test("inserts a new row after the six-hour window", () => {
  assert.equal(visitAction(12 * 60 * 60, 18 * 60 * 60 + 1), "insert");
});

const TURNSTILE_ON = { TURNSTILE_ENABLED: "true", TURNSTILE_SECRET_KEY: "secret" };

test("challenges risky networks on the first page", () => {
  assert.equal(shouldChallengeRequest({ page: 1, riskLevel: "high" }, TURNSTILE_ON), true);
});

test("challenges risky networks regardless of the page number", () => {
  assert.equal(shouldChallengeRequest({ page: 5, riskLevel: "medium" }, TURNSTILE_ON), true);
});

test("does not challenge clean networks before the deep pages", () => {
  assert.equal(shouldChallengeRequest({ page: 1, riskLevel: "", uniqueIps: 20, total: 20 }, TURNSTILE_ON), false);
  assert.equal(shouldChallengeRequest({ page: 5, riskLevel: "", uniqueIps: 20, total: 20 }, TURNSTILE_ON), false);
});

test("challenges busy networks on deep pages", () => {
  assert.equal(shouldChallengeRequest({ page: 6, riskLevel: "", uniqueIps: 4, total: 4 }, TURNSTILE_ON), true);
  assert.equal(shouldChallengeRequest({ page: 6, riskLevel: "", uniqueIps: 3, total: 3 }, TURNSTILE_ON), false);
});

test("challenges fast page flipping on deep pages even with low network activity", () => {
  assert.equal(shouldChallengeRequest({
    page: 6, riskLevel: "", uniqueIps: 1, total: 1, clientPageCount: 6, clientInterval: 5
  }, TURNSTILE_ON), true);
});

test("ignores fast page flipping signals that are not numeric", () => {
  assert.equal(shouldChallengeRequest({
    page: 6, riskLevel: "", uniqueIps: 1, total: 1, clientPageCount: 6, clientInterval: "abc"
  }, TURNSTILE_ON), false);
});

test("never challenges when Turnstile is disabled", () => {
  assert.equal(shouldChallengeRequest({ page: 6, riskLevel: "high" }, { TURNSTILE_ENABLED: "false" }), false);
  assert.equal(shouldChallengeRequest({ page: 6, riskLevel: "high" }, {}), false);
});

test("windows verify attempts into fixed hourly buckets", () => {
  assert.deepEqual(verifyAttemptWindow({}, 3_599), {
    windowSeconds: 3600,
    maxAttempts: 10,
    windowStart: 0
  });
  assert.deepEqual(verifyAttemptWindow({}, 3_600), {
    windowSeconds: 3600,
    maxAttempts: 10,
    windowStart: 3600
  });
});

test("clamps verify limit settings into sane ranges", () => {
  assert.equal(verifyAttemptWindow({ VERIFY_MAX_ATTEMPTS: "999", VERIFY_WINDOW_SECONDS: "1" }, 0).maxAttempts, 100);
  assert.equal(verifyAttemptWindow({ VERIFY_MAX_ATTEMPTS: "999", VERIFY_WINDOW_SECONDS: "1" }, 0).windowSeconds, 300);
});

test("counts only attempts within the current window", () => {
  assert.equal(verifyAttemptCount({ window_start: 3600, count: 9 }, 3600), 9);
  assert.equal(verifyAttemptCount({ window_start: 0, count: 9 }, 3600), 0);
  assert.equal(verifyAttemptCount(null, 3600), 0);
});
