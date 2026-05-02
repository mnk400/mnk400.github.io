document.addEventListener("DOMContentLoaded", () => {
    const browserForm = document.getElementById("historical-browser-form");
    const urlInput = document.getElementById("url-input");
    const iframeContainer = document.getElementById("historical-content-viewer");
    const goButton = document.getElementById("go-button");
    const yearTimeline = document.getElementById("year-timeline");
    const browserStatus = document.getElementById("browser-status");
    const emptyState = document.getElementById("browser-empty-state");
    const loadingState = document.getElementById("browser-loading-state");
    const homeButton = document.getElementById("browser-home");
    const backButton = document.getElementById("browser-back");
    const forwardButton = document.getElementById("browser-forward");
    const starterButtons = document.querySelectorAll(".historical-browser-starter");

    if (!browserForm || !urlInput || !iframeContainer || !goButton || !yearTimeline) {
        console.error("Historical browser controls not found");
        return;
    }

    const defaultYear = 2007;
    let selectedYear = defaultYear;
    let navigationHistory = [];
    let currentHistoryIndex = -1;
    let isLoadingSnapshot = false;

    function populateYearTimeline() {
        const currentYear = new Date().getFullYear();
        const years = [];

        for (let year = currentYear; year >= 1998; year--) {
            years.push(year);
        }

        yearTimeline.replaceChildren(
            ...years.map((year) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "historical-browser-year";
                button.dataset.year = year;
                button.textContent = year;
                button.setAttribute("aria-label", `${year} snapshot`);
                button.setAttribute("aria-pressed", String(year === selectedYear));
                return button;
            })
        );

        updateSelectedYearButton();
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

    function setStatus(text) {
        if (browserStatus) {
            browserStatus.textContent = text;
        }
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

    function centerSelectedYearButton(selectedButton) {
        if (!selectedButton) {
            return;
        }

        requestAnimationFrame(() => {
            yearTimeline.scrollLeft =
                selectedButton.offsetLeft -
                (yearTimeline.clientWidth - selectedButton.offsetWidth) / 2;
        });
    }

    function updateSelectedYearButton() {
        const buttons = yearTimeline.querySelectorAll(".historical-browser-year");
        let selectedButton = null;

        buttons.forEach((button) => {
            const isSelected = Number(button.dataset.year) === selectedYear;
            button.classList.toggle("active", isSelected);
            button.setAttribute("aria-pressed", String(isSelected));

            if (isSelected) {
                selectedButton = button;
            }
        });

        centerSelectedYearButton(selectedButton);
        setStatus(`${selectedYear} snapshot`);
    }

    function setSelectedYear(year) {
        selectedYear = Number(year);
        updateSelectedYearButton();
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
        setStatus(`Fetching ${historyItem.year} snapshot...`);
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
            setStatus(`${selectedYear} snapshot`);
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

    yearTimeline.addEventListener("click", (event) => {
        const yearButton = event.target.closest(".historical-browser-year");

        if (!yearButton) {
            return;
        }

        setSelectedYear(Number(yearButton.dataset.year));

        if (currentHistoryIndex >= 0 && urlInput.value.trim()) {
            loadUrlInWaybackMachine(urlInput.value, selectedYear);
        }
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
    window.addEventListener("resize", updateSelectedYearButton);

    populateYearTimeline();
    updateNavigationButtonStates();
    setLoadingState(false);
});
