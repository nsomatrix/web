import { encryptData, decryptData } from './crypto.js';
import { showMessageBox } from './ui.js';

export class NotesManager {
    constructor(authManager, db, translations) {
        this.authManager = authManager;
        this.db = db;
        this.translations = translations;
        this.noteToDeleteId = null;
        this.unsubscribeNotes = null;
    }

    async saveNote(noteText) {
        if (!this.authManager.currentUser || !this.authManager.currentEncryptionKey) {
            showMessageBox("message_box_please_unlock_dashboard", "error", 3000, this.translations);
            return false;
        }

        if (!noteText.trim()) {
            showMessageBox("message_box_note_empty", "error", 3000, this.translations);
            return false;
        }

        try {
            const encryptedContent = encryptData(noteText, this.authManager.currentEncryptionKey);
            if (!encryptedContent) {
                throw new Error("message_box_encryption_failed");
            }
            
            await this.db.collection('players').doc(this.authManager.currentUser.uid).collection('notes').add({
                content: encryptedContent,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showMessageBox("message_box_note_added_success", "success", 3000, this.translations);
            return true;
        } catch (error) {
            console.error("Error adding note:", error);
            showMessageBox("message_box_failed_to_add_note" + error.message, "error", 3000, this.translations);
            return false;
        }
    }

    loadNotes(displayElement) {
        if (!this.authManager.currentUser || !this.authManager.currentEncryptionKey) {
            displayElement.innerHTML = `<p style="text-align: center; color: #94a3b8;">${this.translations["unlock_dashboard_to_view_notes"] || "Unlock dashboard to view notes"}</p>`;
            return;
        }

        // Unsubscribe from previous listener to prevent memory leaks
        if (this.unsubscribeNotes) {
            this.unsubscribeNotes();
        }

        this.unsubscribeNotes = this.db.collection('players').doc(this.authManager.currentUser.uid).collection('notes')
            .orderBy('timestamp', "desc")
            .onSnapshot((snapshot) => {
                displayElement.innerHTML = '';
                if (snapshot.empty) {
                    displayElement.innerHTML = `<p style="text-align: center; color: #94a3b8;">${this.translations["no_notes_saved"] || "No notes saved"}</p>`;
                    return;
                }
                
                snapshot.forEach(doc => {
                    const note = doc.data();
                    const decryptedContent = decryptData(note.content, this.authManager.currentEncryptionKey);

                    const noteDiv = document.createElement('div');
                    const timestampP = document.createElement('p');
                    timestampP.innerHTML = `<strong>${note.timestamp ? new Date(note.timestamp.toDate()).toLocaleString() : this.translations["saving_status"] || "Saving..."}</strong>`;

                    const contentP = document.createElement('p');
                    if (decryptedContent === null) {
                        contentP.style.color = 'red';
                        contentP.textContent = this.translations["decryption_failed_invalid_data"] || "Decryption failed";
                    } else {
                        contentP.textContent = decryptedContent;
                    }

                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'delete-note-btn btn btn-danger';
                    deleteButton.dataset.noteId = doc.id;
                    deleteButton.textContent = this.translations["Delete"] || "Delete";

                    noteDiv.appendChild(timestampP);
                    noteDiv.appendChild(contentP);
                    noteDiv.appendChild(deleteButton);
                    displayElement.appendChild(noteDiv);
                });
                
                // Add event listeners for delete buttons
                displayElement.querySelectorAll('.delete-note-btn').forEach(button => {
                    button.onclick = (event) => {
                        this.noteToDeleteId = event.target.dataset.noteId;
                        const modal = document.getElementById('deleteNoteConfirmModal');
                        if (modal) modal.style.display = 'flex';
                    };
                });
            }, (error) => {
                console.error("Error loading notes:", error);
                showMessageBox("failed_to_load_notes_error" + error.message, "error", 3000, this.translations);
            });
    }

    async deleteNote(noteId) {
        if (!this.authManager.currentUser) {
            showMessageBox("message_box_please_login_delete_notes", "error", 3000, this.translations);
            return false;
        }

        try {
            await this.db.collection('players').doc(this.authManager.currentUser.uid).collection('notes').doc(noteId).delete();
            showMessageBox("message_box_note_deleted_success", "success", 3000, this.translations);
            return true;
        } catch (error) {
            console.error("Error deleting note:", error);
            showMessageBox("message_box_failed_to_delete_note" + error.message, "error", 3000, this.translations);
            return false;
        }
    }

    cleanup() {
        if (this.unsubscribeNotes) {
            this.unsubscribeNotes();
            this.unsubscribeNotes = null;
        }
    }
}