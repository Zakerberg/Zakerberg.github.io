(function () {
    'use strict';

    document.documentElement.classList.add('image-loader-enabled');

    const validRotations = new Set([0, 90, 180, 270]);

    function normalizedRotation(value) {
        const rotation = Number.parseInt(value, 10);
        return validRotations.has(rotation) ? rotation : 0;
    }

    function prepareImage(image) {
        if (image.dataset.imageLoaderReady === 'true') return;

        let shell = image.closest('.image-load-shell');
        if (!shell && image.closest('#articleContent')) {
            shell = document.createElement('span');
            shell.className = 'image-load-shell article-image-shell';
            image.parentNode.insertBefore(shell, image);
            shell.appendChild(image);
        }

        if (!shell) return;

        image.dataset.imageLoaderReady = 'true';
        image.classList.add('site-progressive-image');
        image.loading = 'lazy';
        image.decoding = 'async';
        image.style.setProperty('--image-rotation', normalizedRotation(image.dataset.rotate) + 'deg');

        const markLoaded = function () {
            shell.classList.remove('is-error');
            shell.classList.add('is-loaded');
        };
        const markError = function () {
            shell.classList.remove('is-loaded');
            shell.classList.add('is-error');
        };

        image.addEventListener('load', markLoaded, { once: true });
        image.addEventListener('error', markError, { once: true });

        if (image.complete) {
            if (image.naturalWidth > 0) {
                markLoaded();
            } else {
                markError();
            }
        }
    }

    function initializeImages() {
        document.querySelectorAll('.image-load-shell img, #articleContent img').forEach(prepareImage);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeImages, { once: true });
    } else {
        initializeImages();
    }
}());
