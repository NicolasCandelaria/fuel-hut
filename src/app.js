// Item details dialog, mobile nav, and category nav highlight.
(() => {
  const dlg = document.getElementById('item');
  const $ = (id) => document.getElementById(id);
  let opener = null;

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('nav');
  const closeNav = () => {
    document.body.classList.remove('nav-open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Open menu');
  };
  toggle?.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  nav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNav));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });

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

  const track = document.querySelector('.brand-track');
  const prevBrand = document.querySelector('.brand-prev');
  const nextBrand = document.querySelector('.brand-next');
  if (track && prevBrand && nextBrand) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const originals = [...track.children];
    const count = originals.length;
    const before = document.createDocumentFragment();
    const after = document.createDocumentFragment();
    originals.forEach((li) => {
      const lead = li.cloneNode(true);
      const tail = li.cloneNode(true);
      lead.setAttribute('aria-hidden', 'true');
      tail.setAttribute('aria-hidden', 'true');
      before.append(lead);
      after.append(tail);
    });
    track.prepend(before);
    track.append(after);
    const loopWidth = () => {
      const start = track.children[count];
      const next = track.children[count * 2];
      if (!start || !next) return 0;
      return next.offsetLeft - start.offsetLeft;
    };
    const jump = () => {
      const width = loopWidth();
      if (width <= 0) return;
      const left = track.scrollLeft;
      if (left < width * 0.5 || left >= width * 1.5) {
        track.style.scrollBehavior = 'auto';
        track.scrollLeft = left < width * 0.5 ? left + width : left - width;
        track.style.scrollBehavior = '';
      }
    };
    const center = () => {
      const width = loopWidth();
      if (width <= 0) return;
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = width;
      track.style.scrollBehavior = '';
    };
    const step = () => {
      const item = track.children[count];
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return item ? item.getBoundingClientRect().width + gap : 180;
    };
    prevBrand.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
    nextBrand.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }));
    track.addEventListener('scroll', jump, { passive: true });
    window.addEventListener('resize', center);
    track.querySelectorAll('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', center, { once: true });
    });
    center();
  }

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
