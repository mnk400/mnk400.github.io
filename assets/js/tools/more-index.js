document.addEventListener("DOMContentLoaded", () => {
    const search = document.getElementById("more-search");
    const chips = document.getElementById("more-chips");
    const page = document.querySelector(".more-page");
    const empty = document.querySelector(".more-empty");

    if (!page) return;

    const sections = Array.from(page.querySelectorAll(".more-section"));
    const widgets = new Map();
    let activeCategory = "all";
    let query = "";

    sections.forEach((section) => {
        if (!section.hasAttribute("data-more-widget")) return;
        const toggle = section.querySelector(".more-section__widget-toggle");
        const sublist = section.querySelector(".more-section__sublist");
        const head = section.querySelector(".more-section__widget-head .more-section__item");
        if (!toggle || !sublist) return;

        const subitems = Array.from(section.querySelectorAll(".more-section__subitem"));
        widgets.set(section, { toggle, sublist, head, subitems, userExpanded: false, pendingOpen: null });

        toggle.addEventListener("click", () => {
            const w = widgets.get(section);
            w.userExpanded = !w.userExpanded;
            applyFilter();
        });
    });

    function setSublistOpen(widget, open) {
        const { sublist } = widget;
        const isCollapsed = sublist.classList.contains("collapsed");
        if (open && isCollapsed) {
            sublist.classList.remove("collapsed");
            sublist.style.maxHeight = sublist.scrollHeight + "px";
            const handler = (e) => {
                if (e.propertyName !== "max-height") return;
                sublist.style.maxHeight = "";
                sublist.removeEventListener("transitionend", handler);
                widget.pendingOpen = null;
            };
            widget.pendingOpen = handler;
            sublist.addEventListener("transitionend", handler);
        } else if (!open && !isCollapsed) {
            if (widget.pendingOpen) {
                sublist.removeEventListener("transitionend", widget.pendingOpen);
                widget.pendingOpen = null;
            }
            sublist.style.maxHeight = sublist.scrollHeight + "px";
            void sublist.offsetHeight;
            sublist.classList.add("collapsed");
        }
    }

    function applyFilter() {
        let visible = 0;

        sections.forEach((section) => {
            const matchesCategory =
                activeCategory === "all" ||
                section.dataset.moreCategory === activeCategory;
            const widget = widgets.get(section);

            const items = Array.from(
                section.querySelectorAll(".more-section__item")
            ).filter((item) => !widget || item !== widget.head);
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

            let sectionVisible = visibleItems.length > 0;

            if (widget) {
                let searchHitInSubitems = false;
                widget.subitems.forEach((sub) => {
                    const matchesQuery =
                        !query || sub.dataset.moreSearch.includes(query);
                    const show = matchesCategory && matchesQuery;
                    sub.hidden = !show;
                    if (show && query) searchHitInSubitems = true;
                });

                if (widget.head) {
                    const headMatchesQuery =
                        !query ||
                        widget.head.dataset.moreSearch.includes(query) ||
                        searchHitInSubitems;
                    const showHead = matchesCategory && headMatchesQuery;
                    widget.head.hidden = !showHead;
                    if (showHead) sectionVisible = true;
                }

                const categoryPicked =
                    activeCategory !== "all" && matchesCategory;
                const expanded =
                    categoryPicked || searchHitInSubitems || widget.userExpanded;

                widget.toggle.setAttribute(
                    "aria-expanded",
                    expanded ? "true" : "false"
                );
                setSublistOpen(widget, expanded);

                if (widget.head && !widget.head.hidden) visible += 1;
                visible += widget.subitems.filter((s) => !s.hidden).length;
            }

            section.hidden = !sectionVisible;
            visible += visibleItems.length;
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
