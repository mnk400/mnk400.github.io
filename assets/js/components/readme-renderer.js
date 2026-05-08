(function () {
    const container = document.querySelector(".github-readme__content");
    if (!container) return;

    const repo = container.getAttribute("data-repo");
    const branch = container.getAttribute("data-branch") || "main";
    const rawBase = "https://raw.githubusercontent.com/" + repo + "/" + branch;
    const url = rawBase + "/README.md";

    marked.setOptions({
        gfm: true,
        breaks: false,
    });

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
            const imgs = container.querySelectorAll("img");
            for (let i = 0; i < imgs.length; i++) {
                imgs[i].setAttribute("data-zoomable", "");
            }
        })
        .catch(function () {
            container.innerHTML =
                '<p>Could not load README. <a href="https://github.com/' +
                repo +
                '" target="_blank" rel="noopener noreferrer">View it on GitHub</a>.</p>';
        });
})();
