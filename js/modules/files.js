import { showMessageBox } from './ui.js';

export class FileManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.fileToDeleteName = null;
    }

    async uploadFile(file) {
        showMessageBox("File storage feature has been removed", "info", 3000);
        return false;
    }

    async listFiles() {
        return [];
    }

    async deleteFile(fileName) {
        showMessageBox("File storage feature has been removed", "info", 3000);
        return false;
    }
}