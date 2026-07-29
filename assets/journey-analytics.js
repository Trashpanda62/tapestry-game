/* First-party journey signals only: no identifiers, no free-form payloads. */
(function () {
  "use strict";
  var allowedUtm = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  function sendConversion(detail) {
    var payload = {};
    ["event", "route", "href", "clickTier", "sku"].forEach(function (key) { if (typeof detail[key] === "string") payload[key] = detail[key].slice(0, 400); });
    allowedUtm.forEach(function (key) { if (typeof detail[key] === "string") payload[key] = detail[key].slice(0, 160); });
    var body = JSON.stringify(payload);
    try {
      var beacon = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon && navigator.sendBeacon("/s/tapestry-acres/__event", beacon)) return;
    } catch (_) {}
    fetch("/s/tapestry-acres/__event", { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(function () {});
  }
  window.addEventListener("tapestry:journey", function (event) { if (event && event.detail) sendConversion(event.detail); });
  var current = new URL(window.location.href);
  var params = new URLSearchParams();
  allowedUtm.forEach(function (key) { if (current.searchParams.has(key)) params.set(key, current.searchParams.get(key)); });
  document.querySelectorAll("a[href]").forEach(function (link) {
    var href;
    try { href = new URL(link.href, window.location.href); } catch (_) { return; }
    if (href.origin === current.origin && params.toString()) params.forEach(function (value, key) { href.searchParams.set(key, value); });
    if (href.origin === current.origin) link.href = href.toString();
    link.addEventListener("click", function () {
      var kind = link.classList.contains("btn") ? "primary" : (link.closest("nav") ? "navigation" : "secondary");
      var payload = { event: "journey_click", clickTier: kind, route: window.location.pathname, href: href.pathname };
      allowedUtm.forEach(function (key) { if (params.has(key)) payload[key] = params.get(key); });
      window.dispatchEvent(new CustomEvent("tapestry:journey", { detail: payload }));
    });
  });
  document.querySelectorAll("form").forEach(function (form) {
    var page = (form.querySelector('[name="page"]') || {}).value || "";
    var eventName = /rv|stay/i.test(page + " " + window.location.pathname) ? "rv_inquiry" : "stay";
    allowedUtm.forEach(function (key) {
      if (params.has(key) && !form.querySelector('[name="' + key + '"]')) {
        var input = document.createElement("input"); input.type = "hidden"; input.name = key; input.value = params.get(key); form.appendChild(input);
      }
    });
    var returnTo = document.createElement("input"); returnTo.type = "hidden"; returnTo.name = "return_to"; returnTo.value = "/s/tapestry-acres/thanks" + (params.toString() ? "?" + params.toString() : ""); form.appendChild(returnTo);
    form.addEventListener("submit", function () {
      var payload = { event: eventName, route: window.location.pathname, href: "/s/tapestry-acres/thanks" };
      allowedUtm.forEach(function (key) { if (params.has(key)) payload[key] = params.get(key); });
      window.dispatchEvent(new CustomEvent("tapestry:journey", { detail: payload }));
    });
  });
}());
