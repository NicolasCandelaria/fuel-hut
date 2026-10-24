// Item details dialog and category nav highlight.
(() => {
  const dlg = document.getElementById('item');
  const $ = (id) => document.getElementById(id);
  let opener = null;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.plate');
    if (!btn || !dlg) return;
    const m = (window.MENU || {})[btn.dataset.slug];
    if (!m) return;
    opener = btn;
    $('item-img').src = m.img;
    $('item-img').alt = m.t;
    $('item-cat').textContent = m.c + (m.g ? ', ' + m.g.toLowerCase() : '');
    $('item-name').textContent = m.t;
    $('item-ing').textContent = m.i;
    $('item-desc').textContent = m.d || '';
    $('item-desc').hidden = !m.d;
    const fmt = (v) => (v || '').replace(/\s*·\s*/g, ', ').replace(/OZ/g, 'oz');
    $('item-price').textContent = m.s && m.s.includes('$') ? fmt(m.s) : [m.p, fmt(m.s)].filter(Boolean).join(', ');
    $('item-extra').textContent = (m.x || '').replace(/\s*·\s*/g, ', ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
    $('item-extra').hidden = !m.x;
    dlg.showModal();
  });

  dlg?.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg?.addEventListener('close', () => opener?.focus());

  const links = [...document.querySelectorAll('.cats a')];
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  // Keep the active chip visible in the horizontal cats strip only —
  // never call scrollIntoView on the link (that scrolls the page and fights the wheel).
  const showChip = (a) => {
    const nav = a?.closest('ul');
    if (!a || !nav) return;
    const pad = 16;
    const left = a.offsetLeft - pad;
    const right = a.offsetLeft + a.offsetWidth + pad;
    if (left < nav.scrollLeft) nav.scrollTo({ left, behavior: 'smooth' });
    else if (right > nav.scrollLeft + nav.clientWidth) nav.scrollTo({ left: right - nav.clientWidth, behavior: 'smooth' });
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        const a = map.get(en.target.id);
        if (a) { a.setAttribute('aria-current', 'true'); showChip(a); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.cat').forEach((s) => io.observe(s));
  }
})();
