/* Site Manager overlay: what the farm changed in its panel (words, photos,
   business details) applied to the baked page by slot id. The baked defaults
   stay in the HTML, so nothing flashes empty and a missing id keeps what shipped.
   Source of the slot ids: src/content-slots.json (scripts/content-slots.mjs). */
(function () {
  "use strict";
  var baseTag = document.querySelector("base");
  var base = (baseTag ? new URL(baseTag.href).pathname : "/s/tapestry-acres/").replace(/\/$/, "");
  function apply(payload) {
    var copy = payload.copy || {}, photos = payload.photos || {}, facts = payload.facts || {};
    Object.keys(copy).forEach(function (id) {
      document.querySelectorAll('[data-slot="' + id + '"]').forEach(function (el) { el.textContent = copy[id]; });
    });
    Object.keys(photos).forEach(function (id) {
      var p = photos[id];
      document.querySelectorAll('img[data-photo="' + id + '"]').forEach(function (img) {
        if (p.alt) img.alt = p.alt;
        if (!p.url) return;
        var picture = img.parentElement && img.parentElement.tagName === "PICTURE" ? img.parentElement : null;
        if (picture) picture.querySelectorAll("source").forEach(function (s) { s.remove(); });
        img.removeAttribute("srcset");
        img.src = p.url;
      });
    });
    if (facts.phone) document.querySelectorAll('[data-fact="phone"]').forEach(function (a) { a.textContent = facts.phone; if (facts.phoneTel) a.setAttribute("href", facts.phoneTel); });
    if (facts.email) document.querySelectorAll('[data-fact="email"]').forEach(function (a) { a.textContent = facts.email; a.setAttribute("href", "mailto:" + facts.email); });
    if (facts.addressLine1 && facts.addressLine2) {
      document.querySelectorAll('[data-fact="address"]').forEach(function (a) {
        a.textContent = "";
        a.appendChild(document.createTextNode(facts.addressLine1));
        a.appendChild(document.createElement("br"));
        a.appendChild(document.createTextNode(facts.addressLine2));
        if (facts.mapsUrl) a.setAttribute("href", facts.mapsUrl);
      });
    }
  }
  function run() {
    fetch(base + "/api/site/content", { cache: "default" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (payload) { if (payload) apply(payload); })
      .catch(function () { /* the baked page stands */ });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
