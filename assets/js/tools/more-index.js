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
            // Bullet items (e.g. archive "all →") tag along passively — they show
            // only when at least one regular item in the section is visible, and
            // they're never the basis for "is this the last visible item" comma logic.
            const isBullet = (item) => item.classList.contains("more-section__item--bullet");
            const regular = items.filter((i) => !isBullet(i));
            const bullets = items.filter(isBullet);
            const visibleRegular = [];

            regular.forEach((item) => {
                const matchesQuery =
                    !query || item.dataset.moreSearch.includes(query);
                const show = matchesCategory && matchesQuery;
                item.hidden = !show;
                if (show) visibleRegular.push(item);
            });

            bullets.forEach((item) => {
                item.hidden = visibleRegular.length === 0;
            });

            regular.forEach((item) => {
                const sep = item.querySelector(".more-section__sep");
                if (sep) sep.hidden = item === visibleRegular[visibleRegular.length - 1];
            });

            const sectionVisible = visibleRegular.length > 0;
            section.hidden = !sectionVisible;
            visible += visibleRegular.length + (sectionVisible ? bullets.length : 0);
        });

        if (empty) empty.hidden = visible !== 0;
    }

    if (search) {
        search.addEventListener("search:change", (e) => {
            query = e.detail && e.detail.query ? e.detail.query : "";
            applyFilter();
        });
    }

    if (chips) {
        chips.addEventListener("change", (e) => {
            activeCategory = e.detail && e.detail.value ? e.detail.value : "all";
            applyFilter();
        });
    }

    applyFilter();
});
