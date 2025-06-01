document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('url-input');
    const iframeContainer = document.getElementById('historical-content-viewer');
    const goButton = document.getElementById('go-button');
    const yearSelector = document.getElementById('year-selector');
    const homeButton = document.getElementById("browser-home");
    const backButton = document.getElementById("browser-back");
    const forwardButton = document.getElementById("browser-forward");

    // Roughly working navigation history variables (doesn't work with iframe internal linking yet)
    let navigationHistory = [];
    let currentHistoryIndex = -1;

    function populateYearSelector() {
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= 1998; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === 2007) {
                option.selected = true;
            }
            if (yearSelector) yearSelector.appendChild(option);
        }
    }

    function loadUrlInWaybackMachine(url, year) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }
        const timestamp = year + '0101000000'; // Default to Jan 1st of the year
        const waybackUrl = `https://web.archive.org/web/${timestamp}/${url}`;
        if (iframeContainer) {
            // Add to navigation history
            if (currentHistoryIndex < navigationHistory.length - 1) {
                // If we're not at the end of the history, remove all entries after current position
                navigationHistory = navigationHistory.slice(0, currentHistoryIndex + 1);
            }
            navigationHistory.push({
                url: url,
                year: year,
                waybackUrl: waybackUrl
            });
            currentHistoryIndex = navigationHistory.length - 1;

            updateNavigationButtonStates();
            iframeContainer.src = waybackUrl;
        } else {
            console.error('Iframe container not found');
        }
    }

    // This barely works, iframe src is not updated when iframe content changes ugh
    function updateUrlBarFromIframe() {
        try {
            const currentIframeUrl = iframeContainer.src;
            // The URL from Wayback Machine will be in the format: https://web.archive.org/web/YYYYMMDDhhmmss/original_url
            // we want to extract the original_url part
            const waybackPrefix = 'https://web.archive.org/web/';
            if (currentIframeUrl.startsWith(waybackPrefix)) {
                const parts = currentIframeUrl.substring(waybackPrefix.length).split('/');
                if (parts.length > 1) {
                    // The timestamp is parts[0], original URL starts from parts[1]
                    const originalUrl = parts.slice(1).join('/');
                    if (urlInput) urlInput.value = originalUrl;
                }
            } else {
                if (urlInput) urlInput.value = currentIframeUrl;
            }
        } catch (e) {
            // This catch block handles cross-origin errors when trying to access iframe.contentDocument
            console.warn('Could not access iframe content due to cross-origin restrictions:', e);
        }
    }


    if (urlInput && goButton) {
        goButton.addEventListener('click', () => {
            const url = urlInput.value;
            const year = yearSelector.value;
            if (url) {
                loadUrlInWaybackMachine(url, year);
            }
        });

        urlInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                goButton.click();
            }
        });
    } else {
        console.error('URL input, Go button, or Year selector not found');
    }

    if (yearSelector) {
        populateYearSelector();
    } else {
        console.error('URL input or Go button not found');
    }

    updateNavigationButtonStates();

    iframeContainer.addEventListener('load', updateUrlBarFromIframe);

    function updateNavigationButtonStates() {
        const backButton = document.getElementById("browser-back");
        const forwardButton = document.getElementById("browser-forward");

        if (backButton) {
            // Enable back button if we have history to go back to
            backButton.classList.toggle('disabled', currentHistoryIndex <= 0);
        }

        if (forwardButton) {
            // Enable forward button if we have history to go forward to
            forwardButton.classList.toggle('disabled', currentHistoryIndex >= navigationHistory.length - 1);
        }
    }

    homeButton.addEventListener('click', () => {
        if (iframeContainer) iframeContainer.src = 'about:blank';
        if (urlInput) urlInput.value = '';

        // Reset navigation history
        navigationHistory = [];
        currentHistoryIndex = -1;
        updateNavigationButtonStates();
    });

    backButton.addEventListener('click', () => {
        if (currentHistoryIndex > 0) {
            currentHistoryIndex--;
            const historyItem = navigationHistory[currentHistoryIndex];

            if (urlInput) urlInput.value = historyItem.url;

            if (yearSelector) {
                for (let i = 0; i < yearSelector.options.length; i++) {
                    if (yearSelector.options[i].value === historyItem.year) {
                        yearSelector.selectedIndex = i;
                        break;
                    }
                }
            }

            // Load the URL without adding to history
            if (iframeContainer) iframeContainer.src = historyItem.waybackUrl;

            updateNavigationButtonStates();
        }
    });

    forwardButton.addEventListener('click', () => {
        if (currentHistoryIndex < navigationHistory.length - 1) {
            currentHistoryIndex++;
            const historyItem = navigationHistory[currentHistoryIndex];

            if (urlInput) urlInput.value = historyItem.url;

            if (yearSelector) {
                for (let i = 0; i < yearSelector.options.length; i++) {
                    if (yearSelector.options[i].value === historyItem.year) {
                        yearSelector.selectedIndex = i;
                        break;
                    }
                }
            }

            // Load the URL without adding to history
            if (iframeContainer) iframeContainer.src = historyItem.waybackUrl;

            updateNavigationButtonStates();
        }
    });

});