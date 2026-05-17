import { clamp, formatBytes } from './utils.js';

export function setStatus(el, text, type = 'info') {
    if (!el) return;
    el.textContent = text;
    el.className = `status-message ${type}`;
}

export function clearStatus(el) {
    if (!el) return;
    el.textContent = '';
    el.className = 'status-message';
}

export function showProgress(container) {
    if (container) container.hidden = false;
}

export function hideProgress(container) {
    if (container) container.hidden = true;
}

export function updateProgress(barEl, pctEl, value) {
    const v = clamp(Math.round(value), 0, 100);
    if (barEl) barEl.value = v;
    if (pctEl) pctEl.textContent = String(v);
}

export function showElement(el) { if (el) el.hidden = false; }
export function hideElement(el) { if (el) el.hidden = true; }

export function updateUsageBar(fillEl, textEl, size, maxBytes) {
    if (!fillEl || !textEl) return;
    const pct = clamp((size / maxBytes) * 100, 0, 100);
    fillEl.style.width = `${pct.toFixed(1)}%`;
    textEl.textContent = `${formatBytes(size)} / ${formatBytes(maxBytes)} (${pct.toFixed(1)}%)`;
}

export function attachDropZone(zone, onFile) {
    if (!zone) return;

    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };

    ['dragenter', 'dragover'].forEach(ev => {
        zone.addEventListener(ev, (e) => {
            prevent(e);
            zone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(ev => {
        zone.addEventListener(ev, (e) => {
            prevent(e);
            zone.classList.remove('dragover');
        });
    });

    zone.addEventListener('drop', (e) => {
        const file = e.dataTransfer?.files?.[0];
        if (file) onFile(file);
    });
}
