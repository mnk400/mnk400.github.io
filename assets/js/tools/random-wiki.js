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
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                wikiContent.classList.remove('loading');

                wikiTitle.textContent = data.title;

                if (data.thumbnail && data.thumbnail.source) {
                    const img = document.createElement('img');
                    img.src = data.thumbnail.source;
                    img.alt = data.title;
                    img.style.maxWidth = '100%';
                    wikiImage.appendChild(img);
                }

                const articleLink = document.createElement('a');
                articleLink.href = data.content_urls.desktop.page;
                articleLink.textContent = 'Read article on Wikipedia';
                articleLink.target = '_blank';
                wikiLink.appendChild(articleLink);

                wikiExtract.innerHTML = data.extract_html || '<p>' + (data.extract || 'No content available.') + '</p>';

                wikiExtract.querySelectorAll('a').forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('/wiki/')) {
                        link.href = 'https://en.wikipedia.org' + href;
                        link.target = '_blank';
                    }
                });
            })
            .catch(error => {
                wikiContent.classList.remove('loading');
                wikiExtract.innerHTML = `<p>Error fetching Wikipedia article: ${error.message}</p>`;
                console.error('Error fetching Wikipedia article:', error);
            });
    }
});