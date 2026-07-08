import './styles.css';
import { state } from './state.js';
import { initUI } from './ui.js';
import { initTerminal } from './terminal.js';
import { initLabs } from './labs/index.js';

function fallback(canvas) {
  state.noWebGL = true;
  if (canvas) canvas.style.display = 'none';
  document.body.style.background =
    'radial-gradient(120% 90% at 20% 0%, #12203A 0%, #070B14 60%)';
  document.body.style.backgroundAttachment = 'fixed';
}

async function boot() {
  // DOM behaviour first: reveals, scrollspy, and the depth readout must not
  // wait on a ~150 kB three.js chunk. The observers read state.noWebGL at fire
  // time, so it is fine that the flag is still false when they are created.
  initUI();
  initTerminal();
  initLabs();

  const canvas = document.getElementById('gl');
  if (!canvas) return;

  try {
    const { initHelix } = await import('./helix.js');
    initHelix(canvas);
  } catch (err) {
    console.warn('WebGL unavailable — using static background.', err);
    fallback(canvas);
  }
}

boot();
