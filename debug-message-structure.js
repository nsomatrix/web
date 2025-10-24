// Debug script to check message structure
// Run this in browser console to see actual message data

async function debugMessageStructure() {
    if (!window.messagingManager || !window.messagingManager.currentMessages) {
        console.log('No messages loaded');
        return;
    }

    const messages = window.messagingManager.currentMessages;
    if (messages.length === 0) {
        console.log('No messages in current chat');
        return;
    }

    // Get the latest message
    const latestMessage = messages[messages.length - 1];
    console.log('Latest message structure:', latestMessage);

    // Check if it has senderId
    console.log('Has senderId:', !!latestMessage.senderId);
    console.log('SenderId value:', latestMessage.senderId);

    // Check if it has participants
    console.log('Has participants:', !!latestMessage.participants);
    console.log('Participants:', latestMessage.participants);

    // Check current user - try multiple ways to get it
    const currentUser1 = window.PushManager?.currentUser?.uid;
    const currentUser2 = firebase?.auth()?.currentUser?.uid;
    const currentUser3 = window.firebaseAuth?.currentUser?.uid;

    console.log('Current user (authManager):', currentUser1);
    console.log('Current user (firebase.auth):', currentUser2);
    console.log('Current user (firebaseAuth):', currentUser3);

    const currentUserId = currentUser1 || currentUser2 || currentUser3;
    console.log('Final current user UID:', currentUserId);

    // Test if current user is sender
    console.log('Is current user sender:', latestMessage.senderId === currentUserId);

    // Test Firebase rules manually - try multiple DB references
    try {
        let db = window.firebaseDb || firebase.firestore() || window.db;
        console.log('Using database reference:', !!db);

        if (!db) {
            console.error('No database reference found');
            return;
        }

        const messageRef = db.collection('messages').doc(latestMessage.id);
        const messageDoc = await messageRef.get();
        console.log('Message exists in DB:', messageDoc.exists);
        console.log('Message data from DB:', messageDoc.data());

        // Try to delete
        console.log('Attempting delete...');
        await messageRef.delete();
        console.log('Delete successful!');
    } catch (error) {
        console.error('Delete failed:', error);
        console.log('Error code:', error.code);
        console.log('Error message:', error.message);
    }
}

// Run the debug
debugMessageStructure();