// Theme Manager - Handles light mode, dark mode, and video background

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
    
    if (theme === 'video') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    
    updateThemeIcons();
    handleVideoBackground(theme === 'video', skipTransition);
    
    isInitialLoad = false;
}

function updateThemeIcons() {
    const darkModeIcon = document.querySelector('.dark-mode-icon');
    const videoModeIcon = document.querySelector('.video-mode-icon');
    
    if (darkModeIcon) {
        if (currentTheme === 'light') {
            darkModeIcon.classList.remove('fa-sun');
            darkModeIcon.classList.add('fa-moon');
        } else if (currentTheme === 'dark') {
            darkModeIcon.classList.remove('fa-moon');
            darkModeIcon.classList.add('fa-sun');
        } else if (currentTheme === 'video') {
            darkModeIcon.classList.remove('fa-moon');
            darkModeIcon.classList.add('fa-sun');
        }
    }
    
    if (videoModeIcon) {
        if (currentTheme === 'video') {
            videoModeIcon.classList.remove('fa-film');
            videoModeIcon.classList.add('fa-times-circle');
        } else {
            videoModeIcon.classList.remove('fa-times-circle');
            videoModeIcon.classList.add('fa-film');
        }
    }
}

function getRandomBackgroundVideo() {
    const backgroundVideos = [
        '/assets/video/grain_slow.mp4',
        '/assets/video/purple_clouds.mp4',
        '/assets/video/skyclouds.mp4',
    ];
    const randomIndex = Math.floor(Math.random() * backgroundVideos.length);
    return backgroundVideos[randomIndex];
}

function handleVideoBackground(active, skipTransition = false) {
    if (active) {
        if (!document.getElementById('background-video')) {
            const video = document.createElement('video');
            video.id = 'background-video';
            video.src = getRandomBackgroundVideo();
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true; // for iOS
            video.setAttribute('playsinline', ''); // for iOS
            video.setAttribute('webkit-playsinline', '');
            
            document.body.prepend(video);
            
            // explicitly play the video for iOS
            video.play().catch(error => {
                console.log('Auto-play was prevented by the browser:', error);
            });
            
            if (skipTransition) {
                video.classList.add('visible');
            } else {
                setTimeout(() => {
                    video.classList.add('visible');
                }, 50);
            }
        } else {
            // Show existing video
            const video = document.getElementById('background-video');
            video.style.display = 'block';
            video.play().catch(e => console.log('Could not play video:', e));
            
            if (!skipTransition) {
                setTimeout(() => {
                    video.classList.add('visible');
                }, 50);
            } else {
                video.classList.add('visible');
            }
        }
    } else {
        // Hide video if it exists
        const video = document.getElementById('background-video');
        if (video) {
            if (!skipTransition) {
                // Use CSS transition for fade out
                video.classList.remove('visible');
                setTimeout(() => {
                    video.style.display = 'none';
                }, 1000);
            } else {
                video.classList.remove('visible');
                video.style.display = 'none';
            }
        }
    }
}

function toggleVideoMode() {
    if (currentTheme === 'video') {
        setTheme('dark');
    } else {
        setTheme('video');
    }
}

function toggleLightDark() {
    if (currentTheme === 'video') {
        setTheme('light');
    } else if (currentTheme === 'light') {
        setTheme('dark');
    } else {
        setTheme('light');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme, true);
});
