// AWFLWIKI shared client helpers
const AWFL_API = '/awflwiki/api.php';

async function awflPost(action, data = {}) {
    const body = new FormData();
    body.append('action', action);
    for (const k in data) body.append(k, data[k]);
    const res = await fetch(AWFL_API, { method: 'POST', body, credentials: 'same-origin' });
    return res.json();
}

async function awflGet(action, params = {}) {
    const qs = new URLSearchParams({ action, ...params }).toString();
    const res = await fetch(`${AWFL_API}?${qs}`, { credentials: 'same-origin' });
    return res.json();
}

async function awflSession() {
    return awflGet('session');
}

function showMsg(el, text, ok) {
    el.textContent = text;
    el.className = 'msg ' + (ok ? 'success' : 'error');
    el.style.display = 'block';
}
