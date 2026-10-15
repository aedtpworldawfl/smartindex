/**
 * LyricsWorld rich-text editor bootstrap.
 * Used for every editor panel on the site: artist bios, song lyrics,
 * and contributor lyric corrections.
 *
 * Rule: whatever is pasted into a LyricsWorld editor panel is stripped
 * down to plain text first — all inherited formatting from the source
 * (bold, colors, fonts, links, spans, whatever) is discarded on paste.
 * After that, the user is free to apply LyricsWorld's own formatting
 * (Bold / Italic / Underline / H1 / H2 / H3 / Paragraph) from the toolbar.
 */
function initLyricsWorldEditor(selector, opts) {
  opts = opts || {};
  tinymce.init({
    selector: selector,
    menubar: false,
    branding: false,
    statusbar: true,
    height: opts.height || 320,
    max_chars: opts.maxChars || null,

    // Force pasted content to plain text — this is the core requirement.
    paste_as_text: true,
    paste_data_images: false,
    smart_paste: false,

    // Belt-and-braces: even in plain-text mode, actively scrub anything
    // that could carry formatting back in (styles, classes, spans, etc.)
    paste_preprocess: function (plugin, args) {
      var tmp = document.createElement('div');
      tmp.innerHTML = args.content;
      var text = tmp.textContent || tmp.innerText || '';
      // Escape back to safe plain text; TinyMCE will wrap it in <p> itself.
      args.content = text
        .split('\n')
        .map(function (line) {
          var d = document.createElement('div');
          d.textContent = line;
          return d.innerHTML;
        })
        .join('<br>');
    },

    toolbar: 'bold italic underline | h1btn h2btn h3btn pbtn | undo redo | removeformat',
    plugins: '',
    content_style: `
      body {
        font-family: Inter, system-ui, sans-serif;
        font-size: 15px;
        background: #232326;
        color: #f4f4f5;
      }
      p { margin: 0 0 6px; }
      h1, h2, h3 { margin: 14px 0 6px; }
      .lw-ltag { color: #4da3ff; font-weight: 700; }
    `,
    setup: function (editor) {
      // Custom H1 / H2 / H3 / P block-format buttons — "B" "I" "U" are
      // TinyMCE's own built-in buttons, "↩"/"↪" map to Undo/Redo.
      var blockButtons = { h1btn: ['H1', 'h1'], h2btn: ['H2', 'h2'], h3btn: ['H3', 'h3'], pbtn: ['P', 'p'] };
      Object.keys(blockButtons).forEach(function (name) {
        var label = blockButtons[name][0];
        var tag = blockButtons[name][1];
        editor.ui.registry.addButton(name, {
          text: label,
          tooltip: tag === 'p' ? 'Paragraph' : 'Header ' + label.slice(1),
          onAction: function () {
            editor.execCommand('FormatBlock', false, tag);
          }
        });
      });

      if (opts.maxChars) {
        editor.on('keyup change', function () {
          var len = editor.getContent({ format: 'text' }).length;
          var counter = document.getElementById(selector.replace('#', '') + '-count');
          if (counter) counter.textContent = len + ' / ' + opts.maxChars;
          if (len > opts.maxChars) {
            var content = editor.getContent({ format: 'text' }).slice(0, opts.maxChars);
            editor.setContent('<p>' + content.replace(/\n/g, '<br>') + '</p>');
          }
        });
      }
    }
  });
}
