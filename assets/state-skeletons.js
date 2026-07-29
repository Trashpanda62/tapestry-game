/* Explicit, testable UI states for data-driven regions. Query ?state=loading|empty|error|success to force one. */
(function () {
  "use strict";
  var regions = [["catalog", "Shop catalog"], ["experiences", "Farm experiences"], ["herd", "Meet the herd"], ["lead", "Contact form"]];
  var labels = { loading: "Loading…", empty: "Nothing is here yet.", error: "We couldn’t load this right now. Please try again or contact the farm.", success: "All set. Your request was received." };
  var forced = new URLSearchParams(window.location.search).get("state");
  if (["loading", "empty", "error", "success"].indexOf(forced) < 0) forced = null;
  var main = document.querySelector("main");
  if (!main) return;
  regions.forEach(function (entry) {
    var region = document.createElement("section");
    region.className = "state-skeleton";
    region.dataset.stateRegion = entry[0];
    region.setAttribute("aria-label", entry[1] + " states");
    region.innerHTML = ["loading", "empty", "error", "success"].map(function (state) {
      return '<p data-state="' + state + '" role="status" hidden>' + labels[state] + '</p>';
    }).join("");
    main.appendChild(region);
    if (forced) {
      region.querySelectorAll("[data-state]").forEach(function (node) { node.hidden = node.dataset.state !== forced; });
      region.dataset.forcedState = forced;
    }
  });
}());
