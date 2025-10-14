class YouTubeFeed {
    constructor() {
        this.API_KEY = 'AIzaSyB8Gbml84v3dSwJA5uYi3WmNh9BRSMoBtw';
        // Gaming & Tech channels - customize these
        this.channels = [
            'UCXuqSBlHAE6Xw-yeJA0Tunw', // Linus Tech Tips
            'UCBJycsmduvYEL83R_U4JriQ', // Marques Brownlee
            'UCsooa4yRKGN_zEE8iknghZA', // TechCrunch
            'UCR-DXc1voovS8nhAvccRZhg', // Jeff Geerling
            'UC0vBXGSyV14uvJ4hECDOl0Q'  // Unbox Therapy
        ];
        this.videos = [];
        this.currentIndex = 0;
        this.videosPerView = window.innerWidth <= 768 ? 1 : 3;
        
        this.init();
    }
    
    async init() {
        await this.loadVideos();
        this.setupNavigation();
        this.render();
    }
    
    async loadVideos() {
        console.log('🎥 Loading YouTube videos...');
        
        try {
            this.videos = await this.fetchFromAPI();
            if (this.videos.length === 0) {
                console.log('⚠️ No videos from API, using fallback');
                this.videos = this.getFallbackVideos();
            }
        } catch (error) {
            console.log('❌ YouTube API failed:', error);
            this.videos = this.getFallbackVideos();
        }
        
        console.log(`✅ Loaded ${this.videos.length} videos`);
    }
    
    async fetchFromAPI() {
        const allVideos = [];
        
        // Try first channel as test
        const testChannelId = this.channels[0];
        const testUrl = `https://www.googleapis.com/youtube/v3/search?key=${this.API_KEY}&channelId=${testChannelId}&part=snippet&order=date&maxResults=2&type=video`;
        
        console.log('🔍 Testing API with:', testUrl);
        
        try {
            const response = await fetch(testUrl);
            const data = await response.json();
            
            console.log('📡 API Response:', data);
            
            if (data.error) {
                console.log('❌ API Error:', data.error.message);
                throw new Error(data.error.message);
            }
            
            if (data.items && data.items.length > 0) {
                // API works, fetch from all channels
                for (const channelId of this.channels) {
                    try {
                        const response = await fetch(
                            `https://www.googleapis.com/youtube/v3/search?key=${this.API_KEY}&channelId=${channelId}&part=snippet&order=date&maxResults=3&type=video`
                        );
                        const channelData = await response.json();
                        
                        if (channelData.items) {
                            allVideos.push(...channelData.items.map(item => ({
                                id: item.id.videoId,
                                title: item.snippet.title,
                                thumbnail: item.snippet.thumbnails.medium.url,
                                channel: item.snippet.channelTitle,
                                publishedAt: item.snippet.publishedAt,
                                description: item.snippet.description
                            })));
                        }
                    } catch (error) {
                        console.log(`❌ Failed to fetch from channel ${channelId}:`, error);
                    }
                }
            }
        } catch (error) {
            console.log('❌ API test failed:', error);
            throw error;
        }
        
        return allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }
    
    getFallbackVideos() {
        return [
            {
                id: 'dQw4w9WgXcQ',
                title: 'Matrix Terminal Advanced Features',
                thumbnail: 'data/Pictures/matrix.png',
                channel: 'Matrix Gaming',
                publishedAt: '2024-01-15T10:00:00Z',
                description: 'Learn advanced terminal commands and features'
            },
            {
                id: 'jNQXAC9IVRw',
                title: 'NSO Mobile Gaming Setup Guide',
                thumbnail: 'data/Pictures/nso.webp',
                channel: 'Mobile Gaming Pro',
                publishedAt: '2024-01-14T15:30:00Z',
                description: 'Complete setup guide for mobile gaming'
            },
            {
                id: 'y6120QOlsfU',
                title: 'J2ME Emulator Comparison 2024',
                thumbnail: 'data/Pictures/microemulator.png',
                channel: 'Retro Gaming Hub',
                publishedAt: '2024-01-13T12:00:00Z',
                description: 'Best J2ME emulators compared and reviewed'
            },
            {
                id: 'kJQP7kiw5Fk',
                title: 'Database Optimization Tips',
                thumbnail: 'data/Pictures/char.gif',
                channel: 'Dev Tips',
                publishedAt: '2024-01-12T09:15:00Z',
                description: 'Optimize your database queries for better performance'
            },
            {
                id: 'L_jWHffIx5E',
                title: 'Gaming Statistics Analysis',
                thumbnail: 'data/Pictures/youtube.png',
                channel: 'Game Analytics',
                publishedAt: '2024-01-11T14:45:00Z',
                description: 'Deep dive into gaming statistics and trends'
            }
        ];
    }
    
    formatTimeAgo(dateString) {
        const now = new Date();
        const published = new Date(dateString);
        const diffMs = now - published;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    }
    
    render() {
        const feedContainer = document.getElementById('youtubeFeed');
        const visibleVideos = this.videos.slice(this.currentIndex, this.currentIndex + this.videosPerView);
        
        feedContainer.innerHTML = visibleVideos.map(video => `
            <div class="youtube-video-card" onclick="window.youtubeFeed.playVideo('${video.id}', '${video.title.replace(/'/g, '').replace(/"/g, '')}')">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}" onerror="this.src='data/Pictures/matrix.png'">
                    <div class="play-overlay">
                        <i class="fab fa-youtube"></i>
                    </div>
                    <div class="video-duration">HD</div>
                </div>
                <div class="video-info">
                    <h4>${video.title.length > 50 ? video.title.substring(0, 50) + '...' : video.title}</h4>
                    <p class="channel-name">${video.channel}</p>
                    <p class="video-meta">${this.formatTimeAgo(video.publishedAt)}</p>
                </div>
            </div>
        `).join('');
        
        this.updateNavButtons();
    }
    
    setupNavigation() {
        const leftBtn = document.getElementById('scrollLeft');
        const rightBtn = document.getElementById('scrollRight');
        
        leftBtn.addEventListener('click', () => this.scrollLeft());
        rightBtn.addEventListener('click', () => this.scrollRight());
    }
    
    scrollLeft() {
        const feedContainer = document.getElementById('youtubeFeed');
        if (window.innerWidth <= 768) {
            feedContainer.scrollBy({ left: -300, behavior: 'smooth' });
        } else {
            if (this.currentIndex > 0) {
                this.currentIndex = Math.max(0, this.currentIndex - this.videosPerView);
                this.render();
            }
        }
    }
    
    scrollRight() {
        const feedContainer = document.getElementById('youtubeFeed');
        if (window.innerWidth <= 768) {
            feedContainer.scrollBy({ left: 300, behavior: 'smooth' });
        } else {
            if (this.currentIndex + this.videosPerView < this.videos.length) {
                this.currentIndex = Math.min(this.videos.length - this.videosPerView, this.currentIndex + this.videosPerView);
                this.render();
            }
        }
    }
    
    updateNavButtons() {
        const leftBtn = document.getElementById('scrollLeft');
        const rightBtn = document.getElementById('scrollRight');
        
        leftBtn.style.opacity = this.currentIndex === 0 ? '0.3' : '1';
        rightBtn.style.opacity = this.currentIndex + this.videosPerView >= this.videos.length ? '0.3' : '1';
        
        leftBtn.style.pointerEvents = this.currentIndex === 0 ? 'none' : 'auto';
        rightBtn.style.pointerEvents = this.currentIndex + this.videosPerView >= this.videos.length ? 'none' : 'auto';
    }
    
    playVideo(videoId, title) {
        const modal = document.createElement('div');
        modal.className = 'video-modal';
        modal.innerHTML = `
            <div class="video-player">
                <div class="video-header">
                    <span>${title}</span>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="video-content">
                    <iframe 
                        width="100%" 
                        height="400" 
                        src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Method to change channels dynamically
    setChannels(channelIds) {
        this.channels = channelIds;
        this.currentIndex = 0;
        this.loadVideos().then(() => this.render());
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.youtubeFeed = new YouTubeFeed();
    });
} else {
    window.youtubeFeed = new YouTubeFeed();
}