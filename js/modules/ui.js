export function showMessageBox(messageText, type = 'info', duration = 3000) {
    const customMessageBox = document.getElementById('customMessageBox');
    const messageBoxText = document.getElementById('messageBoxText');
    
    messageBoxText.innerText = messageText;
    customMessageBox.style.display = 'block';

    customMessageBox.style.backgroundColor = '#333';
    customMessageBox.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
    if (type === 'error') {
        customMessageBox.style.backgroundColor = '#ef4444';
        customMessageBox.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
    } else if (type === 'success') {
        customMessageBox.style.backgroundColor = '#22c55e';
        customMessageBox.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
    } else if (type === 'warning') {
        customMessageBox.style.backgroundColor = '#f59e0b';
        customMessageBox.style.boxShadow = '0 0 10px rgba(255, 255, 0, 0.5)';
    }

    setTimeout(() => {
        customMessageBox.style.display = 'none';
    }, duration);
}

export function openModal(modalElement) {
    modalElement.style.display = 'flex';
}

export function closeModal(modalElement) {
    modalElement.style.display = 'none';
}