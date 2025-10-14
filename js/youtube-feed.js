class YouTubeFeed {
    constructor() {
        this.API_KEY = 'AIzaSyB8Gbml84v3dSwJA5uYi3WmNh9BRSMoBtw';
        // NSO Gaming channels
        this.channels = [
            'UCOfsd43LZ_SMw4AFmG0L3KQ', // NSOMatrix™
            'UC8XfQiVVvi2DGG7avYaSMow', // NSOCAN TV
            'UCo8MMloNcTf27xo1iBbfq6g', // Hoàng Phong Monster
            'UCRAogED-p7L2MDwQtmehBiQ', // Trung Đức TV
            'UCuI4SZYHNkOBz62br7A9IuA', // Kẹo Mút Chơi Bời
            'UCaA5P81BI_gZyAQdaHm1YKw', // Dứa NSO
            'UCZk0odBlWeBMrOCS7t7PHVQ', // VIETSO1
            'UCnO7e8itjKx_3rExMX64LTw', // Hậu Đần NSO
            'UCOOJb8dRZ0uLrltM0u3y5JA', // TRẦN THƯ NSO
            'UCFsBOEMym3kboXz9EiYAkDw'  // Nguyễn Khải Nso
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
                title: 'NSO Matrix Gaming Highlights',
                thumbnail: 'data/Pictures/matrix.png',
                channel: 'NSOMatrix™',
                publishedAt: '2024-01-15T10:00:00Z',
                description: 'Best NSO gaming moments and highlights'
            },
            {
                id: 'jNQXAC9IVRw',
                title: 'NSO Mobile Gaming Guide',
                thumbnail: 'data/Pictures/nso.webp',
                channel: 'NSOCAN TV',
                publishedAt: '2024-01-14T15:30:00Z',
                description: 'Complete NSO mobile gaming setup'
            },
            {
                id: 'y6120QOlsfU',
                title: 'Monster Hunter NSO Tips',
                thumbnail: 'data/Pictures/microemulator.png',
                channel: 'Hoàng Phong Monster',
                publishedAt: '2024-01-13T12:00:00Z',
                description: 'Advanced monster hunting strategies'
            },
            {
                id: 'kJQP7kiw5Fk',
                title: 'NSO PvP Battle Compilation',
                thumbnail: 'data/Pictures/char.gif',
                channel: 'Trung Đức TV',
                publishedAt: '2024-01-12T09:15:00Z',
                description: 'Epic PvP battles and combat tips'
            },
            {
                id: 'L_jWHffIx5E',
                title: 'NSO Equipment Guide',
                thumbnail: 'data/Pictures/youtube.png',
                channel: 'Kẹo Mút Chơi Bời',
                publishedAt: '2024-01-11T14:45:00Z',
                description: 'Best equipment and upgrade strategies'
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
        const isMobile = window.innerWidth <= 768;
        const videosToShow = isMobile ? this.videos : this.videos.slice(this.currentIndex, this.currentIndex + this.videosPerView);
        
        feedContainer.innerHTML = videosToShow.map(video => `
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