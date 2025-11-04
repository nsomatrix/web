// Gaming Setup JavaScript
class GameSetup {
    constructor() {
        this.currentStep = 1;
        this.selectedAvatarIndex = 0;
        this.avatars = [];
        this.usernameValid = false;
        this.avatarSelected = false;
        
        this.init();
    }

    async init() {
        await this.loadAvatars();
        this.setupEventListeners();
        this.setupUsernameValidation();
        this.updateProgress();
    }

    async loadAvatars() {
        try {
            const response = await fetch(window.getAssetPath('avatars/avatars.json'));
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.avatars = await response.json();
            
            if (this.avatars.length > 0) {
                this.setupAvatarNavigation();
                this.updateAvatarDisplay();
                this.avatarSelected = true;
            }
        } catch (error) {
            console.error("Error loading avatars:", error);
            this.showFeedback("Could not load avatars", "error");
        }
    }

    setupAvatarNavigation() {
        const prevBtn = document.getElementById('prevAvatarBtn');
        const nextBtn = document.getElementById('nextAvatarBtn');
        
        prevBtn.addEventListener('click', () => {
            this.selectedAvatarIndex = (this.selectedAvatarIndex - 1 + this.avatars.length) % this.avatars.length;
            this.updateAvatarDisplay();
        });
        
        nextBtn.addEventListener('click', () => {
            this.selectedAvatarIndex = (this.selectedAvatarIndex + 1) % this.avatars.length;
            this.updateAvatarDisplay();
        });
    }

    updateAvatarDisplay() {
        const previewImg = document.getElementById('currentAvatarDisplay');
        previewImg.src = window.getAssetPath(`avatars/${this.avatars[this.selectedAvatarIndex]}`);
        this.validateForm();
    }

    setupUsernameValidation() {
        const usernameInput = document.getElementById('usernameInput');
        
        let debounceTimer;
        
        usernameInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.validateUsername(e.target.value.trim());
            }, 300);
        });

        usernameInput.addEventListener('keydown', (e) => {
            const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
            const char = e.key;
            
            if (!allowedKeys.includes(e.key) && 
                !/^[a-zA-Z0-9_]$/.test(char)) {
                e.preventDefault();
            }
        });
    }

    async validateUsername(username) {
        const input = document.getElementById('usernameInput');
        const feedback = document.getElementById('usernameFeedback');
        
        input.classList.remove('valid', 'invalid');
        this.usernameValid = false;

        if (!username) {
            feedback.innerHTML = '';
            this.validateForm();
            return;
        }

        if (username.length < 3) {
            this.showUsernameFeedback('Username must be at least 3 characters', 'error');
            input.classList.add('invalid');
            this.validateForm();
            return;
        }

        if (username.length > 20) {
            this.showUsernameFeedback('Username must be less than 20 characters', 'error');
            input.classList.add('invalid');
            this.validateForm();
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showUsernameFeedback('Username can only contain letters, numbers, and underscores', 'error');
            input.classList.add('invalid');
            this.validateForm();
            return;
        }

        // Check Firebase for existing usernames
        try {
            feedback.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking availability...';
            
            const db = firebase.firestore();
            
            const tagQuery = await db.collection('players')
                .where('usernameTag', '==', username.toLowerCase())
                .get();
            const nameQuery = await db.collection('players')
                .where('username', '==', username)
                .get();
            
            const currentUser = firebase.auth().currentUser;
            let userExists = false;
            [...tagQuery.docs, ...nameQuery.docs].forEach(doc => {
                if (!currentUser || doc.id !== currentUser.uid) {
                    userExists = true;
                }
            });
            
            if (userExists) {
                this.showUsernameFeedback('Username is already taken', 'error');
                input.classList.add('invalid');
                this.validateForm();
                return;
            }

            this.showUsernameFeedback('Username is available!', 'success');
            input.classList.add('valid');
            this.usernameValid = true;
            this.validateForm();
            
        } catch (error) {
            console.error('Username validation error:', error);
            this.showUsernameFeedback('Could not verify username availability', 'error');
            input.classList.add('invalid');
            this.validateForm();
        }
    }

    showUsernameFeedback(message, type) {
        const feedback = document.getElementById('usernameFeedback');
        const icon = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
        
        feedback.innerHTML = `<i class="${icon}"></i> ${message}`;
        feedback.className = `username-feedback ${type}`;
    }

    validateForm() {
        const saveBtn = document.getElementById('saveProfileBtn');
        const isValid = this.usernameValid && this.avatarSelected;
        
        saveBtn.disabled = !isValid;
        
        if (isValid) {
            this.currentStep = 2;
            this.updateProgress();
        } else {
            this.currentStep = 1;
            this.updateProgress();
        }
    }

    updateProgress() {
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        
        step1.classList.remove('active', 'completed');
        step2.classList.remove('active', 'completed');
        
        if (this.currentStep >= 1) {
            if (this.usernameValid) {
                step1.classList.add('completed');
            } else {
                step1.classList.add('active');
            }
        }
        
        if (this.currentStep >= 2) {
            step2.classList.add('active');
            if (this.usernameValid && this.avatarSelected) {
                step2.classList.add('completed');
            }
        }
    }

    setupEventListeners() {
        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveProfile();
            });
        }

        const usernameInput = document.getElementById('usernameInput');
        if (usernameInput) {
            usernameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !saveBtn.disabled) {
                    this.saveProfile();
                }
            });
        }
    }

    async saveProfile() {
        if (!this.usernameValid || !this.avatarSelected) {
            this.showFeedback("Please complete all fields", "error");
            return;
        }

        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            this.showFeedback("Please login first", "error");
            return;
        }

        const saveBtn = document.getElementById('saveProfileBtn');
        const username = document.getElementById('usernameInput').value.trim();
        const selectedAvatar = this.avatars[this.selectedAvatarIndex];

        saveBtn.classList.add('loading');
        saveBtn.disabled = true;

        try {
            const db = firebase.firestore();
            const user = currentUser;
            
            // Check for existing username before saving
            const tagQuery = await db.collection('players')
                .where('usernameTag', '==', username.toLowerCase())
                .get();
            const nameQuery = await db.collection('players')
                .where('username', '==', username)
                .get();
            
            const existingUser = [...tagQuery.docs, ...nameQuery.docs]
                .find(doc => doc.id !== user.uid);
            
            if (existingUser) {
                this.showFeedback("Username is already taken", "error");
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                return;
            }
            
            const playerDocRef = db.collection('players').doc(user.uid);
            const playerDoc = await playerDocRef.get();
            const data = playerDoc.exists ? playerDoc.data() : {};

            await playerDocRef.set({
                username: username,
                avatar: selectedAvatar,
                usernameTag: username.toLowerCase(),
                level: data.level || 1,
                profileSetup: true,
                setupCompletedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            document.getElementById('setup-section').style.display = 'none';
            document.getElementById('main-dashboard').style.display = 'block';
            
            document.getElementById('dashboard-username').textContent = username;
            document.getElementById('user-avatar').src = window.getAssetPath(`avatars/${selectedAvatar}`);
            document.getElementById('username-tag').textContent = `@${username.toLowerCase()}`;
            
            this.showFeedback("Profile created successfully!", "success");

        } catch (error) {
            console.error("Error saving profile:", error);
            this.showFeedback("Failed to save profile: " + error.message, "error");
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
        }
    }

    showFeedback(message, type) {
        let messageBox = document.getElementById('setup-message-box');
        if (!messageBox) {
            messageBox = document.createElement('div');
            messageBox.id = 'setup-message-box';
            messageBox.style.cssText = `
                position: fixed;
                top: 2rem;
                right: 2rem;
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid #ff0000;
                border-radius: 8px;
                padding: 1rem 1.5rem;
                box-shadow: 0 0 20px rgba(255, 0, 0, 0.3);
                z-index: 10000;
                max-width: 300px;
                backdrop-filter: blur(20px);
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `;
            document.body.appendChild(messageBox);
        }

        const colors = {
            success: '#00ff00',
            error: '#ff4444',
            warning: '#ffaa00',
            info: '#00aaff'
        };

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        messageBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; color: ${colors[type]};">
                <i class="${icons[type]}"></i>
                <span>${message}</span>
            </div>
        `;
        
        messageBox.style.borderColor = colors[type];
        
        setTimeout(() => {
            messageBox.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            messageBox.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (messageBox.parentNode) {
                    messageBox.parentNode.removeChild(messageBox);
                }
            }, 300);
        }, 3000);
    }

    initializeWithData(username, avatarName) {
        if (username) {
            document.getElementById('usernameInput').value = username;
            this.validateUsername(username);
        }
        
        if (avatarName && this.avatars.includes(avatarName)) {
            this.selectedAvatarIndex = this.avatars.indexOf(avatarName);
            this.updateAvatarDisplay();
        }
    }
}

// Initialize when needed
window.GameSetup = GameSetup;

// Simple initialization
if (typeof window !== 'undefined') {
    window.initGameSetup = function() {
        if (!window.gameSetupInstance) {
            window.gameSetupInstance = new GameSetup();
        }
    };
}