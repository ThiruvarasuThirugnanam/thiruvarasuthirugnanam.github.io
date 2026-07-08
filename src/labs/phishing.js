/**
 * Phishing triage — four messages, one at a time. Answer, then see the tells.
 *
 * This backs a real line on the resume: "trained 20+ employees on phishing risk."
 * The messages are invented for this drill. The red flags are the standard ones
 * any awareness programme teaches: lookalike domains, manufactured urgency, link
 * text that disagrees with the href, and credential capture.
 */

const ROUNDS = [
  {
    from: 'IT Helpdesk <it-support@device-c0nnect.com>',
    subject: 'ACTION REQUIRED: VPN access expires in 2 hours',
    body: `Dear User,

Our records show your VPN certificate expires today at 5:00 PM. Access to all
internal systems will be suspended until you re-validate your credentials.

Re-validate now: https://deviceconnect.com/vpn`,
    linkText: 'https://deviceconnect.com/vpn',
    linkHref: 'http://deviceconnect-vpn.secure-login.net/auth?id=9931',
    phish: true,
    tells: [
      'Sender domain is <b>device-c0nnect.com</b> — a zero standing in for the letter o.',
      'The link <i>text</i> says deviceconnect.com. The actual href goes to <b>secure-login.net</b>.',
      'Plain <b>http</b>, not https, on a page asking for credentials.',
      'Manufactured deadline. Urgency exists to stop you thinking.',
      '"Dear User" — a real helpdesk knows your name.',
    ],
  },
  {
    from: 'Jira <no-reply@yourco.atlassian.net>',
    subject: 'Thiruvarasu assigned SEC-142 to you',
    body: `Daisy assigned an issue to you.

SEC-142 — Rotate expired TLS certificate on staging load balancer
Priority: Medium
Due: Friday

View issue: https://yourco.atlassian.net/browse/SEC-142`,
    linkText: 'https://yourco.atlassian.net/browse/SEC-142',
    linkHref: 'https://yourco.atlassian.net/browse/SEC-142',
    phish: false,
    tells: [
      'Sender domain matches the service, and the link href matches the link text.',
      'No credential request, no attachment, no deadline pressure.',
      'It refers to a specific ticket and a named colleague — context an attacker would not have.',
      'Still: hover the link before you click. Being right four times does not make the fifth safe.',
    ],
  },
  {
    from: 'Microsoft 365 Security <security@micros0ft-alerts.com>',
    subject: 'Unusual sign-in activity detected',
    body: `We detected a sign-in from a new device:

  Location: Lagos, Nigeria
  IP: 197.210.x.x
  Time: 03:41 UTC

If this wasn't you, secure your account immediately.

[ Review activity ]`,
    linkText: '[ Review activity ]',
    linkHref: 'https://login.micros0ft-alerts.com/verify',
    phish: true,
    tells: [
      '<b>micros0ft-alerts.com</b> — another zero for an o. Microsoft never mails from a hyphenated lookalike.',
      'Fear, not urgency: a foreign login is engineered to make you click before reading.',
      'The "Review activity" button leads to a credential capture page on the attacker\'s domain.',
      'Legitimate sign-in alerts tell you to go to the service yourself. They do not hand you a door.',
    ],
  },
  {
    from: 'HR <hr@deviceconnect.com>',
    subject: 'Open enrollment closes Friday',
    body: `Reminder: benefits open enrollment ends this Friday.

To make changes, log in to the benefits portal directly from your bookmark
or from the intranet homepage. We will never email you a sign-in link.

Questions? Reply to this message or stop by.`,
    linkText: null,
    linkHref: null,
    phish: false,
    tells: [
      'Exact corporate domain, no lookalike characters.',
      'No link at all — it tells you to navigate there yourself.',
      'It explicitly states the organisation will never email a sign-in link. That is what good security comms looks like.',
      'A deadline exists, but it is a business deadline, not a threat.',
    ],
  },
];

export function initPhishing() {
  const root = document.getElementById('lab-phish');
  if (!root) return;

  const stage = root.querySelector('[data-stage]');
  const counter = root.querySelector('[data-counter]');
  const scoreEl = root.querySelector('[data-score]');
  const restart = root.querySelector('[data-restart]');

  let i = 0;
  let score = 0;

  const esc = (s) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);

  function renderRound() {
    const r = ROUNDS[i];
    counter.textContent = `${i + 1} / ${ROUNDS.length}`;
    scoreEl.textContent = `${score} correct`;

    stage.innerHTML = `
      <div class="mail">
        <div class="mail-hd">
          <span class="k">From</span><span class="v">${esc(r.from)}</span>
          <span class="k">Subject</span><span class="v">${esc(r.subject)}</span>
        </div>
        <pre class="mail-body">${esc(r.body)}</pre>
        ${
          r.linkText
            ? `<p class="mail-link">Link reads <code>${esc(r.linkText)}</code>
                 <span class="reveal" hidden>→ actually points to <code class="bad">${esc(r.linkHref)}</code></span></p>`
            : ''
        }
      </div>
      <div class="answers">
        <button class="ans" data-a="phish" type="button">Phishing</button>
        <button class="ans" data-a="legit" type="button">Legitimate</button>
      </div>
    `;

    stage.querySelectorAll('.ans').forEach((btn) =>
      btn.addEventListener('click', () => answer(btn.dataset.a === 'phish'))
    );
  }

  function answer(saidPhish) {
    const r = ROUNDS[i];
    const right = saidPhish === r.phish;
    if (right) score++;

    stage.querySelector('.reveal')?.removeAttribute('hidden');
    stage.querySelectorAll('.ans').forEach((b) => (b.disabled = true));

    const verdict = document.createElement('div');
    verdict.className = `tells ${right ? 'ok' : 'no'}`;
    verdict.innerHTML = `
      <p class="head">${right ? 'Correct' : 'Missed it'} — this one is
        <b>${r.phish ? 'phishing' : 'legitimate'}</b>.</p>
      <ul>${r.tells.map((t) => `<li>${t}</li>`).join('')}</ul>
      <button class="next" type="button">${i === ROUNDS.length - 1 ? 'See result' : 'Next message'}</button>
    `;
    stage.appendChild(verdict);
    verdict.querySelector('.next').addEventListener('click', next);
    verdict.querySelector('.next').focus();

    scoreEl.textContent = `${score} correct`;
  }

  function next() {
    i++;
    if (i < ROUNDS.length) return renderRound();

    counter.textContent = 'done';
    const perfect = score === ROUNDS.length;
    stage.innerHTML = `
      <div class="final">
        <p class="big">${score} / ${ROUNDS.length}</p>
        <p>${
          perfect
            ? 'Clean sweep. You would have survived the drill I ran for twenty-odd colleagues at Databels.'
            : score >= 3
              ? 'Solid. The one you missed is the one that would have cost you.'
              : 'This is why awareness training exists. The tells are learnable, and that is the whole point.'
        }</p>
      </div>
    `;
    restart.hidden = false;
    restart.focus();
  }

  restart.addEventListener('click', () => {
    i = 0;
    score = 0;
    restart.hidden = true;
    renderRound();
  });

  renderRound();
}
