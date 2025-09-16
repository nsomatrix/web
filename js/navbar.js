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
const navLink = document.querySelectorAll('.nav__link')

const linkAction = () =>{
    const navMenu = document.getElementById('nav-menu')
    const navToggle = document.getElementById('nav-toggle')
    // When we click on each nav__link, we remove the show-menu class
    navMenu.classList.remove('show-menu')
    navToggle.classList.remove('active')
}
navLink.forEach(n => n.addEventListener('click', linkAction))

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
    const navLinks = document.querySelectorAll('.nav__link')
    
    navLinks.forEach(link => {
        link.classList.remove('active-link')
        const href = link.getAttribute('href')
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active-link')
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