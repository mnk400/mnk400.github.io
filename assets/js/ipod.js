document.addEventListener('DOMContentLoaded', function() {
    // Get references to the iPod elements
    const menuOptions = document.querySelectorAll('.menu-options .option');
    const nextButton = document.querySelector('.skip.next');
    const prevButton = document.querySelector('.skip.prev');
    const centerButton = document.querySelector('.center-button');
    const playPauseButton = document.querySelector('.play-pause');
    const touchWheel = document.querySelector('.touch-wheel');
    const screen = document.querySelector('.screen');
    const menuContainer = document.querySelector('.menu-options');
    
    // Song data with YouTube IDs and metadata
    const songs = {
        "Ms. Jackson": {
            id: "MYxAiK6VnXw",
            artist: "Outkast",
            album: "Stankonia",
            year: "2000"
        },
        "Rill Rill": {
            id: "nmFgejWZjtg",
            artist: "Sleigh Bells",
            album: "Treats",
            year: "2010"
        },
        "Obstacle 1": {
            id: "jQi77AEANiI",
            artist: "Interpol",
            album: "Turn On The Bright Lights",
            year: "2002"
        },
        "Someday": {
            id: "knU9gRUWCno",
            artist: "The Strokes",
            album: "Is This It",
            year: "2001"
        },
        "Baby One More Time": {
            id: "C-u5WLJ9Yk4",
            artist: "Britney Spears",
            album: "...Baby One More Time",
            year: "1999"
        },
        "No Surprises": {
            id: "u5CVsCnxyXg",
            artist: "Radiohead",
            album: "OK Computer",
            year: "1997"
        }
    };
    
    // Track the currently selected option index
    let currentIndex = Array.from(menuOptions).findIndex(option => option.classList.contains('selected'));
    if (currentIndex === -1) currentIndex = 0; // Default to first item if none selected
    
    // Track if a song is currently playing
    let isPlaying = false;
    let player = null;
    let currentSong = null;
    
    // Function to update the selected menu item
    function updateSelection(newIndex) {
        // Remove selected class from all options
        menuOptions.forEach(option => option.classList.remove('selected'));
        
        // Ensure the index is within bounds (circular navigation)
        if (newIndex < 0) newIndex = menuOptions.length - 1;
        if (newIndex >= menuOptions.length) newIndex = 0;
        
        // Update current index and add selected class
        currentIndex = newIndex;
        menuOptions[currentIndex].classList.add('selected');
    }
    
    // Function to create Now Playing screen
    function createNowPlayingScreen(songName) {
        // Hide menu
        menuContainer.style.display = 'none';
        
        // Get song data
        const song = songs[songName];
        currentSong = songName;
        
        // Create now playing container
        const nowPlayingContainer = document.createElement('div');
        nowPlayingContainer.id = 'now-playing';
        nowPlayingContainer.style.position = 'absolute';
        nowPlayingContainer.style.top = '16%';
        nowPlayingContainer.style.left = '0';
        nowPlayingContainer.style.width = '100%';
        nowPlayingContainer.style.height = '84%';
        nowPlayingContainer.style.display = 'flex';
        nowPlayingContainer.style.flexDirection = 'column';
        nowPlayingContainer.style.alignItems = 'center';
        nowPlayingContainer.style.justifyContent = 'center';
        nowPlayingContainer.style.padding = '10px';
        nowPlayingContainer.style.boxSizing = 'border-box';
        nowPlayingContainer.style.fontFamily = '"ChicagoFont", "Arial"';
        nowPlayingContainer.style.color = '#484647';
        
        // Song title
        const songTitle = document.createElement('div');
        songTitle.textContent = songName;
        songTitle.style.fontSize = '16px';
        songTitle.style.fontWeight = 'bold';
        songTitle.style.marginBottom = '5px';
        songTitle.style.textAlign = 'center';
        
        // Artist name
        const artistName = document.createElement('div');
        artistName.textContent = song.artist;
        artistName.style.fontSize = '14px';
        artistName.style.marginBottom = '15px';
        artistName.style.textAlign = 'center';
        
        // Album and year
        const albumInfo = document.createElement('div');
        albumInfo.textContent = `${song.album} (${song.year})`;
        albumInfo.style.fontSize = '12px';
        albumInfo.style.marginBottom = '20px';
        albumInfo.style.textAlign = 'center';
        albumInfo.style.fontStyle = 'italic';
        
        // Progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.style.width = '80%';
        progressContainer.style.height = '10px';
        progressContainer.style.backgroundColor = '#C1C1BA';
        progressContainer.style.borderRadius = '5px';
        progressContainer.style.overflow = 'hidden';
        progressContainer.style.marginBottom = '10px';
        
        // Progress bar
        const progressBar = document.createElement('div');
        progressBar.id = 'progress-bar';
        progressBar.style.width = '0%';
        progressBar.style.height = '100%';
        progressBar.style.backgroundColor = '#484647';
        progressBar.style.borderRadius = '5px';
        progressContainer.appendChild(progressBar);
        
        // Time display
        const timeDisplay = document.createElement('div');
        timeDisplay.id = 'time-display';
        timeDisplay.textContent = '0:00 / 0:00';
        timeDisplay.style.fontSize = '12px';
        timeDisplay.style.marginTop = '5px';
        
        // Add elements to container
        nowPlayingContainer.appendChild(songTitle);
        nowPlayingContainer.appendChild(artistName);
        nowPlayingContainer.appendChild(albumInfo);
        nowPlayingContainer.appendChild(progressContainer);
        nowPlayingContainer.appendChild(timeDisplay);
        
        // Add to screen
        screen.appendChild(nowPlayingContainer);
        
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
        playerContainer.style.position = 'absolute';
        playerContainer.style.top = '-9999px';
        playerContainer.style.left = '-9999px';
        playerContainer.style.width = '1px';
        playerContainer.style.height = '1px';
        document.body.appendChild(playerContainer);
        
        player = new YT.Player('youtube-player', {
            height: '1',
            width: '1',
            videoId: videoId,
            playerVars: {
                'autoplay': 1,
                'controls': 0,
                'showinfo': 0,
                'rel': 0,
                'iv_load_policy': 3,
                'fs': 0,
                'modestbranding': 1,
                'disablekb': 1
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }
    
    // Function called when player is ready
    function onPlayerReady(event) {
        event.target.playVideo();
        updatePlayIcon(true);
        
        // Start updating progress
        updateProgress();
    }
    
    // Function to handle player state changes
    function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            updatePlayIcon(true);
        } else if (event.data === YT.PlayerState.PAUSED) {
            updatePlayIcon(false);
        } else if (event.data === YT.PlayerState.ENDED) {
            updatePlayIcon(false);
            // Optional: Play next song automatically
            // playNextSong();
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
                
                // Update every second
                setTimeout(updateProgress, 1000);
            }
        }
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
        if (isPlaying) {
            // Stop the player
            if (player) {
                player.stopVideo();
                player.destroy();
                player = null;
            }
            
            // Remove the now playing screen
            const nowPlayingContainer = document.getElementById('now-playing');
            if (nowPlayingContainer) {
                screen.removeChild(nowPlayingContainer);
            }
            
            // Show the menu again
            menuContainer.style.display = 'flex';
            isPlaying = false;
            currentSong = null;
            
            // Reset play icon
            updatePlayIcon(false);
        }
    }
    
    // Function to update the play icon
    function updatePlayIcon(isPlaying) {
        const playIcon = document.querySelector('.play-icon');
        if (isPlaying) {
            // Change to pause icon (two vertical bars)
            playIcon.style.borderLeft = 'none';
            playIcon.style.width = '18px';
            playIcon.style.background = 'repeating-linear-gradient(to right, #484647, #484647 6px, transparent 6px, transparent 12px, #484647 12px, #484647 18px)';
        } else {
            // Change back to play icon (triangle)
            playIcon.style.background = 'none';
            playIcon.style.borderLeft = '18px solid #484647';
            playIcon.style.borderTop = '9px solid transparent';
            playIcon.style.borderBottom = '9px solid transparent';
            playIcon.style.width = '0';
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
            const songName = selectedOption.textContent;
            
            // Check if we have data for this song
            if (songs[songName]) {
                createNowPlayingScreen(songName);
            }
        }
    });
    
    // Add touch wheel rotation functionality
    let startY;
    let lastY;
    
    touchWheel.addEventListener('mousedown', function(e) {
        if (!isPlaying) {
            startY = e.clientY;
            lastY = startY;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    });
    
    function handleMouseMove(e) {
        const currentY = e.clientY;
        const deltaY = currentY - lastY;
        
        // Determine direction based on movement
        if (Math.abs(deltaY) > 5) { // Threshold to prevent accidental movements
            if (deltaY > 0) {
                // Moving down - go to next item
                updateSelection(currentIndex + 1);
            } else {
                // Moving up - go to previous item
                updateSelection(currentIndex - 1);
            }
            lastY = currentY;
        }
    }
    
    function handleMouseUp() {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }
    
    // Play/Pause button functionality
    playPauseButton.addEventListener('click', function() {
        if (isPlaying && player) {
            const state = player.getPlayerState();
            
            if (state === YT.PlayerState.PLAYING) {
                player.pauseVideo();
                updatePlayIcon(false);
            } else {
                player.playVideo();
                updatePlayIcon(true);
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
