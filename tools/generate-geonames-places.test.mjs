import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { COUNTRY_CODE_BY_NAME, GLOBAL_PLACES, GLOBAL_REGIONS, GLOBAL_PLACES_SOURCE } from "../cloudflare/cherry-site-api/src/places.js";
import { translateLocation } from "../cloudflare/cherry-site-api/src/index.js";

const generator = fileURLToPath(new URL("./generate-geonames-places.mjs", import.meta.url));
const city = (id, name, country) => [id, name, name, "", "0", "0", "P", "PPL", country, "", "", "", "", "", "1000"].join("\t");
const alternate = (id, language, name, preferred = "", short = "", colloquial = "", historic = "") => {
  return ["1", id, language, name, preferred, short, colloquial, historic].join("\t");
};
function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "cherry-geonames-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const data = {
    "cities500.txt": [city("1", "Oslo", "NO"), city("2", "Dubai", "AE"), city("3", "Springfield", "US"), city("4", "Springfield", "US")].join("\n"),
    "alternateNamesV2.txt": [
      alternate("1", "zh-TW", "奧斯陸", "1"),
      alternate("1", "zh-CN", "奥斯陆"),
      alternate("1", "zh-CN", "旧名", "1", "", "", "1"),
      alternate("1", "zh-CN", "俗名", "1", "", "1"),
      alternate("2", "zh", "迪拜", "1"),
      alternate("2", "zh", "迪拜乙", "1"),
      alternate("3", "zh", "斯普林菲尔德"),
      alternate("4", "zh", "春田"),
      alternate("5", "zh", "阿克什胡斯"),
      alternate("6", "zh", "斯普林菲尔德州")
    ].join("\n"),
    "admin1CodesASCII.txt": "NO.01\tAkershus\tAkershus\t5\nUS.01\tSpringfield\tSpringfield\t6\n",
    "admin2Codes.txt": "NO.01.01\tOslo\tOslo\t1\n"
  };
  for (const [name, contents] of Object.entries(data)) writeFileSync(join(directory, name), contents);
  const output = join(directory, "places.mjs");
  const run = (version = "2026-09-23") => execFileSync(process.execPath, [generator, directory, "--version", version, "--output", output], { cwd: directory, stdio: "pipe" });
  return { directory, data, output, run };
}

async function load(output) {
  return import(`data:text/javascript;base64,${readFileSync(output).toString("base64")}`);
}

test("generator prefers simplified names and excludes historical, colloquial and ambiguous names", async (t) => {
  const { output, run } = fixture(t);
  run();
  const generated = await load(output);
  assert.equal(generated.GLOBAL_PLACES.NO.Oslo, "奥斯陆");
  assert.equal(generated.GLOBAL_PLACES.NO.Akershus, "阿克什胡斯");
  assert.equal(generated.GLOBAL_PLACES.AE.Dubai, "迪拜");
  assert.equal(generated.GLOBAL_PLACES.US, undefined);
  assert.equal(generated.GLOBAL_REGIONS.US.Springfield, "斯普林菲尔德州");
  assert.equal(generated.GLOBAL_REGIONS.NO.Akershus, "阿克什胡斯");
  assert.equal(generated.GLOBAL_PLACES_SOURCE.regionCount, 2);
  assert.equal(generated.GLOBAL_PLACES_SOURCE.countryCount, 3);
  assert.equal(generated.COUNTRY_CODE_BY_NAME["美国"], "US");
  assert.equal(generated.GLOBAL_PLACES_SOURCE.ambiguousNamesSkipped, 1);
  assert.equal(generated.GLOBAL_PLACES_SOURCE.placeCount, 3);
  assert.equal(generated.COUNTRY_CODE_BY_NAME["阿联酋"], "AE");
  assert.equal(generated.COUNTRY_CODE_BY_NAME["阿拉伯联合酋长国"], "AE");
});

test("generator records input hashes and repeats byte-for-byte with the same inputs", async (t) => {
  const { output, data, run } = fixture(t);
  run();
  const original = readFileSync(output, "utf8");
  const generated = await load(output);
  for (const [name, contents] of Object.entries(data)) {
    assert.equal(generated.GLOBAL_PLACES_SOURCE.datasets[name.replace(".txt", "")], createHash("sha256").update(contents).digest("hex"));
  }
  run();
  assert.equal(readFileSync(output, "utf8"), original);
});

test("generator selects names independently of input row order", async (t) => {
  const { output, directory, data, run } = fixture(t);
  run();
  const first = await load(output);
  for (const [name, contents] of Object.entries(data)) {
    writeFileSync(join(directory, name), contents.split("\n").reverse().join("\n"));
  }
  run();
  const second = await load(output);
  assert.deepEqual(first.GLOBAL_PLACES, second.GLOBAL_PLACES);
  assert.deepEqual(first.GLOBAL_REGIONS, second.GLOBAL_REGIONS);
  assert.deepEqual(first.COUNTRY_CODE_BY_NAME, second.COUNTRY_CODE_BY_NAME);
});

test("generator rejects invalid versions and missing or empty data without replacing output", (t) => {
  const { directory, output, run } = fixture(t);
  writeFileSync(output, "unchanged");
  for (const version of ["", "latest", "2026-02-30"]) assert.throws(() => run(version));
  rmSync(join(directory, "admin2Codes.txt"));
  assert.throws(() => run());
  assert.equal(readFileSync(output, "utf8"), "unchanged");
  writeFileSync(join(directory, "admin2Codes.txt"), "");
  writeFileSync(join(directory, "alternateNamesV2.txt"), "");
  assert.throws(() => run());
  assert.equal(readFileSync(output, "utf8"), "unchanged");
});

test("checked-in dataset metadata and historical country translations stay consistent", () => {
  const displayNames = new Intl.DisplayNames(["zh-CN"], { type: "region" });
  const overrides = { HK: "中国香港", MO: "中国澳门", TW: "中国台湾" };
  const countries = [...new Set([...Object.keys(GLOBAL_PLACES), ...Object.keys(GLOBAL_REGIONS)])];
  assert.ok(countries.length >= 230);
  assert.equal(countries.length, GLOBAL_PLACES_SOURCE.countryCount);
  assert.equal(Object.values(GLOBAL_PLACES).reduce((count, places) => count + Object.keys(places).length, 0), GLOBAL_PLACES_SOURCE.placeCount);
  assert.equal(Object.values(GLOBAL_REGIONS).reduce((count, regions) => count + Object.keys(regions).length, 0), GLOBAL_PLACES_SOURCE.regionCount);
  assert.ok(GLOBAL_PLACES_SOURCE.placeCount > 40000);
  for (const code of countries) {
    const country = overrides[code] || displayNames.of(code);
    assert.equal(COUNTRY_CODE_BY_NAME[country], code);
    const [name, translation] = Object.entries(GLOBAL_PLACES[code] || GLOBAL_REGIONS[code]).find(([name]) => !name.includes(" · "));
    assert.notEqual(translateLocation(`${country} · ${name}`), `${country} · ${name}`, `${code}: ${name} → ${translation}`);
  }
  assert.equal(translateLocation("挪威 · Unknown Place · 邮编 12345"), "挪威 · Unknown Place · 邮编 12345");
});
