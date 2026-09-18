const DEFAULT_ALLOWED_ORIGINS = ["https://zakerberg.github.io"];
const PAGE_SIZE = 10;
const MAX_PAGE = 20;
const DEDUPE_WINDOW_SECONDS = 6 * 60 * 60;
const MIN_UPDATE_INTERVAL_SECONDS = 60;
const HUMAN_PASS_TTL_SECONDS = 30 * 60;
const HUMAN_CHECK_PAGE = 6;

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

const US_REGIONS = {
  Alabama: "阿拉巴马州",
  Alaska: "阿拉斯加州",
  Arizona: "亚利桑那州",
  Arkansas: "阿肯色州",
  California: "加利福尼亚州",
  Colorado: "科罗拉多州",
  Connecticut: "康涅狄格州",
  Delaware: "特拉华州",
  "District of Columbia": "哥伦比亚特区",
  Florida: "佛罗里达州",
  Georgia: "佐治亚州",
  Hawaii: "夏威夷州",
  Idaho: "爱达荷州",
  Illinois: "伊利诺伊州",
  Indiana: "印第安纳州",
  Iowa: "艾奥瓦州",
  Kansas: "堪萨斯州",
  Kentucky: "肯塔基州",
  Louisiana: "路易斯安那州",
  Maine: "缅因州",
  Maryland: "马里兰州",
  Massachusetts: "马萨诸塞州",
  Michigan: "密歇根州",
  Minnesota: "明尼苏达州",
  Mississippi: "密西西比州",
  Missouri: "密苏里州",
  Montana: "蒙大拿州",
  Nebraska: "内布拉斯加州",
  Nevada: "内华达州",
  "New Hampshire": "新罕布什尔州",
  "New Jersey": "新泽西州",
  "New Mexico": "新墨西哥州",
  "New York": "纽约州",
  "North Carolina": "北卡罗来纳州",
  "North Dakota": "北达科他州",
  Ohio: "俄亥俄州",
  Oklahoma: "俄克拉荷马州",
  Oregon: "俄勒冈州",
  Pennsylvania: "宾夕法尼亚州",
  "Rhode Island": "罗得岛州",
  "South Carolina": "南卡罗来纳州",
  "South Dakota": "南达科他州",
  Tennessee: "田纳西州",
  Texas: "得克萨斯州",
  Utah: "犹他州",
  Vermont: "佛蒙特州",
  Virginia: "弗吉尼亚州",
  Washington: "华盛顿州",
  "West Virginia": "西弗吉尼亚州",
  Wisconsin: "威斯康星州",
  Wyoming: "怀俄明州"
};

const COUNTRY_NAMES = {
  HK: "中国香港",
  MO: "中国澳门",
  TW: "中国台湾"
};

const CITY_NAMES = {
  Amsterdam: "阿姆斯特丹",
  Astrakhan: "阿斯特拉罕",
  "Astrakhan Oblast": "阿斯特拉罕州",
  "Baden-Wurttemberg": "巴登-符腾堡",
  Bavaria: "巴伐利亚",
  Beijing: "北京",
  Berlin: "柏林",
  Chengdu: "成都",
  Chicago: "芝加哥",
  Chongqing: "重庆",
  "Council Bluffs": "康瑟尔布拉夫斯",
  Dallas: "达拉斯",
  Dhaka: "达卡",
  "Dhaka Division": "达卡专区",
  Dusseldorf: "杜塞尔多夫",
  Frankfurt: "法兰克福",
  "Frankfurt am Main": "法兰克福",
  Guangzhou: "广州",
  Guayaquil: "瓜亚基尔",
  Guayas: "瓜亚斯省",
  Hamburg: "汉堡",
  Hangzhou: "杭州",
  Helsinki: "赫尔辛基",
  "Hong Kong": "香港",
  Lancaster: "兰卡斯特",
  London: "伦敦",
  "Los Angeles": "洛杉矶",
  Madrid: "马德里",
  Melbourne: "墨尔本",
  "Mexico City": "墨西哥城",
  Munich: "慕尼黑",
  Nanjing: "南京",
  "New York": "纽约",
  Osaka: "大阪",
  Paris: "巴黎",
  Ploiesti: "普洛耶什蒂",
  "Ploieşti": "普洛耶什蒂",
  "Ploiești": "普洛耶什蒂",
  Prahova: "普拉霍瓦县",
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

function turnstileEnabled(env) {
  return String(env.TURNSTILE_ENABLED || "false").toLowerCase() === "true"
    && Boolean(env.TURNSTILE_SECRET_KEY);
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
      "Access-Control-Allow-Headers":
        "Content-Type, X-Visitor-Page-Count, X-Visitor-Page-Interval, X-Visitor-Pass",
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

function translatedPlace(value, countryCode = "", isRegion = false) {
  const name = String(value || "").trim();
  const regions = countryCode === "CN" ? CHINA_REGIONS : countryCode === "US" ? US_REGIONS : {};
  const translation = (isRegion && regions[name]) || CITY_NAMES[name];
  return typeof translation === "string" ? translation : name;
}

export function translateLocation(value) {
  const [country, ...details] = String(value || "").split(" · ");
  const code = country === "中国" ? "CN" : country === "美国" ? "US" : "";
  return [country, ...details.map((name, index) => {
    const translation = translatedPlace(name, code, index === 0);
    return code === "CN" || translation === name ? translation : `${name}（${translation}）`;
  })].join(" · ");
}

export function formatLocation(countryCode, rawRegion, rawCity, rawPostalCode = "") {
  const code = String(countryCode || "XX").toUpperCase();
  const country = countryName(code);
  const regionValue = String(rawRegion || "").trim();
  const cityValue = String(rawCity || "").trim();
  const region = translatedPlace(regionValue, code, true);
  const city = translatedPlace(cityValue, code);
  const postalCode = String(rawPostalCode || "").trim().slice(0, 16);

  if (code === "HK" || code === "MO") {
    const details = postalCode ? [`邮编 ${postalCode}`] : [];
    return { country, region: "", location: [country, ...details].join(" · ") };
  }

  const candidates = [
    { original: regionValue, translation: region },
    { original: cityValue, translation: city }
  ];
  const details = candidates.filter((place, index, places) => {
    return place.original && !country.includes(place.translation)
      && places.findIndex((other) => other.translation === place.translation) === index;
  }).map(({ original, translation }) => {
    return code === "CN" || translation === original ? translation : `${original}（${translation}）`;
  });
  if (postalCode) details.push(`邮编 ${postalCode}`);

  return {
    country,
    region: region && !country.includes(region) ? region : "",
    location: [country, ...details].join(" · ")
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

async function signValue(value, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomTokenPart() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function issueHumanPass(ip, env, now) {
  const expiresAt = now + HUMAN_PASS_TTL_SECONDS;
  const nonce = randomTokenPart();
  const ipHash = await hashIp(ip, env.IP_HASH_SECRET);
  const signature = await signValue(`${expiresAt}.${nonce}|${ipHash}`, env.IP_HASH_SECRET);
  return `${expiresAt}.${nonce}.${signature}`;
}

async function isValidHumanPass(token, ip, env, now) {
  if (!token || !env.IP_HASH_SECRET) return false;

  const parts = String(token).split(".");
  if (parts.length !== 3) return false;

  const expiresAt = Number.parseInt(parts[0], 10);
  if (!Number.isFinite(expiresAt) || expiresAt < now || !/^[a-f0-9]{32}$/.test(parts[1])) {
    return false;
  }

  const ipHash = await hashIp(ip, env.IP_HASH_SECRET);
  const expected = await signValue(`${expiresAt}.${parts[1]}|${ipHash}`, env.IP_HASH_SECRET);
  return parts[2] === expected;
}

async function validateTurnstile(token, env) {
  if (!turnstileEnabled(env) || typeof token !== "string" || token.length > 2048) {
    return false;
  }

  const form = new URLSearchParams();
  form.set("secret", env.TURNSTILE_SECRET_KEY);
  form.set("response", token);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
  if (!response.ok) return false;

  const result = await response.json();
  if (!result.success) return false;

  const hostname = String(result.hostname || "");
  const expectedHostnames = configuredList(env.TURNSTILE_HOSTNAME || "zakerberg.github.io");
  return expectedHostnames.includes(hostname);
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

async function recordBlockedRequest(env, ip, asn, network, path, now) {
  const maskedIp = maskIp(ip);
  const recent = await env.DB.prepare(
    "SELECT id FROM blocked_requests WHERE ip_masked = ? AND blocked_at >= ? LIMIT 1"
  )
    .bind(maskedIp, now - 60)
    .first();
  if (recent) return;

  const asnValue = Number.parseInt(asn, 10);
  const asnNumber = Number.isFinite(asnValue) && asnValue > 0 ? asnValue : 0;
  await env.DB.prepare(
    `INSERT INTO blocked_requests (ip_masked, asn, network, path, blocked_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(maskedIp, asnNumber, cleanNetworkName(network), String(path || "/").slice(0, 300), now)
    .run();
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
    ).bind(maxVisits),
    env.DB.prepare("DELETE FROM verify_attempts WHERE window_start < ?").bind(now - 2 * 24 * 60 * 60),
    env.DB.prepare("DELETE FROM blocked_requests WHERE blocked_at < ?").bind(cutoff),
    env.DB.prepare(
      "DELETE FROM blocked_requests WHERE id NOT IN (SELECT id FROM blocked_requests ORDER BY blocked_at DESC, id DESC LIMIT 2000)"
    ),
    env.DB.prepare("DELETE FROM alerts WHERE alerted_at < ?").bind(now - 7 * 24 * 60 * 60)
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

export function verifyAttemptWindow(env = {}, now) {
  const windowSeconds = numericSetting(env.VERIFY_WINDOW_SECONDS, 3600, 300, 86400);
  const maxAttempts = numericSetting(env.VERIFY_MAX_ATTEMPTS, 10, 1, 100);
  return {
    windowSeconds,
    maxAttempts,
    windowStart: Math.floor(now / windowSeconds) * windowSeconds
  };
}

export function verifyAttemptCount(row, windowStart) {
  if (!row) return 0;
  return Number(row.window_start) === windowStart ? Number(row.count || 0) : 0;
}

async function verifyHuman(request, env, origin) {
  if (!turnstileEnabled(env)) {
    return json({ error: "人类检测尚未配置" }, 503, origin);
  }

  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return json({ error: "无法识别访问来源" }, 400, origin);

  if (!env.IP_HASH_SECRET) {
    return json({ error: "服务配置未完成" }, 503, origin);
  }

  const now = Math.floor(Date.now() / 1000);
  const { maxAttempts, windowStart } = verifyAttemptWindow(env, now);
  const ipHash = await hashIp(ip, env.IP_HASH_SECRET);
  const attempt = await env.DB.prepare(
    "SELECT window_start, count FROM verify_attempts WHERE ip_hash = ?"
  )
    .bind(ipHash)
    .first();
  const attempts = verifyAttemptCount(attempt, windowStart);
  if (attempts >= maxAttempts) {
    return json({ error: "验证尝试过于频繁，请稍后再试" }, 429, origin);
  }

  if (!attempt) {
    await env.DB.prepare(
      "INSERT INTO verify_attempts (ip_hash, window_start, count) VALUES (?, ?, 1)"
    )
      .bind(ipHash, windowStart)
      .run();
  } else if (attempts === 0) {
    await env.DB.prepare(
      "UPDATE verify_attempts SET window_start = ?, count = 1 WHERE ip_hash = ?"
    )
      .bind(windowStart, ipHash)
      .run();
  } else {
    await env.DB.prepare(
      "UPDATE verify_attempts SET count = count + 1 WHERE ip_hash = ?"
    )
      .bind(ipHash)
      .run();
  }

  let body;
  try {
    body = await request.json();
  } catch (_error) {
    return json({ error: "请求内容不是有效 JSON" }, 400, origin);
  }

  const valid = await validateTurnstile(body.token, env);
  if (!valid) return json({ verified: false }, 403, origin);

  return json({ verified: true, pass: await issueHumanPass(ip, env, now) }, 200, origin);
}

export function shouldChallengeRequest(activity, env = {}) {
  if (!turnstileEnabled(env)) return false;

  const page = numericSetting(activity.page, 1, 1, MAX_PAGE);
  if (activity.riskLevel) return true;

  if (page < HUMAN_CHECK_PAGE) return false;

  const uniqueIps = Number(activity.uniqueIps || 0);
  const total = Number(activity.total || 0);
  const clientPageCount = numericSetting(activity.clientPageCount, 0, 0, 100);
  const clientInterval = Number.parseInt(activity.clientInterval, 10);
  const fixedFastNavigation = clientPageCount >= HUMAN_CHECK_PAGE
    && Number.isFinite(clientInterval)
    && clientInterval >= 0
    && clientInterval <= 20;

  return (uniqueIps >= 4 && total >= 4) || fixedFastNavigation;
}

async function shouldChallenge(request, url, env, now) {
  if (!turnstileEnabled(env)) return false;

  const metadata = networkMetadata(request.cf?.asn, request.cf?.asOrganization);
  if (metadata.riskLevel) return true;

  const page = numericSetting(url.searchParams.get("page"), 1, 1, MAX_PAGE);
  if (page < HUMAN_CHECK_PAGE) return false;

  const asn = Number.parseInt(request.cf?.asn, 10);
  if (!Number.isFinite(asn) || asn <= 0) return false;

  const networkActivity = await env.DB.prepare(
    `SELECT COUNT(DISTINCT ip_hash) AS unique_ips, COUNT(*) AS total
       FROM visits
      WHERE asn = ? AND visited_at >= ?`
  )
    .bind(asn, now - DEDUPE_WINDOW_SECONDS)
    .first();

  return shouldChallengeRequest({
    page,
    riskLevel: metadata.riskLevel,
    uniqueIps: networkActivity?.unique_ips,
    total: networkActivity?.total,
    clientPageCount: request.headers.get("X-Visitor-Page-Count"),
    clientInterval: request.headers.get("X-Visitor-Page-Interval")
  }, env);
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
    location: translateLocation(item.location),
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

export function alertSettings(env = {}) {
  return {
    trafficMultiplier: numericSetting(env.ALERT_TRAFFIC_MULTIPLIER, 3, 2, 10),
    trafficMinCount: numericSetting(env.ALERT_TRAFFIC_MIN, 20, 5, 500),
    riskRatio: numericSetting(env.ALERT_RISK_RATIO, 40, 10, 90),
    riskMinIps: numericSetting(env.ALERT_RISK_MIN_IPS, 3, 2, 20),
    verifyMaxAttempts: numericSetting(env.ALERT_VERIFY_ATTEMPTS, 15, 5, 200),
    blockedMinCount: numericSetting(env.ALERT_BLOCKED_MIN, 10, 3, 500),
    cooldownSeconds: numericSetting(env.ALERT_COOLDOWN_SECONDS, 7200, 600, 86400)
  };
}

export function detectAlerts(metrics, settings) {
  const alerts = [];
  const hourly = Number(metrics.hourlyVisits || 0);
  const baseline = Number(metrics.baselineHourly || 0);
  const riskVisits = Number(metrics.riskVisits || 0);
  const riskIps = Number(metrics.riskIps || 0);
  const verifyAttempts = Number(metrics.verifyAttempts || 0);
  const blockedCount = Number(metrics.blockedCount || 0);

  if (hourly >= settings.trafficMinCount && hourly > baseline * settings.trafficMultiplier) {
    alerts.push({
      type: "traffic",
      title: "Cherry 网站访问量激增",
      body: `- 近 1 小时访问：${hourly} 次\n- 7 天小时均值：${baseline.toFixed(1)} 次\n- 倍率：${(hourly / Math.max(baseline, 0.01)).toFixed(1)}x`
    });
  }

  if (riskIps >= settings.riskMinIps && hourly > 0
    && (riskVisits / hourly) * 100 >= settings.riskRatio) {
    alerts.push({
      type: "risk",
      title: "Cherry 网站风险访问偏高",
      body: `- 近 1 小时风险访问：${riskVisits} 次（占比 ${((riskVisits / hourly) * 100).toFixed(0)}%）\n- 涉及独立 IP：${riskIps} 个`
    });
  }

  if (verifyAttempts >= settings.verifyMaxAttempts) {
    alerts.push({
      type: "verify",
      title: "Cherry 验证接口高频尝试",
      body: `- 近 1 小时验证尝试：${verifyAttempts} 次\n- 可能存在针对 Turnstile 的暴力测试`
    });
  }

  if (blockedCount >= settings.blockedMinCount) {
    alerts.push({
      type: "blocked",
      title: "Cherry 被阻断请求激增",
      body: `- 近 1 小时被阻断请求：${blockedCount} 次\n- 命中 BLOCKED_ASNS / BLOCKED_IPS 规则`
    });
  }

  return alerts;
}

export function alertInCooldown(row, now, cooldownSeconds) {
  if (!row) return false;
  return now - Number(row.alerted_at) < cooldownSeconds;
}

async function gatherMetrics(env, now) {
  const hourStart = now - 60 * 60;
  const weekStart = now - 7 * 24 * 60 * 60;
  const [hourly, weekly, risk, verify, blocked] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS total FROM visits WHERE visited_at >= ?").bind(hourStart).first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM visits WHERE visited_at >= ?").bind(weekStart).first(),
    env.DB.prepare(
      "SELECT COUNT(*) AS total, COUNT(DISTINCT ip_hash) AS ips FROM visits WHERE visited_at >= ? AND risk_level <> ''"
    ).bind(hourStart).first(),
    env.DB.prepare(
      "SELECT COALESCE(SUM(count), 0) AS total FROM verify_attempts WHERE window_start >= ?"
    ).bind(hourStart).first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM blocked_requests WHERE blocked_at >= ?").bind(hourStart).first()
  ]);

  return {
    hourlyVisits: Number(hourly?.total || 0),
    baselineHourly: Number(weekly?.total || 0) / 168,
    riskVisits: Number(risk?.total || 0),
    riskIps: Number(risk?.ips || 0),
    verifyAttempts: Number(verify?.total || 0),
    blockedCount: Number(blocked?.total || 0)
  };
}

async function pushAlert(env, alert, now) {
  const key = String(env.SERVERCHAN_KEY || "").trim();
  if (!key) return false;

  const time = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(now * 1000));

  const form = new URLSearchParams();
  form.set("title", alert.title);
  form.set("desp", alert.body + `\n\n- 检查时间：${time}`);

  try {
    const response = await fetch(`https://sctapi.ftqq.com/${key}.send`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form
    });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

async function runAlertChecks(env, now) {
  if (!String(env.SERVERCHAN_KEY || "").trim()) return;

  const settings = alertSettings(env);
  const metrics = await gatherMetrics(env, now);
  const alerts = detectAlerts(metrics, settings);

  for (const alert of alerts) {
    const last = await env.DB.prepare(
      "SELECT alerted_at FROM alerts WHERE alert_type = ? ORDER BY alerted_at DESC LIMIT 1"
    )
      .bind(alert.type)
      .first();
    if (alertInCooldown(last, now, settings.cooldownSeconds)) continue;

    const sent = await pushAlert(env, alert, now);
    if (sent) {
      await env.DB.prepare(
        "INSERT INTO alerts (alert_type, alerted_at) VALUES (?, ?)"
      )
        .bind(alert.type, now)
        .run();
    }
  }
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const origin = allowedOrigin(request, env);

  if (request.method === "OPTIONS") {
    return origin ? optionsResponse(origin) : json({ error: "来源不被允许" }, 403);
  }

  if (isBlockedNetwork(request.headers.get("CF-Connecting-IP"), request.cf?.asn, env)) {
    await recordBlockedRequest(
      env,
      request.headers.get("CF-Connecting-IP"),
      request.cf?.asn,
      request.cf?.asOrganization,
      url.pathname,
      Math.floor(Date.now() / 1000)
    );
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

  if (url.pathname === "/api/verify-human" && request.method === "POST") {
    return verifyHuman(request, env, origin);
  }

  if (url.pathname === "/api/visits" && request.method === "GET") {
    const ip = request.headers.get("CF-Connecting-IP");
    if (!ip) return json({ error: "无法识别访问来源" }, 400, origin);

    const pass = request.headers.get("X-Visitor-Pass");
    const now = Math.floor(Date.now() / 1000);
    if (await shouldChallenge(request, url, env, now)
      && !(await isValidHumanPass(pass, ip, env, now))) {
      return json({ challengeRequired: true }, 403, origin);
    }
    return listVisits(url, env, origin);
  }

  return json({ error: "接口不存在" }, 404, origin);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env).catch(() => json({ error: "服务暂时不可用" }, 500));
  },

  scheduled(_controller, env, ctx) {
    const now = Math.floor(Date.now() / 1000);
    ctx.waitUntil(cleanupVisits(env, now));
    ctx.waitUntil(runAlertChecks(env, now));
  }
};
