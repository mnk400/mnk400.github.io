document.addEventListener('DOMContentLoaded', function() {
    const fetchButton = document.getElementById('fetch-wiki');
    const wikiContent = document.getElementById('wiki-content');
    const wikiTitle = document.getElementById('wiki-title');
    const wikiImage = document.getElementById('wiki-image');
    const wikiExtract = document.getElementById('wiki-extract');
    const wikiLink = document.getElementById('wiki-link');
    
    fetchButton.addEventListener('click', fetchRandomWiki);
    
    fetchRandomWiki();
    
    function fetchRandomWiki() {
        // Clear previous content and show loading state
        wikiTitle.textContent = '';
        wikiImage.innerHTML = '';
        wikiExtract.innerHTML = '<p>Loading...</p>';
        wikiLink.innerHTML = '';
        wikiContent.classList.add('loading');
        
        const randomApiUrl = 'https://en.wikipedia.org/api/rest_v1/page/random/summary';
        
        fetch(randomApiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const title = data.title;
                wikiTitle.textContent = title;
                
                // Display the thumbnail image if available
                if (data.thumbnail && data.thumbnail.source) {
                    const img = document.createElement('img');
                    img.src = data.thumbnail.source;
                    img.alt = title;
                    img.style.maxWidth = '100%';
                    wikiImage.appendChild(img);
                }
                
                const articleLink = document.createElement('a');
                articleLink.href = data.content_urls.desktop.page;
                articleLink.textContent = 'Read article on Wikipedia';
                articleLink.target = '_blank';
                wikiLink.appendChild(articleLink);
                
                const fullContentUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*`;
                return fetch(fullContentUrl);
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                wikiContent.classList.remove('loading');
                wikiExtract.innerHTML = '';
                
                if (data.parse && data.parse.text && data.parse.text['*']) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = data.parse.text['*'];
                    
                    const unwantedSelectors = [
                        '.infobox', '.thumb', '.toc', '.mw-editsection', 
                        '.navbox', '.metadata', 'table', '.mw-empty-elt',
                        '.mw-jump-link', '.mw-parser-output > style',
                        'img', '.image', '.mbox', '.ambox', '.tmbox',
                        '.vertical-navbox', '.sistersitebox', '.wikitable'
                    ];
                    
                    unwantedSelectors.forEach(selector => {
                        const elements = tempDiv.querySelectorAll(selector);
                        elements.forEach(el => el.remove());
                    });
                    
                    wikiExtract.innerHTML = tempDiv.innerHTML;
                    
                    const links = wikiExtract.querySelectorAll('a');
                    links.forEach(link => {
                        if (link.getAttribute('href') && link.getAttribute('href').startsWith('/wiki/')) {
                            link.href = 'https://en.wikipedia.org' + link.getAttribute('href');
                            link.target = '_blank';
                        }
                    });
                } else {
                    wikiExtract.innerHTML = '<p>Could not retrieve full article content.</p>';
                }
            })
            .catch(error => {
                wikiContent.classList.remove('loading');
                wikiExtract.innerHTML = `<p>Error fetching Wikipedia article: ${error.message}</p>`;
                console.error('Error fetching Wikipedia article:', error);
            });
    }
});