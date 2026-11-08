// AWFL WIKI admin dashboard (admin only; every action is re-checked server-side)
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugOf = (w) => String(w).replace(/\.(txt|html)$/i, '');
const flash = (text, ok = true) => { showMsg($('dMsg'), text, ok); clearTimeout(flash.t); flash.t = setTimeout(() => $('dMsg').style.display = 'none', 4000); };

/* ---------- tabs ---------- */
const loaders = { overview: loadStats, wikis: loadWikis, users: loadUsers, skins: loadSkins };
document.querySelectorAll('#dTabs button').forEach(b => b.addEventListener('click', () => openTab(b.dataset.tab)));
function openTab(name) {
    document.querySelectorAll('#dTabs button').forEach(x => x.classList.toggle('active', x.dataset.tab === name));
    document.querySelectorAll('.dash-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
    loaders[name]();
}
$('dLogout').addEventListener('click', async (e) => { e.preventDefault(); await awflPost('logout'); location.href = '/awflwiki/'; });

/* ---------- overview ---------- */
async function loadStats() {
    const r = await awflGet('admin_stats');
    if (!r.ok) { $('dStats').textContent = r.error || 'Failed to load'; return; }
    const card = (n, l) => `<div class="dash-stat"><b>${esc(n)}</b>${esc(l)}</div>`;
    $('dStats').innerHTML = card(r.wikis, 'Wikis') + card(r.users, 'Users') + card(r.verified, 'Verified users') +
        card(r.banned, 'Banned users') + card(r.skins, 'Skins') + card(r.active_skin, 'Active skin') +
        Object.entries(r.per_category).map(([c, n]) => card(n, c)).join('');
}

/* ---------- wikis ---------- */
let wikis = [];
async function loadWikis() {
    const r = await awflGet('list_all_wikis');
    if (!r.ok) { $('dwBody').innerHTML = `<tr><td colspan="6">${esc(r.error)}</td></tr>`; return; }
    wikis = r.wikis; renderWikis();
}
function renderWikis() {
    const q = $('dwSearch').value.toLowerCase(), cat = $('dwCat').value;
    const rows = wikis.filter(w => (!cat || w.category === cat) &&
        (!q || (w.title || '').toLowerCase().includes(q) || (w.author || '').toLowerCase().includes(q)));
    $('dwAll').checked = false;
    $('dwBody').innerHTML = rows.length ? rows.map(w => `
        <tr data-cat="${esc(w.category)}" data-wiki="${esc(w.wiki)}">
            <td><input type="checkbox" class="dw-sel"></td>
            <td><a href="/awflwiki/${esc(w.category)}/${esc(slugOf(w.wiki))}" target="_blank">${esc(w.title)}</a></td>
            <td>${esc(w.category)}</td><td>${esc(w.author)}</td><td>${esc((w.updated_at || w.created_at || '').slice(0, 10))}</td>
            <td class="dash-actions"><button class="btn secondary dw-edit">Edit</button><button class="btn dw-del">Delete</button></td>
        </tr>`).join('') : '<tr><td colspan="6">No pages found.</td></tr>';
}
$('dwSearch').addEventListener('input', renderWikis);
$('dwCat').addEventListener('change', renderWikis);
$('dwAll').addEventListener('change', e => document.querySelectorAll('.dw-sel').forEach(c => c.checked = e.target.checked));
$('dwBody').addEventListener('click', async (e) => {
    const tr = e.target.closest('tr'); if (!tr || !tr.dataset.wiki) return;
    const category = tr.dataset.cat, wiki = tr.dataset.wiki;
    if (e.target.classList.contains('dw-del')) {
        if (!confirm('Delete this page permanently?')) return;
        const r = await awflPost('delete_wiki', { category, wiki });
        r.ok ? (flash('Page deleted.'), loadWikis()) : flash(r.error, false);
    } else if (e.target.classList.contains('dw-edit')) {
        const r = await awflGet('get_wiki', { category, wiki });
        if (!r.ok) return flash(r.error, false);
        openWikiModal({ category, wiki, title: r.title, content: r.content });
    }
});
$('dwDelSel').addEventListener('click', async () => {
    const items = [...document.querySelectorAll('.dw-sel:checked')].map(c => { const tr = c.closest('tr'); return { category: tr.dataset.cat, wiki: tr.dataset.wiki }; });
    if (!items.length) return flash('Select at least one page.', false);
    if (!confirm(`Delete ${items.length} page(s) permanently?`)) return;
    const r = await awflPost('admin_delete_bulk', { items: JSON.stringify(items) });
    r.ok ? (flash(`${r.deleted} page(s) deleted.`), loadWikis()) : flash(r.error, false);
});
let editing = null;
function openWikiModal(w) {
    editing = w;
    $('dwModalTitle').textContent = w ? 'Edit page' : 'Add page';
    $('dwMCat').value = w ? w.category : $('dwMCat').options[0].value; $('dwMCat').disabled = !!w;
    $('dwMTitle').value = w ? w.title : ''; $('dwMContent').value = w ? w.content : '';
    $('dwMMsg').style.display = 'none'; $('dwModalBg').classList.add('open');
}
$('dwAdd').addEventListener('click', () => openWikiModal(null));
$('dwMCancel').addEventListener('click', () => $('dwModalBg').classList.remove('open'));
$('dwMSave').addEventListener('click', async () => {
    const title = $('dwMTitle').value.trim(), content = $('dwMContent').value.trim(), category = $('dwMCat').value;
    if (!title || !content) return showMsg($('dwMMsg'), 'Title and content are required.', false);
    const r = editing ? await awflPost('edit_wiki', { category, wiki: editing.wiki, title, content })
                      : await awflPost('upload_wiki', { category, title, content });
    if (!r.ok) return showMsg($('dwMMsg'), r.error, false);
    $('dwModalBg').classList.remove('open'); flash(editing ? 'Page saved.' : 'Page added.'); loadWikis();
});

/* ---------- users ---------- */
let users = [];
async function loadUsers() {
    const r = await awflGet('admin_users');
    if (!r.ok) { $('duBody').innerHTML = `<tr><td colspan="5">${esc(r.error)}</td></tr>`; return; }
    users = r.users; renderUsers();
}
function renderUsers() {
    const q = $('duSearch').value.toLowerCase();
    const rows = users.filter(u => !q || [u.username, u.name, u.email].some(v => (v || '').toLowerCase().includes(q)));
    $('duBody').innerHTML = rows.length ? rows.map(u => `
        <tr data-user="${esc(u.username)}">
            <td><a href="/awflwiki/users/${encodeURIComponent(u.username)}/" target="_blank">${esc(u.username)}</a><div class="wiki-author">${esc(u.name)}</div></td>
            <td>${esc(u.email)}</td><td>${Number(u.wiki_count)}</td>
            <td>${u.verified ? '<span class="dash-tag good">Verified</span> ' : ''}${u.banned ? '<span class="dash-tag bad">Banned</span>' : (u.verified ? '' : '—')}</td>
            <td class="dash-actions">
                <button class="btn secondary du-verify" data-v="${u.verified ? 0 : 1}">${u.verified ? 'Unverify' : 'Verify'}</button>
                <button class="btn secondary du-ban" data-v="${u.banned ? 0 : 1}">${u.banned ? 'Unban' : 'Ban'}</button>
                <button class="btn du-del">Delete</button>
            </td>
        </tr>`).join('') : '<tr><td colspan="5">No users found.</td></tr>';
}
$('duSearch').addEventListener('input', renderUsers);
$('duBody').addEventListener('click', async (e) => {
    const tr = e.target.closest('tr'); if (!tr || !tr.dataset.user) return;
    const username = tr.dataset.user, c = e.target.classList; let r;
    if (c.contains('du-verify')) r = await awflPost('admin_verify_user', { username, value: e.target.dataset.v });
    else if (c.contains('du-ban')) {
        if (e.target.dataset.v === '1' && !confirm(`Ban ${username}? They will be signed out and unable to log in.`)) return;
        r = await awflPost('admin_ban_user', { username, value: e.target.dataset.v });
    } else if (c.contains('du-del')) {
        if (!confirm(`Delete ${username} and ALL of their pages permanently?`)) return;
        r = await awflPost('admin_delete_user', { username });
    } else return;
    r.ok ? (flash('Done.'), loadUsers()) : flash(r.error, false);
});

/* ---------- skins ---------- */
let skParts = [], skState = { name: '', isNew: false, locked: false };

// "#FFFFFF" -> "white color", "#000000" -> "black color", etc.
function colorName(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return 'invalid color';
    const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
    if (l < 0.08) return 'black color';
    if (l > 0.95) return 'white color';
    if (s < 0.12) return (l < 0.35 ? 'dark gray' : l > 0.72 ? 'light gray' : 'gray') + ' color';
    let name = h < 15 || h >= 340 ? 'red' : h < 45 ? (l < 0.4 ? 'brown' : 'orange') : h < 70 ? 'yellow' : h < 165 ? 'green' : h < 195 ? 'teal' : h < 255 ? 'blue' : h < 290 ? 'purple' : 'pink';
    if (l < 0.28) name = 'dark ' + name; else if (l > 0.72) name = 'light ' + name;
    return name + ' color';
}
const normHex = (v) => {
    v = String(v).trim().replace(/^#?/, '#').toUpperCase();
    if (/^#[0-9A-F]{3}$/.test(v)) v = '#' + v.slice(1).split('').map(c => c + c).join('');
    return /^#[0-9A-F]{6}$/.test(v) ? v : null;
};

async function loadSkins() {
    const r = await awflGet('skin_list');
    if (!r.ok) { $('skBody').innerHTML = `<tr><td colspan="3">${esc(r.error)}</td></tr>`; return; }
    skParts = r.parts;
    $('skBody').innerHTML = r.skins.map(s => `
        <tr data-skin="${esc(s.name)}" data-locked="${s.locked ? 1 : 0}">
            <td><b>${esc(s.name)}</b></td>
            <td>${s.active ? '<span class="dash-tag good">Active</span>' : ''} ${s.locked ? '<span class="dash-tag">Locked</span>' : ''}</td>
            <td class="dash-actions">
                ${s.active ? '<button class="btn secondary sk-deactivate"' + (s.locked ? ' disabled title="Default skin is already the fallback"' : '') + '>Deactivate</button>' : '<button class="btn sk-activate">Activate</button>'}
                <button class="btn secondary sk-edit">${s.locked ? 'View' : 'Edit'}</button>
                ${s.locked ? '<button class="btn secondary sk-dup">Duplicate</button>' : '<button class="btn sk-del">Delete</button>'}
            </td>
        </tr>`).join('');
}
$('skBody').addEventListener('click', async (e) => {
    const tr = e.target.closest('tr'); if (!tr) return;
    const name = tr.dataset.skin, c = e.target.classList; let r;
    if (c.contains('sk-activate')) r = await awflPost('skin_activate', { name });
    else if (c.contains('sk-deactivate')) r = await awflPost('skin_deactivate');
    else if (c.contains('sk-del')) { if (!confirm(`Delete skin "${name}"?`)) return; r = await awflPost('skin_delete', { name }); }
    else if (c.contains('sk-edit') || c.contains('sk-dup')) return openSkinEditor(name, c.contains('sk-dup'));
    else return;
    r.ok ? (flash('Done.'), loadSkins()) : flash(r.error, false);
});
$('skNew').addEventListener('click', () => openSkinEditor('defaultskin', true));
$('skCancel').addEventListener('click', () => { $('skEditor').style.display = 'none'; $('skList').style.display = 'block'; loadSkins(); });

async function openSkinEditor(name, asNew) {
    const r = await awflGet('skin_get', { name });
    if (!r.ok) return flash(r.error, false);
    skState = { name: asNew ? '' : name, isNew: asNew, locked: r.locked && !asNew };
    $('skTitle').textContent = asNew ? 'New skin' : (skState.locked ? 'View default skin (locked)' : 'Edit skin: ' + name);
    $('skName').value = asNew ? '' : name; $('skName').disabled = !asNew;
    $('skSave').style.display = skState.locked ? 'none' : '';
    $('skRows').className = skState.locked ? 'sk-readonly' : '';
    $('skRows').innerHTML = skParts.map(p => {
        const hex = r.colors[p.var] || p.default;
        return `<div class="sk-row" data-var="${esc(p.var)}">
            <div class="sk-label">${esc(p.label)}</div>
            <input class="sk-hex" type="text" maxlength="7" value="${esc(hex)}" ${skState.locked ? 'disabled' : ''} spellcheck="false">
            <label class="sk-color"><span class="sk-swatch" style="background:${esc(hex)}"></span><span class="sk-cname">${esc(colorName(hex))}</span>
                <input type="color" value="${esc(hex.toLowerCase())}" ${skState.locked ? 'disabled' : ''}></label>
        </div>`;
    }).join('');
    $('skList').style.display = 'none'; $('skEditor').style.display = 'block';
}
function paintRow(row, hex) {
    row.querySelector('.sk-swatch').style.background = hex;
    row.querySelector('.sk-cname').textContent = colorName(hex);
    row.querySelector('input[type=color]').value = hex.toLowerCase();
}
// palette picked -> hex box + name update
$('skRows').addEventListener('input', (e) => {
    const row = e.target.closest('.sk-row'); if (!row) return;
    if (e.target.type === 'color') {
        const hex = e.target.value.toUpperCase();
        row.querySelector('.sk-hex').value = hex; row.querySelector('.sk-hex').classList.remove('invalid'); paintRow(row, hex);
    } else if (e.target.classList.contains('sk-hex')) {   // hex typed -> palette + name update
        const hex = normHex(e.target.value);
        e.target.classList.toggle('invalid', !hex);
        if (hex) paintRow(row, hex);
    }
});
$('skRows').addEventListener('focusout', (e) => {
    if (!e.target.classList.contains('sk-hex')) return;
    const hex = normHex(e.target.value);
    if (hex) { e.target.value = hex; e.target.classList.remove('invalid'); paintRow(e.target.closest('.sk-row'), hex); }
});
$('skSave').addEventListener('click', async () => {
    const colors = {}; let bad = null;
    document.querySelectorAll('#skRows .sk-row').forEach(row => {
        const hex = normHex(row.querySelector('.sk-hex').value);
        if (!hex) bad = row.querySelector('.sk-label').textContent; else colors[row.dataset.var] = hex;
    });
    if (bad) return flash(`Invalid color hex for "${bad}" (use #RRGGBB).`, false);
    const name = $('skName').value.trim().toLowerCase();
    if (!name) return flash('Enter a skin name.', false);
    const r = await awflPost('skin_save', { name, is_new: skState.isNew ? '1' : '0', colors: JSON.stringify(colors) });
    if (!r.ok) return flash(r.error, false);
    flash('Skin saved.'); skState.isNew = false; skState.name = r.name; $('skName').value = r.name; $('skName').disabled = true;
    $('skTitle').textContent = 'Edit skin: ' + r.name;
});

loadStats();
