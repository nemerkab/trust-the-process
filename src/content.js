// Trust the Process — content script for mail.google.com.
// Puts a full-screen overlay over Gmail with shortcuts to other Google apps
// and a deliberately low-key way to get into email anyway.

(() => {
  const ACCOUNT_DETECT_TIMEOUT_MS = 15000;
  const EMAIL_IN_TITLE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

  const ICONS = {
    chat: '<path d="M4 5h16v11H8l-4 4z"/>',
    calendar:
      '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    meet: '<rect x="3" y="6" width="12" height="12" rx="2"/><path d="M15 10.5l6-3.5v10l-6-3.5z"/>',
    drive: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    admin: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  };

  function accountIndex() {
    const match = location.pathname.match(/\/u\/(\d+)/);
    return match ? match[1] : "0";
  }

  function shortcutList(settings) {
    const u = accountIndex();
    const all = [
      { id: "chat", label: "Chat", url: `https://chat.google.com/u/${u}/` },
      { id: "calendar", label: "Calendar", url: `https://calendar.google.com/calendar/u/${u}/r` },
      { id: "meet", label: "Meet", url: `https://meet.google.com/?authuser=${u}` },
      { id: "drive", label: "Drive", url: `https://drive.google.com/drive/u/${u}/my-drive` },
      { id: "admin", label: "Admin", url: `https://admin.google.com/?authuser=${u}` },
    ];
    return all.filter((s) => settings.shortcuts[s.id]);
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  const STYLES = `
    :host {
      all: initial;
      --bg: #0d0f12;
      --bg-glow: rgba(120, 140, 255, 0.16);
      --fg: #f4f2ee;
      --muted: rgba(244, 242, 238, 0.62);
      --faint: rgba(244, 242, 238, 0.38);
      --tile: rgba(255, 255, 255, 0.06);
      --tile-hover: rgba(255, 255, 255, 0.12);
      --tile-border: rgba(255, 255, 255, 0.1);
      --focus: #9fb0ff;
    }
    @media (prefers-color-scheme: light) {
      :host {
        --bg: #f6f3ee;
        --bg-glow: rgba(255, 190, 120, 0.28);
        --fg: #16181c;
        --muted: rgba(22, 24, 28, 0.64);
        --faint: rgba(22, 24, 28, 0.42);
        --tile: rgba(0, 0, 0, 0.04);
        --tile-hover: rgba(0, 0, 0, 0.08);
        --tile-border: rgba(0, 0, 0, 0.08);
        --focus: #3d55d6;
      }
    }
    .overlay {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: clamp(32px, 6vh, 72px);
      padding: 24px;
      box-sizing: border-box;
      background:
        radial-gradient(ellipse 80% 60% at 50% 35%, var(--bg-glow), transparent 70%),
        var(--bg);
      color: var(--fg);
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: auto;
    }
    /* The backdrop is opaque from the first frame so the inbox never shows through. */
    .overlay > * { animation: rise-in 320ms ease-out both; }
    .overlay > :nth-child(2) { animation-delay: 60ms; }
    .overlay > :nth-child(3) { animation-delay: 120ms; }
    @keyframes rise-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .overlay > * { animation: none; } }

    .hero { width: 90vw; max-width: 1600px; text-align: center; }
    h1 {
      margin: 0;
      font-size: clamp(44px, 9vw, 180px);
      line-height: 0.95;
      font-weight: 800;
      letter-spacing: -0.035em;
    }
    .subtitle {
      margin: 0.6em 0 0;
      font-size: clamp(18px, 2.4vw, 40px);
      font-weight: 400;
      color: var(--muted);
      letter-spacing: -0.01em;
    }

    .shortcuts {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .shortcut {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      width: 112px;
      padding: 18px 8px 14px;
      box-sizing: border-box;
      border: 1px solid var(--tile-border);
      border-radius: 16px;
      background: var(--tile);
      color: var(--fg);
      text-decoration: none;
      font-size: 15px;
      font-weight: 500;
      transition: background 120ms ease, transform 120ms ease;
    }
    .shortcut:hover { background: var(--tile-hover); transform: translateY(-2px); }
    .shortcut svg {
      width: 28px; height: 28px;
      fill: none; stroke: currentColor; stroke-width: 1.6;
      stroke-linecap: round; stroke-linejoin: round;
    }
    .key {
      font-size: 11px;
      color: var(--faint);
      font-variant-numeric: tabular-nums;
    }

    .escape { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; min-height: 36px; }
    .escape p { margin: 0 6px 0 0; font-size: 14px; color: var(--muted); }
    button {
      font: inherit;
      font-size: 14px;
      color: var(--faint);
      background: none;
      border: 1px solid transparent;
      border-radius: 999px;
      padding: 7px 14px;
      cursor: pointer;
    }
    button:hover { color: var(--fg); }
    .escape.choosing button { border-color: var(--tile-border); color: var(--muted); }
    .escape.choosing button:hover { background: var(--tile-hover); color: var(--fg); }
    .escape.choosing button.cancel { border-color: transparent; }

    a:focus-visible, button:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
  `;

  let settings = null;
  let host = null;
  let shadow = null;
  let visible = false;
  let rearmTimer = null;
  let accountAllowed = null; // null = unknown yet, true = not blocked, false = blocked
  let titleObserver = null;
  let rootObserver = null;

  function render() {
    const shortcuts = shortcutList(settings);
    const tiles = shortcuts
      .map(
        (s, i) => `
        <li><a class="shortcut" href="${s.url}" target="_top" data-key="${i + 1}">
          <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[s.id]}</svg>
          <span>${s.label}</span>
          <span class="key" aria-hidden="true">${i + 1}</span>
        </a></li>`
      )
      .join("");

    shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="ttp-headline">
        <div class="hero">
          <h1 id="ttp-headline">${escapeHtml(settings.headline)}</h1>
          <p class="subtitle">${escapeHtml(settings.subtitle)}</p>
        </div>
        ${tiles ? `<ul class="shortcuts" aria-label="Other apps">${tiles}</ul>` : ""}
        <div class="escape"></div>
      </div>
    `;
    renderEscape(false);
  }

  function renderEscape(choosing) {
    const escape = shadow.querySelector(".escape");
    escape.classList.toggle("choosing", choosing);
    if (!choosing) {
      escape.innerHTML = `<button type="button" class="open">Open email anyway</button>`;
      escape.querySelector(".open").addEventListener("click", () => {
        renderEscape(true);
        escape.querySelector("button").focus();
      });
      return;
    }
    const options = settings.snoozeOptions
      .map((m) => `<button type="button" data-minutes="${m}">${m} min</button>`)
      .join("");
    escape.innerHTML = `
      <p>Are you sure? Open email for</p>
      ${options}
      <button type="button" class="cancel">Never mind</button>
    `;
    escape.querySelectorAll("[data-minutes]").forEach((btn) => {
      btn.addEventListener("click", () => snooze(Number(btn.dataset.minutes)));
    });
    escape.querySelector(".cancel").addEventListener("click", () => {
      renderEscape(false);
      escape.querySelector("button").focus();
    });
  }

  async function snooze(minutes) {
    await ttpSetSnoozeUntil(Date.now() + minutes * 60 * 1000);
    // storage.onChanged handles hiding in this and every other Gmail tab.
  }

  // Keep keystrokes from reaching Gmail (its single-key shortcuts would act on
  // the hidden inbox) while still letting the overlay itself be used by keyboard.
  function onKeyCapture(event) {
    if (!visible) return;
    if (event.composedPath().includes(host)) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    if (event.type === "keydown") focusFirst();
  }

  function onKeyInOverlay(event) {
    event.stopPropagation();
    if (event.type !== "keydown" || event.metaKey || event.ctrlKey || event.altKey) return;
    const link = shadow.querySelector(`a[data-key="${event.key}"]`);
    if (link) {
      event.preventDefault();
      link.click();
    }
  }

  function focusFirst() {
    const target = shadow && shadow.querySelector("a, button");
    if (target) target.focus();
  }

  function ensureHost() {
    if (host) return;
    host = document.createElement("ttp-overlay");
    host.style.cssText =
      "position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;";
    shadow = host.attachShadow({ mode: "closed" });
    ["keydown", "keypress", "keyup"].forEach((type) => host.addEventListener(type, onKeyInOverlay));
  }

  function show() {
    if (visible) return;
    ensureHost();
    render();
    visible = true;
    attachHost();
    // Gmail rebuilds the page as it boots; put the overlay back if it gets removed.
    rootObserver = new MutationObserver(attachHost);
    rootObserver.observe(document.documentElement, { childList: true });
    focusFirst();
    setTimeout(focusFirst, 1000);
  }

  function attachHost() {
    if (visible && host.parentNode !== document.documentElement) {
      document.documentElement.appendChild(host);
    }
  }

  function hide() {
    if (!visible) return;
    visible = false;
    if (rootObserver) rootObserver.disconnect();
    rootObserver = null;
    host.remove();
  }

  // When a list of blocked accounts is configured, read the signed-in address
  // from Gmail's tab title ("Inbox - you@company.com - Gmail").
  function watchAccount() {
    if (titleObserver || accountAllowed !== null) return;
    const check = () => {
      const match = document.title.match(EMAIL_IN_TITLE);
      if (!match) return false;
      const email = match[0].toLowerCase();
      accountAllowed = !settings.blockedAccounts.includes(email);
      stopWatchingAccount();
      update();
      return true;
    };
    if (check()) return;
    titleObserver = new MutationObserver(check);
    titleObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    // If we never learn the account, stay blocked (fail closed).
    setTimeout(stopWatchingAccount, ACCOUNT_DETECT_TIMEOUT_MS);
  }

  function stopWatchingAccount() {
    if (titleObserver) titleObserver.disconnect();
    titleObserver = null;
  }

  async function update() {
    clearTimeout(rearmTimer);
    if (!settings.enabled) return hide();

    if (settings.blockedAccounts.length > 0) {
      if (accountAllowed === null) watchAccount();
      if (accountAllowed === true) return hide();
    }

    const snoozeUntil = await ttpGetSnoozeUntil();
    if (accountAllowed === true) return hide();
    const remaining = snoozeUntil - Date.now();
    if (remaining > 0) {
      hide();
      rearmTimer = setTimeout(update, remaining + 50);
      return;
    }
    show();
  }

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === "sync" && changes[TTP_STORAGE_KEYS.settings]) {
      settings = await ttpGetSettings();
      accountAllowed = null;
      stopWatchingAccount();
      if (visible) render();
      update();
    }
    if (area === "local" && changes[TTP_STORAGE_KEYS.snoozeUntil]) {
      update();
    }
  });

  ["keydown", "keypress", "keyup"].forEach((type) =>
    window.addEventListener(type, onKeyCapture, true)
  );

  // Timers in background tabs can be throttled; re-check when the tab returns.
  document.addEventListener("visibilitychange", () => {
    if (settings && document.visibilityState === "visible") update();
  });

  (async () => {
    settings = await ttpGetSettings();
    update();
  })();
})();
