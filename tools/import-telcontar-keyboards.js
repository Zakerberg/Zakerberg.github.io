'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE_URL = 'https://telcontar.net/KBK/Cherry/keyboards';
const POLICY_URL = 'https://telcontar.net/KBK/about';
const POSTS_ROOT = path.resolve('source/_posts');
const RIGHTS_REPORT = path.resolve('source/_data/telcontar_reference_rights.json');
const BLOCK_START = '# telcontar-import:start';
const BLOCK_END = '# telcontar-import:end';
const UNKNOWN_VALUES = new Set(['', '-', '—', '–', '?']);

function decodeHtml(value = '') {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&ndash;/g, '–')
        .replace(/&mdash;/g, '—')
        .replace(/&hellip;/g, '…')
        .replace(/&prime;/g, '′')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)));
}

function htmlToText(value = '') {
    return decodeHtml(value
        .replace(/<br\s*\/?\s*>/gi, ' / ')
        .replace(/<[^>]+>/g, ''))
        .replace(/\s+/g, ' ')
        .trim();
}

function parseReferences(cellHtml = '') {
    const references = [...cellHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => {
        const attributes = match[1];
        const href = attributes.match(/href="([^"]+)"/i)?.[1] || '';
        const title = attributes.match(/title="([^"]+)"/i)?.[1] || '';
        const candidate = href || (/^https?:\/\//i.test(title) ? title : '');
        const url = candidate ? new URL(decodeHtml(candidate), SOURCE_URL).href : '';
        let referenceTitle = htmlToText(match[2]) || '原始参考';
        if (referenceTitle === '…' && /wiki\.themk\.org/i.test(url)) referenceTitle = 'The MK Wiki';
        return { title: referenceTitle, url };
    }).filter((reference) => reference.url);

    const label = htmlToText(cellHtml);
    if (references.length === 0 && label) {
        references.push({ title: label === 'See at B80-16AC' ? '参见 B80-16AC' : label, url: '' });
    }
    return references;
}

function parseTable(html) {
    const table = html.match(/<table class="datatable compact">([\s\S]*?)<\/table>/i)?.[1];
    if (!table) {
        throw new Error('未找到 Telcontar 键盘数据表。');
    }

    return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(1).map((rowMatch, index) => {
        const cells = [...rowMatch[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => cell[1]);
        if (cells.length !== 9) {
            throw new Error(`第 ${index + 1} 条记录字段数不是 9：${cells.length}`);
        }

        return {
            sourceRow: index + 1,
            model: htmlToText(cells[0]),
            modelNote: decodeHtml(cells[0].match(/title="([^"]+)"/i)?.[1] || ''),
            factory: htmlToText(cells[1]),
            date: htmlToText(cells[2]),
            serial: htmlToText(cells[3]),
            switches: htmlToText(cells[4]),
            pcb: htmlToText(cells[5]),
            customerPart: htmlToText(cells[6]),
            system: htmlToText(cells[7]),
            referenceLabel: htmlToText(cells[8]),
            references: parseReferences(cells[8])
        };
    });
}

function splitModels(model) {
    if (model === 'UB80-0051/… / UB80-0002/…') {
        return ['UB80-0051', 'UB80-0002'];
    }
    if (/^(?:KFN3-835[18]|KXN3-8451|KXND-A351) \/ /.test(model)) {
        return model.split(' / ');
    }
    return [model];
}

function expandRows(rows) {
    return rows.flatMap((row) => {
        const models = splitModels(row.model);
        const serials = row.serial.split(' / ');
        return models.map((model, index) => ({
            model,
            pairedModels: models.filter((candidate) => candidate !== model),
            row: {
                ...row,
                serial: serials.length === models.length ? serials[index] : row.serial
            }
        }));
    });
}

function isKnown(value) {
    return !UNKNOWN_VALUES.has(String(value || '').trim());
}

function unique(values) {
    return [...new Set(values.filter(isKnown))];
}

function formatFactory(value) {
    const translations = {
        'Waukegan, USA': 'Waukegan（美国）',
        'Hirose, Japan': 'Hirose（日本）',
        'Bayreuth, DE': 'Bayreuth（德国）',
        'Auerbach, DE': 'Auerbach（德国）',
        'St Albans, UK': 'St Albans（英国）',
        'Harpenden, UK': 'Harpenden（英国）'
    };
    return translations[value] || value;
}

function formatDate(value) {
    if (!isKnown(value)) return '';
    if (value === 'December 1980') return '1980 年 12 月';
    if (value === 'ca. 1980 or 1983') return '约 1980 或 1983 年';
    if (/^ca\. \d{4}(?:–\d{4})?$/.test(value)) return value.replace(/^ca\. /, '约 ') + ' 年';
    if (/^\d{4}\?$/.test(value)) return `约 ${value.slice(0, 4)} 年`;
    if (/^\d{4}$/.test(value)) return `${value} 年`;
    return value.replace(/^ca\. /, '约 ');
}

function formatSwitch(value) {
    const translations = {
        'Cherry-produced Hi-Tek High Profile': 'Cherry 制 Hi-Tek High Profile',
        'Solid state capacitive pre-DIN': '固态电容式（DIN 标准前）',
        'Solid state capacitive DIN': '固态电容式（DIN 标准）',
        'Unified solid state capacitive': '一体式固态电容',
        'Solid state capacitive': '固态电容式',
        'Tactile capacitive': '段落式电容',
        'M5 or M6': 'M5 或 M6',
        'M4, M5/M6': 'M4、M5/M6',
        'M4, M5, M6?': 'M4、M5，可能含 M6',
        'M5, M6': 'M5、M6',
        'M8 12 mm covered +LED': 'M8（12 mm 封闭式，带 LED）',
        'M8 6 mm open +LED +stable': 'M8（6 mm 开放式，带 LED，稳定型）',
        'M8 6 mm open': 'M8（6 mm 开放式）',
        'M8 6 mm covered +LED': 'M8（6 mm 封闭式，带 LED）',
        'MX Black': 'Cherry MX 黑轴',
        'MX Black +space': 'Cherry MX 黑轴（含空格键专用配置）',
        'MX Black +space +heavy': 'Cherry MX 黑轴（空格键重轴）',
        'M7, possibly M5 for space (not depicted)': 'M7，空格键可能为 M5（原图未展示）',
        'M7, with M5 for space': 'M7，空格键使用 M5'
    };
    return translations[value] || value;
}

function formatSystem(value) {
    const translations = {
        'DEC-specific': 'DEC 专用',
        'Berthold custom': 'Berthold 定制系统',
        'Unknown ADDS terminal': '未知 ADDS 终端',
        'Unidentified NCR terminal': '未识别的 NCR 终端',
        'Unknown; has extended area': '型号未确认；带扩展区'
    };
    return translations[value] || value;
}

function countriesForRows(rows) {
    return unique(rows.flatMap(({ row }) => {
        if (/USA/.test(row.factory)) return ['美国'];
        if (/Japan/.test(row.factory)) return ['日本'];
        if (/\bDE\b/.test(row.factory)) return ['德国'];
        if (/\bUK\b/.test(row.factory)) return ['英国'];
        return [];
    }));
}

function normalizeModel(value) {
    return String(value || '')
        .normalize('NFKC')
        .toUpperCase()
        .replace(/^CHERRY\s*/, '')
        .replace(/[^A-Z0-9]+/g, '');
}

function walkMarkdown(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) return walkMarkdown(target);
        return entry.isFile() && entry.name.endsWith('.md') ? [target] : [];
    });
}

function readPostInfo(file) {
    const source = fs.readFileSync(file, 'utf8');
    const frontMatter = source.match(/^---\s*\n([\s\S]*?)\n---/);
    const field = (name) => frontMatter?.[1].match(new RegExp(`^${name}:\\s*["']?(.+?)["']?\\s*$`, 'm'))?.[1] || '';
    return {
        file,
        source,
        articleNumber: field('article_number'),
        title: field('title'),
        filename: path.basename(file, '.md'),
        folder: path.basename(path.dirname(file))
    };
}

function matchScore(post, model) {
    const key = normalizeModel(model);
    const values = {
        articleNumber: normalizeModel(post.articleNumber),
        filename: normalizeModel(post.filename),
        folder: normalizeModel(post.folder),
        title: normalizeModel(post.title)
    };
    if (values.articleNumber === key) return 100;
    if (values.filename === key) return 90;
    if (values.folder === key) return 80;
    if (values.title === key) return 70;
    if (key === 'G80066203' && [values.articleNumber, values.filename, values.title].includes('G800662')) return 65;
    return 0;
}

function findPost(posts, model) {
    return posts
        .map((post) => ({ post, score: matchScore(post, model) }))
        .filter((candidate) => candidate.score > 0)
        .sort((left, right) => right.score - left.score)[0]?.post;
}

function seriesForModel(model) {
    if (model === 'Kana keyboard') return 'Cherry';
    return model.match(/^([A-Z]+\d*[A-Z]*)-/)?.[1] || 'Cherry';
}

function safeName(model) {
    return model.replace(/[\\/:*?"<>|]/g, '-').replace(/-+/g, '-').replace(/-$/, '');
}

function yamlScalar(value) {
    return JSON.stringify(String(value));
}

function aggregate(targetRows, field, formatter = (value) => value) {
    return unique(targetRows.map(({ row }) => formatter(row[field]))).join(' / ');
}

function buildReferences(targetRows) {
    const references = [{ title: 'Telcontar：老式 Cherry 键盘列表', url: SOURCE_URL }];
    targetRows.forEach(({ row }) => {
        row.references.forEach((reference) => references.push({
            title: `${reference.title}（Telcontar Reference）`,
            url: reference.url
        }));
    });
    const seen = new Set();
    return references.filter((reference) => {
        const key = reference.url || reference.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function renderObjectList(name, items, fields) {
    if (items.length === 0) return [];
    const lines = [`${name}:`];
    items.forEach((item) => {
        let first = true;
        fields.forEach((field) => {
            const value = item[field];
            if (!isKnown(value)) return;
            lines.push(`${first ? '  - ' : '    '}${field}: ${yamlScalar(value)}`);
            first = false;
        });
    });
    return lines;
}

function buildManagedBlock(model, targetRows, importDate) {
    const countries = countriesForRows(targetRows);
    const pairedModels = unique(targetRows.flatMap((targetRow) => targetRow.pairedModels));
    const alternateModels = unique(targetRows.map(({ row }) => row.modelNote.replace(/^Or\s+/i, '')));
    const fields = {
        article_number: model,
        series: seriesForModel(model),
        production_period: aggregate(targetRows, 'date', formatDate),
        factory: aggregate(targetRows, 'factory', formatFactory),
        made_in: countries.join(' / '),
        serial_number: aggregate(targetRows, 'serial'),
        switch_type: aggregate(targetRows, 'switches', formatSwitch),
        pcb_codes: aggregate(targetRows, 'pcb'),
        customer_part: aggregate(targetRows, 'customerPart'),
        system: aggregate(targetRows, 'system', formatSystem),
        alternate_model: alternateModels.join(' / '),
        telcontar_imported: importDate,
        telcontar_image_status: '未转载：Reference 图片需逐项确认权利或取得授权'
    };
    const lines = [BLOCK_START];
    Object.entries(fields).forEach(([name, value]) => {
        if (isKnown(value)) lines.push(`${name}: ${yamlScalar(value)}`);
    });
    if (pairedModels.length > 0) {
        lines.push('paired_models:');
        pairedModels.forEach((pairedModel) => lines.push(`  - ${yamlScalar(pairedModel)}`));
    }

    const observations = targetRows.map(({ row }) => ({
        source_table_model: row.model,
        factory: formatFactory(row.factory),
        production_period: formatDate(row.date),
        serial_number: row.serial,
        switch_type: formatSwitch(row.switches),
        pcb_codes: row.pcb,
        customer_part: row.customerPart,
        system: formatSystem(row.system),
        reference: row.references.map((reference) => reference.title).join(' / ')
            || (row.referenceLabel === 'See at B80-16AC' ? '参见 B80-16AC' : row.referenceLabel)
    }));
    lines.push(...renderObjectList('telcontar_records', observations, [
        'source_table_model', 'factory', 'production_period', 'serial_number', 'switch_type',
        'pcb_codes', 'customer_part', 'system', 'reference'
    ]));
    lines.push(...renderObjectList('telcontar_references', buildReferences(targetRows), ['title', 'url']));
    lines.push(BLOCK_END);
    return lines.join('\n');
}

function updatePost(source, block) {
    const frontMatter = source.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontMatter) throw new Error('文章缺少 front matter。');
    const managedPattern = new RegExp(`\\n?${BLOCK_START}[\\s\\S]*?${BLOCK_END}\\n?`, 'm');
    const clean = frontMatter[1].replace(managedPattern, '\n').trimEnd();
    return source.replace(frontMatter[0], `---\n${clean}\n\n${block}\n---`);
}

function extractTags(targetRows) {
    const source = targetRows.map(({ row }) => row.switches).join(' ');
    const tags = [];
    ['M1', 'M4', 'M5', 'M6', 'M7', 'M8', 'M11'].forEach((tag) => {
        if (new RegExp(`\\b${tag}\\b`).test(source)) tags.push(tag);
    });
    if (/\bMX\b/.test(source)) tags.push('MX');
    if (/Hi-Tek/i.test(source)) tags.push('Hi-Tek');
    if (/capacitive/i.test(source)) tags.push('电容式');
    return tags;
}

function buildSummary(model, targetRows) {
    const fragments = [`Cherry ${model}`];
    const factory = aggregate(targetRows, 'factory', formatFactory);
    const period = aggregate(targetRows, 'date', formatDate);
    const switches = aggregate(targetRows, 'switches', formatSwitch);
    if (factory) fragments.push(`生产记录：${factory}`);
    if (period) fragments.push(`年代：${period}`);
    if (switches) fragments.push(`开关：${switches}`);
    return fragments.join('，') + '。';
}

function createPost(model, targetRows, block, importDate) {
    const category = seriesForModel(model);
    const tags = extractTags(targetRows);
    const lines = [
        '---',
        `title: ${yamlScalar(`Cherry ${model}`)}`,
        `date: ${importDate}`,
        `summary: ${yamlScalar(buildSummary(model, targetRows))}`,
        'category:',
        `  - ${yamlScalar(category)}`
    ];
    if (tags.length > 0) {
        lines.push('tags:');
        tags.forEach((tag) => lines.push(`  - ${yamlScalar(tag)}`));
    }
    lines.push('', block, '---', '', `> ## Cherry ${model}`, '',
        '本页字段整理自 Telcontar 的老式 Cherry 键盘列表。Reference 图片在权利状态确认前不作转载，原始参考链接请见“资料来源”。', '');
    return lines.join('\n');
}

function localDate() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
}

function writeRightsReport(rows, importDate) {
    const report = {
        source: SOURCE_URL,
        policy: POLICY_URL,
        reviewed_on: importDate,
        status: 'not_uploaded',
        reason: 'Telcontar 明确将 reference photos 排除在其公有领域图片声明之外；第三方 Reference 也需由各权利人单独授权。',
        items: rows.map((row) => ({
            source_row: row.sourceRow,
            models: splitModels(row.model),
            reference_label: row.referenceLabel,
            reference_pages: row.references.map((reference) => reference.url).filter(Boolean),
            status: 'rights_review_required'
        }))
    };
    fs.mkdirSync(path.dirname(RIGHTS_REPORT), { recursive: true });
    fs.writeFileSync(RIGHTS_REPORT, JSON.stringify(report, null, 2) + '\n');
}

async function loadHtml() {
    const inputIndex = process.argv.indexOf('--input');
    if (inputIndex !== -1) {
        const inputPath = process.argv[inputIndex + 1];
        if (!inputPath) throw new Error('--input 后需要 HTML 文件路径。');
        return fs.readFileSync(path.resolve(inputPath), 'utf8');
    }
    const response = await fetch(SOURCE_URL);
    if (!response.ok) throw new Error(`下载失败：HTTP ${response.status}`);
    return response.text();
}

async function main() {
    const html = await loadHtml();
    const rows = parseTable(html);
    const expanded = expandRows(rows);
    const grouped = new Map();
    expanded.forEach((targetRow) => {
        if (!grouped.has(targetRow.model)) grouped.set(targetRow.model, []);
        grouped.get(targetRow.model).push(targetRow);
    });

    const posts = walkMarkdown(POSTS_ROOT).map(readPostInfo);
    const importDate = process.env.IMPORT_DATE || localDate();
    const result = { rows: rows.length, models: grouped.size, updated: 0, created: 0 };

    grouped.forEach((targetRows, model) => {
        const block = buildManagedBlock(model, targetRows, importDate);
        const existing = findPost(posts, model);
        if (existing) {
            fs.writeFileSync(existing.file, updatePost(existing.source, block));
            result.updated += 1;
            return;
        }

        const fileName = safeName(model);
        const directory = path.join(POSTS_ROOT, fileName);
        const file = path.join(directory, `Cherry ${fileName}.md`);
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(file, createPost(model, targetRows, block, importDate));
        result.created += 1;
    });

    writeRightsReport(rows, importDate);
    console.log(JSON.stringify(result, null, 2));
    console.log(`图片未上传；权利复核清单：${path.relative(process.cwd(), RIGHTS_REPORT)}`);
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
