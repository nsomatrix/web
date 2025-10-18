import { sanitizeInput } from './utils.js';

export class FriendsManager {
    constructor(authManager, db) {
        this.authManager = authManager;
        this.db = db;
        this.friendToRemove = null;
    }

    async loadFriendsList() {
        try {
            const snapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('friends').where('status', '==', 'accepted').get();

            const friendsList = document.getElementById('friendsList');
            friendsList.innerHTML = '';

            if (snapshot.empty) {
                friendsList.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No friends yet</p>';
                return;
            }

            for (const doc of snapshot.docs) {
                const friend = doc.data();
                const friendProfile = await this.db.collection('players').doc(friend.friendId).get();
                
                if (!friendProfile.exists) {
                    doc.ref.delete().catch(console.error);
                    continue;
                }
                
                const friendData = friendProfile.data();
                const onlineStatus = await this.getOnlineStatus(friend.friendId);
                
                const item = document.createElement('div');
                item.className = 'friend-item';
                item.innerHTML = `
                    <div class="friend-info">
                        <img src="avatars/${sanitizeInput(friendData.avatar)}" alt="Avatar" class="friend-avatar">
                        <div class="friend-details">
                            <div class="friend-name">@${sanitizeInput(friend.username)}</div>
                            <div class="friend-status">
                                <span class="online-status ${onlineStatus.isOnline ? 'status-online' : 'status-offline'}"></span>
                                ${!onlineStatus.isOnline ? `<span class="last-seen">${sanitizeInput(onlineStatus.lastSeen)}</span>` : '<span class="online-text">Online</span>'}
                            </div>
                        </div>
                    </div>
                    <div class="friend-actions">
                        <button class="btn btn-sm" style="background:#007bff;" onclick="window.friendsManager.sendMessage('${sanitizeInput(friend.friendId)}')">Message</button>
                        <button class="btn btn-sm btn-danger" onclick="window.friendsManager.removeFriend('${sanitizeInput(friend.friendId)}')">Remove</button>
                    </div>
                `;
                friendsList.appendChild(item);
            }
        } catch (error) {
            console.error('Load friends error:', error);
        }
    }

    async getOnlineStatus(userId) {
        try {
            const presenceDoc = await this.db.collection('presence').doc(userId).get();
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

    removeFriend(friendId) {
        this.friendToRemove = friendId;
        window.openModal(document.getElementById('unfriendConfirmModal'));
    }

    async confirmRemoveFriend() {
        if (!this.friendToRemove) return;
        
        try {
            const batch = this.db.batch();
            
            const friendRef1 = this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('friends').doc(this.friendToRemove);
            batch.delete(friendRef1);
            
            const friendRef2 = this.db.collection('players').doc(this.friendToRemove)
                .collection('friends').doc(this.authManager.currentUser.uid);
            batch.delete(friendRef2);
            
            await batch.commit();
            window.showMessageBox('Friend removed', 'info', 2000);
            this.loadFriendsList();
            window.closeModal(document.getElementById('unfriendConfirmModal'));
        } catch (error) {
            console.error('Remove friend error:', error);
            window.showMessageBox('Failed to remove friend', 'error', 3000);
        } finally {
            this.friendToRemove = null;
        }
    }

    sendMessage(friendId) {
        if (window.messagingManager) {
            window.messagingManager.openChat(friendId);
        }
    }
}