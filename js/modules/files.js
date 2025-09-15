import { SUPABASE_CONFIG, FILE_CONFIG } from './config.js';
import { showMessageBox, openModal, closeModal } from './ui.js';

export class FileManager {
    constructor(authManager, translations) {
        this.authManager = authManager;
        this.translations = translations;
        this.fileToDeleteName = null;
    }

    async uploadFile(file) {
        if (!this.authManager.currentUser) {
            showMessageBox("message_box_please_login_upload_files", "error", 3000, this.translations);
            return false;
        }

        if (file.size > FILE_CONFIG.MAX_FILE_SIZE_BYTES) {
            showMessageBox(`Limit Exceeded! (${FILE_CONFIG.MAX_FILE_SIZE_MB}MB)`, "error", 5000, this.translations);
            return false;
        }

        const progressBar = document.getElementById('fileUploadProgressBar');
        const progressText = document.getElementById('fileUploadProgressText');
        const progressContainer = document.getElementById('fileUploadProgressBarContainer');

        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.style.display = 'block';
        progressText.innerText = '0%';

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', this.authManager.currentUser.uid);
            formData.append('fileName', file.name);

            const idToken = await this.authManager.currentUser.getIdToken();

            const result = await this.uploadWithProgress(formData, idToken, progressBar, progressText);
            showMessageBox("message_box_file_uploaded_success", "success", 3000, this.translations);
            return true;

        } catch (error) {
            console.error("Error uploading file:", error);
            showMessageBox("message_box_failed_to_upload_file" + error.message, "error", 5000, this.translations);
            return false;
        } finally {
            setTimeout(() => {
                progressContainer.style.display = 'none';
                progressText.style.display = 'none';
                progressBar.style.width = '0%';
            }, 1000);
        }
    }

    uploadWithProgress(formData, idToken, progressBar, progressText) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    progressBar.style.width = `${percent}%`;
                    progressText.innerText = `${percent}%`;
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (e) {
                        reject(new Error('Invalid JSON response from server.'));
                    }
                } else {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        reject(new Error(errorData.message || `Server error: ${xhr.status}`));
                    } catch (e) {
                        reject(new Error(`HTTP error! Status: ${xhr.status}`));
                    }
                }
            };

            xhr.onerror = () => reject(new Error('Network error during file upload.'));
            xhr.onabort = () => reject(new Error('File upload aborted.'));

            xhr.open('POST', `${SUPABASE_CONFIG.url}/functions/v1/upload-file`);
            xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
            xhr.send(formData);
        });
    }

    async listFiles() {
        if (!this.authManager.currentUser) {
            return [];
        }

        try {
            const idToken = await this.authManager.currentUser.getIdToken();
            const response = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/list-files`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ userId: this.authManager.currentUser.uid })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to list files');
            }

            return await response.json();
        } catch (error) {
            console.error("Error listing files:", error);
            showMessageBox("failed_to_load_files_error" + error.message, "error", 3000, this.translations);
            return [];
        }
    }

    async deleteFile(fileName) {
        if (!this.authManager.currentUser) {
            showMessageBox("message_box_please_login_delete_files", "error", 3000, this.translations);
            return false;
        }

        try {
            const idToken = await this.authManager.currentUser.getIdToken();
            const response = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/delete-file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ userId: this.authManager.currentUser.uid, fileName: fileName })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete file');
            }

            showMessageBox("message_box_file_deleted_success", "success", 3000, this.translations);
            return true;
        } catch (error) {
            console.error("Error deleting file:", error);
            showMessageBox("message_box_failed_to_delete_file" + error.message, "error", 3000, this.translations);
            return false;
        }
    }
}