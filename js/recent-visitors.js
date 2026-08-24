(function () {
    'use strict';

    var config = window.CHERRY_VISITOR_CONFIG || {};
    var endpoint = String(config.endpoint || '').replace(/\/$/, '');
    var listElement = document.getElementById('recent-visitors-list');
    var paginationElement = document.getElementById('recent-visitors-pagination');
    var requestTimeout = 6500;

    if (!endpoint || !/^https:\/\//.test(endpoint)) {
        showStatus('页面访问服务暂时不可用，请稍后再试。', 'error');
        return;
    }

    function apiRequest(path, options) {
        var controller = new AbortController();
        var timeout = window.setTimeout(function () {
            controller.abort();
        }, requestTimeout);
        var requestOptions = Object.assign({
            credentials: 'omit',
            referrerPolicy: 'strict-origin-when-cross-origin',
            signal: controller.signal
        }, options || {});

        return fetch(endpoint + path, requestOptions).then(function (response) {
            if (!response.ok) {
                throw new Error('Visitor API returned ' + response.status);
            }
            return response.json();
        }).finally(function () {
            window.clearTimeout(timeout);
        });
    }

    function storageKey(path) {
        return 'cherry-page-visit:' + path;
    }

    function wasRecentlyRecorded(path) {
        try {
            var recordedAt = Number(sessionStorage.getItem(storageKey(path)) || 0);
            return Date.now() - recordedAt < 60000;
        } catch (_error) {
            return false;
        }
    }

    function rememberVisit(path) {
        try {
            sessionStorage.setItem(storageKey(path), String(Date.now()));
        } catch (_error) {
            // The Worker still performs server-side deduplication when storage is unavailable.
        }
    }

    function recordVisit() {
        var path = window.location.pathname || '/';
        if (wasRecentlyRecorded(path)) return Promise.resolve();

        return apiRequest('/api/visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: path }),
            keepalive: true
        }).then(function () {
            rememberVisit(path);
        }).catch(function () {
            // Visitor statistics must never block or alter normal page rendering.
        });
    }

    function showStatus(message, state) {
        if (!listElement) return;
        listElement.replaceChildren();

        var status = document.createElement('p');
        status.className = 'recent-visitors-status recent-visitors-status-' + (state || 'loading');
        status.textContent = message;
        listElement.appendChild(status);

        if (paginationElement) paginationElement.hidden = true;
    }

    function formatTime(timestamp) {
        var date = new Date(Number(timestamp) * 1000);
        if (Number.isNaN(date.getTime())) return '时间未知';

        var parts = new Intl.DateTimeFormat('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(date);
        var values = {};
        parts.forEach(function (part) {
            values[part.type] = part.value;
        });
        return values.year + '-' + values.month + '-' + values.day + ' ' + values.hour + ':' + values.minute;
    }

    function createVisitorRow(item) {
        var row = document.createElement('div');
        row.className = 'recent-visitor-row';
        row.setAttribute('role', 'listitem');

        var time = document.createElement('time');
        time.className = 'recent-visitor-time';
        time.dateTime = new Date(Number(item.visitedAt) * 1000).toISOString();
        time.textContent = formatTime(item.visitedAt);

        var ip = document.createElement('span');
        ip.className = 'recent-visitor-ip';
        ip.textContent = item.ip || '未知';

        var location = document.createElement('span');
        location.className = 'recent-visitor-location';
        location.textContent = item.location || '未知地区';

        row.append(time, ip, location);
        return row;
    }

    function paginationButton(label, page, disabled, current) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'recent-visitors-page-button';
        button.textContent = label;
        button.disabled = disabled;
        if (current) button.setAttribute('aria-current', 'page');
        if (!disabled && !current) {
            button.addEventListener('click', function () {
                loadVisits(page);
            });
        }
        return button;
    }

    function renderPagination(pagination) {
        if (!paginationElement) return;

        var current = Number(pagination.page) || 1;
        var totalPages = Math.min(5, Number(pagination.totalPages) || 1);
        paginationElement.replaceChildren();
        paginationElement.appendChild(paginationButton('上一页', current - 1, current <= 1, false));

        for (var page = 1; page <= totalPages; page += 1) {
            paginationElement.appendChild(paginationButton(String(page), page, page === current, page === current));
        }

        paginationElement.appendChild(paginationButton('下一页', current + 1, current >= totalPages, false));
        paginationElement.hidden = totalPages <= 1;
    }

    function renderVisits(payload) {
        var items = Array.isArray(payload.items) ? payload.items : [];
        if (!items.length) {
            showStatus('还没有页面访问记录，欢迎成为第一位访客。', 'empty');
            return;
        }

        listElement.replaceChildren();
        items.forEach(function (item) {
            listElement.appendChild(createVisitorRow(item));
        });
        renderPagination(payload.pagination || {});
    }

    function loadVisits(page) {
        if (!listElement) return Promise.resolve();

        showStatus('正在加载访问记录...', 'loading');
        return apiRequest('/api/visits?page=' + encodeURIComponent(page || 1))
            .then(renderVisits)
            .catch(function () {
                showStatus('页面访问记录暂时无法加载，请稍后再试。', 'error');
            });
    }

    recordVisit().finally(function () {
        if (listElement) loadVisits(1);
    });
}());
