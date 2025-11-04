import { sanitizeInput } from './utils.js';

export class SocialManager {
    constructor(authManager, db) {
        this.authManager = authManager;
        this.db = db;
        this.isLoading = false;
    }

    async performUserSearch() {
        const searchTerm = document.getElementById('userSearch').value.trim();
        if (!searchTerm) return;

        try {
            const tagSnapshot = await this.db.collection('players')
                .where('usernameTag', '>=', searchTerm.toLowerCase())
                .where('usernameTag', '<=', searchTerm.toLowerCase() + '\uf8ff')
                .limit(10)
                .get();

            const nameSnapshot = await this.db.collection('players')
                .where('username', '>=', searchTerm)
                .where('username', '<=', searchTerm + '\uf8ff')
                .limit(10)
                .get();

            const results = new Map();
            
            tagSnapshot.forEach(doc => {
                if (doc.id !== this.authManager.currentUser.uid) {
                    results.set(doc.id, { id: doc.id, ...doc.data() });
                }
            });
            
            nameSnapshot.forEach(doc => {
                if (doc.id !== this.authManager.currentUser.uid) {
                    results.set(doc.id, { id: doc.id, ...doc.data() });
                }
            });

            this.displaySearchResults(Array.from(results.values()));
        } catch (error) {
            console.error('Search error:', error);
            window.showMessageBox('Search failed. Please try again.', 'error', 3000);
        }
    }

    async displaySearchResults(results) {
        const searchResults = document.getElementById('searchResults');
        searchResults.innerHTML = '';

        if (results.length === 0) {
            searchResults.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No users found</p>';
        } else {
            for (const user of results) {
                const pendingRequest = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                    .collection('friendRequests').doc(user.id).get();
                
                const existingFriend = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                    .collection('friends').doc(user.id).get();
                
                const item = document.createElement('div');
                item.className = 'search-item';
                
                let actionButton = '';
                if (existingFriend.exists && existingFriend.data().status === 'accepted') {
                    actionButton = '<span style="color: var(--accent-red);">Already Friends</span>';
                } else if (pendingRequest.exists && pendingRequest.data().status === 'pending') {
                    actionButton = `<button class="accept-btn" onclick="window.socialManager.acceptFriendRequest('${sanitizeInput(user.id)}', '${sanitizeInput(user.usernameTag)}')">Accept Request</button>`;
                } else {
                    actionButton = `<button class="add-friend-btn btn btn-danger" onclick="window.socialManager.addFriend('${sanitizeInput(user.id)}', '${sanitizeInput(user.usernameTag)}')">Add Friend</button>`;
                }
                
                item.innerHTML = `
                    <div class="search-info">
                        <img src="${window.getAssetPath(`avatars/${sanitizeInput(user.avatar)}`)}" alt="Avatar" class="search-avatar">
                        <span>@${sanitizeInput(user.usernameTag)}</span>
                    </div>
                    <div class="search-actions">
                        ${actionButton}
                    </div>
                `;
                searchResults.appendChild(item);
            }
        }

        window.openModal(document.getElementById('searchResultsModal'));
    }

    async addFriend(friendId, friendUsername) {
        try {
            const currentUserDoc = await this.db.collection('players').doc(this.authManager.currentUser.uid).get();
            const currentUserData = currentUserDoc.data();
            
            const requestData = {
                fromUserId: this.authManager.currentUser.uid,
                fromUsername: currentUserData.usernameTag || currentUserData.username,
                status: 'pending',
                sentAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await this.db.collection('players').doc(friendId)
                .collection('friendRequests').doc(this.authManager.currentUser.uid).set(requestData);
            
            window.showMessageBox('Friend request sent!', 'success', 2000);
            window.closeModal(document.getElementById('searchResultsModal'));
        } catch (error) {
            console.error('Add friend error:', error);
            window.showMessageBox('Failed to send friend request', 'error', 3000);
        }
    }

    async acceptFriendRequest(fromUserId, fromUsername) {
        try {
            const batch = this.db.batch();
            const currentUserData = await this.db.collection('players').doc(this.authManager.currentUser.uid).get();
            
            const existingFriends = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('friends').where('friendId', '==', fromUserId).get();
            existingFriends.forEach(doc => batch.delete(doc.ref));
            
            const existingReverseFriends = await this.db.collection('players').doc(fromUserId)
                .collection('friends').where('friendId', '==', this.authManager.currentUser.uid).get();
            existingReverseFriends.forEach(doc => batch.delete(doc.ref));
            
            const friendRef1 = this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('friends').doc(fromUserId);
            batch.set(friendRef1, {
                friendId: fromUserId,
                username: fromUsername,
                status: 'accepted',
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const friendRef2 = this.db.collection('players').doc(fromUserId)
                .collection('friends').doc(this.authManager.currentUser.uid);
            batch.set(friendRef2, {
                friendId: this.authManager.currentUser.uid,
                username: currentUserData.data().usernameTag,
                status: 'accepted',
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const requestRef = this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('friendRequests').doc(fromUserId);
            batch.update(requestRef, { status: 'accepted' });

            const notificationRef = this.db.collection('players').doc(fromUserId)
                .collection('notifications').doc();
            batch.set(notificationRef, {
                type: 'friend_accepted',
                fromUserId: this.authManager.currentUser.uid,
                fromUsername: currentUserData.data().usernameTag,
                message: `@${currentUserData.data().usernameTag} accepted your friend request`,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });

            await batch.commit();
            window.showMessageBox('Friend request accepted!', 'success', 2000);
            this.loadNotifications();
        } catch (error) {
            console.error('Accept friend request error:', error);
            window.showMessageBox('Failed to accept friend request', 'error', 3000);
        }
    }

    async loadNotifications() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            const notificationsList = document.getElementById('notificationsList');
            notificationsList.innerHTML = '';
            
            const snapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('friendRequests').where('status', '==', 'pending').get();
            const notificationsSnapshot = await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('notifications').where('read', '==', false).get();

            let hasNotifications = false;

            for (const doc of snapshot.docs) {
                hasNotifications = true;
                const request = doc.data();
                const senderProfile = await this.db.collection('players').doc(request.fromUserId).get();
                const senderData = senderProfile.data();
                
                const item = document.createElement('div');
                item.className = 'notification-item';
                item.innerHTML = `
                    <div class="notification-info">
                        <img src="${window.getAssetPath(`avatars/${sanitizeInput(senderData.avatar)}`)}" alt="Avatar" class="friend-avatar">
                        <span>@${sanitizeInput(request.fromUsername)} sent you a friend request</span>
                    </div>
                    <div class="notification-actions">
                        <button class="accept-btn btn btn-success" onclick="window.socialManager.acceptFriendRequest('${sanitizeInput(request.fromUserId)}', '${sanitizeInput(request.fromUsername)}')">Accept</button>
                        <button class="reject-btn btn btn-danger" onclick="window.socialManager.rejectFriendRequest('${sanitizeInput(request.fromUserId)}')">Reject</button>
                    </div>
                `;
                notificationsList.appendChild(item);
            }

            for (const doc of notificationsSnapshot.docs) {
                hasNotifications = true;
                const notification = doc.data();
                const senderProfile = await this.db.collection('players').doc(notification.fromUserId).get();
                const senderData = senderProfile.data();
                
                const item = document.createElement('div');
                item.className = 'notification-item';
                item.innerHTML = `
                    <div class="notification-info">
                        <img src="${window.getAssetPath(`avatars/${sanitizeInput(senderData.avatar)}`)}" alt="Avatar" class="friend-avatar">
                        <span>${sanitizeInput(notification.message)}</span>
                    </div>
                    <div class="notification-actions">
                        <button class="reject-btn btn btn-danger" onclick="window.socialManager.markAsRead('${sanitizeInput(doc.id)}')">Mark as Read</button>
                    </div>
                `;
                notificationsList.appendChild(item);
            }

            if (!hasNotifications) {
                notificationsList.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No notifications</p>';
            }
        } catch (error) {
            console.error('Load notifications error:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async rejectFriendRequest(fromUserId) {
        try {
            await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('friendRequests').doc(fromUserId).update({
                    status: 'rejected'
                });

            window.showMessageBox('Friend request rejected', 'info', 2000);
            this.loadNotifications();
        } catch (error) {
            console.error('Reject friend request error:', error);
            window.showMessageBox('Failed to reject friend request', 'error', 3000);
        }
    }

    async markAsRead(notificationId) {
        try {
            await this.db.collection('players').doc(this.authManager.currentUser.uid)
                .collection('notifications').doc(notificationId).update({
                    read: true
                });
            this.loadNotifications();
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    }


}