// Navbar functionality
$(document).ready(function() {
    // Set active page based on current URL
    setActivePage();
    
    
    // Smooth scrolling for anchor links
    initSmoothScrolling();
    
    // Close mobile menu when clicking outside
    initMobileMenuClose();
});

function setActivePage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Remove active class from all nav items
    $('.navbar-nav > li').removeClass('active');
    
    // Add active class to current page
    $('.navbar-nav > li > a[href*="' + currentPage + '"]').parent().addClass('active');
    
    // Special handling for dropdown items
    if (currentPage === 'emulators.html' || currentPage === 'mods.html' || currentPage === 'docs.html') {
        $('.navbar-nav > li.dropdown:first').addClass('active');
    } else if (currentPage === 'gallery.html' || currentPage === 'library.html' || currentPage === 'archives.html') {
        $('.navbar-nav > li.dropdown:last').addClass('active');
    }
}


function initSmoothScrolling() {
    $('a[href^="#"]').click(function(e) {
        e.preventDefault();
        const target = $(this.getAttribute('href'));
        if (target.length) {
            $('html, body').animate({
                scrollTop: target.offset().top - 70
            }, 500);
        }
    });
}

function initMobileMenuClose() {
    // Close mobile menu when clicking on a link
    $('.navbar-nav > li > a:not(.dropdown-toggle)').click(function() {
        if ($(window).width() < 768) {
            $('.navbar-collapse').collapse('hide');
        }
    });
    
    // Close dropdown when clicking dropdown item
    $('.dropdown-menu > li > a').click(function() {
        $('.dropdown').removeClass('open');
        if ($(window).width() < 768) {
            $('.navbar-collapse').collapse('hide');
        }
    });
    
    // Close mobile menu when clicking outside
    $(document).click(function(e) {
        if (!$(e.target).closest('.navbar').length) {
            $('.navbar-collapse').collapse('hide');
        }
    });
}

// Navbar scroll effect
$(window).scroll(function() {
    const navbar = $('.navbar');
    if ($(window).scrollTop() > 50) {
        navbar.addClass('navbar-scrolled');
    } else {
        navbar.removeClass('navbar-scrolled');
    }
});

// Add loading state to login link
$('.login-link').click(function() {
    const $this = $(this);
    const originalText = $this.html();
    
    $this.html('<i class="fa fa-spinner fa-spin" aria-hidden="true"></i> Loading...');
    
    // Reset after 2 seconds if still on same page
    setTimeout(function() {
        if ($this.is(':visible')) {
            $this.html(originalText);
        }
    }, 2000);
});

// Industry standard dropdown behavior
function initDropdownHover() {
    if ($(window).width() > 768) {
        let hoverTimeout;
        
        $('.dropdown').off('mouseenter mouseleave').hover(
            function() {
                clearTimeout(hoverTimeout);
                $('.dropdown').removeClass('open');
                $(this).addClass('open');
            },
            function() {
                const $dropdown = $(this);
                hoverTimeout = setTimeout(function() {
                    $dropdown.removeClass('open');
                }, 300);
            }
        );
        
        $('.dropdown-menu').off('mouseenter mouseleave').hover(
            function() {
                clearTimeout(hoverTimeout);
            },
            function() {
                const $dropdown = $(this).closest('.dropdown');
                hoverTimeout = setTimeout(function() {
                    $dropdown.removeClass('open');
                }, 300);
            }
        );
    } else {
        $('.dropdown').off('mouseenter mouseleave');
        $('.dropdown-menu').off('mouseenter mouseleave');
    }
}

initDropdownHover();
$(window).resize(initDropdownHover);

// Add navbar padding to body to account for fixed navbar
$(document).ready(function() {
    $('body').css('padding-top', $('.navbar').outerHeight() + 'px');
});

// Update navbar padding on window resize
$(window).resize(function() {
    $('body').css('padding-top', $('.navbar').outerHeight() + 'px');
});
