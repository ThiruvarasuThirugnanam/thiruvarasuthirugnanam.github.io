/**
 * Stylometric authorship comparison, using Burrows's Delta.
 *
 * Cosine similarity on raw function-word rates is useless here: every English
 * document points in nearly the same direction, so everything scores ~0.99.
 * Delta fixes that by z-scoring each feature against a reference corpus first,
 * then taking the mean absolute z-difference between the two documents. It is
 * the standard statistic in the field, and it is what makes the demo honest.
 *
 * The published capstone went further — Chi-square and ReliefF feature selection
 * into a bagged-tree ensemble, 87.5% accuracy. This is the intuition, not the paper.
 */

/* Function words carry authorship signal precisely because they carry no topic. */
const FUNCTION_WORDS = [
  'the', 'a', 'an', 'and', 'but', 'or', 'if', 'because', 'as', 'of',
  'at', 'by', 'for', 'with', 'about', 'into', 'through', 'to', 'from', 'in',
  'on', 'that', 'this', 'it', 'is', 'was', 'be', 'have', 'had', 'not',
  'they', 'i', 'you', 'we', 'he', 'she', 'would', 'will', 'may', 'did',
];

/* ---- Reference corpus: original prose, two distinct voices. ---------------
   Only used to estimate each feature's mean and standard deviation, which is
   what Delta standardises against. Never shown to the visitor.            */
const CORPUS = [
  `The alert fired at 02:14 and I did not like the shape of it. One host, one outbound
   connection, repeating on a fixed interval. Beaconing looks like this. I pulled the
   process tree before I pulled the network capture, because the capture would still be
   there in ten minutes and the process might not. It was a scheduled task. Someone had
   created it four days earlier and nobody had asked why.`,

  `The ticket said the server was slow and that was all it said. I did not believe the
   ticket. Slow is a symptom and symptoms lie. I checked the scheduled tasks first, then
   the outbound connections, then the local administrators group, in that order, because
   that is the order in which a compromise usually becomes visible. The third one is
   where I found it. Nobody had asked why, again.`,

  `I do not trust a clean scan. A clean scan means the tool looked where I told it to
   look and found what I told it to find. It does not mean the host is clean. So I go
   back and I read the logs by hand, and I read them from the bottom, because whoever
   was here would have cleaned the top first. That is where it usually is.`,

  `This advisory addresses a critical vulnerability affecting all supported versions of
   the product. Successful exploitation may permit an unauthenticated remote attacker to
   execute arbitrary code with elevated privileges. Customers are strongly encouraged to
   apply the referenced update at the earliest opportunity. Mitigations are documented
   below for environments in which immediate patching is not operationally feasible.`,

  `Organisations are advised to review their existing detection coverage and to ensure
   that relevant telemetry is being collected from all affected endpoints. Where
   compensating controls have been implemented, these should be validated against the
   indicators provided in the appendix. Further guidance will be published as additional
   information becomes available from the vendor.`,

  `The vulnerability may be triggered remotely and does not require prior authentication.
   Systems which have been configured in accordance with the hardening guidance are
   believed to be at reduced risk, although this has not been confirmed for every
   supported configuration. Administrators should apply the update during the next
   available maintenance window.`,
];

const SAMPLES = {
  a1: CORPUS[0],
  a2: CORPUS[1],
  b1: CORPUS[3],
};

const clean = (t) => t.replace(/\s+/g, ' ').trim();
const tokenize = (t) => t.toLowerCase().match(/[a-z']+/g) || [];

/** Relative frequency of each function word, per token. */
function rates(text) {
  const words = tokenize(text);
  if (!words.length) return null;
  const counts = new Map(FUNCTION_WORDS.map((w) => [w, 0]));
  for (const w of words) if (counts.has(w)) counts.set(w, counts.get(w) + 1);
  return FUNCTION_WORDS.map((w) => counts.get(w) / words.length);
}

/** Descriptive stats, shown in the table so the visitor sees what is measured. */
function describe(text) {
  const words = tokenize(text);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 1);
  const chars = text.replace(/\s/g, '').length || 1;
  const punctuation = (text.match(/[,;:—'"()-]/g) || []).length;
  return {
    words: words.length,
    sentences: sentences.length,
    avgSentenceLength: words.length / Math.max(1, sentences.length),
    avgWordLength: words.join('').length / Math.max(1, words.length),
    typeTokenRatio: new Set(words).size / Math.max(1, words.length),
    punctuationDensity: (punctuation / chars) * 100,
  };
}

/* Corpus mean and standard deviation, per feature. Computed once. */
const CORPUS_RATES = CORPUS.map(rates);
const MU = FUNCTION_WORDS.map(
  (_, i) => CORPUS_RATES.reduce((s, r) => s + r[i], 0) / CORPUS_RATES.length
);
const SIGMA = FUNCTION_WORDS.map((_, i) => {
  const v = CORPUS_RATES.reduce((s, r) => s + (r[i] - MU[i]) ** 2, 0) / CORPUS_RATES.length;
  return Math.sqrt(v);
});

/* Features that never vary across the corpus carry no signal. */
const USABLE = FUNCTION_WORDS.map((_, i) => SIGMA[i] > 1e-6);

/** Burrows's Delta. Lower means the two hands look more alike. */
function delta(textA, textB) {
  const ra = rates(textA);
  const rb = rates(textB);
  if (!ra || !rb) return null;

  let sum = 0;
  let n = 0;
  for (let i = 0; i < FUNCTION_WORDS.length; i++) {
    if (!USABLE[i]) continue;
    const za = (ra[i] - MU[i]) / SIGMA[i];
    const zb = (rb[i] - MU[i]) / SIGMA[i];
    sum += Math.abs(za - zb);
    n++;
  }
  return n ? sum / n : null;
}

const fmt = (n, d = 2) => n.toFixed(d);

export function initStylometry() {
  const root = document.getElementById('lab-stylo');
  if (!root) return;

  const left = root.querySelector('[data-doc="left"]');
  const right = root.querySelector('[data-doc="right"]');
  const runBtn = root.querySelector('[data-run]');
  const result = root.querySelector('[data-result]');
  const table = root.querySelector('[data-table]');
  const bar = root.querySelector('[data-bar]');
  const verdict = root.querySelector('[data-verdict]');

  left.value = clean(SAMPLES.a1);
  right.value = clean(SAMPLES.a2);

  root.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      if (p === 'same') {
        left.value = clean(SAMPLES.a1);
        right.value = clean(SAMPLES.a2);
      } else if (p === 'different') {
        left.value = clean(SAMPLES.a1);
        right.value = clean(SAMPLES.b1);
      } else {
        left.value = '';
        right.value = '';
        left.focus();
      }
      root.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('on', b === btn));
      result.hidden = true;
    });
  });

  runBtn.addEventListener('click', () => {
    const da = describe(left.value);
    const db = describe(right.value);

    if (da.words < 25 || db.words < 25) {
      result.hidden = false;
      table.innerHTML = '';
      bar.style.width = '0%';
      verdict.dataset.state = 'warn';
      verdict.textContent =
        'Each passage needs at least about 25 words. Stylometry is a statistics problem — give it something to count.';
      return;
    }

    const d = delta(left.value, right.value);

    table.innerHTML = [
      ['Words', da.words, db.words],
      ['Sentences', da.sentences, db.sentences],
      ['Avg sentence length', fmt(da.avgSentenceLength, 1), fmt(db.avgSentenceLength, 1)],
      ['Avg word length', fmt(da.avgWordLength), fmt(db.avgWordLength)],
      ['Type–token ratio', fmt(da.typeTokenRatio, 3), fmt(db.typeTokenRatio, 3)],
      ['Punctuation / 100 chars', fmt(da.punctuationDensity, 1), fmt(db.punctuationDensity, 1)],
    ]
      .map(([label, x, y]) => `<tr><th scope="row">${label}</th><td>${x}</td><td>${y}</td></tr>`)
      .join('');

    result.hidden = false;

    /* Delta is a distance. Invert it for the bar: closer means more alike. */
    const closeness = Math.max(0, Math.min(1, 1 - d / 2.2));
    bar.style.width = `${closeness * 100}%`;

    if (d < 0.95) {
      verdict.textContent = `Burrows's Delta ${fmt(d)} — the two passages read like one hand.`;
      verdict.dataset.state = 'same';
    } else if (d < 1.25) {
      verdict.textContent = `Burrows's Delta ${fmt(d)} — inconclusive. This is where a real system reaches for more features and a trained classifier.`;
      verdict.dataset.state = 'warn';
    } else {
      verdict.textContent = `Burrows's Delta ${fmt(d)} — different hands.`;
      verdict.dataset.state = 'diff';
    }
    bar.dataset.state = verdict.dataset.state;
  });
}
