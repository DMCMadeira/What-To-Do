/* Insights page interactive functionality */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    initializeCarousel();
    initializeHoverEffects();
    initializeScrollAnimations();
    initializeParallaxEffect();
    initializeLazyLoading();
    initializeInsightsFiltering();
  });

  // Carousel functionality (same as index page)
  function initializeCarousel() {
    const carouselItems = document.querySelectorAll('.carousel-item');
    const indicators = document.querySelectorAll('.btn-xs.btn-circle');

    function updateIndicators(activeIndex) {
      indicators.forEach((indicator, index) => {
        if (index === activeIndex) {
          indicator.classList.remove('btn-outline');
          indicator.classList.add('btn-primary');
        } else {
          indicator.classList.add('btn-outline');
          indicator.classList.remove('btn-primary');
        }
      });
    }

    let currentSlide = 0;
    const totalSlides = carouselItems.length;

    function autoAdvance() {
      currentSlide = (currentSlide + 1) % totalSlides;
      
      const targetEl = document.getElementById(targetSlide);
      updateIndicators(currentSlide);
    }

    let autoAdvanceInterval = setInterval(autoAdvance, 8000);

    const carousel = document.querySelector('.carousel');
    if (carousel) {
      carousel.addEventListener('mouseenter', () => {
        clearInterval(autoAdvanceInterval);
      });
      carousel.addEventListener('mouseleave', () => {
        autoAdvanceInterval = setInterval(autoAdvance, 8000);
      });
    }

    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        currentSlide = index;
        updateIndicators(currentSlide);
      });
    });
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

  // Lazy loading for images
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

  // Insights filtering functionality
  function initializeInsightsFiltering() {
    const grid = document.querySelector('#ipv2wc .grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.card'));
    const filterButtons = document.querySelectorAll('#insightsFilters .filter-btn');
    const loadMoreBtn = document.getElementById('loadMoreInsights');

    if (!cards.length || !filterButtons.length || !loadMoreBtn) return;

    const STEP = 3;
    let visibleCount = STEP;
    let currentCategory = 'all';

    function render() {
      let shown = 0;
      cards.forEach(card => {
        const matches = (currentCategory === 'all') || (card.dataset.category === currentCategory);
        if (matches && shown < visibleCount) {
          card.style.display = 'block';
          shown++;
        } else if (matches) {
          card.style.display = 'none';
        } else {
          card.style.display = 'none';
        }
      });

      const totalMatches = cards.filter(c => currentCategory === 'all' || c.dataset.category === currentCategory).length;
      loadMoreBtn.style.display = (shown < totalMatches) ? 'inline-flex' : 'none';
    }

    cards.forEach(c => c.style.display = 'none');
    render();

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('btn-active'));
        btn.classList.add('btn-active');
        currentCategory = btn.dataset.category;
        visibleCount = STEP;
        render();
      });
    });

    loadMoreBtn.addEventListener('click', () => {
      visibleCount += STEP;
      render();
    });
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

