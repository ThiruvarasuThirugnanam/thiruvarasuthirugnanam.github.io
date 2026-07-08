import { state } from './state.js';

const SECTIONS = [
  'profile',
  'trace',
  'toolchain',
  'fieldwork',
  'labs',
  'research',
  'credentials',
  'handshake',
];

/* Ports mapped to things actually on the resume. */
const PORTS = [
  ['22/tcp', 'ssh', 'Linux · Bash · PowerShell'],
  ['53/udp', 'domain', 'DNS · Active Directory'],
  ['443/tcp', 'https', 'TLS · VPN · Firewalls'],
  ['445/tcp', 'microsoft-ds', 'Windows Server 2019/2022 · NTFS'],
  ['514/udp', 'syslog', 'Splunk · SIEM · log analysis'],
  ['1514/tcp', 'wazuh', 'IDS/IPS · Snort · Wazuh'],
  ['3389/tcp', 'ms-wbt-server', 'Endpoint hardening · patch management'],
  ['8834/tcp', 'nessus', 'Nessus · Nmap · Metasploit · Burp Suite'],
];

const clamp = (s) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);

export function initTerminal() {
  const shell = document.getElementById('tty');
  const out = document.getElementById('sh-out');
  const input = document.getElementById('sh-in');
  const openBtn = document.getElementById('sh-open');
  const closeBtn = document.getElementById('sh-close');
  if (!shell || !out || !input) return;

  const history = [];
  let hIndex = -1;
  let busy = false;

  const scroll = () => {
    out.scrollTop = out.scrollHeight;
  };

  function line(text = '', cls = '') {
    const div = document.createElement('div');
    if (cls) div.className = cls;
    div.innerHTML = text;
    out.appendChild(div);
    scroll();
    return div;
  }

  /* Print lines one at a time, so `nmap` feels like a scan. */
  async function stream(lines, delay = 90) {
    busy = true;
    for (const [text, cls] of lines) {
      line(text, cls);
      if (!state.reduce) await new Promise((r) => setTimeout(r, delay));
    }
    busy = false;
  }

  function open() {
    shell.hidden = false;
    shell.classList.add('up');
    setTimeout(() => input.focus(), 60);
  }

  function close() {
    shell.classList.remove('up');
    setTimeout(() => {
      shell.hidden = true;
    }, 220);
    openBtn?.focus();
  }

  const COMMANDS = {
    help() {
      line('Available commands:', 'muted');
      line(
        [
          '  <b>whoami</b>        who is behind this site',
          '  <b>ls</b>            list sections',
          '  <b>open</b> &lt;name&gt;   scroll to a section',
          '  <b>nmap</b>          scan me — ports map to skills',
          '  <b>hash</b> &lt;text&gt;   real SHA-256, computed in your browser',
          '  <b>rot13</b> &lt;text&gt;  the world&rsquo;s worst cipher',
          '  <b>resume</b>        download the PDF',
          '  <b>contact</b>       how to reach me',
          '  <b>clear</b>         wipe the screen',
        ].join('<br>')
      );
    },

    whoami() {
      line('thiruvarasu');
      line(
        'Cybersecurity and network security engineer. Miami, FL.<br>' +
          'M.S. Cybersecurity, DePaul University. 2+ years running detection,<br>' +
          'response, hardening, and compliance. Currently the sole security<br>' +
          'practitioner at Device Connect.',
        'muted'
      );
    },

    ls() {
      line(SECTIONS.map((s) => `<span class="dir">${s}/</span>`).join('  '));
      line('try: <b>open fieldwork</b>', 'muted');
    },

    open(arg) {
      if (!arg) return line('open: needs a section. try <b>ls</b>', 'err');
      const name = arg.replace(/\/$/, '').toLowerCase();
      if (!SECTIONS.includes(name)) return line(`open: no such section: ${clamp(arg)}`, 'err');
      const el = document.getElementById(name);
      line(`opening ${name}/ …`, 'muted');
      close();
      el?.scrollIntoView({ behavior: state.reduce ? 'auto' : 'smooth' });
    },

    async nmap() {
      await stream(
        [
          ['Starting Nmap ( https://nmap.org )', 'muted'],
          ['Nmap scan report for thiruvarasu (127.0.0.1)', ''],
          ['Host is up (0.00021s latency).', 'muted'],
          ['', ''],
          ['PORT       STATE SERVICE        VERSION', 'muted'],
          ...PORTS.map(([p, s, v]) => [
            `${p.padEnd(10)} <span class="ok">open</span>  ${s.padEnd(14)} <span class="dim">${v}</span>`,
            'pre',
          ]),
          ['', ''],
          ['8 ports open. 0 filtered. Nothing to see here, officer.', 'muted'],
        ],
        state.reduce ? 0 : 110
      );
    },

    async hash(...rest) {
      const text = rest.join(' ');
      if (!text) return line('hash: give me something to hash', 'err');
      if (!window.crypto?.subtle) return line('hash: SubtleCrypto needs a secure context', 'err');
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
      line(`sha256(${clamp(text)})`, 'muted');
      line(`<span class="ok">${hex}</span>`, 'pre wrap');
      line('One-way. Computed locally. Nothing left this page.', 'muted');
    },

    rot13(...rest) {
      const text = rest.join(' ');
      if (!text) return line('rot13: give me something to rotate', 'err');
      const r = text.replace(/[a-z]/gi, (c) => {
        const b = c <= 'Z' ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b);
      });
      line(clamp(r));
    },

    resume() {
      line('fetching assets/Thiruvarasu_Thirugnanam_Resume.pdf …', 'muted');
      window.open('assets/Thiruvarasu_Thirugnanam_Resume.pdf', '_blank', 'noopener');
    },

    contact() {
      line('thiruvarasuthirugnanam@outlook.com');
      line('linkedin.com/in/thiruvarasu');
      line('Miami, FL · open to remote', 'muted');
    },

    clear() {
      out.replaceChildren();
    },
  };

  COMMANDS.exit = close;
  COMMANDS.q = close;
  COMMANDS.cat = COMMANDS.open;
  COMMANDS.cd = COMMANDS.open;
  COMMANDS.man = COMMANDS.help;
  COMMANDS['?'] = COMMANDS.help;

  async function run(raw) {
    const cmd = raw.trim();
    line(`<span class="p">~$</span> ${clamp(cmd)}`, 'echo');
    if (!cmd) return;

    history.unshift(cmd);
    hIndex = -1;

    const [name, ...args] = cmd.split(/\s+/);
    const fn = COMMANDS[name.toLowerCase()];

    if (!fn) {
      line(`${clamp(name)}: command not found. try <b>help</b>`, 'err');
      return;
    }
    await fn(...args);
  }

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      if (busy) return;
      const v = input.value;
      input.value = '';
      await run(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hIndex < history.length - 1) input.value = history[++hIndex];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hIndex > 0) input.value = history[--hIndex];
      else {
        hIndex = -1;
        input.value = '';
      }
    } else if (e.key === 'Escape') {
      close();
    }
  });

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  out.addEventListener('click', () => input.focus());

  /* Backtick toggles, the way a game console does. */
  window.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
    if (e.key === '`' && !typing) {
      e.preventDefault();
      shell.hidden ? open() : close();
    }
  });

  line('thiruvarasu@portfolio — type <b>help</b>, or <b>nmap</b> if you are curious.', 'muted');
}
