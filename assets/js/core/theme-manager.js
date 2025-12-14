// Theme Manager - Handles light, blue, and dark modes

let currentTheme = 'light';
let isInitialLoad = true;

function setTheme(theme, skipTransition = false) {
    currentTheme = theme;
    
    localStorage.setItem('theme', theme);
    
    if (!skipTransition && !isInitialLoad) {
        // add transition class to enable animations
        // remove transition classes after animation completes
        // so we avoid animations on page refreshes
        document.documentElement.classList.add('theme-transition');
        document.body.classList.add('theme-transition');
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transition');
            document.body.classList.remove('theme-transition');
        }, 500);
    }
    
    // Set the data-theme attribute
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeColorMeta(theme);
    
    updateThemeIcons();
    
    isInitialLoad = false;
}

function updateThemeColorMeta(theme) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
    }
    
    if (theme === 'dark') {
        metaThemeColor.content = '#1a1a1a';
    } else if (theme === 'blue') {
        metaThemeColor.content = '#2D3D5A';
    } else {
        metaThemeColor.content = '#f2f0ef';
    }
}

function updateThemeIcons() {
    const themeIcon = document.querySelector('.theme-icon');
    
    if (themeIcon) {
        // Remove all possible icon classes
        themeIcon.classList.remove('fa-sun', 'fa-moon', 'fa-droplet');
        
        if (currentTheme === 'light') {
            themeIcon.classList.add('fa-moon'); // Moon for dark theme next
        } else if (currentTheme === 'dark') {
            themeIcon.classList.add('fa-droplet'); // Droplet for blue theme next
        } else if (currentTheme === 'blue') {
            themeIcon.classList.add('fa-sun'); // Sun for light theme next
        }
    }
}

function toggleTheme() {
    if (currentTheme === 'light') {
        setTheme('dark');
    } else if (currentTheme === 'dark') {
        setTheme('blue');
    } else {
        setTheme('light');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    // If saved theme is 'video', default to 'dark' since video mode is removed
    // Ensure we only use valid themes
    const validThemes = ['light', 'blue', 'dark'];
    const theme = validThemes.includes(savedTheme) ? savedTheme : 'light';
    setTheme(theme, true);
});
