// essentials.js
$(function () {
    // Load the navbar dynamically
    $('#navbar-placeholder').load('assets/navbar.html', function() {
        // Load navbar functionality after navbar is loaded
        $.getScript('js/navbar.js');
        // Load navbar authentication functionality
        $.getScript('js/navbar-auth.js');
    });

    // Load the footer dynamically
    $('#footer-placeholder').load('assets/footer.html');
});
