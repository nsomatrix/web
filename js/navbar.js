/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById('nav-menu'),
      navToggle = document.getElementById('nav-toggle')

/* Menu toggle */
if(navToggle){
    navToggle.addEventListener('click', () =>{
        navMenu.classList.toggle('show-menu')
        navToggle.classList.toggle('active')
    })
}

/*=============== REMOVE MENU MOBILE ===============*/
const navLinks = document.querySelectorAll('.nav__link:not(.dropdown-toggle), .dropdown-link')

const closeMenu = () => {
    const navMenu = document.getElementById('nav-menu')
    const navToggle = document.getElementById('nav-toggle')
    navMenu.classList.remove('show-menu')
    navToggle.classList.remove('active')
    dropdowns.forEach(dropdown => dropdown.classList.remove('active'))
}

navLinks.forEach(link => {
    link.addEventListener('click', closeMenu)
})

/*=============== DROPDOWN FUNCTIONALITY ===============*/
const dropdowns = document.querySelectorAll('.dropdown')

dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.dropdown-toggle')
    
    toggle.addEventListener('click', (e) => {
        e.preventDefault()
        dropdown.classList.toggle('active')
        
        // Close other dropdowns
        dropdowns.forEach(other => {
            if (other !== dropdown) {
                other.classList.remove('active')
            }
        })
    })
})

/*=============== ADD BLUR HEADER ===============*/
const blurHeader = () =>{
    const header = document.getElementById('header')
    // Add a class if the bottom offset is greater than 50 of the viewport
    this.scrollY >= 50 ? header.classList.add('scroll-header') 
                       : header.classList.remove('scroll-header')
}
window.addEventListener('scroll', blurHeader)

/*=============== HIGHLIGHT ACTIVE LINK ===============*/
const sections = document.querySelectorAll('section[id]')

const scrollActive = () =>{
    const scrollDown = window.scrollY

    sections.forEach(current =>{
        const sectionHeight = current.offsetHeight,
              sectionTop = current.offsetTop - 58,
              sectionId = current.getAttribute('id'),
              sectionsClass = document.querySelector('.nav__menu a[href*=' + sectionId + ']')

        if(scrollDown > sectionTop && scrollDown <= sectionTop + sectionHeight){
            sectionsClass?.classList.add('active-link')
        }else{
            sectionsClass?.classList.remove('active-link')
        }                                                    
    })
}
window.addEventListener('scroll', scrollActive)

/*=============== PAGE-BASED ACTIVE LINK ===============*/
const setActiveLink = () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html'
    const navLinks = document.querySelectorAll('.nav__link, .dropdown-link')
    const dropdowns = document.querySelectorAll('.dropdown')
    
    navLinks.forEach(link => {
        link.classList.remove('active-link')
        const href = link.getAttribute('href')
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active-link')
            
            // If it's a dropdown link, also highlight the parent dropdown
            const parentDropdown = link.closest('.dropdown')
            if (parentDropdown) {
                const dropdownToggle = parentDropdown.querySelector('.dropdown-toggle')
                dropdownToggle.classList.add('active-link')
            }
        }
    })
}

// Set active link on page load
document.addEventListener('DOMContentLoaded', setActiveLink)

/*=============== SMOOTH SCROLLING FOR ANCHOR LINKS ===============*/
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault()
        const target = document.querySelector(this.getAttribute('href'))
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            })
        }
    })
})

/*=============== NAVBAR ANIMATION ON LOAD ===============*/
window.addEventListener('load', () => {
    const header = document.getElementById('header')
    header.style.transform = 'translateY(-100%)'
    header.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    
    setTimeout(() => {
        header.style.transform = 'translateY(0)'
    }, 100)
})