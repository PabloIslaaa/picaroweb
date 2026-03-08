// ============================================================
// nav.js — Shared Navigation Component
// ============================================================

function injectNav(activePage) {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.documentElement.classList.add('light-mode');
    }

    const nav = document.createElement('nav');
    nav.className = 'nav';
    nav.innerHTML = `
        <div class="nav-inner">
            <a href="index.html" class="nav-brand">
                <span class="brand-icon">💰</span>
                PICAROWEB
            </a>
            <ul class="nav-links">
                <li><a href="index.html" class="${activePage === 'home' ? 'active' : ''}">Inicio</a></li>
                <li><a href="poker.html" class="${activePage === 'poker' ? 'active' : ''}">Poker</a></li>
                <li><button id="theme-toggle" class="nav-toggle" style="display:block; font-size:1.1rem;">🌗</button></li>
            </ul>
            <button class="nav-toggle" id="nav-toggle" aria-label="Menu" style="margin-left: auto;">☰</button>
        </div>
    `;

    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'nav-mobile-menu';
    mobileMenu.id = 'nav-mobile-menu';
    mobileMenu.innerHTML = `
        <a href="index.html" class="${activePage === 'home' ? 'active' : ''}">Inicio</a>
        <a href="poker.html" class="${activePage === 'poker' ? 'active' : ''}">Poker</a>
        <button id="theme-toggle-mobile" style="background:none;border:none;color:inherit;font-size:1.5rem;padding:16px;cursor:pointer;">🌗 Tema</button>
    `;

    document.body.prepend(mobileMenu);
    document.body.prepend(nav);

    const toggleTheme = () => {
        const isLight = document.documentElement.classList.toggle('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    };

    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    document.getElementById('theme-toggle-mobile')?.addEventListener('click', toggleTheme);

    // Hamburger toggle
    document.getElementById('nav-toggle').addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
    });

    // Close mobile on link click
    mobileMenu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
}

// ---- Scroll fade-in animation ----
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
});
