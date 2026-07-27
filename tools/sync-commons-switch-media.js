'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'source', 'medias', 'switches', 'commons');
const MANIFEST_FILE = path.join(PROJECT_ROOT, 'source', '_data', 'commons_cherry_switches.json');
const API_URL = 'https://commons.wikimedia.org/w/api.php';
const CATEGORY_URL = 'https://commons.wikimedia.org/wiki/Category:Cherry_switches';
const USER_AGENT = 'ZakerbergCherryArchive/1.0 (non-commercial keyboard archive)';
const FORCE = process.argv.includes('--force');

const MEDIA = [
    {
        title: 'File:Clicking a 1959 Cherry mechanical keyboard switch.webm',
        file: 'cherry-1959-switch.webm',
        poster: 'cherry-1959-switch-poster.jpg',
        section: '早期开关',
        caption: '1959 年 Cherry 01APBSW 开关动作演示'
    },
    {
        title: 'File:2005-02-02-Cherry-Mikroschalter.jpg',
        file: 'cherry-microswitch-opened.jpg',
        section: '通用结构',
        caption: '打开外壳后的 Cherry 微动开关'
    },
    {
        title: 'File:Cherry Gold crosspoint - crosspoints close-up.JPG',
        file: 'cherry-gold-crosspoint-closeup.jpg',
        section: 'M7',
        caption: 'Cherry Gold Crosspoint 交叉点触点特写'
    },
    {
        title: 'File:Cherry M61-0120 (CDC) -- components.jpg',
        file: 'cherry-m61-0120-components.jpg',
        section: 'M7',
        caption: '推定 M61-0120 的拆解组件'
    },
    {
        title: 'File:Cherry M8.jpg',
        file: 'cherry-m8-comparison.jpg',
        section: 'M8',
        caption: 'Cherry M8 封闭式与开放式样本'
    },
    {
        title: 'File:Cherry M9.jpg',
        file: 'cherry-m9-comparison.jpg',
        section: 'M9',
        caption: 'Cherry M9 样本对比'
    },
    {
        title: 'File:Cherry ML1A-11JW.jpg',
        file: 'cherry-ml1a-11jw.jpg',
        section: 'ML',
        caption: 'Cherry ML1A-11JW 短型开关'
    },
    {
        title: 'File:Cherry ML size comparison.jpg',
        file: 'cherry-ml-size-comparison.jpg',
        section: 'ML',
        caption: 'Cherry ML 外形尺寸对比'
    },
    {
        title: 'File:Cherry MX -- gold crosspoint contacts.jpg',
        file: 'cherry-mx-gold-crosspoint-contacts.jpg',
        section: 'MX',
        caption: 'Cherry MX Gold Crosspoint 触点侧视图'
    },
    {
        title: 'File:Cherry MX -- opened, 1.jpg',
        file: 'cherry-mx-opened.jpg',
        section: 'MX',
        caption: 'Cherry MX 青轴闭合外观与茶轴开盖结构'
    },
    {
        title: 'File:Cherry MX -- sliders and springs.jpg',
        file: 'cherry-mx-sliders-and-springs.jpg',
        section: 'MX',
        caption: '多种 Cherry MX 轴心与回位弹簧'
    },
    {
        title: 'File:Cherry MY Type 1 -- disassembled, top views.jpg',
        file: 'cherry-my-type1-disassembled.jpg',
        section: 'MY',
        caption: 'Cherry MY Type 1 拆解俯视图'
    },
    {
        title: 'File:Cherry MY force graph.svg',
        file: 'cherry-my-force-graph.svg',
        section: 'MY',
        caption: '依据 Cherry 目录重绘的 MY 近似力程曲线'
    }
];

function stripHtml(value = '') {
    return String(value)
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

function metadataValue(metadata, key) {
    return stripHtml(metadata && metadata[key] && metadata[key].value);
}

function apiUrl() {
    const url = new URL(API_URL);
    const params = {
        action: 'query',
        format: 'json',
        titles: MEDIA.map((item) => item.title).join('|'),
        prop: 'imageinfo',
        iiprop: 'url|mime|size|extmetadata',
        iiurlwidth: '1280'
    };
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url;
}

function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function download(url, target) {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                Referer: CATEGORY_URL
            }
        });
        if (response.ok) {
            fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
            await delay(500);
            return;
        }
        if (response.status !== 429 || attempt === 5) {
            throw new Error(`下载失败 ${response.status}: ${url}`);
        }
        await delay(attempt * 2000);
    }
}

function isAllowedLicense(license) {
    return /^(?:Public domain|CC BY(?:-SA)? 3\.0)$/i.test(license);
}

async function main() {
    const response = await fetch(apiUrl(), { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) {
        throw new Error(`Wikimedia API 请求失败：${response.status}`);
    }

    const payload = await response.json();
    const pages = Object.values(payload.query && payload.query.pages || {});
    const byTitle = new Map(pages.map((page) => [page.title, page]));
    const manifest = {
        meta: {
            category: CATEGORY_URL,
            retrievedAt: new Date().toISOString(),
            note: 'Only representative media with an explicit reusable license is mirrored locally.'
        },
        media: []
    };

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    for (const item of MEDIA) {
        const page = byTitle.get(item.title);
        const image = page && page.imageinfo && page.imageinfo[0];
        if (!image) {
            throw new Error(`Wikimedia API 未返回：${item.title}`);
        }

        const metadata = image.extmetadata || {};
        const license = metadataValue(metadata, 'LicenseShortName');
        if (!isAllowedLicense(license)) {
            throw new Error(`${item.title} 的许可不在允许清单中：${license || '未标注'}`);
        }

        const isVideo = image.mime === 'video/webm';
        const isSvg = image.mime === 'image/svg+xml';
        const mediaUrl = isVideo || isSvg ? image.url : (image.thumburl || image.url);
        const mediaTarget = path.join(OUTPUT_DIR, item.file);
        if (FORCE || !fs.existsSync(mediaTarget)) {
            await download(mediaUrl, mediaTarget);
        }
        if (isVideo && item.poster && image.thumburl) {
            const posterTarget = path.join(OUTPUT_DIR, item.poster);
            if (FORCE || !fs.existsSync(posterTarget)) {
                await download(image.thumburl, posterTarget);
            }
        }

        manifest.media.push({
            title: item.title,
            section: item.section,
            caption: item.caption,
            localPath: `/medias/switches/commons/${item.file}`,
            posterPath: item.poster ? `/medias/switches/commons/${item.poster}` : '',
            sourcePage: image.descriptionurl,
            originalUrl: image.url,
            artist: metadataValue(metadata, 'Artist'),
            license,
            licenseUrl: metadataValue(metadata, 'LicenseUrl'),
            description: metadataValue(metadata, 'ImageDescription'),
            mime: image.mime,
            originalSize: image.size
        });
    }

    fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
    fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Saved ${manifest.media.length} Commons media files.`);
    console.log(path.relative(PROJECT_ROOT, MANIFEST_FILE));
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
