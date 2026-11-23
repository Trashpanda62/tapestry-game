/* Live storefront data for the home and freeze-dried pages.
   Square is the source of truth: prices, stock and new products come from the
   same feed the shop uses (api/store/live). Every caller keeps a static answer
   for when the feed is slow or down. */
(function () {
  "use strict";
  function apiRoute(name) {
    var base = document.querySelector("base");
    return new URL(name, base ? base.href : new URL("./", location.href).href).pathname;
  }
  function shopHref(query) {
    var base = document.querySelector("base");
    return new URL("shop" + (query ? "?q=" + encodeURIComponent(query) : ""), base ? base.href : new URL("./", location.href).href).pathname + (query ? "?q=" + encodeURIComponent(query) : "");
  }
  function live() {
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 4000); });
    var feed = fetch(apiRoute("api/store/live"), { cache: "no-cache" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) { return data && data.schemaVersion === 1 && data.skus ? data : null; })
      .catch(function () { return null; });
    return Promise.race([feed, timeout]);
  }
  function money(value) {
    var n = Number(value);
    return "$" + (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2));
  }
  /* "Alpaca Print Blanket - Charcoal/Kiwi" -> "Alpaca Print Blanket": one card per family. */
  function familyTitle(title) { return String(title || "").split(/\s[–—-]\s/)[0].trim(); }
  window.TapestryStore = { live: live, money: money, apiRoute: apiRoute, shopHref: shopHref, familyTitle: familyTitle };
}());
