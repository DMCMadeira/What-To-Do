/* Home page interactive functionality */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    if (location.hash && /^#slide\d+$/i.test(location.hash)) {
      history.replaceState(null, '', location.pathname + location.search);
      } 

    initializeCarousel();
    initializeHoverEffects();
    initializeScrollAnimations();
    initializeParallaxEffect();
    initializeLazyLoading();
  });

  // Carousel functionality
    function initializeCarousel() {
    const carousel = document.querySelector('.carousel');
    const items = document.querySelectorAll('.carousel-item');
    const indicators = document.querySelectorAll('.btn-xs.btn-circle');
    if (!carousel || !items.length) return;

    let current = 0;
    const total = items.length;

    function updateIndicators(i) {
      indicators.forEach((btn, idx) => {
        btn.classList.toggle('btn-primary', idx === i);
        btn.classList.toggle('btn-outline', idx !== i);
      });
    }

    function show(i, smooth = true) {
      current = (i + total) % total;
      const el = items[current];
      carousel.scrollTo({
        left: el.offsetLeft,
        behavior: smooth ? 'smooth' : 'auto'
      });
      updateIndicators(current);
    }

    // Impede que os botões ❮ ❯ alterem o hash
    carousel.querySelectorAll('a[href^="#slide"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const isPrev = a.textContent.includes('❮');
        show(current + (isPrev ? -1 : +1));
      });
    });

    // Indicadores 1/2/3 sem mexer no hash
    indicators.forEach((btn, i) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        show(i);
      });
    });

    // Auto-advance sem tocar no location.hash
    let timer = setInterval(() => show(current + 1), 8000);
    carousel.addEventListener('mouseenter', () => clearInterval(timer));
    carousel.addEventListener('mouseleave', () => {
      timer = setInterval(() => show(current + 1), 8000);
    });

    // Inicia no primeiro slide sem “jump” na página
    show(0, false);
  }


  // Enhanced hover effects
  function initializeHoverEffects() {
    const quickViewButtons = document.querySelectorAll('.quick-view-btn');
    quickViewButtons.forEach(button => {
      button.addEventListener('mouseenter', function () {
        this.style.transform = 'scale(1.05)';
        this.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
      });
      button.addEventListener('mouseleave', function () {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = '';
      });
    });

    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      card.addEventListener('mouseenter', function () {
        const icon = this.querySelector('.iconify');
        if (icon) icon.style.transform = 'scale(1.2) rotate(5deg)';
      });
      card.addEventListener('mouseleave', function () {
        const icon = this.querySelector('.iconify');
        if (icon) icon.style.transform = 'scale(1) rotate(0deg)';
      });
    });
  }

  // Scroll-triggered animations
  function initializeScrollAnimations() {
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    const sections = document.querySelectorAll('section[data-section-id]');
    sections.forEach(section => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(30px)';
      section.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
      observer.observe(section);
    });
  }

  // Subtle parallax effect for hero section
  function initializeParallaxEffect() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    let ticking = false;
    function updateParallax() {
      const scrolled = window.pageYOffset;
      const parallax = scrolled * 0.5;
      hero.style.transform = `translateY(${parallax}px)`;
      ticking = false;
    }
    function requestTick() {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }
    window.addEventListener('scroll', requestTick);
  }

  // Lazy loading for images (opt-in via data-src)
  function initializeLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    if (!images.length) return;

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  // Helpers to navigate and store context
  window.handleExperienceView = function (experienceId) {
    localStorage.setItem('selectedExperience', experienceId);
    navigateTo('experience_detail');
  };
  window.handleMembershipSignup = function () {
    localStorage.setItem('membershipSource', 'homepage');
    navigateTo('membership_page');
  };
  window.handleArticleView = function (articleId) {
    localStorage.setItem('selectedArticle', articleId);
    navigateTo('article_detail_page');
  };
  window.scrollToSection = function (sectionId) {
    const element = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
})();

