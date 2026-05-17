import { dom } from './dom.js';
import { compressGif } from './gifCompress.js';
import { formatBytes, isAcceptedFile, revokeUrl } from './utils.js';
import {
    setStatus, clearStatus,
    showProgress, hideProgress, updateProgress,
    showElement, hideElement,
    attachDropZone, updateUsageBar,
} from './ui.js';
import { getPreset } from './preset.js';

const state = {
    file: null,
    originalUrl: null,
    compressedUrl: null,
    lastResult: null,
};

export function initGifCompressTab() {
    const els = dom.gif;

    els.upload.addEventListener('change', (e) => handleFile(e.target.files?.[0]));
    attachDropZone(els.dropZone, (file) => {
        try {
            const dt = new DataTransfer();
            dt.items.add(file);
            els.upload.files = dt.files;
        } catch { /* */ }
        handleFile(file);
    });

    els.compressBtn.addEventListener('click', runCompression);
}

function handleFile(file) {
    const els = dom.gif;
    if (!file) return;
    if (!isAcceptedFile(file, ['image/gif']) && !/\.gif$/i.test(file.name)) {
        setStatus(els.status, 'GIFファイルを選択してください', 'error');
        els.compressBtn.disabled = true;
        return;
    }

    state.file = file;
    state.lastResult = null;
    els.fileInfo.textContent = `${file.name} · ${formatBytes(file.size)}`;
    els.compressBtn.disabled = false;
    clearStatus(els.status);
    hideElement(els.result);
    cleanupPreviewUrls();
}

async function runCompression() {
    const els = dom.gif;
    if (!state.file) return;

    const preset = getPreset();

    els.compressBtn.disabled = true;
    hideElement(els.result);
    cleanupPreviewUrls();

    setStatus(els.status, '準備中…', 'info');
    showProgress(els.progressBox);
    updateProgress(els.progressBar, els.progressPct, 0);
    if (els.progressText) els.progressText.textContent = '圧縮中…';

    try {
        const result = await compressGif(state.file, {
            maxBytes: preset.maxBytes,
            targetBytes: preset.targetBytes,
            onProgress: (p) => updateProgress(els.progressBar, els.progressPct, p),
            onPhase:    (msg) => {
                setStatus(els.status, msg, 'info');
                if (els.progressText) els.progressText.textContent = msg;
            },
        });

        state.lastResult = result;
        showResult(result, preset);
    } catch (err) {
        console.error(err);
        setStatus(els.status, `エラー: ${err.message ?? err}`, 'error');
        hideProgress(els.progressBox);
    } finally {
        els.compressBtn.disabled = false;
    }
}

function showResult(result, preset) {
    const els = dom.gif;
    hideProgress(els.progressBox);

    const blob = result.blob;
    const overLimit = blob.size > preset.maxBytes;

    if (result.passthrough) {
        setStatus(
            els.status,
            `既に ${preset.sizeLabel} 以下です (${formatBytes(blob.size)})。劣化を避けるためそのまま使用します。`,
            'success'
        );
    } else if (overLimit) {
        setStatus(
            els.status,
            `${preset.sizeLabel} 以下に収まりませんでした (${formatBytes(blob.size)})。フレーム数や元解像度を見直してください。`,
            'warning'
        );
    } else {
        setStatus(
            els.status,
            `完了!${preset.label} (${preset.sizeLabel}) 向けに最適化しました。`,
            'success'
        );
    }

    state.originalUrl   = URL.createObjectURL(state.file);
    state.compressedUrl = result.passthrough
        ? state.originalUrl
        : URL.createObjectURL(blob);

    els.originalImg.src    = state.originalUrl;
    els.compressedImg.src  = state.compressedUrl;
    els.originalSize.textContent   = formatBytes(state.file.size);
    els.compressedSize.textContent = formatBytes(blob.size);
    els.compressedSize.className = `size-text ${overLimit ? 'warning' : 'success'}`;

    updateUsageBar(els.usageFill, els.usageText, blob.size, preset.maxBytes);

    els.downloadLink.href = state.compressedUrl;
    els.downloadLink.download = result.passthrough
        ? state.file.name
        : `compressed_${state.file.name || 'output.gif'}`;
    showElement(els.result);
}

function cleanupPreviewUrls() {
    revokeUrl(state.originalUrl);
    if (state.compressedUrl && state.compressedUrl !== state.originalUrl) {
        revokeUrl(state.compressedUrl);
    }
    state.originalUrl = null;
    state.compressedUrl = null;
}
