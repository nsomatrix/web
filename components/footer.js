// Support modal functionality
document.addEventListener('DOMContentLoaded', function() {
    const supportBtn = document.getElementById('supportBtn');
    const supportModal = document.getElementById('supportModal');
    const closeBtn = document.querySelector('.close');
    const supportForm = document.getElementById('supportForm');

    // Open modal
    supportBtn.onclick = function() {
        supportModal.style.display = 'block';
    }

    // Close modal
    closeBtn.onclick = function() {
        supportModal.style.display = 'none';
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target == supportModal) {
            supportModal.style.display = 'none';
        }
    }

    // Handle form submission
    supportForm.onsubmit = async function(e) {
        e.preventDefault();
        
        const userEmail = document.getElementById('userEmail').value;
        const message = document.getElementById('message').value;
        
        try {
            const response = await fetch('https://emailjs-proxy.mackruize.workers.dev/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: 'nsomatrix@yahoo.com',
                    code: `Support Request from: ${userEmail}\n\nMessage: ${message}`
                })
            });

            if (response.ok) {
                alert('Message sent successfully!');
                supportForm.reset();
                supportModal.style.display = 'none';
            } else {
                alert('Failed to send message. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to send message. Please try again.');
        }
    }
});