import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import worker, {
  alertInCooldown,
  alertSettings,
  detectAlerts,
  formatLocation,
  isBlockedNetwork,
  maskIp,
  networkMetadata,
  sanitizePath,
  shouldChallengeRequest,
  translateLocation,
  verifyAttemptCount,
  verifyAttemptWindow,
  visitAction,
  visitRateWindow
} from "../src/index.js";

const ORIGIN = "https://zakerberg.github.io";
const CANARY = "canary-serverchan-secret";

function captureLogs(t) {
  const logs = [];
  for (const method of ["error", "warn", "log", "info", "debug"]) {
    t.mock.method(console, method, (...args) => logs.push(args));
  }
  t.after(() => assert.equal(JSON.stringify(logs).includes(CANARY), false));
  return logs;
}

function visitRequest(body = JSON.stringify({ path: "/friends/" }), headers = {}) {
  return new Request("https://cherry-api.example/api/visit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      "CF-Connecting-IP": "203.0.113.1",
      ...headers
    },
    body,
    duplex: "half"
  });
}

function unusedVisitEnv(t) {
  const prepare = t.mock.fn(() => { throw new Error("D1 must not be called"); });
  t.after(() => assert.equal(prepare.mock.callCount(), 0));
  return { DB: { prepare }, IP_HASH_SECRET: "test-secret" };
}

function sqliteVisitEnv(t, settings = {}) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  t.after(() => sqlite.close());
  const queries = [];
  function execute(sql, values, first = false) {
    queries.push(sql);
    const statement = sqlite.prepare(sql);
    if (first) return statement.get(...values) || null;
    const result = statement.run(...values);
    return { meta: { last_row_id: Number(result.lastInsertRowid), changes: Number(result.changes) } };
  }
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) {
          values = args;
          return this;
        },
        async first() {
          // Yield like D1 so overlapping requests can interleave between statements.
          await new Promise(setImmediate);
          return execute(sql, values, true);
        },
        async run() {
          await new Promise(setImmediate);
          return execute(sql, values);
        },
        runSync() {
          return execute(sql, values);
        }
      };
    },
    async batch(statements) {
      await new Promise(setImmediate);
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((statement) => statement.runSync());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    }
  };
  return { env: { IP_HASH_SECRET: "test-secret", ...settings, DB }, sqlite, queries };
}

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
    ["RO", "Prahova", "Ploieşti", "100001", "罗马尼亚 · Prahova（普拉霍瓦县） · Ploieşti（普洛耶什蒂） · 邮编 100001"],
    ["BR", "Rio Grande do Sul", "Porto Alegre", "90000-000", "巴西 · Rio Grande do Sul（南里奥格兰德州） · Porto Alegre（阿雷格里港） · 邮编 90000-000"],
    ["VE", "Lara", "Barquisimeto", "3001", "委内瑞拉 · Lara（拉腊州） · Barquisimeto（巴基西梅托） · 邮编 3001"],
    ["VE", "Mérida", "Mérida", "5101", "委内瑞拉 · Mérida（梅里达） · 邮编 5101"],
    ["CO", "Valle del Cauca Department", "Cali", "760001", "哥伦比亚 · Valle del Cauca Department（考卡山谷省） · Cali（卡利） · 邮编 760001"],
    ["CO", "Bogota D.C.", "Bogotá", "111411", "哥伦比亚 · Bogota D.C.（波哥大首都区） · Bogotá（波哥大） · 邮编 111411"],
    ["DE", "Hesse", "Frankfurt", "60306", "德国 · Hesse（黑森州） · Frankfurt（法兰克福） · 邮编 60306"],
    ["NL", "North Holland", "Amsterdam", "1012", "荷兰 · North Holland（北荷兰省） · Amsterdam（阿姆斯特丹） · 邮编 1012"]
  ];
  for (const [code, region, city, postalCode, expected] of cases) {
    const formatted = formatLocation(code, region, city, postalCode);
    assert.equal(formatted.location, expected);
    const legacy = [formatted.country, ...new Set([region, city]), `邮编 ${postalCode}`].join(" · ");
    assert.equal(translateLocation(legacy), expected);
  }
});

test("translates Ho Chi Minh City without mistaking its abbreviation for a translation", () => {
  const legacy = "越南 · Ho Chi Minh City (HCMC) · Ho Chi Minh City · 邮编 71606";
  const expected = "越南 · Ho Chi Minh City (HCMC)（胡志明市） · Ho Chi Minh City（胡志明市） · 邮编 71606";
  assert.equal(translateLocation(legacy), expected);
  assert.equal(translateLocation(expected), expected);
  assert.deepEqual(formatLocation("VN", "Ho Chi Minh City (HCMC)", "Ho Chi Minh City", "71606"), {
    country: "越南",
    region: "胡志明市",
    location: "越南 · Ho Chi Minh City (HCMC)（胡志明市） · 邮编 71606"
  });
});

test("translates accented and alternate place names without changing their spelling", () => {
  for (const [country, name, translation] of [
    ["哥伦比亚", "Bogota", "波哥大"],
    ["哥伦比亚", "Bogotá", "波哥大"],
    ["哥伦比亚", "Bogota D.C.", "波哥大首都区"],
    ["哥伦比亚", "Bogotá D.C.", "波哥大首都区"],
    ["委内瑞拉", "Merida", "梅里达"],
    ["委内瑞拉", "Mérida", "梅里达"],
    ["德国", "Hesse", "黑森州"],
    ["德国", "Hessen", "黑森州"]
  ]) {
    const expected = `${country} · ${name}（${translation}）`;
    assert.equal(translateLocation(`${country} · ${name}`), expected);
    assert.equal(translateLocation(expected), expected);
  }
});

test("fills translation gaps in mixed-language historical records without requiring postal codes", () => {
  for (const [legacy, expected] of [
    ["德国 · Hesse · 法兰克福 · 邮编 60306", "德国 · Hesse（黑森州） · 法兰克福 · 邮编 60306"],
    ["荷兰 · North Holland · 阿姆斯特丹 · 邮编 1012", "荷兰 · North Holland（北荷兰省） · 阿姆斯特丹 · 邮编 1012"],
    ["委内瑞拉 · Mérida", "委内瑞拉 · Mérida（梅里达）"],
    ["委内瑞拉 · Lara · Barquisimeto", "委内瑞拉 · Lara（拉腊州） · Barquisimeto（巴基西梅托）"]
  ]) {
    assert.equal(translateLocation(legacy), expected);
    assert.equal(translateLocation(expected), expected);
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

test("translates places from the global GeoNames dictionary", () => {
  // Las Vegas - previously untranslated
  assert.deepEqual(formatLocation("US", "Nevada", "Las Vegas", "89158"), {
    country: "美国",
    region: "内华达州",
    location: "美国 · Nevada（内华达州） · Las Vegas（拉斯维加斯） · 邮编 89158"
  });

  // Buenos Aires and Zárate - Argentina
  assert.deepEqual(formatLocation("AR", "Buenos Aires", "Zárate", "2800"), {
    country: "阿根廷",
    region: "布宜诺斯艾利斯省",
    location: "阿根廷 · Buenos Aires（布宜诺斯艾利斯省） · Zárate（萨拉特） · 邮编 2800"
  });

  // Brazilian states and cities
  assert.deepEqual(formatLocation("BR", "Mato Grosso", "Cuiabá", "78000-000"), {
    country: "巴西",
    region: "马托格罗索州",
    location: "巴西 · Mato Grosso（马托格罗索州） · Cuiabá（库亚巴） · 邮编 78000-000"
  });

  assert.deepEqual(formatLocation("BR", "Santa Catarina", "Florianópolis", "88000-000"), {
    country: "巴西",
    region: "圣卡塔琳娜州",
    location: "巴西 · Santa Catarina（圣卡塔琳娜州） · Florianópolis（弗洛里亚诺波利斯） · 邮编 88000-000"
  });

  // Historical translation also works
  assert.equal(
    translateLocation("美国 · Nevada · Las Vegas · 邮编 89158"),
    "美国 · Nevada（内华达州） · Las Vegas（拉斯维加斯） · 邮编 89158"
  );
  assert.equal(
    translateLocation("阿根廷 · Buenos Aires · Zárate · 邮编 2800"),
    "阿根廷 · Buenos Aires（布宜诺斯艾利斯省） · Zárate（萨拉特） · 邮编 2800"
  );
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

test("health reports success, non-ok results and thrown D1 errors safely", async (t) => {
  for (const [name, result, status] of [
    ["healthy", { ok: 1 }, 200],
    ["non-ok", { ok: 0 }, 503],
    ["missing result", null, 503],
    ["query failure", new Error(`D1 failed at /private/${CANARY}`), 503]
  ]) {
    await t.test(name, async (t) => {
      const logs = captureLogs(t);
      const request = new Request(`https://cherry-api.example/health?secret=${CANARY}`, {
        headers: { Origin: ORIGIN }
      });
      const response = await worker.fetch(request, {
        DB: {
          prepare(sql) {
            assert.equal(sql, "SELECT 1 AS ok");
            return {
              async first() {
                if (result instanceof Error) throw result;
                return result;
              }
            };
          }
        }
      });
      assert.equal(response.status, status);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
      assert.deepEqual(await response.json(), { ok: status === 200 });
      assert.deepEqual(logs, status === 200 ? [] : [["Health check failed"]]);
    });
  }
});

test("request failures retain allowed CORS and log only allowlisted context", async (t) => {
  for (const [name, method, path, origin, expectedOrigin] of [
    ["visits", "GET", "/api/visits", ORIGIN, ORIGIN],
    ["visit", "POST", "/api/visit", ORIGIN, ORIGIN],
    ["verification", "POST", "/api/verify-human", ORIGIN, ORIGIN],
    ["health", "GET", "/health", ORIGIN, ORIGIN],
    ["unknown path and configured origin", "GET", `/private/${CANARY}`, "https://custom.example", "https://custom.example"],
    ["unknown method and disallowed origin", CANARY, `/api/visits/${CANARY}`, "https://untrusted.example", null],
    ["missing origin", "GET", `/private/${CANARY}`, null, null]
  ]) {
    await t.test(name, async (t) => {
      const logs = captureLogs(t);
      const headers = new Headers({
        "CF-Connecting-IP": "203.0.113.1",
        "X-Visitor-Pass": CANARY,
        Authorization: `Bearer ${CANARY}`
      });
      if (origin) headers.set("Origin", origin);
      const response = await worker.fetch(new Request(`https://cherry-api.example${path}?secret=${CANARY}`, {
        method,
        headers
      }), {
        ALLOWED_ORIGINS: `${ORIGIN},https://custom.example`,
        BLOCKED_IPS: "203.0.113.1",
        DB: { prepare() { throw new Error(`https://sctapi.ftqq.com/${CANARY}.send`); } }
      });
      assert.equal(response.status, 500);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), expectedOrigin);
      assert.equal(response.headers.get("Vary"), expectedOrigin ? "Origin" : null);
      assert.deepEqual(await response.json(), { error: "服务暂时不可用" });
      assert.deepEqual(logs, [["Worker request failed", {
        method: method === CANARY ? "other" : method,
        path: path.includes(CANARY) ? "other" : path
      }]]);
    });
  }
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

test("windows visit recording attempts into fixed windows", () => {
  assert.deepEqual(visitRateWindow({}, 599), {
    windowSeconds: 600,
    maxAttempts: 12,
    windowStart: 0
  });
  assert.deepEqual(visitRateWindow({}, 600), {
    windowSeconds: 600,
    maxAttempts: 12,
    windowStart: 600
  });
  assert.equal(visitRateWindow({ VISIT_RATE_MAX_ATTEMPTS: "999" }, 0).maxAttempts, 100);
  assert.equal(visitRateWindow({ VISIT_RATE_WINDOW_SECONDS: "1" }, 0).windowSeconds, 60);
});

test("SQLite rate limiting rejects without writes or visits queries and resets at rollover", async (t) => {
  let now = 600_001;
  t.mock.method(Date, "now", () => now * 1000);
  const { env, sqlite, queries } = sqliteVisitEnv(t, {
    VISIT_RATE_MAX_ATTEMPTS: "2",
    VISIT_RATE_WINDOW_SECONDS: "120"
  });
  const rate = () => ({ ...sqlite.prepare("SELECT * FROM visit_rate_limits").get() });
  const changes = () => sqlite.prepare("SELECT total_changes() AS total").get().total;

  assert.equal((await worker.fetch(visitRequest(), env)).status, 201);
  assert.equal(rate().count, 1);
  assert.match(rate().ip_hash, /^[a-f0-9]{64}$/);
  now += 1;
  assert.equal((await worker.fetch(visitRequest(), env)).status, 200);
  const fullRate = rate();
  assert.equal(fullRate.count, 2);
  assert.equal(fullRate.updated_at, now);

  for (const [time, retryAfter] of [[600_005, "115"], [600_119, "1"]]) {
    now = time;
    const before = changes();
    const queryCount = queries.length;
    const response = await worker.fetch(visitRequest(), env);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("Retry-After"), retryAfter);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
    assert.equal(queries.length, queryCount + 1, "rejection only executes the atomic limiter statement");
    assert.match(queries.at(-1), /^INSERT INTO visit_rate_limits/);
    assert.equal(changes(), before, "rejection must not write any rows");
    assert.deepEqual(rate(), fullRate, "rejection must not update count or updated_at");
  }

  now = 600_120;
  const rollover = await worker.fetch(visitRequest(), env);
  assert.equal(rollover.status, 200);
  assert.deepEqual(await rollover.json(), { recorded: true, updated: true });
  assert.deepEqual(rate(), { ...fullRate, count: 1, window_start: now, updated_at: now });
  assert.equal((await worker.fetch(visitRequest(), env)).status, 200);
  const fullWindow = await worker.fetch(visitRequest(), env);
  assert.equal(fullWindow.status, 429);
  assert.equal(fullWindow.headers.get("Retry-After"), "120");

  const otherIp = await worker.fetch(visitRequest(undefined, { "CF-Connecting-IP": "203.0.113.2" }), env);
  assert.equal(otherIp.status, 201, "a first-time IP has its own allowance");
  assert.deepEqual(sqlite.prepare("SELECT count FROM visit_rate_limits ORDER BY count").all().map((row) => row.count), [1, 2]);
  assert.ok(queries.filter((sql) => sql.includes("visit_rate_limits")).every((sql) =>
    /^INSERT INTO visit_rate_limits/.test(sql) && sql.includes("ON CONFLICT") && sql.includes("RETURNING")));
  assert.ok(queries.every((sql) => !sql.includes("DELETE FROM visits WHERE visited_at")), "cleanup remains scheduled only");
});

test("delayed attempts cannot roll a newer rate window backwards", async (t) => {
  let now = 600_601;
  t.mock.method(Date, "now", () => now * 1000);
  const { env, sqlite } = sqliteVisitEnv(t);
  assert.equal((await worker.fetch(visitRequest(), env)).status, 201);
  const before = sqlite.prepare("SELECT * FROM visit_rate_limits").get();
  now = 600_599;
  assert.equal((await worker.fetch(visitRequest(), env)).status, 429);
  assert.deepEqual(sqlite.prepare("SELECT * FROM visit_rate_limits").get(), before);
});

test("real SQLite admits only the default allowance under parallel visit requests", async (t) => {
  for (const [name, initialAttempts, rollover, admitted] of [
    ["first-time IP", 0, false, 12],
    ["existing IP near limit", 10, false, 2],
    ["expired full window", 12, true, 12]
  ]) {
    await t.test(name, async (t) => {
      let now = 600_001;
      t.mock.method(Date, "now", () => now * 1000);
      const { env, sqlite, queries } = sqliteVisitEnv(t);
      for (let i = 0; i < initialAttempts; i += 1) {
        assert.ok((await worker.fetch(visitRequest(), env)).ok);
      }
      if (rollover) now = 600_600;
      const queryCount = queries.length;
      const responses = await Promise.all(Array.from({ length: 40 }, () => worker.fetch(visitRequest(), env)));
      assert.equal(responses.filter((response) => response.ok).length, admitted);
      assert.equal(responses.filter((response) => response.status === 429).length, 40 - admitted);
      const rateRows = sqlite.prepare("SELECT count, window_start, updated_at FROM visit_rate_limits").all();
      assert.equal(rateRows.length, 1, "concurrent first-time requests share one limiter row");
      assert.deepEqual({ ...rateRows[0] }, {
        count: 12,
        window_start: rollover ? 600_600 : 600_000,
        updated_at: now
      });
      const concurrentQueries = queries.slice(queryCount);
      assert.equal(concurrentQueries.filter((sql) => sql.includes("visit_rate_limits")).length, 40);
      assert.equal(concurrentQueries.filter((sql) => /SELECT[\s\S]*FROM visits\b/.test(sql)).length, admitted,
        "only admitted attempts may query visits");
      for (const response of responses.filter((response) => response.status === 429)) {
        assert.equal(response.headers.get("Retry-After"), rollover ? "600" : "599");
      }
    });
  }
});

test("rejects non-JSON and prefix-lookalike MIME types before accessing D1", async (t) => {
  const env = unusedVisitEnv(t);
  for (const type of [null, "text/plain", "application/jsonp", "application/json-patch+json", "application/jsonx; charset=utf-8", "application/json, text/plain"]) {
    const request = visitRequest(undefined, { "Content-Type": type || "" });
    if (type === null) request.headers.delete("Content-Type");
    const response = await worker.fetch(request, env);
    assert.equal(response.status, 415, type || "missing MIME type");
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
    assert.equal(request.bodyUsed, false);
  }
});

test("rejects malformed JSON, invalid shapes and invalid paths without D1", async (t) => {
  const env = unusedVisitEnv(t);
  for (const body of [
    null, "", "{", '{"path":"/",}', "null", "[]", "true", "42", '"/friends/"', "{}",
    ...[null, 42, [], "", "//example.com/", "https://example.com/", "/bad\u0000path", "/" + "x".repeat(300)]
      .map((path) => JSON.stringify({ path }))
  ]) {
    const response = await worker.fetch(visitRequest(body), env);
    assert.equal(response.status, 400, String(body));
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  }
  assert.equal((await worker.fetch(visitRequest(undefined, { "CF-Connecting-IP": "" }), env)).status, 400);
});

test("limits actual bytes with absent, misleading or invalid Content-Length", async (t) => {
  const env = unusedVisitEnv(t);
  for (const contentLength of [null, "1", "4096", "not-a-number"]) {
    const headers = contentLength === null ? {} : { "Content-Length": contentLength };
    const response = await worker.fetch(visitRequest(JSON.stringify({ path: "/", extra: "x".repeat(4096) }), headers), env);
    assert.equal(response.status, 413);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  }
  const unicodeBody = JSON.stringify({ path: "/", extra: "界".repeat(1400) });
  assert.ok(unicodeBody.length < 4096);
  assert.ok(new TextEncoder().encode(unicodeBody).byteLength > 4096);
  assert.equal((await worker.fetch(visitRequest(unicodeBody), env)).status, 413);
});

test("stops oversized streams at the byte limit even if cancellation fails", async (t) => {
  const logs = captureLogs(t);
  const env = unusedVisitEnv(t);
  const bytes = new TextEncoder().encode(JSON.stringify({ path: "/friends/" }).padEnd(4097, " "));
  const chunks = [bytes.subarray(0, 1000), bytes.subarray(1000, 4096), bytes.subarray(4096)];
  let pulls = 0;
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      controller.enqueue(chunks[pulls++] || new Uint8Array(1000));
    },
    cancel() {
      cancelled = true;
      return Promise.reject(new Error(CANARY));
    }
  }, { highWaterMark: 0 });
  const request = visitRequest(stream, { "Content-Length": "1" });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 413);
  assert.equal(pulls, 3, "must not drain the remaining stream");
  assert.equal(cancelled, true);
  assert.equal(request.body.locked, false);
  assert.deepEqual(logs, []);
});

test("body stream failures and invalid UTF-8 return 400 without D1 or raw logs", async (t) => {
  const logs = captureLogs(t);
  const env = unusedVisitEnv(t);
  let pulls = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (pulls++ === 0) controller.enqueue(new TextEncoder().encode('{"path":"/'));
      else controller.error(new Error(CANARY));
    }
  }, { highWaterMark: 0 });
  const request = visitRequest(stream);
  assert.equal((await worker.fetch(request, env)).status, 400);
  assert.equal(request.body.locked, false);
  const invalidUtf8 = new Uint8Array([...new TextEncoder().encode('{"path":"/'), 0xff, ...new TextEncoder().encode('"}')]);
  assert.equal((await worker.fetch(visitRequest(invalidUtf8), env)).status, 400);
  assert.deepEqual(logs, []);
});

test("accepts JSON MIME parameters and 300-character Unicode paths across byte chunks", async (t) => {
  const { env, sqlite } = sqliteVisitEnv(t);
  const path = "/" + "界".repeat(299);
  const bytes = new TextEncoder().encode(JSON.stringify({ path }));
  assert.ok(bytes.length > 512);
  let offset = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (offset === bytes.length) controller.close();
      else controller.enqueue(bytes.subarray(offset, ++offset));
    }
  });
  const response = await worker.fetch(visitRequest(stream, { "Content-Type": "Application/JSON ; charset=utf-8" }), env);
  assert.equal(response.status, 201);
  assert.equal(sqlite.prepare("SELECT page_path FROM visits").get().page_path, path);
});

test("accepts exactly 4096 actual bytes regardless of claimed Content-Length", async (t) => {
  const { env } = sqliteVisitEnv(t);
  const body = JSON.stringify({ path: "/friends/" }).padEnd(4096, " ");
  for (const contentLength of [null, "1", "4096", "9000"]) {
    const headers = contentLength === null ? {} : { "Content-Length": contentLength };
    assert.ok((await worker.fetch(visitRequest(body, headers), env)).ok);
  }
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

function scheduledResults(env) {
  const pending = [];
  worker.scheduled({}, env, { waitUntil(promise) { pending.push(promise); } });
  assert.equal(pending.length, 2);
  return Promise.allSettled(pending);
}

test("scheduled failures log static context and reject with sanitized errors", async (t) => {
  for (const [name, failCleanup, failAlerts] of [
    ["cleanup", true, false],
    ["alert checks", false, true],
    ["both tasks", true, true]
  ]) {
    await t.test(name, async (t) => {
      const logs = captureLogs(t);
      const fetch = t.mock.method(globalThis, "fetch", async () => assert.fail("must not send an alert"));
      const rawError = new Error(`https://sctapi.ftqq.com/${CANARY}.send /private/path 203.0.113.1`);
      const results = await scheduledResults({
        SERVERCHAN_KEY: CANARY,
        DB: {
          prepare() {
            return {
              bind() { return this; },
              async first() {
                if (failAlerts) throw rawError;
                return { total: 0, ips: 0 };
              }
            };
          },
          async batch() {
            if (failCleanup) throw rawError;
            return [];
          }
        }
      });
      const expectedLogs = [];
      for (const [index, failed, message] of [
        [0, failCleanup, "Visit cleanup failed"],
        [1, failAlerts, "Alert check failed"]
      ]) {
        const result = results[index];
        assert.equal(result.status, failed ? "rejected" : "fulfilled");
        if (failed) {
          expectedLogs.push([message]);
          assert.ok(result.reason instanceof Error);
          assert.equal(result.reason.message, message);
          assert.notEqual(result.reason, rawError);
          assert.equal(result.reason.cause, undefined);
          assert.equal(result.reason.stack.includes(CANARY), false);
        }
      }
      assert.deepEqual(logs.sort(), expectedLogs.sort());
      assert.equal(fetch.mock.callCount(), 0);
    });
  }
});

test("successful scheduled cleanup removes only expired rate-limit rows", async (t) => {
  const logs = captureLogs(t);
  const now = 600_000;
  t.mock.method(Date, "now", () => now * 1000);
  const { env, sqlite } = sqliteVisitEnv(t);
  const insert = sqlite.prepare("INSERT INTO visit_rate_limits (ip_hash, window_start, count, updated_at) VALUES (?, ?, 12, ?)");
  insert.run("old", now - 172_801, now - 172_801);
  insert.run("recent", now, now);
  const results = await scheduledResults(env);
  assert.deepEqual(results.map((result) => result.status), ["fulfilled", "fulfilled"]);
  assert.deepEqual(sqlite.prepare("SELECT ip_hash FROM visit_rate_limits").all().map((row) => row.ip_hash), ["recent"]);
  assert.deepEqual(logs, []);
});

test("alert delivery logs no secrets and retains existing HTTP success behavior", async (t) => {
  for (const outcome of ["throws", "non-ok", "ok"]) {
    await t.test(outcome, async (t) => {
      const logs = captureLogs(t);
      const now = 600_000;
      t.mock.method(Date, "now", () => now * 1000);
      const { env, sqlite } = sqliteVisitEnv(t, { SERVERCHAN_KEY: CANARY });
      sqlite.prepare("INSERT INTO verify_attempts (ip_hash, window_start, count) VALUES (?, ?, 15)")
        .run("test-ip-hash", now);
      const fetch = t.mock.method(globalThis, "fetch", async (url, options) => {
        assert.equal(url, `https://sctapi.ftqq.com/${CANARY}.send`);
        assert.equal(options.method, "POST");
        if (outcome === "throws") throw new Error(`Failed to fetch ${url}`);
        return new Response("{}", { status: outcome === "ok" ? 200 : 503 });
      });
      const results = await scheduledResults(env);
      assert.deepEqual(results.map((result) => result.status), ["fulfilled", "fulfilled"]);
      assert.equal(fetch.mock.callCount(), 1);
      assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM alerts").get().total, outcome === "ok" ? 1 : 0);
      assert.deepEqual(logs, outcome === "ok" ? [] : [["Alert delivery failed"]]);
    });
  }
});
