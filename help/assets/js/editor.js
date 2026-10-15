(function () {
  "use strict";

  var area = document.getElementById("editorArea");
  var field = document.getElementById("contentField");
  var toolbar = document.querySelector(".editor-toolbar");
  var form = document.getElementById("editorForm");
  if (!area || !field || !toolbar || !form) return;

  function syncField() {
    field.value = area.innerHTML.trim();
  }

  // Keep the hidden textarea in sync with what's typed.
  area.addEventListener("input", syncField);
  syncField();

  // Make sure the latest content is captured even if the input event
  // somehow didn't fire (paste, execCommand edge cases, etc).
  form.addEventListener("submit", function () {
    syncField();
  });

  toolbar.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-cmd], button[data-action]");
    if (!btn) return;
    e.preventDefault();
    area.focus();

    if (btn.dataset.cmd) {
      document.execCommand(btn.dataset.cmd, false, null);
      syncField();
      return;
    }

    switch (btn.dataset.action) {
      case "link": {
        var url = window.prompt("Link URL (https://…):", "https://");
        if (url) document.execCommand("createLink", false, url);
        break;
      }
      case "image": {
        var src = window.prompt("Image URL (https://…):", "https://");
        if (src) document.execCommand("insertImage", false, src);
        break;
      }
      case "code-view": {
        toggleCodeView();
        break;
      }
    }
    syncField();
  });

  var blockSelect = toolbar.querySelector("[data-block]");
  if (blockSelect) {
    blockSelect.addEventListener("change", function () {
      area.focus();
      document.execCommand("formatBlock", false, blockSelect.value);
      syncField();
      blockSelect.selectedIndex = 0;
    });
  }

  // Raw HTML view/edit toggle, for admins who want full control.
  var rawMode = false;
  var rawTextarea = null;

  function toggleCodeView() {
    if (!rawMode) {
      syncField();
      rawTextarea = document.createElement("textarea");
      rawTextarea.className = "editor-raw-view";
      rawTextarea.value = area.innerHTML;
      area.replaceWith(rawTextarea);
      rawMode = true;
    } else {
      area.innerHTML = rawTextarea.value;
      rawTextarea.replaceWith(area);
      syncField();
      rawMode = false;
    }
  }

  // Basic keyboard shortcuts.
  area.addEventListener("keydown", function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    var key = e.key.toLowerCase();
    if (key === "b") { e.preventDefault(); document.execCommand("bold"); }
    if (key === "i") { e.preventDefault(); document.execCommand("italic"); }
    if (key === "u") { e.preventDefault(); document.execCommand("underline"); }
    syncField();
  });
})();
