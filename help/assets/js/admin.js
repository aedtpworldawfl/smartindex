(function () {
  "use strict";
  var box = document.getElementById("filterBox");
  var table = document.getElementById("filesTable");
  if (!box || !table) return;

  box.addEventListener("input", function () {
    var q = box.value.trim().toLowerCase();
    var rows = table.querySelectorAll("tbody tr[data-search]");
    rows.forEach(function (row) {
      var match = row.getAttribute("data-search").indexOf(q) !== -1;
      row.style.display = match ? "" : "none";
    });
  });
})();
