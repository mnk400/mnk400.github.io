(function () {
    const container = document.querySelector(".github-readme__content");
    if (!container) return;

    const host = container.closest(".reveal");
    const loading = host
        ? host.querySelector(".github-readme__loading")
        : null;

    const repo = container.getAttribute("data-repo");
    const branch = container.getAttribute("data-branch") || "main";
    const rawBase = "https://raw.githubusercontent.com/" + repo + "/" + branch;
    const url = rawBase + "/README.md";

    marked.setOptions({
        gfm: true,
        breaks: false,
    });

    const slowLoadTimer = loading
        ? setTimeout(function () {
              loading.hidden = false;
          }, 500)
        : null;

    function finish() {
        if (slowLoadTimer) clearTimeout(slowLoadTimer);
        if (loading) loading.hidden = true;
        if (host) host.classList.add("is-ready");
    }

    fetch(url)
        .then(function (res) {
            if (!res.ok) throw new Error(res.status);
            return res.text();
        })
        .then(function (md) {
            // Strip sections marked as site-only-hidden. Lets a README keep
            // content GitHub readers need (tagline, install) without it
            // duplicating the product hero on the site.
            //   <!-- site:strip-start -->
            //   …content removed when rendered on the site…
            //   <!-- site:strip-end -->
            md = md.replace(
                /<!--\s*site:strip-start\s*-->[\s\S]*?<!--\s*site:strip-end\s*-->/g,
                ""
            );

            // Rewrite relative image paths to raw.githubusercontent.com
            md = md.replace(
                /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
                function (match, alt, path) {
                    const cleaned = path.replace(/^\.\//, "");
                    return "![" + alt + "](" + rawBase + "/" + cleaned + ")";
                }
            );

            // Rewrite relative src in <img> tags
            md = md.replace(
                /<img\s([^>]*?)src=["'](?!https?:\/\/)([^"']+)["']/g,
                function (match, before, path) {
                    const cleaned = path.replace(/^\.\//, "");
                    return '<img ' + before + 'src="' + rawBase + "/" + cleaned + '"';
                }
            );

            container.innerHTML = marked.parse(md);

            // Resolve relative links to the GitHub blob view, and make all
            // links open in a new tab.
            const blobBase = "https://github.com/" + repo + "/blob/" + branch + "/";
            const links = container.querySelectorAll("a");
            for (let i = 0; i < links.length; i++) {
                const href = links[i].getAttribute("href");
                if (href && !/^([a-z][a-z0-9+\-.]*:|\/\/|#)/i.test(href)) {
                    links[i].setAttribute("href", blobBase + href.replace(/^\.\//, ""));
                }
                links[i].setAttribute("target", "_blank");
                links[i].setAttribute("rel", "noopener noreferrer");
            }

            // Make rendered images zoomable (image-zoom.js delegates on [data-zoomable])
            // and fade each one in once its bytes arrive so they don't pop abruptly.
            const imgs = container.querySelectorAll("img");
            for (let i = 0; i < imgs.length; i++) {
                const img = imgs[i];
                img.setAttribute("data-zoomable", "");
                if (img.complete && img.naturalWidth > 0) {
                    img.classList.add("loaded");
                } else {
                    const markLoaded = function () {
                        img.classList.add("loaded");
                    };
                    img.addEventListener("load", markLoaded, { once: true });
                    img.addEventListener("error", markLoaded, { once: true });
                }
            }

            finish();
        })
        .catch(function () {
            container.innerHTML =
                '<p>Could not load README. <a href="https://github.com/' +
                repo +
                '" target="_blank" rel="noopener noreferrer">View it on GitHub</a>.</p>';
            finish();
        });
})();
