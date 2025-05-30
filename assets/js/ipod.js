document.addEventListener('DOMContentLoaded', function() {
    // Prevent text selection on the entire iPod interface
    document.querySelector('.container').style.userSelect = 'none';
    document.querySelector('.container').style.webkitUserSelect = 'none';
    document.querySelector('.container').style.mozUserSelect = 'none';
    document.querySelector('.container').style.msUserSelect = 'none';
    
    const nextButton = document.querySelector('.skip.next');
    const prevButton = document.querySelector('.skip.prev');
    const centerButton = document.querySelector('.center-button');
    const playPauseButton = document.querySelector('.play-pause');
    const menuContainer = document.querySelector('.menu-options');
    
    let songs = {};
    let menuOptions = [];
    let currentIndex = 0;
    
    // Fetch songs data from JSON file and populate menu
    fetch('/assets/data/songs.json')
        .then(response => response.json())
        .then(data => {
            songs = data;
            populateMenuOptions(songs);
        })
        .catch(error => {
            console.error('Error loading songs data:', error);
        });
    
    // Track all songs and which ones are currently visible
    let allSongs = [];
    let visibleStartIndex = 0;
    const songsPerPage = 6;
    
    function populateMenuOptions(songsData) {
        menuContainer.innerHTML = '';
        allSongs = Object.keys(songsData);

        updateVisibleSongs();
        
        if (menuOptions.length > 0) {
            menuOptions[0].classList.add('selected');
            currentIndex = 0;
        }
    }
    
    function updateVisibleSongs() {
        menuContainer.innerHTML = '';
        
        const endIndex = Math.min(visibleStartIndex + songsPerPage, allSongs.length);
        
        for (let i = visibleStartIndex; i < endIndex; i++) {
            const songName = allSongs[i];
            const option = document.createElement('div');
            option.className = 'option';
            option.textContent = songName;
            option.dataset.index = i;
            
            menuContainer.appendChild(option);
        }
        
        // Update menupptions
        menuOptions = document.querySelectorAll('.menu-options .option');
    }
    
    // Track if a song is currently playing
    let isPlaying = false;
    let player = null;
    
    function updateSelection(newIndex) {
        menuOptions.forEach(option => option.classList.remove('selected'));
        
        let globalIndex;
        
        if (typeof newIndex === 'number') {
            globalIndex = visibleStartIndex + newIndex;
            
            if (globalIndex < 0) globalIndex = allSongs.length - 1;
            if (globalIndex >= allSongs.length) globalIndex = 0;
            
            if (globalIndex < visibleStartIndex) {
                // Scroll up
                visibleStartIndex = Math.max(0, globalIndex - (songsPerPage - 1));
                updateVisibleSongs();
                currentIndex = globalIndex - visibleStartIndex;
            } else if (globalIndex >= visibleStartIndex + songsPerPage) {
                // Scroll down
                visibleStartIndex = Math.min(allSongs.length - songsPerPage, globalIndex);
                updateVisibleSongs();
                currentIndex = globalIndex - visibleStartIndex;
            } else {
                // Within current window
                currentIndex = globalIndex - visibleStartIndex;
            }
        } else {
            if (currentIndex < 0) currentIndex = menuOptions.length - 1;
            if (currentIndex >= menuOptions.length) currentIndex = 0;
        }
        
        if (menuOptions[currentIndex]) {
            menuOptions[currentIndex].classList.add('selected');
        }
    }
    
    function createNowPlayingScreen(songName) {
        menuContainer.style.display = 'none';
        
        const song = songs[songName];
        currentSong = songName;
        
        const nowPlayingContainer = document.getElementById('now-playing');

        nowPlayingContainer.querySelector('.song-title').textContent = songName;
        nowPlayingContainer.querySelector('.artist-name').textContent = song.artist;
        nowPlayingContainer.querySelector('.album-info').textContent = `${song.album} (${song.year})`;
        
        // Reset progress bar and time display
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = '0%';
        }
        
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            timeDisplay.textContent = '0:00 / 0:00';
        }
        
        // Show the now playing screen
        nowPlayingContainer.style.display = 'block';
        
        // Load YouTube API if not already loaded
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            
            window.onYouTubeIframeAPIReady = function() {
                createPlayer(song.id);
            };
        } else {
            createPlayer(song.id);
        }
        
        isPlaying = true;
    }
    
    // Function to create the YouTube player (audio only)
    function createPlayer(videoId) {
        // Create a hidden player
        const playerContainer = document.createElement('div');
        playerContainer.id = 'youtube-player';
        document.body.appendChild(playerContainer);
        
        // Set appropriate player options
        const playerOptions = {
            height: '1',
            width: '1',
            videoId: videoId,
            playerVars: {
                'autoplay': 1,  // Try autoplay for all devices
                'controls': 0,
                'showinfo': 0,
                'rel': 0,
                'iv_load_policy': 3,
                'fs': 0,
                'modestbranding': 1,
                'disablekb': 1,
                'playsinline': 1  // Important for iOS
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        };
        
        player = new YT.Player('youtube-player', playerOptions);
    }
    
    // Function called when player is ready
    function onPlayerReady(event) {
        // Check if we're on iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        event.target.playVideo();

        if (isIOS) {
            // On iOS, show the "Press Play" message because play/pause doesn't work always!
            document.querySelector('.press-play-message').style.display = 'block';
            isPlaying = false;
            updatePlayPauseIcon(false);
        } else {
            // For non-iOS devices, try to autoplay
            event.target.playVideo();
            isPlaying = true;
            updatePlayPauseIcon(true); // Set to pause icon when playing
        }
        
        updateProgress();
    }
    
    // Function to handle player state changes
    function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            isPlaying = true;
            updatePlayPauseIcon(true); // Set to pause icon when playing
        } else if (event.data === YT.PlayerState.PAUSED) {
            updatePlayPauseIcon(false); // Set to play icon when paused
        } else if (event.data === YT.PlayerState.ENDED) {
            playNextSong();
        }
    }
    
    // Function to update play/pause icon
    function updatePlayPauseIcon(isPlaying) {
        const playPauseIcon = document.querySelector('.play-pause-icon i');
        if (playPauseIcon) {
            playPauseIcon.className = isPlaying ? 'fa-solid fa-play' : 'fa-solid fa-pause';
        }
    }
    
    // Function to update progress bar
    function updateProgress() {
        if (player && isPlaying) {
            const progressBar = document.getElementById('progress-bar');
            const timeDisplay = document.getElementById('time-display');
            
            if (progressBar && timeDisplay) {
                const currentTime = player.getCurrentTime() || 0;
                const duration = player.getDuration() || 0;
                const progressPercent = (currentTime / duration) * 100;   

                progressBar.style.width = `${progressPercent}%`;
                timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
            }
        }

        setTimeout(updateProgress, 1000);
    }
    
    // Format time in MM:SS
    function formatTime(seconds) {
        seconds = Math.floor(seconds);
        const minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    
    // Function to return to menu
    function returnToMenu() {
        if (player || isPlaying) {
            // Stop the player
            if (player) {
                player.stopVideo();
                player.destroy();
                player = null;
            }
            
            // Reset play/pause icon to play
            updatePlayPauseIcon(false);
            
            // Remove the now playing screen
            const nowPlayingContainer = document.getElementById('now-playing');
            if (nowPlayingContainer) {
                // Hide the "press play" message
                document.querySelector('.press-play-message').style.display = 'none';
                nowPlayingContainer.style.display = 'none';
            }
            
            // Show the menu again
            menuContainer.style.display = 'flex';
            isPlaying = false;
            currentSong = null;
        }
    }
    
    // Event listener for next button
    nextButton.addEventListener('click', function() {
        if (!isPlaying) {
            updateSelection(currentIndex + 1);
        }
    });
    
    // Event listener for previous button
    prevButton.addEventListener('click', function() {
        if (!isPlaying) {
            updateSelection(currentIndex - 1);
        }
    });
    
    // Event listener for center button (select current option)
    centerButton.addEventListener('click', function() {
        if (isPlaying) {
            // If song is playing, return to menu
            returnToMenu();
        } else {
            // Get the selected song
            const selectedOption = menuOptions[currentIndex];
            if (selectedOption) {
                const songName = selectedOption.textContent;
                createNowPlayingScreen(songName);
                
                // For iOS, we'll handle play in the onPlayerReady function
            }
        }
    });
    
    // Play/Pause button functionality
    playPauseButton.addEventListener('click', function() {
        if (isPlaying && player) {
            const state = player.getPlayerState();
            const playPauseIcon = document.querySelector('.play-pause-icon i');
            
            if (state === YT.PlayerState.PLAYING) {
                player.pauseVideo();
                // Update icon to play when paused
                if (playPauseIcon) {
                    playPauseIcon.className = 'fa-solid fa-play';
                }
            } else {
                player.playVideo();
                // Update icon to pause when playing
                if (playPauseIcon) {
                    playPauseIcon.className = 'fa-solid fa-pause';
                }
            }
        }
    });
    
    // Add event listener for the "back" text
    document.querySelector('textPath').parentElement.addEventListener('click', function() {
        if (isPlaying) {
            returnToMenu();
        }
    });
});
