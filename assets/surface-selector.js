(function () {
  if (!(document.documentElement.dataset.preview === 'surface' || /[?&]surface-preview=1(?:&|$)/.test(location.search)) || !window.PresetSwitcher) return;
  var axes = {
    calendarLayout: { label: 'Calendar layout', options: [{ id: 'month-grid', label: 'Month grid' }, { id: 'week-strip', label: 'Week strip' }, { id: 'list-days', label: 'List days' }] },
    facetLayout: { label: 'Facet layout', options: [{ id: 'left-rail', label: 'Left rail' }, { id: 'top-chips', label: 'Top chips' }, { id: 'drawer-always', label: 'Drawer always' }] },
    quickviewStyle: { label: 'Quick-view style', options: [{ id: 'modal', label: 'Modal' }, { id: 'side-panel', label: 'Side panel' }] }
  };
  window.PresetSwitcher.init({ axes: axes, storageKey: 'tapestry-surface-preview', persist: true, keepPanel: true, useHash: true, position: 'bottom-right' });
}());
