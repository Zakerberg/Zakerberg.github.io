'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const POSTS_ROOT = path.join(PROJECT_ROOT, 'source', '_posts');
const SNAPSHOT_FILE = path.join(PROJECT_ROOT, 'source', '_data', 'fcc_cherry_keyboards.json');
const SOURCE_URL = 'https://fccid.io/GDD';
const LIST_URLS = [SOURCE_URL, `${SOURCE_URL}/page/2`];
const USER_AGENT = 'ZakerbergCherryArchive/1.0 (non-commercial keyboard archive)';
const BLOCK_START = '# FCC_DATA_BEGIN';
const BLOCK_END = '# FCC_DATA_END';
const IMPORT_DATE = process.env.IMPORT_DATE || '2026-07-27';
const DRY_RUN = process.argv.includes('--dry-run');

function compactWhitespace(value = '') {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function yamlScalar(value) {
    return JSON.stringify(String(value));
}

function isoDate(value = '') {
    const normalized = compactWhitespace(value);
    const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? `${match[3]}-${match[1]}-${match[2]}` : normalized;
}

async function fetchHtml(url) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) {
        throw new Error(`FCC 页面请求失败 ${response.status}: ${url}`);
    }
    return response.text();
}

function tableFields(table) {
    const result = {};
    table.querySelectorAll('tr').forEach((row) => {
        const cells = [...row.querySelectorAll('th,td')]
            .map((cell) => compactWhitespace(cell.textContent));
        if (cells.length === 2 && cells[0]) {
            result[cells[0]] = cells[1];
        }
    });
    return result;
}

function parseList(html) {
    const document = new JSDOM(html).window.document;
    return [...document.querySelectorAll('a[href^="/GDD"]')]
        .filter((anchor) => /^\/GDD[^/]+$/.test(anchor.getAttribute('href') || ''))
        .map((anchor) => {
            const row = anchor.closest('tr');
            const cells = row ? [...row.querySelectorAll('td')] : [];
            const firstCell = cells[0] ? compactWhitespace(cells[0].textContent) : '';
            return {
                fccId: compactWhitespace(anchor.textContent),
                url: new URL(anchor.getAttribute('href'), SOURCE_URL).href,
                listDate: firstCell.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '',
                listDescription: cells[1] ? compactWhitespace(cells[1].textContent)
                    .replace(/(?:Original Equipment|Change in Identification)$/i, '').trim() : '',
                applicationPurpose: cells[2] ? compactWhitespace(cells[2].textContent) : ''
            };
        });
}

function uniqueBy(items, keyForItem) {
    const seen = new Set();
    return items.filter((item) => {
        const key = keyForItem(item);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function parseDetail(item, html) {
    const document = new JSDOM(html).window.document;
    const metaTables = [...document.querySelectorAll('table.meta-table')];
    const deviceFields = metaTables.length > 0 ? tableFields(metaTables[0]) : {};
    const applicationFields = metaTables
        .map(tableFields)
        .filter((fields) => fields.Model || fields['Final Action Date']);
    const bodyText = compactWhitespace(document.body.textContent);
    const applicationDate = isoDate(
        bodyText.match(/Application Dated:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] || ''
    );

    const records = applicationFields.length > 0 ? applicationFields : [{}];
    return records.map((fields) => {
        const model = compactWhitespace(fields.Model || '');
        let deviceDescription = compactWhitespace(
            fields['Device Description'] || item.listDescription || deviceFields['Equipment Class'] || ''
        );
        if (normalizeModel(deviceDescription) === normalizeModel(model)) {
            deviceDescription = '';
        }
        return {
            fcc_id: item.fccId,
            model,
            device_description: deviceDescription,
            application_date: applicationDate,
            final_action_date: compactWhitespace(fields['Final Action Date'] || item.listDate),
            applicant: compactWhitespace(deviceFields['Applicant Business'] || ''),
            application_purpose: compactWhitespace(
                fields['Application Purpose'] || item.applicationPurpose || deviceFields['Application Purpose'] || ''
            ),
            equipment_class: compactWhitespace(fields['Equipment Class'] || deviceFields['Equipment Class'] || ''),
            frequency: compactWhitespace(fields['Frequency Range'] || ''),
            source_url: item.url
        };
    });
}

function isKeyboardRecord(record) {
    const text = [
        record.fcc_id,
        record.model,
        record.device_description,
        record.equipment_class
    ].join(' ');
    const explicitKeyboard = /\bkeyboard\b|\bkeypad\b|\bkey board\b|\bKB\b|keyboard and pad/i.test(text);
    if (explicitKeyboard) return true;

    const id = record.fcc_id.toUpperCase();
    if (/^GDD(?:G8[0134]|5Y[O0]G8[01])-?\d+/i.test(id)) return true;
    if (/^GDD(?:LK\d+|MICADO|RS13800WL)$/i.test(id)) return true;
    if (/^GDD(?:G8[ADE]-|MXU?-?)/i.test(id) && !/R$/i.test(id)) return true;
    if (/^GDD(?:JG-|JK-)/i.test(id)) return true;
    if (/^GDDJD-.+K$/i.test(id) || /Stream Desktop Recharge - Key/i.test(text)) return true;
    return false;
}

function fallbackModel(fccId) {
    return fccId
        .replace(/^GDD5Y[O0]/i, '')
        .replace(/^GDD/i, '')
        .replace(/^G(?=8[0134]-)/i, '');
}

function splitModels(record) {
    const source = compactWhitespace(record.model) || fallbackModel(record.fcc_id);
    const models = source
        .split(/\s*(?:,|;|\s\/\s)\s*/)
        .map((model) => model
            .replace(/^CHERRY\s+/i, '')
            .replace(/^5Y[O0](?=G8[01]-)/i, '')
            .trim())
        .filter((model) => model && model.length <= 80);
    return models.length > 0 ? models : [fallbackModel(record.fcc_id)];
}

function normalizeModel(value = '') {
    return compactWhitespace(value)
        .normalize('NFKC')
        .toUpperCase()
        .replace(/^CHERRY\s+/, '')
        .replace(/[^A-Z0-9]+/g, '');
}

function safeName(value) {
    return value.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
}

function seriesForModel(model) {
    return model.match(/^([A-Z]+\d*[A-Z]*)-/)?.[1] || 'Cherry';
}

function walkMarkdown(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) return walkMarkdown(target);
        return entry.isFile() && entry.name.endsWith('.md') ? [target] : [];
    });
}

function readPost(file) {
    const source = fs.readFileSync(file, 'utf8');
    const frontMatter = source.match(/^---\s*\n([\s\S]*?)\n---/);
    const field = (name) => frontMatter?.[1]
        .match(new RegExp(`^${name}:\\s*["']?(.+?)["']?\\s*$`, 'm'))?.[1] || '';
    return {
        file,
        source,
        fccGenerated: source.includes('目前只收录可以由 FCC 页面直接核对的申报信息'),
        keys: [
            field('article_number'),
            field('full_model'),
            field('model'),
            field('title'),
            path.basename(file, '.md'),
            path.basename(path.dirname(file))
        ].map(normalizeModel).filter(Boolean)
    };
}

function findPost(posts, model) {
    const key = normalizeModel(model);
    return posts.find((post) => post.keys.includes(key));
}

function renderObjectList(name, items, fields) {
    const lines = [`${name}:`];
    items.forEach((item) => {
        let first = true;
        fields.forEach((field) => {
            if (!item[field]) return;
            lines.push(`${first ? '  - ' : '    '}${field}: ${yamlScalar(item[field])}`);
            first = false;
        });
    });
    return lines;
}

function buildManagedBlock(records) {
    const references = uniqueBy(records.map((record) => ({
        title: `FCC ID ${record.fcc_id}`,
        url: record.source_url
    })), (reference) => reference.url);
    const lines = [
        BLOCK_START,
        `fcc_imported: ${yamlScalar(IMPORT_DATE)}`,
        ...renderObjectList('fcc_records', records, [
            'fcc_id',
            'model',
            'device_description',
            'application_date',
            'final_action_date',
            'applicant',
            'application_purpose',
            'equipment_class',
            'frequency',
            'source_url'
        ]),
        ...renderObjectList('fcc_references', references, ['title', 'url']),
        BLOCK_END
    ];
    return lines.join('\n');
}

function updatePost(source, block) {
    const frontMatter = source.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontMatter) throw new Error('文章缺少 front matter。');
    const managedPattern = new RegExp(`\\n?${BLOCK_START}[\\s\\S]*?${BLOCK_END}\\n?`, 'm');
    const clean = frontMatter[1].replace(managedPattern, '\n').trimEnd();
    return source.replace(frontMatter[0], `---\n${clean}\n\n${block}\n---`);
}

function createPost(model, records, block) {
    const first = records[0];
    const date = first.final_action_date || first.application_date || IMPORT_DATE;
    const description = first.device_description || `FCC ID ${first.fcc_id} 键盘记录`;
    const series = seriesForModel(model);
    return [
        '---',
        `title: ${yamlScalar(`Cherry ${model}`)}`,
        `date: ${yamlScalar(date)}`,
        `updated: ${yamlScalar(IMPORT_DATE)}`,
        `summary: ${yamlScalar(`${description}，FCC 公开申报与型号资料。`)}`,
        `description: ${yamlScalar(`Cherry ${model} 的 FCC 申报型号、设备说明、申请日期和认证记录。`)}`,
        `article_number: ${yamlScalar(model)}`,
        `series: ${yamlScalar(series)}`,
        'category:',
        `  - ${yamlScalar(series)}`,
        'tags:',
        '  - "FCC 认证"',
        '',
        block,
        '---',
        '',
        `> ## Cherry ${model}`,
        '',
        `本页依据 [FCC ID ${first.fcc_id}](${first.source_url}) 的公开设备认证记录建立。目前只收录可以由 FCC 页面直接核对的申报信息；认证日期不等同于产品上市或生产日期。`,
        ''
    ].join('\n');
}

function dirtyFiles() {
    const output = execFileSync('git', ['diff', '--name-only'], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8'
    });
    return new Set(output.split(/\r?\n/).filter(Boolean).map((file) => path.resolve(PROJECT_ROOT, file)));
}

function targetFileForModel(model) {
    const series = seriesForModel(model);
    const existingSeriesDirectory = path.join(POSTS_ROOT, series);
    const fileName = safeName(model);
    if (series !== 'Cherry' && fs.existsSync(existingSeriesDirectory)) {
        return path.join(existingSeriesDirectory, `${fileName}.md`);
    }
    return path.join(POSTS_ROOT, fileName, `Cherry ${fileName}.md`);
}

async function mapLimit(items, limit, mapper) {
    const results = new Array(items.length);
    let cursor = 0;
    async function worker() {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await mapper(items[index], index);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}

async function main() {
    const listPages = await Promise.all(LIST_URLS.map(fetchHtml));
    const applications = uniqueBy(listPages.flatMap(parseList), (item) => item.fccId);
    const details = (await mapLimit(applications, 6, async (item) => {
        const html = await fetchHtml(item.url);
        return parseDetail(item, html);
    })).flat();
    const keyboardRecords = details.filter(isKeyboardRecord);

    const grouped = new Map();
    keyboardRecords.forEach((record) => {
        splitModels(record).forEach((model) => {
            const key = normalizeModel(model);
            if (!grouped.has(key)) grouped.set(key, { model, records: [] });
            grouped.get(key).records.push({ ...record, model: record.model || model });
        });
    });

    const posts = walkMarkdown(POSTS_ROOT).map(readPost);
    const dirty = dirtyFiles();
    const result = {
        source: SOURCE_URL,
        retrievedAt: new Date().toISOString(),
        applications: applications.length,
        keyboardApplications: uniqueBy(keyboardRecords, (record) => record.fcc_id).length,
        models: grouped.size,
        updated: [],
        created: [],
        skippedDirty: [],
        generatedPages: posts.filter((post) => post.fccGenerated)
            .map((post) => path.relative(PROJECT_ROOT, post.file)),
        records: keyboardRecords,
        excluded: details
            .filter((record) => !isKeyboardRecord(record))
            .map((record) => ({ fcc_id: record.fcc_id, description: record.device_description }))
    };

    grouped.forEach(({ model, records }) => {
        const deduplicated = uniqueBy(records, (record) => [
            record.fcc_id,
            record.model,
            record.final_action_date
        ].join('|'));
        const block = buildManagedBlock(deduplicated);
        const existing = findPost(posts, model);
        if (existing) {
            const hasManagedBlock = existing.source.includes(BLOCK_START);
            if (dirty.has(path.resolve(existing.file)) && !hasManagedBlock) {
                result.skippedDirty.push(path.relative(PROJECT_ROOT, existing.file));
                return;
            }
            if (!DRY_RUN) {
                fs.writeFileSync(existing.file, updatePost(existing.source, block));
            }
            result.updated.push(path.relative(PROJECT_ROOT, existing.file));
            return;
        }

        const file = targetFileForModel(model);
        if (!DRY_RUN) {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, createPost(model, deduplicated, block));
        }
        result.created.push(path.relative(PROJECT_ROOT, file));
    });

    if (!DRY_RUN) {
        fs.mkdirSync(path.dirname(SNAPSHOT_FILE), { recursive: true });
        fs.writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(result, null, 2)}\n`);
    }
    console.log(JSON.stringify({
        dryRun: DRY_RUN,
        applications: result.applications,
        keyboardApplications: result.keyboardApplications,
        models: result.models,
        updated: result.updated.length,
        created: result.created.length,
        generatedPages: result.generatedPages.length,
        skippedDirty: result.skippedDirty.length,
        excluded: result.excluded.length
    }, null, 2));
    if (DRY_RUN) {
        console.log('\nUPDATE');
        console.log(result.updated.join('\n'));
        console.log('\nCREATE');
        console.log(result.created.join('\n'));
    }
    console.log(path.relative(PROJECT_ROOT, SNAPSHOT_FILE));
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
