(function () {
  "use strict";

  var grid = document.getElementById("articlesGrid");
  var resultCount = document.getElementById("resultCount");
  var noResults = document.getElementById("noResults");
  var searchInput = document.getElementById("searchInput");
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var allArticles = [];

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render(list) {
    if (!list.length) {
      grid.innerHTML = "";
      noResults.hidden = false;
      resultCount.textContent = "";
      return;
    }
    noResults.hidden = true;
    resultCount.textContent = list.length + " article" + (list.length === 1 ? "" : "s");

    grid.innerHTML = list.map(function (item) {
      var title = escapeHtml(item.title || "Untitled");
      var desc = escapeHtml(item.description || "");
      var href = encodeURIComponent(item.filename || "");
      return (
        '<a class="article-card" href="' + href + '">' +
          '<h3>' + title + "</h3>" +
          (desc ? '<p>' + desc + "</p>" : "") +
          '<span class="read-more">Read article →</span>' +
        "</a>"
      );
    }).join("");
  }

  function applyFilter(query) {
    var q = (query || "").trim().toLowerCase();
    if (!q) {
      render(allArticles);
      return;
    }
    var filtered = allArticles.filter(function (item) {
      var haystack = ((item.title || "") + " " + (item.description || "")).toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
    render(filtered);
  }

  fetch("helpfiles.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to load helpfiles.json");
      return res.json();
    })
    .then(function (data) {
      allArticles = Array.isArray(data) ? data : [];
      // Newest-first if a timestamp is present.
      allArticles.sort(function (a, b) {
        return (b.updated || "").localeCompare(a.updated || "");
      });

      var params = new URLSearchParams(window.location.search);
      var initialQuery = params.get("q") || "";
      if (initialQuery) searchInput.value = initialQuery;
      applyFilter(initialQuery);
    })
    .catch(function () {
      grid.innerHTML = '<p class="loading">Could not load help articles right now. Please try again shortly.</p>';
    });

  searchInput.addEventListener("input", function () {
    applyFilter(searchInput.value);
  });
})();
