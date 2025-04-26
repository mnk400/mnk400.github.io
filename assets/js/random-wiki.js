document.addEventListener('DOMContentLoaded', function() {
    const fetchButton = document.getElementById('fetch-wiki');
    const loadingIndicator = document.getElementById('loading');
    const wikiTitle = document.getElementById('wiki-title');
    const wikiExtract = document.getElementById('wiki-extract');
    const wikiLink = document.getElementById('wiki-link');
    
    fetchButton.addEventListener('click', fetchRandomWiki);
    
    fetchRandomWiki();
    
    function fetchRandomWiki() {

        loadingIndicator.style.display = 'block';
        wikiTitle.textContent = '';
        wikiExtract.innerHTML = '';
        wikiLink.innerHTML = '';
        
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
                loadingIndicator.style.display = 'none';
                
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
                loadingIndicator.style.display = 'none';
                wikiExtract.innerHTML = `<p>Error fetching Wikipedia article: ${error.message}</p>`;
                console.error('Error fetching Wikipedia article:', error);
            });
    }
});