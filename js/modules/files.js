import { SUPABASE_CONFIG, FILE_CONFIG } from './config.js';
import { showMessageBox, openModal, closeModal } from './ui.js';

export class FileManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.fileToDeleteName = null;
    }

    async uploadFile(file) {
        if (!this.authManager.currentUser) {
            showMessageBox("Please login to upload files", "error", 3000);
            return false;
        }

        if (file.size > FILE_CONFIG.MAX_FILE_SIZE_BYTES) {
            showMessageBox(`Limit Exceeded! (${FILE_CONFIG.MAX_FILE_SIZE_MB}MB)`, "error", 5000);
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
            showMessageBox("File uploaded successfully", "success", 3000);
            return true;

        } catch (error) {
            console.error("Error uploading file:", error);
            showMessageBox("Failed to upload file: " + error.message, "error", 5000);
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
            showMessageBox("Failed to load files: " + error.message, "error", 3000);
            return [];
        }
    }

    async deleteFile(fileName) {
        if (!this.authManager.currentUser) {
            showMessageBox("Please login to delete files", "error", 3000);
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

            showMessageBox("File deleted successfully", "success", 3000);
            return true;
        } catch (error) {
            console.error("Error deleting file:", error);
            showMessageBox("Failed to delete file: " + error.message, "error", 3000);
            return false;
        }
    }
}