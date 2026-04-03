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

            // Make all links open in new tab
            const links = container.querySelectorAll("a");
            for (let i = 0; i < links.length; i++) {
                links[i].setAttribute("target", "_blank");
                links[i].setAttribute("rel", "noopener noreferrer");
            }
        })
        .catch(function () {
            container.innerHTML =
                '<p>Could not load README. <a href="https://github.com/' +
                repo +
                '" target="_blank" rel="noopener noreferrer">View it on GitHub</a>.</p>';
        });
})();
