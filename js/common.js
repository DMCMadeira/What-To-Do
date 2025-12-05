// js/common.js

// --- Função genérica para injetar HTML ---
async function injectHTML(selector, url) {
  const mount = document.querySelector(selector);
  if (!mount) return;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    mount.innerHTML = await res.text();
  } catch (e) {
    console.error(`[injectHTML] ${url}:`, e);
  }
}

function getCurrentLang() {
  const html = document.documentElement;
  return html.dataset.lang || html.lang || 'en';
}


// --- Ligar comportamento do topbar (só depois do header existir) ---
function initTopbarScrollHide() {
  const topbar = document.getElementById('topbar');
  if (!topbar) return;
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    if (window.scrollY > lastScrollY) {
      topbar.style.transform = 'translateY(-100%)';
    } else {
      topbar.style.transform = 'translateY(0)';
    }
    lastScrollY = window.scrollY;
  });
}

// --- Quando o DOM estiver carregado ---
document.addEventListener('DOMContentLoaded', async () => {
  // Injetar topo e footer (usa caminhos relativos)
  await Promise.all([
    injectHTML('#header-slot', '../partials/header.html'),
    injectHTML('#footer-slot', '../partials/footer.html'),
  ]);
  
  await loadUIStrings();
 initLangSwitcher();   // ⬅️ AQUI


  // Agora o header já existe → podemos ligar o comportamento do topbar
  initTopbarScrollHide();

  // (Opcional) se o teu header tiver links com âncoras tipo #contact e
  // quiseres smooth scroll quando estiveres na própria página:
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});

/* ====== Resto do teu common.js (igual) ====== */
(function () {
  // Initialize global namespace
  window.APP_GLOBALS = window.APP_GLOBALS || {};

  // Navegação simples entre páginas
  window.navigateTo = function (targetPageId) {
    const isInIframe = window.self !== window.top;
    const targetFileName = `${targetPageId}.html`;
    if (isInIframe) {
      window.parent.postMessage({ type: 'iframeNavigation', targetPageId }, '*');
    } else {
      window.location.href = targetFileName;
    }
  };

  // Pesquisa global
  window.handleGlobalSearch = function () {
    const searchInput = document.querySelector('#global-search-input');
    if (searchInput && searchInput.value.trim()) {
      localStorage.setItem('searchTerm', searchInput.value.trim());
      navigateTo('experiences');
    }
  };

  window.toggleUserMenu = function () {
    const menu = document.querySelector('#user-dropdown-menu');
    if (menu) menu.classList.toggle('hidden');
  };

  window.toggleMobileMenu = function () {
    const menu = document.querySelector('#mobile-menu');
    if (menu) menu.classList.toggle('hidden');
  };

  window.scrollToTop = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.scrollToSection = function (sectionId) {
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Estado “auth” (tal como tinhas)
  window.APP_GLOBALS.auth = {
    isLoggedIn: false,
    user: null,
    login(userData) {
      this.isLoggedIn = true;
      this.user = userData;
      localStorage.setItem('user', JSON.stringify(userData));
      this.updateUI();
    },
    logout() {
      this.isLoggedIn = false;
      this.user = null;
      localStorage.removeItem('user');
      this.updateUI();
      navigateTo('index');
    },
    updateUI() {
      const authButtons = document.querySelectorAll('[data-auth-state]');
      authButtons.forEach(button => {
        const state = button.getAttribute('data-auth-state');
        if (state === 'logged-in') {
          button.style.display = this.isLoggedIn ? 'block' : 'none';
        } else if (state === 'logged-out') {
          button.style.display = this.isLoggedIn ? 'none' : 'block';
        }
      });
    },
    init() {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        this.user = JSON.parse(savedUser);
        this.isLoggedIn = true;
      }
      this.updateUI();
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    window.APP_GLOBALS.auth.init();

    // Fecha dropdowns ao clicar fora
    document.addEventListener('click', function (e) {
      const dropdowns = document.querySelectorAll('.dropdown-content');
      dropdowns.forEach(dropdown => {
        if (!dropdown.contains(e.target) && !dropdown.previousElementSibling?.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });
    });

    // Search com Enter
    const searchInput = document.querySelector('#global-search-input');
    if (searchInput) {
      searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') handleGlobalSearch();
      });
    }
  });

  // (Removido: initTopbar aqui — agora corre depois da injeção)
})();
async function loadUIStrings() {
  const lang = getCurrentLang();
  try {
    const res = await fetch(`../data/${lang}/ui.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ui = await res.json();

    // MENU
    const navHome = document.getElementById('nav-home');
    const navExp = document.getElementById('nav-experiences');
    const navInsights = document.getElementById('nav-insights');
    const navContact = document.getElementById('nav-contact');

    if (navHome && ui.menu.home) navHome.textContent = ui.menu.home;
    if (navExp && ui.menu.experiences) navExp.textContent = ui.menu.experiences;
    if (navInsights && ui.menu.insights) navInsights.textContent = ui.menu.insights;
    if (navContact && ui.menu.contact) navContact.textContent = ui.menu.contact;

    // FOOTER
    const fRights = document.getElementById('footer-rights');
    const fAbout = document.getElementById('footer-about');
    const fSocial = document.getElementById('footer-social');

    if (fRights && ui.footer.rights) fRights.textContent = ui.footer.rights;
    if (fAbout && ui.footer.about) fAbout.textContent = ui.footer.about;
    if (fSocial && ui.footer.social) fSocial.textContent = ui.footer.social;
  } catch (e) {
    console.error('[loadUIStrings]', e);
  }
}
function switchLanguage(targetLang) {
  const path = window.location.pathname;
  const search = window.location.search || '';
  const hash = window.location.hash || '';

  // ex: /en/experience-detail.html ou /pt/index.html
  const segments = path.split('/').filter(Boolean); // remove vazios
  let file = segments.pop() || 'index.html';

  // se já estiver dentro de /en/ ou /pt/, trocamos o primeiro segmento
  if (segments[0] === 'en' || segments[0] === 'pt') {
    segments[0] = targetLang;
  } else {
    // estamos na raiz (ex: /index.html) → assume que vamos criar /en/ e /pt/
    segments.unshift(targetLang);
  }

  const newPath = '/' + segments.concat(file).join('/');
  window.location.href = newPath + search + hash;
}

function initLangSwitcher() {
  const current = getCurrentLang(); // 'en' ou 'pt'

  document.querySelectorAll('.lang-option').forEach(btn => {
    const lang = btn.dataset.lang;
    if (!lang) return;

    if (lang === current) {
      btn.classList.add('lang-active');
    } else {
      btn.classList.remove('lang-active');
    }

    btn.addEventListener('click', () => {
      if (lang !== current) {
        switchLanguage(lang);
      }
    });
  });
}
