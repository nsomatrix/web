// Homepage Enhancement Features
class HomepageEnhancements {
    constructor() {
        this.init();
    }

    init() {
        this.addMatrixRain();
        this.addInteractiveElements();
        this.addVisitorCounter();
        this.addEasterEggs();
    }

    // Matrix rain effect
    addMatrixRain() {
        const canvas = document.createElement('canvas');
        canvas.id = 'matrix-rain';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: -2;
            pointer-events: none;
            opacity: 0.1;
        `;
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops = Array(Math.floor(columns)).fill(1);

        function draw() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#00ff00';
            ctx.font = fontSize + 'px monospace';

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }

        setInterval(draw, 50);
    }

    // Interactive hover effects
    addInteractiveElements() {
        // Enhanced logo interaction
        const logo = document.querySelector('.hero-logo');
        if (logo) {
            logo.addEventListener('click', () => {
                logo.style.transform = 'scale(1.2) rotate(360deg)';
                logo.style.filter = 'drop-shadow(0 0 30px #ff0000) hue-rotate(90deg)';
                setTimeout(() => {
                    logo.style.transform = '';
                    logo.style.filter = 'drop-shadow(0 0 10px #ff0000)';
                }, 1000);
            });
        }

        // Card pulse on hover
        const cards = document.querySelectorAll('.stats-card, .dialogue-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.animation = 'pulse 0.5s ease-in-out';
            });
            card.addEventListener('mouseleave', () => {
                card.style.animation = 'shimmer 6s ease-in-out infinite';
            });
        });
    }

    // Visitor counter
    addVisitorCounter() {
        const visitorCount = localStorage.getItem('visitorCount') || 0;
        const newCount = parseInt(visitorCount) + 1;
        localStorage.setItem('visitorCount', newCount);

        const counterElement = document.createElement('div');
        counterElement.className = 'visitor-counter';
        counterElement.innerHTML = `
            <div class="counter-display">
                <span class="counter-label">Visitors:</span>
                <span class="counter-number">${newCount.toLocaleString()}</span>
            </div>
        `;
        
        const statsCard = document.querySelector('.stats-card');
        if (statsCard) {
            statsCard.appendChild(counterElement);
        }
    }

    // Easter eggs
    addEasterEggs() {
        // Konami code easter egg
        let konamiCode = [];
        const konamiSequence = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA

        document.addEventListener('keydown', (e) => {
            konamiCode.push(e.keyCode);
            if (konamiCode.length > konamiSequence.length) {
                konamiCode.shift();
            }
            
            if (JSON.stringify(konamiCode) === JSON.stringify(konamiSequence)) {
                this.activateMatrixMode();
                konamiCode = [];
            }
        });

        // Click counter easter egg
        let clickCount = 0;
        document.addEventListener('click', () => {
            clickCount++;
            if (clickCount === 10) {
                this.showSecretMessage();
                clickCount = 0;
            }
        });
    }

    activateMatrixMode() {
        document.body.style.filter = 'hue-rotate(120deg) contrast(1.2)';
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            padding: 20px;
            border: 2px solid #00ff00;
            border-radius: 10px;
            font-family: monospace;
            z-index: 10000;
            text-align: center;
        `;
        message.innerHTML = `
            <h3>MATRIX MODE ACTIVATED</h3>
            <p>Welcome to the real world, Neo.</p>
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
            document.body.removeChild(message);
            document.body.style.filter = '';
        }, 3000);
    }

    showSecretMessage() {
        const messages = [
            "There is no spoon.",
            "Follow the white rabbit.",
            "The Matrix has you...",
            "Wake up, Neo.",
            "Free your mind."
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        const dialogueText = document.getElementById('dialogue-text');
        if (dialogueText) {
            const originalText = dialogueText.innerHTML;
            dialogueText.innerHTML = randomMessage;
            dialogueText.style.color = '#00ff00';
            
            setTimeout(() => {
                dialogueText.innerHTML = originalText;
                dialogueText.style.color = '';
            }, 2000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HomepageEnhancements();
});