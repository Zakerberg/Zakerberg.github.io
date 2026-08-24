const DEFAULT_ALLOWED_ORIGINS = ["https://zakerberg.github.io"];
const PAGE_SIZE = 10;
const MAX_PAGE = 5;
const DEDUPE_SECONDS = 60;
const MAX_VISITS_PER_MINUTE = 10;

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

const BOT_PATTERN = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headless|preview/i;

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

  try {
    return new Intl.DisplayNames(["zh-CN"], { type: "region" }).of(countryCode) || countryCode;
  } catch (_error) {
    return countryCode;
  }
}

export function formatLocation(countryCode, rawRegion) {
  const code = String(countryCode || "XX").toUpperCase();
  const country = countryName(code);
  const regionValue = String(rawRegion || "").trim();
  const region = code === "CN" ? CHINA_REGIONS[regionValue] || regionValue : regionValue;

  if (!region || country.includes(region)) return { country, region: "", location: country };
  return { country, region, location: `${country} · ${region}` };
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

async function cleanupVisits(env, now) {
  const retentionDays = numericSetting(env.RETENTION_DAYS, 7, 1, 30);
  const maxVisits = numericSetting(env.MAX_VISITS, 50, 10, 500);
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

  const now = Math.floor(Date.now() / 1000);
  const ipHash = await hashIp(ip, env.IP_HASH_SECRET);
  const duplicate = await env.DB.prepare(
    "SELECT id FROM visits WHERE ip_hash = ? AND page_path = ? AND visited_at >= ? LIMIT 1"
  )
    .bind(ipHash, pagePath, now - DEDUPE_SECONDS)
    .first();

  if (duplicate) {
    return json({ recorded: false, reason: "duplicate" }, 200, origin);
  }

  const recentCount = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM visits WHERE ip_hash = ? AND visited_at >= ?"
  )
    .bind(ipHash, now - DEDUPE_SECONDS)
    .first();

  if (Number(recentCount?.total || 0) >= MAX_VISITS_PER_MINUTE) {
    return json({ recorded: false, reason: "rate-limited" }, 200, origin);
  }

  const location = formatLocation(request.cf?.country, request.cf?.region);
  await env.DB.prepare(
    `INSERT INTO visits
      (ip_masked, ip_hash, country, region, location, page_path, visited_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(maskIp(ip), ipHash, location.country, location.region, location.location, pagePath, now)
    .run();

  await cleanupVisits(env, now);
  return json({ recorded: true }, 201, origin);
}

async function listVisits(url, env, origin) {
  const requestedPage = numericSetting(url.searchParams.get("page"), 1, 1, MAX_PAGE);
  const retentionDays = numericSetting(env.RETENTION_DAYS, 7, 1, 30);
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 24 * 60 * 60;
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM visits WHERE visited_at >= ?")
    .bind(cutoff)
    .first();
  const total = Math.min(Number(count?.total || 0), numericSetting(env.MAX_VISITS, 50, 10, 500));
  const totalPages = Math.max(1, Math.min(MAX_PAGE, Math.ceil(total / PAGE_SIZE)));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * PAGE_SIZE;
  const result = await env.DB.prepare(
    `SELECT id, ip_masked, location, visited_at
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
