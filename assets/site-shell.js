/* Shared semantic shell: keyboard-safe mobile navigation, skip link, breadcrumbs, and contact context. */
(function () {
  "use strict";
  var route = (location.pathname.replace(/\/$/, "").split("/").pop() || "index").replace(/\.html$/, "");
  function tenantPath(name) {
    var base = document.querySelector("base");
    return new URL(name, base ? base.href : new URL("./", location.href).href).pathname;
  }
  /* GitHub Pages mirror only. Booking, bag and checkout need the live server, which
     exists only on the farm's own domain, so send those routes there. No-op elsewhere. */
  if (/\.github\.io$/.test(location.hostname)) {
    var LIVE = "https://tapestryacres.com", DYNAMIC = /(?:^|\/)(book|bag|checkout|rv-admin)(?:\.html)?(\/[^/]+)?\/?$/;
    var here = location.pathname.match(DYNAMIC);
    if (here) { location.replace(LIVE + "/" + here[1] + (here[2] || "") + location.search + location.hash); return; }
    var sendLive = function (a) {
      var u; try { u = new URL(a.getAttribute("href"), location.href); } catch (_) { return; }
      var m = u.origin === location.origin && u.pathname.match(DYNAMIC);
      if (m) a.setAttribute("href", LIVE + "/" + m[1] + (m[2] || "") + u.search + u.hash);
    };
    var sweep = function () { document.querySelectorAll("a[href]").forEach(sendLive); };
    sweep();
    new MutationObserver(sweep).observe(document.documentElement, { childList: true, subtree: true });
  }
  function bagCount() {
    try {
      var items = JSON.parse(localStorage.getItem("tapestry-bag-v1") || "[]");
      return Array.isArray(items) ? items.reduce(function (total, item) { return total + Number(item.quantity || 0); }, 0) : 0;
    } catch (_) {
      return 0;
    }
  }
  function refreshBagLinks() {
    var count = bagCount();
    document.querySelectorAll(".site-bag-link").forEach(function (link) {
      link.textContent = count ? "Bag (" + count + ")" : "Bag";
      link.setAttribute("aria-label", count ? "Bag, " + count + (count === 1 ? " item" : " items") : "Bag, empty");
    });
  }
  var toggle = document.querySelector(".site-nav-toggle");
  var nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
    var close = function (restore) {
      toggle.setAttribute("aria-expanded", "false");
      if (restore) toggle.focus();
    };
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      if (open && links[0]) links[0].focus();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") close(true);
    });
    document.addEventListener("pointerdown", function (event) {
      if (toggle.getAttribute("aria-expanded") === "true" && !nav.contains(event.target) && !toggle.contains(event.target)) close(false);
    });
    links.forEach(function (link) { link.addEventListener("click", function () { close(false); }); });
  }
  if (nav && !nav.querySelector(".site-bag-link")) {
    var bagLink = document.createElement("a");
    bagLink.className = "site-bag-link";
    bagLink.href = tenantPath("bag");
    if (route === "bag" || route === "checkout") bagLink.setAttribute("aria-current", "page");
    nav.appendChild(bagLink);
  }
  refreshBagLinks();
  window.TapestryBag = { refresh: refreshBagLinks };

  var main = document.querySelector("main");
  if (main && !document.getElementById("skip-to-content")) {
    var skip = document.createElement("a");
    skip.id = "skip-to-content";
    skip.className = "skip-link";
    skip.href = "#main-content";
    skip.textContent = "Skip to content";
    document.body.insertBefore(skip, document.body.firstChild);
  }
  if (main && !main.id) main.id = "main-content";

  var page = document.querySelector("main .page");
  if (page && !page.querySelector(".breadcrumbs")) {
    var current = (document.title || "Tapestry Acres").split("|")[0].trim();
    if (current && current.toLowerCase() !== "tapestry acres") {
      var crumb = document.createElement("nav");
      crumb.className = "breadcrumbs";
      crumb.setAttribute("aria-label", "Breadcrumb");
      // Build the label as a text node instead of stripping characters out of it.
      // `document.title` is already parser-decoded, so the old `replace(/[&<>"]/g,"")`
      // DELETED real ampersands: "RV Rentals & Farm Stays" rendered as
      // "RV Rentals Farm Stays" on the site's highest-value page.
      crumb.innerHTML = '<a href="index.html">Home</a><span aria-hidden="true">›</span><span aria-current="page"></span>';
      crumb.querySelector('[aria-current="page"]').textContent = current;
      page.insertBefore(crumb, page.firstChild);
    }
  }
  var footer = document.querySelector("footer");
  if (footer && !footer.querySelector(".site-footer-nav")) {
    var navFooter = document.createElement("nav");
    navFooter.className = "site-footer-nav";
    navFooter.setAttribute("aria-label", "Footer navigation");
    navFooter.innerHTML = '<a href="index.html">Home</a><a href="experiences.html">Experiences</a><a href="shop.html">Shop</a><a class="site-bag-link" href="bag.html">Bag</a><a href="rv-rentals.html">Stays &amp; RV</a><a href="mailto:tapestryacres@gmail.com">Contact</a><a href="https://maps.google.com/?q=396+Taylor+Crossroads+Rd+Monroe+TN" target="_blank" rel="noopener">Directions</a>';
    footer.appendChild(navFooter);
    refreshBagLinks();
  }

  /* Social. The TikTok handle carries a dot: tapestry.acres. Plain "tapestryacres"
     is not a real account there, unlike on Facebook and Instagram. Verified against
     all four profiles 2026-07-29. */
  if (footer && !footer.querySelector(".site-social")) {
    var social = document.createElement("nav");
    social.className = "site-social";
    social.setAttribute("aria-label", "Tapestry Acres on social media");
    social.innerHTML = [
      '<a href="https://www.facebook.com/tapestryacres" target="_blank" rel="noopener">Facebook</a>',
      '<a href="https://www.instagram.com/tapestryacres/" target="_blank" rel="noopener">Instagram</a>',
      '<a href="https://www.tiktok.com/@tapestry.acres" target="_blank" rel="noopener">TikTok</a>',
      '<a href="https://www.google.com/maps?cid=12843989383253935347" target="_blank" rel="noopener">Google</a>'
    ].join("");
    footer.appendChild(social);
  }

  /* Thumb-zone call bar. The phone number otherwise sits at the foot of a page that
     runs about ten screens on a phone, which is the wrong home for the highest-intent
     action a farm visitor has. Skipped where a page already owns the fixed bottom slot
     (rv-rentals) and on the transaction pages, where a call prompt would compete with
     finishing a payment. */
  if (!document.querySelector(".mobile-cta") && ["checkout", "bag", "thanks"].indexOf(route) < 0) {
    var bar = document.createElement("div");
    bar.className = "mobile-cta call-bar";
    bar.setAttribute("aria-label", "Contact Tapestry Acres");
    bar.innerHTML = '<a class="btn" href="tel:+19318233266">Call the farm</a>'
      + '<a class="btn btn--ghost" href="https://maps.google.com/?q=396+Taylor+Crossroads+Rd+Monroe+TN" target="_blank" rel="noopener">Directions</a>';
    document.body.appendChild(bar);
  }
}());
