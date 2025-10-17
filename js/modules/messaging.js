export class MessagingManager {
    constructor(authManager, db) {
        this.authManager = authManager;
        this.db = db;
        this.currentChatFriend = null;
        this.messageListener = null;
        this.typingListener = null;
        this.isTyping = false;
        this.typingTimeout = null;
    }

    async openChat(friendId) {
        this.currentChatFriend = friendId;
        window.openModal(document.getElementById('messagesModal'));
        this.loadMessages(friendId);
    }

    async loadMessages(friendId) {
        try {
            this.currentChatFriend = friendId;
            
            const friendDoc = await this.db.collection('players').doc(friendId).get();
            const friendData = friendDoc.data();
            document.getElementById('messageModalTitle').textContent = `Chat with @${this.sanitizeInput(friendData.usernameTag)}`;
            
            const messageInputContainer = document.querySelector('.message-input-container');
            if (messageInputContainer) messageInputContainer.style.display = 'block';
            
            this.cleanupListeners();
            
            this.messageListener = this.db.collection('messages')
                .where('participants', 'array-contains', this.authManager.currentUser.uid)
                .onSnapshot(snapshot => {
                    const messages = [];
                    
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const participants = data.participants || [];
                        
                        if (participants.includes(friendId) && participants.includes(this.authManager.currentUser.uid) && !data.deleted) {
                            messages.push({ id: doc.id, ...data });
                        }
                    });
                    
                    messages.sort((a, b) => {
                        if (!a.createdAt) return 1;
                        if (!b.createdAt) return -1;
                        return a.createdAt.toMillis() - b.createdAt.toMillis();
                    });
                    
                    this.renderMessages(messages);
                    this.markMessagesAsRead(snapshot, friendId);
                });
            
            this.typingListener = this.db.collection('typing').doc(`${friendId}_${this.authManager.currentUser.uid}`)
                .onSnapshot(doc => {
                    const typingDiv = document.getElementById('typing-indicator');
                    if (doc.exists && doc.data().isTyping) {
                        if (!typingDiv) {
                            const indicator = document.createElement('div');
                            indicator.id = 'typing-indicator';
                            indicator.style.cssText = 'padding:8px 16px;color:#888;font-style:italic;font-size:14px;animation:pulse 1.5s infinite;';
                            indicator.innerHTML = '💬 Typing...';
                            document.getElementById('messagesList').appendChild(indicator);
                            document.getElementById('messagesList').scrollTop = document.getElementById('messagesList').scrollHeight;
                        }
                    } else {
                        if (typingDiv) typingDiv.remove();
                    }
                });
                
        } catch (error) {
            console.error('Load messages error:', error);
        }
    }

    cleanupListeners() {
        if (this.messageListener) {
            this.messageListener();
            this.messageListener = null;
        }
        if (this.typingListener) {
            this.typingListener();
            this.typingListener = null;
        }
    }

    renderMessages(messages) {
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';
        
        if (messages.length === 0) {
            messagesList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5; color: #666;"></i>
                    <p style="color: #ccc;">Start your conversation!</p>
                </div>
            `;
            return;
        }
        
        messages.forEach((message) => {
            const isSent = message.senderId === this.authManager.currentUser.uid;
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
            messageDiv.style.cssText = `
                display: flex;
                margin: 8px 16px;
                ${isSent ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
            `;
            
            let timestamp = 'Sending...';
            if (message.createdAt) {
                const date = message.createdAt.toDate();
                const today = new Date();
                const isToday = date.toDateString() === today.toDateString();
                
                if (isToday) {
                    timestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                    timestamp = date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                               date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            }
            
            messageDiv.innerHTML = `
                <div style="
                    max-width: 70%;
                    background: ${isSent ? '#e74c3c' : '#3d3d3d'};
                    color: white;
                    padding: 12px 16px;
                    border-radius: 18px;
                    ${isSent ? 'border-bottom-right-radius: 4px;' : 'border-bottom-left-radius: 4px;'}
                    word-wrap: break-word;
                    position: relative;
                    border: 1px solid ${isSent ? '#c0392b' : '#555'};
                ">
                    <div style="font-size: 14px; line-height: 1.4;">${this.sanitizeInput(message.text)}</div>
                    <div style="
                        font-size: 11px;
                        opacity: 0.7;
                        margin-top: 4px;
                        text-align: right;
                        color: #ccc;
                    ">
                        ${timestamp}
                    </div>
                </div>
            `;
            
            messagesList.appendChild(messageDiv);
        });
        
        requestAnimationFrame(() => {
            messagesList.scrollTop = messagesList.scrollHeight;
        });
    }

    markMessagesAsRead(snapshot, friendId) {
        const batch = this.db.batch();
        let hasUnread = false;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.senderId !== this.authManager.currentUser.uid && 
                (!data.readBy || !data.readBy.includes(this.authManager.currentUser.uid))) {
                batch.update(doc.ref, {
                    readBy: firebase.firestore.FieldValue.arrayUnion(this.authManager.currentUser.uid)
                });
                hasUnread = true;
            }
        });
        
        if (hasUnread) {
            batch.commit().catch(console.error);
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const messageText = messageInput.value.trim();
        
        if (!messageText || !this.currentChatFriend) return;
        
        if (messageText.length > 1000) {
            window.showMessageBox('Message too long (max 1000 characters)', 'error', 3000);
            return;
        }
        
        messageInput.value = '';
        messageInput.disabled = true;
        
        if (this.isTyping) {
            this.isTyping = false;
            clearTimeout(this.typingTimeout);
            this.db.collection('typing').doc(`${this.authManager.currentUser.uid}_${this.currentChatFriend}`).delete().catch(console.error);
        }
        
        try {
            const messageData = {
                text: messageText,
                senderId: this.authManager.currentUser.uid,
                participants: [this.authManager.currentUser.uid, this.currentChatFriend],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                readBy: [this.authManager.currentUser.uid]
            };
            
            await this.db.collection('messages').add(messageData);
            
        } catch (error) {
            console.error('Send message error:', error);
            window.showMessageBox('Failed to send message', 'error', 2000);
            messageInput.value = messageText;
        } finally {
            messageInput.disabled = false;
            messageInput.focus();
        }
    }

    handleTyping(messageInput) {
        if (this.currentChatFriend && messageInput.value.trim()) {
            if (!this.isTyping) {
                this.isTyping = true;
                const expireAt = new Date(Date.now() + 10000);
                this.db.collection('typing').doc(`${this.authManager.currentUser.uid}_${this.currentChatFriend}`).set({
                    isTyping: true,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    expireAt: expireAt
                }).catch(console.error);
            }
            
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.isTyping = false;
                this.db.collection('typing').doc(`${this.authManager.currentUser.uid}_${this.currentChatFriend}`).delete().catch(console.error);
            }, 1500);
        } else if (this.isTyping) {
            this.isTyping = false;
            clearTimeout(this.typingTimeout);
            this.db.collection('typing').doc(`${this.authManager.currentUser.uid}_${this.currentChatFriend}`).delete().catch(console.error);
        }
    }

    stopTyping() {
        if (this.isTyping && this.currentChatFriend) {
            this.isTyping = false;
            clearTimeout(this.typingTimeout);
            this.db.collection('typing').doc(`${this.authManager.currentUser.uid}_${this.currentChatFriend}`).delete().catch(console.error);
        }
    }

    sanitizeInput(input) {
        if (!input) return '';
        return input.replace(/[<>"'&]/g, function(match) {
            return {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            }[match];
        });
    }
}