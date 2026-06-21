/**
 * Premier Schools Exhibition - main.js
 * Handles: hero slider (dual-axis), school-types mobile slider,
 *          must-visit feature slider, marquee pause, swipe support
 */

'use strict';

/* ---------------------------------------------
   Utility: swipe detection
--------------------------------------------- */
function addSwipeSupport(el, { onLeft, onRight, onUp, onDown } = {}) {
  let startX = 0, startY = 0;
  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    if (Math.max(absX, absY) < 30) return;
    if (absX > absY) {
      dx < 0 ? onLeft?.() : onRight?.();
    } else {
      dy < 0 ? onUp?.() : onDown?.();
    }
  }, { passive: true });
}

/* Respect user's reduced-motion preference */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------
   Generic Slider factory
   Returns controls object { goTo, prev, next }
--------------------------------------------- */
function createSlider({
  track,
  getCardWidth,
  totalSlides,
  visibleCount = 1,
  autoPlayMs = 0,
  onSlideChange,
}) {
  let current = 0;
  let autoPlayTimer = null;

  function goTo(idx) {
    const max = Math.max(0, totalSlides - visibleCount);
    current = Math.max(0, Math.min(idx, max));
    const offset = current * getCardWidth();
    if (!prefersReducedMotion) {
      track.style.transform = `translateX(-${offset}px)`;
    } else {
      track.style.transition = 'none';
      track.style.transform = `translateX(-${offset}px)`;
    }
    onSlideChange?.(current);
  }

  function prev() { goTo(current - 1); }
  function next() { goTo(current + 1); }

  if (autoPlayMs > 0 && !prefersReducedMotion) {
    function startAutoPlay() {
      if (autoPlayTimer) return;
      autoPlayTimer = setInterval(() => {
        const max = Math.max(0, totalSlides - visibleCount);
        goTo(current < max ? current + 1 : 0);
      }, autoPlayMs);
    }
    function stopAutoPlay() {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
    }

    startAutoPlay();

    track.closest('[data-hero-slider], [data-feature-slider]')?.addEventListener('mouseenter', stopAutoPlay);
    track.closest('[data-hero-slider], [data-feature-slider]')?.addEventListener('mouseleave', startAutoPlay);
    track.closest('[data-hero-slider], [data-feature-slider]')?.addEventListener('focusin', stopAutoPlay);
    track.closest('[data-hero-slider], [data-feature-slider]')?.addEventListener('focusout', startAutoPlay);
  }

  return { goTo, prev, next, getCurrent: () => current };
}

/* ---------------------------------------------
   HERO SLIDER (dual-axis: H swipe + Y keypress)
--------------------------------------------- */
(function initHeroSlider() {
  const sliderEl = document.querySelector('[data-hero-slider]');
  if (!sliderEl) return;

  const track = sliderEl.querySelector('[data-hero-track]');
  const slides = Array.from(track.children);
  const dots   = Array.from(sliderEl.querySelectorAll('[data-hero-dot]'));
  const totalSlides = slides.length;

  function getCardWidth() {
    return sliderEl.offsetWidth;
  }

  function updateDots(idx) {
    dots.forEach((d, i) => {
      d.classList.toggle('hero__dot--active', i === idx);
      d.setAttribute('aria-selected', String(i === idx));
    });
    slides.forEach((s, i) => {
      const hidden = i !== idx;
      s.classList.toggle('hero__slide--active', !hidden);
      s.setAttribute('aria-hidden', String(hidden));
      if ('inert' in s) s.inert = hidden;
    });
  }

  const slider = createSlider({
    track,
    getCardWidth,
    totalSlides,
    visibleCount: 1,
    autoPlayMs: 5000,
    onSlideChange: updateDots,
  });

  /* Buttons */
  sliderEl.querySelector('[data-hero-prev]')?.addEventListener('click', () => slider.prev());
  sliderEl.querySelector('[data-hero-next]')?.addEventListener('click', () => slider.next());

  /* Dot nav */
  dots.forEach(dot => {
    dot.addEventListener('click', () => slider.goTo(Number(dot.dataset.heroDot)));
  });

  /* Horizontal swipe */
  addSwipeSupport(sliderEl, {
    onLeft:  () => slider.next(),
    onRight: () => slider.prev(),
  });

  /* Keyboard: left/right + up/down (dual-axis) */
  sliderEl.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')   { e.preventDefault(); slider.prev(); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); slider.next(); }
  });

  /* Window resize: recalculate position */
  window.addEventListener('resize', () => slider.goTo(slider.getCurrent()), { passive: true });
  updateDots(0);
})();

/* ---------------------------------------------
   SCHOOL TYPES SLIDER (mobile only)
--------------------------------------------- */
(function initSchoolTypesSlider() {
  const sliderEl = document.querySelector('[data-school-slider]');
  if (!sliderEl) return;

  const track = sliderEl.querySelector('[data-school-track]');
  const cards = Array.from(track.children);
  const dots  = Array.from(sliderEl.querySelectorAll('[data-school-dot]'));

  function isMobile() { return window.innerWidth <= 768; }

  function getCardWidth() {
    const card = cards[0];
    if (!card) return 0;
    const gap = parseFloat(getComputedStyle(track).gap) || 16;
    return card.offsetWidth + gap;
  }

  function updateDots(idx) {
    dots.forEach((d, i) => {
      d.classList.toggle('school-types__dot--active', i === idx);
      d.setAttribute('aria-selected', String(i === idx));
    });
  }

  const slider = createSlider({
    track,
    getCardWidth,
    totalSlides: cards.length,
    visibleCount: 1,
    onSlideChange: updateDots,
  });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      if (isMobile()) slider.goTo(Number(dot.dataset.schoolDot));
    });
  });

  addSwipeSupport(sliderEl, {
    onLeft:  () => { if (isMobile()) slider.next(); },
    onRight: () => { if (isMobile()) slider.prev(); },
  });

  /* Reset on resize */
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      track.style.transform = 'translateX(0)';
      updateDots(0);
    }
  }, { passive: true });
})();

/* ---------------------------------------------
   MUST-VISIT FEATURE SLIDER
--------------------------------------------- */
(function initFeatureSlider() {
  const sliderEl = document.querySelector('[data-feature-slider]');
  if (!sliderEl) return;

  const track = sliderEl.querySelector('[data-feature-track]');
  const cards = Array.from(track.children);
  const dots  = Array.from(sliderEl.querySelectorAll('[data-feature-dot]'));

  function getVisibleCount() {
    const w = window.innerWidth;
    if (w <= 768) return 1;
    if (w <= 1024) return 2;
    return 4;
  }

  function getCardWidth() {
    const card = cards[0];
    if (!card) return 0;
    const gap = parseFloat(getComputedStyle(track).gap) || 20;
    return card.offsetWidth + gap;
  }

  let slider;

  function initOrReset() {
    const visible = getVisibleCount();
    slider = createSlider({
      track,
      getCardWidth,
      totalSlides: cards.length,
      visibleCount: visible,
      autoPlayMs: 0,
      onSlideChange: updateUI,
    });
    slider.goTo(0);
    updateUI(0);
  }

  function updateUI(idx) {
    const visible = getVisibleCount();
    const prevBtn = sliderEl.querySelector('[data-feature-prev]');
    const nextBtn = sliderEl.querySelector('[data-feature-next]');
    if (prevBtn) prevBtn.disabled = idx <= 0;
    if (nextBtn) nextBtn.disabled = idx >= cards.length - visible;
    dots.forEach((d, i) => {
      const active = i === idx;
      d.classList.toggle('must-visit__dot--active', active);
      d.setAttribute('aria-selected', String(active));
    });
  }

  sliderEl.querySelector('[data-feature-prev]')?.addEventListener('click', () => slider?.prev());
  sliderEl.querySelector('[data-feature-next]')?.addEventListener('click', () => slider?.next());

  dots.forEach(dot => {
    dot.addEventListener('click', () => slider?.goTo(Number(dot.dataset.featureDot)));
  });

  addSwipeSupport(sliderEl, {
    onLeft:  () => slider?.next(),
    onRight: () => slider?.prev(),
  });

  sliderEl.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); slider?.prev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); slider?.next(); }
  });

  window.addEventListener('resize', () => {
    slider?.goTo(0);
    initOrReset();
  }, { passive: true });

  initOrReset();
})();

/* ---------------------------------------------
   ENQUIRY FORM - client-side validation
--------------------------------------------- */
document.querySelectorAll('.enquiry-form').forEach(form => {
  const inputs = [
    form.querySelector('[name="parent_name"]'),
    form.querySelector('[name="phone"]'),
  ].filter(Boolean);

  function validateInput(input) {
    const empty = !input.value.trim();
    const phonePattern = /^[0-9+\-\s]{7,15}$/;
    const phoneInvalid = input.name === 'phone' && !empty && !phonePattern.test(input.value.trim());
    const invalid = empty || phoneInvalid;
    input.setAttribute('aria-invalid', String(invalid));
    return !invalid;
  }

  /* Clear error on input */
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validateInput(input);
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const allValid = inputs.map(validateInput).every(Boolean);

    if (allValid) {
  const btn = form.querySelector('.btn--submit');
  const label = btn.querySelector('.btn__text');

  if (label) {
    const original = label.textContent;

    btn.classList.add('is-success');
    label.textContent = 'Thank you!';
    btn.disabled = true;

    setTimeout(() => {
      btn.classList.remove('is-success');

      label.textContent = original;
      btn.disabled = false;
      form.reset();
      inputs.forEach(i => i.removeAttribute('aria-invalid'));
    }, 3000);
      }
    } else {
      /* Focus first invalid field */
      const firstInvalid = inputs.find(i => i.getAttribute('aria-invalid') === 'true');
      firstInvalid?.focus();
    }
  });
});

/* ---------------------------------------------
   STICKY HEADER: swap to dark gradient on scroll
--------------------------------------------- */
(function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  function onScroll() {
    header.classList.toggle('site-header--scrolled', window.scrollY > header.offsetHeight);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ---------------------------------------------
   MARQUEE: pause/resume via keyboard focus
   (handled in CSS via :focus-within; JS below
    is an extra safety net for older browsers)
--------------------------------------------- */
document.querySelectorAll('.schools__marquee-row').forEach(row => {
  row.addEventListener('focusin',  () => {
    row.querySelectorAll('.schools__marquee-inner').forEach(inner => {
      inner.style.animationPlayState = 'paused';
    });
  });
  row.addEventListener('focusout', () => {
    row.querySelectorAll('.schools__marquee-inner').forEach(inner => {
      inner.style.animationPlayState = '';
    });
  });
});

document.querySelectorAll('.click-btn').forEach(btn => {
  btn.addEventListener('click', function () {

    this.classList.add('clicked');

    setTimeout(() => {
      this.classList.remove('clicked');
    }, 2000); // reset after 2 sec

  });
});