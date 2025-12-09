// Converte country code (PT, DE, etc.) em bandeira emoji
function countryCodeToFlagEmoji(code) {
  if (!code || code.length !== 2) return '';
  const base = 0x1F1E6;
  const first = code[0].toUpperCase().charCodeAt(0) - 65 + base;
  const second = code[1].toUpperCase().charCodeAt(0) - 65 + base;
  return String.fromCodePoint(first) + String.fromCodePoint(second);
}

(function () {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    console.warn('No experience id provided in URL.');
    return;
  }

  const lang = document.documentElement.lang || 'en';
  const dataUrl = `../data/${lang}/experiences.json`;

  fetch(dataUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${dataUrl}`);
      return res.json();
    })
    .then((all) => {
      const exp = all.find((x) => x.id === id);
      if (!exp) {
        console.warn('Experience not found for id:', id);
        return;
      }

      // =========================================================
      // 1) Preencher o template base (título, resumo, hero, etc.)
      // =========================================================
      const titleEl = document.getElementById('exp-title');
      const summaryEl = document.getElementById('exp-summary');
      const heroEl = document.getElementById('exp-hero');

      const durationEl = document.getElementById('exp-duration');
      const locationEl = document.getElementById('exp-location');
      const difficultyEl = document.getElementById('exp-difficulty');
      const groupSizeEl = document.getElementById('exp-group-size');

      if (titleEl) titleEl.textContent = exp.title || 'Experience Title';
      if (summaryEl) summaryEl.textContent = exp.summary || '';

      if (heroEl) {
        if (exp.image) heroEl.src = exp.image;
        heroEl.alt = exp.title || 'Experience image';
      }

      if (durationEl) durationEl.textContent = exp.duration || 'N/A';
      if (locationEl) locationEl.textContent = exp.location || 'N/A';
      if (difficultyEl) difficultyEl.textContent = exp.difficulty || 'N/A';
      if (groupSizeEl) groupSizeEl.textContent = exp.groupSize || 'N/A';

      // RATING + nº de reviews (topo, ao lado da estrela)
      const ratingEl = document.getElementById('exp-rating');
      const reviewsEl = document.getElementById('exp-reviews');
      if (ratingEl && typeof exp.rating === 'number') {
        ratingEl.textContent = exp.rating.toFixed(1);
      }
      if (reviewsEl && typeof exp.reviews === 'number') {
        reviewsEl.textContent = `(${exp.reviews} reviews)`;
      }

      // Badge de categoria no painel de booking
      const categoryBadge = document.getElementById('exp-category-badge');
      if (categoryBadge) {
        categoryBadge.textContent = exp.category || 'Category';
      }

      // =========================================================
      // 2) Inicializar o painel de booking
      // =========================================================
      initBookingPanel(exp);

      // =========================================================
      // 3) Similar experiences (mesma categoria)
      // =========================================================
      renderSimilarExperiences(exp, all);

      // =========================================================
      // 4) Reviews (lista)
      // =========================================================
      loadReviews(id);
    })
    .catch((err) => {
      console.error('Error loading experiences.json:', err);
    });

  // =============================================================
  // Função que trata do booking: preços, idades, total, modal, etc.
  // =============================================================
  function initBookingPanel(exp) {
    const panel = document.getElementById('bookingPanel');
    if (!panel) return;

    const extraInfoConfig = exp.extraInfo || null;

    const minAge =
      (exp.minAge !== undefined ? Number(exp.minAge) : null) ??
      Number(panel.dataset.minAge || 0);

    const priceAdult =
      (exp.priceAdult !== undefined ? Number(exp.priceAdult) : null) ??
      Number(panel.dataset.priceAdult || 0);

    const priceChild =
      (exp.priceChild !== undefined ? Number(exp.priceChild) : null) ??
      Number(panel.dataset.priceChild || 0);

    // elementos DOM base
    const basePriceSpan = document.getElementById('exp-base-price');
    const minAgeSpan = document.getElementById('exp-min-age');
    const ageNote = document.getElementById('exp-age-note');
    const extraInfoBlock = document.getElementById('exp-extra-info');

    const adultsSelect = document.getElementById('exp-adults');
    const childrenSelect = document.getElementById('exp-children');
    const totalSpan = document.getElementById('exp-total');
    const bookingForm = document.getElementById('bookingForm');
    const dateInput = document.getElementById('exp-date');

    const confirmModal = document.getElementById('bookingConfirmModal');
    const modalSummary = document.getElementById('modal-summary');
    const modalContactLabel = document.getElementById('modal-contact-label');
    const modalContactValue = document.getElementById('modal-contact-value');
    const modalFinalNote = document.getElementById('modal-final-note');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');

    // Preço base
    if (basePriceSpan && priceAdult) {
      basePriceSpan.textContent = priceAdult.toFixed(0);
    }

    // Idade mínima
    if (minAgeSpan && minAge) {
      minAgeSpan.textContent = minAge;
    }
    if (ageNote && !minAge) {
      ageNote.textContent =
        'Age information will be confirmed by our team.';
    }

    // -------- extraInfo vindo do JSON --------
    function renderExtraInfo() {
      if (!extraInfoBlock || !extraInfoConfig || extraInfoConfig.enabled === false) {
        if (extraInfoBlock) extraInfoBlock.classList.add('hidden');
        return;
      }

      const fields = Array.isArray(extraInfoConfig.fields)
        ? extraInfoConfig.fields
        : [];

      if (!fields.length) {
        extraInfoBlock.classList.add('hidden');
        return;
      }

      extraInfoBlock.innerHTML = '';

      // título
      if (extraInfoConfig.title) {
        const titleEl = document.createElement('p');
        titleEl.className = 'text-sm font-medium text-forest';
        titleEl.textContent = extraInfoConfig.title;
        extraInfoBlock.appendChild(titleEl);
      }

      // campos
      fields.forEach((field) => {
        if (!field || !field.type) return;

        if (field.type === 'checkbox') {
          const wrapper = document.createElement('div');
          wrapper.className = 'form-control';

          const label = document.createElement('label');
          label.className = 'label cursor-pointer';

          const span = document.createElement('span');
          span.className = 'label-text text-sm text-forest';
          span.textContent = field.label || '';

          const input = document.createElement('input');
          input.type = 'checkbox';
          input.name = field.name || '';
          input.className = 'checkbox checkbox-sm';

          label.appendChild(span);
          label.appendChild(input);
          wrapper.appendChild(label);
          extraInfoBlock.appendChild(wrapper);
        }

        if (field.type === 'textarea') {
          const wrapper = document.createElement('div');
          wrapper.className = 'form-control';

          if (field.label) {
            const label = document.createElement('label');
            label.className = 'label';

            const span = document.createElement('span');
            span.className = 'label-text text-sm text-forest';
            span.textContent = field.label;

            label.appendChild(span);
            wrapper.appendChild(label);
          }

          const textarea = document.createElement('textarea');
          textarea.className = 'textarea textarea-bordered text-sm text-forest';
          textarea.name = field.name || '';
          textarea.rows = field.rows || 2;
          if (field.placeholder) textarea.placeholder = field.placeholder;

          wrapper.appendChild(textarea);
          extraInfoBlock.appendChild(wrapper);
        }
      });

      extraInfoBlock.classList.remove('hidden');
    }

    function collectExtraInfoAnswers() {
      const answers = {};
      if (!extraInfoBlock || !extraInfoConfig || !Array.isArray(extraInfoConfig.fields)) {
        return answers;
      }

      extraInfoConfig.fields.forEach((field) => {
        if (!field || !field.type) return;
        const name = field.name || field.type;

        if (field.type === 'checkbox') {
          const input = extraInfoBlock.querySelector(`input[name="${name}"]`);
          if (input) {
            answers[name] = !!input.checked;
          }
        }

        if (field.type === 'textarea') {
          const textarea = extraInfoBlock.querySelector(`textarea[name="${name}"]`);
          if (textarea) {
            answers[name] = textarea.value.trim();
          }
        }
      });

      return answers;
    }


    // Limites de data (de hoje até +1 ano)
    if (dateInput) {
      const today = new Date();

      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      dateInput.min = `${yyyy}-${mm}-${dd}`;

      const oneYearLater = new Date(today);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

      const maxY = oneYearLater.getFullYear();
      const maxM = String(oneYearLater.getMonth() + 1).padStart(2, '0');
      const maxD = String(oneYearLater.getDate()).padStart(2, '0');
      dateInput.max = `${maxY}-${maxM}-${maxD}`;
    }

    function updateTotal() {
      if (!adultsSelect || !childrenSelect || !totalSpan) return;
      const adults = Number(adultsSelect.value || 0);
      const children = Number(childrenSelect.value || 0);
      const total = adults * priceAdult + children * priceChild;
      totalSpan.textContent = total.toFixed(0);
    }

    if (adultsSelect) adultsSelect.addEventListener('change', updateTotal);
    if (childrenSelect)
      childrenSelect.addEventListener('change', updateTotal);

    updateTotal();

    // -------- modal: email / whatsapp --------
    function getSelectedContactType() {
      if (!confirmModal) return 'email';
      const checked = confirmModal.querySelector(
        'input[name="contactType"]:checked'
      );
      return checked ? checked.value : 'email';
    }

    function refreshModalTexts() {
      const type = getSelectedContactType();
      if (!modalContactLabel || !modalFinalNote || !modalContactValue) return;

      if (type === 'whatsapp') {
        modalContactLabel.textContent = 'WhatsApp number';
        modalContactValue.placeholder = '+351 9xx xxx xxx';
        modalFinalNote.textContent =
          'Your booking request has been created. Our team will confirm availability and you will receive that confirmation via WhatsApp.';
      } else {
        modalContactLabel.textContent = 'Email';
        modalContactValue.placeholder = 'your@email.com';
        modalFinalNote.textContent =
          'Your booking request has been created. Our team will confirm availability and you will receive that confirmation via email.';
      }
    }

    if (confirmModal) {
     const contactRadios = confirmModal.querySelectorAll(
        'input[name="contactType"]'
      );
      contactRadios.forEach((radio) => {
        radio.addEventListener('change', refreshModalTexts);
      });

      if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', () => {
          confirmModal.close();
        });
      }

      if (modalConfirmBtn) {
        modalConfirmBtn.addEventListener('click', async () => {
          const type = getSelectedContactType();
          const contact = modalContactValue ? modalContactValue.value.trim() : '';

          if (!contact) {
            alert(
              type === 'whatsapp'
                ? 'Please enter your WhatsApp number.'
                : 'Please enter your email address.'
            );
            return;
          }


          // construir payload para enviar à API
          const adults = adultsSelect ? Number(adultsSelect.value || 0) : 0;
          const children = childrenSelect ? Number(childrenSelect.value || 0) : 0;
          const date = dateInput ? dateInput.value : '';
          const totalText = totalSpan ? totalSpan.textContent : '0';
          const totalEstimate = Number(totalText || 0);

          const extraInfoAnswers = collectExtraInfoAnswers();
          const language = document.documentElement.lang || 'en';

          const payload = {
            experienceId: exp.id,
            experienceTitle: exp.title,
            category: exp.category,
            date,
            adults,
            children,
            totalEstimate,
            extraInfoAnswers,
            contactType: type,        // "email" ou "whatsapp"
            contactValue: contact,    // email ou número
            language,
            submittedAt: new Date().toISOString()
          };

          try {
            const response = await fetch('/api/send-booking', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });

            if (!response.ok) {
              console.error('send-booking failed with status', response.status);
              alert('There was an error sending your request. Please try again in a moment.');
              return;
            }

            // Aqui no futuro: podemos adaptar a mensagem por EN/PT
            const channelLabel = type === 'whatsapp' ? 'WhatsApp' : 'email';


          alert(
            `Your booking request has been registered.\n` +
              `Our team will confirm availability and you will receive the confirmation via ${channelLabel}: ${contact}.`
          );

          confirmModal.close();
          if (bookingForm) bookingForm.reset();
          updateTotal();
           } catch (err) {
              console.error('Error calling /api/send-booking:', err);
              alert('There was a network error sending your request. Please check your connection and try again.');
            }
        });
      }

      // inicializa texto do modal
      refreshModalTexts();
    }

    // Renderizar extra info depois de termos o painel preparado
    renderExtraInfo();

    if (!bookingForm) return;

    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const adults = adultsSelect ? Number(adultsSelect.value || 0) : 0;
      const children = childrenSelect
        ? Number(childrenSelect.value || 0)
        : 0;
      const date = dateInput ? dateInput.value : '';

      if (!date) {
        alert('Please select a date.');
        return;
      }

      if (adults + children === 0) {
        alert('Please select at least 1 participant.');
        return;
      }

      const totalText = totalSpan ? totalSpan.textContent : '0';

      if (modalSummary && confirmModal) {
        modalSummary.textContent =
          `"${exp.title}"\n` +
          `Date: ${date}\n` +
          `Adults: ${adults}\n` +
          `Children: ${children}\n` +
          `Estimated total: €${totalText}`;
        refreshModalTexts();
        if (typeof confirmModal.showModal === 'function') {
          confirmModal.showModal();
        } else {
          confirmModal.classList.add('modal-open');
        }
      }
    });
  }

  // =============================================================
  // Similar Experiences (mesma categoria)
  // =============================================================
  function renderSimilarExperiences(current, all) {
    const grid = document.getElementById('similarExperiencesGrid');
    if (!grid || !current || !Array.isArray(all)) return;

    const sameCategory = all.filter(
      (exp) => exp.category === current.category && exp.id !== current.id
    );

    if (!sameCategory.length) {
      const section = grid.closest('section');
      if (section) section.classList.add('hidden');
      return;
    }

    const items = sameCategory.slice(0, 3);
    grid.innerHTML = items.map(similarCardTemplate).join('');
  }

  function similarCardTemplate(exp) {
    return `
      <a href="experience-detail.html?id=${encodeURIComponent(exp.id)}"
         class="card bg-base-100 shadow-sm hover:shadow-xl transition overflow-hidden">
        <figure class="h-40 w-full overflow-hidden">
          <img src="${exp.image}" alt="${exp.title}"
               class="w-full h-full object-cover transition-transform duration-300 hover:scale-110" />
        </figure>
        <div class="card-body gap-2">
          <p class="text-sm font-semibold text-base-content/70">
            ${exp.category || ''}
          </p>
          <h3 class="font-semibold text-lg">${exp.title || ''}</h3>
          <p class="text-sm text-base-content/70 line-clamp-2">
            ${exp.summary || ''}
          </p>
        </div>
      </a>
    `;
  }
})();

// =============================================================
// Reviews: lista simples a partir de reviews.json
// =============================================================
async function loadReviews(expId) {
  const section = document.getElementById('reviews-section');
  const list = document.getElementById('rev-list');
  if (!section || !list) return;

  let data;
  try {
    const res = await fetch('../data/reviews.json', { cache: 'no-store' });
    if (!res.ok) return;

    const all = await res.json();
    data = all[expId];
    if (!data || !Array.isArray(data.items) || !data.items.length) {
      return; // sem reviews → secção continua escondida
    }
  } catch (err) {
    console.error('Error loading reviews:', err);
    return;
  }

  section.classList.remove('hidden');
  list.innerHTML = '';

  data.items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'card bg-base-100 shadow-sm border border-base-200';

    const starsHtml = Array.from({ length: item.rating || 0 }, () =>
      '<span class="iconify text-warning" data-icon="mdi:star" width="16"></span>'
    ).join('');

    const flag = item.countryCode ? countryCodeToFlagEmoji(item.countryCode) : '';
    const countryLabel = item.country ? item.country : '';
    const langLabel = item.lang ? item.lang.toUpperCase() : '';

    card.innerHTML = `
      <div class="card-body gap-3">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-semibold text-sm">
              ${item.initials || (item.name ? item.name[0] : '?')}
            </div>
            <div>
              <p class="font-semibold">${item.name || ''}</p>
              <p class="text-xs text-base-content/60">
                ${item.dateLabel || ''} 
                ${countryLabel ? ' · ' + countryLabel : ''} 
                ${flag ? ' ' + flag : ''} 
                ${langLabel ? ' · ' + langLabel : ''}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1" aria-label="${item.rating || 0} star rating">
            ${starsHtml}
          </div>
        </div>
        <p class="text-sm text-forest leading-relaxed">
          "${item.text || ''}"
        </p>
      </div>
    `;

    list.appendChild(card);
  });
}
