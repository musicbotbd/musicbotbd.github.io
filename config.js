// Everything that may change lives here: bot name, invite link and donation numbers.
// Leave a number empty ("") and its card is hidden.
window.SITE = {
  botName: "Music Bot",
  invite: "https://discord.com/oauth2/authorize?client_id=1553084690335015023",
  github: "https://github.com/Shahebul-Makam",
  bkash: "01674751608",  // personal bKash number for "Send Money", e.g. "01XXXXXXXXX"
  nagad: "",  // personal Nagad number for "Send Money"
};

document.addEventListener("DOMContentLoaded", () => {
  const s = window.SITE;
  document.querySelectorAll("[data-name]").forEach(e => (e.textContent = s.botName));
  document.querySelectorAll("[data-invite]").forEach(e => (e.href = s.invite));
  document.querySelectorAll("[data-github]").forEach(e => (e.href = s.github));
  document.title = document.title.replace("Music Bot", s.botName);

  let shown = 0;
  for (const kind of ["bkash", "nagad"]) {
    const card = document.querySelector(`[data-pay="${kind}"]`);
    if (!card) continue;
    if (!s[kind]) { card.remove(); continue; }
    shown++;
    card.querySelector(".num").textContent = s[kind];
    card.querySelector(".copy").addEventListener("click", () => copy(s[kind]));
  }
  const none = document.querySelector("[data-pay-none]");
  if (none) none.hidden = shown > 0;

  document.querySelectorAll("[data-year]").forEach(e => (e.textContent = new Date().getFullYear()));
});

function copy(text) {
  const done = () => toast("Number copied");
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => prompt("Copy this number:", text));
  else prompt("Copy this number:", text);
}

function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 1800);
}
