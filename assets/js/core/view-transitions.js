/**
 * Cross-document View Transitions
 *
 * - Detects navigation direction (forward/back) for directional animations
 * - For home↔sub navigations, removes individual breadcrumb transition names
 *   so the whole header crossfades as one unit (no overlapping elements)
 * - For sub→sub navigations, keeps breadcrumb names so shared elements stay put
 */
(function () {
    var breadcrumbSelectors = ['.breadcrumb-back', '.breadcrumb-home', '.breadcrumb-sep'];

    function setBreadcrumbNames(value) {
        breadcrumbSelectors.forEach(function (sel) {
            var el = document.querySelector(sel);
            if (el) el.style.viewTransitionName = value;
        });
    }

    function isHomePage(url) {
        var path = new URL(url).pathname;
        return path === '/' || path === '/index.html';
    }

    // OLD page, before snapshots: if going to homepage, fold breadcrumb
    // elements into the site-header group
    window.addEventListener('pageswap', function (event) {
        if (!event.viewTransition) return;

        var entry = event.activation && event.activation.entry;
        if (entry && isHomePage(entry.url)) {
            setBreadcrumbNames('none');
        }
    });

    // NEW page: detect direction + if coming from homepage, fold breadcrumb
    // elements into the site-header group
    window.addEventListener('pagereveal', function (event) {
        if (!event.viewTransition) return;

        var direction = 'forward';
        var navEntries = performance.getEntriesByType('navigation');
        if (navEntries.length > 0 && navEntries[0].type === 'back_forward') {
            direction = 'back';
        }
        document.documentElement.dataset.vtDirection = direction;

        var from = event.activation && event.activation.from;
        if (from && isHomePage(from.url)) {
            setBreadcrumbNames('none');
        }

        event.viewTransition.finished.then(function () {
            delete document.documentElement.dataset.vtDirection;
            setBreadcrumbNames('');
        });
    });
})();
