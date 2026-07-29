/* Shared semantic shell: keyboard-safe mobile navigation, skip link, breadcrumbs, and contact context. */
(function () {
  "use strict";
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
      crumb.innerHTML = '<a href="index.html">Home</a><span aria-hidden="true">›</span><span aria-current="page">' + current.replace(/[&<>\"]/g, "") + "</span>";
      page.insertBefore(crumb, page.firstChild);
    }
  }
  var footer = document.querySelector("footer");
  if (footer && !footer.querySelector(".site-footer-nav")) {
    var navFooter = document.createElement("nav");
    navFooter.className = "site-footer-nav";
    navFooter.setAttribute("aria-label", "Footer navigation");
    navFooter.innerHTML = '<a href="index.html">Home</a><a href="experiences.html">Experiences</a><a href="shop.html">Shop</a><a href="rv-rentals.html">Stays &amp; RV</a><a href="mailto:tapestryacres@gmail.com">Contact</a><a href="https://maps.google.com/?q=396+Taylor+Crossroads+Rd+Monroe+TN" target="_blank" rel="noopener">Directions</a>';
    footer.appendChild(navFooter);
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
  var route = (location.pathname.replace(/\/$/, "").split("/").pop() || "index").replace(/\.html$/, "");
  if (!document.querySelector(".mobile-cta") && ["checkout", "bag", "thanks"].indexOf(route) < 0) {
    var bar = document.createElement("div");
    bar.className = "mobile-cta call-bar";
    bar.setAttribute("aria-label", "Contact Tapestry Acres");
    bar.innerHTML = '<a class="btn" href="tel:+19318233266">Call the farm</a>'
      + '<a class="btn btn--ghost" href="https://maps.google.com/?q=396+Taylor+Crossroads+Rd+Monroe+TN" target="_blank" rel="noopener">Directions</a>';
    document.body.appendChild(bar);
  }
}());
