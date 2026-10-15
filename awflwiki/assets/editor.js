// AWFLWIKI shared rich-editor logic (used by publish.php and wikidata.php's admin edit modal)
const AWFL_MAX_ALT = 100;

function AWFL_wireToolbar(toolbarEl, editorEl) {
    toolbarEl.querySelectorAll('button[data-cmd]').forEach(btn => {
        btn.addEventListener('click', () => {
            editorEl.focus();
            document.execCommand(btn.dataset.cmd, false, btn.dataset.value || null);
        });
    });
}

/**
 * Clicking a media frame (image/video/audio wrapper) selects it — only the
 * selected frame gets a resize handle, per spec ("this action to be done
 * when they are selected"). Clicking elsewhere deselects everything.
 */
function AWFL_wireMediaSelection(editorEl) {
    editorEl.addEventListener('click', e => {
        const frame = e.target.closest('.media-frame');
        editorEl.querySelectorAll('.media-frame.selected').forEach(f => {
            if (f !== frame) f.classList.remove('selected');
        });
        if (frame) frame.classList.add('selected');
    });
    document.addEventListener('click', e => {
        if (!editorEl.contains(e.target)) {
            editorEl.querySelectorAll('.media-frame.selected').forEach(f => f.classList.remove('selected'));
        }
    });
}

function AWFL_altCounterText(len) {
    return `${len}/${AWFL_MAX_ALT} — keep it a brief description, not a full caption`;
}

/**
 * Builds a media-frame HTML snippet: image gets crop-capable framing
 * (object-fit: cover, so resizing the frame reveals/crops the image);
 * video/audio only resize, they don't crop.
 */
function AWFL_buildMediaFrame(type, url, alt) {
    const safeAlt = (alt || '').replace(/"/g, '&quot;');
    if (type === 'img') {
        return `<span class="media-frame type-image" contenteditable="false"><img src="${url}" alt="${safeAlt}"></span>`;
    }
    if (type === 'video') {
        return `<span class="media-frame type-video" contenteditable="false"><video src="${url}" controls aria-label="${safeAlt}"></video></span>`;
    }
    if (type === 'audio') {
        return `<span class="media-frame type-audio" contenteditable="false"><audio src="${url}" controls aria-label="${safeAlt}"></audio></span>`;
    }
    return '';
}

/**
 * Wires the single "insert media into main content" control: URL + type +
 * alt, alt required exactly when URL is filled, capped at 100 chars.
 */
function AWFL_wireMediaInsert({ urlInput, typeSelect, altInput, altCounter, insertBtn, editorEl, msgEl }) {
    altInput.setAttribute('maxlength', String(AWFL_MAX_ALT));
    altInput.addEventListener('input', () => {
        if (altCounter) altCounter.textContent = AWFL_altCounterText(altInput.value.length);
    });

    insertBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        const alt = altInput.value.trim();
        if (!url && !alt) return;

        if (!!url !== !!alt) {
            if (msgEl) showMsg(msgEl, 'Fill in both the media URL and the alt text, or leave both empty.', false);
            return;
        }
        if (alt.length > AWFL_MAX_ALT) {
            if (msgEl) showMsg(msgEl, `Alt text must be ${AWFL_MAX_ALT} characters or fewer.`, false);
            return;
        }

        const type = typeSelect.value;
        const html = AWFL_buildMediaFrame(type, url, alt);
        editorEl.focus();
        document.execCommand('insertHTML', false, html + '&nbsp;');

        urlInput.value = '';
        altInput.value = '';
        if (altCounter) altCounter.textContent = AWFL_altCounterText(0);
    });
}

/**
 * Infobox builder: a small standalone form (NOT contenteditable) where
 * anyone can add/remove rows before inserting the finished infobox as one
 * block into the article. Each row can carry its own image/audio/video +
 * alt, same required-together + 100-char rule as the main media field.
 */
function AWFL_wireInfoboxBuilder({ container, addRowBtn, insertBtn, titleInput, editorEl, msgEl }) {
    function addRow(row = {}) {
        const div = document.createElement('div');
        div.className = 'infobox-row-builder';
        div.innerHTML = `
       <div>       <input type="text" class="ib-label" placeholder="Label" value="${(row.label || '').replace(/"/g, '&quot;')}">
            <input type="text" class="ib-value" placeholder="Value" value="${(row.value || '').replace(/"/g, '&quot;')}">
 </div> 
     <div>         <select class="ib-media-type">
                <option value="">No media</option>
                <option value="img">Image</option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
            </select>
            <input type="text" class="ib-media-url" placeholder="Image, audio or video URL">
            <input type="text" class="ib-alt" placeholder="Alt (brief, max 100)" maxlength="${AWFL_MAX_ALT}">  
            <button type="button" class="ib-remove-row" title="Remove row">&times;</button> </div> 
        `;
        div.querySelector('.ib-remove-row').addEventListener('click', () => div.remove());
        container.appendChild(div);
    }

    addRowBtn.addEventListener('click', () => addRow());
    addRow(); // start with one row

    insertBtn.addEventListener('click', () => {
        const title = titleInput.value.trim() || 'Overview';
        const rows = [...container.querySelectorAll('.infobox-row-builder')];
        if (rows.length === 0) {
            if (msgEl) showMsg(msgEl, 'Add at least one infobox row first.', false);
            return;
        }

        let mediaHtml = '';
        const tableRows = [];

        for (const row of rows) {
            const label = row.querySelector('.ib-label').value.trim();
            const value = row.querySelector('.ib-value').value.trim();
            const mediaType = row.querySelector('.ib-media-type').value;
            const mediaUrl = row.querySelector('.ib-media-url').value.trim();
            const alt = row.querySelector('.ib-alt').value.trim();

            if (!!mediaUrl !== !!alt) {
                if (msgEl) showMsg(msgEl, `Row "${label || '(unlabeled)'}": media URL and alt text must both be filled, or both left empty.`, false);
                return;
            }
            if (alt.length > AWFL_MAX_ALT) {
                if (msgEl) showMsg(msgEl, `Row "${label}": alt text must be ${AWFL_MAX_ALT} characters or fewer.`, false);
                return;
            }
            if (mediaUrl && !mediaType) {
                if (msgEl) showMsg(msgEl, `Row "${label}": choose a media type for the URL provided.`, false);
                return;
            }

            if (mediaUrl) {
                mediaHtml += AWFL_buildMediaFrame(mediaType, mediaUrl, alt);
            }
            if (label || value) {
                tableRows.push(`<tr><th>${label.replace(/</g, '&lt;')}</th><td>${value.replace(/</g, '&lt;')}</td></tr>`);
            }
        }

        const safeTitle = title.replace(/</g, '&lt;');
        const html = `<div class="infobox" contenteditable="false">
            <div class="infobox-title">${safeTitle}</div>
            ${mediaHtml}
            <table>${tableRows.join('')}</table>
        </div>`;

        editorEl.focus();
        document.execCommand('insertHTML', false, html + '&nbsp;');

        container.innerHTML = '';
        addRow();
        titleInput.value = '';
    });
}
