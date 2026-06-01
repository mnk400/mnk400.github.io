const CONFIG = window.__R2_CONFIG || { publicUrl: '', bucket: '', albums: ['photos', 'art'] };

let albums = [];
let currentAlbum = localStorage.getItem('r2-admin-album') || '';
let manifest = emptyManifest('');
let manifestDirty = false;
let dragSrcIndex = null;
let pendingDeletes = [];
let editingIndex = null;
let statusTimer = null;

const ANIMATION_MS = 220;
const hideTimers = new WeakMap();

const FIELD_TYPES = {
    text: 'Text',
    textarea: 'Long text',
    select: 'Select',
};

const FIELD_DISPLAYS = {
    card: 'Card',
    editor: 'Editor only',
};

const FIELD_TEMPLATES = {
    owned: { name: 'Owned', type: 'text', placeholder: '2022-now', display: 'card', values: [] },
    camera: { name: 'Camera', type: 'text', placeholder: 'Canon AE-1', display: 'card', values: [] },
    film: { name: 'Film', type: 'select', placeholder: '', display: 'card', values: ['Portra 400', 'Gold 200', 'HP5'] },
    location: { name: 'Location', type: 'text', placeholder: 'Seattle', display: 'card', values: [] },
    notes: { name: 'Notes', type: 'textarea', placeholder: 'Private notes', display: 'editor', values: [] },
};

function albumBaseUrl(album) {
    const publicUrl = (CONFIG.publicUrl || '').replace(/\/$/, '');
    return publicUrl && album ? `${publicUrl}/${album}` : publicUrl;
}

function albumRelativePath(album, path) {
    if (!path) return '';
    const cleanPath = String(path).replace(/^\//, '');
    return cleanPath.startsWith(`${album}/`) ? cleanPath.slice(album.length + 1) : cleanPath;
}

function objectKey(album, path) {
    if (!path) return '';
    const cleanPath = String(path).replace(/^\//, '');
    return cleanPath.startsWith(`${album}/`) ? cleanPath : `${album}/${cleanPath}`;
}

function normalizeEditorField(field) {
    const values = Array.isArray(field.values) ? field.values.filter(Boolean) : [];
    const type = field.type || (values.length ? 'select' : 'text');
    const normalizedType = Object.prototype.hasOwnProperty.call(FIELD_TYPES, type) ? type : 'text';
    return {
        name: field.name || '',
        type: normalizedType,
        placeholder: field.placeholder || '',
        values: normalizedType === 'select' ? values : [],
        display: Object.prototype.hasOwnProperty.call(FIELD_DISPLAYS, field.display) ? field.display : 'card',
    };
}

function getEditorFields() {
    return ((manifest.editor && manifest.editor.fields) || []).map(normalizeEditorField);
}

function emptyManifest(album) {
    const name = album ? album.charAt(0).toUpperCase() + album.slice(1) : '';
    return {
        version: 1,
        name,
        base_url: albumBaseUrl(album),
        items: [],
        editor: { fields: [] },
        source: { generator: 'admin-portal', generated: '' },
    };
}

// =========================================================================
// R2 helpers
// =========================================================================

async function r2Request(method, objectKey, body, contentType) {
    const opts = { method };
    if (contentType) opts.headers = { 'Content-Type': contentType };
    if (body && method !== 'GET' && method !== 'HEAD') opts.body = body;
    return fetch('/r2/' + encodeURIComponent(objectKey).replace(/%2F/g, '/'), opts);
}

async function getManifest(album) {
    const res = await r2Request('GET', `${album}/manifest.json`);
    if (!res.ok) {
        if (res.status === 404) return emptyManifest(album);
        throw new Error(`Failed to fetch manifest: ${res.status}`);
    }
    const data = await res.json();
    if (data.version !== 1) {
        throw new Error(`Unsupported manifest version (${data.version ?? 'v0'}). Expected v1.`);
    }
    if (!Array.isArray(data.items)) data.items = [];
    if (!data.editor || !Array.isArray(data.editor.fields)) data.editor = { fields: [] };
    data.editor.fields = data.editor.fields.map(normalizeEditorField).filter(field => field.name);
    if (!data.source) data.source = { generator: 'admin-portal', generated: '' };
    data.base_url = albumBaseUrl(album);
    data.items.forEach(item => {
        item.thumb = albumRelativePath(album, item.thumb);
        item.full = albumRelativePath(album, item.full);
    });
    return data;
}

async function putManifest(album, data) {
    data.source = data.source || { generator: 'admin-portal' };
    data.source.generator = 'admin-portal';
    data.source.generated = new Date().toISOString();
    const res = await r2Request('PUT', `${album}/manifest.json`, JSON.stringify(data, null, 2), 'application/json');
    if (!res.ok) throw new Error(`Failed to save manifest: ${res.status}`);
}

async function putImage(album, folder, key, blob, contentType) {
    const res = await r2Request('PUT', `${album}/${folder}/${key}`, await blob.arrayBuffer(), contentType);
    if (!res.ok) throw new Error(`Failed to upload ${folder}/${key}: ${res.status}`);
}

// =========================================================================
// Dirty state
// =========================================================================

function isDirty() {
    return manifestDirty || pendingDeletes.length > 0;
}

function updatePublishButton() {
    const btn = document.getElementById('publish-btn');
    const dirty = isDirty();
    btn.disabled = !dirty;
    btn.classList.toggle('has-changes', dirty);
}

function markClean() {
    manifestDirty = false;
    pendingDeletes = [];
    updatePublishButton();
}

function markDirty(message = 'Unsaved changes') {
    manifestDirty = true;
    updatePublishButton();
    setStatus(message);
}

function showLayer(el) {
    clearTimeout(hideTimers.get(el));
    el.hidden = false;
    el.offsetWidth;
    el.classList.add('is-open');
}

function hideLayer(el) {
    el.classList.remove('is-open');
    clearTimeout(hideTimers.get(el));
    hideTimers.set(el, setTimeout(() => {
        if (!el.classList.contains('is-open')) el.hidden = true;
    }, ANIMATION_MS));
}

// =========================================================================
// Image processing
// =========================================================================

function canvasHasTransparency(ctx, width, height) {
    const pixels = ctx.getImageData(0, 0, width, height).data;
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 255) return true;
    }
    return false;
}

function getImageOutputFormat(file, ctx, width, height) {
    const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
    if (isPng && canvasHasTransparency(ctx, width, height)) {
        return { extension: 'png', contentType: 'image/png' };
    }
    return { extension: 'jpg', contentType: 'image/jpeg', quality: 0.9 };
}

function resizeImage(file, maxSize, outputFormat) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            const ratio = Math.min(1, maxSize / width, maxSize / height);
            const nw = Math.round(width * ratio);
            const nh = Math.round(height * ratio);
            const c = document.createElement('canvas');
            c.width = nw; c.height = nh;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, nw, nh);
            const format = outputFormat || getImageOutputFormat(file, ctx, nw, nh);
            c.toBlob(blob => {
                if (!blob) {
                    reject(new Error(`Could not encode ${file.name}`));
                    return;
                }
                resolve({ blob, width: nw, height: nh, ...format });
            }, format.contentType, format.quality);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Could not load ${file.name}`));
        };
        img.src = url;
    });
}

function slugify(name, extension) {
    const slug = name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${slug || 'image'}.${extension}`;
}

function uniqueImageKey(fileName, extension) {
    const key = slugify(fileName, extension);
    if (!manifest.items.some(item => item.id === key)) return key;
    return key.replace(new RegExp(`\\.${extension}$`), `-${Date.now().toString(36)}.${extension}`);
}

// =========================================================================
// Albums
// =========================================================================

function renderAlbumSwitch() {
    const sw = document.getElementById('album-switch');
    sw.innerHTML = '';
    albums.forEach(a => {
        const btn = document.createElement('button');
        btn.className = 'switch-option' + (a === currentAlbum ? ' active' : '');
        btn.textContent = a;
        btn.onclick = () => switchAlbum(a);
        sw.appendChild(btn);
    });
}

async function fetchAlbums(fallback = CONFIG.albums) {
    try {
        const res = await fetch('/api/albums');
        if (res.ok) {
            const discovered = await res.json();
            if (discovered.length) return discovered;
        }
    } catch {}
    return fallback;
}

async function syncAlbumSwitch() {
    albums = await fetchAlbums(albums);
    if (currentAlbum && !albums.includes(currentAlbum)) albums.push(currentAlbum);
    renderAlbumSwitch();
}

async function switchAlbum(album) {
    if (isDirty() && !confirm('You have unpublished changes. Discard them?')) return;
    currentAlbum = album;
    localStorage.setItem('r2-admin-album', album);
    pendingDeletes = [];
    editingIndex = null;
    hideLayer(document.getElementById('item-editor'));
    renderAlbumSwitch();
    await refreshAlbum();
}

async function refreshAlbum() {
    setStatus('Loading manifest...');
    try {
        manifest = await getManifest(currentAlbum);
        markClean();
        renderGrid();
        setStatus(`${manifest.items.length} image(s) in "${currentAlbum}"`);
    } catch (e) {
        setStatus('Error: ' + e.message);
    }
}

function promptNewAlbum() {
    const name = prompt('New album name (lowercase, no spaces):');
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!slug) return;
    if (albums.includes(slug)) { alert('Album already exists.'); return; }
    albums.push(slug);
    switchAlbum(slug);
}

function openManageFieldsModal() {
    const modal = document.getElementById('fields-modal');
    const manager = document.getElementById('field-manager');
    manager.innerHTML = '';

    const fields = getEditorFields();
    fields.forEach(field => addFieldRow(field));
    if (!fields.length) addFieldRow(FIELD_TEMPLATES.owned);

    showLayer(modal);
    const firstInput = manager.querySelector('input');
    if (firstInput) firstInput.focus();
}

function closeManageFieldsModal() {
    hideLayer(document.getElementById('fields-modal'));
}

function addFieldRow(field = { name: '', type: 'text', values: [], placeholder: '', display: 'card' }) {
    const manager = document.getElementById('field-manager');
    const normalized = normalizeEditorField(field);
    const row = document.createElement('div');
    row.className = 'field-row';
    row.innerHTML = `
        <input class="field-row__name" type="text" placeholder="Field name" value="${escapeAttr(normalized.name)}">
        <select class="field-row__type" aria-label="Field type">
            ${Object.entries(FIELD_TYPES).map(([value, label]) =>
                `<option value="${value}"${value === normalized.type ? ' selected' : ''}>${label}</option>`
            ).join('')}
        </select>
        <input class="field-row__placeholder" type="text" placeholder="Placeholder" value="${escapeAttr(normalized.placeholder)}">
        <input class="field-row__values" type="text" placeholder="Select options, comma-separated" value="${escapeAttr(normalized.values.join(', '))}">
        <select class="field-row__display" aria-label="Display">
            ${Object.entries(FIELD_DISPLAYS).map(([value, label]) =>
                `<option value="${value}"${value === normalized.display ? ' selected' : ''}>${label}</option>`
            ).join('')}
        </select>
        <button class="btn field-row__remove" type="button" title="Remove field" aria-label="Remove field">
            <i class="ph-bold ph-trash"></i>
        </button>
    `;
    row.querySelector('.field-row__remove').addEventListener('click', () => row.remove());
    row.querySelector('.field-row__type').addEventListener('change', () => updateFieldRowState(row));
    manager.appendChild(row);
    updateFieldRowState(row);
    return row;
}

function updateFieldRowState(row) {
    const type = row.querySelector('.field-row__type').value;
    const values = row.querySelector('.field-row__values');
    values.disabled = type !== 'select';
    if (type !== 'select') values.value = '';
}

function parsePresetValues(value) {
    const seen = new Set();
    return String(value || '').split(',').map(v => v.trim()).filter(value => {
        if (!value || seen.has(value.toLowerCase())) return false;
        seen.add(value.toLowerCase());
        return true;
    });
}

function saveManagedFields() {
    const rows = [...document.querySelectorAll('#field-manager .field-row')];
    const seen = new Set();
    const nextFields = [];

    for (const row of rows) {
        const name = row.querySelector('.field-row__name').value.trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) {
            alert(`"${name}" is listed more than once.`);
            return;
        }
        seen.add(key);
        nextFields.push(normalizeEditorField({
            name,
            type: row.querySelector('.field-row__type').value,
            placeholder: row.querySelector('.field-row__placeholder').value.trim(),
            values: parsePresetValues(row.querySelector('.field-row__values').value),
            display: row.querySelector('.field-row__display').value,
        }));
    }

    const oldFieldNames = new Set(getEditorFields().map(f => f.name));
    const nextFieldNames = new Set(nextFields.map(f => f.name));
    const removedFields = [...oldFieldNames].filter(name => !nextFieldNames.has(name));
    const removesExistingValues = removedFields.some(name =>
        manifest.items.some(item => item.meta && item.meta[name])
    );

    if (removesExistingValues && !confirm('Removed fields will also remove their saved values from each image. Continue?')) {
        return;
    }

    manifest.editor.fields = nextFields;
    // Clear per-item meta values for removed fields
    const fieldNames = new Set(manifest.editor.fields.map(f => f.name));
    manifest.items.forEach(item => {
        if (!item.meta) return;
        Object.keys(item.meta).forEach(key => {
            if (!fieldNames.has(key)) delete item.meta[key];
        });
    });
    closeManageFieldsModal();
    if (editingIndex !== null && manifest.items[editingIndex]) {
        renderEditorMetaFields(manifest.items[editingIndex]);
    }
    renderGrid();
    markDirty('Fields updated — publish to save');
}

document.getElementById('fields-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveManagedFields();
});

document.getElementById('new-album-btn').addEventListener('click', promptNewAlbum);
document.getElementById('manage-fields-btn').addEventListener('click', openManageFieldsModal);
document.getElementById('publish-btn').addEventListener('click', publish);
document.getElementById('fields-close-btn').addEventListener('click', closeManageFieldsModal);
document.getElementById('fields-cancel-btn').addEventListener('click', closeManageFieldsModal);
document.getElementById('add-field-btn').addEventListener('click', () => addFieldRow());

document.getElementById('fields-modal').addEventListener('click', (e) => {
    if (e.target.id === 'fields-modal') closeManageFieldsModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('fields-modal').hidden) {
        closeManageFieldsModal();
    } else if (e.key === 'Escape' && !document.getElementById('item-editor').hidden) {
        closeItemEditor();
    }
});

document.querySelectorAll('[data-field-template]').forEach(btn => {
    btn.addEventListener('click', () => {
        const template = FIELD_TEMPLATES[btn.dataset.fieldTemplate];
        if (!template) return;
        const name = template.name;
        const existing = [...document.querySelectorAll('.field-row__name')]
            .some(input => input.value.trim().toLowerCase() === name.toLowerCase());
        if (!existing) addFieldRow(template);
    });
});

// =========================================================================
// Publish
// =========================================================================

async function publish() {
    if (!isDirty()) return;
    setStatus('Publishing...');

    try {
        for (const item of pendingDeletes) {
            setStatus(`Deleting ${item.id}...`);
            await r2Request('DELETE', objectKey(currentAlbum, item.full));
            await r2Request('DELETE', objectKey(currentAlbum, item.thumb));
        }

        setStatus('Saving manifest...');
        await putManifest(currentAlbum, manifest);
        markClean();
        setStatus(`Published! ${manifest.items.length} image(s) in "${currentAlbum}"`);

        await syncAlbumSwitch();
    } catch (e) {
        setStatus('Publish error: ' + e.message);
    }
}

// =========================================================================
// Image grid (event delegation)
// =========================================================================

function itemDisplayTitle(item) {
    return item.title || item.description || item.id || 'Untitled';
}

function itemCardMeta(item) {
    const meta = item.meta || {};
    return getEditorFields()
        .filter(field => field.display === 'card')
        .map(field => meta[field.name])
        .filter(Boolean)
        .slice(0, 2)
        .join(' · ');
}

function deleteItem(index) {
    if (!Number.isInteger(index) || !manifest.items[index]) return;
    if (!confirm(`Delete "${manifest.items[index].id}"?`)) return;
    pendingDeletes.push(manifest.items[index]);
    manifest.items.splice(index, 1);
    if (editingIndex === index) closeItemEditor();
    if (editingIndex !== null && editingIndex > index) editingIndex -= 1;
    renderGrid();
    markDirty('Unsaved changes — publish to finalize deletions');
}

function renderGrid() {
    const grid = document.getElementById('image-grid');
    grid.innerHTML = '';

    manifest.items.forEach((item, idx) => {
        const tile = document.createElement('div');
        tile.className = 'image-tile' + (idx === editingIndex ? ' is-selected' : '');
        tile.draggable = true;
        tile.dataset.idx = idx;

        tile.innerHTML = `
            <img src="/r2/${objectKey(currentAlbum, item.thumb)}" alt="${escapeAttr(item.title || item.description || '')}" loading="lazy"
                onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'broken-placeholder',innerHTML:'<i class=\\'ph-bold ph-image-broken\\'></i>'}))">
            <button class="tile-delete" data-idx="${idx}" title="Delete">
                <i class="ph-bold ph-trash"></i>
            </button>
            <div class="tile-overlay">
                <div class="tile-title">${escapeHtml(itemDisplayTitle(item))}</div>
                <div class="tile-meta">${escapeHtml(itemCardMeta(item))}</div>
            </div>
        `;
        grid.appendChild(tile);
    });
}

function setSelectedTile(index) {
    document.querySelectorAll('.image-tile.is-selected').forEach(tile => {
        tile.classList.remove('is-selected');
    });
    if (index === null) return;
    const tile = document.querySelector(`.image-tile[data-idx="${index}"]`);
    if (tile) tile.classList.add('is-selected');
}

function updateTileSummary(index) {
    const item = manifest.items[index];
    const tile = document.querySelector(`.image-tile[data-idx="${index}"]`);
    if (!item || !tile) return;

    const title = tile.querySelector('.tile-title');
    const meta = tile.querySelector('.tile-meta');
    const img = tile.querySelector('img');

    if (title) title.textContent = itemDisplayTitle(item);
    if (meta) meta.textContent = itemCardMeta(item);
    if (img) img.alt = item.title || item.description || '';
}

// Single delegated listener for all grid interactions
(function setupGridEvents() {
    const grid = document.getElementById('image-grid');

    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.tile-delete');
        if (btn) {
            deleteItem(parseInt(btn.dataset.idx));
            return;
        }

        const tile = e.target.closest('.image-tile');
        if (!tile) return;
        openItemEditor(parseInt(tile.dataset.idx));
    });

    grid.addEventListener('dragstart', (e) => {
        const tile = e.target.closest('.image-tile');
        if (!tile) return;
        dragSrcIndex = parseInt(tile.dataset.idx);
        tile.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    grid.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    grid.addEventListener('dragenter', (e) => {
        const tile = e.target.closest('.image-tile');
        if (tile) tile.classList.add('drag-over');
    });

    grid.addEventListener('dragleave', (e) => {
        const tile = e.target.closest('.image-tile');
        if (tile) tile.classList.remove('drag-over');
    });

    grid.addEventListener('drop', (e) => {
        e.preventDefault();
        const tile = e.target.closest('.image-tile');
        if (!tile) return;
        tile.classList.remove('drag-over');
        const targetIdx = parseInt(tile.dataset.idx);
        if (dragSrcIndex === null || dragSrcIndex === targetIdx) return;

        const [moved] = manifest.items.splice(dragSrcIndex, 1);
        manifest.items.splice(targetIdx, 0, moved);
        editingIndex = null;
        hideLayer(document.getElementById('item-editor'));
        renderGrid();
        markDirty();
    });

    grid.addEventListener('dragend', () => {
        document.querySelectorAll('.dragging, .drag-over').forEach(el => {
            el.classList.remove('dragging', 'drag-over');
        });
        dragSrcIndex = null;
    });
})();

// =========================================================================
// Item editor
// =========================================================================

function openItemEditor(index) {
    if (!Number.isInteger(index) || !manifest.items[index]) return;
    editingIndex = index;
    const item = manifest.items[index];
    const editor = document.getElementById('item-editor');
    const preview = document.getElementById('editor-preview');
    const previewSrc = `/r2/${objectKey(currentAlbum, item.full || item.thumb)}`;

    if (preview.getAttribute('src') !== previewSrc) {
        preview.src = previewSrc;
    }
    preview.alt = itemDisplayTitle(item);
    document.getElementById('editor-title').value = item.title || '';
    document.getElementById('editor-description').value = item.description || '';

    renderEditorMetaFields(item);
    showLayer(editor);
    setSelectedTile(index);
    document.getElementById('editor-title').focus();
}

function closeItemEditor() {
    editingIndex = null;
    hideLayer(document.getElementById('item-editor'));
    setSelectedTile(null);
}

function markItemEdited() {
    markDirty();
    updateTileSummary(editingIndex);
}

function renderEditorMetaFields(item) {
    const container = document.getElementById('editor-meta');
    const fields = getEditorFields();
    container.innerHTML = '';

    if (!fields.length) {
        const empty = document.createElement('p');
        empty.className = 'editor-empty';
        empty.textContent = 'No fields configured for this album.';
        container.appendChild(empty);
        return;
    }

    fields.forEach(field => {
        const wrapper = document.createElement('div');
        wrapper.className = 'field';
        const id = `editor-meta-${field.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const value = (item.meta && item.meta[field.name]) || '';

        let control = '';
        if (field.type === 'textarea') {
            control = `<textarea id="${id}" data-meta-field="${escapeAttr(field.name)}" placeholder="${escapeAttr(field.placeholder)}">${escapeHtml(value)}</textarea>`;
        } else if (field.type === 'select') {
            const options = field.values.map(option =>
                `<option value="${escapeAttr(option)}"${option === value ? ' selected' : ''}>${escapeHtml(option)}</option>`
            ).join('');
            control = `
                <select id="${id}" data-meta-field="${escapeAttr(field.name)}">
                    <option value=""${value ? '' : ' selected'}>—</option>
                    ${options}
                </select>
            `;
        } else {
            control = `<input id="${id}" type="text" data-meta-field="${escapeAttr(field.name)}" placeholder="${escapeAttr(field.placeholder)}" value="${escapeAttr(value)}">`;
        }

        wrapper.innerHTML = `
            <label class="field__label" for="${id}">${escapeHtml(field.name)}</label>
            ${control}
        `;
        container.appendChild(wrapper);
    });
}

(function setupItemEditor() {
    const editor = document.getElementById('item-editor');
    const title = document.getElementById('editor-title');
    const description = document.getElementById('editor-description');
    const meta = document.getElementById('editor-meta');

    editor.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-editor]')) closeItemEditor();
    });

    title.addEventListener('input', () => {
        if (editingIndex === null || !manifest.items[editingIndex]) return;
        manifest.items[editingIndex].title = title.value;
        markItemEdited();
    });

    description.addEventListener('input', () => {
        if (editingIndex === null || !manifest.items[editingIndex]) return;
        manifest.items[editingIndex].description = description.value;
        markItemEdited();
    });

    meta.addEventListener('input', (e) => {
        if (e.target.tagName === 'SELECT') return;
        updateItemMetaValue(e.target);
    });

    meta.addEventListener('change', (e) => {
        updateItemMetaValue(e.target);
    });

    document.getElementById('editor-delete-btn').addEventListener('click', () => {
        deleteItem(editingIndex);
    });

    document.getElementById('item-editor-form').addEventListener('submit', (e) => {
        e.preventDefault();
    });
})();

function updateItemMetaValue(control) {
    if (!control || !control.dataset.metaField || editingIndex === null || !manifest.items[editingIndex]) return;
    const item = manifest.items[editingIndex];
    if (!item.meta) item.meta = {};
    item.meta[control.dataset.metaField] = control.value;
    markItemEdited();
}

// =========================================================================
// Upload
// =========================================================================

(function setupUpload() {
    const zone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
})();

async function handleFiles(fileList) {
    const files = [...fileList].filter(f => f.type.startsWith('image/'));
    if (!files.length) return;

    let uploaded = 0;
    let errors = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatus(`Uploading ${i + 1}/${files.length}...`);

        try {
            const resized = await resizeImage(file, 2000);
            const finalKey = uniqueImageKey(file.name, resized.extension);
            const outputFormat = {
                extension: resized.extension,
                contentType: resized.contentType,
                quality: resized.quality,
            };
            await putImage(currentAlbum, 'full', finalKey, resized.blob, resized.contentType);

            try {
                const thumb = await resizeImage(file, 400, outputFormat);
                await putImage(currentAlbum, 'thumbs', finalKey, thumb.blob, thumb.contentType);
            } catch (e) {
                console.error('Thumb upload failed:', e);
            }

            manifest.items.push({
                id: finalKey,
                title: '',
                description: '',
                thumb: `thumbs/${finalKey}`,
                full: `full/${finalKey}`,
                width: resized.width,
                height: resized.height,
                tags: [],
                meta: {},
                extras: {},
            });
            uploaded++;
        } catch (err) {
            errors++;
            console.error('Upload error:', err);
        }
    }

    if (uploaded > 0) {
        setStatus('Updating manifest...');
        try {
            await putManifest(currentAlbum, manifest);
            markClean();
            renderGrid();
            const msg = `Uploaded ${uploaded} photo(s): ${manifest.items.length} images in "${currentAlbum}"`;
            setStatus(errors ? msg + ` (${errors} failed)` : msg);

            await syncAlbumSwitch();
        } catch (e) {
            renderGrid();
            markDirty();
            setStatus('Upload done but manifest save failed: ' + e.message);
        }
    } else {
        setStatus(`Upload failed for all ${files.length} file(s)`);
    }
}

// =========================================================================
// Init
// =========================================================================

function setStatus(msg) {
    const status = document.getElementById('status-bar');
    if (status.textContent === msg) return;
    clearTimeout(statusTimer);

    if (!status.textContent) {
        status.textContent = msg;
        return;
    }

    status.classList.add('is-changing');
    statusTimer = setTimeout(() => {
        status.textContent = msg;
        requestAnimationFrame(() => status.classList.remove('is-changing'));
    }, 90);
}

function escapeAttr(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

(async function init() {
    albums = await fetchAlbums(CONFIG.albums);
    if (!currentAlbum || !albums.includes(currentAlbum)) currentAlbum = albums[0] || 'photos';
    renderAlbumSwitch();
    await refreshAlbum();
})();
