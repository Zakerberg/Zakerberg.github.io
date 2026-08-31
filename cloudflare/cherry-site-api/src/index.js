const DEFAULT_ALLOWED_ORIGINS = ["https://zakerberg.github.io"];
const PAGE_SIZE = 10;
const MAX_PAGE = 20;
const DEDUPE_WINDOW_SECONDS = 6 * 60 * 60;
const MIN_UPDATE_INTERVAL_SECONDS = 60;

const CHINA_REGIONS = {
  Anhui: "安徽",
  Beijing: "北京",
  Chongqing: "重庆",
  Fujian: "福建",
  Gansu: "甘肃",
  Guangdong: "广东",
  Guangxi: "广西",
  Guizhou: "贵州",
  Hainan: "海南",
  Hebei: "河北",
  Heilongjiang: "黑龙江",
  Henan: "河南",
  "Hong Kong": "香港",
  Hubei: "湖北",
  Hunan: "湖南",
  "Inner Mongolia": "内蒙古",
  Jiangsu: "江苏",
  Jiangxi: "江西",
  Jilin: "吉林",
  Liaoning: "辽宁",
  Macao: "澳门",
  Ningxia: "宁夏",
  Qinghai: "青海",
  Shaanxi: "陕西",
  Shandong: "山东",
  Shanghai: "上海",
  Shanxi: "山西",
  Sichuan: "四川",
  Tianjin: "天津",
  Tibet: "西藏",
  Xinjiang: "新疆",
  Yunnan: "云南",
  Zhejiang: "浙江"
};

const COUNTRY_NAMES = {
  HK: "中国香港",
  MO: "中国澳门",
  TW: "中国台湾"
};

const CITY_NAMES = {
  Amsterdam: "阿姆斯特丹",
  "Baden-Wurttemberg": "巴登-符腾堡",
  Bavaria: "巴伐利亚",
  Beijing: "北京",
  Berlin: "柏林",
  Chengdu: "成都",
  Chongqing: "重庆",
  Dusseldorf: "杜塞尔多夫",
  Frankfurt: "法兰克福",
  "Frankfurt am Main": "法兰克福",
  Guangzhou: "广州",
  Hamburg: "汉堡",
  Hangzhou: "杭州",
  Helsinki: "赫尔辛基",
  "Hong Kong": "香港",
  London: "伦敦",
  "Los Angeles": "洛杉矶",
  Madrid: "马德里",
  Melbourne: "墨尔本",
  Munich: "慕尼黑",
  Nanjing: "南京",
  "New York": "纽约",
  Osaka: "大阪",
  Paris: "巴黎",
  Seoul: "首尔",
  Shanghai: "上海",
  Shenzhen: "深圳",
  Singapore: "新加坡",
  Stockholm: "斯德哥尔摩",
  Sydney: "悉尼",
  Taipei: "台北",
  Tokyo: "东京",
  Toronto: "多伦多",
  Vancouver: "温哥华",
  Vienna: "维也纳",
  Wuhan: "武汉",
  "Xi'an": "西安",
  Xian: "西安"
};

const BOT_PATTERN = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headless|preview/i;
const VPN_OR_PROXY_PATTERN = /\b(vpn|proxy|tor exit|anonymi[sz]er|mullvad|nordvpn|expressvpn|surfshark|proton vpn|windscribe|private internet access|cyberghost|hotspot shield|tunnelbear|ivacy|astrill|strongvpn)\b/i;
const DATA_CENTER_PATTERN = /\b(amazon|aws|google cloud|microsoft azure|digitalocean|linode|akamai connected cloud|vultr|choopa|ovh|hetzner|leaseweb|m247|datacamp|contabo|scaleway|rackspace|oracle cloud|alibaba cloud|tencent cloud|aceville|server|hosting|datacenter|data center|colo(?:cation)?)\b/i;

function json(data, status = 200, origin = null) {
  const headers = new Headers({
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }

  return new Response(JSON.stringify(data), { status, headers });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;

  const configured = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const origins = configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
  return origins.includes(origin) ? origin : "";
}

function optionsResponse(origin) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Max-Age": "86400",
      Vary: "Origin"
    }
  });
}

export function maskIp(ip) {
  if (!ip || typeof ip !== "string") return "未知";

  const value = ip.trim();
  const ipv4 = value.split(".");
  if (ipv4.length === 4 && ipv4.every((part) => /^\d{1,3}$/.test(part))) {
    return `${ipv4[0]}.***.***.${ipv4[3]}`;
  }

  if (value.includes(":")) {
    const firstGroup = value.split(":").find(Boolean) || "****";
    return `${firstGroup}:****:****:****`;
  }

  return "未知";
}

export function sanitizePath(path) {
  if (typeof path !== "string") return null;

  const value = path.trim().split(/[?#]/, 1)[0];
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.length > 300 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

function countryName(countryCode) {
  if (!countryCode || countryCode === "XX") return "未知地区";
  if (COUNTRY_NAMES[countryCode]) return COUNTRY_NAMES[countryCode];

  try {
    return new Intl.DisplayNames(["zh-CN"], { type: "region" }).of(countryCode) || countryCode;
  } catch (_error) {
    return countryCode;
  }
}

function translatedPlace(value) {
  const name = String(value || "").trim();
  return CITY_NAMES[name] || name;
}

export function formatLocation(countryCode, rawRegion, rawCity, rawPostalCode = "") {
  const code = String(countryCode || "XX").toUpperCase();
  const country = countryName(code);
  const regionValue = String(rawRegion || "").trim();
  const region = code === "CN" ? CHINA_REGIONS[regionValue] || translatedPlace(regionValue) : translatedPlace(regionValue);
  const city = translatedPlace(rawCity);
  const postalCode = String(rawPostalCode || "").trim().slice(0, 16);

  if (code === "HK" || code === "MO") {
    const details = postalCode ? [`邮编 ${postalCode}`] : [];
    return { country, region: "", location: [country, ...details].join(" · ") };
  }

  const candidates = [region, city];
  const details = candidates.filter((value, index, values) => {
    return value && !country.includes(value) && values.indexOf(value) === index;
  });
  if (postalCode) details.push(`邮编 ${postalCode}`);

  return {
    country,
    region: region && !country.includes(region) ? region : "",
    location: details.length ? `${country} · ${details.join(" · ")}` : country
  };
}

function cleanNetworkName(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 100);
}

export function networkMetadata(asn, asOrganization) {
  const organization = cleanNetworkName(asOrganization);
  const asNumber = Number.parseInt(asn, 10);
  const network = [
    organization,
    Number.isFinite(asNumber) && asNumber > 0 ? `AS${asNumber}` : ""
  ].filter(Boolean).join(" · ");

  if (!organization) return { network, riskLevel: "", riskLabel: "" };

  if (VPN_OR_PROXY_PATTERN.test(organization)) {
    return { network, riskLevel: "high", riskLabel: "疑似代理/VPN" };
  }

  if (DATA_CENTER_PATTERN.test(organization)) {
    return { network, riskLevel: "medium", riskLabel: "疑似代理/VPN" };
  }

  return { network, riskLevel: "", riskLabel: "" };
}

async function hashIp(ip, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function numericSetting(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function configuredList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isBlockedNetwork(ip, asn, env = {}) {
  const blockedIps = configuredList(env.BLOCKED_IPS);
  const blockedAsns = configuredList(env.BLOCKED_ASNS).map((item) => item.replace(/^AS/i, ""));
  const normalizedAsn = Number.parseInt(asn, 10);
  return blockedIps.includes(String(ip || "").trim())
    || (Number.isFinite(normalizedAsn) && blockedAsns.includes(String(normalizedAsn)));
}

export function visitAction(lastVisitedAt, now) {
  if (!Number.isFinite(lastVisitedAt)) return "insert";

  const age = Math.max(0, now - lastVisitedAt);
  if (age < MIN_UPDATE_INTERVAL_SECONDS) return "ignore";
  if (age <= DEDUPE_WINDOW_SECONDS) return "update";
  return "insert";
}

async function cleanupVisits(env, now) {
  const retentionDays = numericSetting(env.RETENTION_DAYS, 7, 1, 30);
  const maxVisits = numericSetting(env.MAX_VISITS, 200, 10, 500);
  const cutoff = now - retentionDays * 24 * 60 * 60;

  await env.DB.batch([
    env.DB.prepare("DELETE FROM visits WHERE visited_at < ?").bind(cutoff),
    env.DB.prepare(
      "DELETE FROM visits WHERE id NOT IN (SELECT id FROM visits ORDER BY visited_at DESC, id DESC LIMIT ?)"
    ).bind(maxVisits)
  ]);
}

async function recordVisit(request, env, origin) {
  if (!env.IP_HASH_SECRET) {
    return json({ error: "服务配置未完成" }, 503, origin);
  }

  const userAgent = request.headers.get("User-Agent") || "";
  if (BOT_PATTERN.test(userAgent)) {
    return json({ recorded: false, reason: "automated-client" }, 200, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch (_error) {
    return json({ error: "请求内容不是有效 JSON" }, 400, origin);
  }

  const pagePath = sanitizePath(body.path);
  if (!pagePath) return json({ error: "页面路径无效" }, 400, origin);

  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return json({ error: "无法识别访问来源" }, 400, origin);

  if (isBlockedNetwork(ip, request.cf?.asn, env)) {
    return json({ recorded: false, blocked: true }, 403, origin);
  }

  const now = Math.floor(Date.now() / 1000);
  const ipHash = await hashIp(ip, env.IP_HASH_SECRET);
  const duplicate = await env.DB.prepare(
    `SELECT id, visited_at
       FROM visits
      WHERE ip_hash = ? AND visited_at >= ?
      ORDER BY visited_at DESC, id DESC
      LIMIT 1`
  )
    .bind(ipHash, now - DEDUPE_WINDOW_SECONDS)
    .first();

  const action = visitAction(Number(duplicate?.visited_at), now);
  if (action === "ignore") {
    return json({ recorded: false, updated: false, reason: "duplicate" }, 200, origin);
  }

  const location = formatLocation(
    request.cf?.country,
    request.cf?.region,
    request.cf?.city,
    request.cf?.postalCode
  );
  const network = networkMetadata(request.cf?.asn, request.cf?.asOrganization);
  const asnValue = Number.parseInt(request.cf?.asn, 10);
  const asn = Number.isFinite(asnValue) && asnValue > 0 ? asnValue : 0;
  const maskedIp = maskIp(ip);

  if (action === "update") {
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE visits
            SET ip_masked = ?, country = ?, region = ?, location = ?, network = ?, asn = ?,
                risk_level = ?, risk_label = ?, page_path = ?, visited_at = ?
          WHERE id = ?`
      ).bind(
        maskedIp,
        location.country,
        location.region,
        location.location,
        network.network,
        asn,
        network.riskLevel,
        network.riskLabel,
        pagePath,
        now,
        duplicate.id
      ),
      env.DB.prepare(
        "DELETE FROM visits WHERE ip_hash = ? AND id <> ? AND visited_at >= ?"
      ).bind(ipHash, duplicate.id, now - DEDUPE_WINDOW_SECONDS)
    ]);

    return json({ recorded: true, updated: true }, 200, origin);
  }

  const inserted = await env.DB.prepare(
    `INSERT INTO visits
      (ip_masked, ip_hash, country, region, location, network, asn, risk_level, risk_label, page_path, visited_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      maskedIp,
      ipHash,
      location.country,
      location.region,
      location.location,
      network.network,
      asn,
      network.riskLevel,
      network.riskLabel,
      pagePath,
      now
    )
    .run();

  const insertedId = Number(inserted.meta?.last_row_id);
  if (Number.isFinite(insertedId)) {
    await env.DB.prepare(
      "DELETE FROM visits WHERE ip_hash = ? AND id <> ? AND visited_at >= ?"
    )
      .bind(ipHash, insertedId, now - DEDUPE_WINDOW_SECONDS)
      .run();
  }

  await cleanupVisits(env, now);
  return json({ recorded: true, updated: false }, 201, origin);
}

async function listVisits(url, env, origin) {
  const requestedPage = numericSetting(url.searchParams.get("page"), 1, 1, MAX_PAGE);
  const retentionDays = numericSetting(env.RETENTION_DAYS, 7, 1, 30);
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 24 * 60 * 60;
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM visits WHERE visited_at >= ?")
    .bind(cutoff)
    .first();
  const total = Math.min(Number(count?.total || 0), numericSetting(env.MAX_VISITS, 200, 10, 500));
  const totalPages = Math.max(1, Math.min(MAX_PAGE, Math.ceil(total / PAGE_SIZE)));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * PAGE_SIZE;
  const result = await env.DB.prepare(
    `SELECT id, ip_masked, location, network, risk_level, risk_label, visited_at
       FROM visits
      WHERE visited_at >= ?
      ORDER BY visited_at DESC, id DESC
      LIMIT ? OFFSET ?`
  )
    .bind(cutoff, PAGE_SIZE, offset)
    .all();

  const items = (result.results || []).map((item) => ({
    id: item.id,
    ip: item.ip_masked,
    location: item.location,
    network: item.network,
    riskLevel: item.risk_level,
    riskLabel: item.risk_label,
    visitedAt: item.visited_at
  }));

  return json(
    {
      items,
      pagination: { page, perPage: PAGE_SIZE, total, totalPages }
    },
    200,
    origin
  );
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const origin = allowedOrigin(request, env);

  if (request.method === "OPTIONS") {
    return origin ? optionsResponse(origin) : json({ error: "来源不被允许" }, 403);
  }

  if (isBlockedNetwork(request.headers.get("CF-Connecting-IP"), request.cf?.asn, env)) {
    return json({ error: "访问来源已被限制" }, 403, origin || null);
  }

  if (url.pathname === "/health" && request.method === "GET") {
    const database = await env.DB.prepare("SELECT 1 AS ok").first();
    return json({ ok: database?.ok === 1 }, 200, origin || null);
  }

  if (!origin) return json({ error: "来源不被允许" }, 403);

  if (url.pathname === "/api/visit" && request.method === "POST") {
    return recordVisit(request, env, origin);
  }

  if (url.pathname === "/api/visits" && request.method === "GET") {
    return listVisits(url, env, origin);
  }

  return json({ error: "接口不存在" }, 404, origin);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env).catch(() => json({ error: "服务暂时不可用" }, 500));
  },

  scheduled(_controller, env, ctx) {
    ctx.waitUntil(cleanupVisits(env, Math.floor(Date.now() / 1000)));
  }
};
