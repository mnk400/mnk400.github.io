document.addEventListener("DOMContentLoaded", () => {
    const browserForm = document.getElementById("historical-browser-form");
    const urlInput = document.getElementById("url-input");
    const iframeContainer = document.getElementById("historical-content-viewer");
    const goButton = document.getElementById("go-button");
    const timelineSlot = document.getElementById("year-timeline");
    const emptyState = document.getElementById("browser-empty-state");
    const loadingState = document.getElementById("browser-loading-state");
    const homeButton = document.getElementById("browser-home");
    const backButton = document.getElementById("browser-back");
    const forwardButton = document.getElementById("browser-forward");
    const starterButtons = document.querySelectorAll(".historical-browser-starter");

    if (!browserForm || !urlInput || !iframeContainer || !goButton || !timelineSlot) {
        console.error("Historical browser controls not found");
        return;
    }

    const defaultYear = 2007;
    let selectedYear = defaultYear;
    let yearSwitch = null;
    let navigationHistory = [];
    let currentHistoryIndex = -1;
    let isLoadingSnapshot = false;

    function buildYearSwitch() {
        const currentYear = new Date().getFullYear();
        const options = [];

        for (let year = currentYear; year >= 1998; year--) {
            options.push({ value: String(year), label: String(year) });
        }

        const switchWrap = window.buildSwitch({
            id: "year-switch",
            options,
            active: String(selectedYear),
            size: "small",
            ariaLabel: "Snapshot year",
        });

        timelineSlot.replaceChildren(switchWrap);
        yearSwitch = switchWrap.querySelector(".selection-switch") || switchWrap;

        yearSwitch.addEventListener("change", (event) => {
            setSelectedYear(Number(event.detail.value));

            if (currentHistoryIndex >= 0 && urlInput.value.trim()) {
                loadUrlInWaybackMachine(urlInput.value, selectedYear);
            }
        });

        centerSelectedYear();
    }

    function normalizeUrl(url) {
        const trimmedUrl = url.trim();

        if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
            return `http://${trimmedUrl}`;
        }

        return trimmedUrl;
    }

    function getReadableUrl(url) {
        return url.replace(/^https?:\/\//, "");
    }

    function getWaybackUrl(url, year) {
        const timestamp = `${year}0101000000`;
        return `https://web.archive.org/web/${timestamp}/${url}`;
    }

    function setLoadingState(isLoading) {
        isLoadingSnapshot = isLoading;

        if (loadingState) {
            loadingState.hidden = !isLoading;
        }

        if (emptyState) {
            emptyState.hidden = isLoading || currentHistoryIndex >= 0;
        }
    }

    function centerSelectedYear() {
        if (!yearSwitch) return;

        const active = yearSwitch.querySelector(".switch-option.active");
        if (!active) return;

        requestAnimationFrame(() => {
            yearSwitch.scrollLeft =
                active.offsetLeft -
                (yearSwitch.clientWidth - active.offsetWidth) / 2;
        });
    }

    function setSelectedYear(year) {
        selectedYear = Number(year);

        const manager = window.switchManager["year-switch"];
        if (manager) {
            manager.setActive(String(selectedYear));
        }

        centerSelectedYear();
    }

    function updateNavigationButtonStates() {
        if (backButton) {
            backButton.disabled = currentHistoryIndex <= 0;
        }

        if (forwardButton) {
            forwardButton.disabled = currentHistoryIndex >= navigationHistory.length - 1;
        }
    }

    function showHistoryItem(historyItem) {
        if (urlInput) {
            urlInput.value = getReadableUrl(historyItem.url);
        }

        setSelectedYear(Number(historyItem.year));
        setLoadingState(true);
        updateNavigationButtonStates();
        iframeContainer.src = historyItem.waybackUrl;
    }

    function loadUrlInWaybackMachine(rawUrl, year) {
        if (!rawUrl.trim()) {
            return;
        }

        const url = normalizeUrl(rawUrl);
        const waybackUrl = getWaybackUrl(url, year);

        if (currentHistoryIndex < navigationHistory.length - 1) {
            navigationHistory = navigationHistory.slice(0, currentHistoryIndex + 1);
        }

        navigationHistory.push({
            url,
            year: Number(year),
            waybackUrl,
        });
        currentHistoryIndex = navigationHistory.length - 1;

        showHistoryItem(navigationHistory[currentHistoryIndex]);
    }

    function updateUrlBarFromIframe() {
        if (isLoadingSnapshot) {
            setLoadingState(false);
        }

        try {
            const currentIframeUrl = iframeContainer.src;
            const waybackPrefix = "https://web.archive.org/web/";

            if (currentIframeUrl === "about:blank") {
                return;
            }

            if (currentIframeUrl.startsWith(waybackPrefix)) {
                const parts = currentIframeUrl.substring(waybackPrefix.length).split("/");

                if (parts.length > 1) {
                    const originalUrl = parts.slice(1).join("/");
                    urlInput.value = getReadableUrl(originalUrl);
                }
            } else {
                urlInput.value = getReadableUrl(currentIframeUrl);
            }
        } catch (e) {
            console.warn("Could not read iframe URL due to cross-origin restrictions:", e);
        }
    }

    browserForm.addEventListener("submit", (event) => {
        event.preventDefault();
        loadUrlInWaybackMachine(urlInput.value, selectedYear);
    });

    starterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            urlInput.value = button.dataset.url || "";
            loadUrlInWaybackMachine(urlInput.value, selectedYear);
        });
    });

    if (homeButton) {
        homeButton.addEventListener("click", () => {
            iframeContainer.src = "about:blank";
            urlInput.value = "";
            navigationHistory = [];
            currentHistoryIndex = -1;
            setSelectedYear(defaultYear);
            setLoadingState(false);
            updateNavigationButtonStates();
        });
    }

    if (backButton) {
        backButton.addEventListener("click", () => {
            if (currentHistoryIndex > 0) {
                currentHistoryIndex--;
                showHistoryItem(navigationHistory[currentHistoryIndex]);
            }
        });
    }

    if (forwardButton) {
        forwardButton.addEventListener("click", () => {
            if (currentHistoryIndex < navigationHistory.length - 1) {
                currentHistoryIndex++;
                showHistoryItem(navigationHistory[currentHistoryIndex]);
            }
        });
    }

    iframeContainer.addEventListener("load", updateUrlBarFromIframe);
    window.addEventListener("resize", centerSelectedYear);

    buildYearSwitch();
    updateNavigationButtonStates();
    setLoadingState(false);
});
