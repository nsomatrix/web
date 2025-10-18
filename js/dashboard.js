// Unified Dashboard JavaScript
import { getFirebaseConfig } from './modules/config.js';
import { AuthManager } from './modules/auth.js';
import { FileManager } from './modules/files.js';
import { NotesManager } from './modules/notes.js';
import { PasswordManager } from './modules/passwords.js';
import { FriendsManager } from './modules/friends.js';
import { MessagingManager } from './modules/messaging.js';
import { SocialManager } from './modules/social.js';
import { ShieldManager } from './modules/shield.js';

import { showMessageBox, openModal, closeModal } from './modules/ui.js';
import { encryptData, decryptData } from './modules/crypto.js';

// Import closeModal for global use
window.closeModal = closeModal;
window.openModal = openModal;

// Initialize Firebase with config from worker
let auth, db;
getFirebaseConfig().then(firebaseConfig => {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Initialize managers after Firebase is ready
    initializeManagers();
    
    // Set up auth state listener after Firebase is initialized
    setupAuthStateListener();
});

function setupAuthStateListener() {
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
}


// Global variables
let allAvatars = [];
let currentAvatarIndex = 0;
let authManager, fileManager, notesManager, passwordManager, friendsManager, messagingManager, socialManager, shieldManager;


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
    friendsManager = new FriendsManager(authManager, db);
    messagingManager = new MessagingManager(authManager, db);
    socialManager = new SocialManager(authManager, db);
    shieldManager = new ShieldManager(authManager, db);

    
    // Make managers globally available
    window.friendsManager = friendsManager;
    window.messagingManager = messagingManager;
    window.socialManager = socialManager;
    window.shieldManager = shieldManager;
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
        
        // Check if account was recovered from password reset
        const wasPasswordReset = await authManager.checkPasswordResetStatus();
        
        // If key restoration failed or password was reset, show recovery key prompt
        if ((!keyRestored && data.encryptedMasterKey) || wasPasswordReset) {
            setTimeout(() => {
                if (wasPasswordReset) {
                    showMessageBox('Password was reset. Please use your recovery key to access encrypted data.', 'warning', 5000);
                    // Auto-open recovery key modal for password reset accounts
                    setTimeout(() => {
                        openModal(document.getElementById('recoveryKeyModal'));
                    }, 1000);
                } else {
                    showMessageBox('Session expired. Please re-enter master password or use recovery key.', 'warning', 5000);
                }
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
        

        
        // Initialize Shield features
        if (shieldManager) {
            await shieldManager.createSession();
            await shieldManager.recordLogin();
        }

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
            closeModal(document.getElementById('masterPasswordPromptModal'));
            showMessageBox('To reset your password, please log out and use the "Forgot Password" link on the sign-in page.', 'info', 5000);
        };
    }

    const recoverBtn = document.getElementById('recoverBtn');
    if (recoverBtn) {
        recoverBtn.onclick = async () => {
            const recoveryKey = document.getElementById('recoveryKeyInput').value.trim();
            recoverBtn.disabled = true;
            recoverBtn.textContent = 'Recovering...';
            
            // Mark recovery in progress
            sessionStorage.setItem('recoveryInProgress', 'true');
            
            if (await recoverWithKey(recoveryKey)) {
                closeModal(document.getElementById('recoveryKeyModal'));
                document.getElementById('recoveryKeyInput').value = '';
                
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
            
            // Clean up recovery flag
            sessionStorage.removeItem('recoveryInProgress');
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
                showMasterPasswordPrompt('notesModal');
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
                showMasterPasswordPrompt('passwordManagerModal');
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
            friendsManager.loadFriendsList();
        };
    }

    const securityBtn = document.getElementById('securityBtn');
    if (securityBtn) {
        securityBtn.onclick = async () => {
            openModal(document.getElementById('shieldModal'));
            await shieldManager.loadShieldData();
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
            showMessageBox("Initiating complete account deletion...", 'info', 0);

            if (!authManager.currentUser) {
                showMessageBox("Please login first", "error", 3000);
                return;
            }

            try {
                const uid = authManager.currentUser.uid;
                const deletePromises = [];

                // Delete all subcollections
                const collections = ['notes', 'passwords', 'friends', 'friendRequests', 'notifications'];
                for (const collectionName of collections) {
                    const snapshot = await db.collection('players').doc(uid).collection(collectionName).get();
                    snapshot.forEach(doc => {
                        deletePromises.push(doc.ref.delete());
                    });
                }

                // Delete messages where user is participant
                const messagesSnapshot = await db.collection('messages')
                    .where('participants', 'array-contains', uid).get();
                messagesSnapshot.forEach(doc => {
                    deletePromises.push(doc.ref.delete());
                });

                // Delete presence
                deletePromises.push(db.collection('presence').doc(uid).delete());

                // Execute all deletions
                await Promise.all(deletePromises);

                // Delete player document
                await db.collection('players').doc(uid).delete();

                // Delete Firebase user account
                await authManager.currentUser.delete();

                showMessageBox("All account data deleted successfully", "success", 3000);
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

    // Unfriend confirmation handlers
    const confirmUnfriendBtn = document.getElementById('confirmUnfriendBtn');
    if (confirmUnfriendBtn) {
        confirmUnfriendBtn.onclick = () => friendsManager.confirmRemoveFriend();
    }
    
    const cancelUnfriendBtn = document.getElementById('cancelUnfriendBtn');
    if (cancelUnfriendBtn) {
        cancelUnfriendBtn.onclick = () => {
            friendsManager.friendToRemove = null;
            closeModal(document.getElementById('unfriendConfirmModal'));
        };
    }

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
            socialManager.performUserSearch();
        };
    }

    if (userSearch) {
        userSearch.onkeydown = (e) => {
            if (e.key === 'Enter') {
                socialManager.performUserSearch();
            }
        };
    }

    // Enhanced message functionality
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    if (sendMessageBtn) {
        sendMessageBtn.onclick = (e) => {
            e.preventDefault();
            messagingManager.sendMessage();
        };
    }

    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                messagingManager.sendMessage();
            }
        };
        
        messageInput.oninput = () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
            messagingManager.handleTyping(messageInput);
        };
        
        messageInput.onfocus = () => {
            setTimeout(() => {
                const messagesList = document.getElementById('messagesList');
                messagesList.scrollTop = messagesList.scrollHeight;
            }, 300);
        };
        
        messageInput.onblur = () => {
            messagingManager.stopTyping();
        };
    }
}





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



// Global functions for backward compatibility
window.addFriend = (friendId, friendUsername) => socialManager.addFriend(friendId, friendUsername);
window.acceptFriendRequest = (fromUserId, fromUsername) => socialManager.acceptFriendRequest(fromUserId, fromUsername);
window.rejectFriendRequest = (fromUserId) => socialManager.rejectFriendRequest(fromUserId);
window.markAsRead = (notificationId) => socialManager.markAsRead(notificationId);
window.removeFriend = (friendId) => friendsManager.removeFriend(friendId);
window.sendMessage = (friendId) => messagingManager.openChat(friendId);





// Global message menu functions for backward compatibility
window.toggleMessageMenu = (messageId) => messagingManager.toggleMessageMenu(messageId);
window.replyToMessage = (messageId, messageText) => messagingManager.replyToMessage(messageId, messageText);
window.cancelReply = () => messagingManager.cancelReply();
window.unsendMessage = (messageId) => messagingManager.unsendMessage(messageId);



async function loadRecentChats() {
    try {
        document.getElementById('messageModalTitle').textContent = 'Recent Chats';
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';
        
        const friendsSnapshot = await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friends').where('status', '==', 'accepted').get();
        
        if (friendsSnapshot.empty) {
            messagesList.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No friends to chat with</p>';
            return;
        }
        
        for (const doc of friendsSnapshot.docs) {
            const friend = doc.data();
            const friendProfile = await db.collection('players').doc(friend.friendId).get();
            const friendData = friendProfile.data();
            const onlineStatus = await friendsManager.getOnlineStatus(friend.friendId);
            
            const chatItem = document.createElement('div');
            chatItem.className = 'friend-item';
            chatItem.style.cursor = 'pointer';
            chatItem.onclick = () => messagingManager.openChat(friend.friendId);
            chatItem.innerHTML = `
                <div class="friend-info">
                    <img src="avatars/${friendData.avatar}" alt="Avatar" class="friend-avatar">
                    <div class="friend-details">
                        <div class="friend-name">@${friend.username}</div>
                        <div class="friend-status">
                            <span class="online-status ${onlineStatus.isOnline ? 'status-online' : 'status-offline'}"></span>
                            ${!onlineStatus.isOnline ? `<span class="last-seen">${onlineStatus.lastSeen}</span>` : '<span class="online-text">Online</span>'}
                        </div>
                    </div>
                </div>
                <div class="friend-actions">
                    <i class="fas fa-comment" style="color: var(--primary);"></i>
                </div>
            `;
            messagesList.appendChild(chatItem);
        }
    } catch (error) {
        console.error('Load recent chats error:', error);
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
                socialManager.loadNotifications();
                updateNotificationBadge(0);
            });
        }
        
        if (messageIcon) {
            messageIcon.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const messageInputContainer = document.querySelector('.message-input-container');
                if (messageInputContainer) messageInputContainer.style.display = 'none';
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
        
        const oldMasterKeyHex = decryptWithRecoveryKey(data.encryptedMasterKey, recoveryKey);
        if (!oldMasterKeyHex) {
            showMessageBox('Invalid recovery key', 'error');
            return false;
        }
        
        // Temporarily set old key to decrypt existing data
        const oldKey = CryptoJS.enc.Hex.parse(oldMasterKeyHex);
        
        // Re-encrypt all existing data with new password-derived key
        await reencryptUserData(oldKey);
        
        showMessageBox('Access recovered successfully! You can now use your new password.', 'success');
        return true;
    } catch (error) {
        console.error('Recovery error:', error);
        showMessageBox('Recovery failed. Check your key and try again.', 'error');
        return false;
    }
}

async function syncWithNewPassword(recoveredKeyHex) {
    try {
        const user = authManager.currentUser;
        if (!user) return false;
        
        const currentPassword = sessionStorage.getItem('tempLoginPassword');
        
        if (currentPassword) {
            // Use the new password to derive the encryption key
            const newSalt = generateSalt();
            const newDerivedKey = await deriveKey(currentPassword, newSalt);
            const newMasterPasswordHash = newDerivedKey.toString(CryptoJS.enc.Hex);
            
            // Generate new recovery key for the new derived key
            const newRecoveryKey = generateRecoveryKey();
            const newEncryptedMasterKey = encryptWithRecoveryKey(newMasterPasswordHash, newRecoveryKey);
            
            await db.collection('players').doc(user.uid).update({
                salt: newSalt,
                masterPasswordHash: newMasterPasswordHash,
                encryptedMasterKey: newEncryptedMasterKey,
                recoveredFromKey: false
            });
            
            // Set the new derived key as the current encryption key
            authManager.currentEncryptionKey = newDerivedKey;
            sessionStorage.setItem('currentEncryptionKeyHex', newMasterPasswordHash);
            
            sessionStorage.removeItem('tempLoginPassword');
            showRecoveryKey(newRecoveryKey);
        } else {
            await db.collection('players').doc(user.uid).update({
                recoveredFromKey: false
            });
        }
        
        return true;
    } catch (error) {
        console.error('Sync error:', error);
        return false;
    }
}

async function reencryptUserData(oldKey) {
    const user = authManager.currentUser;
    const currentPassword = sessionStorage.getItem('tempLoginPassword');
    
    if (!currentPassword) return;
    
    // Generate new encryption setup
    const newSalt = generateSalt();
    const newKey = await deriveKey(currentPassword, newSalt);
    const newMasterPasswordHash = newKey.toString(CryptoJS.enc.Hex);
    
    // Re-encrypt notes
    const notesRef = db.collection('players').doc(user.uid).collection('notes');
    const notesSnapshot = await notesRef.get();
    
    const batch = db.batch();
    
    notesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.content) {
            // Decrypt with old key
            const decrypted = decryptData(data.content, oldKey);
            if (decrypted) {
                // Re-encrypt with new key
                const reencrypted = encryptData(decrypted, newKey);
                batch.update(doc.ref, { content: reencrypted });
            }
        }
    });
    
    // Re-encrypt passwords
    const passwordsRef = db.collection('players').doc(user.uid).collection('passwords');
    const passwordsSnapshot = await passwordsRef.get();
    
    passwordsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.password) {
            const decrypted = decryptData(data.password, oldKey);
            if (decrypted) {
                const reencrypted = encryptData(decrypted, newKey);
                batch.update(doc.ref, { password: reencrypted });
            }
        }
    });
    
    // Update player document
    const newRecoveryKey = generateRecoveryKey();
    const newEncryptedMasterKey = encryptWithRecoveryKey(newMasterPasswordHash, newRecoveryKey);
    
    batch.update(db.collection('players').doc(user.uid), {
        salt: newSalt,
        masterPasswordHash: newMasterPasswordHash,
        encryptedMasterKey: newEncryptedMasterKey,
        recoveredFromKey: false
    });
    
    await batch.commit();
    
    // Set new key as current
    authManager.currentEncryptionKey = newKey;
    sessionStorage.setItem('currentEncryptionKeyHex', newMasterPasswordHash);
    sessionStorage.removeItem('tempLoginPassword');
    
    showRecoveryKey(newRecoveryKey);
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

// Master password prompt helper
async function showMasterPasswordPrompt(targetModal) {
    // Check if account was recovered from password reset
    const wasPasswordReset = await authManager.checkPasswordResetStatus();
    
    if (wasPasswordReset) {
        // For password reset accounts, show recovery key modal instead
        document.getElementById(targetModal).dataset.pendingOpen = 'true';
        openModal(document.getElementById('recoveryKeyModal'));
        showMessageBox('Password was reset. Please use your recovery key to access encrypted data.', 'warning', 4000);
    } else {
        // Normal master password prompt
        document.getElementById('masterPasswordModalTitle').textContent = 'Enter Master Password';
        document.getElementById('confirmMasterPasswordInput').style.display = 'none';
        document.getElementById('unlockDashboardBtn').textContent = 'Unlock';
        document.getElementById('forgotPasswordBtn').style.display = 'block';
        document.getElementById(targetModal).dataset.pendingOpen = 'true';
        openModal(document.getElementById('masterPasswordPromptModal'));
    }
}

// Initialize application
$(document).ready(function() {
    setupEventListeners();
    loadAvatars();
    new DesktopDashboard();
});