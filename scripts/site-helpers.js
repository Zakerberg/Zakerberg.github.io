'use strict';

const DEFAULT_DESCRIPTION_LIMIT = 160;
const DEFAULT_CARD_SUMMARY_LIMIT = 120;

function trimTrailingSlash(value = '') {
    return String(value || '').replace(/\/+$/, '');
}

function collapseWhitespace(value = '') {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripHtml(value = '') {
    return collapseWhitespace(String(value || '').replace(/<[^>]*>/g, ' '));
}

function limitText(value, maxLength) {
    const normalized = collapseWhitespace(value);
    if (normalized.length <= maxLength) {
        return normalized;
    }

    return normalized.slice(0, maxLength).replace(/[，、；：,\s]+$/u, '') + '...';
}

function uniqueValues(values) {
    const seen = new Set();
    const result = [];

    values.forEach((item) => {
        const normalized = collapseWhitespace(item);
        if (!normalized || seen.has(normalized)) {
            return;
        }

        seen.add(normalized);
        result.push(normalized);
    });

    return result;
}

function collectionNames(collection) {
    if (!collection) {
        return [];
    }

    const items = [];
    if (Array.isArray(collection)) {
        collection.forEach((item) => items.push(item));
    } else if (typeof collection.forEach === 'function') {
        collection.forEach((item) => items.push(item));
    }

    return items.map((item) => item && (item.name || item)).filter(Boolean);
}

function buildAbsoluteUrl(path, config, urlFor) {
    const siteUrl = trimTrailingSlash(config.url || '');
    const resolved = path ? urlFor(path) : '/';

    if (/^https?:\/\//i.test(resolved)) {
        return resolved;
    }

    if (!siteUrl) {
        return resolved;
    }

    return `${siteUrl}${resolved.startsWith('/') ? resolved : `/${resolved}`}`;
}

function findFirstImage(content = '') {
    const html = String(content || '');
    let match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match) {
        return match[1];
    }

    match = html.match(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
    return match ? match[1] : '';
}

function buildSpecSummary(page = {}) {
    const parts = [];
    const contentLayout = collapseWhitespace(page.layout || '');
    if (page.model) parts.push(`型号 ${page.model}`);
    if (page.series) parts.push(`系列 ${page.series}`);
    if (page.era) parts.push(`年代 ${page.era}`);
    if (contentLayout && !['post', 'page', 'draft', 'bb'].includes(contentLayout)) {
        parts.push(`布局 ${contentLayout}`);
    }
    if (page.switch_interface) parts.push(`轴体/接口 ${page.switch_interface}`);
    if (page.region_client) parts.push(`地区/客户 ${page.region_client}`);
    return parts.join('，');
}

function buildDescription(page = {}, config = {}) {
    if (page.description) {
        return limitText(page.description, DEFAULT_DESCRIPTION_LIMIT);
    }

    const title = collapseWhitespace(page.title || '');
    const summary = stripHtml(page.summary || '');
    const excerpt = stripHtml(page.excerpt || '');
    const content = stripHtml(page.content || '');
    const specSummary = buildSpecSummary(page);

    const fragments = [];
    if (summary && summary !== title) {
        fragments.push(summary);
    }
    if (specSummary) {
        fragments.push(specSummary);
    }
    if (title) {
        fragments.push(`${title} 的图片、资料与整理记录。`);
    }
    if (fragments.length === 0 && excerpt) {
        fragments.push(excerpt);
    }
    if (fragments.length === 0 && content) {
        fragments.push(content);
    }
    if (fragments.length === 0) {
        fragments.push(config.description || config.title || '');
    }

    return limitText(uniqueValues(fragments).join('，'), DEFAULT_DESCRIPTION_LIMIT);
}

function buildKeywords(page = {}, config = {}) {
    const keywords = [];
    if (Array.isArray(page.keywords)) {
        keywords.push(...page.keywords);
    } else if (page.keywords) {
        keywords.push(...String(page.keywords).split(','));
    }

    keywords.push(
        page.title,
        page.model,
        page.series,
        page.era,
        page.layout,
        page.switch_interface,
        page.region_client
    );

    keywords.push(...collectionNames(page.categories));
    keywords.push(...collectionNames(page.tags));

    if (Array.isArray(config.keywords)) {
        keywords.push(...config.keywords);
    } else if (config.keywords) {
        keywords.push(...String(config.keywords).split(','));
    }

    return uniqueValues(keywords).join(', ');
}

function buildCardSummary(page = {}, config = {}) {
    const summary = stripHtml(page.summary || '');
    if (summary && summary !== collapseWhitespace(page.title || '')) {
        return limitText(summary, DEFAULT_CARD_SUMMARY_LIMIT);
    }

    const specSummary = buildSpecSummary(page);
    if (specSummary) {
        return limitText(specSummary, DEFAULT_CARD_SUMMARY_LIMIT);
    }

    const fallback = stripHtml(page.excerpt || page.content || page.description || config.description || '');
    return limitText(fallback || page.title || '', DEFAULT_CARD_SUMMARY_LIMIT);
}

function buildPageImage(page = {}, config = {}, urlFor) {
    const image = page.img
        || page.coverImg
        || findFirstImage(page.content)
        || (config.seo && config.seo.default_og_image)
        || '/medias/banner/0.jpg';

    return buildAbsoluteUrl(image, config, urlFor);
}

function buildPostSpecRows(page = {}) {
    return [
        { label: '型号', value: page.model },
        { label: '系列', value: page.series },
        { label: '年代', value: page.era },
        { label: '布局', value: page.layout },
        { label: '轴体/接口', value: page.switch_interface },
        { label: '地区/客户', value: page.region_client }
    ].filter((item) => collapseWhitespace(item.value));
}

function buildSourceMeta(page = {}) {
    const text = collapseWhitespace(page.source || '');
    const url = collapseWhitespace(page.source_url || '');

    if (!text && !url) {
        return null;
    }

    return {
        text: text || url,
        url
    };
}

function buildRelatedPdfs(page = {}) {
    let items = page.related_pdfs || page.related_pdf || [];
    if (!Array.isArray(items)) {
        items = [items];
    }

    return items.map((item) => {
        if (!item) {
            return null;
        }

        if (typeof item === 'string') {
            const url = collapseWhitespace(item);
            return url ? { title: url, url } : null;
        }

        const title = collapseWhitespace(item.title || item.name || item.url || item.link || '');
        const url = collapseWhitespace(item.url || item.link || '');
        if (!title && !url) {
            return null;
        }

        return {
            title: title || url,
            url
        };
    }).filter((item) => item && item.url);
}

hexo.extend.helper.register('absolute_url_for', function(path = '') {
    const targetPath = path || (this.page && this.page.path) || '/';
    return buildAbsoluteUrl(targetPath, this.config, this.url_for.bind(this));
});

hexo.extend.helper.register('page_description', function(page = this.page) {
    return buildDescription(page, this.config);
});

hexo.extend.helper.register('page_keywords', function(page = this.page) {
    return buildKeywords(page, this.config);
});

hexo.extend.helper.register('page_cover_image', function(page = this.page) {
    return buildPageImage(page, this.config, this.url_for.bind(this));
});

hexo.extend.helper.register('page_card_summary', function(page = this.page) {
    return buildCardSummary(page, this.config);
});

hexo.extend.helper.register('post_spec_rows', function(page = this.page) {
    return buildPostSpecRows(page);
});

hexo.extend.helper.register('post_source_meta', function(page = this.page) {
    return buildSourceMeta(page);
});

hexo.extend.helper.register('post_related_pdfs', function(page = this.page) {
    return buildRelatedPdfs(page);
});
