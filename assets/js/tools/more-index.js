document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("more-search");
    const sections = document.querySelectorAll(".more-section");

    if (!searchInput || !sections.length) {
        return;
    }

    function updateSeparators(items) {
        const visibleItems = Array.from(items).filter((item) => !item.hidden);

        items.forEach((item) => {
            const sep = item.querySelector(".more-section__sep");
            if (sep) {
                sep.hidden = true;
            }
        });

        visibleItems.slice(0, -1).forEach((item) => {
            const sep = item.querySelector(".more-section__sep");
            if (sep) {
                sep.hidden = false;
            }
        });
    }

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();

        sections.forEach((section) => {
            const items = section.querySelectorAll(".more-section__item");
            let hasVisibleItem = false;

            items.forEach((item) => {
                const matches = !query || item.dataset.moreSearch.includes(query);
                item.hidden = !matches;
                hasVisibleItem = hasVisibleItem || matches;
            });

            section.hidden = !hasVisibleItem;
            updateSeparators(items);
        });
    });
});
