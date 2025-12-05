// js/experiences.js
(function () {
  const GRID = document.getElementById('experiencesGrid');
  const CAT_WRAP = document.getElementById('filterCategories');
  const DURATION_SELECT = document.getElementById('durationSelect');
  const CLEAR_BTN = document.getElementById('clearFilters');
  const LOAD_MORE_BTN = document.getElementById('loadMoreExp');

  const lang = document.documentElement.lang || 'en';
  const isPT = lang.toLowerCase().startsWith('pt');

  const STEP = 6; // nº de cards por “página”
  const DATA_URL = `../data/${lang}/experiences.json`;

  let all = [];
  let filteredCategory = 'all';
  let filteredDuration = '- not defined -';
  let visible = STEP;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  async function init() {
    if (!GRID) return;

    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      all = await res.json();
    } catch (err) {
      console.error('[experiences] Error loading data:', err);
      GRID.innerHTML = `
        <p class="text-sm ${isPT ? 'text-error' : 'text-error'}">
          ${isPT
            ? 'Não foi possível carregar as experiências.'
            : 'Could not load experiences.'}
        </p>`;
      return;
    }

    buildCategoryChips();
    attachEvents();
    render();
  }

  function buildCategoryChips() {
    if (!CAT_WRAP || !Array.isArray(all)) return;

    const cats = Array.from(new Set(all.map(x => x.category))).filter(Boolean);
    const labelAll = isPT ? 'Todas' : 'All';

    CAT_WRAP.innerHTML =
      `<button type="button" class="badge badge-lg cursor-pointer ${filteredCategory === 'all' ? 'badge-primary' : 'badge-outline'}" data-cat="all">${labelAll}</button>` +
      cats.map(cat => {
        const isActive = filteredCategory === cat;
        return `<button type="button" class="badge badge-lg cursor-pointer ${isActive ? 'badge-primary' : 'badge-outline'}" data-cat="${cat}">${cat}</button>`;
      }).join('');

    CAT_WRAP.querySelectorAll('button[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        filteredCategory = btn.dataset.cat || 'all';
        visible = STEP;
        buildCategoryChips(); // re-render para atualizar active
        render();
      });
    });
  }

  function attachEvents() {
    if (DURATION_SELECT) {
      DURATION_SELECT.addEventListener('change', () => {
        filteredDuration = DURATION_SELECT.value;
        visible = STEP;
        render();
      });
    }

    if (CLEAR_BTN) {
      CLEAR_BTN.addEventListener('click', () => {
        filteredCategory = 'all';
        filteredDuration = '- not defined -';
        visible = STEP;

        if (DURATION_SELECT) {
          DURATION_SELECT.value = '- not defined -';
        }
        buildCategoryChips();
        render();
      });
    }

    if (LOAD_MORE_BTN) {
      LOAD_MORE_BTN.addEventListener('click', () => {
        visible += STEP;
        render();
      });
    }
  }

  function matchDurationFilter(exp) {
    if (!filteredDuration || filteredDuration === '- not defined -') return true;
    const d = (exp.duration || '').toLowerCase();

    if (filteredDuration === 'short') {
      return d.includes('2h') || d.includes('2 h') || d.includes('short');
    }
    if (filteredDuration === 'medium') {
      return d.includes('half') || d.includes('meio') || d.includes('3h');
    }
    if (filteredDuration === 'long') {
      return d.includes('full') || d.includes('dia') || d.includes('8h');
    }
    return true;
  }

  function render() {
    if (!GRID) return;

    const list = all.filter(exp => {
      const catOk = filteredCategory === 'all' || exp.category === filteredCategory;
      const durOk = matchDurationFilter(exp);
      return catOk && durOk;
    });

    const slice = list.slice(0, visible);
    GRID.innerHTML = slice.map(tplCard).join('');

    if (LOAD_MORE_BTN) {
      LOAD_MORE_BTN.style.display = slice.length < list.length ? 'inline-flex' : 'none';
    }
  }

  function tplCard(x) {
    const href = `experience-detail.html?id=${encodeURIComponent(x.id)}`;
    const btnLabel = isPT ? 'Ver detalhe' : 'View details';
    const excerpt = x.excerpt || x.summary || '';
    const price = x.price ?? x.priceAdult ?? 0;

    return `
      <a class="card bg-base-100 shadow-sm hover:shadow-xl transition overflow-hidden"
         href="${href}" aria-label="${x.title}">
        <figure class="h-48 w-full overflow-hidden">
          <img src="${x.image}" alt="${x.title}"
               class="w-full h-full object-cover transition-transform duration-300 hover:scale-110" />
        </figure>

        <div class="card-body gap-3">
         <span
            class="text-sm font-medium"
            style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              padding:0.25rem 1rem;
              border-radius:8px;
              background-color:#d9c89e;
              color:#0f2e20;
              max-width:max-content;
            "
          >
            ${x.category || ''}
          </span>


          <h3 class="font-semibold text-lg">${x.title || ''}</h3>
          <p class="text-sm text-base-content/70 line-clamp-3">
            ${excerpt}
          </p>
          <div class="mt-3 flex items-center justify-between">
            <span class="text-primary font-bold text-xl">€${price}</span>
            <span class="btn btn-primary btn-sm">${btnLabel}</span>
          </div>
        </div>
      </a>
    `;
  }
})();
