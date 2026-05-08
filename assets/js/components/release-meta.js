(function () {
    const els = document.querySelectorAll("[data-release-repo]");
    if (!els.length) return;

    const TTL_MS = 1000 * 60 * 60 * 6;
    const cacheKey = function (repo) { return "release-meta:" + repo; };

    function relativeDate(iso) {
        const then = new Date(iso).getTime();
        const diff = Date.now() - then;
        const day = 86400000;
        if (diff < day) return "today";
        if (diff < day * 2) return "yesterday";
        if (diff < day * 30) return Math.round(diff / day) + " days ago";
        if (diff < day * 365) {
            const m = Math.max(1, Math.round(diff / (day * 30)));
            return m + (m === 1 ? " month ago" : " months ago");
        }
        const y = Math.max(1, Math.round(diff / (day * 365)));
        return y + (y === 1 ? " year ago" : " years ago");
    }

    function render(el, data) {
        const v = el.querySelector(".product__release-version");
        const d = el.querySelector(".product__release-date");
        if (v && data.tag_name) v.textContent = data.tag_name;
        if (d && data.published_at) d.textContent = "updated " + relativeDate(data.published_at);
        const prevMeta = el.previousElementSibling;
        if (prevMeta && prevMeta.classList.contains("product__meta-item")) {
            prevMeta.classList.add("product__meta-item--before-release");
        }
        el.hidden = false;
    }

    function getCached(repo) {
        try {
            const raw = localStorage.getItem(cacheKey(repo));
            if (!raw) return null;
            const obj = JSON.parse(raw);
            if (!obj || !obj.t || Date.now() - obj.t > TTL_MS) return null;
            return obj.d;
        } catch (e) { return null; }
    }

    function setCached(repo, data) {
        try {
            localStorage.setItem(cacheKey(repo), JSON.stringify({ t: Date.now(), d: data }));
        } catch (e) {}
    }

    els.forEach(function (el) {
        const repo = el.getAttribute("data-release-repo");
        if (!repo) return;

        const cached = getCached(repo);
        if (cached) { render(el, cached); return; }

        fetch("https://api.github.com/repos/" + repo + "/releases/latest")
            .then(function (res) {
                if (!res.ok) throw new Error(res.status);
                return res.json();
            })
            .then(function (data) {
                const slim = { tag_name: data.tag_name, published_at: data.published_at };
                setCached(repo, slim);
                render(el, slim);
            })
            .catch(function () {});
    });
})();
