class YouTubeFeed {
    constructor() {
        // Use Cloudflare Worker URL instead of hardcoded API keys
        this.WORKER_URL = 'https://youtube-proxy.nsomtx.workers.dev';
        this.CACHE_KEY = 'youtube_feed_cache';
        this.CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
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
        this.autoSwipeTimer = null;
        this.isVideoPlaying = false;
        
        this.init();
    }
    
    async init() {
        await this.loadVideos();
        this.setupNavigation();
        this.render();
        this.startAutoSwipe();
    }
    
    async loadVideos() {
        // Check cache first
        const cached = this.getFromCache();
        if (cached) {
            this.videos = cached;
            return;
        }
        
        try {
            this.videos = await this.fetchFromAPI();
            if (this.videos.length > 0) {
                this.saveToCache(this.videos);
            } else {
                this.videos = this.getFallbackVideos();
            }
        } catch (error) {
            this.videos = this.getFallbackVideos();
        }
    }
    
    getFromCache() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < this.CACHE_DURATION) {
                    return data.videos;
                }
            }
        } catch (error) {
            console.log('Cache read error:', error);
        }
        return null;
    }
    
    saveToCache(videos) {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify({
                videos,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.log('Cache save error:', error);
        }
    }
    
    async fetchFromAPI() {
        try {
            const allVideos = [];
            const batchSize = 3;
            
            for (let i = 0; i < this.channels.length; i += batchSize) {
                const batch = this.channels.slice(i, i + batchSize);
                const promises = batch.map(async (channelId) => {
                    try {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        const response = await fetch(
                            `${this.WORKER_URL}/youtube-search?channelId=${channelId}&maxResults=2`
                        );
                        const data = await response.json();
                        
                        if (data.error) return [];
                        
                        return data.items ? data.items.map(item => ({
                            id: item.id.videoId,
                            title: item.snippet.title,
                            thumbnail: item.snippet.thumbnails.medium.url,
                            channel: item.snippet.channelTitle,
                            publishedAt: item.snippet.publishedAt,
                            description: item.snippet.description
                        })) : [];
                    } catch (error) {
                        return [];
                    }
                });
                
                const batchResults = await Promise.all(promises);
                allVideos.push(...batchResults.flat());
            }
            
            return allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
            
        } catch (error) {
            throw new Error('Worker request failed');
        }
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
        
        if (!isMobile) {
            feedContainer.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        }
        
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
                feedContainer.style.opacity = '0.7';
                feedContainer.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    this.currentIndex = Math.max(0, this.currentIndex - this.videosPerView);
                    this.render();
                    feedContainer.style.opacity = '1';
                    feedContainer.style.transform = 'translateX(0)';
                }, 200);
            }
        }
    }
    
    scrollRight() {
        const feedContainer = document.getElementById('youtubeFeed');
        if (window.innerWidth <= 768) {
            feedContainer.scrollBy({ left: 300, behavior: 'smooth' });
        } else {
            if (this.currentIndex + this.videosPerView < this.videos.length) {
                feedContainer.style.opacity = '0.7';
                feedContainer.style.transform = 'translateX(20px)';
                
                setTimeout(() => {
                    this.currentIndex = Math.min(this.videos.length - this.videosPerView, this.currentIndex + this.videosPerView);
                    this.render();
                    feedContainer.style.opacity = '1';
                    feedContainer.style.transform = 'translateX(0)';
                }, 200);
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
    
    startAutoSwipe() {
        this.autoSwipeTimer = setInterval(() => {
            if (!this.isVideoPlaying && this.videos.length > 0) {
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                    const feedContainer = document.getElementById('youtubeFeed');
                    const maxScroll = feedContainer.scrollWidth - feedContainer.clientWidth;
                    if (feedContainer.scrollLeft >= maxScroll) {
                        feedContainer.scrollTo({ left: 0, behavior: 'smooth' });
                    } else {
                        feedContainer.scrollBy({ left: 300, behavior: 'smooth' });
                    }
                } else {
                    if (this.currentIndex + this.videosPerView >= this.videos.length) {
                        this.currentIndex = 0;
                        this.render();
                    } else {
                        this.scrollRight();
                    }
                }
            }
        }, 4000);
    }
    
    stopAutoSwipe() {
        if (this.autoSwipeTimer) {
            clearInterval(this.autoSwipeTimer);
            this.autoSwipeTimer = null;
        }
    }
    
    playVideo(videoId, title) {
        this.isVideoPlaying = true;
        this.stopAutoSwipe();
        
        const modal = document.createElement('div');
        modal.className = 'video-modal';
        modal.innerHTML = `
            <div class="video-player">
                <div class="video-header">
                    <span>${title}</span>
                    <button onclick="window.youtubeFeed.closeVideo(this)">&times;</button>
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
    
    closeVideo(button) {
        this.isVideoPlaying = false;
        button.parentElement.parentElement.parentElement.remove();
        this.startAutoSwipe();
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