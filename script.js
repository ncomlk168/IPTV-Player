  class IPTVPlayer {
            constructor() {
                this.channels = [];
                this.filteredChannels = [];
                this.currentChannelIndex = -1;
                this.isPlaying = false;
                this.hls = null; // HLS.js instance
                
                this.initElements();
                this.bindEvents();
                this.loadDefaultPlaylist();
            }

            initElements() {
                this.sidebar = document.getElementById('sidebar');
                this.channelsList = document.getElementById('channelsList');
                this.searchInput = document.getElementById('searchInput');
                this.videoPlayer = document.getElementById('videoPlayer');
                this.loadingSpinner = document.getElementById('loadingSpinner');
                this.playPauseBtn = document.getElementById('playPauseBtn');
                this.prevBtn = document.getElementById('prevBtn');
                this.nextBtn = document.getElementById('nextBtn');
                this.muteBtn = document.getElementById('muteBtn');
                this.volumeSlider = document.getElementById('volumeSlider');
                this.currentChannelName = document.getElementById('currentChannelName');
                this.currentChannelDetails = document.getElementById('currentChannelDetails');
                this.loadPlaylistBtn = document.getElementById('loadPlaylistBtn');
                this.toggleSidebar = document.getElementById('toggleSidebar');
                this.errorMessage = document.getElementById('errorMessage');
            }

            bindEvents() {
                this.searchInput.addEventListener('input', (e) => this.searchChannels(e.target.value));
                this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
                this.prevBtn.addEventListener('click', () => this.previousChannel());
                this.nextBtn.addEventListener('click', () => this.nextChannel());
                this.muteBtn.addEventListener('click', () => this.toggleMute());
                this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
                this.loadPlaylistBtn.addEventListener('click', () => this.loadPlaylistDialog());
                this.toggleSidebar.addEventListener('click', () => this.toggleSidebarVisibility());

                this.videoPlayer.addEventListener('loadstart', () => this.showLoading());
                this.videoPlayer.addEventListener('loadeddata', () => this.hideLoading());
                this.videoPlayer.addEventListener('error', () => this.handleVideoError());
                this.videoPlayer.addEventListener('play', () => this.updatePlayButton(true));
                this.videoPlayer.addEventListener('pause', () => this.updatePlayButton(false));

                // Keyboard shortcuts
                document.addEventListener('keydown', (e) => this.handleKeyboard(e));
            }

            async loadDefaultPlaylist() {
                try {
                    // Automatically load the iptv-org playlist
                    await this.loadPlaylist('https://iptv-org.github.io/iptv/languages/sin.m3u');
                } catch (error) {
                    console.error('Error loading default playlist:', error);
                    // Fallback to empty state
                    this.channels = [];
                    this.filteredChannels = [];
                    this.renderChannels();
                }
            }

            async loadPlaylistDialog() {
                const url = prompt("Enter IPTV playlist URL (M3U format):\n\nExample: https://iptv-org.github.io/iptv/languages/sin.m3u", "https://iptv-org.github.io/iptv/languages/sin.m3u");
                if (!url) return;

                try {
                    this.showError('Loading playlist... Please wait');
                    this.loadPlaylistBtn.textContent = 'Loading...';
                    this.loadPlaylistBtn.disabled = true;
                    
                    await this.loadPlaylist(url);
                    this.showError(`Successfully loaded ${this.channels.length} channels!`);
                    
                    setTimeout(() => {
                        this.hideError();
                    }, 3000);
                    
                } catch (error) {
                    this.showError('Failed to load playlist. Please check the URL and try again.');
                    console.error('Playlist loading error:', error);
                } finally {
                    this.loadPlaylistBtn.textContent = 'Load IPTV Playlist';
                    this.loadPlaylistBtn.disabled = false;
                }
            }

            async loadPlaylist(url) {
                try {
                    // Try direct fetch
                    let response;
                    try {
                        response = await fetch(url);
                        if (!response.ok) throw new Error('Direct fetch failed');
                    } catch {
                        // Fallback to CORS proxy
                        response = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
                        if (!response.ok) {
                            // Another CORS proxy fallback
                            response = await fetch(`https://cors-anywhere.herokuapp.com/${url}`);
                        }
                    }
                    
                    const content = await response.text();
                    
                    if (!content || !content.includes('#EXTM3U')) {
                        throw new Error('Invalid M3U playlist format');
                    }

                    const channels = this.parseM3U(content);
                    if (channels.length === 0) {
                        throw new Error('No valid channels found in playlist');
                    }
                    
                    this.channels = channels.slice(0, 100); // Limit to first 100 channels
                    this.filteredChannels = [...this.channels];
                    this.renderChannels();
                    
                    console.log(`Loaded ${this.channels.length} channels successfully`);
                } catch (error) {
                    console.error('Playlist loading error:', error);
                    throw error;
                }
            }

            parseM3U(content) {
                const lines = content.split('\n').map(line => line.trim()).filter(line => line);
                const channels = [];
                let currentChannel = {};

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    if (line.startsWith('#EXTINF:')) {
                        // Extract channel name (after the comma)
                        const nameMatch = line.match(/,(.+)$/);
                        
                        // Extract logo URL
                        const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                        
                        // Extract country/group
                        const groupMatch = line.match(/group-title="([^"]+)"/i);
                        
                        // Extract additional info
                        const idMatch = line.match(/tvg-id="([^"]+)"/i);
                        
                        currentChannel = {
                            name: nameMatch ? nameMatch[1].trim() : 'Unknown Channel',
                            logo: logoMatch ? logoMatch[1] : '',
                            country: groupMatch ? groupMatch[1] : 'Unknown',
                            id: idMatch ? idMatch[1] : ''
                        };
                    } else if (line.startsWith('http://') || line.startsWith('https://')) {
                        if (currentChannel.name) {
                            currentChannel.url = line;
                            
                            // Only add channels with valid streaming URLs
                            if (this.isValidStreamUrl(line)) {
                                channels.push({ ...currentChannel });
                            }
                            
                            currentChannel = {};
                        }
                    }
                }

                console.log(`Parsed ${channels.length} valid channels from M3U`);
                return channels;
            }

            isValidStreamUrl(url) {
                // Check for common streaming formats
                const validFormats = ['.m3u8', '.ts', '.mp4', '.mkv', '.avi'];
                const lowerUrl = url.toLowerCase();
                
                // Allow URLs that contain streaming indicators or end with valid formats
                return validFormats.some(format => lowerUrl.includes(format)) || 
                       lowerUrl.includes('stream') || 
                       lowerUrl.includes('live') ||
                       lowerUrl.includes('playlist');
            }

            renderChannels() {
                if (this.filteredChannels.length === 0) {
                    this.channelsList.innerHTML = `
                        <div class="no-channels">
                            <div class="no-channels-icon">🔍</div>
                            <h3>No Channels Found</h3>
                            <p style="margin-top: 8px; color: rgba(255,255,255,0.6);">Try adjusting your search</p>
                        </div>
                    `;
                    return;
                }

                this.channelsList.innerHTML = this.filteredChannels.map((channel, index) => `
                    <div class="channel-item ${this.currentChannelIndex === index ? 'active' : ''}" 
                         data-index="${index}" onclick="player.selectChannel(${index})">
                        <div class="channel-thumbnail">
                            ${channel.logo ? `<img src="${channel.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" onerror="this.style.display='none'">` : channel.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="channel-info">
                            <div class="channel-name">${channel.name}</div>
                            <div class="channel-country">${channel.country}</div>
                        </div>
                    </div>
                `).join('');
            }

            searchChannels(query) {
                const filtered = this.channels.filter(channel =>
                    channel.name.toLowerCase().includes(query.toLowerCase()) ||
                    channel.country.toLowerCase().includes(query.toLowerCase())
                );
                this.filteredChannels = filtered;
                this.renderChannels();
            }

            selectChannel(index) {
                this.currentChannelIndex = index;
                const channel = this.filteredChannels[index];
                
                if (!channel || !channel.url) {
                    this.showError('Invalid channel selected');
                    return;
                }
                
                this.currentChannelName.textContent = channel.name;
                this.currentChannelDetails.textContent = `${channel.country} • Live TV`;
                
                this.showLoading();
                this.hideError();
                
                // Clean up existing HLS instance
                this.destroyHls();
                
                console.log("Loading channel URL:", channel.url);
                
                // Check if URL is HLS (.m3u8) and HLS.js is supported
                if (channel.url.includes('.m3u8') && Hls.isSupported()) {
                    this.loadHlsStream(channel.url);
                } else if (this.videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
                    // Native HLS support (Safari)
                    this.loadNativeStream(channel.url);
                } else {
                    // Fallback to direct video loading
                    this.loadDirectStream(channel.url);
                }
                
                this.renderChannels();
            }

            loadHlsStream(url) {
                console.log('Loading HLS stream with HLS.js:', url);
                
                this.hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                    manifestLoadingTimeOut: 10000,
                    manifestLoadingMaxRetry: 3,
                    levelLoadingTimeOut: 10000,
                    fragLoadingTimeOut: 20000
                });
                
                this.hls.loadSource(url);
                this.hls.attachMedia(this.videoPlayer);
                
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    console.log('HLS manifest parsed successfully');
                    this.videoPlayer.play().catch(error => {
                        console.log('Autoplay prevented:', error);
                    });
                });

                this.hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS error:', data);
                    if (data.fatal) {
                        switch(data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.log('Network error, trying to recover...');
                                this.hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.log('Media error, trying to recover...');
                                this.hls.recoverMediaError();
                                break;
                            default:
                                this.destroyHls();
                                this.handleVideoError();
                                break;
                        }
                    }
                });
            }

            loadNativeStream(url) {
                console.log('Loading stream with native HLS support:', url);
                this.videoPlayer.src = url;
                this.videoPlayer.load();
                
                this.videoPlayer.addEventListener('loadeddata', () => {
                    this.videoPlayer.play().catch(error => {
                        console.log('Autoplay prevented:', error);
                    });
                }, { once: true });
            }

            loadDirectStream(url) {
                console.log('Loading direct stream:', url);
                this.videoPlayer.src = url;
                this.videoPlayer.load();
                
                this.videoPlayer.addEventListener('loadeddata', () => {
                    this.videoPlayer.play().catch(error => {
                        console.log('Autoplay prevented:', error);
                    });
                }, { once: true });
            }

            destroyHls() {
                if (this.hls) {
                    this.hls.destroy();
                    this.hls = null;
                    console.log('HLS instance destroyed');
                }
            }

            togglePlayPause() {
                if (this.videoPlayer.paused) {
                    this.videoPlayer.play();
                } else {
                    this.videoPlayer.pause();
                }
            }

            previousChannel() {
                if (this.currentChannelIndex > 0) {
                    this.selectChannel(this.currentChannelIndex - 1);
                }
            }

            nextChannel() {
                if (this.currentChannelIndex < this.filteredChannels.length - 1) {
                    this.selectChannel(this.currentChannelIndex + 1);
                }
            }

            toggleMute() {
                this.videoPlayer.muted = !this.videoPlayer.muted;
                this.muteBtn.textContent = this.videoPlayer.muted ? '🔇' : '🔊';
            }

            setVolume(value) {
                this.videoPlayer.volume = value / 100;
            }

            toggleSidebarVisibility() {
                this.sidebar.classList.toggle('collapsed');
            }

            showLoading() {
                this.loadingSpinner.style.display = 'block';
            }

            hideLoading() {
                this.loadingSpinner.style.display = 'none';
            }

            updatePlayButton(playing) {
                this.playPauseBtn.textContent = playing ? '⏸️' : '▶️';
                this.isPlaying = playing;
            }

            handleVideoError() {
                this.hideLoading();
                const channel = this.filteredChannels[this.currentChannelIndex];
                this.showError(`Failed to load "${channel?.name || 'channel'}". Stream may be offline or require different player.`);
                
                // Clean up HLS instance on error
                this.destroyHls();
                
                // Try next channel automatically after 3 seconds
                setTimeout(() => {
                    if (this.currentChannelIndex < this.filteredChannels.length - 1) {
                        console.log('Auto-switching to next channel...');
                        this.nextChannel();
                    }
                }, 3000);
            }

            showError(message) {
                this.errorMessage.textContent = message;
                this.errorMessage.style.display = message ? 'block' : 'none';
            }

            hideError() {
                this.errorMessage.style.display = 'none';
            }

            handleKeyboard(e) {
                switch(e.code) {
                    case 'Space':
                        e.preventDefault();
                        this.togglePlayPause();
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.previousChannel();
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.nextChannel();
                        break;
                    case 'KeyM':
                        this.toggleMute();
                        break;
                }
            }
        }

        // Initialize the player
        const player = new IPTVPlayer();