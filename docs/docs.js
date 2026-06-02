/* lifecycle-map · docs/docs.js
 * Bootstrap for the documentation site. Content lives in
 * docs/sections/{en,pt,es}.js — each registers onto window.LifecycleDocs.<lang>.
 *
 * Default language: query string `?lang=` > browser preference > en.
 * Section routing via hash (`#what`, `#quickstart`, ...).
 */
(function () {
  'use strict';

  const SECTIONS = window.LifecycleDocs || {};
  if (!SECTIONS.en) {
    document.getElementById('main').innerHTML =
      '<p style="color:#b91c1c">Failed to load documentation sections. Reload the page.</p>';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const langParam = params.get('lang');
  const browserLang = (navigator.language || 'en').slice(0, 2);
  const lang = SECTIONS[langParam] ? langParam
             : (SECTIONS[browserLang] ? browserLang : 'en');

  const sectionId = window.location.hash.slice(1) || 'what';

  // ============ sidebar ============
  const nav = document.getElementById('sidebar-nav');
  const ul = document.createElement('ul');
  SECTIONS[lang].forEach(s => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + s.id;
    a.textContent = s.label;
    a.dataset.section = s.id;
    if (s.id === sectionId) a.classList.add('active');
    li.appendChild(a);
    ul.appendChild(li);
  });
  nav.appendChild(ul);

  // ============ lang switch ============
  document.querySelectorAll('#lang-switch a').forEach(a => {
    if (a.dataset.lang === lang) a.classList.add('active');
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = `?lang=${a.dataset.lang}${window.location.hash}`;
    });
  });

  // ============ main render ============
  const main = document.getElementById('main');
  function renderSection(id) {
    const section = SECTIONS[lang].find(s => s.id === id) || SECTIONS[lang][0];
    main.innerHTML = section.render();
    document.querySelectorAll('#sidebar-nav a').forEach(a => {
      a.classList.toggle('active', a.dataset.section === section.id);
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  renderSection(sectionId);

  // intercept nav clicks → replaceState + render (no full reload)
  document.getElementById('sidebar-nav').addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    const id = a.dataset.section;
    history.replaceState(null, '', `?lang=${lang}#${id}`);
    renderSection(id);
  });

  // browser back/forward between sections
  window.addEventListener('hashchange', () => {
    renderSection(window.location.hash.slice(1) || 'what');
  });
})();
