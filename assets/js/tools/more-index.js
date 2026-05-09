document.addEventListener("DOMContentLoaded", () => {
    const search = document.getElementById("more-search");
    const chips = document.getElementById("more-chips");
    const page = document.querySelector(".more-page");
    const empty = document.querySelector(".more-empty");

    if (!page) return;

    const sections = Array.from(page.querySelectorAll(".more-section"));
    let activeCategory = "all";
    let query = "";

    function applyFilter() {
        let visible = 0;

        sections.forEach((section) => {
            const matchesCategory =
                activeCategory === "all" ||
                section.dataset.moreCategory === activeCategory;
            const items = Array.from(section.querySelectorAll(".more-section__item"));
            const visibleItems = [];

            items.forEach((item) => {
                const matchesQuery =
                    !query || item.dataset.moreSearch.includes(query);
                const show = matchesCategory && matchesQuery;
                item.hidden = !show;
                if (show) visibleItems.push(item);
            });

            items.forEach((item) => {
                const sep = item.querySelector(".more-section__sep");
                if (sep) sep.hidden = item === visibleItems[visibleItems.length - 1];
            });

            section.hidden = visibleItems.length === 0;
            visible += visibleItems.length;
        });

        if (empty) empty.hidden = visible !== 0;
    }

    if (search) {
        search.addEventListener("input", () => {
            query = search.value.trim().toLowerCase();
            applyFilter();
        });
    }

    if (chips) {
        chips.addEventListener("change", (e) => {
            activeCategory = e.detail && e.detail.value ? e.detail.value : "all";
            applyFilter();
        });
    }
});
