/* AWFLWIKIWORLD — site.js */
(function () {
    var ta = document.getElementById('awfl-wikitext');
    var visual = document.getElementById('awfl-visual-preview');
    if (!ta || !visual) return; // not on an editor page

    var form = document.getElementById('awfl-edit-form');
    var tabSource = document.getElementById('awfl-tab-source');
    var tabVisual = document.getElementById('awfl-tab-visual');
    var currentMode = 'source';

    /* =====================================================
       Title <-> URL reversal (mirrors includes/functions.php)
       Needed so links produced by the server (awfl_page_url_raw)
       can be converted back into [[Page Title]] wikitext when
       the Visual editor's HTML is turned back into source.
       ===================================================== */
    function serverPath() {
        try {
            return new URL(window.AWFL_SERVER).pathname.replace(/\/$/, '');
        } catch (e) {
            return '';
        }
    }

    function urlformToTitle(urlform) {
        return urlform.split('/').map(function (seg) {
            return decodeURIComponent(seg).replace(/_/g, ' ');
        }).join('/');
    }

    function extractTitleFromHref(href) {
        if (!href || !window.AWFL_SERVER || href.indexOf(window.AWFL_SERVER) !== 0) return null;
        var url;
        try { url = new URL(href); } catch (e) { return null; }
        var base = serverPath();
        var route = window.AWFL_ROUTE || '0';

        if (route === '1') {
            var prefix1 = base + '/index.php/';
            if (url.pathname.indexOf(prefix1) === 0) {
                return urlformToTitle(url.pathname.slice(prefix1.length));
            }
        } else if (route === '2') {
            var prefix2 = base + '/namespaces/';
            if (url.pathname.indexOf(prefix2) === 0) {
                return urlformToTitle(url.pathname.slice(prefix2.length));
            }
        } else {
            if (url.pathname === base + '/index.php' && url.searchParams.has('title')) {
                return urlformToTitle(url.searchParams.get('title'));
            }
        }
        return null;
    }

    function imageSrcToToken(src) {
        var marker = '/images/';
        var idx = (src || '').indexOf(marker);
        return idx !== -1 ? src.slice(idx + marker.length) : src;
    }

    /* =====================================================
       HTML (Visual editor) -> AWFLWIKITEXT
       ===================================================== */
    function inlineToWikitext(node) {
        var out = '';
        node.childNodes.forEach(function (child) { out += nodeToWikitextInline(child); });
        return out;
    }

    function nodeToWikitextInline(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent.replace(/\u200B/g, '');
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        if (node.tagName.toLowerCase() === 'span' && node.classList.contains('awfl-nowiki')) {
            return '<nowiki>' + node.textContent + '</nowiki>';
        }
        switch (node.tagName.toLowerCase()) {
            case 'strong': case 'b':
                return "'''" + inlineToWikitext(node) + "'''";
            case 'em': case 'i':
                return "''" + inlineToWikitext(node) + "''";
            case 'u':
                return '__' + inlineToWikitext(node) + '__';
            case 's': case 'strike': case 'del':
                return '~~' + inlineToWikitext(node) + '~~';
            case 'code':
                return '`' + node.textContent + '`';
            case 'sup':
                return '^^' + inlineToWikitext(node) + '^^';
            case 'sub':
                return ',,' + inlineToWikitext(node) + ',,';
            case 'mark':
                return '%%' + inlineToWikitext(node) + '%%';
            case 'a': {
                var href = node.getAttribute('href') || '';
                var label = inlineToWikitext(node);
                var qNum = node.getAttribute('data-q');
                if (qNum) return (label && label !== 'Q' + qNum) ? '[[Q:' + qNum + '|' + label + ']]' : '[[Q:' + qNum + ']]';
                var wikiTitle = extractTitleFromHref(href);
                if (wikiTitle !== null) {
                    return (label && label !== wikiTitle) ? '[[' + wikiTitle + '|' + label + ']]' : '[[' + wikiTitle + ']]';
                }
                return '[' + href + ' ' + label + ']';
            }
            case 'img':
                return imageSrcToToken(node.getAttribute('src') || '');
            case 'br':
                return '\n';
            default:
                return inlineToWikitext(node);
        }
    }

    function infoboxTableToWikitext(table) {
        var title = null, image = null, caption = null, lines = [];
        Array.prototype.forEach.call(table.rows, function (row) {
            var titleCell = row.querySelector('th.infobox-title');
            if (titleCell) { title = titleCell.textContent.trim(); return; }
            var imageCell = row.querySelector('td.infobox-image');
            if (imageCell) {
                var img = imageCell.querySelector('img');
                if (img) image = imageSrcToToken(img.getAttribute('src') || '');
                var capEl = imageCell.querySelector('.infobox-caption');
                if (capEl) caption = capEl.textContent.trim();
                return;
            }
            var th = row.querySelector('th'), td = row.querySelector('td');
            if (th && td) lines.push('|' + th.textContent.trim() + '=' + inlineToWikitext(td).trim() + '|');
        });
        var out = '<infobox>\n';
        if (title !== null) out += '|title=' + title + '|\n';
        if (image !== null) out += '|image=' + image + '|\n';
        if (caption !== null) out += '|caption=' + caption + '|\n';
        out += lines.join('\n');
        out += '\n</infobox>';
        return out;
    }

    function blockToWikitext(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            var t = node.textContent;
            return t.trim() === '' ? null : t;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return null;
        var tag = node.tagName.toLowerCase();
        if (tag === 'span' && node.classList.contains('awfl-nowiki')) {
            return '<nowiki>' + node.textContent + '</nowiki>';
        }
        var h = tag.match(/^h([1-6])$/);
        if (h) {
            var eq = '='.repeat(parseInt(h[1], 10));
            return eq + ' ' + inlineToWikitext(node).trim() + ' ' + eq;
        }
        if (tag === 'ul' || tag === 'ol') {
            var marker = tag === 'ul' ? '* ' : '# ';
            return Array.prototype.map.call(node.children, function (li) {
                return marker + inlineToWikitext(li).trim();
            }).join('\n');
        }
        if (tag === 'table' && node.classList.contains('infobox')) {
            return infoboxTableToWikitext(node);
        }
        if (tag === 'img') {
            return imageSrcToToken(node.getAttribute('src') || '');
        }
        if (tag === 'hr') {
            return '----';
        }
        if (tag === 'blockquote') {
            var qtext = inlineToWikitext(node).trim();
            return qtext.split('\n').map(function (l) { return '> ' + l; }).join('\n');
        }
        if (tag === 'pre') {
            var codeEl = node.querySelector('code');
            var codeText = (codeEl || node).textContent.replace(/\n$/, '');
            return '{{{\n' + codeText + '\n}}}';
        }
        if (tag === 'p' || tag === 'div') {
            var text = inlineToWikitext(node).trim();
            return text === '' ? null : text;
        }
        var fallback = inlineToWikitext(node).trim();
        return fallback === '' ? null : fallback;
    }

    function htmlToWikitext(root) {
        var blocks = [];
        root.childNodes.forEach(function (node) {
            var b = blockToWikitext(node);
            if (b !== null && b.trim() !== '') blocks.push(b);
        });
        return blocks.join('\n\n') + '\n';
    }

    /* =====================================================
       Source <-> Visual sync
       Visual HTML always comes from the SAME server-side parser
       (awfl_parse_wiki via the preview endpoint) used to render
       the live page — so Visual and the saved/live page can never
       disagree about how a given source converts.
       ===================================================== */
    function previewUrl() {
        return form.action.replace(/action=save/, 'action=preview');
    }

    function syncSourceToVisual(cb) {
        var body = new URLSearchParams({ wikitext: ta.value });
        fetch(previewUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        }).then(function (r) { return r.text(); })
          .then(function (html) {
              visual.innerHTML = html || '<p><em>Nothing here yet — start typing.</em></p>';
              if (cb) cb();
          });
    }

    function syncVisualToSource() {
        ta.value = htmlToWikitext(visual);
    }

    function activateSource() {
        if (currentMode === 'visual') syncVisualToSource();
        currentMode = 'source';
        ta.style.display = '';
        visual.style.display = 'none';
        tabSource.classList.add('active');
        tabVisual.classList.remove('active');
    }

    function activateVisual() {
        if (currentMode === 'source') {
            syncSourceToVisual(function () {
                currentMode = 'visual';
                ta.style.display = 'none';
                visual.style.display = '';
                tabVisual.classList.add('active');
                tabSource.classList.remove('active');
            });
        } else {
            ta.style.display = 'none';
            visual.style.display = '';
            tabVisual.classList.add('active');
            tabSource.classList.remove('active');
        }
    }

    if (tabSource) tabSource.addEventListener('click', activateSource);
    if (tabVisual) tabVisual.addEventListener('click', activateVisual);

    // Always sync Visual -> Source right before the page is actually saved,
    // regardless of which tab is showing, so the submitted wikitext always
    // matches whatever is currently on screen.
    if (form) form.addEventListener('submit', function () {
        if (currentMode === 'visual') syncVisualToSource();
    });

    /* =====================================================
       Toolbar — works in both Source and Visual mode
       ===================================================== */
    function wrapSelection(open, close) {
        var start = ta.selectionStart, end = ta.selectionEnd;
        var val = ta.value;
        var selected = val.substring(start, end) || 'text';
        ta.value = val.substring(0, start) + open + selected + close + val.substring(end);
        ta.focus();
        ta.selectionStart = start + open.length;
        ta.selectionEnd = start + open.length + selected.length;
    }

    var visualTagForWrap = { '~~': 'strike', '`': 'code', '^^': 'sup', ',,': 'sub', '%%': 'mark' };

    function wrapSelectionInVisualTag(tagName) {
        var sel = window.getSelection();
        if (!sel.rangeCount) return;
        var range = sel.getRangeAt(0);
        var wrapper = document.createElement(tagName);
        if (range.collapsed) {
            wrapper.textContent = 'text';
            range.insertNode(wrapper);
        } else {
            try {
                range.surroundContents(wrapper);
            } catch (e) {
                wrapper.appendChild(range.extractContents());
                range.insertNode(wrapper);
            }
        }
        range.selectNodeContents(wrapper);
        sel.removeAllRanges();
        sel.addRange(range);
    }

    document.querySelectorAll('[data-wrap]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var w = btn.getAttribute('data-wrap');
            if (currentMode === 'visual') {
                visual.focus();
                if (w === "'''") document.execCommand('bold');
                else if (w === "''") document.execCommand('italic');
                else if (w === '__') document.execCommand('underline');
                else if (w === '~~') document.execCommand('strikeThrough');
                else if (w === '^^') document.execCommand('superscript');
                else if (w === ',,') document.execCommand('subscript');
                else if (visualTagForWrap[w]) wrapSelectionInVisualTag(visualTagForWrap[w]);
            } else {
                wrapSelection(w, w);
            }
        });
    });

    var quoteBtn = document.getElementById('awfl-btn-quote');
    if (quoteBtn) quoteBtn.addEventListener('click', function () {
        if (currentMode === 'visual') {
            visual.focus();
            document.execCommand('formatBlock', false, 'blockquote');
            return;
        }
        var start = ta.selectionStart, end = ta.selectionEnd;
        var val = ta.value;
        var selected = val.substring(start, end) || 'Quoted text';
        var lines = selected.split('\n').map(function (l) {
            return l.trim() === '' ? l : (l.startsWith('> ') ? l : '> ' + l);
        });
        ta.value = val.substring(0, start) + lines.join('\n') + val.substring(end);
        ta.focus();
    });

    var hrBtn = document.getElementById('awfl-btn-hr');
    if (hrBtn) hrBtn.addEventListener('click', function () {
        if (currentMode === 'visual') {
            visual.focus();
            document.execCommand('insertHTML', false, '<hr><p><br></p>');
            return;
        }
        var start = ta.selectionStart;
        var val = ta.value;
        ta.value = val.substring(0, start) + '\n\n----\n\n' + val.substring(start);
        ta.focus();
    });

    var codeblockBtn = document.getElementById('awfl-btn-codeblock');
    if (codeblockBtn) codeblockBtn.addEventListener('click', function () {
        if (currentMode === 'visual') {
            visual.focus();
            document.execCommand('insertHTML', false, '<pre><code>your code here</code></pre><p><br></p>');
            return;
        }
        var start = ta.selectionStart, end = ta.selectionEnd;
        var val = ta.value;
        var selected = val.substring(start, end) || 'your code here';
        ta.value = val.substring(0, start) + '\n\n{{{\n' + selected + '\n}}}\n\n' + val.substring(end);
        ta.focus();
    });

    var pBtn = document.getElementById('awfl-btn-p');
    if (pBtn) pBtn.addEventListener('click', function () {
        if (currentMode === 'visual') {
            visual.focus();
            document.execCommand('insertHTML', false, '<br><br>');
            return;
        }
        var start = ta.selectionStart, end = ta.selectionEnd;
        var val = ta.value;
        var selected = val.substring(start, end) || 'New paragraph';
        ta.value = val.substring(0, start) + '\n\n' + selected + '\n\n' + val.substring(end);
        ta.focus();
    });

    var listBtn = document.getElementById('awfl-btn-list');
    if (listBtn) listBtn.addEventListener('click', function () {
        if (currentMode === 'visual') {
            visual.focus();
            document.execCommand('insertUnorderedList');
            return;
        }
        var start = ta.selectionStart, end = ta.selectionEnd;
        var val = ta.value;
        var selected = val.substring(start, end) || 'List item';
        var lines = selected.split('\n').map(function (l) {
            return l.trim() === '' ? l : (l.startsWith('* ') ? l : '* ' + l);
        });
        var replaced = lines.join('\n');
        ta.value = val.substring(0, start) + replaced + val.substring(end);
        ta.focus();
    });

    var infoboxBtn = document.getElementById('awfl-btn-infobox');
    if (infoboxBtn) infoboxBtn.addEventListener('click', function () {
        if (currentMode === 'visual') {
            visual.focus();
            document.execCommand('insertHTML', false,
                '<table class="infobox"><tbody>' +
                '<tr><th class="infobox-title" colspan="2">Title</th></tr>' +
                '<tr><td colspan="2" class="infobox-image"><img src="https://example.com/image.jpg" style="width:250px !important;height:auto;"><div class="infobox-caption">Caption text</div></td></tr>' +
                '<tr><th>Name</th><td>Name</td></tr>' +
                '<tr><th>Description</th><td>Short description</td></tr>' +
                '</tbody></table><p><br></p>');
            return;
        }
        var start = ta.selectionStart;
        var val = ta.value;
        var template = '<infobox>\n|image=https://example.com/image.jpg|\n|caption=Caption text|\n|title=Title|\n|name=Name|\n|description=Short description|\n</infobox>\n';
        ta.value = val.substring(0, start) + template + val.substring(start);
        ta.focus();
    });

    /* =====================================================
       Live auto-format: typing raw AWFLWIKITEXT markers
       ('''bold''', ''italic'', __underline__) directly inside
       the Visual editor converts them into real formatting as
       you finish typing the closing marker.
       ===================================================== */
    visual.addEventListener('input', function () {
        var sel = window.getSelection();
        if (!sel.rangeCount) return;
        var node = sel.anchorNode;
        if (!node || node.nodeType !== Node.TEXT_NODE) return;

        var text = node.textContent;
        var caret = sel.anchorOffset;
        var before = text.slice(0, caret);
        var after = text.slice(caret);

        var patterns = [
            { re: /'''([^']+?)'''$/, tag: 'strong' },
            { re: /__([^_]+?)__$/, tag: 'u' },
            { re: /''([^']+?)''$/, tag: 'em' },
            { re: /~~([^~]+?)~~$/, tag: 's' },
            { re: /`([^`]+?)`$/, tag: 'code' },
            { re: /%%([^%]+?)%%$/, tag: 'mark' }
        ];

        for (var i = 0; i < patterns.length; i++) {
            var m = before.match(patterns[i].re);
            if (!m) continue;

            var wrapper = document.createElement(patterns[i].tag);
            wrapper.textContent = m[1];

            var frag = document.createDocumentFragment();
            var beforeText = before.slice(0, m.index);
            if (beforeText) frag.appendChild(document.createTextNode(beforeText));
            frag.appendChild(wrapper);
            var trailing = document.createTextNode('\u200B' + after);
            frag.appendChild(trailing);

            node.parentNode.replaceChild(frag, node);

            var range = document.createRange();
            range.setStart(trailing, 1);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            break;
        }
    });
})();

/* ---- Admin dashboard: color palette pickers ---- */
(function () {
    document.querySelectorAll('.awfl-color-row input[type=color]').forEach(function (colorInput) {
        var textInput = colorInput.parentElement.querySelector('input[type=text]');
        if (!textInput) return;
        colorInput.addEventListener('input', function () { textInput.value = colorInput.value; });
        textInput.addEventListener('input', function () {
            if (/^#[0-9a-fA-F]{6}$/.test(textInput.value)) colorInput.value = textInput.value;
        });
    });
})();

/* ---- Page actions: "Download" format dropdown ---- */
(function () {
    document.addEventListener('click', function (e) {
        document.querySelectorAll('.awfl-download-menu.open').forEach(function (menu) {
            if (!menu.contains(e.target)) menu.classList.remove('open');
        });
    });
})();
