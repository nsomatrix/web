// File storage feature has been removed - this module is deprecated
export class FileManager {
    constructor(authManager) {
        this.authManager = authManager;
    }

    async uploadFile() { return false; }
    async listFiles() { return []; }
    async deleteFile() { return false; }
}