import { createHash } from "node:crypto";
import { createReadStream, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  options: { version: { type: "string" }, output: { type: "string" } },
  allowPositionals: true
});
const [inputDirectory] = positionals;
const version = values.version;
if (positionals.length !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(version || "")
  || !Number.isFinite(Date.parse(version)) || new Date(version).toISOString().slice(0, 10) !== version) {
  throw new Error("Usage: node tools/generate-geonames-places.mjs <dump-directory> --version <YYYY-MM-DD> [--output <file>]");
}

const input = (filename) => resolve(inputDirectory, filename);
const output = values.output ? resolve(values.output)
  : fileURLToPath(new URL("../cloudflare/cherry-site-api/src/places.js", import.meta.url));
const languageRanks = new Map([["zh-CN", 4], ["zh-Hans", 4], ["zh", 3], ["zh-HK", 2], ["zh-TW", 1]]);
const countryOverrides = { HK: "中国香港", MO: "中国澳门", TW: "中国台湾" };
const countryAliases = { "阿联酋": "AE" };
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;

async function readLines(filePath, onLine) {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);
  stream.on("data", (chunk) => hash.update(chunk));
  const reader = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of reader) onLine(line);
  return hash.digest("hex");
}

function serializeObject(entries, indent) {
  return entries.map(([key, value], index) => {
    const suffix = index === entries.length - 1 ? "" : ",";
    return `${indent}${JSON.stringify(key)}: ${JSON.stringify(value)}${suffix}`;
  });
}

const chineseNames = new Map();
const alternateNamesHash = await readLines(input("alternateNamesV2.txt"), (line) => {
  const parts = line.split("\t");
  if (parts.length < 4 || !languageRanks.has(parts[2]) || !parts[3]
    || parts[6] === "1" || parts[7] === "1") return;

  const rank = languageRanks.get(parts[2]) * 4 + (parts[4] === "1" ? 2 : 0) + (parts[5] === "1" ? 0 : 1);
  const current = chineseNames.get(parts[1]);
  if (!current || rank > current.rank || (rank === current.rank && compare(parts[3], current.name) < 0)) {
    chineseNames.set(parts[1], { name: parts[3], rank });
  }
});

const places = new Map();
const regions = new Map();
const ambiguousNames = new Set();
const ambiguousRegions = new Set();
function addPlace(countryCode, name, geonameId, entries = places, ambiguous = ambiguousNames) {
  const translation = chineseNames.get(geonameId)?.name;
  if (!countryCode || !name || !translation) return;
  const key = `${countryCode}\u0000${name}`;
  if (entries.has(key) && entries.get(key) !== translation) ambiguous.add(key);
  entries.set(key, translation);
}

const citiesHash = await readLines(input("cities500.txt"), (line) => {
  const parts = line.split("\t");
  if (parts.length >= 15) addPlace(parts[8], parts[1], parts[0]);
});
const admin1Hash = await readLines(input("admin1CodesASCII.txt"), (line) => {
  const parts = line.split("\t");
  if (parts.length < 4) return;
  const country = parts[0].split(".")[0];
  addPlace(country, parts[1], parts[3]);
  addPlace(country, parts[1], parts[3], regions, ambiguousRegions);
});
const admin2Hash = await readLines(input("admin2Codes.txt"), (line) => {
  const parts = line.split("\t");
  if (parts.length >= 4) addPlace(parts[0].split(".")[0], parts[1], parts[3]);
});

function groupPlaces(entries, ambiguous) {
  const grouped = new Map();
  for (const [key, translation] of entries) {
    const [countryCode, name] = key.split("\u0000");
    // Country-only keys cannot disambiguate different places with the same name.
    if (ambiguous.has(key) || name === translation) continue;
    if (!grouped.has(countryCode)) grouped.set(countryCode, new Map());
    grouped.get(countryCode).set(name, translation);
  }
  return grouped;
}
const byCountry = groupPlaces(places, ambiguousNames);
const regionsByCountry = groupPlaces(regions, ambiguousRegions);
const countPlaces = (grouped) => [...grouped.values()].reduce((total, entries) => total + entries.size, 0);
const placeCount = countPlaces(byCountry);
const regionCount = countPlaces(regionsByCountry);
if (!placeCount) throw new Error("No translated places found; output was not changed");

const countryCodes = [...new Set([...byCountry.keys(), ...regionsByCountry.keys()])].sort((left, right) => {
  return (byCountry.get(right)?.size || 0) - (byCountry.get(left)?.size || 0) || compare(left, right);
});
const displayNames = new Intl.DisplayNames(["zh-CN"], { type: "region" });
const countryNames = new Map();
for (const countryCode of countryCodes) {
  const countryName = countryOverrides[countryCode] || displayNames.of(countryCode);
  if (!countryName || countryNames.has(countryName)) {
    throw new Error(`Cannot create an unambiguous Chinese country mapping for ${countryCode}`);
  }
  countryNames.set(countryName, countryCode);
}
for (const [countryName, countryCode] of Object.entries(countryAliases)) {
  if (byCountry.has(countryCode)) countryNames.set(countryName, countryCode);
}

const lines = [
  "// Generated by tools/generate-geonames-places.mjs from GeoNames (CC BY 4.0).",
  "// Source: https://download.geonames.org/export/dump/",
  "",
  "export const GLOBAL_PLACES_SOURCE = Object.freeze({",
  `  version: ${JSON.stringify(version)},`,
  '  license: "CC BY 4.0",',
  `  icuVersion: ${JSON.stringify(process.versions.icu)},`,
  `  placeCount: ${placeCount},`,
  `  regionCount: ${regionCount},`,
  `  countryCount: ${countryCodes.length},`,
  `  ambiguousNamesSkipped: ${ambiguousNames.size},`,
  `  ambiguousRegionsSkipped: ${ambiguousRegions.size},`,
  "  datasets: Object.freeze({",
  `    alternateNamesV2: ${JSON.stringify(alternateNamesHash)},`,
  `    cities500: ${JSON.stringify(citiesHash)},`,
  `    admin1CodesASCII: ${JSON.stringify(admin1Hash)},`,
  `    admin2Codes: ${JSON.stringify(admin2Hash)}`,
  "  })",
  "});",
  "",
  "export const COUNTRY_CODE_BY_NAME = Object.freeze({",
  ...serializeObject([...countryNames.entries()].sort(([left], [right]) => compare(left, right)), "  "),
  "});",
  ""
];
for (const [name, grouped] of [["GLOBAL_PLACES", byCountry], ["GLOBAL_REGIONS", regionsByCountry]]) {
  const codes = countryCodes.filter((code) => grouped.has(code));
  lines.push(`export const ${name} = {`);
  for (const [index, code] of codes.entries()) {
    const entries = [...grouped.get(code).entries()].sort(([left], [right]) => compare(left, right));
    lines.push(`  ${JSON.stringify(code)}: {`);
    lines.push(...serializeObject(entries, "    "));
    lines.push(`  }${index === codes.length - 1 ? "" : ","}`);
  }
  lines.push("};", "");
}
writeFileSync(output, lines.join("\n"), "utf8");
console.log(`Generated ${placeCount} places and ${regionCount} region entries across ${countryCodes.length} countries; skipped ${ambiguousNames.size} ambiguous place names. Output: ${output}`);
