(function () {
  if (!(document.documentElement.dataset.preview === '1' || /[?&]preview=1(?:&|$)/.test(location.search)) || !window.PresetSwitcher) return;
  var axes = {
    hero: { label: 'Hero composition', options: [{ id: 'split', label: 'Split welcome' }, { id: 'documentary', label: 'Documentary frame' }, { id: 'illustrated', label: 'Illustrated frame' }] },
    palette: { label: 'Palette', options: [{ id: 'pasture-ochre', label: 'Pasture + ochre' }, { id: 'clay-sky', label: 'Clay + sky' }, { id: 'ink-alfalfa', label: 'Ink + alfalfa' }] },
    typography: { label: 'Typography', options: [{ id: 'sturdy-slab', label: 'Sturdy slab' }, { id: 'humanist-note', label: 'Humanist field-note' }, { id: 'farm-label', label: 'Condensed farm-label' }] },
    surface: { label: 'Surface', options: [{ id: 'paper-label', label: 'Paper label' }, { id: 'painted-sign', label: 'Painted sign' }, { id: 'field-guide', label: 'Clean field guide' }] },
    illustration: { label: 'Illustration intensity', options: [{ id: 'accent', label: 'Accent' }, { id: 'balanced', label: 'Balanced' }, { id: 'character-forward', label: 'Character-forward' }] },
    density: { label: 'Density', options: [{ id: 'comfortable', label: 'Comfortable' }, { id: 'compact', label: 'Compact' }] },
    motion: { label: 'Motion', options: [{ id: 'still', label: 'Still' }, { id: 'subtle', label: 'Subtle' }, { id: 'lively', label: 'Lively' }] },
    nav: { label: 'Navigation treatment', options: [{ id: 'rail', label: 'Rail' }, { id: 'field-tab', label: 'Field tab' }] }
  };
  window.PresetSwitcher.init({ axes: axes, storageKey: 'tapestry-obscura-preview', persist: true, keepPanel: true, useHash: true, position: 'bottom-right' });
}());
