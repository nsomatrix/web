import { sanitizeInput } from './utils.js';

export class MessagingManager {
    constructor(authManager, db) {
        this.authManager = authManager;
        this.db = db;
        this.currentChatFriend = null;
        this.currentGroupChat = null;
        this.messageListener = null;
        this.typingListener = null;
        this.isTyping = false;
        this.typingTimeout = null;
        this.lastMessageCount = 0;
        this.currentMessages = [];
    }

    async openChat(friendId) {
        this.currentChatFriend = friendId;
        this.currentGroupChat = null;
        this.lastMessageCount = 0;
        document.getElementById('messagesList').innerHTML = '';
        
        // Hide create group button and manage button in private chats
        const createGroupBtn = document.getElementById('createGroupBtn');
        if (createGroupBtn) createGroupBtn.style.display = 'none';
        
        const manageGroupBtn = document.getElementById('manageGroupBtn');
        if (manageGroupBtn) manageGroupBtn.style.display = 'none';
        
        window.openModal(document.getElementById('messagesModal'));
        this.loadMessages(friendId);
    }

    async openGroupChat(groupId) {
        this.currentGroupChat = groupId;
        this.currentChatFriend = null;
        this.lastMessageCount = 0;
        document.getElementById('messagesList').innerHTML = '';
        
        // Hide create group button in group chats
        const createGroupBtn = document.getElementById('createGroupBtn');
        if (createGroupBtn) createGroupBtn.style.display = 'none';
        
        window.openModal(document.getElementById('messagesModal'));
        this.loadGroupMessages(groupId);
    }

    async loadMessages(friendId) {
        try {
            this.currentChatFriend = friendId;
            
            const friendDoc = await this.db.collection('players').doc(friendId).get();
            const friendData = friendDoc.data();
            const presenceDoc = await this.db.collection('presence').doc(friendId).get();
            const presenceData = presenceDoc.exists ? presenceDoc.data() : {};
            
            this.friendData = {
                usernameTag: friendData.usernameTag || 'Unknown',
                avatar: friendData.avatar || 'default.gif',
                isOnline: presenceData.isOnline || false
            };
            
            document.getElementById('messageModalTitle').textContent = `Chat with @${sanitizeInput(friendData.usernameTag)}`;
            
            const messageInputContainer = document.querySelector('.message-input-container');
            if (messageInputContainer) messageInputContainer.style.display = 'block';
            
            this.cleanupListeners();

            this.messageListener = this.db.collection('messages')
                .where('participants', 'array-contains', this.authManager.currentUser.uid)
                .onSnapshot({ includeMetadataChanges: false }, snapshot => {
                    const messages = [];
                    
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const participants = data.participants || [];
                        
                        if (participants.includes(friendId) && participants.includes(this.authManager.currentUser.uid) && !data.deleted && !data.groupId) {
                            messages.push({ id: doc.id, ...data });
                        }
                    });
                    
                    messages.sort((a, b) => {
                        if (!a.createdAt) return 1;
                        if (!b.createdAt) return -1;
                        return a.createdAt.toMillis() - b.createdAt.toMillis();
                    });
                    
                    this.currentMessages = messages;
                    this.renderMessages(messages);
                    this.markMessagesAsRead(snapshot, friendId);
                });
            
            this.typingListener = this.db.collection('typing').doc(`${friendId}_${this.authManager.currentUser.uid}`)
                .onSnapshot(async doc => {
                    const typingDiv = document.getElementById('typing-indicator');
                    if (doc.exists && doc.data().isTyping) {
                        let displayText = '';
                        try {
                            const userDoc = await this.db.collection('players').doc(friendId).get();
                            const username = userDoc.exists ? userDoc.data().usernameTag : 'User';
                            displayText += `@${username} is typing`;
                        } catch {
                            displayText += 'Typing';
                        }
                        
                        if (!typingDiv) {
                            const indicator = document.createElement('div');
                            indicator.id = 'typing-indicator';
                            indicator.style.cssText = 'padding:12px 16px;color:#888;font-size:14px;display:flex;align-items:center;gap:8px;';
                            indicator.innerHTML = `${displayText}<div style="display:flex;gap:2px;"><span style="width:4px;height:4px;background:#888;border-radius:50%;animation:typing 1.4s infinite ease-in-out;"></span><span style="width:4px;height:4px;background:#888;border-radius:50%;animation:typing 1.4s infinite ease-in-out 0.2s;"></span><span style="width:4px;height:4px;background:#888;border-radius:50%;animation:typing 1.4s infinite ease-in-out 0.4s;"></span></div>`;
                            
                            if (!document.getElementById('typing-animation')) {
                                const style = document.createElement('style');
                                style.id = 'typing-animation';
                                style.textContent = '@keyframes typing { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-8px); opacity: 1; } }';
                                document.head.appendChild(style);
                            }
                            
                            document.getElementById('messagesList').appendChild(indicator);
                            document.getElementById('messagesList').scrollTop = document.getElementById('messagesList').scrollHeight;
                        } else {
                            typingDiv.innerHTML = `${displayText}<div style="display:flex;gap:2px;"><span style="width:4px;height:4px;background:#888;border-radius:50%;animation:typing 1.4s infinite ease-in-out;"></span><span style="width:4px;height:4px;background:#888;border-radius:50%;animation:typing 1.4s infinite ease-in-out 0.2s;"></span><span style="width:4px;height:4px;background:#888;border-radius:50%;animation:typing 1.4s infinite ease-in-out 0.4s;"></span></div>`;
                        }
                    } else {
                        if (typingDiv) typingDiv.remove();
                    }
                });
                
        } catch (error) {
            console.error('Load messages error:', error);
        }
    }

    async loadGroupMessages(groupId) {
        try {
            const groupDoc = await this.db.collection('groupChats').doc(groupId).get();
            if (!groupDoc.exists) {
                console.error('Group not found');
                return;
            }
            
            const groupData = groupDoc.data();
            this.isGroupCreator = groupData.createdBy === this.authManager.currentUser.uid;
            document.getElementById('messageModalTitle').textContent = `${groupData.name} (${groupData.members.length})`;
            
            // Show manage button for group creators
            const manageGroupBtn = document.getElementById('manageGroupBtn');
            if (manageGroupBtn) {
                manageGroupBtn.style.display = this.isGroupCreator ? 'block' : 'none';
            }
            
            const messageInputContainer = document.querySelector('.message-input-container');
            if (messageInputContainer) messageInputContainer.style.display = 'block';
            
            this.cleanupListeners();

            this.messageListener = this.db.collection('messages')
                .where('groupId', '==', groupId)
                .where('participants', 'array-contains', this.authManager.currentUser.uid)
                .onSnapshot({ includeMetadataChanges: false }, snapshot => {
                    const messages = [];
                    
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (!data.deleted) {
                            messages.push({ id: doc.id, ...data });
                        }
                    });
                    
                    messages.sort((a, b) => {
                        if (!a.createdAt) return 1;
                        if (!b.createdAt) return -1;
                        return a.createdAt.toMillis() - b.createdAt.toMillis();
                    });
                    
                    this.currentMessages = messages;
                    this.renderGroupMessages(messages, groupData.members);
                    this.markMessagesAsRead(snapshot);
                });
            
            this.typingListener = this.db.collection('typing')
                .where(firebase.firestore.FieldPath.documentId(), '>=', `${groupId}_`)
                .where(firebase.firestore.FieldPath.documentId(), '<', `${groupId}_\uf8ff`)
                .onSnapshot(async snapshot => {
                    const typingUsers = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.isTyping && data.userId !== this.authManager.currentUser.uid) {
                            typingUsers.push(data.userId);
                        }
                    });
                    
                    const typingDiv = document.getElementById('typing-indicator');
                    if (typingUsers.length > 0) {
                        let displayText = '💬 ';
                        
                        if (typingUsers.length === 1) {
                            try {
                                const userDoc = await this.db.collection('players').doc(typingUsers[0]).get();
                                const username = userDoc.exists ? userDoc.data().usernameTag : 'Someone';
                                displayText += `@${username} is typing...`;
                            } catch {
                                displayText += 'Someone is typing...';
                            }
                        } else {
                            displayText += `${typingUsers.length} people are typing...`;
                        }
                        
                        if (!typingDiv) {
                            const indicator = document.createElement('div');
                            indicator.id = 'typing-indicator';
                            indicator.style.cssText = 'padding:12px 16px;color:#888;font-size:14px;display:flex;align-items:center;gap:8px;';
                            indicator.innerHTML = `${displayText}<div style="display:flex;gap:2px;"><span style="width:4px;height:4px;background:#888;border-radius:50%;animation:typing 1.4s infinite ease-in-out;"></span><span style="width:4px;height:4px;background:#888;border-radius:50%;animation:typing 1.4s infinite ease-in-out 0.2s;"></span><span style="width:4px;height:4px;background:#888;border-radius:50%;animation:typing 1.4s infinite ease-in-out 0.4s;"></span></div>`;
                            document.getElementById('messagesList').appendChild(indicator);
                            document.getElementById('messagesList').scrollTop = document.getElementById('messagesList').scrollHeight;
                        } else {
                            typingDiv.innerHTML = `${displayText}<div style="display:flex;gap:2px;"><span style="width:4px;height:4px;background:#888;border-radius:50%;animation:typing 1.4s infinite ease-in-out;"></span><span style="width:4px;height:4px;background:#888;border-radius:50%;animation:typing 1.4s infinite ease-in-out 0.2s;"></span><span style="width:4px;height:4px;background:#888;border-radius:50%;animation:typing 1.4s infinite ease-in-out 0.4s;"></span></div>`;
                        }
                    } else {
                        if (typingDiv) typingDiv.remove();
                    }
                });
                
        } catch (error) {
            console.error('Load group messages error:', error);
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
        this.currentMessages = [];
        this.memberDataCache = null;
    }

    renderMessages(messages) {
        const messagesList = document.getElementById('messagesList');
        const wasAtBottom = messagesList.scrollHeight - messagesList.scrollTop <= messagesList.clientHeight + 50;
        
        // Preserve typing indicator
        const typingIndicator = document.getElementById('typing-indicator');
        const typingHTML = typingIndicator ? typingIndicator.outerHTML : null;
        
        if (messages.length === 0) {
            messagesList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5; color: #666;"></i>
                    <p style="color: #ccc;">Start your conversation!</p>
                </div>
            `;
            return;
        }
        
        // Clear and rebuild - this ensures deletions are reflected immediately
        messagesList.innerHTML = '';
        
        // Render all messages
        messages.forEach((message) => {
            this.renderSingleMessage(message, messagesList);
        });
        
        // Restore typing indicator if it existed
        if (typingHTML) {
            messagesList.insertAdjacentHTML('beforeend', typingHTML);
        }
        
        // Maintain scroll position
        if (wasAtBottom) {
            requestAnimationFrame(() => {
                messagesList.scrollTop = messagesList.scrollHeight;
            });
        }
    }

    renderSingleMessage(message, container) {
        const isSent = message.senderId === this.authManager.currentUser.uid;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
        messageDiv.style.cssText = `
            display: flex;
            margin: 8px 16px;
            gap: 8px;
            ${isSent ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
        `;
        
        let timestamp = 'Now';
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
            ${!isSent && this.friendData ? `
                <div style="flex-shrink: 0;">
                    <img src="avatars/${this.friendData.avatar}" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%;">
                </div>
            ` : ''}
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
                ${!isSent && this.friendData ? `<div style="font-size: 11px; color: #e74c3c; font-weight: bold; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">@${sanitizeInput(this.friendData.usernameTag)} <span style="width: 6px; height: 6px; border-radius: 50%; background: ${this.friendData.isOnline ? '#28a745' : '#6c757d'};"></span></div>` : ''}
                ${message.replyTo ? 
                `<div style="
                    background: rgba(255,255,255,0.1);
                    border-left: 3px solid #e74c3c;
                    padding: 6px 10px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    opacity: 0.8;
                ">
                    <div style="font-style: italic;">↩️ ${sanitizeInput(message.replyText || 'Message')}</div>
                </div>` : 
                ''
            }
            <div style="font-size: 14px; line-height: 1.4;">${sanitizeInput(message.text)}</div>
                <div style="
                    font-size: 11px;
                    opacity: 0.7;
                    margin-top: 4px;
                    text-align: right;
                    color: #ccc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span>${timestamp}</span>
                    <div style="position: relative;">
                        <span class="message-menu-btn" onclick="window.messagingManager.toggleMessageMenu('${message.id}')" style="
                            cursor: pointer;
                            padding: 4px 8px;
                            border-radius: 8px;
                            font-size: 16px;
                            opacity: 0.7;
                            transition: opacity 0.2s;
                            -webkit-tap-highlight-color: transparent;
                            user-select: none;
                            touch-action: manipulation;
                        " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">⋯</span>
                        <div id="menu-${message.id}" class="message-menu" style="
                            display: none;
                            position: absolute;
                            right: 0;
                            bottom: 30px;
                            background: #2d2d2d;
                            border: 1px solid #555;
                            border-radius: 8px;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                            z-index: 1000;
                            min-width: 120px;
                        ">
                            <div onclick="window.messagingManager.replyToMessage('${message.id}', '${sanitizeInput(message.text)}')" style="
                                padding: 12px 16px;
                                cursor: pointer;
                                color: white;
                                ${isSent ? 'border-bottom: 1px solid #555;' : ''}
                                font-size: 14px;
                                -webkit-tap-highlight-color: transparent;
                                touch-action: manipulation;
                            " onmouseover="this.style.background='#3d3d3d'" onmouseout="this.style.background='transparent'">
                                ↩️ Reply
                            </div>
                            ${isSent ? 
                                `<div onclick="window.messagingManager.unsendMessage('${message.id}')" style="
                                    padding: 12px 16px;
                                    cursor: pointer;
                                    color: #e74c3c;
                                    font-size: 14px;
                                    -webkit-tap-highlight-color: transparent;
                                    touch-action: manipulation;
                                " onmouseover="this.style.background='#3d3d3d'" onmouseout="this.style.background='transparent'">
                                    🗑️ Unsend
                                </div>` : 
                                ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(messageDiv);
    }

    async renderGroupMessages(messages, members) {
        const messagesList = document.getElementById('messagesList');
        const wasAtBottom = messagesList.scrollHeight - messagesList.scrollTop <= messagesList.clientHeight + 50;
        
        // Preserve typing indicator
        const typingIndicator = document.getElementById('typing-indicator');
        const typingHTML = typingIndicator ? typingIndicator.outerHTML : null;
        
        if (messages.length === 0) {
            messagesList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5; color: #666;"></i>
                    <p style="color: #ccc;">Start the group conversation!</p>
                </div>
            `;
            return;
        }
        
        if (!this.memberDataCache) {
            this.memberDataCache = {};
            for (const memberId of members) {
                try {
                    const [memberDoc, presenceDoc] = await Promise.all([
                        this.db.collection('players').doc(memberId).get(),
                        this.db.collection('presence').doc(memberId).get()
                    ]);
                    
                    if (memberDoc.exists) {
                        const userData = memberDoc.data();
                        const presenceData = presenceDoc.exists ? presenceDoc.data() : {};
                        
                        this.memberDataCache[memberId] = {
                            usernameTag: userData.usernameTag || 'Unknown',
                            avatar: userData.avatar || 'default.gif',
                            isOnline: presenceData.isOnline || false
                        };
                    } else {
                        this.memberDataCache[memberId] = {
                            usernameTag: 'Unknown',
                            avatar: 'default.gif',
                            isOnline: false
                        };
                    }
                } catch (error) {
                    this.memberDataCache[memberId] = {
                        usernameTag: 'Unknown',
                        avatar: 'default.gif',
                        isOnline: false
                    };
                }
            }
        }
        
        // Clear and rebuild - this ensures deletions are reflected immediately
        messagesList.innerHTML = '';
        
        // Render all messages
        messages.forEach((message) => {
            this.renderSingleGroupMessage(message, messagesList, this.memberDataCache);
        });
        
        // Restore typing indicator if it existed
        if (typingHTML) {
            messagesList.insertAdjacentHTML('beforeend', typingHTML);
        }
        
        if (wasAtBottom) {
            requestAnimationFrame(() => {
                messagesList.scrollTop = messagesList.scrollHeight;
            });
        }
    }

    renderSingleGroupMessage(message, container, memberData) {
        const isSent = message.senderId === this.authManager.currentUser.uid;
        const senderData = memberData[message.senderId] || { usernameTag: 'Unknown', avatar: 'default.gif', isOnline: false };
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
        messageDiv.style.cssText = `
            display: flex;
            margin: 8px 16px;
            gap: 8px;
            ${isSent ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
        `;
        
        let timestamp = 'Now';
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
            ${!isSent ? `
                <div style="flex-shrink: 0;">
                    <img src="avatars/${senderData.avatar}" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%;">
                </div>
            ` : ''}
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
                ${!isSent ? `<div style="font-size: 11px; color: #e74c3c; font-weight: bold; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">@${sanitizeInput(senderData.usernameTag)} <span style="width: 6px; height: 6px; border-radius: 50%; background: ${senderData.isOnline ? '#28a745' : '#6c757d'};"></span></div>` : ''}
                ${message.replyTo ? 
                `<div style="
                    background: rgba(255,255,255,0.1);
                    border-left: 3px solid #e74c3c;
                    padding: 6px 10px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    opacity: 0.8;
                ">
                    <div style="font-style: italic;">↩️ ${sanitizeInput(message.replyText || 'Message')}</div>
                </div>` : 
                ''
            }
            <div style="font-size: 14px; line-height: 1.4;">${sanitizeInput(message.text)}</div>
                <div style="
                    font-size: 11px;
                    opacity: 0.7;
                    margin-top: 4px;
                    text-align: right;
                    color: #ccc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span>${timestamp}</span>
                    <div style="position: relative;">
                        <span class="message-menu-btn" onclick="window.messagingManager.toggleMessageMenu('${message.id}')" style="
                            cursor: pointer;
                            padding: 4px 8px;
                            border-radius: 8px;
                            font-size: 16px;
                            opacity: 0.7;
                            transition: opacity 0.2s;
                            -webkit-tap-highlight-color: transparent;
                            user-select: none;
                            touch-action: manipulation;
                        " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">⋯</span>
                        <div id="menu-${message.id}" class="message-menu" style="
                            display: none;
                            position: absolute;
                            right: 0;
                            bottom: 30px;
                            background: #2d2d2d;
                            border: 1px solid #555;
                            border-radius: 8px;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                            z-index: 1000;
                            min-width: 120px;
                        ">
                            <div onclick="window.messagingManager.replyToMessage('${message.id}', '${sanitizeInput(message.text)}')" style="
                                padding: 12px 16px;
                                cursor: pointer;
                                color: white;
                                ${isSent ? 'border-bottom: 1px solid #555;' : ''}
                                font-size: 14px;
                                -webkit-tap-highlight-color: transparent;
                                touch-action: manipulation;
                            " onmouseover="this.style.background='#3d3d3d'" onmouseout="this.style.background='transparent'">
                                ↩️ Reply
                            </div>
                            ${isSent ? 
                                `<div onclick="window.messagingManager.unsendMessage('${message.id}')" style="
                                    padding: 12px 16px;
                                    cursor: pointer;
                                    color: #e74c3c;
                                    font-size: 14px;
                                    -webkit-tap-highlight-color: transparent;
                                    touch-action: manipulation;
                                " onmouseover="this.style.background='#3d3d3d'" onmouseout="this.style.background='transparent'">
                                    🗑️ Unsend
                                </div>` : 
                                ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
        

        
        container.appendChild(messageDiv);
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
        
        if (!messageText || (!this.currentChatFriend && !this.currentGroupChat) || messageInput.disabled) return;
        
        if (messageText.length > 1000) {
            window.showMessageBox('Message too long (max 1000 characters)', 'error', 3000);
            return;
        }
        
        const isReply = messageInput.dataset.replyTo;
        const replyData = isReply ? {
            replyTo: messageInput.dataset.replyTo,
            replyText: messageInput.dataset.replyText
        } : {};
        
        messageInput.value = '';
        if (isReply) this.cancelReply();
        
        if (this.isTyping) {
            this.isTyping = false;
            clearTimeout(this.typingTimeout);
            const docId = this.currentChatFriend ? 
                `${this.authManager.currentUser.uid}_${this.currentChatFriend}` :
                `${this.currentGroupChat}_${this.authManager.currentUser.uid}`;
            this.db.collection('typing').doc(docId).delete().catch(console.error);
        }
        
        try {
            let messageData;
            
            if (this.currentGroupChat) {
                const groupDoc = await this.db.collection('groupChats').doc(this.currentGroupChat).get();
                const groupData = groupDoc.data();
                
                messageData = {
                    text: messageText,
                    senderId: this.authManager.currentUser.uid,
                    participants: groupData.members,
                    groupId: this.currentGroupChat,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    readBy: [this.authManager.currentUser.uid],
                    ...replyData
                };
            } else {
                messageData = {
                    text: messageText,
                    senderId: this.authManager.currentUser.uid,
                    participants: [this.authManager.currentUser.uid, this.currentChatFriend],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    readBy: [this.authManager.currentUser.uid],
                    ...replyData
                };
            }
            
            await this.db.collection('messages').add(messageData);
            
        } catch (error) {
            console.error('Send message error:', error);
            messageInput.value = messageText;
            window.showMessageBox('Failed to send message', 'error', 2000);
        }
        
        messageInput.focus();
    }

    handleTyping(messageInput) {
        const chatId = this.currentChatFriend || this.currentGroupChat;
        if (chatId && messageInput.value.trim()) {
            if (!this.isTyping) {
                this.isTyping = true;
                const expireAt = new Date(Date.now() + 10000);
                const docId = this.currentChatFriend ? 
                    `${this.authManager.currentUser.uid}_${this.currentChatFriend}` :
                    `${this.currentGroupChat}_${this.authManager.currentUser.uid}`;
                
                this.db.collection('typing').doc(docId).set({
                    isTyping: true,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    expireAt: expireAt,
                    userId: this.authManager.currentUser.uid,
                    chatType: this.currentChatFriend ? 'direct' : 'group'
                }).catch(console.error);
            }
            
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.isTyping = false;
                const docId = this.currentChatFriend ? 
                    `${this.authManager.currentUser.uid}_${this.currentChatFriend}` :
                    `${this.currentGroupChat}_${this.authManager.currentUser.uid}`;
                this.db.collection('typing').doc(docId).delete().catch(console.error);
            }, 1500);
        } else if (this.isTyping) {
            this.isTyping = false;
            clearTimeout(this.typingTimeout);
            const docId = this.currentChatFriend ? 
                `${this.authManager.currentUser.uid}_${this.currentChatFriend}` :
                `${this.currentGroupChat}_${this.authManager.currentUser.uid}`;
            this.db.collection('typing').doc(docId).delete().catch(console.error);
        }
    }

    stopTyping() {
        if (this.isTyping) {
            this.isTyping = false;
            clearTimeout(this.typingTimeout);
            const docId = this.currentChatFriend ? 
                `${this.authManager.currentUser.uid}_${this.currentChatFriend}` :
                `${this.currentGroupChat}_${this.authManager.currentUser.uid}`;
            this.db.collection('typing').doc(docId).delete().catch(console.error);
        }
    }

    toggleMessageMenu(messageId) {
        document.querySelectorAll('.message-menu').forEach(menu => {
            if (menu.id !== `menu-${messageId}`) {
                menu.style.display = 'none';
            }
        });
        
        const menu = document.getElementById(`menu-${messageId}`);
        if (menu) {
            const isVisible = menu.style.display === 'block';
            menu.style.display = isVisible ? 'none' : 'block';
        }
    }

    replyToMessage(messageId, messageText) {
        const messageInput = document.getElementById('messageInput');
        const replyPreview = document.createElement('div');
        
        document.getElementById(`menu-${messageId}`).style.display = 'none';
        
        replyPreview.id = 'reply-preview';
        replyPreview.style.cssText = `
            background: #3d3d3d;
            border-left: 3px solid #e74c3c;
            padding: 8px 12px;
            margin-bottom: 8px;
            border-radius: 4px;
            font-size: 12px;
            color: #ccc;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        replyPreview.innerHTML = `
            <div>
                <div style="color: #e74c3c; font-weight: bold;">Replying to:</div>
                <div style="opacity: 0.8;">${messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText}</div>
            </div>
            <span onclick="window.messagingManager.cancelReply()" style="cursor: pointer; color: #999; font-size: 16px;">&times;</span>
        `;
        
        const inputContainer = messageInput.parentElement;
        const existingPreview = document.getElementById('reply-preview');
        if (existingPreview) existingPreview.remove();
        
        inputContainer.insertBefore(replyPreview, inputContainer.firstChild);
        messageInput.focus();
        
        messageInput.dataset.replyTo = messageId;
        messageInput.dataset.replyText = messageText;
    }

    cancelReply() {
        const replyPreview = document.getElementById('reply-preview');
        const messageInput = document.getElementById('messageInput');
        
        if (replyPreview) replyPreview.remove();
        delete messageInput.dataset.replyTo;
        delete messageInput.dataset.replyText;
    }

    async unsendMessage(messageId) {
        try {
            // Hide the menu immediately
            const menu = document.getElementById(`menu-${messageId}`);
            if (menu) menu.style.display = 'none';
            
            // Delete from database - the onSnapshot listener will handle UI updates automatically
            await this.db.collection('messages').doc(messageId).delete();
            
            window.showMessageBox('Message deleted', 'success', 2000);
            
        } catch (error) {
            console.error('Error deleting message:', error);
            window.showMessageBox('Failed to delete message', 'error', 2000);
        }
    }

    async deleteGroup() {
        if (!this.currentGroupChat || !this.isGroupCreator) return;
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div style="background:#1a1a1a;color:white;padding:30px;border-radius:10px;max-width:400px;text-align:center;border:1px solid #333;">
                <h3 style="color:#e74c3c;margin-bottom:20px;">⚠️ Delete Group</h3>
                <p style="margin-bottom:20px;color:#ccc;">Delete this group? This cannot be undone.</p>
                <div style="display:flex;gap:10px;justify-content:center;">
                    <button id="confirmDelete" style="background:#e74c3c;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;">Delete</button>
                    <button id="cancelDelete" style="background:#6c757d;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('confirmDelete').onclick = async () => {
            try {
                await this.db.collection('groupChats').doc(this.currentGroupChat).delete();
                
                // Close both management modal and messages modal
                window.closeModal(document.getElementById('manageGroupModal'));
                document.getElementById('messagesModal').style.display = 'none';
                
                window.showMessageBox('Group deleted', 'success', 2000);
            } catch (error) {
                console.error('Delete group error:', error);
                window.showMessageBox('Failed to delete group', 'error', 2000);
            }
            modal.remove();
        };
        
        document.getElementById('cancelDelete').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    async createGroupChat(name, memberIds) {
        try {
            const groupData = {
                name: name,
                members: [this.authManager.currentUser.uid, ...memberIds],
                createdBy: this.authManager.currentUser.uid,
                admins: [this.authManager.currentUser.uid],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const groupRef = await this.db.collection('groupChats').add(groupData);
            return groupRef.id;
        } catch (error) {
            console.error('Create group chat error:', error);
            throw error;
        }
    }

    // Group Management Functions
    async openGroupManagement() {
        if (!this.currentGroupChat || !this.isGroupCreator) {
            window.showMessageBox('Only group creators can manage groups', 'error', 3000);
            return;
        }

        try {
            const groupDoc = await this.db.collection('groupChats').doc(this.currentGroupChat).get();
            if (!groupDoc.exists) {
                window.showMessageBox('Group not found', 'error', 3000);
                return;
            }

            const groupData = groupDoc.data();
            
            // Set group name in input
            document.getElementById('editGroupNameInput').value = groupData.name;
            document.getElementById('manageGroupTitle').textContent = `Manage "${groupData.name}"`;
            
            // Load current members
            await this.loadCurrentMembers(groupData.members);
            
            // Load available friends to add
            await this.loadAvailableFriends(groupData.members);
            
            window.openModal(document.getElementById('manageGroupModal'));
            
        } catch (error) {
            console.error('Error opening group management:', error);
            window.showMessageBox('Failed to load group management', 'error', 3000);
        }
    }

    async loadCurrentMembers(memberIds) {
        const membersList = document.getElementById('currentMembersList');
        const memberCount = document.getElementById('memberCount');
        
        memberCount.textContent = memberIds.length;
        membersList.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Loading members...</div>';

        try {
            const members = [];
            for (const memberId of memberIds) {
                const memberDoc = await this.db.collection('players').doc(memberId).get();
                if (memberDoc.exists) {
                    const memberData = memberDoc.data();
                    members.push({
                        id: memberId,
                        username: memberData.usernameTag || 'Unknown',
                        avatar: memberData.avatar || 'default.gif'
                    });
                }
            }

            if (members.length === 0) {
                membersList.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No members found</div>';
                return;
            }

            membersList.innerHTML = members.map(member => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-bottom: 1px solid #444; background: #3d3d3d; margin-bottom: 2px; border-radius: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                        <img src="avatars/${member.avatar}" alt="Avatar" style="width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;">
                        <div style="min-width: 0; flex: 1;">
                            <div style="color: white; font-weight: bold; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">@${member.username}</div>
                            ${member.id === this.authManager.currentUser.uid ? '<div style="color: #e74c3c; font-size: 10px;">Creator</div>' : ''}
                        </div>
                    </div>
                    ${member.id !== this.authManager.currentUser.uid ? 
                        `<button onclick="window.messagingManager.removeMember('${member.id}', '${member.username}')" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 10px; flex-shrink: 0;">
                            Remove
                        </button>` : 
                        ''
                    }
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading members:', error);
            membersList.innerHTML = '<div style="color: #e74c3c; text-align: center; padding: 20px;">Failed to load members</div>';
        }
    }

    async loadAvailableFriends(currentMemberIds) {
        const friendsList = document.getElementById('availableFriendsList');
        friendsList.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Loading friends...</div>';

        try {
            // Get user's friends
            const friendsSnapshot = await this.db.collection('players')
                .doc(this.authManager.currentUser.uid)
                .collection('friends')
                .get();

            const availableFriends = [];
            
            for (const doc of friendsSnapshot.docs) {
                const friendId = doc.id;
                
                // Skip if already in group
                if (currentMemberIds.includes(friendId)) continue;
                
                const friendDoc = await this.db.collection('players').doc(friendId).get();
                if (friendDoc.exists) {
                    const friendData = friendDoc.data();
                    availableFriends.push({
                        id: friendId,
                        username: friendData.usernameTag || 'Unknown',
                        avatar: friendData.avatar || 'default.gif'
                    });
                }
            }

            if (availableFriends.length === 0) {
                friendsList.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No friends available to add</div>';
                return;
            }

            friendsList.innerHTML = availableFriends.map(friend => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-bottom: 1px solid #444; background: #3d3d3d; margin-bottom: 2px; border-radius: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                        <img src="avatars/${friend.avatar}" alt="Avatar" style="width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;">
                        <div style="color: white; font-weight: bold; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">@${friend.username}</div>
                    </div>
                    <button onclick="window.messagingManager.addMember('${friend.id}', '${friend.username}')" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 10px; flex-shrink: 0;">
                        Add
                    </button>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading available friends:', error);
            friendsList.innerHTML = '<div style="color: #e74c3c; text-align: center; padding: 20px;">Failed to load friends</div>';
        }
    }

    async addMember(friendId, friendUsername) {
        if (!this.currentGroupChat || !this.isGroupCreator) return;

        try {
            const groupRef = this.db.collection('groupChats').doc(this.currentGroupChat);
            
            await groupRef.update({
                members: firebase.firestore.FieldValue.arrayUnion(friendId)
            });

            window.showMessageBox(`Added @${friendUsername} to the group`, 'success', 3000);
            
            // Refresh the management UI
            const groupDoc = await groupRef.get();
            const groupData = groupDoc.data();
            await this.loadCurrentMembers(groupData.members);
            await this.loadAvailableFriends(groupData.members);
            
            // Update the group title in messages modal
            document.getElementById('messageModalTitle').textContent = `${groupData.name} (${groupData.members.length})`;

        } catch (error) {
            console.error('Error adding member:', error);
            window.showMessageBox('Failed to add member', 'error', 3000);
        }
    }

    async removeMember(memberId, memberUsername) {
        if (!this.currentGroupChat || !this.isGroupCreator) return;

        const confirmed = confirm(`Remove @${memberUsername} from the group?`);
        if (!confirmed) return;

        try {
            const groupRef = this.db.collection('groupChats').doc(this.currentGroupChat);
            
            await groupRef.update({
                members: firebase.firestore.FieldValue.arrayRemove(memberId)
            });

            window.showMessageBox(`Removed @${memberUsername} from the group`, 'success', 3000);
            
            // Refresh the management UI
            const groupDoc = await groupRef.get();
            const groupData = groupDoc.data();
            await this.loadCurrentMembers(groupData.members);
            await this.loadAvailableFriends(groupData.members);
            
            // Update the group title in messages modal
            document.getElementById('messageModalTitle').textContent = `${groupData.name} (${groupData.members.length})`;

        } catch (error) {
            console.error('Error removing member:', error);
            window.showMessageBox('Failed to remove member', 'error', 3000);
        }
    }

    async updateGroupName() {
        if (!this.currentGroupChat || !this.isGroupCreator) return;

        const newName = document.getElementById('editGroupNameInput').value.trim();
        if (!newName) {
            window.showMessageBox('Group name cannot be empty', 'error', 3000);
            return;
        }

        if (newName.length > 50) {
            window.showMessageBox('Group name too long (max 50 characters)', 'error', 3000);
            return;
        }

        try {
            await this.db.collection('groupChats').doc(this.currentGroupChat).update({
                name: newName
            });

            window.showMessageBox('Group name updated', 'success', 3000);
            
            // Update UI
            document.getElementById('messageModalTitle').textContent = `${newName} (${document.getElementById('memberCount').textContent})`;
            document.getElementById('manageGroupTitle').textContent = `Manage "${newName}"`;

        } catch (error) {
            console.error('Error updating group name:', error);
            window.showMessageBox('Failed to update group name', 'error', 3000);
        }
    }

    async deleteGroupFromManagement() {
        if (!this.currentGroupChat || !this.isGroupCreator) return;

        const confirmed = confirm('Are you sure you want to delete this group? This action cannot be undone and will remove all messages.');
        if (!confirmed) return;

        try {
            await this.db.collection('groupChats').doc(this.currentGroupChat).delete();
            
            // Close both management modal and messages modal
            window.closeModal(document.getElementById('manageGroupModal'));
            document.getElementById('messagesModal').style.display = 'none';
            
            window.showMessageBox('Group deleted successfully', 'success', 3000);
            
        } catch (error) {
            console.error('Error deleting group:', error);
            window.showMessageBox('Failed to delete group', 'error', 3000);
        }
    }}
