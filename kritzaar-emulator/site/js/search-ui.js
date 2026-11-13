// Catalog search UI. Usage: mountCatalogSearch(el, { suggestUrl: 'mailto:...' })
// All catalog text is inserted with textContent; no innerHTML.
import { loadCatalog, searchGames } from '/js/catalog.js';

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  n.append(...kids);
  return n;
}

function select(label, id, options) {
  const s = el('select', { id, class: 'kz-cat-select' }, el('option', { value: '', text: 'All' }));
  for (const o of options) s.append(el('option', { value: o, text: o }));
  return el('label', { class: 'kz-cat-field', for: id }, el('span', { text: label }), s);
}

export async function mountCatalogSearch(container, { suggestUrl = '' } = {}) {
  container.textContent = '';
  const input = el('input', { type: 'search', id: 'kz-cat-q', class: 'kz-cat-input', placeholder: 'Search games', autocomplete: 'off', 'aria-label': 'Search games' });
  const status = el('p', { class: 'kz-cat-status', role: 'status', 'aria-live': 'polite' });
  const list = el('ul', { class: 'kz-cat-list' });
  const filters = el('div', { class: 'kz-cat-filters' });
  container.append(input, filters, status, list);

  let all;
  try {
    all = await loadCatalog();
  } catch (e) {
    status.textContent = e.message;
    return;
  }

  const uniq = (f) => [...new Set(all.flatMap(f))].sort();
  const platform = select('Platform', 'kz-cat-platform', uniq((g) => [g.platform]));
  const genre = select('Genre', 'kz-cat-genre', uniq((g) => g.genres));
  const license = select('License', 'kz-cat-license', uniq((g) => [g.license]));
  filters.append(platform, genre, license);

  function render() {
    const results = searchGames(input.value, {
      platform: platform.querySelector('select').value,
      genre: genre.querySelector('select').value,
      license: license.querySelector('select').value,
    });
    list.textContent = '';
    status.textContent = results.length ? `${results.length} game${results.length === 1 ? '' : 's'}` : 'No games match. Try fewer words or clear the filters.';
    for (const g of results) {
      const a = el('a', { href: `/games/${g.id}.html`, class: 'kz-cat-card' },
        el('img', { src: g.cover, alt: '', width: '160', height: '100', loading: 'lazy' }),
        el('span', { class: 'kz-cat-title', text: g.title }),
        el('span', { class: 'kz-cat-meta', text: `${g.year} · ${g.developer}` }),
        el('span', { class: 'kz-badge', text: g.license }));
      list.append(el('li', {}, a));
    }
  }

  input.addEventListener('input', render);
  container.addEventListener('change', render);
  // "/" focuses the search box unless the user is already typing somewhere.
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      input.focus();
    }
  });

  if (suggestUrl) {
    container.append(el('p', { class: 'kz-cat-suggest' }, el('a', { href: suggestUrl, text: 'Suggest a game', target: '_blank', rel: 'noopener noreferrer' })));
  }
  render();
}
