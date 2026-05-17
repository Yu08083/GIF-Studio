export function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatSeconds(s) {
    return Number(s).toFixed(2);
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function revokeUrl(url) {
    if (typeof url === 'string' && url.startsWith('blob:')) {
        try { URL.revokeObjectURL(url); } catch { /* */ }
    }
}

let _workerBlobUrl = null;
let _workerBlobSource = null;

export async function getWorkerBlobUrl(url) {
    if (_workerBlobUrl && _workerBlobSource === url) return _workerBlobUrl;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`gif.worker.js の取得に失敗しました (${response.status})`);
    }
    const code = await response.text();
    const blob = new Blob([code], { type: 'application/javascript' });

    if (_workerBlobUrl) revokeUrl(_workerBlobUrl);
    _workerBlobUrl = URL.createObjectURL(blob);
    _workerBlobSource = url;
    return _workerBlobUrl;
}

window.addEventListener('beforeunload', () => {
    if (_workerBlobUrl) revokeUrl(_workerBlobUrl);
});

export function isAcceptedFile(file, prefixes) {
    if (!file) return false;
    const t = file.type || '';
    return prefixes.some(p => t.startsWith(p));
}

export function makeEven(n) {
    n = Math.max(2, Math.round(n));
    return n % 2 === 0 ? n : n + 1;
}
