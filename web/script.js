// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Navbar background change on scroll
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(18, 18, 18, 0.95)';
        navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    } else {
        navbar.style.background = 'rgba(18, 18, 18, 0.9)';
        navbar.style.boxShadow = 'none';
    }
});

// Simple animation for numbers (Stats)
const stats = document.querySelectorAll('.stat-num');
let started = false;

function animateStats() {
    if (started) return;

    // Check if element is in view
    const statsSection = document.querySelector('.stats');
    const rect = statsSection.getBoundingClientRect();

    if (rect.top < window.innerHeight && rect.bottom >= 0) {
        started = true;

        // Animate specific stats if needed, or just leave them static for now
        // This is a placeholder for future complex animations
    }
}

window.addEventListener('scroll', animateStats);

// Parallax effect for hero image
const heroImage = document.querySelector('.phone-mockup');
if (heroImage) { // Check if element exists to avoid errors on privacy page
    window.addEventListener('mousemove', (e) => {
        const x = (window.innerWidth - e.pageX * 2) / 100;
        const y = (window.innerHeight - e.pageY * 2) / 100;

        heroImage.style.transform = `translateX(${x}px) translateY(${y}px)`;
    });
}

// Mobile Menu Logic
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
const closeMenu = document.querySelector('.close-menu');
const mobileLinks = document.querySelectorAll('.mobile-menu a');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        mobileMenu.classList.add('active');
    });
}

if (closeMenu) {
    closeMenu.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
    });
}

// Close menu when a link is clicked
mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
    });
});
