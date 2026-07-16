'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(PROJECT_ROOT, 'source', '_posts');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'source', '_data', 'cherry_archive.json');
const ARCHIVE_URL = 'https://raw.githubusercontent.com/photekq/Cherry-Archive/main/assets/database.json';
const ARCHIVE_PAGE = 'https://www.kbdarchive.org/cherry/database.html';

const RECORD_FIELDS = [
    'Index',
    'kbSeries',
    'kbModel',
    'kbExtension',
    'kbSwitch',
    'kbInterface',
    'kbBrand',
    'caseStyle',
    'languagePrimary',
    'languageSecondary',
    'layoutSize',
    'layoutType',
    'keycapMaterial',
    'keycapThickness',
    'keycapPrimary',
    'keycapSub',
    'keycapScheme',
    'kbKRO',
    'kbFeature',
    'switchPlate',
    'switchSuper',
    'switchLock',
    'caseColour',
    'keycapNonstandard',
    'keycapSide',
    'keycapSecColour',
    'keycapSideColour',
    'keycapColour',
    'keycapWindow',
    'keycapCaps',
    'keycapMX',
    'keycapReleg',
    'keycapBottomTop',
    'keycapSpace',
    'layoutWin',
    'altDesignation',
    'status',
    'ref1',
    'comment1',
    'refAuthor1',
    'refSite1',
    'refImagecount1',
    'ref2',
    'comment2',
    'refAuthor2',
    'refSite2',
    'refImagecount2'
];

function listMarkdownFiles(directory) {
    const files = [];

    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...listMarkdownFiles(target));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(target);
        }
    });

    return files;
}

function collectSiteModels() {
    const models = new Set();
    const modelPattern = /\b(G[0-9A-Z]{2})[-\s](\d{3,5})\b/gi;

    listMarkdownFiles(POSTS_DIR).forEach((file) => {
        const content = `${path.basename(file, '.md')}\n${fs.readFileSync(file, 'utf8').slice(0, 2500)}`;
        let match;
        while ((match = modelPattern.exec(content)) !== null) {
            models.add(`${match[1].toUpperCase()}-${match[2]}`);
        }
    });

    return models;
}

function compactRecord(record) {
    return RECORD_FIELDS.reduce((result, field) => {
        const value = record[field];
        if (value !== undefined && value !== null && value !== '') {
            result[field] = value;
        }
        return result;
    }, {});
}

async function main() {
    const response = await fetch(ARCHIVE_URL, {
        headers: { 'User-Agent': 'zakerberg-cherry-site-data-sync' }
    });
    if (!response.ok) {
        throw new Error(`Cherry Archive request failed: ${response.status} ${response.statusText}`);
    }

    const siteModels = collectSiteModels();
    const archiveRecords = await response.json();
    const records = archiveRecords
        .filter((record) => siteModels.has(`${String(record.kbSeries).toUpperCase()}-${record.kbModel}`))
        .map(compactRecord)
        .sort((left, right) => Number(left.Index) - Number(right.Index));

    const snapshot = {
        meta: {
            name: 'Cherry Archive',
            source: ARCHIVE_PAGE,
            database: ARCHIVE_URL,
            retrievedAt: new Date().toISOString(),
            note: 'Filtered snapshot containing Cherry Archive records that match models published on this site.'
        },
        records
    };

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

    console.log(`Saved ${records.length} Cherry Archive records for ${siteModels.size} site models.`);
    console.log(path.relative(PROJECT_ROOT, OUTPUT_FILE));
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
