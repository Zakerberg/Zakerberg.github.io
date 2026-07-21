'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RIGHTS_REPORT = path.resolve('source/_data/telcontar_reference_rights.json');
const DEFAULT_OUTPUT = path.join(os.homedir(), 'Downloads', 'Cherry New');
const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
];

const SPECIAL_IMAGE_FALLBACKS = new Map([
    [
        'https://www.ebay.com/itm/long-winded-guff-/122203538782?nordt=true&orig_cvip=true',
        ['https://i.ebayimg.com/images/g/w40AAOSwX~dWr72y/s-l1600.jpg']
    ],
    [
        'https://www.worthpoint.com/worthopedia/adds-aquired-digital-data-systems-1872621487',
        ['https://thumbs.worthpoint.com/zoom/images1/1/0617/13/adds-aquired-digital-data-systems_1_404f0b63ae79d5beaf622361364400da.jpg']
    ]
]);

function parseArgs(argv) {
    const outputIndex = argv.indexOf('--output');
    return {
        resume: argv.includes('--resume'),
        output: outputIndex >= 0 && argv[outputIndex + 1]
            ? path.resolve(argv[outputIndex + 1])
            : DEFAULT_OUTPUT
    };
}

function decodeHtml(value = '') {
    return String(value)
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)));
}

function safeName(value, fallback = 'image') {
    const cleaned = decodeHtml(String(value || ''))
        .normalize('NFKC')
        .replace(/[\\/:*?"<>|\x00-\x1f]/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/-+/g, '-')
        .replace(/^[. -]+|[. -]+$/g, '')
        .slice(0, 120);
    return cleaned || fallback;
}

function sourceSlug(url) {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const labels = {
        'classiccmp.org': 'ClassicCmp',
        'deskthority.net': 'Deskthority',
        'ebay.co.uk': 'eBay',
        'ebay.com': 'eBay',
        'flickr.com': 'Flickr',
        'geekhack.org': 'Geekhack',
        'imgur.com': 'Imgur',
        'reddit.com': 'Reddit',
        'telcontar.net': 'Telcontar',
        'vintagecomputer.ca': 'VintageComputer',
        'wiki.themk.org': 'TheMKWiki',
        'worthpoint.com': 'Worthpoint'
    };
    return labels[hostname] || safeName(hostname, 'Reference');
}

function uniqueByUrl(candidates) {
    const seen = new Set();
    return candidates.filter((candidate) => {
        if (!candidate?.url || !/^https?:/i.test(candidate.url)) return false;
        const key = candidate.url.replace(/#.*$/, '');
        if (seen.has(key)) return false;
        seen.add(key);
        candidate.url = key;
        return true;
    });
}

function attributes(tag) {
    const result = {};
    for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
        result[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
    }
    return result;
}

async function fetchResponse(url, options = {}) {
    let lastError;
    const retries = options.retries ?? 3;
    for (let attempt = 0; attempt < retries; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeout ?? 45000);
        try {
            const response = await fetch(url, {
                redirect: 'follow',
                signal: controller.signal,
                headers: {
                    'accept': options.accept || 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
                    'accept-language': 'en-US,en;q=0.9',
                    'referer': options.referer || 'https://telcontar.net/KBK/Cherry/keyboards',
                    'user-agent': options.userAgent || USER_AGENTS[attempt % USER_AGENTS.length]
                }
            });
            clearTimeout(timeout);
            if (response.ok) return response;
            lastError = new Error(`HTTP ${response.status}`);
        } catch (error) {
            clearTimeout(timeout);
            lastError = error;
        }
    }
    throw new Error(`${lastError?.message || 'fetch failed'}: ${url}`);
}

async function fetchText(url, options = {}) {
    const response = await fetchResponse(url, options);
    const bytes = Buffer.from(await response.arrayBuffer());
    const charset = response.headers.get('content-type')?.match(/charset=([^;]+)/i)?.[1]?.trim() || 'utf-8';
    let text;
    try {
        text = new TextDecoder(charset).decode(bytes);
    } catch {
        text = bytes.toString('utf8');
    }
    return { text, finalUrl: response.url, status: response.status };
}

function extractGenericImages(html, pageUrl) {
    const candidates = [];
    for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
        const attrs = attributes(match[0]);
        if (/^(?:og|twitter):image(?::secure_url)?$/i.test(attrs.property || attrs.name || '') && attrs.content) {
            candidates.push({ url: new URL(attrs.content, pageUrl).href, title: 'page-cover' });
        }
    }
    for (const match of html.matchAll(/<(?:img|a)\b[^>]*>/gi)) {
        const attrs = attributes(match[0]);
        const rawUrl = attrs['data-src'] || attrs.src || attrs.href;
        if (!rawUrl || !/\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(rawUrl)) continue;
        candidates.push({
            url: new URL(rawUrl, pageUrl).href,
            title: attrs.alt || attrs.title || path.basename(new URL(rawUrl, pageUrl).pathname)
        });
    }
    return uniqueByUrl(candidates);
}

async function extractTelcontar(pageUrl) {
    const { text, finalUrl } = await fetchText(pageUrl);
    const candidates = [];
    for (const match of text.matchAll(/<a\b[^>]*>/gi)) {
        const attrs = attributes(match[0]);
        if (!attrs.href || !/\.(?:gif|jpe?g|png|webp)(?:[?#]|$)/i.test(attrs.href)) continue;
        candidates.push({
            url: new URL(attrs.href, finalUrl).href,
            title: path.basename(new URL(attrs.href, finalUrl).pathname)
        });
    }
    return uniqueByUrl(candidates);
}

function scopeForumPost(html, pageUrl) {
    const postId = new URL(pageUrl).searchParams.get('p');
    if (!postId) return html;
    const markers = [`id="p${postId}"`, `id='p${postId}'`, `id="msg_${postId}"`, `id='msg_${postId}'`];
    const start = markers.map((marker) => html.indexOf(marker)).find((index) => index >= 0);
    if (start === undefined) return html;
    const remaining = html.slice(start + 20);
    const nextPost = remaining.match(/<div id="p\d+" class="post\b/i);
    const nextCandidates = [
        nextPost ? start + 20 + nextPost.index : -1,
        html.indexOf('<div class="post_wrapper">', start + 20)
    ].filter((index) => index > start);
    return html.slice(start, nextCandidates.length ? Math.min(...nextCandidates) : undefined);
}

async function extractDeskthority(pageUrl) {
    const { text, finalUrl } = await fetchText(pageUrl);
    const scoped = scopeForumPost(text, pageUrl);
    const candidates = [];
    for (const match of scoped.matchAll(/<img\b[^>]*class=(?:"[^"]*\bpostimage\b[^"]*"|'[^']*\bpostimage\b[^']*')[^>]*>/gi)) {
        const attrs = attributes(match[0]);
        if (!attrs.src) continue;
        const imageUrl = new URL(attrs.src, finalUrl);
        imageUrl.searchParams.delete('sid');
        candidates.push({ url: imageUrl.href, title: attrs.alt || `attachment-${imageUrl.searchParams.get('id') || ''}` });
    }
    return uniqueByUrl(candidates);
}

async function extractMkWiki(pageUrl) {
    const { text, finalUrl } = await fetchText(pageUrl);
    const candidates = [];
    for (const match of text.matchAll(/<img\b[^>]*class=(?:"[^"]*\bmw-file-element\b[^"]*"|'[^']*\bmw-file-element\b[^']*')[^>]*>/gi)) {
        const attrs = attributes(match[0]);
        if (!attrs.src) continue;
        const imageUrl = new URL(attrs.src, finalUrl);
        imageUrl.pathname = imageUrl.pathname.replace(/\/images\/thumb\/(.+?\/[^/]+)\/[^/]+$/, '/images/$1');
        candidates.push({ url: imageUrl.href, title: attrs.alt || path.basename(imageUrl.pathname) });
    }
    return uniqueByUrl(candidates);
}

async function extractImgur(pageUrl) {
    const albumId = new URL(pageUrl).pathname.match(/\/a\/([^/?#]+)/)?.[1];
    if (!albumId) return [];
    const endpoint = `https://imgur.com/ajaxalbums/getimages/${albumId}/hit.json?all=true`;
    const { text } = await fetchText(endpoint, { referer: pageUrl, accept: 'application/json' });
    const payload = JSON.parse(text);
    return uniqueByUrl((payload.data?.images || []).map((image, index) => ({
        url: `https://i.imgur.com/${image.hash}${image.ext || '.jpg'}`,
        title: image.title || `imgur-${String(index + 1).padStart(3, '0')}`
    })));
}

async function extractFlickr(pageUrl) {
    const albumId = new URL(pageUrl).pathname.match(/\/(?:sets|albums)\/(\d+)/)?.[1];
    if (!albumId) return [];
    const { text } = await fetchText(pageUrl);
    const apiKey = text.match(/global_magisterLudi\s*=\s*'([^']+)'/)?.[1]
        || text.match(/site_key\s*=\s*"([^"]+)"/)?.[1];
    if (!apiKey) throw new Error('Flickr API key was not found in the album page');
    const apiUrl = new URL('https://www.flickr.com/services/rest/');
    apiUrl.search = new URLSearchParams({
        method: 'flickr.photosets.getPhotos',
        api_key: apiKey,
        photoset_id: albumId,
        extras: 'url_o,url_k,url_h,url_l,original_format',
        per_page: '500',
        format: 'json',
        nojsoncallback: '1'
    });
    const { text: json } = await fetchText(apiUrl.href, { referer: pageUrl, accept: 'application/json' });
    const payload = JSON.parse(json);
    if (payload.stat !== 'ok') throw new Error(payload.message || 'Flickr API request failed');
    return uniqueByUrl((payload.photoset?.photo || []).map((photo) => ({
        url: photo.url_o || photo.url_k || photo.url_h || photo.url_l,
        title: photo.title || `flickr-${photo.id}`
    })));
}

async function extractVintageComputer(pageUrl) {
    const { text, finalUrl } = await fetchText(pageUrl);
    const matches = [...text.matchAll(/https?:\/\/vintagecomputer\.ca\/wp-content\/uploads\/[^"'<>\s]+\.(?:jpe?g|png|webp)/gi)];
    return uniqueByUrl(matches.map((match) => {
        const url = match[0].replace(/-\d+x\d+(?=\.(?:jpe?g|png|webp)$)/i, '');
        return { url: new URL(url, finalUrl).href, title: path.basename(new URL(url).pathname) };
    }).filter((candidate) => /Cherry-B70-Pro-/i.test(candidate.url)));
}

async function extractGeekhack(pageUrl) {
    const { text, finalUrl } = await fetchText(pageUrl);
    const postId = new URL(pageUrl).searchParams.get('p') || pageUrl.match(/msg(\d+)/)?.[1];
    let scoped = text;
    if (postId) {
        const start = text.indexOf(`id="msg_${postId}"`);
        if (start >= 0) {
            const next = text.indexOf('<div class="inner" id="msg_', start + 20);
            scoped = text.slice(start, next > start ? next : undefined);
        }
    }
    if (postId === '1949091') {
        const keyboardStart = scoped.indexOf('And finally, this big beast');
        const keyboardEnd = scoped.indexOf('Unsure what I will do', keyboardStart);
        if (keyboardStart >= 0) scoped = scoped.slice(keyboardStart, keyboardEnd > keyboardStart ? keyboardEnd : undefined);
    }
    const candidates = [];
    for (const match of scoped.matchAll(/<a\b[^>]*>/gi)) {
        const attrs = attributes(match[0]);
        if (!attrs.href) continue;
        if (/action=dlattach/i.test(attrs.href) || /\.(?:gif|jpe?g|png|webp)(?:[?#]|$)/i.test(attrs.href)) {
            candidates.push({
                url: new URL(attrs.href, finalUrl).href,
                title: attrs.id || path.basename(new URL(attrs.href, finalUrl).pathname)
            });
        }
    }
    return uniqueByUrl(candidates);
}

async function extractClassicCmp(pageUrl) {
    const { text } = await fetchText(pageUrl);
    const ids = [...text.matchAll(/drive\.google\.com\/open\?id=([\w-]+)/g)].map((match) => match[1]);
    return [...new Set(ids)].map((id, index) => ({
        url: `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
        title: `google-drive-${String(index + 1).padStart(2, '0')}`
    }));
}

async function extractGooglePhotos(albumUrl) {
    const { text } = await fetchText(albumUrl, { userAgent: 'Mozilla/5.0', referer: albumUrl });
    const normalized = text.replace(/\\u003d/g, '=').replace(/\\u0026/g, '&').replace(/\\\//g, '/');
    const bases = [...normalized.matchAll(/https:\/\/lh3\.googleusercontent\.com\/pw\/[^"'<>\s=)]+/g)]
        .map((match) => match[0]);
    return [...new Set(bases)].map((base, index) => ({
        url: `${base}=d`,
        title: `google-photos-${String(index + 1).padStart(3, '0')}`
    }));
}

async function extractReddit(pageUrl) {
    const postId = new URL(pageUrl).pathname.match(/comments\/([^/]+)/)?.[1];
    if (!postId) return [];
    const apiUrl = `https://api.pullpush.io/reddit/search/submission/?ids=${postId}`;
    const { text } = await fetchText(apiUrl, { referer: pageUrl, accept: 'application/json' });
    const selftext = JSON.parse(text).data?.[0]?.selftext || '';
    const links = [...selftext.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)]
        .map((match) => ({ label: match[1], url: match[2] }));
    let albumUrls = links
        .filter((link) => /Early\/?\s*Cherry Terminal|More Pics/i.test(link.label))
        .map((link) => link.url);
    if (postId === '8ppd96' && albumUrls.length === 0) {
        albumUrls = [
            'https://photos.app.goo.gl/112CAvHeCAAc7Uti6',
            'https://photos.app.goo.gl/wTQAhykokGBFJcu88'
        ];
    }
    const albums = await Promise.all(albumUrls.map((url) => extractGooglePhotos(url)));
    return uniqueByUrl(albums.flat());
}

async function extractWorthpoint(pageUrl) {
    let html = '';
    try {
        ({ text: html } = await fetchText(pageUrl, { retries: 5 }));
    } catch {
        // The static fallback below still preserves any known preview image.
    }
    const urls = [...html.matchAll(/https:\/\/thumbs\.worthpoint\.com\/(?:zoom\/|worthpoint\/)?[^"'<>\\\s]+/gi)]
        .map((match) => decodeHtml(match[0]).replace(/&description=.*$/, ''));
    const preferred = urls.filter((url) => /\/zoom\//.test(url));
    const preview = [...html.matchAll(/<meta\b[^>]*property=(?:"og:image"|'og:image')[^>]*>/gi)]
        .map((match) => attributes(match[0]).content)
        .filter((url) => url?.includes('thumbs.worthpoint.com'));
    const fallbacks = SPECIAL_IMAGE_FALLBACKS.get(pageUrl) || [];
    return uniqueByUrl([...preferred, ...preview, ...fallbacks].map((url, index) => ({
        url,
        title: `worthpoint-${String(index + 1).padStart(2, '0')}`
    })));
}

async function extractEbay(pageUrl) {
    let html = '';
    try {
        ({ text: html } = await fetchText(pageUrl, { retries: 4 }));
    } catch {
        // Expired eBay pages frequently return 403; known gallery fallbacks are used below.
    }
    const urls = [...html.matchAll(/https:\/\/i\.ebayimg\.com\/images\/g\/[^"'<>\\\s]+\.(?:jpe?g|png|webp)/gi)]
        .map((match) => match[0].replace(/\/s-l\d+\.(jpe?g|png|webp)$/i, '/s-l1600.$1'));
    const fallbacks = SPECIAL_IMAGE_FALLBACKS.get(pageUrl) || [];
    return uniqueByUrl([...urls, ...fallbacks].map((url, index) => ({
        url,
        title: `ebay-${String(index + 1).padStart(2, '0')}`
    })));
}

async function extractPageImages(pageUrl) {
    const hostname = new URL(pageUrl).hostname.replace(/^www\./, '');
    if (hostname === 'telcontar.net') return extractTelcontar(pageUrl);
    if (hostname === 'deskthority.net') return extractDeskthority(pageUrl);
    if (hostname === 'wiki.themk.org') return extractMkWiki(pageUrl);
    if (hostname === 'imgur.com') return extractImgur(pageUrl);
    if (hostname === 'flickr.com') return extractFlickr(pageUrl);
    if (hostname === 'vintagecomputer.ca') return extractVintageComputer(pageUrl);
    if (hostname === 'geekhack.org') return extractGeekhack(pageUrl);
    if (hostname === 'classiccmp.org') return extractClassicCmp(pageUrl);
    if (hostname === 'reddit.com') return extractReddit(pageUrl);
    if (hostname === 'worthpoint.com') return extractWorthpoint(pageUrl);
    if (/^ebay\./.test(hostname)) return extractEbay(pageUrl);
    const { text, finalUrl } = await fetchText(pageUrl);
    return extractGenericImages(text, finalUrl);
}

function detectImage(buffer, contentType = '', url = '') {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
    if (buffer.length >= 6 && /^GIF8[79]a$/.test(buffer.subarray(0, 6).toString('ascii'))) return { ext: 'gif', mime: 'image/gif' };
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
    if (buffer.length >= 12 && buffer.subarray(4, 12).toString('ascii').includes('ftypavif')) return { ext: 'avif', mime: 'image/avif' };
    const mime = contentType.split(';')[0].trim().toLowerCase();
    const extByMime = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif' };
    if (extByMime[mime]) return { ext: extByMime[mime], mime };
    const ext = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext)) return { ext: ext === 'jpeg' ? 'jpg' : ext, mime: mime || `image/${ext}` };
    return null;
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

async function mapLimit(items, limit, worker) {
    const results = new Array(items.length);
    let cursor = 0;
    async function run() {
        while (cursor < items.length) {
            const index = cursor;
            cursor += 1;
            results[index] = await worker(items[index], index);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
    return results;
}

function csvCell(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
    const { output, resume } = parseArgs(process.argv.slice(2));
    const rights = JSON.parse(fs.readFileSync(RIGHTS_REPORT, 'utf8'));
    const existingEntries = fs.existsSync(output)
        ? fs.readdirSync(output).filter((entry) => entry !== '.DS_Store')
        : [];
    if (existingEntries.length > 0 && !resume) {
        throw new Error(`Output directory is not empty: ${output}`);
    }
    if (resume && existingEntries.length > 0 && !fs.existsSync(path.join(output, '_download_report.json'))) {
        throw new Error(`Cannot resume because _download_report.json is missing: ${output}`);
    }
    fs.mkdirSync(output, { recursive: true });
    const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-reference-images-'));
    const pageCache = new Map();
    const assetCache = new Map();
    const modelStates = new Map();
    const pageResults = [];
    const downloadJobs = [];
    let discoveredCandidateCount = 0;

    const itemByModel = new Map();
    rights.items.forEach((item) => item.models.forEach((model) => itemByModel.set(model, item)));

    function referencePages(item) {
        if (item.reference_pages?.length) return item.reference_pages;
        const alias = item.reference_label?.match(/^See at (.+)$/i)?.[1];
        return alias && itemByModel.get(alias)?.reference_pages?.length
            ? itemByModel.get(alias).reference_pages
            : [];
    }

    function getModelState(model) {
        if (!modelStates.has(model)) {
            const folder = path.join(output, safeName(model, 'Unknown model'));
            fs.mkdirSync(folder, { recursive: true });
            const manifestPath = path.join(folder, '_manifest.json');
            const previous = resume && fs.existsSync(manifestPath)
                ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
                : { downloaded: [] };
            const downloaded = previous.downloaded || [];
            modelStates.set(model, {
                model,
                folder,
                hashes: new Map(downloaded.map((entry) => [entry.sha256, entry.file])),
                urls: new Set(downloaded.map((entry) => entry.image_url)),
                downloaded,
                duplicates: [],
                failures: [],
                pages: []
            });
        }
        return modelStates.get(model);
    }

    const pageTasks = rights.items.flatMap((item) => referencePages(item).map((pageUrl) => ({ item, pageUrl })));
    await mapLimit(pageTasks, 4, async ({ item, pageUrl }) => {
        if (!pageCache.has(pageUrl)) {
            pageCache.set(pageUrl, extractPageImages(pageUrl));
        }
        let candidates = [];
        let error = '';
        try {
            candidates = await pageCache.get(pageUrl);
        } catch (caught) {
            error = caught.message;
        }
        const pageResult = {
            source_row: item.source_row,
            models: item.models,
            page_url: pageUrl,
            candidate_count: candidates.length,
            status: error ? 'page_failed' : candidates.length ? 'images_found' : 'no_images_found',
            error
        };
        pageResults.push(pageResult);
        for (const model of item.models) {
            const state = getModelState(model);
            state.pages.push(pageResult);
            if (error) state.failures.push({ source_row: item.source_row, source_page: pageUrl, reason: error });
            if (!error && candidates.length === 0) {
                state.failures.push({ source_row: item.source_row, source_page: pageUrl, reason: 'No reference images were found on the page' });
            }
            candidates.forEach((candidate, candidateIndex) => {
                discoveredCandidateCount += 1;
                if (state.urls.has(candidate.url)) return;
                downloadJobs.push({
                    model,
                    sourceRow: item.source_row,
                    sourcePage: pageUrl,
                    candidateIndex,
                    candidate
                });
            });
        }
    });

    for (const item of rights.items) {
        if (referencePages(item).length === 0) {
            for (const model of item.models) {
                const state = getModelState(model);
                state.failures.push({
                    source_row: item.source_row,
                    source_page: '',
                    reason: `Reference has no URL: ${item.reference_label || 'unknown'}`
                });
            }
        }
    }

    async function cacheAsset(job) {
        const key = job.candidate.url;
        if (!assetCache.has(key)) {
            assetCache.set(key, (async () => {
                const response = await fetchResponse(key, {
                    accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.8',
                    referer: job.sourcePage,
                    retries: 3,
                    timeout: 90000
                });
                const buffer = Buffer.from(await response.arrayBuffer());
                const type = detectImage(buffer, response.headers.get('content-type') || '', response.url);
                if (!type || buffer.length < 1024) {
                    throw new Error(`Response is not a usable image (${response.headers.get('content-type') || 'unknown type'}, ${buffer.length} bytes)`);
                }
                const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
                const cachePath = path.join(cacheRoot, `${sha256}.${type.ext}`);
                if (!fs.existsSync(cachePath)) fs.writeFileSync(cachePath, buffer);
                return { cachePath, sha256, size: buffer.length, type, finalUrl: response.url };
            })());
        }
        return assetCache.get(key);
    }

    let completed = 0;
    await mapLimit(downloadJobs, 5, async (job) => {
        const state = getModelState(job.model);
        try {
            const asset = await cacheAsset(job);
            if (state.hashes.has(asset.sha256)) {
                state.duplicates.push({
                    source_row: job.sourceRow,
                    source_page: job.sourcePage,
                    image_url: job.candidate.url,
                    duplicate_of: state.hashes.get(asset.sha256)
                });
                return;
            }
            const originalBase = safeName(job.candidate.title || path.basename(new URL(job.candidate.url).pathname), 'image')
                .replace(/\.(?:avif|gif|jpe?g|png|webp)$/i, '');
            const prefix = `${String(job.sourceRow).padStart(2, '0')}_${sourceSlug(job.sourcePage)}_${String(job.candidateIndex + 1).padStart(3, '0')}`;
            let filename = `${prefix}_${originalBase}.${asset.type.ext}`;
            let suffix = 2;
            while (fs.existsSync(path.join(state.folder, filename))) {
                filename = `${prefix}_${originalBase}_${suffix}.${asset.type.ext}`;
                suffix += 1;
            }
            const destination = path.join(state.folder, filename);
            fs.copyFileSync(asset.cachePath, destination, fs.constants.COPYFILE_FICLONE);
            state.hashes.set(asset.sha256, filename);
            state.urls.add(job.candidate.url);
            state.downloaded.push({
                file: filename,
                bytes: asset.size,
                sha256: asset.sha256,
                mime_type: asset.type.mime,
                source_row: job.sourceRow,
                source_page: job.sourcePage,
                image_url: job.candidate.url,
                final_image_url: asset.finalUrl
            });
        } catch (error) {
            state.failures.push({
                source_row: job.sourceRow,
                source_page: job.sourcePage,
                image_url: job.candidate.url,
                reason: error.message
            });
        } finally {
            completed += 1;
            if (completed % 25 === 0 || completed === downloadJobs.length) {
                process.stdout.write(`Downloaded/checked ${completed}/${downloadJobs.length} image candidates\n`);
            }
        }
    });

    fs.rmSync(cacheRoot, { recursive: true, force: true });

    const models = [...modelStates.values()].sort((left, right) => left.model.localeCompare(right.model, 'en'));
    for (const state of models) {
        const manifest = {
            model: state.model,
            local_only: true,
            rights_status: 'Reference images require individual rights review before republication',
            downloaded: state.downloaded,
            duplicates: state.duplicates,
            failures: state.failures,
            pages: state.pages
        };
        fs.writeFileSync(path.join(state.folder, '_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    }

    const downloaded = models.flatMap((state) => state.downloaded.map((entry) => ({ model: state.model, ...entry })));
    const failures = models.flatMap((state) => state.failures.map((entry) => ({ model: state.model, ...entry })));
    const duplicates = models.flatMap((state) => state.duplicates.map((entry) => ({ model: state.model, ...entry })));
    const totalBytes = downloaded.reduce((sum, entry) => sum + entry.bytes, 0);
    const report = {
        generated_at: new Date().toISOString(),
        source: rights.source,
        output,
        local_only: true,
        summary: {
            source_rows: rights.items.length,
            model_folders: models.length,
            unique_reference_pages: new Set(pageTasks.map((task) => task.pageUrl)).size,
            image_candidates: discoveredCandidateCount,
            remaining_candidates_processed: downloadJobs.length,
            downloaded_files: downloaded.length,
            duplicate_images_skipped: duplicates.length,
            failures: failures.length,
            total_bytes: totalBytes,
            total_size: formatBytes(totalBytes)
        },
        page_results: pageResults.sort((left, right) => left.source_row - right.source_row),
        models: models.map((state) => ({
            model: state.model,
            folder: path.relative(output, state.folder),
            downloaded_files: state.downloaded.length,
            duplicate_images_skipped: state.duplicates.length,
            failures: state.failures.length
        })),
        downloaded,
        duplicates,
        failures
    };
    fs.writeFileSync(path.join(output, '_download_report.json'), `${JSON.stringify(report, null, 2)}\n`);

    const csvRows = [['model', 'status', 'file', 'bytes', 'source_row', 'source_page', 'image_url', 'reason']];
    downloaded.forEach((entry) => csvRows.push([
        entry.model, 'downloaded', entry.file, entry.bytes, entry.source_row, entry.source_page, entry.image_url, ''
    ]));
    failures.forEach((entry) => csvRows.push([
        entry.model, 'failed', '', '', entry.source_row, entry.source_page, entry.image_url || '', entry.reason
    ]));
    fs.writeFileSync(path.join(output, '_download_report.csv'), `${csvRows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`);

    const readme = [
        'Cherry Reference 图片本地整理',
        '',
        `资料表：${rights.source}`,
        `生成时间：${report.generated_at}`,
        `型号文件夹：${report.summary.model_folders}`,
        `成功下载：${report.summary.downloaded_files} 张（${report.summary.total_size}）`,
        `重复跳过：${report.summary.duplicate_images_skipped} 张`,
        `失败或无法提取：${report.summary.failures} 项`,
        '',
        '这些图片仅按用户要求下载到本地用于资料整理。Reference 图片的权利状态并未因此改变。',
        '未经逐项确认授权或许可范围，请勿上传到网站、阿里云 OSS 或重新公开发布。',
        '详细来源、原图 URL、哈希和失败原因见 _download_report.json / _download_report.csv。',
        '每个型号文件夹内另有 _manifest.json。',
        ''
    ].join('\n');
    fs.writeFileSync(path.join(output, '下载说明.txt'), readme);
    process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
});
