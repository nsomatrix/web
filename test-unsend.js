// Test unsend functionality - copy and paste this into browser console
// Make sure you have messages loaded first

async function testUnsend() {
    console.log('🧪 Testing unsend functionality...');
    
    if (!window.messagingManager || !window.messagingManager.currentMessages) {
        console.log('❌ No messages loaded. Open a chat first.');
        return;
    }
    
    const messages = window.messagingManager.currentMessages;
    const currentUserId = window.authManager?.currentUser?.uid;
    
    console.log('Current user UID:', currentUserId);
    console.log('Total messages:', messages.length);
    
    // Find messages sent by current user
    const myMessages = messages.filter(msg => msg.senderId === currentUserId);
    console.log('Messages sent by you:', myMessages.length);
    
    if (myMessages.length === 0) {
        console.log('❌ No messages sent by you found. Send a message first, then try again.');
        return;
    }
    
    // Get the latest message sent by current user
    const myLatestMessage = myMessages[myMessages.length - 1];
    console.log('✅ Found your message:', {
        id: myLatestMessage.id,
        text: myLatestMessage.text,
        senderId: myLatestMessage.senderId
    });
    
    // Test the actual unsendMessage function
    try {
        console.log('🔄 Calling unsendMessage function...');
        await window.messagingManager.unsendMessage(myLatestMessage.id);
        console.log('✅ SUCCESS! Message unsent successfully.');
    } catch (error) {
        console.error('❌ FAILED! Error:', error);
        console.log('Error code:', error.code);
        console.log('Error message:', error.message);
        
        if (error.code === 'permission-denied') {
            console.log('🔍 This is a Firebase rules issue. Make sure you deployed the updated rules.');
        }
    }
}

// Run the test
testUnsend();