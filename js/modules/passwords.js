import { encryptData, decryptData } from './crypto.js';
import { showMessageBox } from './ui.js';

export class PasswordManager {
    constructor(authManager, db, translations) {
        this.authManager = authManager;
        this.db = db;
        this.translations = translations;
        this.pmEntryToDeleteId = null;
        this.unsubscribePasswords = null;
    }

    async savePassword(serviceName, username, password) {
        if (!this.authManager.currentUser || !this.authManager.currentEncryptionKey) {
            showMessageBox("message_box_please_unlock_dashboard", "error", 3000, this.translations);
            return false;
        }

        if (!serviceName || !username || !password) {
            showMessageBox("message_box_pm_all_fields_required", "error", 3000, this.translations);
            return false;
        }

        try {
            const encryptedPassword = encryptData(password, this.authManager.currentEncryptionKey);
            if (!encryptedPassword) {
                throw new Error("message_box_encryption_failed");
            }
            
            await this.db.collection('players').doc(this.authManager.currentUser.uid).collection('passwords').add({
                serviceName: serviceName,
                username: username,
                password: encryptedPassword,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showMessageBox("message_box_password_added_success", "success", 3000, this.translations);
            return true;
        } catch (error) {
            console.error("Error adding password:", error);
            showMessageBox("message_box_failed_to_add_password" + error.message, "error", 3000, this.translations);
            return false;
        }
    }

    loadPasswords(displayElement) {
        if (!this.authManager.currentUser || !this.authManager.currentEncryptionKey) {
            displayElement.innerHTML = `<p style="text-align: center; color: #94a3b8;">${this.translations["unlock_dashboard_to_view_passwords"] || "Unlock dashboard to view passwords"}</p>`;
            return;
        }

        // Unsubscribe from previous listener to prevent memory leaks
        if (this.unsubscribePasswords) {
            this.unsubscribePasswords();
        }

        this.unsubscribePasswords = this.db.collection('players').doc(this.authManager.currentUser.uid).collection('passwords')
            .orderBy('timestamp', "desc")
            .onSnapshot((snapshot) => {
                displayElement.innerHTML = '';
                if (snapshot.empty) {
                    displayElement.innerHTML = `<p style="text-align: center; color: #94a3b8;">${this.translations["no_passwords_saved"] || "No passwords saved"}</p>`;
                    return;
                }
                
                snapshot.forEach(doc => {
                    const entry = doc.data();
                    const decryptedContent = decryptData(entry.password, this.authManager.currentEncryptionKey);

                    const entryDiv = document.createElement('div');
                    
                    const serviceP = document.createElement('p');
                    serviceP.innerHTML = `<strong>${this.translations["service_label"] || "Service"}:</strong> `;
                    const serviceNameSpan = document.createElement('span');
                    serviceNameSpan.textContent = entry.serviceName;
                    serviceP.appendChild(serviceNameSpan);

                    const usernameP = document.createElement('p');
                    usernameP.innerHTML = `<strong>${this.translations["username_label"] || "Username"}:</strong> `;
                    const usernameSpan = document.createElement('span');
                    usernameSpan.textContent = entry.username;
                    usernameP.appendChild(usernameSpan);

                    const passwordP = document.createElement('p');
                    passwordP.innerHTML = `<strong>${this.translations["password_label"] || "Password"}:</strong> `;
                    const decryptedPasswordSpan = document.createElement('span');
                    decryptedPasswordSpan.className = 'decrypted-password';

                    if (decryptedContent === null) {
                        decryptedPasswordSpan.style.color = 'red';
                        decryptedPasswordSpan.textContent = this.translations["decryption_failed_invalid_data"] || "Decryption failed";
                    } else {
                        decryptedPasswordSpan.textContent = decryptedContent;
                    }
                    passwordP.appendChild(decryptedPasswordSpan);

                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'delete-pm-btn btn btn-danger';
                    deleteButton.dataset.entryId = doc.id;
                    deleteButton.textContent = this.translations["Delete"] || "Delete";

                    entryDiv.appendChild(serviceP);
                    entryDiv.appendChild(usernameP);
                    entryDiv.appendChild(passwordP);
                    entryDiv.appendChild(deleteButton);
                    displayElement.appendChild(entryDiv);
                });
                
                // Add event listeners for delete buttons
                displayElement.querySelectorAll('.delete-pm-btn').forEach(button => {
                    button.onclick = (event) => {
                        this.pmEntryToDeleteId = event.target.dataset.entryId;
                        const modal = document.getElementById('deletePmEntryConfirmModal');
                        if (modal) modal.style.display = 'flex';
                    };
                });
            }, (error) => {
                console.error("Error loading passwords:", error);
                showMessageBox("failed_to_load_passwords_error" + error.message, "error", 3000, this.translations);
            });
    }

    async deletePassword(entryId) {
        if (!this.authManager.currentUser) {
            showMessageBox("message_box_please_login_delete_pm_entries", "error", 3000, this.translations);
            return false;
        }

        try {
            await this.db.collection('players').doc(this.authManager.currentUser.uid).collection('passwords').doc(entryId).delete();
            showMessageBox("message_box_pm_entry_deleted_success", "success", 3000, this.translations);
            return true;
        } catch (error) {
            console.error("Error deleting password entry:", error);
            showMessageBox("message_box_failed_to_delete_pm_entry" + error.message, "error", 3000, this.translations);
            return false;
        }
    }

    cleanup() {
        if (this.unsubscribePasswords) {
            this.unsubscribePasswords();
            this.unsubscribePasswords = null;
        }
    }
}