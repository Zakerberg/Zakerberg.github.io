import test from "node:test";
import assert from "node:assert/strict";

import worker, { alertInCooldown, alertSettings, detectAlerts, formatLocation, isBlockedNetwork, maskIp, networkMetadata, sanitizePath, shouldChallengeRequest, translateLocation, verifyAttemptCount, verifyAttemptWindow, visitAction } from "../src/index.js";

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
    location: "德国 · Berlin（柏林）"
  });
});

test("adds postal code when Cloudflare provides more detailed geolocation", () => {
  assert.deepEqual(formatLocation("SG", "Singapore", "Singapore", "238801"), {
    country: "新加坡",
    region: "",
    location: "新加坡 · 邮编 238801"
  });
});

test("formats US state and city bilingually without a postal code", () => {
  assert.deepEqual(formatLocation("US", "South Carolina", "Lancaster"), {
    country: "美国",
    region: "南卡罗来纳州",
    location: "美国 · South Carolina（南卡罗来纳州） · Lancaster（兰卡斯特）"
  });
});

test("formats US state and city bilingually while retaining the postal code", () => {
  assert.deepEqual(formatLocation("US", "South Carolina", "Lancaster", "29720"), {
    country: "美国",
    region: "南卡罗来纳州",
    location: "美国 · South Carolina（南卡罗来纳州） · Lancaster（兰卡斯特） · 邮编 29720"
  });
});

test("translates Georgia as a US state and preserves an unknown city in full", () => {
  const city = "Unknown Municipality With A Complete Name";
  const location = `美国 · Georgia（佐治亚州） · ${city}`;
  assert.deepEqual(formatLocation("US", "Georgia", city), {
    country: "美国",
    region: "佐治亚州",
    location
  });
  assert.equal(translateLocation(`美国 · Georgia · ${city}`), location);
});

test("never truncates unknown region or city names", () => {
  const region = "Unknown Region ".repeat(40).trim();
  const city = "Unknown Municipality ".repeat(40).trim();
  const location = `美国 · ${region} · ${city} · 邮编 29720`;
  assert.deepEqual(formatLocation("US", region, city, "29720"), {
    country: "美国",
    region,
    location
  });
  assert.equal(translateLocation(location), location);
});

test("keeps already Chinese locations unchanged without duplicate translations", () => {
  assert.deepEqual(formatLocation("CN", "广东", "广州"), {
    country: "中国",
    region: "广东",
    location: "中国 · 广东 · 广州"
  });
  for (const location of [
    "中国 · 广东 · 广州",
    "美国 · 南卡罗来纳州 · 兰卡斯特 · 邮编 29720",
    "中国香港",
    "新加坡 · 邮编 238801"
  ]) {
    assert.equal(translateLocation(location), location);
  }
});

test("formats missing regions or cities without empty separators", () => {
  for (const missing of [undefined, null, ""]) {
    assert.deepEqual(formatLocation("US", missing, "Lancaster"), {
      country: "美国",
      region: "",
      location: "美国 · Lancaster（兰卡斯特）"
    });
    assert.deepEqual(formatLocation("US", "South Carolina", missing), {
      country: "美国",
      region: "南卡罗来纳州",
      location: "美国 · South Carolina（南卡罗来纳州）"
    });
    assert.deepEqual(formatLocation("US", missing, missing), {
      country: "美国",
      region: "",
      location: "美国"
    });
    assert.deepEqual(formatLocation("US", missing, missing, "29720"), {
      country: "美国",
      region: "",
      location: "美国 · 邮编 29720"
    });
  }
});

test("translates historical US locations with and without postal codes", () => {
  for (const suffix of ["", " · 邮编 29720"]) {
    assert.equal(
      translateLocation(`美国 · South Carolina · Lancaster${suffix}`),
      `美国 · South Carolina（南卡罗来纳州） · Lancaster（兰卡斯特）${suffix}`
    );
  }
});

test("translates the remaining foreign addresses in the public visitor list", () => {
  const cases = [
    ["MX", "Mexico City", "Mexico City", "03020", "墨西哥 · Mexico City（墨西哥城） · 邮编 03020"],
    ["EC", "Guayas", "Guayaquil", "090307", "厄瓜多尔 · Guayas（瓜亚斯省） · Guayaquil（瓜亚基尔） · 邮编 090307"],
    ["US", "Illinois", "Chicago", "60608", "美国 · Illinois（伊利诺伊州） · Chicago（芝加哥） · 邮编 60608"],
    ["BD", "Dhaka Division", "Dhaka", "1000", "孟加拉国 · Dhaka Division（达卡专区） · Dhaka（达卡） · 邮编 1000"],
    ["US", "Texas", "Dallas", "75201", "美国 · Texas（得克萨斯州） · Dallas（达拉斯） · 邮编 75201"],
    ["US", "Iowa", "Council Bluffs", "51503", "美国 · Iowa（艾奥瓦州） · Council Bluffs（康瑟尔布拉夫斯） · 邮编 51503"],
    ["RU", "Astrakhan Oblast", "Astrakhan", "414000", "俄罗斯 · Astrakhan Oblast（阿斯特拉罕州） · Astrakhan（阿斯特拉罕） · 邮编 414000"],
    ["RO", "Prahova", "Ploieşti", "100001", "罗马尼亚 · Prahova（普拉霍瓦县） · Ploieşti（普洛耶什蒂） · 邮编 100001"]
  ];
  for (const [code, region, city, postalCode, expected] of cases) {
    const formatted = formatLocation(code, region, city, postalCode);
    assert.equal(formatted.location, expected);
    const legacy = [formatted.country, ...new Set([region, city]), `邮编 ${postalCode}`].join(" · ");
    assert.equal(translateLocation(legacy), expected);
  }
});

test("distinguishes New York state from its city and scopes US state translations", () => {
  const location = "美国 · New York（纽约州） · New York（纽约）";
  assert.deepEqual(formatLocation("US", "New York", "New York"), {
    country: "美国",
    region: "纽约州",
    location
  });
  assert.equal(translateLocation("美国 · New York · New York"), location);
  assert.equal(formatLocation("US", "", "New York").location, "美国 · New York（纽约）");
  assert.equal(formatLocation("CA", "Georgia", "").region, "Georgia");
});

test("translates all fifty US state names without losing their original names", () => {
  const states = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
    "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
    "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"
  ];
  for (const state of states) {
    const translated = translateLocation(`美国 · ${state}`);
    assert.ok(translated.startsWith(`美国 · ${state}（`), state);
    assert.match(translated, /^美国 · [A-Za-z ]+（[\u3400-\u9fff·-]+）$/, state);
    assert.equal(translateLocation(translated), translated, state);
  }
});

test("uses existing foreign place translations for historical locations", () => {
  const places = [
    ["荷兰", "Amsterdam", "阿姆斯特丹"],
    ["德国", "Baden-Wurttemberg", "巴登-符腾堡"],
    ["德国", "Bavaria", "巴伐利亚"],
    ["德国", "Berlin", "柏林"],
    ["德国", "Dusseldorf", "杜塞尔多夫"],
    ["德国", "Frankfurt", "法兰克福"],
    ["德国", "Frankfurt am Main", "法兰克福"],
    ["德国", "Hamburg", "汉堡"],
    ["芬兰", "Helsinki", "赫尔辛基"],
    ["英国", "London", "伦敦"],
    ["美国", "Los Angeles", "洛杉矶"],
    ["西班牙", "Madrid", "马德里"],
    ["澳大利亚", "Melbourne", "墨尔本"],
    ["德国", "Munich", "慕尼黑"],
    ["日本", "Osaka", "大阪"],
    ["法国", "Paris", "巴黎"],
    ["韩国", "Seoul", "首尔"],
    ["瑞典", "Stockholm", "斯德哥尔摩"],
    ["澳大利亚", "Sydney", "悉尼"],
    ["日本", "Tokyo", "东京"],
    ["加拿大", "Toronto", "多伦多"],
    ["加拿大", "Vancouver", "温哥华"],
    ["奥地利", "Vienna", "维也纳"]
  ];
  for (const [country, name, translation] of places) {
    assert.equal(
      translateLocation(`${country} · ${name}`),
      `${country} · ${name}（${translation}）`
    );
  }
});

test("keeps bilingual and already parenthesized place names idempotent", () => {
  for (const location of [
    "美国 · South Carolina（南卡罗来纳州） · Lancaster（兰卡斯特） · 邮编 29720",
    "德国 · Berlin（柏林）",
    "德国 · Berlin（已有译名）"
  ]) {
    assert.equal(translateLocation(location), location);
    assert.equal(translateLocation(translateLocation(location)), location);
  }
  assert.equal(
    translateLocation("美国 · South Carolina（南卡罗来纳州） · Lancaster · 邮编 29720"),
    "美国 · South Carolina（南卡罗来纳州） · Lancaster（兰卡斯特） · 邮编 29720"
  );
});

test("translates historical locations with missing regions or cities", () => {
  for (const [location, expected] of [
    ["美国 · Lancaster", "美国 · Lancaster（兰卡斯特）"],
    ["美国 · South Carolina", "美国 · South Carolina（南卡罗来纳州）"],
    ["美国", "美国"],
    ["美国 · 邮编 29720", "美国 · 邮编 29720"],
    ["", ""]
  ]) {
    assert.equal(translateLocation(location), expected);
  }
});

test("GET visits translates stored US locations using only read-only D1 queries", async () => {
  const legacyVisit = {
    id: 1,
    ip_masked: "203.***.***.1",
    location: "美国 · South Carolina · Lancaster · 邮编 29720",
    network: "Example access network",
    risk_level: "",
    risk_label: "",
    visited_at: Math.floor(Date.now() / 1000)
  };
  const reads = [];
  const DB = {
    prepare(sql) {
      assert.match(sql.trim(), /^SELECT\b/i, "listing visits must not write to D1");
      assert.match(sql, /\bFROM\s+visits\b/i);
      return {
        bind() {
          return this;
        },
        async first() {
          assert.match(sql, /COUNT\(\*\)\s+AS\s+total/i);
          reads.push("count");
          return { total: 1 };
        },
        async all() {
          assert.match(sql, /\blocation\b/i);
          reads.push("items");
          return { results: [{ ...legacyVisit }] };
        }
      };
    }
  };
  const request = new Request("https://cherry-api.example/api/visits?page=1", {
    method: "GET",
    headers: {
      Origin: "https://zakerberg.github.io",
      "CF-Connecting-IP": "203.0.113.1"
    }
  });
  const response = await worker.fetch(request, { DB, TURNSTILE_ENABLED: "false" });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].id, legacyVisit.id);
  assert.equal(
    body.items[0].location,
    "美国 · South Carolina（南卡罗来纳州） · Lancaster（兰卡斯特） · 邮编 29720"
  );
  assert.equal(body.pagination.total, 1);
  assert.deepEqual(reads, ["count", "items"]);
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

test("alert settings default to the agreed thresholds", () => {
  assert.deepEqual(alertSettings({}), {
    trafficMultiplier: 3,
    trafficMinCount: 20,
    riskRatio: 40,
    riskMinIps: 3,
    verifyMaxAttempts: 15,
    blockedMinCount: 10,
    cooldownSeconds: 7200
  });
});

test("alert settings clamp out-of-range values", () => {
  const settings = alertSettings({
    ALERT_TRAFFIC_MULTIPLIER: "999",
    ALERT_TRAFFIC_MIN: "1",
    ALERT_RISK_RATIO: "1",
    ALERT_RISK_MIN_IPS: "999",
    ALERT_VERIFY_ATTEMPTS: "1",
    ALERT_BLOCKED_MIN: "1",
    ALERT_COOLDOWN_SECONDS: "1"
  });
  assert.equal(settings.trafficMultiplier, 10);
  assert.equal(settings.trafficMinCount, 5);
  assert.equal(settings.riskRatio, 10);
  assert.equal(settings.riskMinIps, 20);
  assert.equal(settings.verifyMaxAttempts, 5);
  assert.equal(settings.blockedMinCount, 3);
  assert.equal(settings.cooldownSeconds, 600);
});

test("detects a traffic spike above the minimum count and multiplier", () => {
  const alerts = detectAlerts(
    { hourlyVisits: 100, baselineHourly: 10, riskVisits: 0, riskIps: 0, verifyAttempts: 0, blockedCount: 0 },
    alertSettings({})
  );
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "traffic");
});

test("ignores a traffic spike below the minimum count", () => {
  const alerts = detectAlerts(
    { hourlyVisits: 15, baselineHourly: 1, riskVisits: 0, riskIps: 0, verifyAttempts: 0, blockedCount: 0 },
    alertSettings({})
  );
  assert.deepEqual(alerts, []);
});

test("detects risky visits only with enough distinct IPs", () => {
  const alerts = detectAlerts(
    { hourlyVisits: 100, baselineHourly: 50, riskVisits: 50, riskIps: 4, verifyAttempts: 0, blockedCount: 0 },
    alertSettings({})
  );
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "risk");
});

test("ignores risky visits spread across too few IPs", () => {
  const alerts = detectAlerts(
    { hourlyVisits: 100, baselineHourly: 50, riskVisits: 90, riskIps: 2, verifyAttempts: 0, blockedCount: 0 },
    alertSettings({})
  );
  assert.deepEqual(alerts, []);
});

test("detects verify brute-force attempts at the threshold", () => {
  const alerts = detectAlerts(
    { hourlyVisits: 0, baselineHourly: 0, riskVisits: 0, riskIps: 0, verifyAttempts: 15, blockedCount: 0 },
    alertSettings({})
  );
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "verify");
});

test("detects a blocked request surge at the threshold", () => {
  const alerts = detectAlerts(
    { hourlyVisits: 0, baselineHourly: 0, riskVisits: 0, riskIps: 0, verifyAttempts: 0, blockedCount: 10 },
    alertSettings({})
  );
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "blocked");
});

test("can raise multiple alert types in one run", () => {
  const alerts = detectAlerts(
    { hourlyVisits: 100, baselineHourly: 10, riskVisits: 50, riskIps: 4, verifyAttempts: 15, blockedCount: 10 },
    alertSettings({})
  );
  assert.deepEqual(alerts.map((alert) => alert.type).sort(), ["blocked", "risk", "traffic", "verify"]);
});

test("cooldown only blocks alerts sent within the window", () => {
  assert.equal(alertInCooldown(null, 1000, 7200), false);
  assert.equal(alertInCooldown({ alerted_at: 999 }, 1000, 7200), true);
  assert.equal(alertInCooldown({ alerted_at: 1000 - 7200 }, 1000, 7200), false);
});
