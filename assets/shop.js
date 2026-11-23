(function () {
  'use strict';

  var toggle = document.querySelector('.site-nav-toggle');
  var tabs = document.getElementById('filter-tabs');
  var search = document.getElementById('product-search');
  var suggestions = document.getElementById('search-suggestions');
  var sortSelect = document.getElementById('product-sort');
  var grid = document.getElementById('product-grid');
  var status = document.getElementById('shop-status');
  var resultCount = document.getElementById('shop-result-count');
  var loadMoreBtn = document.getElementById('load-more');
  var facetGroups = document.getElementById('facet-groups');
  var mobileFacetGroups = document.getElementById('mobile-facet-groups');
  var productDialog = document.getElementById('product-detail');
  var productDetail = document.getElementById('product-detail-content');
  var drawerDialog = document.getElementById('mobile-filter-drawer');
  if (!search || !grid) return;

  var CHUNK_SIZE = 24;
  var families = [];
  var skuById = {};
  var variantBySku = {};
  var activeState = { query: '', category: [], price: [], size: [], color: [], availability: [], sort: 'featured', sub: [] };
  // The shop's tabs and their subcategories from Square (the Site Manager's
  // Categories screen), once the live feed has loaded. Until then the
  // collection map below groups the bundled catalogue.
  var liveTree = null;
  var FACET_KEYS = ['category', 'sub', 'price', 'size', 'color', 'availability'];
  var renderedCount = CHUNK_SIZE;
  var searchTimer = null;
  var activeSuggestion = -1;
  var suggestionsOpen = false;
  var dialogOpener = null;
  var expandedFacets = {};
  var FACET_OPTION_LIMIT = 12;
  var familyGroups = ['Socks', 'Yarn & Fiber', 'Apparel & Accessories', 'Bath & Body', 'Stuffies & Kids', 'Blankets & Home', 'Gift Certificates', 'Seasonal'];
  var priceBands = [
    { value: 'under-25', label: 'Under $25', test: function (price) { return price < 25; } },
    { value: '25-50', label: '$25–$49', test: function (price) { return price >= 25 && price < 50; } },
    { value: '50-100', label: '$50–$99', test: function (price) { return price >= 50 && price < 100; } },
    { value: '100-plus', label: '$100+', test: function (price) { return price >= 100; } }
  ];
  var collectionToGroup = {
    'Socks': 'Socks', 'My Comfy Socks': 'Socks', 'Outdoors Socks': 'Socks', 'Paca Socks': 'Socks', 'Dress Socks': 'Socks', 'Slipper Socks': 'Socks', 'Sport Socks': 'Socks',
    'Cascade Yarns': 'Yarn & Fiber', 'Roving': 'Yarn & Fiber', 'Alpaca Lace Yarns': 'Yarn & Fiber', 'Pure Alpaca Yarns': 'Yarn & Fiber', 'Salar Yarns': 'Yarn & Fiber', 'Luna': 'Yarn & Fiber', 'Luna Paints': 'Yarn & Fiber', 'Rabat': 'Yarn & Fiber', 'Baby Chunky Alpaca': 'Yarn & Fiber', 'Yarn': 'Yarn & Fiber', 'Bulky': 'Yarn & Fiber', 'Hand Dyed Yarns': 'Yarn & Fiber',
    'Accessories': 'Apparel & Accessories', 'Bags': 'Apparel & Accessories', 'Fingerless Mittens and Gloves': 'Apparel & Accessories', 'Gloves': 'Apparel & Accessories', 'Hats': 'Apparel & Accessories', 'Mittens': 'Apparel & Accessories', 'Scarves': 'Apparel & Accessories', 'Sweaters': 'Apparel & Accessories', 'Simply Natural': 'Apparel & Accessories', 'our faves': 'Apparel & Accessories', 'New England Alpaca Fiber Pool': 'Apparel & Accessories',
    'All Natural Soaps': 'Bath & Body', 'Bath Bombs & Salts': 'Bath & Body', 'Scrubs': 'Bath & Body', 'Soaps, Scrubs & Bath': 'Bath & Body', 'Washcloth Soap': 'Bath & Body', 'Wax Tart Melts': 'Bath & Body',
    'Kids Things': 'Stuffies & Kids', 'Stuffies': 'Stuffies & Kids', 'Blankets': 'Blankets & Home', 'Household': 'Blankets & Home', 'Gift Certificates': 'Gift Certificates', 'Christmas': 'Seasonal', 'Seasonal Specials': 'Seasonal'
  };

  function route(name) {
    var base = document.querySelector('base');
    return new URL(name, base ? base.href : new URL('./', location.href).href).pathname;
  }
  function normalize(value) { return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function unique(values) { return Array.from(new Set(values.filter(Boolean))); }
  function groupFor(family) { return family.group || collectionToGroup[family.category] || 'Apparel & Accessories'; }
  function imageList(product) { return (product && (product.images_local || product.images)) || []; }
  function firstImage(product) { return imageList(product)[0] || ''; }
  // The catalogue records each photo's real short edge at build time. Half the imported
  // imagery is 100px or 180px supplier thumbnails, and stretching one of those across a
  // 250px card is what reads as "poor image quality" — so anything that cannot fill the
  // frame is shown inside it at a size it can carry rather than upscaled into mush.
  var CRISP_MIN_PX = 240;
  function heroPx(product) { return Number(product && (product.heroPx || (product.images_px || [])[0])) || 0; }
  function heroFit(product) { var px = heroPx(product); return px && px < CRISP_MIN_PX ? 'contain' : 'cover'; }
  // Supplier copy arrives with decorative lead-ins ("✅ EXTRA COMFORT :") and runs to
  // several hundred characters. The card wants one clean sentence; the full text stays
  // in Quick view.
  // 36 of the 243 imported descriptions lost a line break during the Wix export and now
  // run two words together — "100% baby alpaca ... lace weight yarnCascade color 1234",
  // "50% Silk 50% AlpacaYardage 273 yards". Rejoining on the lowercase-to-uppercase seam
  // is safe here: the catalogue contains no deliberate camelCase.
  function cleanCopy(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().replace(/([a-z]{2,})([A-Z][a-z]{2,})/g, '$1 $2');
  }
  function teaser(value, limit) {
    var max = limit || 110;
    var text = cleanCopy(value);
    text = text.replace(/^[^\p{L}\p{N}]+/u, '');
    text = text.replace(/^[\p{Lu}\p{N} &'/-]{3,40}\s*[:—-]\s*/u, '');
    if (!text) return '';
    var out = '';
    // Decimals are not sentence endings. Splitting naively on "." cut the tote bag's
    // teaser at "Grocery Tote Bag (14\"w x 15." — guard digit.digit, split, restore.
    var GUARD = '\u0000';
    var sentences = (text.replace(/(\d)\.(\d)/g, '$1' + GUARD + '$2').match(/[^.!?]+[.!?]*/g) || [text])
      .map(function (part) { return part.split(GUARD).join('.'); });
    for (var index = 0; index < sentences.length; index++) {
      var next = (out + sentences[index]).trim();
      if (out && next.length > max) break;
      out = next;
      if (out.length >= max) break;
    }
    if (out.length > max) {
      var clipped = out.slice(0, max);
      var space = clipped.lastIndexOf(' ');
      out = (space > max * 0.6 ? clipped.slice(0, space) : clipped).replace(/[,;:\s]+$/, '') + '…';
    }
    return out;
  }
  function shortDescription(value) { var text = value || ''; if (text.length <= 180) return text; var clipped = text.slice(0, 177); var space = clipped.lastIndexOf(' '); return clipped.slice(0, space > 120 ? space : 177) + '…'; }
  function addText(parent, tag, className, value) { var element = document.createElement(tag); if (className) element.className = className; element.textContent = value; parent.appendChild(element); return element; }
  function productsFor(family) { return (family.skus || []).map(function (sku) { return skuById[sku]; }).filter(Boolean); }
  function variantForProduct(family, product) { return variantBySku[product && product.sku] || (family.variants || []).find(function (variant) { return variant.sku === (product && product.sku); }) || { selections: {} }; }
  // With the live Square feed loaded, stock is real per SKU. Without it (the
  // static fallback), multi-variant families have no per-SKU counts to trust.
  var liveCatalog = false;
  function isAvailable(family, product) { return Number(product && product.qty) > 0 || (!liveCatalog && (family.skus || []).length > 1); }
  function priceBand(price) { return priceBands.find(function (band) { return band.test(Number(price)); }); }
  function priceLabel(family) {
    var prices = productsFor(family).map(function (product) { return Number(product.price || 0); }).filter(function (price) { return price >= 0; });
    if (!prices.length) return 'Price unavailable';
    var low = Math.min.apply(null, prices), high = Math.max.apply(null, prices);
    return low === high ? '$' + low.toFixed(2) : '$' + low.toFixed(2) + '–$' + high.toFixed(2);
  }
  function familyPrice(family) { var prices = productsFor(family).map(function (product) { return Number(product.price || 0); }); return prices.length ? Math.min.apply(null, prices) : 0; }
  function optionValues(family, optionName) {
    var option = (family.options || []).find(function (entry) { return normalize(entry.name) === normalize(optionName); });
    var values = option ? option.choices.map(function (choice) { return choice.value; }) : [];
    if (!values.length) values = (family.variants || []).map(function (variant) { return variant.selections && variant.selections[optionName]; });
    return unique(values);
  }
  function facetValues(family, product, key) {
    if (key === 'category') return [groupFor(family)];
    if (key === 'sub') return family.sub ? [family.sub] : [];
    if (key === 'price') { var band = priceBand(product.price); return band ? [band.value] : []; }
    if (key === 'availability') return [isAvailable(family, product) ? 'in-stock' : 'sold-out'];
    var variant = variantForProduct(family, product);
    var optionName = key === 'size' ? 'Size' : 'Color';
    return [variant.selections && variant.selections[optionName]].filter(Boolean);
  }
  function allFacetValues(family, product, key) {
    if (key === 'size' || key === 'color') return facetValues(family, product, key).length ? facetValues(family, product, key) : optionValues(family, key === 'size' ? 'Size' : 'Color');
    return facetValues(family, product, key);
  }
  function editDistance(a, b) {
    var row = Array.from({ length: b.length + 1 }, function (_, index) { return index; });
    for (var i = 1; i <= a.length; i += 1) {
      var next = [i];
      for (var j = 1; j <= b.length; j += 1) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      row = next;
    }
    return row[b.length];
  }
  function searchScore(family, query) {
    if (!query) return 1;
    var normalizedQuery = normalize(query);
    var text = family.searchText || '';
    if (text.indexOf(normalizedQuery) !== -1) return 100;
    var queryWords = normalizedQuery.split(' ').filter(Boolean);
    var words = text.split(' ');
    var score = 0;
    queryWords.forEach(function (queryWord) {
      var best = 0;
      words.forEach(function (word) {
        if (word.indexOf(queryWord) === 0) best = Math.max(best, 80);
        else if (queryWord.length >= 3 && Math.abs(word.length - queryWord.length) <= 2) {
          var distance = editDistance(queryWord, word);
          if (distance <= 1) best = Math.max(best, 60);
          else if (distance <= 2) best = Math.max(best, 35);
        }
      });
      score += best;
    });
    return score === queryWords.length * 80 ? score + 10 : score;
  }
  function matchesSearch(family) { return searchScore(family, activeState.query) > 0; }
  function selectedValues(key) { return activeState[key] || []; }
  function productMatchesFacet(family, product, skipKey) {
    return FACET_KEYS.every(function (key) {
      // Counting tabs ignores the subcategory picked inside one of them.
      if (key === skipKey || (skipKey === 'category' && key === 'sub')) return true;
      var selected = selectedValues(key);
      return !selected.length || selected.some(function (value) { return allFacetValues(family, product, key).indexOf(value) !== -1; });
    });
  }
  function familyMatches(family, skipKey) { return matchesSearch(family) && productsFor(family).some(function (product) { return productMatchesFacet(family, product, skipKey); }); }
  function matchingFamilies(skipKey) { return families.filter(function (family) { return familyMatches(family, skipKey); }); }
  function matchingVariantCount(family) { return productsFor(family).filter(function (product) { return productMatchesFacet(family, product); }).length; }
  function facetCount(key, value) {
    return families.filter(function (family) {
      if (!matchesSearch(family)) return false;
      return productsFor(family).some(function (product) { return productMatchesFacet(family, product, key) && allFacetValues(family, product, key).indexOf(value) !== -1; });
    }).length;
  }
  function facetOptions(key) {
    if (key === 'category') return familyGroups.map(function (value) { return { value: value, label: value }; });
    if (key === 'sub') return subOptions();
    if (key === 'price') return priceBands.map(function (band) { return { value: band.value, label: band.label }; });
    if (key === 'availability') return [{ value: 'in-stock', label: 'Available' }, { value: 'sold-out', label: 'Sold out' }];
    var optionName = key === 'size' ? 'Size' : 'Color';
    var values = unique(families.flatMap(function (family) { return optionValues(family, optionName); }));
    return values.sort(function (a, b) { return a.localeCompare(b); }).map(function (value) { return { value: value, label: value }; });
  }
  // Subcategories of the one tab picked, in Square's order, if it has any.
  function subOptions() {
    if (activeState.category.length !== 1) return [];
    var group = activeState.category[0];
    var used = unique(families.filter(function (family) { return groupFor(family) === group; }).map(function (family) { return family.sub; }));
    var entry = (liveTree || []).find(function (top) { return top.name === group; });
    var order = entry ? entry.subs.filter(function (name) { return used.indexOf(name) !== -1; }) : [];
    return order.concat(used.filter(function (name) { return order.indexOf(name) === -1; }).sort()).map(function (value) { return { value: value, label: value }; });
  }
  function facetLabel(key) { return key === 'category' ? 'Category' : key === 'sub' ? 'Type' : key.charAt(0).toUpperCase() + key.slice(1); }
  function renderFacetControls(container) {
    if (!container) return;
    container.replaceChildren();
    FACET_KEYS.forEach(function (key) {
      if (key === 'sub' && !subOptions().length) return;
      var fieldset = document.createElement('fieldset'); fieldset.className = 'facet-group';
      var legend = document.createElement('legend'); legend.textContent = facetLabel(key); fieldset.appendChild(legend);
      var options = facetOptions(key);
      var expansionKey = (container === mobileFacetGroups ? 'mobile-' : 'desktop-') + key;
      var canCollapse = (key === 'size' || key === 'color') && options.length > FACET_OPTION_LIMIT;
      var visibleOptions = options;
      if (canCollapse && !expandedFacets[expansionKey]) {
        var selected = selectedValues(key);
        // Picked ones first, then ones that still match something, so a narrowed
        // shop does not open the short list on a run of greyed-out zeros.
        var picked = function (option) { return selected.indexOf(option.value) !== -1; };
        visibleOptions = options.filter(picked)
          .concat(options.filter(function (option) { return !picked(option) && facetCount(key, option.value); }))
          .concat(options.filter(function (option) { return !picked(option) && !facetCount(key, option.value); }))
          .slice(0, FACET_OPTION_LIMIT);
      }
      visibleOptions.forEach(function (option, index) {
        var count = facetCount(key, option.value); var row = document.createElement('div'); row.className = 'facet-option' + (count ? '' : ' is-disabled');
        var label = document.createElement('label'); var id = 'facet-' + key + '-' + index + '-' + (container === mobileFacetGroups ? 'mobile' : 'desktop');
        var input = document.createElement('input'); input.type = 'checkbox'; input.id = id; input.value = option.value; input.checked = selectedValues(key).indexOf(option.value) !== -1; input.disabled = !count && !input.checked;
        input.addEventListener('change', function () { toggleFacet(key, option.value); });
        label.htmlFor = id; label.appendChild(input); label.appendChild(document.createTextNode(option.label)); row.appendChild(label);
        var countText = document.createElement('span'); countText.className = 'facet-count'; countText.textContent = String(count); countText.setAttribute('aria-label', count + ' matching families'); row.appendChild(countText); fieldset.appendChild(row);
      });
      if (canCollapse) {
        var more = document.createElement('button'); more.type = 'button'; more.className = 'facet-more';
        var remaining = Math.max(0, options.length - visibleOptions.length);
        more.textContent = expandedFacets[expansionKey] ? 'Show fewer ' + key + 's' : 'Show ' + remaining + ' more ' + key + 's';
        more.setAttribute('aria-expanded', String(Boolean(expandedFacets[expansionKey])));
        more.addEventListener('click', function () { expandedFacets[expansionKey] = !expandedFacets[expansionKey]; renderFacetControls(container); });
        fieldset.appendChild(more);
      }
      container.appendChild(fieldset);
    });
  }
  function renderTabs() {
    if (!tabs) return;
    tabs.replaceChildren();
    var allTab = document.createElement('button'); allTab.type = 'button'; allTab.className = 'filter-tab'; allTab.dataset.filter = 'All'; allTab.setAttribute('role', 'tab'); allTab.setAttribute('aria-selected', String(!activeState.category.length)); allTab.textContent = 'All'; allTab.addEventListener('click', function () { activeState.category = []; activeState.sub = []; commitState('push'); }); tabs.appendChild(allTab);
    familyGroups.forEach(function (value) {
      var tab = document.createElement('button'); tab.type = 'button'; tab.className = 'filter-tab'; tab.dataset.filter = value; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(activeState.category.length === 1 && activeState.category[0] === value));
      tab.appendChild(document.createTextNode(value + ' ')); var count = document.createElement('span'); count.className = 'filter-count'; count.textContent = '(' + facetCount('category', value) + ')'; tab.appendChild(count);
      tab.addEventListener('click', function () { activeState.category = activeState.category.length === 1 && activeState.category[0] === value ? [] : [value]; activeState.sub = []; commitState('push'); }); tabs.appendChild(tab);
    });
    renderSubTabs();
  }
  // A second, smaller row under the tabs for the picked tab's subcategories.
  function renderSubTabs() {
    var row = document.getElementById('filter-subtabs');
    if (!row) { row = document.createElement('div'); row.id = 'filter-subtabs'; row.className = 'filter-tabs filter-subtabs'; row.setAttribute('role', 'tablist'); row.setAttribute('aria-label', 'Filter by type'); tabs.insertAdjacentElement('afterend', row); }
    row.replaceChildren();
    var options = subOptions();
    row.hidden = !options.length;
    if (!options.length) return;
    var group = activeState.category[0];
    var all = document.createElement('button'); all.type = 'button'; all.className = 'filter-tab'; all.setAttribute('role', 'tab'); all.setAttribute('aria-selected', String(!activeState.sub.length)); all.textContent = 'All ' + group; all.addEventListener('click', function () { activeState.sub = []; commitState('push'); }); row.appendChild(all);
    options.forEach(function (option) {
      var tab = document.createElement('button'); tab.type = 'button'; tab.className = 'filter-tab'; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(activeState.sub.length === 1 && activeState.sub[0] === option.value));
      tab.appendChild(document.createTextNode(option.label + ' ')); var count = document.createElement('span'); count.className = 'filter-count'; count.textContent = '(' + facetCount('sub', option.value) + ')'; tab.appendChild(count);
      tab.addEventListener('click', function () { activeState.sub = activeState.sub.length === 1 && activeState.sub[0] === option.value ? [] : [option.value]; commitState('push'); }); row.appendChild(tab);
    });
  }
  function syncControls() { search.value = activeState.query; sortSelect.value = activeState.sort; renderTabs(); renderFacetControls(facetGroups); renderFacetControls(mobileFacetGroups); }
  function parseList(params, key, legacyKey) { var value = params.get(key) || (legacyKey && params.get(legacyKey)) || ''; return value ? value.split(',').map(function (item) { return item.trim(); }).filter(Boolean) : []; }
  function readState() {
    var params = new URLSearchParams(location.search);
    activeState = { query: params.get('q') || '', category: parseList(params, 'cat', 'category'), sub: parseList(params, 'sub'), price: parseList(params, 'price'), size: parseList(params, 'size'), color: parseList(params, 'color'), availability: parseList(params, 'availability'), sort: params.get('sort') || 'featured' };
    if (['featured', 'price-asc', 'price-desc', 'name-asc'].indexOf(activeState.sort) === -1) activeState.sort = 'featured';
  }
  function writeUrl(mode) {
    var params = new URLSearchParams(); if (activeState.query) params.set('q', activeState.query);
    if (activeState.category.length) params.set('cat', activeState.category.join(',')); if (activeState.sub.length) params.set('sub', activeState.sub.join(',')); if (activeState.price.length) params.set('price', activeState.price.join(','));
    if (activeState.size.length) params.set('size', activeState.size.join(',')); if (activeState.color.length) params.set('color', activeState.color.join(',')); if (activeState.availability.length) params.set('availability', activeState.availability.join(','));
    if (activeState.sort !== 'featured') params.set('sort', activeState.sort);
    var url = location.pathname + (params.toString() ? '?' + params.toString() : '');
    if (mode === 'push') history.pushState({ shop: true }, '', url); else history.replaceState({ shop: true }, '', url);
  }
  function commitState(mode) { renderedCount = CHUNK_SIZE; writeUrl(mode || 'replace'); render(); }
  function toggleFacet(key, value) { var values = selectedValues(key).slice(); var index = values.indexOf(value); if (index === -1) values.push(value); else values.splice(index, 1); activeState[key] = values; if (key === 'category') activeState.sub = []; commitState('push'); }
  function clearFilters() { activeState.category = []; activeState.sub = []; activeState.price = []; activeState.size = []; activeState.color = []; activeState.availability = []; commitState('push'); }
  function inventoryItems() { try { var value = JSON.parse(localStorage.getItem('tapestry-bag-v1') || '[]'); return Array.isArray(value) ? value : []; } catch (_) { return []; } }
  function updateBagBar(items) { var bar = document.getElementById('bag-bar'); var count = items.reduce(function (total, item) { return total + Number(item.quantity || 0); }, 0); if (bar) { bar.textContent = count ? count + ' item' + (count === 1 ? '' : 's') + ' in your bag ' : 'Your bag is empty '; var link = document.createElement('a'); link.href = route('bag'); link.textContent = count ? 'View bag and checkout' : 'Open bag'; bar.appendChild(link); } if (window.TapestryBag && window.TapestryBag.refresh) window.TapestryBag.refresh(); }
  function addToBag(product, selection) {
    var items = inventoryItems(); var found = items.find(function (item) { return item.sku === product.sku; });
    if (found) found.quantity = Math.min(24, Number(found.quantity || 0) + 1); else items.push({ sku: product.sku, title: product.title, quantity: 1, priceCents: Math.round(Number(product.price || 0) * 100), image: firstImage(product), selection: selection || '' });
    localStorage.setItem('tapestry-bag-v1', JSON.stringify(items)); updateBagBar(items); status.hidden = false; status.classList.remove('sr-only'); status.textContent = product.title + ' added to your bag.';
  }
  function defaultVariant(family) { return (family.variants || []).find(function (variant) { var product = skuById[variant.sku]; return product && isAvailable(family, product); }) || (family.variants || [])[0] || { sku: family.skus[0], selections: {} }; }
  function selectedVariant(family, selected) { return (family.variants || []).find(function (variant) { return Object.keys(selected).every(function (key) { return !variant.selections || variant.selections[key] === selected[key]; }); }) || null; }
  function optionIsAvailable(family, selected, optionName, value) { return (family.variants || []).some(function (variant) { return variant.selections && variant.selections[optionName] === value && Object.keys(selected).every(function (key) { return key === optionName || !selected[key] || variant.selections[key] === selected[key]; }); }); }
  function buildVariantControls(parent, family, selected, onChange) {
    var controls = document.createElement('div'); controls.className = 'variant-controls'; var selects = {};
    (family.options || []).forEach(function (option) {
      var label = document.createElement('label'); label.textContent = 'Select ' + option.name.toLowerCase() + ' for ' + family.title;
      var select = document.createElement('select'); select.name = option.name; select.setAttribute('aria-label', 'Select ' + option.name + ' for ' + family.title); selects[option.name] = select;
      option.choices.forEach(function (choice) { var entry = document.createElement('option'); entry.value = choice.value; entry.textContent = choice.description || choice.value; entry.disabled = !optionIsAvailable(family, selected, option.name, choice.value); select.appendChild(entry); });
      var firstAvailable = option.choices.find(function (choice) { return optionIsAvailable(family, selected, option.name, choice.value); }) || option.choices[0]; selected[option.name] = selected[option.name] || (firstAvailable && firstAvailable.value); select.value = selected[option.name];
      select.addEventListener('change', function () { selected[option.name] = select.value; syncVariantOptions(); onChange(); }); label.appendChild(select); controls.appendChild(label);
    });
    function syncVariantOptions() { Object.keys(selects).forEach(function (name) { Array.from(selects[name].options).forEach(function (option) { option.disabled = !optionIsAvailable(family, selected, name, option.value); }); }); }
    parent.appendChild(controls); syncVariantOptions(); return controls;
  }
  // The card is a browsing tile, not a configurator. It used to carry both variant
  // dropdowns, the raw SKU of the current selection, and 180 characters of supplier
  // copy, which pushed it to ~790px tall and let a one-line title and a three-line
  // title put their prices at three different heights. Everything that needs a decision
  // now lives in Quick view; the card commits to fixed rows so the price, the badge and
  // the buttons line up across a row whatever the title does.
  function renderCard(family) {
    var card = document.createElement('article'); card.className = 'product-card'; card.dataset.familyId = family.familyId;
    var initial = defaultVariant(family); var initialProduct = skuById[initial.sku] || productsFor(family)[0];
    var products = productsFor(family);
    var hasOptions = (family.options || []).length > 0;
    var available = products.some(function (product) { return isAvailable(family, product); });
    var photos = imageList(initialProduct);

    var media = document.createElement('div'); media.className = 'product-media'; media.dataset.fit = heroFit(initialProduct); card.appendChild(media);
    if (photos.length) {
      var image = document.createElement('img'); image.src = photos[0]; image.alt = family.title; image.loading = 'lazy'; image.decoding = 'async'; image.width = 400; image.height = 500; media.appendChild(image);
      if (photos.length > 1) addText(media, 'span', 'photo-count', photos.length + ' photos');
    } else {
      // One product ships with no photograph at all. The frame still has to occupy its
      // row or this card's price falls out of line with the rest of the row, so it says
      // what is missing rather than presenting an unexplained empty box.
      media.dataset.empty = '1';
      addText(media, 'span', 'photo-missing', 'No photo yet');
    }

    var body = document.createElement('div'); body.className = 'product-body'; card.appendChild(body);
    addText(body, 'h2', 'product-title', family.title);
    var priceLine = document.createElement('div'); priceLine.className = 'product-priceline'; body.appendChild(priceLine);
    addText(priceLine, 'p', 'product-price', priceLabel(family));
    var stock = addText(priceLine, 'span', 'stock-badge' + (available ? '' : ' sold-out'), available ? 'Available' : 'Sold out');
    if (hasOptions && available) stock.textContent = optionSummary(family);
    addText(body, 'p', 'product-description', teaser((initialProduct || {}).description));

    var actions = document.createElement('div'); actions.className = 'product-actions'; body.appendChild(actions);
    var action = document.createElement('button'); action.type = 'button'; action.className = 'btn';
    // With the size and colour selects moved off the card, "Add to bag" would silently
    // bag whichever variant happened to be first. Anything with options sends the
    // shopper to Quick view to choose instead.
    if (!available) { action.textContent = 'Sold out'; action.disabled = true; }
    else if (hasOptions) { action.textContent = 'Choose options'; action.setAttribute('aria-label', 'Choose options for ' + family.title); action.addEventListener('click', function () { openQuickView(family, action); }); }
    else { action.textContent = 'Add to bag'; action.setAttribute('aria-label', 'Add ' + family.title + ' to bag'); action.addEventListener('click', function () { if (initialProduct) addToBag(initialProduct, ''); }); }
    actions.appendChild(action);
    var quick = document.createElement('button'); quick.type = 'button'; quick.className = 'btn quick-view-button'; quick.textContent = 'Quick view'; quick.setAttribute('aria-label', 'Quick view of ' + family.title); quick.addEventListener('click', function () { openQuickView(family, quick); }); actions.appendChild(quick);
    return card;
  }
  // "4 sizes · 7 colors" tells a shopper more at a glance than "Available" does, and it
  // replaces the raw SKU string ("Selected: TAP-WIX-ALPACAPRINTCREWS-LARGEXLBEIGERED")
  // the card used to print at them.
  function optionSummary(family) {
    return (family.options || []).map(function (option) {
      var count = (option.choices || []).length;
      // Option names arrive singular ("Size", "Color"), so the plural has to be added
      // rather than stripped — otherwise the badge reads "4 size · 2 color".
      var noun = option.name.toLowerCase();
      if (count !== 1 && !/s$/.test(noun)) noun += 's';
      return count + ' ' + noun;
    }).join(' · ') || 'Available';
  }
  function render() {
    var matches = matchingFamilies(); if (activeState.sort === 'price-asc') matches.sort(function (a, b) { return familyPrice(a) - familyPrice(b); });
    if (activeState.sort === 'price-desc') matches.sort(function (a, b) { return familyPrice(b) - familyPrice(a); }); if (activeState.sort === 'name-asc') matches.sort(function (a, b) { return a.title.localeCompare(b.title); });
    grid.setAttribute('aria-busy', 'false'); grid.replaceChildren(); matches.slice(0, renderedCount).forEach(function (family) { grid.appendChild(renderCard(family)); });
    var variants = matches.reduce(function (total, family) { return total + matchingVariantCount(family); }, 0); resultCount.innerHTML = '<strong>' + matches.length + ' product ' + (matches.length === 1 ? 'family' : 'families') + '</strong> · ' + variants + ' matching ' + (variants === 1 ? 'variant' : 'variants');
    loadMoreBtn.hidden = matches.length <= renderedCount; status.hidden = matches.length > 0; if (!matches.length) status.textContent = families.length ? 'No products match your filters.' : 'No products are available right now.';
    renderTabs(); renderFacetControls(facetGroups); renderFacetControls(mobileFacetGroups); updateSuggestions();
  }
  function updateSuggestions() {
    if (!suggestionsOpen) { suggestions.hidden = true; search.setAttribute('aria-expanded', 'false'); return; }
    if (!suggestions || !document.activeElement || (document.activeElement !== search && !suggestions.contains(document.activeElement))) return;
    var query = normalize(activeState.query); if (!query || !families.length) { suggestions.hidden = true; search.setAttribute('aria-expanded', 'false'); return; }
    var items = families.map(function (family) { return { family: family, score: searchScore(family, query) }; }).filter(function (item) { return item.score > 0; }).sort(function (a, b) { return b.score - a.score || a.family.title.localeCompare(b.family.title); }).slice(0, 6);
    suggestions.replaceChildren(); activeSuggestion = -1; items.forEach(function (item, index) { var button = document.createElement('button'); button.type = 'button'; button.id = 'suggestion-' + index; button.role = 'option'; button.setAttribute('aria-selected', 'false'); button.appendChild(document.createTextNode(item.family.title)); var meta = document.createElement('span'); meta.className = 'suggestion-meta'; meta.textContent = groupFor(item.family) + ' · ' + productsFor(item.family).length + ' variants'; button.appendChild(meta); button.addEventListener('mousedown', function (event) { event.preventDefault(); chooseSuggestion(item.family.title); }); suggestions.appendChild(button); });
    suggestions.hidden = !items.length; search.setAttribute('aria-expanded', String(items.length > 0));
  }
  function chooseSuggestion(value) { activeState.query = value; search.value = value; suggestionsOpen = false; suggestions.hidden = true; search.setAttribute('aria-expanded', 'false'); writeUrl('push'); render(); search.focus(); }
  function dialogFocusables(dialog) { return Array.from(dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')).filter(function (element) { return !element.disabled && element.offsetParent !== null; }); }
  function closeDialog(dialog, focusBack) { if (!dialog) return; if (dialog.open && dialog.close) dialog.close(); else dialog.removeAttribute('open'); if (focusBack && dialogOpener && dialogOpener.focus) dialogOpener.focus(); dialogOpener = null; }
  function showDialog(dialog, opener, focusTarget) { dialogOpener = opener || document.activeElement; if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', ''); setTimeout(function () { (focusTarget || dialogFocusables(dialog)[0] || dialog).focus(); }, 0); }
  function bindDialog(dialog, closeButton) {
    if (!dialog) return;
    if (closeButton) closeButton.addEventListener('click', function () { closeDialog(dialog, true); });
    dialog.addEventListener('cancel', function (event) { event.preventDefault(); closeDialog(dialog, true); });
    dialog.addEventListener('click', function (event) { if (event.target === dialog) closeDialog(dialog, true); });
    dialog.addEventListener('keydown', function (event) { if (event.key === 'Escape') { event.preventDefault(); closeDialog(dialog, true); return; } if (event.key !== 'Tab') return; var focusable = dialogFocusables(dialog); if (!focusable.length) return; var first = focusable[0], last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } });
    dialog.addEventListener('close', function () { if (dialogOpener && dialogOpener.focus) dialogOpener.focus(); dialogOpener = null; });
  }
  function openQuickView(family, opener) {
    productDetail.replaceChildren(); var initial = defaultVariant(family); var selected = Object.assign({}, initial.selections || {}); var wrap = document.createElement('div'); wrap.className = 'quick-view-content';
    // The gallery used to be one image beside a count that promised "5 product photos"
    // and then showed you exactly one of them. The catalogue has had the rest all along.
    var gallery = document.createElement('div'); gallery.className = 'quick-view-gallery';
    var stage = document.createElement('div'); stage.className = 'gallery-stage'; gallery.appendChild(stage);
    var image = document.createElement('img'); image.alt = family.title; image.width = 600; image.height = 750; stage.appendChild(image);
    var thumbs = document.createElement('div'); thumbs.className = 'gallery-thumbs'; gallery.appendChild(thumbs);
    var galleryCount = addText(gallery, 'p', 'gallery-count', ''); wrap.appendChild(gallery);
    function showPhotos(product) {
      var photos = imageList(product);
      var sizes = (product && product.images_px) || [];
      stage.dataset.fit = heroFit(product);
      image.src = photos[0] || '';
      galleryCount.textContent = photos.length ? photos.length + (photos.length === 1 ? ' product photo' : ' product photos') : '';
      thumbs.replaceChildren();
      if (photos.length < 2) return;
      photos.forEach(function (src, index) {
        var thumb = document.createElement('button'); thumb.type = 'button'; thumb.className = 'gallery-thumb';
        thumb.setAttribute('aria-label', 'Show photo ' + (index + 1) + ' of ' + photos.length);
        thumb.setAttribute('aria-pressed', String(index === 0));
        var pip = document.createElement('img'); pip.src = src; pip.alt = ''; pip.loading = 'lazy'; pip.width = 64; pip.height = 64; thumb.appendChild(pip);
        thumb.addEventListener('click', function () {
          image.src = src;
          stage.dataset.fit = Number(sizes[index]) && Number(sizes[index]) < CRISP_MIN_PX ? 'contain' : 'cover';
          Array.from(thumbs.children).forEach(function (node, position) { node.setAttribute('aria-pressed', String(position === index)); });
        });
        thumbs.appendChild(thumb);
      });
    }
    var copy = document.createElement('div'); copy.className = 'quick-view-copy'; addText(copy, 'h2', '', family.title).id = 'product-detail-title'; var price = addText(copy, 'p', 'product-price', priceLabel(family)); addText(copy, 'p', 'product-description', familyDescription(family)); buildVariantControls(copy, family, selected, update); var stock = addText(copy, 'span', 'stock-badge', ''); var action = document.createElement('button'); action.type = 'button'; action.className = 'btn'; action.textContent = 'Add to bag'; action.setAttribute('aria-label', 'Add ' + family.title + ' to bag'); copy.appendChild(stock); copy.appendChild(action); wrap.appendChild(copy); productDetail.appendChild(wrap);
    function update() { var variant = selectedVariant(family, selected); var product = variant && skuById[variant.sku]; var available = product && isAvailable(family, product); showPhotos(product || productsFor(family)[0]); price.textContent = product ? '$' + Number(product.price).toFixed(2) : priceLabel(family); stock.textContent = available ? 'Available' : 'Sold out'; stock.className = 'stock-badge' + (available ? '' : ' sold-out'); action.disabled = !available; action.textContent = available ? 'Add to bag' : 'Sold out'; action.onclick = function () { if (product && available) addToBag(product, Object.keys(selected).map(function (key) { return key + ': ' + selected[key]; }).join(', ')); }; }
    update(); showDialog(productDialog, opener, productDialog.querySelector('select') || document.getElementById('product-detail-close'));
  }
  // Quick view is where the full text belongs now that the card carries only a teaser.
  function familyDescription(family) { var product = skuById[defaultVariant(family).sku] || productsFor(family)[0]; return cleanCopy((product || {}).description || 'A Tapestry Acres farm-shop good.'); }
  function bindEvents() {
    /* The nav toggle is owned by assets/site-shell.js; a second handler here cancelled it out. */
    search.addEventListener('input', function () { activeState.query = search.value; suggestionsOpen = true; renderedCount = CHUNK_SIZE; updateSuggestions(); clearTimeout(searchTimer); searchTimer = setTimeout(function () { writeUrl('replace'); render(); }, 90); });
    search.addEventListener('focus', function () { suggestionsOpen = true; updateSuggestions(); });
    search.addEventListener('keydown', function (event) { var options = suggestions ? Array.from(suggestions.querySelectorAll('button')) : []; if (event.key === 'ArrowDown' && options.length) { event.preventDefault(); activeSuggestion = (activeSuggestion + 1) % options.length; options.forEach(function (button, index) { button.setAttribute('aria-selected', String(index === activeSuggestion)); }); } else if (event.key === 'ArrowUp' && options.length) { event.preventDefault(); activeSuggestion = (activeSuggestion - 1 + options.length) % options.length; options.forEach(function (button, index) { button.setAttribute('aria-selected', String(index === activeSuggestion)); }); } else if (event.key === 'Enter' && activeSuggestion >= 0 && options[activeSuggestion]) { event.preventDefault(); chooseSuggestion(options[activeSuggestion].firstChild.textContent); } else if (event.key === 'Escape') { suggestionsOpen = false; suggestions.hidden = true; search.setAttribute('aria-expanded', 'false'); } });
    sortSelect.addEventListener('change', function () { activeState.sort = sortSelect.value; commitState('push'); }); loadMoreBtn.addEventListener('click', function () { renderedCount += CHUNK_SIZE; render(); });
    document.getElementById('clear-filters').addEventListener('click', clearFilters); document.getElementById('mobile-clear-filters').addEventListener('click', clearFilters);
    document.getElementById('open-filters').addEventListener('click', function () { showDialog(drawerDialog, document.getElementById('open-filters'), document.getElementById('mobile-filter-close')); }); document.getElementById('mobile-filter-close').addEventListener('click', function () { closeDialog(drawerDialog, true); }); document.getElementById('mobile-apply-filters').addEventListener('click', function () { closeDialog(drawerDialog, true); });
    bindDialog(productDialog, document.getElementById('product-detail-close')); bindDialog(drawerDialog, null); window.addEventListener('popstate', function () { readState(); renderedCount = CHUNK_SIZE; syncControls(); render(); }); document.addEventListener('click', function (event) { if (!event.target.closest('.shop-search')) { suggestionsOpen = false; suggestions.hidden = true; search.setAttribute('aria-expanded', 'false'); } });
  }
  function apiRoute(name) { var base = document.querySelector('base'); return new URL(name, base ? base.href : new URL('./', location.href).href).pathname; }
  // Live price, stock and new products from Square (the Site Manager's
  // Products screen). Best effort: the shop still opens on the static catalog.
  function loadLive() {
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 4000); });
    var live = fetch(apiRoute('api/store/live'), { cache: 'no-cache' }).then(function (response) { return response.ok ? response.json() : null; }).catch(function () { return null; });
    return Promise.race([live, timeout]);
  }
  function applyLive(data, live) {
    if (!live || live.schemaVersion !== 1 || !live.skus) return data;
    var hidden = {}; (live.hidden || []).forEach(function (sku) { hidden[sku] = true; });
    var liveProducts = {}; (live.products || []).forEach(function (product) { liveProducts[product.sku] = product; });
    // A family created or edited in the Site Manager replaces the bundled one
    // that holds any of the same SKUs.
    var replaced = {};
    var liveFamilies = (live.families || []).map(function (family) {
      var old = data.families.filter(function (f) { return (f.skus || []).some(function (sku) { return family.skus.indexOf(sku) >= 0; }); });
      old.forEach(function (f) { replaced[f.familyId] = true; });
      var options = family.options || [];
      if (old.length === 1 && options.length === 1 && options[0].name === 'Option' && (old[0].options || []).length === 1) {
        var name = old[0].options[0].name;
        options = [Object.assign({}, options[0], { name: name })];
        family = Object.assign({}, family, { options: options, variants: (family.variants || []).map(function (v) { return v.selections && 'Option' in v.selections ? { sku: v.sku, selections: { [name]: v.selections.Option } } : v; }) });
      }
      return family;
    });
    var bundled = {}; data.skus.forEach(function (product) { bundled[product.sku] = product; });
    var skus = data.skus.filter(function (product) { return !hidden[product.sku] && !liveProducts[product.sku]; }).map(function (product) {
      var next = Object.assign({}, product);
      var stock = live.skus[product.sku];
      if (stock) { if (stock.price !== null && stock.price !== undefined) next.price = stock.price; next.qty = stock.qty; } else next.qty = 0;
      return next;
    });
    Object.keys(liveProducts).forEach(function (sku) {
      var product = Object.assign({}, liveProducts[sku]);
      var old = bundled[sku];
      // Same photos as the bundle: keep the measured sizes the cards use to pick a fit.
      if (old && JSON.stringify(old.images_local) === JSON.stringify(product.images_local)) { product.images_px = old.images_px; product.heroPx = old.heroPx; }
      if (old && !product.extra_category) product.extra_category = old.extra_category;
      skus.push(product);
    });
    var known = {}; skus.forEach(function (product) { known[product.sku] = true; });
    var families = data.families.filter(function (family) { return !replaced[family.familyId]; }).map(function (family) {
      var keep = (family.skus || []).filter(function (sku) { return known[sku]; });
      return Object.assign({}, family, { skus: keep, variants: (family.variants || []).filter(function (variant) { return known[variant.sku]; }) });
    }).filter(function (family) { return family.skus.length; });
    liveFamilies.forEach(function (family) { families.push(family); });
    // Tabs and subcategories as arranged in Square, when the feed has them.
    if (Array.isArray(live.categories) && live.placement) {
      families = families.map(function (family) {
        var sku = (family.skus || []).find(function (s) { return live.placement[s]; });
        if (!sku) return family;
        return Object.assign({}, family, { group: live.placement[sku][0], sub: live.placement[sku][1] || '' });
      });
      liveTree = live.categories;
      var used = unique(families.map(groupFor));
      familyGroups = live.categories.map(function (top) { return top.name; }).filter(function (name) { return used.indexOf(name) !== -1; })
        .concat(used.filter(function (name) { return !live.categories.some(function (top) { return top.name === name; }); }));
    }
    liveCatalog = true;
    return Object.assign({}, data, { families: families, skus: skus });
  }
  function loadCatalog() {
    var live = loadLive();
    return fetch('data/catalog-index.json', { cache: 'no-cache' }).then(function (response) { if (!response.ok) throw new Error('Catalog index unavailable'); return response.json(); }).then(function (index) { return fetch('data/' + index.catalog, { cache: 'no-cache' }); }).then(function (response) { if (!response.ok) throw new Error('Catalog feed unavailable'); return response.json(); }).then(function (data) { return live.then(function (feed) { return applyLive(data, feed); }); });
  }
  readState(); syncControls(); updateBagBar(inventoryItems()); bindEvents();
    loadCatalog().then(function (data) {
    if (!Array.isArray(data.families) || !Array.isArray(data.skus)) throw new Error('Invalid catalog feed'); families = data.families; data.skus.forEach(function (product) { skuById[product.sku] = product; }); families.forEach(function (family) { (family.variants || []).forEach(function (variant) { variantBySku[variant.sku] = variant; }); family.searchText = normalize([family.title, family.category, groupFor(family), family.sub].concat(productsFor(family).flatMap(function (product) { return [product.title, product.description, product.category, product.subcategory, product.extra_category]; })).concat((family.options || []).flatMap(function (option) { return option.choices.map(function (choice) { return choice.value; }); })).join(' ')); }); status.classList.remove('sr-only'); if (typeof addStructuredData === 'function') addStructuredData(families); render();
  }).catch(function () { grid.replaceChildren(); grid.setAttribute('aria-busy', 'false'); status.classList.remove('sr-only'); status.hidden = false; status.textContent = 'We could not load the shop right now. Please try again later.'; });
}());
