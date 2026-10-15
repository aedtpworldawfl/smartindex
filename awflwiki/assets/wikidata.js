(function () {
    const body = document.getElementById('wdBody');
    const search = document.getElementById('wdSearch');
    const catFilter = document.getElementById('wdCategoryFilter');
    let allRows = [];
    let isAdmin = false;

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function render() {
        const q = (search.value || '').toLowerCase();
        const cat = catFilter.value;
        const filtered = allRows.filter(w => {
            const matchesQ = !q || w.title.toLowerCase().includes(q) || w.author.toLowerCase().includes(q);
            const matchesCat = !cat || w.category === cat;
            return matchesQ && matchesCat;
        });

        if (filtered.length === 0) {
            body.innerHTML = `<tr><td colspan="${isAdmin ? 6 : 4}">No wikis found.</td></tr>`;
            return;
        }

        body.innerHTML = filtered.map(w => `
            <tr data-category="${escapeHtml(w.category)}" data-wiki="${escapeHtml(w.wiki)}">
                ${isAdmin ? `<td><input type="checkbox" class="wd-row-check"></td>` : ''}
                <td><a href="/awflwiki/${w.category}/${w.wiki}" target="_blank">${escapeHtml(w.title)}</a></td>
                <td><span class="cat-tag">${escapeHtml(w.category)}</span></td>
                <td>${escapeHtml(w.author)}</td>
                <td>${(w.created_at || '').slice(0, 10)}</td>
                ${isAdmin ? `<td class="wd-actions">
                    <button type="button" class="btn secondary wd-edit-btn">Edit</button>
                    <button type="button" class="btn wd-delete-btn" style="background:var(--primary);">Delete</button>
                </td>` : ''}
            </tr>
        `).join('');
    }

    async function loadAll() {
        const result = await awflGet('list_all_wikis');
        if (!result.ok) {
            body.innerHTML = '<tr><td colspan="6">Could not load wikis.</td></tr>';
            return;
        }
        allRows = result.wikis;
        isAdmin = !!result.is_admin;
        document.getElementById('wdTotal').textContent = result.total;

        if (isAdmin) {
            document.getElementById('wdAdminBar').style.display = 'inline-flex';
            document.getElementById('wdSelectAllHead').style.display = '';
            document.getElementById('wdActionsHead').style.display = '';
        }
        render();
    }

    search.addEventListener('input', render);
    catFilter.addEventListener('change', render);

    document.getElementById('wdSelectAll')?.addEventListener('change', e => {
        document.querySelectorAll('.wd-row-check').forEach(cb => cb.checked = e.target.checked);
    });

    // Row-level admin actions (edit / delete) — delegated since rows re-render
    body.addEventListener('click', async e => {
        const row = e.target.closest('tr[data-category]');
        if (!row) return;
        const category = row.dataset.category;
        const wiki = row.dataset.wiki;

        if (e.target.closest('.wd-delete-btn')) {
            if (!confirm(`Delete "${row.querySelector('a').textContent}" permanently?`)) return;
            const result = await awflPost('delete_wiki', { category, wiki });
            if (result.ok) {
                allRows = allRows.filter(w => !(w.category === category && w.wiki === wiki));
                document.getElementById('wdTotal').textContent = allRows.length;
                render();
            } else {
                alert(result.error || 'Delete failed.');
            }
        }

        if (e.target.closest('.wd-edit-btn')) {
            const result = await awflGet('get_wiki', { category, wiki });
            if (!result.ok) return alert(result.error || 'Could not load wiki.');
            document.getElementById('wdEditCategory').value = category;
            document.getElementById('wdEditSlug').value = wiki;
            document.getElementById('wdEditTitle').value = result.title;
            document.getElementById('wdEditArea').innerHTML = result.content;
            document.getElementById('wdVerifyPanel').style.display = 'none';
            loadInfoboxIntoPanel(result.metadata_infobox);
            document.getElementById('wdEditBackdrop').classList.add('open');
        }
    });

    // ---- Verify panel: admin-only metadata infobox editor ----
    const mibRows = document.getElementById('wdMibRows');
    const mibImage = document.getElementById('wdMibImage');
    const mibAlt = document.getElementById('wdMibAlt');
    const mibAltCounter = document.getElementById('wdMibAltCounter');
    const verifyMsg = document.getElementById('wdVerifyMsg');
    const MIB_MAX_ALT = 100;

    mibAlt.setAttribute('maxlength', String(MIB_MAX_ALT));
    mibAlt.addEventListener('input', () => {
        mibAltCounter.textContent = `${mibAlt.value.length}/${MIB_MAX_ALT} — keep it a brief description, not a full caption`;
    });

    function addMibRow(row = {}) {
        const div = document.createElement('div');
        div.className = 'mib-row';
        div.innerHTML = `
            <input type="text" class="mib-category" placeholder="Category (e.g. Music)" value="${(row.category || '').replace(/"/g, '&quot;')}">
            <input type="text" class="mib-display-name" placeholder="Display name" value="${(row.display_name || '').replace(/"/g, '&quot;')}">
            <input type="text" class="mib-link" placeholder="Link (opens on click, optional)" value="${(row.link || '').replace(/"/g, '&quot;')}">
            <button type="button" class="mib-remove-row" title="Remove row">&times;</button>
        `;
        div.querySelector('.mib-remove-row').addEventListener('click', () => div.remove());
        mibRows.appendChild(div);
    }

    function loadInfoboxIntoPanel(infobox) {
        mibRows.innerHTML = '';
        mibImage.value = infobox?.image || '';
        mibAlt.value = infobox?.alt || '';
        mibAltCounter.textContent = `${mibAlt.value.length}/${MIB_MAX_ALT} — keep it a brief description, not a full caption`;
        const rows = infobox?.rows && infobox.rows.length ? infobox.rows : [{}];
        rows.forEach(addMibRow);
        verifyMsg.style.display = 'none';
    }

    document.getElementById('wdVerifyToggle').addEventListener('click', () => {
        const panel = document.getElementById('wdVerifyPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('wdMibAddRow').addEventListener('click', () => addMibRow());

    document.getElementById('wdMibSave').addEventListener('click', async () => {
        const category = document.getElementById('wdEditCategory').value;
        const wiki = document.getElementById('wdEditSlug').value;
        const image = mibImage.value.trim();
        const alt = mibAlt.value.trim();

        if (!!image !== !!alt) {
            showMsg(verifyMsg, 'Fill in both the image URL and alt text, or leave both empty.', false);
            return;
        }

        const rows = [...mibRows.querySelectorAll('.mib-row')].map(r => ({
            category: r.querySelector('.mib-category').value.trim(),
            display_name: r.querySelector('.mib-display-name').value.trim(),
            link: r.querySelector('.mib-link').value.trim(),
        })).filter(r => r.category && r.display_name);

        if (rows.length === 0) {
            showMsg(verifyMsg, 'Add at least one row with a category and display name.', false);
            return;
        }

        const result = await awflPost('save_infobox', { category, wiki, image, alt, rows: JSON.stringify(rows) });
        if (result.ok) {
            showMsg(verifyMsg, 'Metadata infobox saved.', true);
        } else {
            showMsg(verifyMsg, result.error || 'Save failed.', false);
        }
    });

    document.getElementById('wdMibRemove').addEventListener('click', async () => {
        if (!confirm('Remove the metadata infobox from this wiki?')) return;
        const category = document.getElementById('wdEditCategory').value;
        const wiki = document.getElementById('wdEditSlug').value;
        const result = await awflPost('remove_infobox', { category, wiki });
        if (result.ok) {
            loadInfoboxIntoPanel(null);
            showMsg(verifyMsg, 'Metadata infobox removed.', true);
        } else {
            showMsg(verifyMsg, result.error || 'Remove failed.', false);
        }
    });

    document.getElementById('wdDeleteSelected')?.addEventListener('click', async () => {
        const items = [...document.querySelectorAll('.wd-row-check:checked')].map(cb => {
            const row = cb.closest('tr');
            return { category: row.dataset.category, wiki: row.dataset.wiki };
        });
        if (items.length === 0) return alert('No wikis selected.');
        if (!confirm(`Delete ${items.length} selected wiki(s) permanently?`)) return;
        const result = await awflPost('admin_delete_bulk', { items: JSON.stringify(items) });
        if (result.ok) {
            const keys = new Set(items.map(i => i.category + '::' + i.wiki));
            allRows = allRows.filter(w => !keys.has(w.category + '::' + w.wiki));
            document.getElementById('wdTotal').textContent = allRows.length;
            render();
        } else {
            alert(result.error || 'Bulk delete failed.');
        }
    });

    document.getElementById('wdDeleteAll')?.addEventListener('click', async () => {
        if (!confirm('This deletes EVERY wiki across every category. Are you absolutely sure?')) return;
        if (!confirm('Really sure? This cannot be undone.')) return;
        const result = await awflPost('admin_delete_all_wikis');
        if (result.ok) {
            allRows = [];
            document.getElementById('wdTotal').textContent = '0';
            render();
        } else {
            alert(result.error || 'Delete all failed.');
        }
    });

    // ---- Edit modal wiring (shares editor.js with publish.php) ----
    const editArea = document.getElementById('wdEditArea');
    const editMsg = document.getElementById('wdEditMsg');

    AWFL_wireToolbar(document.querySelector('#wdEditBackdrop .editor-toolbar'), editArea);
    AWFL_wireMediaSelection(editArea);
    AWFL_wireMediaInsert({
        urlInput: document.getElementById('wdEditMediaUrl'),
        typeSelect: document.getElementById('wdEditMediaType'),
        altInput: document.getElementById('wdEditMediaAlt'),
        altCounter: document.getElementById('wdEditAltCounter'),
        insertBtn: document.getElementById('wdEditInsertMediaBtn'),
        editorEl: editArea,
        msgEl: editMsg,
    });

    document.getElementById('wdEditCancel').addEventListener('click', () => {
        document.getElementById('wdEditBackdrop').classList.remove('open');
    });

    document.getElementById('wdEditSave').addEventListener('click', async () => {
        const category = document.getElementById('wdEditCategory').value;
        const wiki = document.getElementById('wdEditSlug').value;
        const title = document.getElementById('wdEditTitle').value.trim();
        const content = editArea.innerHTML.trim();
        if (!title || !content) {
            showMsg(editMsg, 'Title and content are required.', false);
            return;
        }
        const result = await awflPost('edit_wiki', { category, wiki, title, content });
        if (result.ok) {
            showMsg(editMsg, 'Republished.', true);
            const row = allRows.find(w => w.category === category && w.wiki === wiki);
            if (row) row.title = title;
            render();
            setTimeout(() => document.getElementById('wdEditBackdrop').classList.remove('open'), 700);
        } else {
            showMsg(editMsg, result.error || 'Save failed.', false);
        }
    });

    loadAll();
})();
