/* AWFLWIKIWORLD — search.js
   Header search autocomplete: shows up to 5 likely page matches in a
   dropdown as you type. Each row = [first image on that page] | page name.
   Clicking (or pressing Enter on a highlighted row) opens the page. */
(function () {
    var form = document.querySelector('.awfl-searchform[data-search-endpoint]');
    if (!form) return;
    var input = form.querySelector('input[name="title"]');
    if (!input) return;

    var endpoint = form.getAttribute('data-search-endpoint');
    var pageBase = form.getAttribute('data-search-page');
    var initial = input.value;

    /* Styles are injected here so the dropdown looks right under every skin. */
    var css = document.createElement('style');
    css.textContent =
        '.awfl-searchform{position:relative}' +
        '.awfl-suggest{position:absolute;left:0;right:0;top:100%;z-index:9999;margin:2px 0 0;padding:0;list-style:none;' +
        'background:var(--awfl-content-bg,#fff);color:var(--awfl-page-text,#202122);border:1px solid var(--awfl-border,#a2a9b1);' +
        'border-radius:2px;box-shadow:0 4px 12px rgba(0,0,0,.25);max-height:70vh;overflow:auto}' +
        '.awfl-suggest[hidden]{display:none}' +
        '.awfl-suggest li{margin:0}' +
        '.awfl-suggest a{display:flex;align-items:center;gap:10px;padding:6px 10px;color:inherit !important;text-decoration:none;cursor:pointer;opacity:1}' +
        '.awfl-suggest li.active a,.awfl-suggest a:hover{background:rgba(51,102,204,.15)}' +
        '.awfl-suggest .awfl-sg-img{flex:0 0 40px;width:40px;height:40px;border-radius:3px;overflow:hidden;background:rgba(127,127,127,.2);' +
        'display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--awfl-page-text,#202122)}' +
        '.awfl-suggest .awfl-sg-img img{width:100%;height:100%;object-fit:cover;display:block}' +
        '.awfl-suggest .awfl-sg-sep{align-self:stretch;width:1px;background:var(--awfl-border,#a2a9b1)}' +
        '.awfl-suggest .awfl-sg-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.awfl-suggest li.awfl-sg-all a{justify-content:center;font-size:.85em;border-top:1px solid var(--awfl-border,#a2a9b1)}' +
        '.awfl-suggest li.awfl-sg-empty{padding:8px 10px;font-size:.9em;opacity:.75}' +
        '.awfl-search-results{list-style:none;padding:0}' +
        '.awfl-search-results li{display:flex;gap:12px;margin:0 0 14px}' +
        '.awfl-sr-thumb{flex:0 0 64px;width:64px;height:64px;border-radius:3px;overflow:hidden;background:rgba(127,127,127,.2);' +
        'display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.4rem}' +
        '.awfl-sr-thumb img{width:100%;height:100%;object-fit:cover}' +
        '.awfl-sr-snippet{font-size:.9em;opacity:.8}';
    document.head.appendChild(css);

    var list = document.createElement('ul');
    list.className = 'awfl-suggest';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    form.appendChild(list);

    var items = [], active = -1, timer = null, seq = 0, ctrl = null;

    function hide() { list.hidden = true; active = -1; }

    function setActive(i) {
        var lis = list.querySelectorAll('li[data-url]');
        if (!lis.length) return;
        active = (i + lis.length) % lis.length;
        for (var k = 0; k < lis.length; k++) lis[k].classList.toggle('active', k === active);
    }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    function render(results, q) {
        list.innerHTML = '';
        active = -1;
        if (!results.length) {
            list.appendChild(el('li', 'awfl-sg-empty', 'No matching pages'));
        }
        results.forEach(function (r) {
            var li = el('li');
            li.setAttribute('data-url', r.url);
            li.setAttribute('role', 'option');
            var a = el('a');
            a.href = r.url;
            var box = el('span', 'awfl-sg-img');
            if (r.image) {
                var img = el('img');
                img.alt = '';
                img.loading = 'lazy';
                img.src = r.image;
                img.onerror = function () { box.textContent = initialOf(r.title); };
                box.appendChild(img);
            } else {
                box.textContent = initialOf(r.title);
            }
            a.appendChild(box);
            a.appendChild(el('span', 'awfl-sg-sep'));
            a.appendChild(el('span', 'awfl-sg-name', r.title));
            li.appendChild(a);
            list.appendChild(li);
        });
        var all = el('li', 'awfl-sg-all');
        var allA = el('a', null, 'See all results for “' + q + '”');
        allA.href = pageBase + encodeURIComponent(q);
        all.appendChild(allA);
        list.appendChild(all);
        list.hidden = false;
    }

    function initialOf(t) {
        var last = t.split('/').pop();
        return last ? last.charAt(0).toUpperCase() : '?';
    }

    function fetchResults(q) {
        var mine = ++seq;
        if (ctrl && ctrl.abort) ctrl.abort();
        ctrl = window.AbortController ? new AbortController() : null;
        fetch(endpoint + encodeURIComponent(q), ctrl ? { signal: ctrl.signal } : undefined)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (mine !== seq) return; // stale response
                if (input.value.trim() !== q) return;
                render(Array.isArray(data) ? data.slice(0, 5) : [], q);
            })
            .catch(function () { /* aborted or offline: keep quiet */ });
    }

    input.addEventListener('input', function () {
        var q = input.value.trim();
        clearTimeout(timer);
        if (q.length < 1) { seq++; hide(); return; }
        timer = setTimeout(function () { fetchResults(q); }, 180);
    });

    input.addEventListener('keydown', function (e) {
        if (list.hidden) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active < 0 ? -1 : active - 1); }
        else if (e.key === 'Escape') { hide(); }
        else if (e.key === 'Enter' && active >= 0) {
            var li = list.querySelectorAll('li[data-url]')[active];
            if (li) { e.preventDefault(); window.location.href = li.getAttribute('data-url'); }
        }
    });

    input.addEventListener('focus', function () {
        var q = input.value.trim();
        // Don't pop the dropdown for the pre-filled current page name.
        if (q && q !== initial.trim()) fetchResults(q);
    });

    document.addEventListener('click', function (e) {
        if (!form.contains(e.target)) hide();
    });
})();
