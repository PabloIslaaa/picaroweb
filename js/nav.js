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
                <li><a href="calzondor.html" class="${activePage === 'calzondor' ? 'active' : ''}">Calzón D'Or</a></li>
                <li>
                    <label class="switch theme-switch" style="margin-top:4px;">
                        <input type="checkbox" id="theme-toggle" ${currentTheme === 'light' ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </li>
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
        <a href="calzondor.html" class="${activePage === 'calzondor' ? 'active' : ''}">Calzón D'Or</a>
        <div style="padding:16px 40px; display:flex; justify-content:center; align-items:center; gap:12px; border-bottom:1px solid var(--border); width: 100%;">
            <label class="switch theme-switch">
                <input type="checkbox" id="theme-toggle-mobile" ${currentTheme === 'light' ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
            <span style="color:var(--text-dim); font-size:1.1rem;">Tema</span>
        </div>
    `;

    document.body.prepend(mobileMenu);
    document.body.prepend(nav);

    const toggleTheme = (e) => {
        const isCheckbox = e && e.target && e.target.type === 'checkbox';
        const isLight = isCheckbox ? e.target.checked : document.documentElement.classList.toggle('light-mode');

        if (isCheckbox) {
            if (isLight) document.documentElement.classList.add('light-mode');
            else document.documentElement.classList.remove('light-mode');
        }

        localStorage.setItem('theme', isLight ? 'light' : 'dark');

        const cbDesktop = document.getElementById('theme-toggle');
        const cbMobile = document.getElementById('theme-toggle-mobile');
        if (cbDesktop && cbDesktop !== e.target) cbDesktop.checked = isLight;
        if (cbMobile && cbMobile !== e.target) cbMobile.checked = isLight;
    };

    document.getElementById('theme-toggle')?.addEventListener('change', toggleTheme);
    document.getElementById('theme-toggle-mobile')?.addEventListener('change', toggleTheme);

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
