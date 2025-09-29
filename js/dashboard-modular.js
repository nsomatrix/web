// Modular Dashboard - Main Entry Point
import { FIREBASE_CONFIG, SUPABASE_CONFIG } from './modules/config.js';
import { AuthManager } from './modules/auth.js';
import { FileManager } from './modules/files.js';
import { NotesManager } from './modules/notes.js';
import { PasswordManager } from './modules/passwords.js';
import { showMessageBox, openModal, closeModal } from './modules/ui.js';

// Initialize Firebase
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
const supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Global variables
let translations = {};
let allAvatars = [];
let currentAvatarIndex = 0;

// Managers
let authManager;
let fileManager;
let notesManager;
let passwordManager;

// DOM Elements
const setupSection = document.getElementById('setup-section');
const mainDashboard = document.getElementById('main-dashboard');
const usernameInput = document.getElementById('usernameInput');
const currentAvatarDisplay = document.getElementById('currentAvatarDisplay');
const prevAvatarBtn = document.getElementById('prevAvatarBtn');
const nextAvatarBtn = document.getElementById('nextAvatarBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const dashboardUsername = document.getElementById('dashboard-username');
const userAvatar = document.getElementById('user-avatar');
const languageSelect = document.getElementById('language-select');

// Modal elements
const masterPasswordPromptModal = document.getElementById('masterPasswordPromptModal');
const masterPasswordUnlockInput = document.getElementById('masterPasswordUnlockInput');
const unlockDashboardBtn = document.getElementById('unlockDashboardBtn');
const notesModal = document.getElementById('notesModal');
const passwordManagerModal = document.getElementById('passwordManagerModal');
const ephemeralFilesModal = document.getElementById('ephemeralFilesModal');

// Initialize managers
function initializeManagers() {
    authManager = new AuthManager(auth, db, translations);
    fileManager = new FileManager(authManager, translations);
    notesManager = new NotesManager(authManager, db, translations);
    passwordManager = new PasswordManager(authManager, db, translations);
}

// Translation functions
async function loadTranslations(lang) {
    try {
        const response = await fetch(`languages/${lang}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        translations = await response.json();
        applyTranslations();
        localStorage.setItem('selectedLanguage', lang);
        
        // Reinitialize managers with new translations
        if (authManager) initializeManagers();
    } catch (error) {
        console.error('Error loading translations:', error);
        if (lang !== 'en') loadTranslations('en');
    }
}

function getTranslation(key) {
    return translations[key] || `[${key}]`;
}

function applyTranslations() {
    document.title = getTranslation('dashboard_title');
    $('[data-translate-key]').each(function() {
        const key = $(this).data('translate-key');
        let translatedText = getTranslation(key);
        
        if ($(this).is('input[placeholder], textarea[placeholder]')) {
            $(this).attr('placeholder', translatedText);
        } else {
            if ($(this).children().length > 0) {
                $(this).contents().filter(function() {
                    return this.nodeType === 3;
                }).replaceWith(translatedText);
            } else {
                $(this).text(translatedText);
            }
        }
    });

    if ($('#dashboard-username').length && authManager?.currentUser?.displayName) {
        $('#main-dashboard h2.welcome-message').html(getTranslation('welcome_message') + ` <span id="dashboard-username"></span>!`);
        $('#dashboard-username').text(authManager.currentUser.displayName);
    }
    
    // Handle responsive text after translation
    setTimeout(() => handleResponsiveText(), 100);
}

// Avatar functions
async function loadAvatars() {
    try {
        const response = await fetch('avatars/avatars.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allAvatars = await response.json();
        if (allAvatars.length > 0) {
            currentAvatarDisplay.src = `avatars/${allAvatars[currentAvatarIndex]}`;
        }
    } catch (error) {
        console.error("Error loading avatars:", error);
        showMessageBox("could_not_load_avatars_error", "error", 3000, translations);
    }
}

function updateAvatarDisplay() {
    if (allAvatars.length > 0) {
        currentAvatarDisplay.src = `avatars/${allAvatars[currentAvatarIndex]}`;
    }
}

// Profile management
async function saveProfile(user) {
    const username = usernameInput.value.trim();
    const selectedAvatar = allAvatars[currentAvatarIndex];

    if (!username || !selectedAvatar) {
        showMessageBox("message_box_please_enter_username_avatar", "error", 3000, translations);
        return;
    }

    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = getTranslation("saving_status");

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

        showMessageBox("message_box_profile_saved_success", "success", 3000, translations);
        setupSection.style.display = 'none';
        mainDashboard.style.display = 'block';
        dashboardUsername.textContent = username;
        userAvatar.src = `avatars/${selectedAvatar}`;
        setupUsernameTag(username, username);
        applyTranslations();
        
        // Setup notification and message icons for new users
        setupNotificationHandlers();

    } catch (error) {
        console.error("Error saving profile:", error);
        showMessageBox("message_box_failed_to_save_profile" + error.message, "error", 3000, translations);
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = getTranslation("save_profile_button");
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
        const lastLoginTimestamp = data.lastLogin;

        authManager.restoreEncryptionKey();

        if (!hasUsername || !hasAvatar) {
            if (allAvatars.length === 0) await loadAvatars();
            
            setupSection.style.display = 'block';
            mainDashboard.style.display = 'none';
            closeModal(masterPasswordPromptModal);

            usernameInput.value = data.username || '';
            
            if (data.avatar && allAvatars.includes(data.avatar)) {
                currentAvatarIndex = allAvatars.indexOf(data.avatar);
            } else {
                currentAvatarIndex = 0;
            }
            updateAvatarDisplay();
            applyTranslations();
            return;
        }

        dashboardUsername.textContent = data.username;
        userAvatar.src = `avatars/${data.avatar}`;
        setupUsernameTag(data.usernameTag, data.username);
        setupSection.style.display = 'none';
        mainDashboard.style.display = 'block';
        closeModal(masterPasswordPromptModal);
        
        // Setup notification and message icons after dashboard is shown
        setupNotificationHandlers();

        // Update last login
        const lastLoginDisplay = document.getElementById('lastLoginDisplay');
        if (lastLoginDisplay) {
            if (lastLoginTimestamp) {
                const date = lastLoginTimestamp.toDate();
                lastLoginDisplay.innerHTML = `${getTranslation("last_login_label")}: ${date.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`;
            } else {
                lastLoginDisplay.innerHTML = `${getTranslation("last_login_label")}: ${getTranslation("never")}`;
            }
            await playerDocRef.set({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }

        applyTranslations();

    } catch (error) {
        console.error("Error setting up dashboard:", error);
        showMessageBox("message_box_failed_to_load_dashboard" + error.message, "error", 3000, translations);
    }
}

// Event Listeners
function setupEventListeners() {
    // Avatar navigation
    prevAvatarBtn.onclick = () => {
        currentAvatarIndex = (currentAvatarIndex - 1 + allAvatars.length) % allAvatars.length;
        updateAvatarDisplay();
    };

    nextAvatarBtn.onclick = () => {
        currentAvatarIndex = (currentAvatarIndex + 1) % allAvatars.length;
        updateAvatarDisplay();
    };

    // Profile save
    saveProfileBtn.onclick = () => {
        if (authManager.currentUser) {
            saveProfile(authManager.currentUser);
        } else {
            showMessageBox("message_box_please_login_first", "error", 3000, translations);
        }
    };

    // Master password unlock
    unlockDashboardBtn.onclick = async () => {
        const masterPassword = masterPasswordUnlockInput.value.trim();
        unlockDashboardBtn.disabled = true;
        unlockDashboardBtn.textContent = getTranslation("unlocking_status");

        const success = await authManager.unlockDashboard(masterPassword);
        
        if (success) {
            closeModal(masterPasswordPromptModal);
            masterPasswordUnlockInput.value = '';
            
            // Handle pending modal opens
            if (notesModal.dataset.pendingOpen === 'true') {
                openModal(notesModal);
                notesManager.loadNotes(document.getElementById('savedNotesDisplay'));
                notesModal.dataset.pendingOpen = 'false';
            } else if (passwordManagerModal.dataset.pendingOpen === 'true') {
                openModal(passwordManagerModal);
                passwordManager.loadPasswords(document.getElementById('pmEntryList'));
                passwordManagerModal.dataset.pendingOpen = 'false';
            } else if (ephemeralFilesModal.dataset.pendingOpen === 'true') {
                openModal(ephemeralFilesModal);
                loadFilesList();
                ephemeralFilesModal.dataset.pendingOpen = 'false';
            }
        }

        unlockDashboardBtn.disabled = false;
        unlockDashboardBtn.textContent = getTranslation("unlock_dashboard_button");
    };

    // Enter key for master password
    masterPasswordUnlockInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            unlockDashboardBtn.click();
        }
    });

    // Feature buttons
    document.getElementById('notesBtn').onclick = () => {
        if (!authManager.currentEncryptionKey) {
            openModal(masterPasswordPromptModal);
            notesModal.dataset.pendingOpen = 'true';
            masterPasswordUnlockInput.value = '';
            return;
        }
        openModal(notesModal);
        notesManager.loadNotes(document.getElementById('savedNotesDisplay'));
    };

    document.getElementById('passwordManagerBtn').onclick = () => {
        if (!authManager.currentEncryptionKey) {
            openModal(masterPasswordPromptModal);
            passwordManagerModal.dataset.pendingOpen = 'true';
            masterPasswordUnlockInput.value = '';
            return;
        }
        openModal(passwordManagerModal);
        passwordManager.loadPasswords(document.getElementById('pmEntryList'));
    };

    document.getElementById('ephemeralFilesBtn').onclick = () => {
        if (!authManager.currentEncryptionKey) {
            openModal(masterPasswordPromptModal);
            ephemeralFilesModal.dataset.pendingOpen = 'true';
            masterPasswordUnlockInput.value = '';
            return;
        }
        openModal(ephemeralFilesModal);
        loadFilesList();
    };

    // Notes functionality
    document.getElementById('saveNoteBtn').onclick = async () => {
        const noteText = document.getElementById('noteInput').value.trim();
        const success = await notesManager.saveNote(noteText);
        if (success) {
            document.getElementById('noteInput').value = '';
        }
    };

    // Password manager functionality
    document.getElementById('savePmEntryBtn').onclick = async () => {
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

    // File upload
    document.getElementById('uploadFileBtn').onclick = async () => {
        const file = document.getElementById('fileUploadInput').files[0];
        if (!file) {
            showMessageBox("message_box_select_file_upload", "error", 3000, translations);
            return;
        }
        
        const success = await fileManager.uploadFile(file);
        if (success) {
            document.getElementById('fileUploadInput').value = '';
            loadFilesList();
        }
    };

    // Logout
    document.getElementById('logoutBtn').onclick = async () => {
        try {
            await auth.signOut();
            showMessageBox("message_box_logged_out_success", "success", 3000, translations);
        } catch (error) {
            console.error("Error logging out:", error);
            showMessageBox("message_box_failed_to_log_out" + error.message, "error", 3000, translations);
        } finally {
            authManager.clearSession();
        }
    };

    // Delete account
    document.getElementById('deleteAccountBtn').onclick = () => {
        openModal(document.getElementById('deleteAccountConfirmModal'));
    };

    document.getElementById('confirmDeleteAccountBtn').onclick = async () => {
        closeModal(document.getElementById('deleteAccountConfirmModal'));
        showMessageBox("message_box_initiating_account_deletion", 'info', 0, translations);

        if (!authManager.currentUser) {
            showMessageBox("message_box_please_login_first", "error", 3000, translations);
            return;
        }

        try {
            const idToken = await authManager.currentUser.getIdToken();

            // Delete Supabase data
            console.log("Calling delete-user-data Edge Function...");
            const supabaseDeleteResponse = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/delete-user-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ id: authManager.currentUser.uid })
            });

            if (!supabaseDeleteResponse.ok) {
                const errorData = await supabaseDeleteResponse.json();
                throw new Error(errorData.message || 'Failed to delete Supabase data');
            }
            console.log("Supabase data deletion successful.");
            showMessageBox("message_box_supabase_data_deleted_success", "success", 2000, translations);

            // Delete Firebase notes
            console.log("Deleting user notes from Firestore...");
            const notesRef = db.collection('players').doc(authManager.currentUser.uid).collection('notes');
            const notesSnapshot = await notesRef.get();
            const deleteNotesPromises = [];
            notesSnapshot.forEach(doc => {
                deleteNotesPromises.push(doc.ref.delete());
            });
            await Promise.all(deleteNotesPromises);

            // Delete Firebase passwords
            console.log("Deleting user passwords from Firestore...");
            const passwordsRef = db.collection('players').doc(authManager.currentUser.uid).collection('passwords');
            const passwordsSnapshot = await passwordsRef.get();
            const deletePasswordsPromises = [];
            passwordsSnapshot.forEach(doc => {
                deletePasswordsPromises.push(doc.ref.delete());
            });
            await Promise.all(deletePasswordsPromises);

            // Delete user profile
            console.log("Deleting user profile document from Firestore...");
            await db.collection('players').doc(authManager.currentUser.uid).delete();

            // Delete Firebase auth account
            console.log("Deleting Firebase authentication account...");
            await authManager.currentUser.delete();

            showMessageBox("message_box_account_deleted_success", "success", 3000, translations);
            setTimeout(() => {
                window.location.href = "login.html";
            }, 3000);

        } catch (error) {
            console.error("Error during full account deletion:", error);
            let errorMessage = getTranslation("message_box_failed_to_delete_account");
            if (error.message) {
                errorMessage += `: ${error.message}`;
            }
            showMessageBox(errorMessage, "error", 5000, translations);

            if (error.code === 'auth/requires-recent-login') {
                showMessageBox("message_box_account_requires_recent_login", "warning", 5000, translations);
                setTimeout(() => {
                    auth.signOut().then(() => {
                        window.location.href = "login.html";
                    });
                }, 3000);
            }
        }
    };

    document.getElementById('cancelDeleteAccountBtn').onclick = () => {
        closeModal(document.getElementById('deleteAccountConfirmModal'));
        showMessageBox("message_box_account_deletion_cancelled", "info", 2000, translations);
    };

    // Forgot password button
    document.getElementById('forgotPasswordBtn').onclick = () => {
        showMessageBox("message_box_master_password_cannot_be_reset", "info", 5000, translations);
    };

    // File deletion confirmations
    document.getElementById('confirmDeleteFileBtn').onclick = async () => {
        closeModal(document.getElementById('deleteFileConfirmModal'));
        if (fileManager.fileToDeleteName) {
            const success = await fileManager.deleteFile(fileManager.fileToDeleteName);
            if (success) {
                loadFilesList();
                fileManager.fileToDeleteName = null;
            }
        }
    };

    document.getElementById('cancelDeleteFileBtn').onclick = () => {
        closeModal(document.getElementById('deleteFileConfirmModal'));
        showMessageBox("cancelled!", "info", 2000, translations);
        fileManager.fileToDeleteName = null;
    };

    // Note deletion confirmations
    document.getElementById('confirmDeleteNoteBtn').onclick = async () => {
        closeModal(document.getElementById('deleteNoteConfirmModal'));
        if (notesManager.noteToDeleteId) {
            await notesManager.deleteNote(notesManager.noteToDeleteId);
            notesManager.noteToDeleteId = null;
        }
    };

    document.getElementById('cancelDeleteNoteBtn').onclick = () => {
        closeModal(document.getElementById('deleteNoteConfirmModal'));
        showMessageBox("cancelled!", "info", 2000, translations);
        notesManager.noteToDeleteId = null;
    };

    // Password deletion confirmations
    document.getElementById('confirmDeletePmEntryBtn').onclick = async () => {
        closeModal(document.getElementById('deletePmEntryConfirmModal'));
        if (passwordManager.pmEntryToDeleteId) {
            await passwordManager.deletePassword(passwordManager.pmEntryToDeleteId);
            passwordManager.pmEntryToDeleteId = null;
        }
    };

    document.getElementById('cancelDeletePmEntryBtn').onclick = () => {
        closeModal(document.getElementById('deletePmEntryConfirmModal'));
        showMessageBox("cancelled!", "info", 2000, translations);
        passwordManager.pmEntryToDeleteId = null;
    };

    // Server button
    document.getElementById('serverBtn').onclick = () => {
        window.open("https://support.teamobi.com/login-game-3.html", "_blank");
    };

    // Friends button
    document.getElementById('friendsBtn').onclick = () => {
        openModal(document.getElementById('friendsModal'));
        loadFriendsList();
    };

    // Search functionality
    document.getElementById('searchIcon').onclick = () => {
        performUserSearch();
    };

    document.getElementById('userSearch').onkeydown = (e) => {
        if (e.key === 'Enter') {
            performUserSearch();
        }
    };

    // Message functionality
    document.getElementById('sendMessageBtn').onclick = () => {
        sendNewMessage();
    };

    document.getElementById('messageInput').onkeydown = (e) => {
        if (e.key === 'Enter') {
            sendNewMessage();
        }
    };

    // Notification and message functionality will be set after dashboard loads

    // Modal close buttons
    document.querySelectorAll('.close-button').forEach(button => {
        button.onclick = (e) => {
            const modalId = e.target.dataset.modal;
            const modalElement = document.getElementById(modalId);
            if (modalElement) closeModal(modalElement);
        };
    });
}

// File list functionality
async function loadFilesList() {
    const fileListDisplay = document.getElementById('fileListDisplay');
    const files = await fileManager.listFiles();
    
    fileListDisplay.innerHTML = '';
    if (files.length === 0) {
        fileListDisplay.innerHTML = `<p style="text-align: center; color: #94a3b8;">${getTranslation("no_files_saved")}</p>`;
        return;
    }

    files.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.classList.add('file-item');
        
        let formattedTimestamp = '';
        if (file.createdAt) {
            const date = new Date(file.createdAt);
            formattedTimestamp = `Uploaded: ${date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        fileElement.innerHTML = `
            <span class="file-name">${file.name}</span>
            <span class="file-timestamp" style="font-size: 0.8em; color: #aaa; margin-left: 10px;">${formattedTimestamp}</span>
            <div class="file-actions">
                <button class="download-file-action-btn btn btn-info btn-sm" data-signed-url="${file.signedUrl}" data-original-file-name="${file.name}">
                    ${getTranslation("download_file_button")}
                </button>
                <button class="delete-file-btn btn btn-danger btn-sm" data-file-name="${file.name}">
                    ${getTranslation("delete_file_button")}
                </button>
            </div>
        `;
        fileListDisplay.appendChild(fileElement);
    });

    // Event delegation for file actions
    fileListDisplay.onclick = async (event) => {
        const target = event.target;
        
        if (target.classList.contains('delete-file-btn')) {
            const fileName = target.dataset.fileName;
            fileManager.fileToDeleteName = fileName;
            openModal(document.getElementById('deleteFileConfirmModal'));
        }
        
        if (target.classList.contains('download-file-action-btn')) {
            const signedUrl = target.dataset.signedUrl;
            const originalFileName = target.dataset.originalFileName;
            
            try {
                const response = await fetch(signedUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const blob = await response.blob();

                // Check if Android interface is available
                if (typeof Android !== 'undefined' && Android.onBlobDataReceived) {
                    const reader = new FileReader();
                    reader.onloadend = function() {
                        const base64DataWithPrefix = reader.result;
                        const pureBase64 = base64DataWithPrefix.split(',')[1];
                        const mimeType = blob.type || 'application/octet-stream';
                        Android.onBlobDataReceived(pureBase64, mimeType, originalFileName);
                        showMessageBox("message_box_download_started", "success", 2000, translations);
                        console.log("File data sent to Android via JavaScript interface for download.");
                    };
                    reader.onerror = function(event) {
                        console.error("FileReader error during blob conversion:", event.target.error);
                        showMessageBox("message_box_failed_to_download_file" + " (JS read error)", "error", 3000, translations);
                        if (typeof Android !== 'undefined' && Android.onBlobError) {
                            Android.onBlobError("FileReader error during blob conversion: " + event.target.error?.message);
                        }
                    };
                    reader.readAsDataURL(blob);
                } else {
                    // Fallback for regular browsers
                    console.warn("Android interface not available. Falling back to default browser download.");
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = originalFileName;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    showMessageBox("message_box_download_started", "success", 2000, translations);
                }
            } catch (error) {
                console.error("Error during download:", error);
                showMessageBox("message_box_failed_to_download_file" + error.message, "error", 3000, translations);
            }
        }
    };
}

// Authentication state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Set currentUser immediately for managers to use
        if (authManager) {
            authManager.currentUser = user;
        }
        setTimeout(() => {
            setupDashboard(user);
        }, 2000);
    } else {
        console.log("No user logged in. Redirecting to login.html.");
        setupSection.style.display = 'none';
        mainDashboard.style.display = 'none';
        authManager?.clearSession();
        if (window.location.pathname !== '/login.html') {
            window.location.href = "login.html";
        }
    }
});

// Handle responsive text adjustments
function handleResponsiveText() {
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;
    
    // Adjust button text for mobile
    $('.btn[data-translate-key]').each(function() {
        const $btn = $(this);
        const text = $btn.text().trim();
        
        if (isSmallMobile && text.length > 12) {
            $btn.css({
                'font-size': '11px',
                'padding': '0.5rem 0.6rem',
                'line-height': '1.1'
            });
        } else if (isMobile && text.length > 16) {
            $btn.css({
                'font-size': '12px',
                'padding': '0.6rem 0.8rem',
                'line-height': '1.2'
            });
        }
    });
    
    // Adjust modal content for long text
    $('.modal-content h3').each(function() {
        const $header = $(this);
        if ($header.text().length > 30 && isMobile) {
            $header.css('font-size', 'clamp(0.9rem, 4vw, 1.1rem)');
        }
    });
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

// Friends and search functionality
async function performUserSearch() {
    const searchTerm = document.getElementById('userSearch').value.trim();
    if (!searchTerm) return;

    try {
        const snapshot = await db.collection('players')
            .where('usernameTag', '>=', searchTerm.toLowerCase())
            .where('usernameTag', '<=', searchTerm.toLowerCase() + '\uf8ff')
            .limit(10)
            .get();

        const results = [];
        snapshot.forEach(doc => {
            if (doc.id !== authManager.currentUser.uid) {
                results.push({ id: doc.id, ...doc.data() });
            }
        });

        displaySearchResults(results);
    } catch (error) {
        console.error('Search error:', error);
        showMessageBox('Search failed. Please try again.', 'error', 3000, translations);
    }
}

async function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';

    if (results.length === 0) {
        searchResults.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No users found</p>';
    } else {
        for (const user of results) {
            // Check if there's a pending friend request from this user
            const pendingRequest = await db.collection('players').doc(authManager.currentUser.uid)
                .collection('friendRequests').doc(user.id).get();
            
            // Check if already friends
            const existingFriend = await db.collection('players').doc(authManager.currentUser.uid)
                .collection('friends').doc(user.id).get();
            
            const item = document.createElement('div');
            item.className = 'search-item';
            
            let actionButton = '';
            if (existingFriend.exists && existingFriend.data().status === 'accepted') {
                actionButton = '<span style="color: var(--accent-red);">Already Friends</span>';
            } else if (pendingRequest.exists && pendingRequest.data().status === 'pending') {
                actionButton = `<button class="accept-btn" onclick="acceptFriendRequest('${user.id}', '${user.usernameTag}')">Accept Request</button>`;
            } else {
                actionButton = `<button class="add-friend-btn" onclick="addFriend('${user.id}', '${user.usernameTag}')">Add Friend</button>`;
            }
            
            item.innerHTML = `
                <div class="search-info">
                    <img src="avatars/${user.avatar}" alt="Avatar" class="search-avatar">
                    <span>@${user.usernameTag}</span>
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

window.addFriend = async function(friendId, friendUsername) {
    try {
        console.log('Sending friend request from:', authManager.currentUser.uid, 'to:', friendId);
        
        // Get current user data
        const currentUserDoc = await db.collection('players').doc(authManager.currentUser.uid).get();
        const currentUserData = currentUserDoc.data();
        console.log('Current user data:', currentUserData);
        
        // Send friend request
        const requestData = {
            fromUserId: authManager.currentUser.uid,
            fromUsername: currentUserData.usernameTag || currentUserData.username,
            status: 'pending',
            sentAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        console.log('Request data:', requestData);
        
        await db.collection('players').doc(friendId)
            .collection('friendRequests').doc(authManager.currentUser.uid).set(requestData);
        
        showMessageBox('Friend request sent!', 'success', 2000, translations);
        closeModal(document.getElementById('searchResultsModal'));
    } catch (error) {
        console.error('Add friend error:', error);
        console.error('Error details:', error.code, error.message);
        showMessageBox('Failed to send friend request', 'error', 3000, translations);
    }
}

async function loadFriendsList() {
    try {
        const snapshot = await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friends').where('status', '==', 'accepted').get();

        const friendsList = document.getElementById('friendsList');
        friendsList.innerHTML = '';

        if (snapshot.empty) {
            friendsList.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No friends yet</p>';
        } else {
            for (const doc of snapshot.docs) {
                const friend = doc.data();
                // Get friend's avatar
                const friendProfile = await db.collection('players').doc(friend.friendId).get();
                const friendData = friendProfile.data();
                
                const item = document.createElement('div');
                item.className = 'friend-item';
                item.innerHTML = `
                    <div class="friend-info">
                        <img src="avatars/${friendData.avatar}" alt="Avatar" class="friend-avatar">
                        <span>@${friend.username}</span>
                    </div>
                    <div class="friend-actions">
                        <button class="message-btn" onclick="sendMessage('${friend.friendId}')">Message</button>
                        <button class="unfriend-btn" onclick="removeFriend('${friend.friendId}')">Unfriend</button>
                    </div>
                `;
                friendsList.appendChild(item);
            }
        }
    } catch (error) {
        console.error('Load friends error:', error);
    }
}

window.removeFriend = async function(friendId) {
    try {
        // Remove from current user's friends
        await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friends').doc(friendId).delete();
        
        // Remove from other user's friends
        await db.collection('players').doc(friendId)
            .collection('friends').doc(authManager.currentUser.uid).delete();
        
        showMessageBox('Friend removed', 'info', 2000, translations);
        loadFriendsList();
    } catch (error) {
        console.error('Remove friend error:', error);
        showMessageBox('Failed to remove friend', 'error', 3000, translations);
    }
}

window.sendMessage = function(friendId) {
    currentChatFriend = friendId;
    openModal(document.getElementById('messagesModal'));
    loadMessages(friendId);
}

let currentChatFriend = null;

async function loadMessages(friendId) {
    try {
        // Get friend's username for title
        const friendDoc = await db.collection('players').doc(friendId).get();
        const friendData = friendDoc.data();
        document.getElementById('messageModalTitle').textContent = `Chat with @${friendData.usernameTag}`;
        
        // Load messages
        const messagesSnapshot = await db.collection('messages')
            .where('participants', 'array-contains', authManager.currentUser.uid)
            .get();
        
        let chatMessages = [];
        messagesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.participants.includes(friendId)) {
                chatMessages.push({ id: doc.id, ...data });
            }
        });
        
        // Sort by timestamp
        chatMessages.sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return a.createdAt.toMillis() - b.createdAt.toMillis();
        });
        
        displayMessages(chatMessages);
    } catch (error) {
        console.error('Load messages error:', error);
    }
}

function displayMessages(messages) {
    const messagesList = document.getElementById('messagesList');
    messagesList.innerHTML = '';
    
    if (messages.length === 0) {
        messagesList.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No messages yet</p>';
        return;
    }
    
    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        const isSent = message.senderId === authManager.currentUser.uid;
        messageDiv.className = `message-item ${isSent ? 'message-sent' : 'message-received'}`;
        
        let timestamp = '';
        if (message.createdAt) {
            timestamp = message.createdAt.toDate().toLocaleString();
        }
        
        messageDiv.innerHTML = `
            <div>${message.text}</div>
            <div class="message-timestamp">${timestamp}</div>
        `;
        messagesList.appendChild(messageDiv);
    });
    
    messagesList.scrollTop = messagesList.scrollHeight;
}

async function sendNewMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();
    
    if (!messageText || !currentChatFriend) return;
    
    try {
        await db.collection('messages').add({
            text: messageText,
            senderId: authManager.currentUser.uid,
            participants: [authManager.currentUser.uid, currentChatFriend],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        messageInput.value = '';
        loadMessages(currentChatFriend);
    } catch (error) {
        console.error('Send message error:', error);
        showMessageBox('Failed to send message', 'error', 3000, translations);
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

// Notifications functionality
async function loadNotifications() {
    try {
        const snapshot = await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friendRequests').where('status', '==', 'pending').get();
        // Load general notifications
        const notificationsSnapshot = await db.collection('players').doc(authManager.currentUser.uid)
            .collection('notifications').where('read', '==', false).get();

        const notificationsList = document.getElementById('notificationsList');
        notificationsList.innerHTML = '';

        let hasNotifications = false;

        // Display friend requests
        for (const doc of snapshot.docs) {
            hasNotifications = true;
            const request = doc.data();
            const senderProfile = await db.collection('players').doc(request.fromUserId).get();
            const senderData = senderProfile.data();
            
            const item = document.createElement('div');
            item.className = 'notification-item';
            item.innerHTML = `
                <div class="notification-info">
                    <img src="avatars/${senderData.avatar}" alt="Avatar" class="friend-avatar">
                    <span>@${request.fromUsername} sent you a friend request</span>
                </div>
                <div class="notification-actions">
                    <button class="accept-btn" onclick="acceptFriendRequest('${request.fromUserId}', '${request.fromUsername}')">Accept</button>
                    <button class="reject-btn" onclick="rejectFriendRequest('${request.fromUserId}')">Reject</button>
                </div>
            `;
            notificationsList.appendChild(item);
        }

        // Display general notifications
        for (const doc of notificationsSnapshot.docs) {
            hasNotifications = true;
            const notification = doc.data();
            const senderProfile = await db.collection('players').doc(notification.fromUserId).get();
            const senderData = senderProfile.data();
            
            const item = document.createElement('div');
            item.className = 'notification-item';
            item.innerHTML = `
                <div class="notification-info">
                    <img src="avatars/${senderData.avatar}" alt="Avatar" class="friend-avatar">
                    <span>${notification.message}</span>
                </div>
                <div class="notification-actions">
                    <button class="reject-btn" onclick="markAsRead('${doc.id}')">Mark as Read</button>
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

window.acceptFriendRequest = async function(fromUserId, fromUsername) {
    try {
        // Add to current user's friends
        await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friends').doc(fromUserId).set({
                friendId: fromUserId,
                username: fromUsername,
                status: 'accepted',
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        // Add current user to sender's friends
        const currentUserData = await db.collection('players').doc(authManager.currentUser.uid).get();
        await db.collection('players').doc(fromUserId)
            .collection('friends').doc(authManager.currentUser.uid).set({
                friendId: authManager.currentUser.uid,
                username: currentUserData.data().usernameTag,
                status: 'accepted',
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        // Update request status
        await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friendRequests').doc(fromUserId).update({
                status: 'accepted'
            });

        // Send acceptance notification to the sender
        await db.collection('players').doc(fromUserId)
            .collection('notifications').add({
                type: 'friend_accepted',
                fromUserId: authManager.currentUser.uid,
                fromUsername: currentUserData.data().usernameTag,
                message: `@${currentUserData.data().usernameTag} accepted your friend request`,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });

        showMessageBox('Friend request accepted!', 'success', 2000, translations);
        loadNotifications();
    } catch (error) {
        console.error('Accept friend request error:', error);
        showMessageBox('Failed to accept friend request', 'error', 3000, translations);
    }
}

window.rejectFriendRequest = async function(fromUserId) {
    try {
        await db.collection('players').doc(authManager.currentUser.uid)
            .collection('friendRequests').doc(fromUserId).update({
                status: 'rejected'
            });

        showMessageBox('Friend request rejected', 'info', 2000, translations);
        loadNotifications();
    } catch (error) {
        console.error('Reject friend request error:', error);
        showMessageBox('Failed to reject friend request', 'error', 3000, translations);
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

async function loadRecentChats() {
    try {
        document.getElementById('messageModalTitle').textContent = 'Recent Chats';
        
        // Get friends list to show as chat options
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
            
            const chatItem = document.createElement('div');
            chatItem.className = 'friend-item';
            chatItem.style.cursor = 'pointer';
            chatItem.onclick = () => sendMessage(friend.friendId);
            chatItem.innerHTML = `
                <div class="friend-info">
                    <img src="avatars/${friendData.avatar}" alt="Avatar" class="friend-avatar">
                    <span>@${friend.username}</span>
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

// Initialize application
$(document).ready(function() {
    const storedLang = localStorage.getItem('selectedLanguage') || 'en';
    if (languageSelect) languageSelect.value = storedLang;
    
    loadTranslations(storedLang).then(() => {
        initializeManagers();
        setupEventListeners();
        loadAvatars();
    });

    if (languageSelect) {
        $('#language-select').on('change', function() {
            const selectedLang = $(this).val();
            loadTranslations(selectedLang);
        });
    }
    
    // Handle window resize
    $(window).on('resize orientationchange', function() {
        setTimeout(() => handleResponsiveText(), 200);
    });
    
    // Initial responsive text handling
    setTimeout(() => handleResponsiveText(), 500);
});