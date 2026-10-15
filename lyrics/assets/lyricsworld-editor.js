/**
 * LyricsWorld rich-text editor.
 * Self-contained — no external service, no API key, nothing that can
 * silently break because a third party changed their pricing.
 *
 * Used for every editor panel on the site: artist bios, song lyrics,
 * and contributor lyric corrections.
 *
 * Rule: whatever is pasted into a LyricsWorld editor panel is stripped
 * down to plain text first — all inherited formatting from the source
 * (bold, colors, fonts, links, spans, whatever) is discarded on paste.
 * After that, the user is free to apply LyricsWorld's own formatting
 * (Bold / Italic / Underline / H1 / H2 / H3 / Paragraph) from the toolbar.
 *
 * Only ever produces tags from RICH_TEXT_ALLOWED_TAGS in config.php
 * (p, b, strong, i, em, u, br, h1, h2, h3) — everything else pasted or
 * typed is stripped server-side on save regardless, this is just so the
 * live editing experience matches what will actually be kept.
 */
function initLyricsWorldEditor(selector, opts) {
  opts = opts || {};
  var textarea = document.querySelector(selector);
  if (!textarea) return;

  var height = opts.height || 320;
  var maxChars = opts.maxChars || null;
  var counterEl = document.getElementById(selector.replace('#', '') + '-count');

  // Build toolbar
  var toolbar = document.createElement('div');
  toolbar.className = 'lw-editor-toolbar';

  function makeButton(label, title, action) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lw-editor-btn';
    btn.textContent = label;
    btn.title = title;
    btn.addEventListener('mousedown', function (e) {
      // Prevent the button from stealing focus/selection away from the editor.
      e.preventDefault();
    });
    btn.addEventListener('click', function () {
      area.focus();
      action();
      syncToTextarea();
    });
    return btn;
  }

  function execAndFocus(cmd, val) {
    document.execCommand(cmd, false, val || null);
  }

  var groupA = document.createElement('span');
  groupA.className = 'lw-editor-btn-group';
  groupA.appendChild(makeButton('B', 'Bold', function () { execAndFocus('bold'); }));
  groupA.appendChild(makeButton('I', 'Italic', function () { execAndFocus('italic'); }));
  groupA.appendChild(makeButton('U', 'Underline', function () { execAndFocus('underline'); }));
  toolbar.appendChild(groupA);

  var groupB = document.createElement('span');
  groupB.className = 'lw-editor-btn-group';
  groupB.appendChild(makeButton('H1', 'Header 1', function () { execAndFocus('formatBlock', 'h1'); }));
  groupB.appendChild(makeButton('H2', 'Header 2', function () { execAndFocus('formatBlock', 'h2'); }));
  groupB.appendChild(makeButton('H3', 'Header 3', function () { execAndFocus('formatBlock', 'h3'); }));
  groupB.appendChild(makeButton('P', 'Paragraph', function () { execAndFocus('formatBlock', 'p'); }));
  toolbar.appendChild(groupB);

  var groupC = document.createElement('span');
  groupC.className = 'lw-editor-btn-group';
  groupC.appendChild(makeButton('\u21B6', 'Undo', function () { execAndFocus('undo'); }));
  groupC.appendChild(makeButton('\u21B7', 'Redo', function () { execAndFocus('redo'); }));
  groupC.appendChild(makeButton('Clear', 'Remove formatting', function () { execAndFocus('removeFormat'); }));
  toolbar.appendChild(groupC);

  // Build the editable surface, seeded with the textarea's current value
  // (already sanitized HTML from the server — see prepare_rich_content()).
  var area = document.createElement('div');
  area.className = 'lw-editor-surface';
  area.contentEditable = 'true';
  area.style.minHeight = height + 'px';
  area.innerHTML = textarea.value;

  // Hide the real textarea but keep it in the DOM so the form still submits
  // its "name" field normally — we just keep its value synced.
  textarea.style.display = 'none';

  var wrap = textarea.parentNode;
  wrap.insertBefore(toolbar, textarea);
  wrap.insertBefore(area, textarea);

  function syncToTextarea() {
    textarea.value = area.innerHTML;
    if (counterEl) {
      var len = (area.innerText || area.textContent || '').length;
      counterEl.textContent = len + ' / ' + maxChars;
    }
  }

  // Strip all inherited formatting from anything pasted — only plain text
  // (with line breaks preserved) ever makes it into the editor from a paste.
  area.addEventListener('paste', function (e) {
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
    document.execCommand('insertText', false, text);
    syncToTextarea();
  });

  area.addEventListener('input', function () {
    if (maxChars) {
      var len = (area.innerText || area.textContent || '').length;
      if (len > maxChars) {
        var truncated = (area.innerText || area.textContent || '').slice(0, maxChars);
        area.innerText = truncated;
        // Move caret to the end after truncating.
        var range = document.createRange();
        var sel = window.getSelection();
        range.selectNodeContents(area);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    syncToTextarea();
  });

  // Belt-and-braces: also sync right before the form submits.
  var form = textarea.closest('form');
  if (form) {
    form.addEventListener('submit', syncToTextarea);
  }

  syncToTextarea();
}
