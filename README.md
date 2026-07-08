# thiruvarasuthirugnanam.com

Cybersecurity portfolio. Vite + Three.js, no framework. Three.js is bundled
locally, not pulled from a CDN — zero third-party scripts in the supply chain.

---

## Run it in VS Code

Requires **Node 18+**.

```bash
npm install     # once
npm run dev     # http://localhost:5173, hot reload
```

Save any file in `src/` and the browser updates. Edit copy in `index.html`,
colours in `src/styles.css`, the helix in `src/helix.js`.

```bash
npm run build   # → dist/
npm run preview # serve dist/ exactly as it will ship
```

Run `npm run preview` before deploying — it catches issues `npm run dev` hides.

> Opening `index.html` by double-clicking will show a blank page. ES modules need
> a server. Always use `npm run dev`.

---

## Deploy — Cloudflare Pages

Hosting is Cloudflare Pages, building from GitHub. Push source, Cloudflare builds
and serves. You never touch `dist/` (it's gitignored — Cloudflare builds its own).

### One-time setup

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → authorize → pick the repo.
3. Build settings:
   - Framework preset: **Vite**
   - Build command: **`npm run build`**
   - Build output directory: **`dist`**
4. Save and Deploy → you get a `*.pages.dev` URL.

### Custom domain

Pages project → **Custom domains** → add `thiruvarasuthirugnanam.com` (and
`www.thiruvarasuthirugnanam.com`). Because the domain is registered in the same
Cloudflare account, the DNS records are added automatically and HTTPS provisions
on its own.

After setup, every `git push` to `main` rebuilds and redeploys.

---

## Layout

```
index.html                 markup + <head>, Vite entry
vite.config.js             base path, output dir
src/
  main.js                  boot: UI first, then lazy-load the helix
  ui.js                    typing, hex dump, reveals, scrollspy, depth readout
  helix.js                 Three.js scene — strands, alerts, packets, descent
  terminal.js              the shell (` to toggle)
  state.js                 the only channel between DOM and WebGL
  styles.css               design tokens live in :root
  labs/
    index.js               lazy-mounts the two labs on scroll
    stylometry.js          Burrows's Delta authorship comparison
    phishing.js            phishing triage drill
public/
  favicon.ico + PNGs       tab + home-screen icons (helix mark)
  site.webmanifest         PWA metadata
  _redirects               Cloudflare: serve index.html for any path
  assets/
    Thiruvarasu_Thirugnanam_Resume.pdf
dist/                      build output (gitignored)
```

`public/` is copied to the output root untouched. Vite's hashed bundles land in
`dist/static/`, so they never collide with the PDF or the icons.

---

## The interactive parts

Nothing is gated — a visitor who plays nothing still reads everything.

**Clickable alerts in the helix.** Eight amber nodes, one at each section's depth.
Hover reads the event, click triages you there. Desktop only.

**A shell** (`` ` `` to toggle). `help`, `whoami`, `ls`, `open <section>`, `nmap`,
`hash <text>` (real SHA-256 via SubtleCrypto), `rot13`, `resume`, `contact`, `clear`.

**Lab 01 — stylometry** (`src/labs/stylometry.js`). A working slice of the DePaul
capstone, scoring two passages with Burrows's Delta (z-score function-word rates
against a reference corpus, then mean absolute z-difference). Cosine similarity
does not work here — every English document points nearly the same direction, so
it returns ~0.99 for everything. Delta is the field-standard statistic. Same-voice
pairs land ~0.6–1.2, cross-voice ~1.2–1.6; the thresholds come from that matrix.

**Lab 02 — phishing triage** (`src/labs/phishing.js`). Four messages, two hostile,
tells revealed after each answer. Backs the resume line on phishing training.

Both labs are dynamically imported and only mount when scrolled near.

`prefers-reduced-motion: reduce` disables typing, assembly, rotation, transitions.

---

## Tuning

| What | Where |
|---|---|
| Colours | `:root` in `src/styles.css`, palette constants in `helix.js` |
| Fonts | `<link>` in `index.html`, then `--display` / `--body` / `--mono` |
| Helix density | `COUNT`, `RADIUS`, `DY`, `DTHETA` |
| Alerts | the `ALERTS` array in `helix.js` |
| Copy | plain HTML in `index.html` |
