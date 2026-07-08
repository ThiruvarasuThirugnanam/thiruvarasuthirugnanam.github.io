import { state, hexToRgb } from './state.js';

/* ------------------------------------------------------------------ *
 * Hero terminal — types the incident response lifecycle, on a loop
 * ------------------------------------------------------------------ */
function terminal() {
  const el = document.getElementById('type');
  if (!el) return;

  const words = ['detect', 'contain', 'eradicate', 'recover', 'document'];

  if (state.reduce) {
    el.textContent = words.join(' \u00B7 ');
    return;
  }

  let w = 0;
  let c = 0;
  let deleting = false;

  (function step() {
    const word = words[w];
    c += deleting ? -1 : 1;
    el.textContent = word.slice(0, c);

    let wait = deleting ? 45 : 95;
    if (!deleting && c === word.length) {
      wait = 1250;
      deleting = true;
    } else if (deleting && c === 0) {
      deleting = false;
      w = (w + 1) % words.length;
      wait = 260;
    }
    setTimeout(step, wait);
  })();
}

/* ------------------------------------------------------------------ *
 * Hex dump strip in the rail
 * ------------------------------------------------------------------ */
function hexDump() {
  const el = document.getElementById('dump');
  if (!el || state.reduce) return;

  const H = '0123456789ABCDEF';
  const byte = () => H[(Math.random() * 16) | 0] + H[(Math.random() * 16) | 0];
  const row = () => Array.from({ length: 8 }, byte).join(' ');
  const paint = () => {
    el.textContent = Array.from({ length: 6 }, row).join('\n');
  };

  paint();
  setInterval(paint, 900);
}

/* ------------------------------------------------------------------ *
 * Copy email
 * ------------------------------------------------------------------ */
function copyEmail() {
  const btn = document.getElementById('cp');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const mail = btn.dataset.mail;
    const label = btn.textContent;
    try {
      await navigator.clipboard.writeText(mail);
    } catch {
      /* clipboard blocked — still confirm, the address is on screen */
    }
    btn.textContent = 'Copied \u2713';
    setTimeout(() => {
      btn.textContent = label;
    }, 1600);
  });
}

/* ------------------------------------------------------------------ *
 * Reveal on scroll, scrollspy, per-section accent
 * ------------------------------------------------------------------ */
function observers() {
  const revealObs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        revealObs.unobserve(e.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  document.querySelectorAll('.rv, .node').forEach((n) => revealObs.observe(n));

  const links = [...document.querySelectorAll('#nav a')];

  const activeObs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;

        const id = e.target.id;
        links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#${id}`));

        const hex = e.target.dataset.accent;
        if (!hex) continue;
        state.accentTarget = hexToRgb(hex);

        // The render loop lerps --accent smoothly. With no render loop,
        // set it here so section tinting still works.
        if (state.noWebGL) {
          document.documentElement.style.setProperty('--accent', hex);
        }
      }
    },
    { threshold: 0.01, rootMargin: '-45% 0px -45% 0px' }
  );
  document.querySelectorAll('section[data-off]').forEach((s) => activeObs.observe(s));
}

/* ------------------------------------------------------------------ *
 * Scroll bookkeeping — depth readout, progress bar, timeline fill
 * ------------------------------------------------------------------ */
function scrollMeter() {
  const depthEl = document.getElementById('depth');
  const progEl = document.getElementById('prog');
  const tl = document.getElementById('tl');
  const fill = document.getElementById('tlfill');

  function measure() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    state.scroll = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

    if (progEl) progEl.style.width = `${state.scroll * 100}%`;

    if (depthEl) {
      const off = Math.round(state.scroll * 0xffff);
      depthEl.textContent = `0x${off.toString(16).toUpperCase().padStart(4, '0')}`;
    }

    if (tl && fill) {
      const r = tl.getBoundingClientRect();
      let p = (window.innerHeight * 0.65 - r.top) / r.height;
      p = Math.min(1, Math.max(0, p));
      fill.style.height = `${p * (r.height - 16)}px`;
    }
  }

  window.addEventListener('scroll', measure, { passive: true });
  window.addEventListener('resize', measure);
  measure();
}

/* ------------------------------------------------------------------ */
export function initUI() {
  const y = document.getElementById('year');
  if (y) y.textContent = `\u00A9 ${new Date().getFullYear()}`;

  terminal();
  hexDump();
  copyEmail();
  observers();
  scrollMeter();
}
