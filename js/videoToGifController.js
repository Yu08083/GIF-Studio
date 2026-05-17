import { dom } from './dom.js';
import { videoToGif } from './videoToGif.js';
import { formatBytes, formatSeconds, isAcceptedFile, revokeUrl, clamp } from './utils.js';
import {
    setStatus, clearStatus,
    showProgress, hideProgress, updateProgress,
    showElement, hideElement,
    attachDropZone, updateUsageBar,
} from './ui.js';
import {
    VIDEO_DEFAULT_FPS, VIDEO_DEFAULT_WIDTH,
    VIDEO_MIN_WIDTH, VIDEO_MAX_WIDTH, VIDEO_DEFAULT_QUALITY,
} from './constants.js';
import { getPreset } from './preset.js';

const state = {
    file: null,
    objectUrl: null,
    outputUrl: null,
    duration: 0,
};

export function initVideoToGifTab() {
    const els = dom.video;

    els.upload.addEventListener('change', (e) => handleFile(e.target.files?.[0]));
    attachDropZone(els.dropZone, (file) => {
        try {
            const dt = new DataTransfer();
            dt.items.add(file);
            els.upload.files = dt.files;
        } catch { /* */ }
        handleFile(file);
    });

    els.trimStart.addEventListener('input', onTrimChange);
    els.trimEnd.addEventListener('input',   onTrimChange);

    els.convertBtn.addEventListener('click', runConversion);
}

function handleFile(file) {
    const els = dom.video;
    if (!file) return;
    if (!isAcceptedFile(file, ['video/'])) {
        setStatus(els.status, '動画ファイルを選択してください', 'error');
        els.convertBtn.disabled = true;
        return;
    }

    state.file = file;
    cleanupOutputUrl();
    hideElement(els.result);

    if (state.objectUrl) revokeUrl(state.objectUrl);
    state.objectUrl = URL.createObjectURL(file);
    els.preview.src = state.objectUrl;

    els.fileInfo.textContent = `${file.name} · ${formatBytes(file.size)}`;
    clearStatus(els.status);

    els.preview.onloadedmetadata = () => {
        state.duration = els.preview.duration;
        initTrimSliders(state.duration);
        showElement(els.editor);
        els.convertBtn.disabled = false;
    };
    els.preview.onerror = () => {
        setStatus(els.status, '動画の読み込みに失敗しました', 'error');
        els.convertBtn.disabled = true;
        hideElement(els.editor);
    };
}

function initTrimSliders(duration) {
    const els = dom.video;
    const max = Number(duration.toFixed(2));

    els.trimStart.min = '0';
    els.trimStart.max = String(max);
    els.trimStart.value = '0';

    els.trimEnd.min = '0';
    els.trimEnd.max = String(max);
    els.trimEnd.value = String(Math.min(max, 5));

    onTrimChange();
}

function onTrimChange() {
    const els = dom.video;
    let start = parseFloat(els.trimStart.value) || 0;
    let end   = parseFloat(els.trimEnd.value)   || 0;

    if (start >= end) {
        if (start >= state.duration) start = Math.max(0, state.duration - 0.05);
        end = Math.min(state.duration, start + 0.05);
        els.trimStart.value = String(start);
        els.trimEnd.value   = String(end);
    }

    els.trimStartDisp.textContent = formatSeconds(start);
    els.trimEndDisp.textContent   = formatSeconds(end);
    els.trimDuration.textContent  = formatSeconds(end - start);

    if (Math.abs(els.preview.currentTime - start) > 0.1) {
        try { els.preview.currentTime = start; } catch { /* */ }
    }
}

async function runConversion() {
    const els = dom.video;
    if (!state.file) return;

    const preset = getPreset();

    const start = parseFloat(els.trimStart.value) || 0;
    const end   = parseFloat(els.trimEnd.value)   || 0;
    const fps   = parseInt(els.fps.value, 10) || VIDEO_DEFAULT_FPS;
    const widthInput = parseInt(els.width.value, 10) || VIDEO_DEFAULT_WIDTH;
    const width = clamp(widthInput, VIDEO_MIN_WIDTH, VIDEO_MAX_WIDTH);
    const quality = clamp(parseInt(els.quality.value, 10) || VIDEO_DEFAULT_QUALITY, 1, 30);
    const optimize = !!els.optimize.checked;
    const dither = !!els.dither.checked;

    if (end - start < 0.05) {
        setStatus(els.status, '切り出し範囲が短すぎます (0.05秒以上)', 'error');
        return;
    }

    els.convertBtn.disabled = true;
    hideElement(els.result);
    cleanupOutputUrl();

    showProgress(els.progressBox);
    updateProgress(els.progressBar, els.progressPct, 0);
    els.progressLabel.textContent = '変換中…';
    setStatus(els.status, '準備中…', 'info');

    try {
        const result = await videoToGif(state.file, {
            start, end, fps, width, quality, optimize, dither,
            maxBytes: preset.maxBytes,
            targetBytes: preset.targetBytes,
            onProgress: (p) => updateProgress(els.progressBar, els.progressPct, p),
            onPhase:    (label) => {
                els.progressLabel.textContent = label;
                setStatus(els.status, label, 'info');
            },
        });

        showResult(result, preset);
    } catch (err) {
        console.error(err);
        setStatus(els.status, `エラー: ${err.message ?? err}`, 'error');
        hideProgress(els.progressBox);
    } finally {
        els.convertBtn.disabled = false;
    }
}

function showResult(result, preset) {
    const els = dom.video;
    hideProgress(els.progressBox);

    const blob = result.blob;
    const overLimit = blob.size > preset.maxBytes;

    if (overLimit) {
        setStatus(
            els.status,
            `${preset.sizeLabel} 以下に収まりませんでした (${formatBytes(blob.size)})。範囲を短くするかFPS/幅を下げてください。`,
            'warning'
        );
    } else {
        setStatus(
            els.status,
            `完了!${preset.label} (${preset.sizeLabel}) 向けに最適化したGIFを生成しました。`,
            'success'
        );
    }

    state.outputUrl = URL.createObjectURL(blob);

    els.outputImg.src = state.outputUrl;
    els.outputSize.textContent = formatBytes(blob.size);
    els.outputSize.className = `size-text ${overLimit ? 'warning' : 'success'}`;
    els.outputInfo.textContent = `${result.width}×${result.height} · ${result.fps}fps`;

    updateUsageBar(els.usageFill, els.usageText, blob.size, preset.maxBytes);

    els.downloadLink.href = state.outputUrl;
    showElement(els.result);
}

function cleanupOutputUrl() {
    if (state.outputUrl) {
        revokeUrl(state.outputUrl);
        state.outputUrl = null;
    }
}
