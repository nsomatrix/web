// Unified Dashboard JavaScript
import { FIREBASE_CONFIG } from './modules/config.js';
import { AuthManager } from './modules/auth.js';
import { FileManager } from './modules/files.js';
import { NotesManager } from './modules/notes.js';
import { PasswordManager } from './modules/passwords.js';
import { showMessageBox, openModal, closeModal } from './modules/ui.js';

// Initialize Firebase
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();


// Global variables
let allAvatars = [];
let currentAvatarIndex = 0;
let authManager, fileManager, notesManager, passwordManager;
let currentChatFriend = null;
let messageListener = null;
let messageCache = new Map();
let isTyping = false;

// Desktop Dashboard Enhancement
class DesktopDashboard {
    constructor() {
        this.init();
    }

    init() {
        this.setupResponsive();
    }

    setupResponsive() {
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        this.handleResize();
    }

    handleResize() {
        const sidebar = document.querySelector('.dashboard-sidebar');
        if (window.innerWidth <= 768) {
            if (sidebar) sidebar.style.display = 'none';
        } else {
            if (sidebar) sidebar.style.display = 'flex';
        }
    }
}

// Initialize managers
function initializeManagers() {
    authManager = new AuthManager(auth, db);
    fileManager = new FileManager(authManager);
    notesManager = new NotesManager(authManager, db);
    passwordManager = new PasswordManager(authManager, db);
}

// Avatar functions
async function loadAvatars() {
    try {
        const response = await fetch('avatars/avatars.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allAvatars = await response.json();
        if (allAvatars.length > 0) {
            document.getElementById('currentAvatarDisplay').src = `avatars/${allAvatars[currentAvatarIndex]}`;
        }
    } catch (error) {
        console.error("Error loading avatars:", error);
        showMessageBox("Could not load avatars", "error", 3000);
    }
}

function updateAvatarDisplay() {
    if (allAvatars.length > 0) {
        document.getElementById('currentAvatarDisplay').src = `avatars/${allAvatars[currentAvatarIndex]}`;
    }
}

// Profile management
async function saveProfile(user) {
    const username = document.getElementById('usernameInput').value.trim();
    const selectedAvatar = allAvatars[currentAvatarIndex];

    if (!username || !selectedAvatar) {
        showMessageBox("Please enter username and select avatar", "error", 3000);
        return;
    }

    const saveProfileBtn = document.getElementById('saveProfileBtn');
    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = "Saving...";

    try {
        const playerDocRef = db.collection('players').doc(user.uid);
        const playerDoc = await playerDocRef.get();
        const data = playerDoc.exists ? playerDoc.data() : {};

        await db.collection('players').doc(user.uid).set({
            username: username,
            avatar: selectedAvatar,
            usernameTag: username.toLowerCase(),
            level: data.level || 1
        }, { merge: true });

        showMessageBox("Profile saved successfully", "success", 3000);
        document.getElementById('setup-section').style.display = 'none';
        document.getElementById('main-dashboard').style.display = 'block';
        document.getElementById('dashboard-username').textContent = username;
        document.getElementById('user-avatar').src = `avatars/${selectedAvatar}`;
        setupUsernameTag(username, username);
        
        setupNotificationHandlers();
        setupOnlinePresence();
        setupNotificationCounters();

    } catch (error) {
        console.error("Error saving profile:", error);
        showMessageBox("Failed to save profile: " + error.message, "error", 3000);
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = "Save Profile";
    }
}

// Dashboard setup
async function setupDashboard(user) {
    authManager.currentUser = user;
    const playerDocRef = db.collection('players').doc(user.uid);

    try {
        const doc = await playerDocRef.get();
        const data = doc.exists ? doc.data() : {};

        const hasUsername = !!data.username;
        const hasAvatar = !!data.avatar;
        const hasMasterPassword = !!data.hasMasterPassword;
        const lastLoginTimestamp = data.lastLogin;

        const keyRestored = await authManager.restoreEncryptionKey();
        
        // If key restoration failed, user likely reset password
        if (!keyRestored && data.encryptedMasterKey) {
            setTimeout(() => {
                showMessageBox('Password was reset. Use recovery key to access encrypted data.', 'warning', 5000);
            }, 2000);
        }

        if (!hasUsername || !hasAvatar) {
            if (allAvatars.length === 0) await loadAvatars();
            
            document.getElementById('setup-section').style.display = 'block';
            document.getElementById('main-dashboard').style.display = 'none';
            closeModal(document.getElementById('masterPasswordPromptModal'));

            // Initialize the new setup system
            if (window.initGameSetup) {
                window.initGameSetup();
            }
            
            return;
        }

        document.getElementById('dashboard-username').textContent = data.username;
        document.getElementById('user-avatar').src = `avatars/${data.avatar}`;
        setupUsernameTag(data.usernameTag, data.username);
        document.getElementById('setup-section').style.display = 'none';
        document.getElementById('main-dashboard').style.display = 'block';
        closeModal(document.getElementById('masterPasswordPromptModal'));
        

        
        setupNotificationHandlers();
        setupOnlinePresence();
        setupNotificationCounters();

        // Update last login
        const lastLoginDisplay = document.getElementById('lastLoginDisplay');
        if (lastLoginDisplay) {
            if (lastLoginTimestamp) {
                const date = lastLoginTimestamp.toDate();
                lastLoginDisplay.innerHTML = `Last Login: ${date.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`;
            } else {
                lastLoginDisplay.innerHTML = `Last Login: Never`;
            }
            await playerDocRef.set({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }

    } catch (error) {
        console.error("Error setting up dashboard:", error);
        showMessageBox("Failed to load dashboard: " + error.message, "error", 3000);
    }
}

// Event Listeners
function setupEventListeners() {
    // Avatar navigation
    const prevAvatarBtn = document.getElementById('prevAvatarBtn');
    const nextAvatarBtn = document.getElementById('nextAvatarBtn');
    
    if (prevAvatarBtn) {
        prevAvatarBtn.onclick = () => {
            currentAvatarIndex = (currentAvatarIndex - 1 + allAvatars.length) % allAvatars.length;
            updateAvatarDisplay();
        };
    }

    if (nextAvatarBtn) {
        nextAvatarBtn.onclick = () => {
            currentAvatarIndex = (currentAvatarIndex + 1) % allAvatars.length;
            updateAvatarDisplay();
        };
    }

    // Profile save
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.onclick = () => {
            if (authManager.currentUser) {
                saveProfile(authManager.currentUser);
            } else {
                showMessageBox("Please login first", "error", 3000);
            }
        };
    }

    // Master password unlock/setup
    const unlockDashboardBtn = document.getElementById('unlockDashboardBtn');
    if (unlockDashboardBtn) {
        unlockDashboardBtn.onclick = async () => {
            const masterPassword = document.getElementById('masterPasswordUnlockInput').value.trim();
            const confirmPassword = document.getElementById('confirmMasterPasswordInput').value.trim();
            const isSetupMode = document.getElementById('confirmMasterPasswordInput').style.display !== 'none';
            
            unlockDashboardBtn.disabled = true;
            unlockDashboardBtn.textContent = isSetupMode ? "Setting up..." : "Unlocking...";

            let success = false;
            if (isSetupMode) {
                success = await setupMasterPassword(masterPassword, confirmPassword);
            } else {
                success = await authManager.unlockDashboard(masterPassword);
            }
            
            if (success) {
                const masterPasswordPromptModal = document.getElementById('masterPasswordPromptModal');
                closeModal(masterPasswordPromptModal);
                document.getElementById('masterPasswordUnlockInput').value = '';
                document.getElementById('confirmMasterPasswordInput').value = '';
                
                // Handle pending modal opens
                const notesModal = document.getElementById('notesModal');
                const passwordManagerModal = document.getElementById('passwordManagerModal');
                
                if (notesModal.dataset.pendingOpen === 'true') {
                    openModal(notesModal);
                    notesManager.loadNotes(document.getElementById('savedNotesDisplay'));
                    notesModal.dataset.pendingOpen = 'false';
                } else if (passwordManagerModal.dataset.pendingOpen === 'true') {
                    openModal(passwordManagerModal);
                    passwordManager.loadPasswords(document.getElementById('pmEntryList'));
                    passwordManagerModal.dataset.pendingOpen = 'false';
                }
            }

            unlockDashboardBtn.disabled = false;
            unlockDashboardBtn.textContent = isSetupMode ? "Set Master Password" : "Unlock Dashboard";
        };
    }

    // Forgot master password handler
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    if (forgotPasswordBtn) {
        forgotPasswordBtn.onclick = () => {
            document.getElementById('recoverySection').style.display = 'block';
        };
    }

    const recoverBtn = document.getElementById('recoverBtn');
    if (recoverBtn) {
        recoverBtn.onclick = async () => {
            const recoveryKey = document.getElementById('recoveryKeyInput').value.trim();
            recoverBtn.disabled = true;
            recoverBtn.textContent = 'Recovering...';
            
            if (await recoverWithKey(recoveryKey)) {
                closeModal(document.getElementById('recoveryKeyModal'));
                
                // Handle pending modal opens
                const notesModal = document.getElementById('notesModal');
                const passwordManagerModal = document.getElementById('passwordManagerModal');
                
                if (notesModal.dataset.pendingOpen === 'true') {
                    openModal(notesModal);
                    notesManager.loadNotes(document.getElementById('savedNotesDisplay'));
                    notesModal.dataset.pendingOpen = 'false';
                } else if (passwordManagerModal.dataset.pendingOpen === 'true') {
                    openModal(passwordManagerModal);
                    passwordManager.loadPasswords(document.getElementById('pmEntryList'));
                    passwordManagerModal.dataset.pendingOpen = 'false';
                }
            }
            
            recoverBtn.disabled = false;
            recoverBtn.textContent = 'Recover Access';
        };
    }

    const lostKeyBtn = document.getElementById('lostKeyBtn');
    if (lostKeyBtn) {
        lostKeyBtn.onclick = () => {
            showMessageBox('Lost your recovery key? Your only option is to delete your account and start over due to our zero-knowledge encryption model. We cannot recover your data without the key. Go to Dashboard → Delete Account to proceed.', 'error', 8000);
        };
    }

    // Password manager toggle
    setTimeout(() => {
        const togglePmPassword = document.getElementById('togglePmPassword');
        if (togglePmPassword) {
            togglePmPassword.addEventListener('click', () => {
                const pmPasswordInput = document.getElementById('pmPassword');
                const type = pmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                pmPasswordInput.setAttribute('type', type);
                const eyeIcon = togglePmPassword.querySelector('i');
                eyeIcon.classList.toggle('fa-eye');
                eyeIcon.classList.toggle('fa-eye-slash');
            });
        }
    }, 1000);
    
    const syncPasswordBtn = document.getElementById('syncPasswordBtn');
    if (syncPasswordBtn) {
        syncPasswordBtn.onclick = async () => {
            const currentPassword = document.getElementById('syncPasswordInput').value.trim();
            syncPasswordBtn.disabled = true;
            syncPasswordBtn.textContent = 'Syncing...';
            
            if (await syncWithCurrentPassword(currentPassword)) {
                document.getElementById('syncPasswordSection').style.display = 'none';
                closeModal(document.getElementById('masterPasswordPromptModal'));
                
                // Handle pending modal opens
                const notesModal = document.getElementById('notesModal');
                const passwordManagerModal = document.getElementById('passwordManagerModal');
                
                if (notesModal.dataset.pendingOpen === 'true') {
                    openModal(notesModal);
                    notesManager.loadNotes(document.getElementById('savedNotesDisplay'));
                    notesModal.dataset.pendingOpen = 'false';
                } else if (passwordManagerModal.dataset.pendingOpen === 'true') {
                    openModal(passwordManagerModal);
                    passwordManager.loadPasswords(document.getElementById('pmEntryList'));
                    passwordManagerModal.dataset.pendingOpen = 'false';
                }
            }
            
            syncPasswordBtn.disabled = false;
            syncPasswordBtn.textContent = 'Sync Password';
        };
    }
    
    const toggleSyncPassword = document.getElementById('toggleSyncPassword');
    if (toggleSyncPassword) {
        toggleSyncPassword.addEventListener('click', () => {
            const syncPasswordInput = document.getElementById('syncPasswordInput');
            const type = syncPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            syncPasswordInput.setAttribute('type', type);
            const eyeIcon = toggleSyncPassword.querySelector('i');
            eyeIcon.classList.toggle('fa-eye');
            eyeIcon.classList.toggle('fa-eye-slash');
        });
    }

    const cancelRecoveryBtn = document.getElementById('cancelRecoveryBtn');
    if (cancelRecoveryBtn) {
        cancelRecoveryBtn.onclick = () => {
            document.getElementById('recoverySection').style.display = 'none';
            document.getElementById('recoveryKeyInput').value = '';
        };
    }

    // Enter key for master password
    const masterPasswordUnlockInput = document.getElementById('masterPasswordUnlockInput');
    if (masterPasswordUnlockInput) {
        masterPasswordUnlockInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                unlockDashboardBtn.click();
            }
        });
    }

    // Feature buttons
    setupFeatureButtons();
    setupModalHandlers();
    setupDeleteHandlers();
    setupSearchAndMessaging();
}

function setupFeatureButtons() {
    const notesBtn = document.getElementById('notesBtn');
    if (notesBtn) {
        notesBtn.onclick = async () => {
            if (!authManager.currentEncryptionKey) {
                openModal(document.getElementById('recoveryKeyModal'));
                document.getElementById('notesModal').dataset.pendingOpen = 'true';
                document.getElementById('recoveryKeyInput').value = '';
                return;
            }
            openModal(document.getElementById('notesModal'));
            notesManager.loadNotes(document.getElementById('savedNotesDisplay'));
        };
    }

    const passwordManagerBtn = document.getElementById('passwordManagerBtn');
    if (passwordManagerBtn) {
        passwordManagerBtn.onclick = async () => {
            if (!authManager.currentEncryptionKey) {
                openModal(document.getElementById('recoveryKeyModal'));
                document.getElementById('passwordManagerModal').dataset.pendingOpen = 'true';
                document.getElementById('recoveryKeyInput').value = '';
                return;
            }
            openModal(document.getElementById('passwordManagerModal'));
            passwordManager.loadPasswords(document.getElementById('pmEntryList'));
        };
    }



    const serverBtn = document.getElementById('serverBtn');
    if (serverBtn) {
        serverBtn.onclick = () => {
            window.open("https://support.teamobi.com/login-game-3.html", "_blank");
        };
    }

    const friendsBtn = document.getElementById('friendsBtn');
    if (friendsBtn) {
        friendsBtn.onclick = () => {
            openModal(document.getElementById('friendsModal'));
            loadFriendsList();
        };
    }
}

function setupModalHandlers() {
    // Notes functionality
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    if (saveNoteBtn) {
        saveNoteBtn.onclick = async () => {
            const noteText = document.getElementById('noteInput').value.trim();
            const success = await notesManager.saveNote(noteText);
            if (success) {
                document.getElementById('noteInput').value = '';
            }
        };
    }

    // Password manager functionality
    const savePmEntryBtn = document.getElementById('savePmEntryBtn');
    if (savePmEntryBtn) {
        savePmEntryBtn.onclick = async () => {
            const serviceName = document.getElementById('pmServiceName').value.trim();
            const pmUsername = document.getElementById('pmUsername').value.trim();
            const pmPassword = document.getElementById('pmPassword').value.trim();
            
            const success = await passwordManager.savePassword(serviceName, pmUsername, pmPassword);
            if (success) {
                document.getElementById('pmServiceName').value = '';
                document.getElementById('pmUsername').value = '';
                document.getElementById('pmPassword').value = '';
            }
        };
    }



    // Modal close buttons
    document.querySelectorAll('.close-button').forEach(button => {
        const handleClose = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const modalId = e.target.dataset.modal;
            const modalElement = document.getElementById(modalId);
            if (modalElement) {
                closeModal(modalElement);
            } else {
                const modal = e.target.closest('.modal');
                if (modal) closeModal(modal);
            }
        };
        
        button.addEventListener('click', handleClose);
        button.addEventListener('touchend', handleClose);
    });
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
    
    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal[style*="display: flex"], .modal[style*="display: block"]');
            openModals.forEach(modal => closeModal(modal));
        }
    });
}

function setupDeleteHandlers() {
    // Delete account
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.onclick = () => {
            openModal(document.getElementById('deleteAccountConfirmModal'));
        };
    }

    const confirmDeleteAccountBtn = document.getElementById('confirmDeleteAccountBtn');
    if (confirmDeleteAccountBtn) {
        confirmDeleteAccountBtn.onclick = async () => {
            closeModal(document.getElementById('deleteAccountConfirmModal'));
            showMessageBox("Initiating account deletion...", 'info', 0);

            if (!authManager.currentUser) {
                showMessageBox("Please login first", "error", 3000);
                return;
            }

            try {
                const idToken = await authManager.currentUser.getIdToken();



                // Delete Firebase data
                const notesRef = db.collection('players').doc(authManager.currentUser.uid).collection('notes');
                const notesSnapshot = await notesRef.get();
                const deleteNotesPromises = [];
                notesSnapshot.forEach(doc => {
                    deleteNotesPromises.push(doc.ref.delete());
                });
                await Promise.all(deleteNotesPromises);

                const passwordsRef = db.collection('players').doc(authManager.currentUser.uid).collection('passwords');
                const passwordsSnapshot = await passwordsRef.get();
                const deletePasswordsPromises = [];
                passwordsSnapshot.forEach(doc => {
                    deletePasswordsPromises.push(doc.ref.delete());
                });
                await Promise.all(deletePasswordsPromises);

                await db.collection('players').doc(authManager.currentUser.uid).delete();
                await authManager.currentUser.delete();

                showMessageBox("Account deleted successfully", "success", 3000);
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 3000);

            } catch (error) {
                console.error("Error during account deletion:", error);
                showMessageBox("Failed to delete account: " + error.message, "error", 5000);

                if (error.code === 'auth/requires-recent-login') {
                    showMessageBox("Account deletion requires recent login. Please log in again.", "warning", 5000);
                    setTimeout(() => {
                        auth.signOut().then(() => {
                            window.location.href = "login.html";
                        });
                    }, 3000);
                }
            }
        };
    }

    // Note and password deletion confirmations

    document.getElementById('confirmDeleteNoteBtn').onclick = async () => {
        closeModal(document.getElementById('deleteNoteConfirmModal'));
        if (notesManager.noteToDeleteId) {
            await notesManager.deleteNote(notesManager.noteToDeleteId);
            notesManager.noteToDeleteId = null;
        }
    };

    document.getElementById('confirmDeletePmEntryBtn').onclick = async () => {
        closeModal(document.getElementById('deletePmEntryConfirmModal'));
        if (passwordManager.pmEntryToDeleteId) {
            await passwordManager.deletePassword(passwordManager.pmEntryToDeleteId);
            passwordManager.pmEntryToDeleteId = null;
        }
    };

    // Cancel buttons
    ['cancelDeleteNoteBtn', 'cancelDeletePmEntryBtn', 'cancelDeleteAccountBtn'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.onclick = () => {
                const modalId = btnId.replace('cancelDelete', 'delete').replace('Btn', 'ConfirmModal');
                closeModal(document.getElementById(modalId));
                showMessageBox("Cancelled!", "info", 2000);
            };
        }
    });
}

function setupSearchAndMessaging() {
    // Search functionality
    const searchIcon = document.getElementById('searchIcon');
    const userSearch = document.getElementById('userSearch');
    
    if (searchIcon) {
        searchIcon.onclick = () => {
            performUserSearch();
        };
    }

    if (userSearch) {
        userSearch.onkeydown = (e) => {
            if (e.key === 'Enter') {
                performUserSearch();
            }
        };
    }

    // Enhanced message functionality
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    if (sendMessageBtn) {
        sendMessageBtn.onclick = (e) => {
            e.preventDefault();
            sendNewMessage();
        };
    }

    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        // Enhanced input handling
        messageInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendNewMessage();
            }
        };
        
        // Auto-resize textarea
        messageInput.oninput = () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
        };
        
        // Focus management
        messageInput.onfocus = () => {
            setTimeout(() => {
                const messagesList = document.getElementById('messagesList');
                messagesList.scrollTop = messagesList.scrollHeight;
            }, 300);
        };
    }
}



// Authentication state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        if (authManager) {
            authManager.currentUser = user;
        }
        setTimeout(() => {
            setupDashboard(user);
        }, 2000);
    } else {
        console.log("No user logged in. Redirecting to login.html.");
        document.getElementById('setup-section').style.display = 'none';
        document.getElementById('main-dashboard').style.display = 'none';
        authManager?.clearSession();
        if (window.location.pathname !== '/login.html') {
            window.location.href = "login.html";
        }
    }
});

// Username tag functionality
function setupUsernameTag(usernameTag, displayName) {
    const usernameTagElement = document.getElementById('username-tag');
    
    if (usernameTag) {
        usernameTagElement.textContent = `@${usernameTag}`;
        usernameTagElement.classList.remove('editable');
    } else {
        usernameTagElement.textContent = 'Set username';
        usernameTagElement.classList.add('editable');
        
        usernameTagElement.onclick = () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'username-input';
            input.placeholder = 'Enter username';
            input.maxLength = 20;
            
            usernameTagElement.innerHTML = '';
            usernameTagElement.appendChild(input);
            input.focus();
            
            const saveUsername = async () => {
                const newUsername = input.value.trim().replace(/[^a-zA-Z0-9_]/g, '');
                if (newUsername && authManager.currentUser) {
                    try {
                        await db.collection('players').doc(authManager.currentUser.uid).update({
                            usernameTag: newUsername.toLowerCase()
                        });
                        usernameTagElement.textContent = `@${newUsername}`;
                        usernameTagElement.classList.remove('editable');
                        usernameTagElement.onclick = null;
                    } catch (error) {
                        console.error('Error saving username:', error);
                        usernameTagElement.textContent = 'Set username';
                    }
                } else {
                    usernameTagElement.textContent = 'Set username';
                }
            };
            
            input.onblur = saveUsername;
            input.onkeydown = (e) => {
                if (e.key === 'Enter') saveUsername();
            };
        };
    }
}

// Friends and search functionality
async function performUserSearch() {
    const searchTerm = document.getElementById('userSearch').value.trim();
    if (!searchTerm) return;

    try {
        const tagSnapshot = await db.collection('players')
            .where('usernameTag', '>=', searchTerm.toLowerCase())
            .where('usernameTag', '<=', searchTerm.toLowerCase() + '\uf8ff')
            .limit(10)
            .get();

        const nameSnapshot = await db.collection('players')
            .where('username', '>=', searchTerm)
            .where('username', '<=', searchTerm + '\uf8ff')
            .limit(10)
            .get();

        const results = new Map();
        
        tagSnapshot.forEach(doc => {
            if (doc.id !== authManager.currentUser.uid) {
                results.set(doc.id, { id: doc.id, ...doc.data() });
            }
        });
        
        nameSnapshot.forEach(doc => {
            if (doc.id !== authManager.currentUser.uid) {
                results.set(doc.id, { id: doc.id, ...doc.data() });
            }
        });

        displaySearchResults(Array.from(results.values()));
    } catch (error) {
        console.error('Search error:', error);
        showMessageBox('Search failed. Please try again.', 'error', 3000);
    }
}

async function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';

    if (results.length === 0) {
        searchResults.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No users found</p>';
    } else {
        for (const user of results) {
            const pendingRequest = await db.collection('players').doc(authManager.currentUser.uid)
                .collection('friendRequests').doc(user.id).get();
            
            const existingFriend = await db.collection('players').doc(authManager.currentUser.uid)
                .collection('friends').doc(user.id).get();
            
            const item = document.createElement('div');
            item.className = 'search-item';
            
            let actionButton = '';
            if (existingFriend.exists && existingFriend.data().status === 'accepted') {
                actionButton = '<span style="color: var(--accent-red);">Already Friends</span>';
            } else if (pendingRequest.exists && pendingRequest.data().status === 'pending') {
                actionButton = `<button class="accept-btn" onclick="acceptFriendRequest('${sanitizeInput(user.id)}', '${sanitizeInput(user.usernameTag)}')">Accept Request</button>`;
            } else {
                actionButton = `<button class="add-friend-btn btn btn-danger" onclick="addFriend('${sanitizeInput(user.id)}', '${sanitizeInput(user.usernameTag)}')">Add Friend</button>`;
            }
            
            item.innerHTML = `
                <div class="search-info">
                    <img src="avatars/${sanitizeInput(user.avatar)}" alt="Avatar" class="search-avatar">
                    <span>@${sanitizeInput(user.usernameTag)}</span>
                </div>
                <div class="search-actions">
                    ${actionButton}
                </div>
            `;
            searchResults.appendChild(item);
        }
    }

    openModal(document.getElementById('searchResultsModal'));
}

// Global functions for friend management
window.addFriend = async function(friendId, friendUsername) {
    try {
        const currentUserDoc = await db.collection('players').doc(authManager.currentUser.uid).get();
        const currentUserData = currentUserDoc.data();
        
        const requestData = {
            fromUserId: authManager.currentUser.uid,
            fromUsername: currentUserData.usernameTag || currentUserData.username,
            status: 'pending',
            sentAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('players').doc(friendId)
            .collection('friendRequests').doc(authManager.currentUser.uid).set(requestData);
        
        showMessageBox('Friend request sent!', 'success', 2000);
        closeModal(document.getElementById('searchResultsModal'));
    } catch (error) {
        console.error('Add friend error:', error);
        showMessageBox('Failed to send friend request', 'error', 3000);
    }
}

window.acceptFriendRequest = async function(fromUserId, fromUsername) {
    try {
        const batch = db.batch();
        const currentUserData = await db.collection('players').doc(authManager.currentUser.uid).get();
        
        // Clean up any existing friend documents first
        const existingFriends = await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friends').where('friendId', '==', fromUserId).get();
        existingFriends.forEach(doc => batch.delete(doc.ref));
        
        const existingReverseFriends = await db.collection('players').doc(fromUserId)
            .collection('friends').where('friendId', '==', authManager.currentUser.uid).get();
        existingReverseFriends.forEach(doc => batch.delete(doc.ref));
        
        // Create new friend relationships using friendId as document ID
        const friendRef1 = db.collection('players').doc(authManager.currentUser.uid)
            .collection('friends').doc(fromUserId);
        batch.set(friendRef1, {
            friendId: fromUserId,
            username: fromUsername,
            status: 'accepted',
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const friendRef2 = db.collection('players').doc(fromUserId)
            .collection('friends').doc(authManager.currentUser.uid);
        batch.set(friendRef2, {
            friendId: authManager.currentUser.uid,
            username: currentUserData.data().usernameTag,
            status: 'accepted',
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Mark friend request as accepted
        const requestRef = db.collection('players').doc(authManager.currentUser.uid)
            .collection('friendRequests').doc(fromUserId);
        batch.update(requestRef, { status: 'accepted' });

        // Send notification
        const notificationRef = db.collection('players').doc(fromUserId)
            .collection('notifications').doc();
        batch.set(notificationRef, {
            type: 'friend_accepted',
            fromUserId: authManager.currentUser.uid,
            fromUsername: currentUserData.data().usernameTag,
            message: `@${currentUserData.data().usernameTag} accepted your friend request`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });

        await batch.commit();
        showMessageBox('Friend request accepted!', 'success', 2000);
        loadNotifications();
    } catch (error) {
        console.error('Accept friend request error:', error);
        showMessageBox('Failed to accept friend request', 'error', 3000);
    }
}

window.rejectFriendRequest = async function(fromUserId) {
    try {
        await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friendRequests').doc(fromUserId).update({
                status: 'rejected'
            });

        showMessageBox('Friend request rejected', 'info', 2000);
        loadNotifications();
    } catch (error) {
        console.error('Reject friend request error:', error);
        showMessageBox('Failed to reject friend request', 'error', 3000);
    }
}

window.markAsRead = async function(notificationId) {
    try {
        await db.collection('players').doc(authManager.currentUser.uid)
            .collection('notifications').doc(notificationId).update({
                read: true
            });
        loadNotifications();
    } catch (error) {
        console.error('Mark as read error:', error);
    }
}

window.removeFriend = async function(friendId) {
    try {
        const batch = db.batch();
        
        // Delete using document ID (friendId)
        const friendRef1 = db.collection('players').doc(authManager.currentUser.uid)
            .collection('friends').doc(friendId);
        batch.delete(friendRef1);
        
        const friendRef2 = db.collection('players').doc(friendId)
            .collection('friends').doc(authManager.currentUser.uid);
        batch.delete(friendRef2);
        
        await batch.commit();
        showMessageBox('Friend removed', 'info', 2000);
        loadFriendsList();
    } catch (error) {
        console.error('Remove friend error:', error);
        showMessageBox('Failed to remove friend', 'error', 3000);
    }
}

window.sendMessage = function(friendId) {
    currentChatFriend = friendId;
    openModal(document.getElementById('messagesModal'));
    loadMessages(friendId);
}

// Modern messaging system
async function loadMessages(friendId) {
    try {
        currentChatFriend = friendId;
        
        const friendDoc = await db.collection('players').doc(friendId).get();
        const friendData = friendDoc.data();
        document.getElementById('messageModalTitle').textContent = `Chat with @${sanitizeInput(friendData.usernameTag)}`;
        
        // Show message input when opening a chat
        const messageInputContainer = document.querySelector('.message-input-container');
        if (messageInputContainer) messageInputContainer.style.display = 'block';
        
        // Clean up previous listener
        if (messageListener) {
            messageListener();
            messageListener = null;
        }
        
        console.log('Setting up message listener for:', friendId);
        
        // Real-time listener using participants array (no orderBy to avoid index issues)
        messageListener = db.collection('messages')
            .where('participants', 'array-contains', authManager.currentUser.uid)
            .onSnapshot(snapshot => {
                console.log('🔥 Message snapshot received, total docs:', snapshot.docs.length);
                
                const messages = [];
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const participants = data.participants || [];
                    
                    // Filter for this specific conversation and exclude deleted messages
                    if (participants.includes(friendId) && participants.includes(authManager.currentUser.uid) && !data.deleted) {
                        messages.push({ id: doc.id, ...data });
                    }
                });
                
                // Sort messages by timestamp (client-side)
                messages.sort((a, b) => {
                    if (!a.createdAt) return 1;
                    if (!b.createdAt) return -1;
                    return a.createdAt.toMillis() - b.createdAt.toMillis();
                });
                
                console.log('📱 Filtered messages for conversation:', messages.length);
                renderMessages(messages);
                
                // Mark messages as read
                markMessagesAsRead(snapshot, friendId);
            }, error => {
                console.error('❌ Message listener error:', error);
            });
        
    } catch (error) {
        console.error('Load messages error:', error);
    }
}

function markMessagesAsRead(snapshot, friendId) {
    const batch = db.batch();
    let hasUnread = false;
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.senderId !== authManager.currentUser.uid && 
            (!data.readBy || !data.readBy.includes(authManager.currentUser.uid))) {
            batch.update(doc.ref, {
                readBy: firebase.firestore.FieldValue.arrayUnion(authManager.currentUser.uid)
            });
            hasUnread = true;
        }
    });
    
    if (hasUnread) {
        batch.commit().catch(console.error);
    }
}

function renderMessages(messages) {
    console.log('🎨 Rendering', messages.length, 'messages');
    
    const messagesList = document.getElementById('messagesList');
    const wasAtBottom = messagesList.scrollTop + messagesList.clientHeight >= messagesList.scrollHeight - 10;
    
    messagesList.innerHTML = '';
    
    if (messages.length === 0) {
        messagesList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #888;">
                <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5; color: #666;"></i>
                <p style="color: #ccc;">Start your conversation!</p>
            </div>
        `;
        return;
    }
    
    messages.forEach((message, index) => {
        const isSent = message.senderId === authManager.currentUser.uid;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
        messageDiv.style.cssText = `
            display: flex;
            margin: 8px 16px;
            ${isSent ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
        `;
        
        let timestamp = 'Sending...';
        if (message.createdAt) {
            const date = message.createdAt.toDate();
            const today = new Date();
            const isToday = date.toDateString() === today.toDateString();
            
            if (isToday) {
                timestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                timestamp = date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }
        
        messageDiv.innerHTML = `
            <div style="
                max-width: 70%;
                background: ${isSent ? '#e74c3c' : '#3d3d3d'};
                color: white;
                padding: 12px 16px;
                border-radius: 18px;
                ${isSent ? 'border-bottom-right-radius: 4px;' : 'border-bottom-left-radius: 4px;'}
                word-wrap: break-word;
                position: relative;
                border: 1px solid ${isSent ? '#c0392b' : '#555'};
            ">
                ${message.replyTo ? 
                    `<div style="
                        background: rgba(255,255,255,0.1);
                        border-left: 3px solid #e74c3c;
                        padding: 6px 10px;
                        margin-bottom: 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        opacity: 0.8;
                    ">
                        <div style="font-style: italic;">↩️ ${sanitizeInput(message.replyText || 'Message')}</div>
                    </div>` : 
                    ''
                }
                <div style="font-size: 14px; line-height: 1.4;">${sanitizeInput(message.text)}</div>
                <div style="
                    font-size: 11px;
                    opacity: 0.7;
                    margin-top: 4px;
                    text-align: right;
                    color: #ccc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span>${timestamp}</span>
                    <div style="position: relative;">
                        <span class="message-menu-btn" onclick="toggleMessageMenu('${message.id}')" style="
                            cursor: pointer;
                            padding: 4px 8px;
                            border-radius: 8px;
                            font-size: 16px;
                            opacity: 0.7;
                            transition: opacity 0.2s;
                            -webkit-tap-highlight-color: transparent;
                            user-select: none;
                            touch-action: manipulation;
                        " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">⋯</span>
                        <div id="menu-${message.id}" class="message-menu" style="
                            display: none;
                            position: absolute;
                            right: 0;
                            bottom: 30px;
                            background: #2d2d2d;
                            border: 1px solid #555;
                            border-radius: 8px;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                            z-index: 1000;
                            min-width: 120px;
                        ">
                            <div onclick="replyToMessage('${message.id}', '${message.text}')" style="
                                padding: 12px 16px;
                                cursor: pointer;
                                color: white;
                                ${isSent ? 'border-bottom: 1px solid #555;' : ''}
                                font-size: 14px;
                                -webkit-tap-highlight-color: transparent;
                                touch-action: manipulation;
                            " onmouseover="this.style.background='#3d3d3d'" onmouseout="this.style.background='transparent'">
                                ↩️ Reply
                            </div>
                            ${isSent ? 
                                `<div onclick="unsendMessage('${message.id}')" style="
                                    padding: 12px 16px;
                                    cursor: pointer;
                                    color: #e74c3c;
                                    font-size: 14px;
                                    -webkit-tap-highlight-color: transparent;
                                    touch-action: manipulation;
                                " onmouseover="this.style.background='#3d3d3d'" onmouseout="this.style.background='transparent'">
                                    🗑️ Unsend
                                </div>` : 
                                ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        messagesList.appendChild(messageDiv);
    });
    
    // Always scroll to bottom for real-time messages
    requestAnimationFrame(() => {
        messagesList.scrollTop = messagesList.scrollHeight;
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeInput(input) {
    if (!input) return '';
    return input.replace(/[<>"'&]/g, function(match) {
        return {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
        }[match];
    });
}

// Message menu functions
window.toggleMessageMenu = function(messageId) {
    // Close all other menus first
    document.querySelectorAll('.message-menu').forEach(menu => {
        if (menu.id !== `menu-${messageId}`) {
            menu.style.display = 'none';
        }
    });
    
    const menu = document.getElementById(`menu-${messageId}`);
    if (menu) {
        const isVisible = menu.style.display === 'block';
        menu.style.display = isVisible ? 'none' : 'block';
        
        // On mobile, add a backdrop to prevent accidental closes
        if ('ontouchstart' in window && !isVisible) {
            const backdrop = document.createElement('div');
            backdrop.id = 'menu-backdrop';
            backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999;';
            backdrop.onclick = () => {
                closeAllMenus();
                backdrop.remove();
            };
            document.body.appendChild(backdrop);
        }
    }
}

// Close menus when clicking/touching outside
function closeAllMenus() {
    document.querySelectorAll('.message-menu').forEach(menu => {
        menu.style.display = 'none';
    });
}

// Only use click events for desktop
if (!('ontouchstart' in window)) {
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.message-menu-btn') && !e.target.closest('.message-menu')) {
            closeAllMenus();
        }
    });
}

// Reply to message function
window.replyToMessage = function(messageId, messageText) {
    const messageInput = document.getElementById('messageInput');
    const replyPreview = document.createElement('div');
    
    // Close menu and backdrop
    document.getElementById(`menu-${messageId}`).style.display = 'none';
    const backdrop = document.getElementById('menu-backdrop');
    if (backdrop) backdrop.remove();
    
    // Create reply preview
    replyPreview.id = 'reply-preview';
    replyPreview.style.cssText = `
        background: #3d3d3d;
        border-left: 3px solid #e74c3c;
        padding: 8px 12px;
        margin-bottom: 8px;
        border-radius: 4px;
        font-size: 12px;
        color: #ccc;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    replyPreview.innerHTML = `
        <div>
            <div style="color: #e74c3c; font-weight: bold;">Replying to:</div>
            <div style="opacity: 0.8;">${messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText}</div>
        </div>
        <span onclick="cancelReply()" style="cursor: pointer; color: #999; font-size: 16px;">&times;</span>
    `;
    
    // Add reply preview above input
    const inputContainer = messageInput.parentElement;
    const existingPreview = document.getElementById('reply-preview');
    if (existingPreview) existingPreview.remove();
    
    inputContainer.insertBefore(replyPreview, inputContainer.firstChild);
    messageInput.focus();
    
    // Store reply data
    messageInput.dataset.replyTo = messageId;
    messageInput.dataset.replyText = messageText;
}

// Cancel reply function
window.cancelReply = function() {
    const replyPreview = document.getElementById('reply-preview');
    const messageInput = document.getElementById('messageInput');
    
    if (replyPreview) replyPreview.remove();
    delete messageInput.dataset.replyTo;
    delete messageInput.dataset.replyText;
}

// Unsend message function
window.unsendMessage = async function(messageId) {
    try {
        // Close menu and backdrop
        document.getElementById(`menu-${messageId}`).style.display = 'none';
        const backdrop = document.getElementById('menu-backdrop');
        if (backdrop) backdrop.remove();
        
        console.log('Deleting message:', messageId);
        
        await db.collection('messages').doc(messageId).delete();
        
        console.log('Message deleted successfully');
    } catch (error) {
        console.error('Error deleting message:', error);
        showMessageBox('Failed to delete message', 'error', 2000);
    }
}

async function sendNewMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();
    
    if (!messageText || !currentChatFriend) return;
    
    // Validate message length and content
    if (messageText.length > 1000) {
        showMessageBox('Message too long (max 1000 characters)', 'error', 3000);
        return;
    }
    
    console.log('Sending message:', messageText, 'to:', currentChatFriend);
    
    // Check if this is a reply
    const isReply = messageInput.dataset.replyTo;
    const replyData = isReply ? {
        replyTo: messageInput.dataset.replyTo,
        replyText: messageInput.dataset.replyText
    } : {};
    
    // Clear input and reply preview
    messageInput.value = '';
    messageInput.disabled = true;
    if (isReply) cancelReply();
    
    try {
        const messageData = {
            text: messageText,
            senderId: authManager.currentUser.uid,
            participants: [authManager.currentUser.uid, currentChatFriend],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            readBy: [authManager.currentUser.uid],
            ...replyData
        };
        
        console.log('Message data:', messageData);
        
        const docRef = await db.collection('messages').add(messageData);
        console.log('Message sent with ID:', docRef.id);
        
    } catch (error) {
        console.error('Send message error:', error);
        showMessageBox('Failed to send message', 'error', 2000);
        messageInput.value = messageText;
    } finally {
        messageInput.disabled = false;
        messageInput.focus();
    }
}

let loadFriendsListRunning = false;

async function loadFriendsList() {
    if (loadFriendsListRunning) return;
    loadFriendsListRunning = true;
    
    try {
        const snapshot = await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friends').where('status', '==', 'accepted').get();

        const friendsList = document.getElementById('friendsList');
        friendsList.innerHTML = '';

        if (snapshot.empty) {
            friendsList.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No friends yet</p>';
            return;
        }

        for (const doc of snapshot.docs) {
            const friend = doc.data();
            const friendProfile = await db.collection('players').doc(friend.friendId).get();
            
            if (!friendProfile.exists) {
                doc.ref.delete().catch(console.error);
                continue;
            }
            
            const friendData = friendProfile.data();
            const onlineStatus = await getOnlineStatus(friend.friendId);
            
            const item = document.createElement('div');
            item.className = 'friend-item';
            item.innerHTML = `
                <div class="friend-info">
                    <img src="avatars/${sanitizeInput(friendData.avatar)}" alt="Avatar" class="friend-avatar">
                    <span>@${sanitizeInput(friend.username)}</span>
                    <span class="online-status ${onlineStatus.isOnline ? 'status-online' : 'status-offline'}"></span>
                    ${!onlineStatus.isOnline ? `<span class="last-seen">${sanitizeInput(onlineStatus.lastSeen)}</span>` : ''}
                </div>
                <div class="friend-actions">
                    <button class="message-btn" style="background:#007bff;color:white;border:1px solid #007bff;padding:5px 10px;border-radius:3px;" onclick="sendMessage('${sanitizeInput(friend.friendId)}')">Message</button>
                    <button class="unfriend-btn" style="background:#dc3545;color:white;border:1px solid #dc3545;padding:5px 10px;border-radius:3px;" onclick="removeFriend('${sanitizeInput(friend.friendId)}')">Unfriend</button>
                </div>
            `;
            friendsList.appendChild(item);
        }
    } catch (error) {
        console.error('Load friends error:', error);
    } finally {
        loadFriendsListRunning = false;
    }
}

async function loadRecentChats() {
    try {
        document.getElementById('messageModalTitle').textContent = 'Recent Chats';
        
        const friendsSnapshot = await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friends').where('status', '==', 'accepted').get();
        
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';
        
        if (friendsSnapshot.empty) {
            messagesList.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No friends to chat with</p>';
            return;
        }
        
        for (const doc of friendsSnapshot.docs) {
            const friend = doc.data();
            const friendProfile = await db.collection('players').doc(friend.friendId).get();
            const friendData = friendProfile.data();
            
            const onlineStatus = await getOnlineStatus(friend.friendId);
            
            const chatItem = document.createElement('div');
            chatItem.className = 'friend-item';
            chatItem.style.cursor = 'pointer';
            chatItem.onclick = () => sendMessage(friend.friendId);
            chatItem.innerHTML = `
                <div class="friend-info">
                    <img src="avatars/${sanitizeInput(friendData.avatar)}" alt="Avatar" class="friend-avatar">
                    <span>@${sanitizeInput(friend.username)}</span>
                    <span class="online-status ${onlineStatus.isOnline ? 'status-online' : 'status-offline'}"></span>
                    ${!onlineStatus.isOnline ? `<span class="last-seen">${sanitizeInput(onlineStatus.lastSeen)}</span>` : ''}
                </div>
                <div class="friend-actions">
                    <span style="color: var(--accent-red);">Chat</span>
                </div>
            `;
            messagesList.appendChild(chatItem);
        }
    } catch (error) {
        console.error('Load recent chats error:', error);
    }
}

// Notifications functionality
async function loadNotifications() {
    try {
        const snapshot = await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friendRequests').where('status', '==', 'pending').get();
        const notificationsSnapshot = await db.collection('players').doc(authManager.currentUser.uid)
            .collection('notifications').where('read', '==', false).get();

        const notificationsList = document.getElementById('notificationsList');
        notificationsList.innerHTML = '';

        let hasNotifications = false;

        for (const doc of snapshot.docs) {
            hasNotifications = true;
            const request = doc.data();
            const senderProfile = await db.collection('players').doc(request.fromUserId).get();
            const senderData = senderProfile.data();
            
            const item = document.createElement('div');
            item.className = 'notification-item';
            item.innerHTML = `
                <div class="notification-info">
                    <img src="avatars/${sanitizeInput(senderData.avatar)}" alt="Avatar" class="friend-avatar">
                    <span>@${sanitizeInput(request.fromUsername)} sent you a friend request</span>
                </div>
                <div class="notification-actions">
                    <button class="accept-btn btn btn-success" onclick="acceptFriendRequest('${sanitizeInput(request.fromUserId)}', '${sanitizeInput(request.fromUsername)}')">Accept</button>
                    <button class="reject-btn btn btn-danger" onclick="rejectFriendRequest('${sanitizeInput(request.fromUserId)}')">Reject</button>
                </div>
            `;
            notificationsList.appendChild(item);
        }

        for (const doc of notificationsSnapshot.docs) {
            hasNotifications = true;
            const notification = doc.data();
            const senderProfile = await db.collection('players').doc(notification.fromUserId).get();
            const senderData = senderProfile.data();
            
            const item = document.createElement('div');
            item.className = 'notification-item';
            item.innerHTML = `
                <div class="notification-info">
                    <img src="avatars/${sanitizeInput(senderData.avatar)}" alt="Avatar" class="friend-avatar">
                    <span>${sanitizeInput(notification.message)}</span>
                </div>
                <div class="notification-actions">
                    <button class="reject-btn btn btn-danger" onclick="markAsRead('${sanitizeInput(doc.id)}')">Mark as Read</button>
                </div>
            `;
            notificationsList.appendChild(item);
        }

        if (!hasNotifications) {
            notificationsList.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No notifications</p>';
        }
    } catch (error) {
        console.error('Load notifications error:', error);
    }
}

// Setup notification handlers
function setupNotificationHandlers() {
    setTimeout(() => {
        const notificationIcon = document.getElementById('notificationIcon');
        const messageIcon = document.getElementById('messageIcon');
        
        if (notificationIcon) {
            notificationIcon.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openModal(document.getElementById('notificationsModal'));
                loadNotifications();
                updateNotificationBadge(0);
            });
        }
        
        if (messageIcon) {
            messageIcon.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openModal(document.getElementById('messagesModal'));
                loadRecentChats();
            });
        }
    }, 1000);
}

// Online presence system
function setupOnlinePresence() {
    const userStatusRef = db.collection('presence').doc(authManager.currentUser.uid);
    
    userStatusRef.set({
        isOnline: true,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    const handleBeforeUnload = () => {
        userStatusRef.set({
            isOnline: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup function
    window.cleanupPresence = () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    
    setInterval(() => {
        userStatusRef.update({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    }, 30000);
}

async function getOnlineStatus(userId) {
    try {
        const presenceDoc = await db.collection('presence').doc(userId).get();
        if (!presenceDoc.exists) {
            return { isOnline: false, lastSeen: 'Never' };
        }
        
        const data = presenceDoc.data();
        const now = Date.now();
        const lastSeenTime = data.lastSeen ? data.lastSeen.toMillis() : 0;
        const timeDiff = now - lastSeenTime;
        
        const isOnline = data.isOnline && timeDiff < 120000;
        
        let lastSeenText = 'Never';
        if (lastSeenTime > 0) {
            const minutes = Math.floor(timeDiff / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) {
                lastSeenText = `${days}d ago`;
            } else if (hours > 0) {
                lastSeenText = `${hours}h ago`;
            } else if (minutes > 0) {
                lastSeenText = `${minutes}m ago`;
            } else {
                lastSeenText = 'Just now';
            }
        }
        
        return { isOnline, lastSeen: lastSeenText };
    } catch (error) {
        console.error('Get online status error:', error);
        return { isOnline: false, lastSeen: 'Unknown' };
    }
}

// Notification counters
function setupNotificationCounters() {
    db.collection('players').doc(authManager.currentUser.uid)
        .collection('friendRequests').where('status', '==', 'pending')
        .onSnapshot(snapshot => {
            updateNotificationBadge(snapshot.size);
        });
    
    db.collection('players').doc(authManager.currentUser.uid)
        .collection('notifications').where('read', '==', false)
        .onSnapshot(snapshot => {
            const currentBadge = parseInt(document.getElementById('notificationBadge').textContent) || 0;
            const friendRequests = parseInt(document.getElementById('notificationBadge').dataset.friendRequests) || 0;
            updateNotificationBadge(friendRequests + snapshot.size);
        });
    
    db.collection('messages')
        .where('participants', 'array-contains', authManager.currentUser.uid)
        .onSnapshot(snapshot => {
            let unreadCount = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.senderId !== authManager.currentUser.uid && 
                    (!data.readBy || !data.readBy.includes(authManager.currentUser.uid))) {
                    unreadCount++;
                }
            });
            updateMessageBadge(unreadCount);
        });
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function updateMessageBadge(count) {
    const badge = document.getElementById('messageBadge');
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Master password setup functions
function showMasterPasswordSetup() {
    document.getElementById('masterPasswordModalTitle').textContent = 'Set Master Password for Encryption';
    document.getElementById('confirmMasterPasswordInput').style.display = 'block';
    document.getElementById('unlockDashboardBtn').textContent = 'Set Master Password';
    document.getElementById('forgotPasswordBtn').style.display = 'none';
    openModal(document.getElementById('masterPasswordPromptModal'));
}

async function setupMasterPassword(masterPassword, confirmPassword) {
    if (!masterPassword || !confirmPassword) {
        showMessageBox('Please fill in both fields', 'error');
        return false;
    }
    
    if (masterPassword !== confirmPassword) {
        showMessageBox('Passwords do not match', 'error');
        return false;
    }
    
    if (masterPassword.length < 8) {
        showMessageBox('Master password must be at least 8 characters', 'error');
        return false;
    }
    
    try {
        const userSalt = generateSalt();
        const derivedKey = await deriveKey(masterPassword, userSalt);
        const masterPasswordHash = derivedKey.toString(CryptoJS.enc.Hex);
        
        await db.collection('players').doc(authManager.currentUser.uid).update({
            salt: userSalt,
            masterPasswordHash: masterPasswordHash,
            hasMasterPassword: true
        });
        
        authManager.currentEncryptionKey = derivedKey;
        sessionStorage.setItem('currentEncryptionKeyHex', derivedKey.toString(CryptoJS.enc.Hex));
        
        // Generate recovery key
        const recoveryKey = generateRecoveryKey();
        const encryptedMasterKey = encryptWithRecoveryKey(derivedKey.toString(CryptoJS.enc.Hex), recoveryKey);
        
        await db.collection('players').doc(authManager.currentUser.uid).update({
            encryptedMasterKey: encryptedMasterKey
        });
        
        showRecoveryKey(recoveryKey);
        showMessageBox('Master password set successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Setup master password error:', error);
        showMessageBox('Failed to set master password', 'error');
        return false;
    }
}

function generateSalt() {
    return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
}

async function deriveKey(masterPassword, salt) {
    return CryptoJS.PBKDF2(masterPassword, CryptoJS.enc.Hex.parse(salt), {
        keySize: 256 / 32,
        iterations: 200000,
        hasher: CryptoJS.algo.SHA256
    });
}

function generateRecoveryKey() {
    return CryptoJS.lib.WordArray.random(256 / 8).toString(CryptoJS.enc.Base64).replace(/[+/=]/g, '').substring(0, 32);
}

function encryptWithRecoveryKey(data, recoveryKey) {
    const key = CryptoJS.SHA256(recoveryKey);
    const iv = CryptoJS.lib.WordArray.random(128 / 8);
    const encrypted = CryptoJS.AES.encrypt(data, key, { iv: iv });
    return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
}

function decryptWithRecoveryKey(encryptedData, recoveryKey) {
    const key = CryptoJS.SHA256(recoveryKey);
    const parts = encryptedData.split(':');
    const iv = CryptoJS.enc.Hex.parse(parts[0]);
    const decrypted = CryptoJS.AES.decrypt(parts[1], key, { iv: iv });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

function showRecoveryKey(recoveryKey) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:#1a1a1a;color:white;padding:30px;border-radius:10px;max-width:500px;text-align:center;border:1px solid #333;">
            <h3 style="color:#e74c3c;margin-bottom:20px;">⚠️ SAVE YOUR RECOVERY KEY</h3>
            <p style="margin-bottom:20px;color:white;">This is your ONLY way to recover your data if you forget your master password:</p>
            <div style="background:#2d2d2d;color:#00ff00;padding:15px;border:2px solid #007bff;border-radius:5px;font-family:monospace;font-size:18px;font-weight:bold;margin:20px 0;word-break:break-all;">${recoveryKey}</div>
            <p style="color:#e74c3c;font-weight:bold;margin-bottom:20px;">Write this down and store it safely offline!</p>
            <button id="recoveryKeySaved" style="background:#28a745;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;">I've Saved It Safely</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('recoveryKeySaved').onclick = () => {
        document.body.removeChild(modal);
    };
}

async function recoverWithKey(recoveryKey) {
    if (!recoveryKey || recoveryKey.length !== 32) {
        showMessageBox('Please enter a valid 32-character recovery key', 'error');
        return false;
    }
    
    try {
        const playerDoc = await db.collection('players').doc(authManager.currentUser.uid).get();
        const data = playerDoc.data();
        
        if (!data.encryptedMasterKey) {
            showMessageBox('No recovery key found for this account', 'error');
            return false;
        }
        
        const masterKeyHex = decryptWithRecoveryKey(data.encryptedMasterKey, recoveryKey);
        if (!masterKeyHex) {
            showMessageBox('Invalid recovery key', 'error');
            return false;
        }
        
        // Set the encryption key and sync with current password
        authManager.currentEncryptionKey = CryptoJS.enc.Hex.parse(masterKeyHex);
        sessionStorage.setItem('currentEncryptionKeyHex', masterKeyHex);
        
        // Sync with current login password
        await syncRecoveryKeyWithPassword(masterKeyHex);
        
        showMessageBox('Access recovered successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Recovery error:', error);
        showMessageBox('Recovery failed. Check your key and try again.', 'error');
        return false;
    }
}

async function syncRecoveryKeyWithPassword(recoveredKeyHex) {
    try {
        const user = authManager.currentUser;
        if (!user) return false;
        
        // Store the recovered key as the master password hash
        // This allows future logins to work with the login password
        await db.collection('players').doc(user.uid).update({
            masterPasswordHash: recoveredKeyHex,
            // Keep the same salt - login will derive key from password+salt
            // but we override the comparison to use the recovered key
            recoveredFromKey: true
        });
        
        return true;
    } catch (error) {
        console.error('Sync error:', error);
        return false;
    }
}

async function syncWithCurrentPassword(currentPassword) {
    if (!currentPassword) {
        showMessageBox('Please enter your current password', 'error');
        return false;
    }
    
    if (!window.tempRecoveredKey) {
        showMessageBox('No recovery key found. Please try again.', 'error');
        return false;
    }
    
    try {
        const playerDoc = await db.collection('players').doc(authManager.currentUser.uid).get();
        const data = playerDoc.data();
        const newDerivedKey = await deriveKey(currentPassword, data.salt);
        const newMasterPasswordHash = newDerivedKey.toString(CryptoJS.enc.Hex);
        
        // Generate new recovery key for the new password
        const newRecoveryKey = generateRecoveryKey();
        const newEncryptedMasterKey = encryptWithRecoveryKey(newMasterPasswordHash, newRecoveryKey);
        
        await db.collection('players').doc(authManager.currentUser.uid).update({
            masterPasswordHash: newMasterPasswordHash,
            encryptedMasterKey: newEncryptedMasterKey
        });
        
        // Set the correct encryption key
        authManager.currentEncryptionKey = CryptoJS.enc.Hex.parse(window.tempRecoveredKey);
        sessionStorage.setItem('currentEncryptionKeyHex', window.tempRecoveredKey);
        
        // Clean up
        delete window.tempRecoveredKey;
        
        showMessageBox('Password synced successfully! You can now use your login password.', 'success');
        return true;
    } catch (error) {
        console.error('Sync error:', error);
        showMessageBox('Failed to sync password', 'error');
        return false;
    }
}

// Initialize application
$(document).ready(function() {
    initializeManagers();
    setupEventListeners();
    loadAvatars();
    new DesktopDashboard();
});