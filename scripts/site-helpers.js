'use strict';

const DEFAULT_DESCRIPTION_LIMIT = 160;
const DEFAULT_CARD_SUMMARY_LIMIT = 120;
const CHERRY_ARCHIVE_URL = 'https://www.kbdarchive.org/cherry/database.html';
const EMPTY_DATA_VALUES = new Set(['', '-', 'n/a', 'none', 'null', 'unknown']);

const FIELD_TRANSLATIONS = {
    switch: {
        black: 'Cherry MX 黑轴',
        blue: 'Cherry MX 青轴',
        brown: 'Cherry MX 茶轴',
        clear: 'Cherry MX Clear（透明轴）',
        red: 'Cherry MX 红轴',
        green: 'Cherry MX 绿轴',
        grey: 'Cherry MX Grey（灰轴）',
        gray: 'Cherry MX Grey（灰轴）',
        white: 'Cherry MX White（白轴）',
        'linear grey': 'Cherry MX 线性灰轴',
        'tactile grey': 'Cherry MX 段落灰轴',
        'dark blue': 'Cherry MX 深蓝轴',
        'pale blue': 'Cherry MX 浅蓝轴',
        'black,grey': 'Cherry MX 黑轴 / 灰轴',
        'black,blue': 'Cherry MX 黑轴 / 青轴',
        'brown/clear': 'Cherry MX 茶轴 / 透明轴',
        'clicky clear': 'Cherry MX 有声透明轴',
        'silent black': 'Cherry MX 静音黑轴',
        'silent red': 'Cherry MX 静音红轴',
        mx: 'Cherry MX（轴体未细分）',
        my: 'Cherry MY',
        ml: 'Cherry ML',
        rubberdome: '橡胶碗',
        'rubber dome': '橡胶碗'
    },
    interface: {
        din5: '5 针 DIN',
        'din 5': '5 针 DIN',
        'din5 xt': '5 针 DIN（XT）',
        'din5 ascii': '5 针 DIN（ASCII）',
        'ascii din5': '5 针 DIN（ASCII）',
        'xt din5': '5 针 DIN（XT）',
        'at/xt din5': '5 针 DIN（AT / XT）',
        'at din5': '5 针 DIN（AT）',
        'din + serial': 'DIN + 串口',
        'ps/2 + serial': 'PS/2 + 串口',
        serial: '串口',
        rj11: 'RJ11',
        'apple iie d-sub 15': 'Apple IIe 15 针 D-Sub',
        'dec-compatible': 'DEC 兼容接口',
        'ibm 3270-compatible': 'IBM 3270 兼容接口',
        ps2: 'PS/2',
        'ps/2': 'PS/2',
        usb: 'USB',
        at: 'AT',
        xt: 'XT',
        'xt/at': 'XT / AT 可切换',
        integrated: '集成式',
        proprietary: '专用接口',
        terminal: '终端接口',
        wireless: '无线'
    },
    layoutSize: {
        standard: '标准全尺寸',
        compact: '紧凑型',
        extended: '扩展型',
        numpad: '数字键盘',
        tenkeyless: '无数字区（TKL）',
        ergonomic: '人体工学',
        pos: 'POS 专用布局',
        xt: 'XT 布局',
        'extended xt': '扩展 XT 布局',
        lk201: 'DEC LK201 布局',
        'extended at': '扩展 AT 布局',
        at: 'AT 布局',
        '1800': '1800 紧凑全尺寸'
    },
    layoutType: {
        ansi: 'ANSI',
        iso: 'ISO',
        jis: 'JIS',
        bae: '大回车键布局（BAE）',
        ortholinear: '直列式',
        obsolete: '早期非标准制式'
    },
    language: {
        'english us': '英语（美国）',
        'english uk': '英语（英国）',
        german: '德语',
        french: '法语',
        italian: '意大利语',
        spanish: '西班牙语',
        russian: '俄语',
        chinese: '中文',
        japanese: '日语',
        korean: '韩语',
        swedish: '瑞典语',
        norwegian: '挪威语',
        danish: '丹麦语',
        finnish: '芬兰语',
        'finnish/swedish': '芬兰语 / 瑞典语',
        dutch: '荷兰语',
        swiss: '瑞士多语言',
        hungarian: '匈牙利语',
        portuguese: '葡萄牙语',
        yugoslavian: '南斯拉夫语',
        estonian: '爱沙尼亚语',
        belgian: '比利时配列',
        slovenian: '斯洛文尼亚语',
        blank: '无字键帽',
        czech: '捷克语',
        'french canadian': '加拿大法语',
        polish: '波兰语',
        slovakian: '斯洛伐克语',
        arabic: '阿拉伯语',
        hebrew: '希伯来语',
        'russian/ukrainian': '俄语 / 乌克兰语',
        hiragana: '日语平假名',
        greek: '希腊语',
        specialised: '专用配列',
        multilingual: '多语言'
    },
    keycapThickness: {
        thick: '厚壁',
        thin: '薄壁'
    },
    keycapProcess: {
        doubleshot: '双色注塑',
        'double-shot': '双色注塑',
        'dye-sublimated': '热升华',
        'dye sublimated': '热升华',
        lasered: '激光刻蚀',
        laser: '激光刻蚀',
        'pad print': '移印',
        'pad printed': '移印',
        engraved: '雕刻',
        printed: '印刷'
    },
    keycapScheme: {
        'beige two-tone': '米灰双色',
        'other two-tone': '非标准双色配色',
        'other single colour': '非标准单色',
        'white on black': '黑底白字',
        'black on white': '白底黑字',
        'black on beige': '米色底黑字',
        'cream on coffee': '奶油色字 / 咖啡色底',
        'coffee on cream': '咖啡色字 / 奶油色底',
        'ta orange': 'Triumph-Adler 橙色配色',
        'ncr two-tone': 'NCR 双色配色',
        'grey and white': '灰白配色',
        'goupil two-tone': 'Goupil 双色配色',
        'nixdorf/siemens two-tone': 'Nixdorf / Siemens 双色配色',
        'white on grey': '灰底白字',
        beige: '米色',
        mixed: '混合配色'
    },
    kro: {
        nkro: '全键无冲（NKRO）',
        '2kro': '2 键无冲（2KRO）',
        '6kro': '6 键无冲（6KRO）',
        'potential nkro': '可能支持全键无冲'
    },
    feature: {
        'relegendable keycaps': '可重定义键帽',
        'card reader': '读卡器',
        'card readers': '读卡器',
        programmable: '可编程',
        trackball: '轨迹球',
        trackpad: '触控板',
        touchpad: '触控板',
        passthrough: '接口直通',
        screen: '显示屏',
        phone: '电话功能',
        beeper: '蜂鸣器',
        'metal weight': '金属配重',
        'usb hub': 'USB 集线器',
        wireless: '无线',
        ergonomic: '人体工学',
        'led status bank': '状态指示灯组',
        'rotary encoder': '旋钮编码器',
        'apple compatible': 'Apple 兼容',
        'non-cherry keycaps': '非 Cherry 键帽',
        'beeper,metal weight': '蜂鸣器 / 金属配重',
        'unusual font': '特殊字体',
        ortholinear: '直列布局',
        'big legends': '大字符键帽',
        rollermouse: '滚轴鼠标',
        'server profile': '服务器专用配置',
        'card reader,touchpad': '读卡器 / 触控板'
    },
    caseColour: {
        beige: '米色',
        black: '黑色',
        white: '白色',
        grey: '灰色',
        gray: '灰色'
    },
    keycapSide: {
        'pad print': '侧面移印',
        lasered: '侧面激光刻蚀',
        doubleshot: '侧面双色注塑'
    },
    capsLock: {
        stepped: '阶梯式',
        fulltouch: '全触式',
        'full touch': '全触式',
        'alpha lock': 'Alpha Lock',
        'double step': '双阶梯式',
        'double step,alpha lock': '双阶梯式 / Alpha Lock',
        'control fulltouch': 'Control 全触式',
        'control fulltouch,double step': 'Control 全触式 / 双阶梯式',
        'control,double step': 'Control / 双阶梯式',
        'no caps lock': '无 Caps Lock 键'
    },
    window: {
        'lock keys': '锁定键指示窗',
        'single lock key': '单个锁定键指示窗',
        'lock and other': '锁定键及其他指示窗'
    },
    plate: {
        yes: '有定位板',
        no: '无定位板',
        'partially plated': '局部定位板'
    },
    caseStyle: {
        integrated: '集成式外壳',
        'lo-pro style': '低矮式外壳',
        'ibm style': 'IBM 风格外壳',
        luggable: '便携设备集成式',
        prism: '棱柱式外壳',
        pos: 'POS 外壳'
    },
    spacebar: {
        'no spacebar': '无空格键'
    },
    alternateModel: {
        'dec-compatible': 'DEC 兼容型号'
    }
};

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
    const model = page.article_number || page.full_model || page.model;
    const keyboardLayout = page.keyboard_layout || page.layout_size;
    const switchType = page.switch_type || page.switches || page.switch;
    const interfaceType = page.interface || page.keyboard_interface;
    const keycapMaterial = page.keycap_material;
    const legendProcess = page.legend_process || page.keycap_process;

    if (model) parts.push(`型号 ${model}`);
    if (page.series) parts.push(`系列 ${page.series}`);
    if (page.production_period || page.era) parts.push(`年代 ${page.production_period || page.era}`);
    if (keyboardLayout) parts.push(`布局 ${keyboardLayout}`);
    if (switchType) parts.push(`开关 ${switchType}`);
    if (interfaceType) parts.push(`接口 ${interfaceType}`);
    if (keycapMaterial) parts.push(`键帽材质 ${keycapMaterial}`);
    if (legendProcess) parts.push(`键帽工艺 ${legendProcess}`);
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
        page.article_number,
        page.full_model,
        page.model,
        page.series,
        page.production_period,
        page.era,
        page.keyboard_layout,
        page.layout_standard,
        page.switch_type,
        page.interface,
        page.keycap_material,
        page.legend_process,
        page.customer,
        page.region
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

function normalizeDataValues(value) {
    if (Array.isArray(value)) {
        return value.flatMap((item) => normalizeDataValues(item));
    }

    if (value === undefined || value === null || typeof value === 'object') {
        return [];
    }

    const normalized = collapseWhitespace(value);
    return normalized ? [normalized] : [];
}

function isMeaningfulDataValue(value, options = {}) {
    const normalized = collapseWhitespace(value).toLowerCase();
    if (EMPTY_DATA_VALUES.has(normalized)) {
        return false;
    }

    return !(options.hideOther && normalized === 'other');
}

function translateDataValue(group, value) {
    const normalized = collapseWhitespace(value);
    const translations = FIELD_TRANSLATIONS[group] || {};
    return translations[normalized.toLowerCase()] || normalized;
}

function formatDataValues(values, translationGroup, options = {}) {
    const normalized = normalizeDataValues(values)
        .filter((value) => isMeaningfulDataValue(value, options))
        .map((value) => translateDataValue(translationGroup, value));

    return uniqueValues(normalized).join(' / ');
}

function extractKeyboardIdentity(page = {}) {
    const explicitCandidates = [page.article_number, page.full_model, page.part_number, page.model];
    const fallbackCandidates = [page.title, page.summary];
    let match = null;

    for (const candidate of [...explicitCandidates, ...fallbackCandidates]) {
        const normalized = collapseWhitespace(candidate).toUpperCase();
        match = normalized.match(/\b(G[0-9A-Z]{2})[-\s](\d{3,5})([A-Z][A-Z0-9/]{0,11})?\b/);
        if (match) {
            break;
        }
    }

    if (!match) {
        return {
            series: collapseWhitespace(page.series || ''),
            model: '',
            extension: '',
            baseModel: '',
            fullModel: collapseWhitespace(page.article_number || page.full_model || page.model || '')
        };
    }

    const series = match[1];
    const model = match[2];
    const extension = match[3] || '';
    const baseModel = `${series}-${model}`;

    return {
        series,
        model,
        extension,
        baseModel,
        fullModel: `${baseModel}${extension}`
    };
}

function selectArchiveRecords(identity, archiveData = {}) {
    if (!identity.series || !identity.model || !Array.isArray(archiveData.records)) {
        return [];
    }

    const matches = archiveData.records.filter((record) => (
        collapseWhitespace(record.kbSeries).toUpperCase() === identity.series
        && collapseWhitespace(record.kbModel) === identity.model
    ));

    if (!identity.extension) {
        return matches;
    }

    const extension = identity.extension.toUpperCase();
    const exactMatches = matches.filter((record) => {
        const recordExtension = collapseWhitespace(record.kbExtension).toUpperCase();
        return recordExtension === extension || recordExtension.startsWith(extension);
    });

    return exactMatches.length > 0 ? exactMatches : matches;
}

function firstLocalValue(page, fieldNames, translationGroup, options = {}) {
    for (const fieldName of fieldNames) {
        const value = formatDataValues(page[fieldName], translationGroup, options);
        if (value) {
            return value;
        }
    }

    return '';
}

function archiveFieldValue(records, fieldNames, translationGroup, options = {}) {
    const values = [];
    records.forEach((record) => {
        fieldNames.forEach((fieldName) => values.push(record[fieldName]));
    });
    return formatDataValues(values, translationGroup, options);
}

function localOrArchiveValue(page, localFields, records, archiveFields, translationGroup, options = {}) {
    const localValue = firstLocalValue(page, localFields, translationGroup, options);
    if (localValue) {
        return { value: localValue, origin: 'local' };
    }

    const archiveValue = archiveFieldValue(records, archiveFields, translationGroup, options);
    return archiveValue ? { value: archiveValue, origin: 'archive' } : { value: '', origin: '' };
}

function formatCaseStyle(values) {
    return uniqueValues(normalizeDataValues(values)
        .filter((value) => isMeaningfulDataValue(value, { hideOther: true }))
        .map((value) => /^\d+$/.test(value) ? `${value} 系列外壳` : translateDataValue('caseStyle', value)))
        .join(' / ');
}

function buildArchiveFeatures(records) {
    const features = [];
    records.forEach((record) => {
        features.push(record.kbFeature);
        if (collapseWhitespace(record.switchLock).toLowerCase() === 'yes') features.push('带锁定开关');
        if (collapseWhitespace(record.switchSuper).toLowerCase() === 'yes') features.push('特殊开关位');
        if (collapseWhitespace(record.keycapReleg).toLowerCase() === 'yes') features.push('可重定义键帽');
        if (collapseWhitespace(record.keycapNonstandard).toLowerCase() === 'yes') features.push('非标准键帽');
        if (collapseWhitespace(record.layoutWin).toLowerCase() === 'yes') features.push('Windows 键位');
    });
    return formatDataValues(features, 'feature');
}

function sourceTitleForUrl(url) {
    const normalized = collapseWhitespace(url);
    if (/\.pdf(?:$|[?#])/i.test(normalized)) return '产品资料 PDF';
    if (/deskthority/i.test(normalized)) return 'Deskthority 资料';
    if (/imgur/i.test(normalized)) return '实物图集';
    if (/geekhack/i.test(normalized)) return 'Geekhack 资料';
    if (/reddit/i.test(normalized)) return 'Reddit 收藏记录';
    if (/youtu(?:be\.com|\.be)/i.test(normalized)) return 'YouTube 实物记录';

    try {
        return new URL(normalized).hostname.replace(/^www\./, '');
    } catch (error) {
        return normalized;
    }
}

function normalizeSources(page = {}, records = []) {
    let localSources = page.references || page.data_sources || page.data_source || [];
    if (!Array.isArray(localSources)) {
        localSources = [localSources];
    }

    const sources = localSources.map((item) => {
        if (!item) return null;
        if (typeof item === 'string') {
            const value = collapseWhitespace(item);
            const isUrl = /^https?:\/\//i.test(value);
            return value ? { title: isUrl ? sourceTitleForUrl(value) : value, url: isUrl ? value : '' } : null;
        }

        const url = collapseWhitespace(item.url || item.link || '');
        const title = collapseWhitespace(item.title || item.name || '') || sourceTitleForUrl(url);
        return title || url ? { title: title || url, url } : null;
    }).filter(Boolean);

    if (records.length > 0) {
        sources.push({ title: 'Cherry Archive 数据库', url: CHERRY_ARCHIVE_URL });
        records.forEach((record) => {
            ['ref1', 'ref2'].forEach((fieldName) => {
                const url = collapseWhitespace(record[fieldName] || '');
                if (url && /^https?:\/\//i.test(url)) {
                    sources.push({ title: sourceTitleForUrl(url), url });
                }
            });
        });
    }

    const seen = new Set();
    return sources.filter((source) => {
        const key = (source.url || source.title).toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 8);
}

function buildKeyboardCard(page = {}, archiveData = {}) {
    const identity = extractKeyboardIdentity(page);
    const records = selectArchiveRecords(identity, archiveData);
    const allExtensions = uniqueValues(records.map((record) => record.kbExtension || '未标注完整料号'));
    const isVariantAggregate = !identity.extension && allExtensions.length > 1;
    const groups = [
        { title: '基本信息', icon: 'fas fa-id-card', rows: [] },
        { title: '布局与连接', icon: 'fas fa-keyboard', rows: [] },
        { title: '开关与键帽', icon: 'fas fa-th', rows: [] }
    ];
    let hasLocalDetail = false;
    let hasArchiveDetail = false;

    const addRow = (groupIndex, label, result, isDetail = true) => {
        if (!result || !collapseWhitespace(result.value)) return;
        groups[groupIndex].rows.push({ label, value: result.value });
        if (isDetail && result.origin === 'local') hasLocalDetail = true;
        if (isDetail && result.origin === 'archive') hasArchiveDetail = true;
    };

    const modelValue = firstLocalValue(page, ['article_number', 'full_model', 'part_number', 'model'])
        || identity.fullModel || identity.baseModel;
    addRow(0, '型号', { value: modelValue, origin: modelValue && firstLocalValue(page, ['article_number', 'full_model', 'part_number', 'model']) ? 'local' : '' }, false);
    addRow(0, '系列', { value: firstLocalValue(page, ['series']) || identity.series, origin: page.series ? 'local' : '' }, false);
    if (isVariantAggregate) {
        addRow(0, '已知版本', { value: `${allExtensions.length} 个完整料号`, origin: 'archive' });
    }
    addRow(0, '年代', localOrArchiveValue(page, ['production_period', 'era'], records, [], ''));
    addRow(0, '客户 / 品牌', localOrArchiveValue(page, ['customer', 'client', 'region_client'], records, ['kbBrand'], '', { hideOther: true }));
    const localLanguage = firstLocalValue(page, ['region', 'language'], 'language');
    const archiveLanguage = archiveFieldValue(records, ['languagePrimary', 'languageSecondary'], 'language');
    addRow(0, '配列语言', localLanguage ? { value: localLanguage, origin: 'local' } : { value: archiveLanguage, origin: archiveLanguage ? 'archive' : '' });
    addRow(0, '产地', { value: firstLocalValue(page, ['made_in', 'country_of_origin']), origin: firstLocalValue(page, ['made_in', 'country_of_origin']) ? 'local' : '' });
    addRow(0, '替代型号', localOrArchiveValue(page, ['alternate_model', 'alternative_model'], records, ['altDesignation'], 'alternateModel'));

    addRow(1, '布局规格', localOrArchiveValue(page, ['keyboard_layout', 'layout_size'], records, ['layoutSize'], 'layoutSize', { hideOther: true }));
    addRow(1, '布局制式', localOrArchiveValue(page, ['layout_standard'], records, ['layoutType'], 'layoutType', { hideOther: true }));
    addRow(1, '接口', localOrArchiveValue(page, ['interface', 'keyboard_interface'], records, ['kbInterface'], 'interface'));
    addRow(1, '无冲', localOrArchiveValue(page, ['kro', 'key_rollover'], records, ['kbKRO'], 'kro'));
    const plate = localOrArchiveValue(page, ['switch_plate', 'plate'], records, ['switchPlate'], 'plate');
    addRow(1, '定位板', plate);
    const localCaseStyle = firstLocalValue(page, ['case_style'], '', { hideOther: true });
    const archiveCaseStyle = formatCaseStyle(records.map((record) => record.caseStyle));
    addRow(1, '外壳结构', localCaseStyle ? { value: localCaseStyle, origin: 'local' } : { value: archiveCaseStyle, origin: archiveCaseStyle ? 'archive' : '' });
    addRow(1, '外壳颜色', localOrArchiveValue(page, ['case_color', 'case_colour'], records, ['caseColour'], 'caseColour', { hideOther: true }));
    const localFeatures = firstLocalValue(page, ['features', 'feature'], 'feature');
    const archiveFeatures = buildArchiveFeatures(records);
    addRow(1, '功能特性', localFeatures ? { value: localFeatures, origin: 'local' } : { value: archiveFeatures, origin: archiveFeatures ? 'archive' : '' });

    addRow(2, '开关类型', localOrArchiveValue(page, ['switch_type', 'switches', 'switch'], records, ['kbSwitch'], 'switch'));
    addRow(2, '键帽材质', localOrArchiveValue(page, ['keycap_material'], records, ['keycapMaterial'], ''));
    addRow(2, '键帽厚度', localOrArchiveValue(page, ['keycap_thickness'], records, ['keycapThickness'], 'keycapThickness'));
    addRow(2, '键帽工艺', localOrArchiveValue(page, ['legend_process', 'keycap_process'], records, ['keycapPrimary'], 'keycapProcess'));
    addRow(2, '次级工艺', localOrArchiveValue(page, ['keycap_secondary_process'], records, ['keycapSub'], 'keycapProcess'));
    addRow(2, '键帽配色', localOrArchiveValue(page, ['keycap_scheme'], records, ['keycapScheme'], 'keycapScheme', { hideOther: true }));
    addRow(2, '侧刻工艺', localOrArchiveValue(page, ['side_legend_process'], records, ['keycapSide'], 'keycapSide'));
    addRow(2, '键帽行高', localOrArchiveValue(page, ['keycap_profile'], records, ['keycapBottomTop'], '', { hideOther: true }));
    addRow(2, '空格键', localOrArchiveValue(page, ['spacebar'], records, ['keycapSpace'], 'spacebar', { hideOther: true }));
    addRow(2, 'Caps Lock 键型', localOrArchiveValue(page, ['caps_lock'], records, ['keycapCaps'], 'capsLock'));
    addRow(2, '指示灯窗', localOrArchiveValue(page, ['keycap_window'], records, ['keycapWindow'], 'window', { hideOther: true }));

    const sources = normalizeSources(page, records);
    const relatedPdfs = buildRelatedPdfs(page);
    const notes = collapseWhitespace(page.notes || '');
    const hasContent = hasLocalDetail || hasArchiveDetail || Boolean(notes)
        || relatedPdfs.length > 0 || sources.length > 0;
    const badges = [];
    if (hasLocalDetail) badges.push('本地实物资料');
    if (records.length > 0) badges.push('Cherry Archive 数据补全');
    if (isVariantAggregate) badges.push('多版本汇总');

    return {
        groups: groups.filter((group) => group.rows.length > 0),
        sources,
        relatedPdfs,
        notes,
        badges,
        hasContent,
        isVariantAggregate,
        notice: isVariantAggregate
            ? `当前页面只识别到基础型号 ${identity.baseModel}；Cherry Archive 收录 ${allExtensions.length} 个已知完整料号。以下为各版本公开信息汇总，具体配置请以实物铭牌、开关和键帽照片为准。`
            : ''
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

hexo.extend.helper.register('post_keyboard_card', function(page = this.page, archiveData = {}) {
    return buildKeyboardCard(page, archiveData);
});

hexo.extend.helper.register('post_related_pdfs', function(page = this.page) {
    return buildRelatedPdfs(page);
});
