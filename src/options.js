const $ = (id) => document.getElementById(id);
const shortcutBoxes = document.querySelectorAll("[data-shortcut]");

function fill(settings) {
  $("enabled").checked = settings.enabled;
  $("accounts").value = settings.blockedAccounts.join("\n");
  $("headline").value = settings.headline;
  $("subtitle").value = settings.subtitle;
  $("snooze").value = settings.snoozeOptions.join(", ");
  shortcutBoxes.forEach((box) => {
    box.checked = Boolean(settings.shortcuts[box.dataset.shortcut]);
  });
}

function read() {
  const shortcuts = {};
  shortcutBoxes.forEach((box) => {
    shortcuts[box.dataset.shortcut] = box.checked;
  });
  const snoozeOptions = $("snooze")
    .value.split(",")
    .map((v) => Math.round(Number(v.trim())))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 24 * 60);

  return {
    enabled: $("enabled").checked,
    blockedAccounts: $("accounts")
      .value.split(/[\s,]+/)
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
    headline: $("headline").value.trim() || TTP_DEFAULTS.headline,
    subtitle: $("subtitle").value.trim(),
    snoozeOptions: snoozeOptions.length ? snoozeOptions : TTP_DEFAULTS.snoozeOptions,
    shortcuts,
  };
}

function flash(message) {
  $("status").textContent = message;
  setTimeout(() => ($("status").textContent = ""), 2000);
}

async function showSnoozeStatus() {
  const until = await ttpGetSnoozeUntil();
  const el = $("snooze-status");
  if (until > Date.now()) {
    const time = new Date(until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    el.textContent = `Email is open until ${time}.`;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const settings = read();
  await ttpSaveSettings(settings);
  fill(settings);
  flash("Saved");
});

$("reset").addEventListener("click", async () => {
  await ttpSaveSettings(TTP_DEFAULTS);
  fill(TTP_DEFAULTS);
  flash("Defaults restored");
});

(async () => {
  fill(await ttpGetSettings());
  showSnoozeStatus();
})();
