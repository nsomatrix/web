// Support functionality - loads after footer HTML
document.addEventListener('DOMContentLoaded', function() {
    // Wait for footer to be loaded
    const checkFooter = setInterval(() => {
        const supportBtn = document.getElementById('supportBtn');
        if (supportBtn) {
            clearInterval(checkFooter);
            initializeSupport();
        }
    }, 100);
});

function initializeSupport() {
    // Initialize custom select
    initCustomSelect();
    
    // Support button click
    document.getElementById('supportBtn').onclick = function() {
        document.getElementById('supportModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    };
    
    // Submit support function
    window.submitSupport = function() {
        const form = document.getElementById('supportForm');
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const category = document.getElementById('category').value;
        const message = document.getElementById('message').value.trim();

        const btn = document.getElementById('submitBtn');
        
        if (!name || !email || !category || !message) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        btn.disabled = true;
        
        const ticketId = 'MTX-' + Date.now().toString(36).toUpperCase();
        
        fetch('https://support-proxy.nsomtx.workers.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: name, 
                email: email,
                category: category,
                message: message,
                ticketId: ticketId
            })
        }).then(r => {
            if (r.ok) {
                showSuccessModal(ticketId);
                form.reset();
            } else throw new Error();
        }).catch(() => {
            showNotification('Failed to send message. Please try again.', 'error');
        }).finally(() => {
            btn.innerHTML = 'Send Message';
            btn.disabled = false;
        });
    };
    
    // Close modal functions
    const closeButtons = document.querySelectorAll('.close, .btn-secondary');
    closeButtons.forEach(btn => {
        btn.onclick = function() {
            document.getElementById('supportModal').style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    });
    
    // Escape key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('supportModal').style.display === 'block') {
            document.getElementById('supportModal').style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // Custom notification system
    window.showNotification = function(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    };
    
    // Custom success modal
    window.showSuccessModal = function(ticketId) {
        document.getElementById('supportModal').style.display = 'none';
        const successModal = document.createElement('div');
        successModal.className = 'support-modal';
        successModal.style.display = 'block';
        successModal.innerHTML = `
            <div class="modal-content success-modal">
                <div class="success-icon"><i class="fas fa-check-circle"></i></div>
                <h3>Message Sent Successfully!</h3>
                <p>Thank you for contacting us. Your ticket ID is:</p>
                <div class="ticket-id">${ticketId}</div>
                <p>We'll respond to your email within 24 hours.</p>
                <button class="btn-primary" onclick="this.parentElement.parentElement.remove();document.body.style.overflow='auto'">Close</button>
            </div>
        `;
        document.body.appendChild(successModal);
    };
    

}

function initCustomSelect() {
    const select = document.getElementById('category');
    const selectContainer = select.parentNode;
    
    // Create custom select elements
    const selectSelected = document.createElement('div');
    selectSelected.className = 'select-selected';
    selectSelected.innerHTML = 'Select a category';
    selectContainer.appendChild(selectSelected);
    
    const selectItems = document.createElement('div');
    selectItems.className = 'select-items select-hide';
    
    // Add options
    for (let i = 1; i < select.length; i++) {
        const option = document.createElement('div');
        option.innerHTML = select.options[i].innerHTML;
        option.addEventListener('click', function() {
            select.selectedIndex = i;
            selectSelected.innerHTML = this.innerHTML;
            selectSelected.click();
        });
        selectItems.appendChild(option);
    }
    selectContainer.appendChild(selectItems);
    
    // Toggle dropdown
    selectSelected.addEventListener('click', function(e) {
        e.stopPropagation();
        closeAllSelect(this);
        this.nextSibling.classList.toggle('select-hide');
        this.classList.toggle('select-arrow-active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', closeAllSelect);
}

function closeAllSelect(elmnt) {
    const selectItems = document.getElementsByClassName('select-items');
    const selectSelected = document.getElementsByClassName('select-selected');
    
    for (let i = 0; i < selectSelected.length; i++) {
        if (elmnt != selectSelected[i]) {
            selectSelected[i].classList.remove('select-arrow-active');
        }
    }
    
    for (let i = 0; i < selectItems.length; i++) {
        if (elmnt != selectSelected[i]) {
            selectItems[i].classList.add('select-hide');
        }
    }
}