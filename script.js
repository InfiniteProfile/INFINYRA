(() => {
  "use strict";

  // IDs remain decimal strings / BigInts. They are never converted to Number.
  const $ = (id) => document.getElementById(id);
  const feed = $("feed"), windowEl = $("profileWindow");
  const topSpacer = $("topSpacer"), bottomSpacer = $("bottomSpacer");
  const searchPanel = $("searchPanel"), searchToggle = $("searchToggle");
  const searchForm = $("searchForm"), searchInput = $("profileSearch"), searchError = $("searchError");
  const dialog = $("profileDialog"), backdrop = $("dialogBackdrop");
  const PAGE_SIZE = 36;
  const BUFFER_PAGES = 2;
  const CARD_GAP = 12;
  const namesA = ["Aether","Nyx","Vanta","Lumen","Cipher","Vesper","Astral","Onyx","Echo","Solace","Kairo","Noctis","Zephyr","Axiom","Velour","Nexa","Orion","Sable","Riven","Halo","Cinder","Eon","Lyric","Obsidian","Aurex","Nova","Umbra","Caelum","Rune","Iris","Quorra","Zyra"];
  const namesB = ["Vale","Vex","Arden","Flux","Morrow","Wren","Kestrel","Drift","Voss","Raine","Thorne","Quill","Dusk","Reign","Fable","Sorin","Vey","Ashen","Sol","Kova","Ever","Roux","Vire","Serein","Lux","Hollow","Dawn","Aven","Rook","Elian","Mistral","Oryn"];
  const palettes = [
    ["#211a39","#7961bc","#d4c5ff"],["#151e2d","#537ea8","#b7ddff"],
    ["#24172d","#a05bb0","#f0c4ff"],["#171c24","#637a8c","#d2e7f3"],
    ["#241a29","#8e557c","#f0b8df"],["#171d2b","#5f65a8","#c8caff"],
    ["#1b2020","#5d8e83","#c3eee3"],["#24202d","#9a82bd","#e0d0ff"]
  ];
  const SVG_NS = "http://www.w3.org/2000/svg";
  let baseId = 1n;
  let windowStart = 0;
  let renderedCount = 0;
  let estimatedRowHeight = 132;
  let resizeTimer = 0;
  let scheduled = false;
  let observer = null;

  function normalizeId(raw) {
    const s = String(raw).trim();
    if (!/^[0-9]+$/.test(s)) return null;
    const clean = s.replace(/^0+/, "");
    return clean.length ? clean : null;
  }
  function incrementDecimal(s, amount = 1) {
    // BigInt is exact for arbitrarily long decimal identifiers.
    return (BigInt(s) + BigInt(amount)).toString();
  }
  function decrementDecimal(s, amount = 1) {
    const n = BigInt(s) - BigInt(amount);
    return n > 0n ? n.toString() : "1";
  }
  function hashString(s) {
    // 64-bit FNV-1a, using BigInt for deterministic unsigned overflow.
    let h = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n, mask = 0xffffffffffffffffn;
    for (let i = 0; i < s.length; i++) {
      h ^= BigInt(s.charCodeAt(i));
      h = (h * prime) & mask;
    }
    return h;
  }
  function profileFor(id) {
    const h = hashString(id);
    const a = Number(h % BigInt(namesA.length));
    const b = Number((h >> 11n) % BigInt(namesB.length));
    const suffix = ((h >> 23n) % 9000n + 1000n).toString();
    const palette = palettes[Number((h >> 37n) % BigInt(palettes.length))];
    const shape = Number((h >> 43n) % 6n);
    return { id, name: `${namesA[a]} ${namesB[b]} ${suffix}`, palette, shape, seed: h.toString(16) };
  }
  function avatarSvg(profile) {
    const [c1, c2, c3] = profile.palette;
    const shape = profile.shape;
    let motif = "";
    if (shape === 0) motif = `<circle cx="50" cy="50" r="27" fill="none" stroke="${c3}" stroke-width="1.3" opacity=".85"/><circle cx="50" cy="50" r="17" fill="${c2}" opacity=".8"/><circle cx="50" cy="50" r="5" fill="${c3}"/>`;
    else if (shape === 1) motif = `<path d="M50 16 79 68 21 68Z" fill="none" stroke="${c3}" stroke-width="2"/><path d="M50 29 68 61 32 61Z" fill="${c2}" opacity=".85"/>`;
    else if (shape === 2) motif = `<path d="M50 17 81 50 50 83 19 50Z" fill="none" stroke="${c3}" stroke-width="2"/><path d="M50 31 68 50 50 69 32 50Z" fill="${c2}"/>`;
    else if (shape === 3) motif = `<path d="M50 18 C76 18 83 44 65 61 C52 73 36 70 26 56 C12 35 31 18 50 18Z" fill="none" stroke="${c3}" stroke-width="2"/><circle cx="50" cy="47" r="13" fill="${c2}"/>`;
    else if (shape === 4) motif = `<path d="M50 15 59 39 85 50 59 59 50 85 41 59 15 50 41 39Z" fill="${c3}" opacity=".9"/><circle cx="50" cy="50" r="12" fill="${c2}"/>`;
    else motif = `<circle cx="50" cy="50" r="31" fill="none" stroke="${c3}" stroke-width="1.2" stroke-dasharray="3 5"/><path d="M50 22 74 64 26 64Z" fill="${c2}" opacity=".9"/><circle cx="50" cy="51" r="7" fill="${c3}"/>`;
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="g${profile.seed}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100" height="100" fill="url(#g${profile.seed})"/><circle cx="50" cy="50" r="43" fill="none" stroke="${c3}" stroke-opacity=".13"/><g>${motif}</g><circle cx="18" cy="20" r="1.5" fill="${c3}" opacity=".7"/><circle cx="82" cy="77" r="1.2" fill="${c3}" opacity=".6"/></svg>`;
  }
  function createCard(id) {
    const p = profileFor(id);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "profile-card";
    card.dataset.profileId = p.id;
    card.setAttribute("aria-label", `Open ${p.name}, profile ${p.id}`);
    card.innerHTML = `<span class="avatar">${avatarSvg(p)}</span><span class="profile-info"><span class="profile-name"></span><span class="profile-label">IDENTITY / PROFILE</span><span class="profile-id"></span></span><span class="card-arrow" aria-hidden="true">↗</span>`;
    card.querySelector(".profile-name").textContent = p.name;
    card.querySelector(".profile-id").textContent = `#${p.id}`;
    card.addEventListener("click", () => openProfile(p.id));
    return card;
  }
  function columns() { return matchMedia("(max-width: 520px)").matches ? 1 : matchMedia("(max-width: 850px)").matches ? 2 : 3; }
  function pageHeight() {
    const sample = windowEl.querySelector(".profile-card");
    if (sample) {
      const row = sample.getBoundingClientRect().height + CARD_GAP;
      estimatedRowHeight = row * columns();
    }
    return estimatedRowHeight;
  }
  function renderWindow(start, count) {
    windowStart = Math.max(0, start);
    const frag = document.createDocumentFragment();
    const total = count;
    const endId = incrementDecimal(baseId.toString(), windowStart + total - 1);
    for (let i = 0; i < total; i++) frag.appendChild(createCard(incrementDecimal(baseId.toString(), windowStart + i)));
    windowEl.replaceChildren(frag);
    renderedCount = total;
    const rowHeight = pageHeight();
    topSpacer.style.height = `${windowStart * rowHeight / columns()}px`;
    bottomSpacer.style.height = `${Math.max(0, 1000) }px`;
  }
  function initialRender() {
    const count = PAGE_SIZE * (BUFFER_PAGES + 1);
    renderWindow(0, count);
    requestAnimationFrame(() => {
      const rowHeight = pageHeight() / columns();
      topSpacer.style.height = "0px";
      bottomSpacer.style.height = `${Math.max(1200, rowHeight * PAGE_SIZE)}px`;
    });
  }
  function appendPage() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const current = windowEl.children.length;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < PAGE_SIZE; i++) {
        frag.appendChild(createCard(incrementDecimal(baseId.toString(), windowStart + current + i)));
      }
      windowEl.appendChild(frag);
      renderedCount += PAGE_SIZE;
      const rowHeight = pageHeight() / columns();
      bottomSpacer.style.height = `${Math.max(1200, rowHeight * PAGE_SIZE)}px`;
      trimWindow();
    });
  }
  function trimWindow() {
    const cards = windowEl.children.length;
    if (cards <= PAGE_SIZE * (BUFFER_PAGES + 2)) return;
    const scrollY = window.scrollY;
    const first = windowEl.querySelector(".profile-card");
    if (!first) return;
    const rect = first.getBoundingClientRect();
    const estimatedCardHeight = rect.height + CARD_GAP;
    const rowsAbove = Math.floor(Math.max(0, -rect.top) / Math.max(1, estimatedCardHeight));
    const removeCount = Math.min(Math.floor(rowsAbove * columns()), PAGE_SIZE * columns());
    if (removeCount < PAGE_SIZE) return;
    const oldHeight = topSpacer.getBoundingClientRect().height;
    for (let i = 0; i < removeCount && windowEl.firstElementChild; i++) windowEl.firstElementChild.remove();
    windowStart += removeCount;
    const addedHeight = Math.ceil(removeCount / columns()) * estimatedCardHeight;
    topSpacer.style.height = `${oldHeight + addedHeight}px`;
    renderedCount = windowEl.children.length;
    // Keep the viewport visually anchored while discarding cards above it.
    if (window.scrollY < scrollY) window.scrollTo(0, scrollY);
  }
  function resetToId(id) {
    baseId = BigInt(id);
    windowStart = 0;
    windowEl.replaceChildren();
    topSpacer.style.height = "0px";
    bottomSpacer.style.height = "1400px";
    const count = PAGE_SIZE * (BUFFER_PAGES + 1);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) frag.appendChild(createCard(incrementDecimal(id, i)));
    windowEl.appendChild(frag);
    renderedCount = count;
    window.scrollTo({ top: 0, behavior: "auto" });
    requestAnimationFrame(() => { pageHeight(); });
  }
  function openProfile(id) {
    const p = profileFor(id);
    $("dialogAvatar").innerHTML = avatarSvg(p);
    $("dialogAvatar").style.background = p.palette[0];
    $("dialogName").textContent = p.name;
    $("dialogId").textContent = `#${p.id}`;
    $("copyStatus").textContent = "";
    $("copyId").dataset.copyValue = p.id;
    dialog.hidden = false; backdrop.hidden = false;
    $("closeDialog").focus();
  }
  function closeProfile() { dialog.hidden = true; backdrop.hidden = true; }
  function toggleSearch(force) {
    const open = typeof force === "boolean" ? force : !searchPanel.classList.contains("open");
    searchPanel.classList.toggle("open", open);
    searchPanel.setAttribute("aria-hidden", String(!open));
    searchToggle.setAttribute("aria-expanded", String(open));
    if (open) searchInput.focus();
  }

  searchToggle.addEventListener("click", () => toggleSearch());
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const id = normalizeId(searchInput.value);
    if (!id) {
      searchError.textContent = "Enter a positive whole-number profile ID.";
      searchInput.setAttribute("aria-invalid", "true");
      return;
    }
    searchError.textContent = "";
    searchInput.removeAttribute("aria-invalid");
    resetToId(id);
    toggleSearch(false);
    history.replaceState(null, "", `#profile-${id}`);
    // The target identity is opened directly; no preceding profiles are generated.
    openProfile(id);
  });
  $("closeDialog").addEventListener("click", closeProfile);
  backdrop.addEventListener("click", closeProfile);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProfile();
      if (searchPanel.classList.contains("open")) toggleSearch(false);
    }
  });
  $("copyId").addEventListener("click", async () => {
    const value = $("copyId").dataset.copyValue;
    try {
      await navigator.clipboard.writeText(value);
      $("copyStatus").textContent = "ID COPIED";
    } catch {
      const input = document.createElement("textarea");
      input.value = value; input.style.position = "fixed"; input.style.opacity = "0";
      document.body.appendChild(input); input.select();
      const ok = document.execCommand("copy"); input.remove();
      $("copyStatus").textContent = ok ? "ID COPIED" : "Select and copy the ID above.";
    }
  });

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) appendPage();
    }, { root: null, rootMargin: "1200px 0px", threshold: 0 });
    observer.observe($("sentinel"));
  } else {
    window.addEventListener("scroll", () => {
      if (window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 1800) appendPage();
    }, { passive: true });
  }
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Reflow without changing identity or current scroll position.
      const cards = [...windowEl.children];
      if (!cards.length) return;
      pageHeight();
    }, 120);
  }, { passive: true });

  initialRender();
  // Support direct URLs such as #profile-12345678901234567890.
  const match = location.hash.match(/^#profile-([0-9]+)$/);
  if (match) {
    const id = normalizeId(match[1]);
    if (id) { resetToId(id); openProfile(id); }
  }
})();