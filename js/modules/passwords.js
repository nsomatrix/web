import { encryptData, decryptData } from './crypto.js';
import { showMessageBox } from './ui.js';

export class PasswordManager {
    constructor(authManager, db) {
        this.authManager = authManager;
        this.db = db;
        this.pmEntryToDeleteId = null;
        this.unsubscribePasswords = null;
    }

    async savePassword(serviceName, username, password) {
        if (!this.authManager.currentUser || !this.authManager.currentEncryptionKey) {
            showMessageBox("Please unlock dashboard first", "error", 3000);
            return false;
        }

        if (!serviceName || !username || !password) {
            showMessageBox("All fields are required", "error", 3000);
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
            
            showMessageBox("Password added successfully", "success", 3000);
            return true;
        } catch (error) {
            console.error("Error adding password:", error);
            showMessageBox("Failed to add password: " + error.message, "error", 3000);
            return false;
        }
    }

    loadPasswords(displayElement) {
        if (!this.authManager.currentUser || !this.authManager.currentEncryptionKey) {
            displayElement.innerHTML = `<p style="text-align: center; color: #94a3b8;">Unlock dashboard to view passwords</p>`;
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
                    displayElement.innerHTML = `<p style="text-align: center; color: #94a3b8;">No passwords saved</p>`;
                    return;
                }
                
                snapshot.forEach(doc => {
                    const entry = doc.data();
                    const decryptedContent = decryptData(entry.password, this.authManager.currentEncryptionKey);

                    const entryDiv = document.createElement('div');
                    
                    const serviceP = document.createElement('p');
                    serviceP.innerHTML = `<strong>Service:</strong> `;
                    const serviceNameSpan = document.createElement('span');
                    serviceNameSpan.textContent = entry.serviceName;
                    serviceP.appendChild(serviceNameSpan);

                    const usernameP = document.createElement('p');
                    usernameP.innerHTML = `<strong>Username:</strong> `;
                    const usernameSpan = document.createElement('span');
                    usernameSpan.textContent = entry.username;
                    usernameP.appendChild(usernameSpan);

                    const passwordP = document.createElement('p');
                    passwordP.innerHTML = `<strong>Password:</strong> `;
                    const decryptedPasswordSpan = document.createElement('span');
                    decryptedPasswordSpan.className = 'decrypted-password';

                    if (decryptedContent === null) {
                        decryptedPasswordSpan.style.color = 'red';
                        decryptedPasswordSpan.textContent = "Decryption failed";
                    } else {
                        decryptedPasswordSpan.textContent = decryptedContent;
                    }
                    passwordP.appendChild(decryptedPasswordSpan);

                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'delete-pm-btn btn btn-danger';
                    deleteButton.dataset.entryId = doc.id;
                    deleteButton.textContent = "Delete";

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
                showMessageBox("Failed to load passwords: " + error.message, "error", 3000);
            });
    }

    async deletePassword(entryId) {
        if (!this.authManager.currentUser) {
            showMessageBox("Please login to delete password entries", "error", 3000);
            return false;
        }

        try {
            await this.db.collection('players').doc(this.authManager.currentUser.uid).collection('passwords').doc(entryId).delete();
            showMessageBox("Password entry deleted successfully", "success", 3000);
            return true;
        } catch (error) {
            console.error("Error deleting password entry:", error);
            showMessageBox("Failed to delete password entry: " + error.message, "error", 3000);
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