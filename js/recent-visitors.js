(function () {
    'use strict';

    var config = window.CHERRY_VISITOR_CONFIG || {};
    var endpoint = String(config.endpoint || '').replace(/\/$/, '');
    var listElement = document.getElementById('recent-visitors-list');
    var paginationElement = document.getElementById('recent-visitors-pagination');
    var challengeElement = document.getElementById('recent-visitors-challenge');
    var challengeContainer = document.getElementById('recent-visitors-turnstile');
    var challengeStatus = document.getElementById('recent-visitors-challenge-status');
    var challengeClose = document.querySelector('.recent-visitors-challenge-close');
    var requestTimeout = 6500;
    var lastPageRequestAt = 0;
    var pendingChallengePage = 0;

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
            return response.json().catch(function () { return {}; }).then(function (payload) {
                if (!response.ok) {
                    var error = new Error('Visitor API returned ' + response.status);
                    error.payload = payload;
                    throw error;
                }
                return payload;
            });
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

    function visitorPass() {
        try {
            return sessionStorage.getItem('cherry-human-pass') || '';
        } catch (_error) {
            return '';
        }
    }

    function rememberHumanPass(pass) {
        try {
            sessionStorage.setItem('cherry-human-pass', pass);
        } catch (_error) {
            // The pass is optional; the visitor can verify again if storage is unavailable.
        }
    }

    function pageRequestHeaders(page) {
        var now = Date.now();
        var interval = lastPageRequestAt ? Math.round((now - lastPageRequestAt) / 1000) : 0;
        lastPageRequestAt = now;
        return {
            'X-Visitor-Pass': visitorPass(),
            'X-Visitor-Page-Count': String(Math.max(Number(page) || 1, 1)),
            'X-Visitor-Page-Interval': String(interval)
        };
    }

    function closeChallenge() {
        pendingChallengePage = 0;
        if (challengeElement) challengeElement.hidden = true;
        if (challengeContainer && window.turnstile) {
            challengeContainer.replaceChildren();
        }
    }

    function openChallenge(page) {
        pendingChallengePage = page;
        if (!challengeElement || !challengeContainer || !config.turnstileSiteKey) {
            showStatus('当前访问记录需要验证，但验证服务尚未配置。', 'error');
            return Promise.reject(new Error('Turnstile is not configured'));
        }

        challengeElement.hidden = false;
        challengeStatus.textContent = '正在加载验证...';

        return new Promise(function (resolve, reject) {
            var startedAt = Date.now();
            var renderWhenReady = function () {
                if (!window.turnstile) {
                    if (Date.now() - startedAt > 7000) {
                        challengeStatus.textContent = '验证服务加载失败，请稍后重试。';
                        reject(new Error('Turnstile did not load'));
                        return;
                    }
                    window.setTimeout(renderWhenReady, 100);
                    return;
                }

                challengeContainer.replaceChildren();
                window.turnstile.render(challengeContainer, {
                    sitekey: config.turnstileSiteKey,
                    theme: 'auto',
                    action: 'visitor_pagination',
                    callback: function (token) {
                        challengeStatus.textContent = '验证成功，正在继续加载...';
                        apiRequest('/api/verify-human', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: token })
                        }).then(function (payload) {
                            if (!payload.verified || !payload.pass) throw new Error('Human verification failed');
                            rememberHumanPass(payload.pass);
                            closeChallenge();
                            resolve(page);
                        }).catch(function () {
                            challengeStatus.textContent = '验证未通过，请重新尝试。';
                            reject(new Error('Human verification failed'));
                        });
                    },
                    'error-callback': function () {
                        challengeStatus.textContent = '验证加载失败，请重新尝试。';
                        reject(new Error('Turnstile error'));
                    },
                    'expired-callback': function () {
                        challengeStatus.textContent = '验证已过期，请重新尝试。';
                    }
                });
            };
            renderWhenReady();
        });
    }

    if (challengeClose) challengeClose.addEventListener('click', closeChallenge);

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
        var locationText = document.createElement('span');
        locationText.className = 'recent-visitor-location-text';
        locationText.textContent = item.location || '未知地区';
        location.appendChild(locationText);

        if (item.network) {
            var network = document.createElement('small');
            network.className = 'recent-visitor-network';
            network.textContent = '网络：' + item.network;
            location.appendChild(network);
        }

        if (item.riskLabel) {
            var risk = document.createElement('span');
            var riskLevel = item.riskLevel === 'high' ? 'high' : 'medium';
            risk.className = 'recent-visitor-risk recent-visitor-risk-' + riskLevel;
            risk.textContent = item.riskLabel;
            risk.title = '依据网络运营商及数据中心特征推测，不代表确定结论';
            location.appendChild(risk);
        }

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

    function paginationEllipsis() {
        var ellipsis = document.createElement('span');
        ellipsis.className = 'recent-visitors-page-ellipsis';
        ellipsis.textContent = '...';
        ellipsis.setAttribute('aria-hidden', 'true');
        return ellipsis;
    }

    function visiblePages(current, totalPages) {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, function (_value, index) { return index + 1; });
        }

        var pages = [1, totalPages];
        for (var page = Math.max(2, current - 2); page <= Math.min(totalPages - 1, current + 2); page += 1) {
            pages.push(page);
        }
        return pages.sort(function (left, right) { return left - right; });
    }

    function renderPagination(pagination) {
        if (!paginationElement) return;

        var current = Number(pagination.page) || 1;
        var totalPages = Math.min(20, Number(pagination.totalPages) || 1);
        var pages = visiblePages(current, totalPages);
        paginationElement.replaceChildren();
        paginationElement.appendChild(paginationButton('上一页', current - 1, current <= 1, false));

        pages.forEach(function (page, index) {
            if (index > 0 && page - pages[index - 1] > 1) {
                paginationElement.appendChild(paginationEllipsis());
            }
            paginationElement.appendChild(paginationButton(String(page), page, page === current, page === current));
        });

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

    function loadVisits(page, afterChallenge) {
        if (!listElement) return Promise.resolve();

        showStatus('正在加载访问记录...', 'loading');
        var requestedPage = page || 1;
        return apiRequest('/api/visits?page=' + encodeURIComponent(requestedPage), {
            headers: pageRequestHeaders(requestedPage)
        })
            .then(renderVisits)
            .catch(function (error) {
                if (!afterChallenge && error.payload && error.payload.challengeRequired) {
                    return openChallenge(requestedPage).then(function () {
                        return loadVisits(requestedPage, true);
                    });
                }
                showStatus('页面访问记录暂时无法加载，请稍后再试。', 'error');
            });
    }

    recordVisit().finally(function () {
        if (listElement) loadVisits(1);
    });
}());
