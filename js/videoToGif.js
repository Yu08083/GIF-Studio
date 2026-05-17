import {
    MAX_OPTIMIZE_RETRIES, MIN_SCALE, GIF_DITHER, GIF_WORKER_URL,
} from './constants.js';
import { getWorkerBlobUrl, clamp, makeEven } from './utils.js';
import { createCanvas, getHQContext, steppedDownscale } from './canvas.js';

export async function videoToGif(file, options) {
    const { start, end, fps, width, quality, optimize, dither, maxBytes, targetBytes } = options;
    const onProgress = options.onProgress || (() => {});
    const onPhase    = options.onPhase    || (() => {});

    if (end <= start) throw new Error('終了時刻は開始時刻より後である必要があります');
    if (fps   <= 0)   throw new Error('FPSは1以上を指定してください');
    if (width <= 0)   throw new Error('幅は1以上を指定してください');
    if (!maxBytes || !targetBytes) throw new Error('maxBytes/targetBytes が未指定です');

    onPhase('動画を読み込み中…');
    const video = await loadVideoElement(file);

    try {
        const aspect = video.videoHeight / video.videoWidth;
        const captureWidth  = makeEven(Math.min(width, video.videoWidth));
        const captureHeight = makeEven(captureWidth * aspect);

        onPhase('フレームを抽出中…');
        const frames = await captureAllFrames(video, {
            start, end, fps,
            width: captureWidth, height: captureHeight,
            onProgress: (p) => onProgress(p * 30),
        });

        const delayMs = Math.round(1000 / fps);

        if (!optimize) {
            onPhase('高品質エンコード中…');
            const blob = await encodeFromFrames(frames, {
                outWidth: captureWidth,
                outHeight: captureHeight,
                quality, delayMs, dither,
                onProgress: (p) => onProgress(30 + p * 70),
            });
            return {
                blob,
                width: captureWidth,
                height: captureHeight,
                fps,
                attempts: 1,
            };
        }

        let scale = 1.0;
        let best = null;
        let lastBlob = null;
        let lastW = captureWidth, lastH = captureHeight;
        let attempt = 0;

        for (; attempt < MAX_OPTIMIZE_RETRIES; attempt++) {
            if (attempt === 0) {
                onPhase('高品質エンコード中…');
            } else {
                onPhase(`サイズ調整中 (${attempt + 1}/${MAX_OPTIMIZE_RETRIES})…`);
            }

            const outWidth  = makeEven(captureWidth  * scale);
            const outHeight = makeEven(captureHeight * scale);

            lastBlob = await encodeFromFrames(frames, {
                outWidth, outHeight, quality, delayMs, dither,
                onProgress: (p) => onProgress(30 + p * 70),
            });
            lastW = outWidth;
            lastH = outHeight;

            const size = lastBlob.size;

            if (size <= maxBytes) {
                if (!best || size > best.blob.size) {
                    best = { blob: lastBlob, width: outWidth, height: outHeight };
                }
                if (size >= targetBytes) break;
                if (scale >= 0.995) break;
            } else if (scale <= MIN_SCALE * 1.05) {
                break;
            }

            const nextScale = clamp(scale * Math.sqrt(targetBytes / size), MIN_SCALE, 1.0);
            if (Math.abs(nextScale - scale) < 0.005) break;
            scale = nextScale;
        }

        const chosen = best || { blob: lastBlob, width: lastW, height: lastH };

        return {
            blob: chosen.blob,
            width: chosen.width,
            height: chosen.height,
            fps,
            attempts: attempt + 1,
        };
    } finally {
        if (video.src) URL.revokeObjectURL(video.src);
        video.removeAttribute('src');
        video.load();
    }
}

function loadVideoElement(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        video.src = URL.createObjectURL(file);

        const cleanup = () => {
            video.removeEventListener('loadedmetadata', onMeta);
            video.removeEventListener('error', onErr);
        };
        const onMeta = () => { cleanup(); resolve(video); };
        const onErr  = () => { cleanup(); reject(new Error('動画の読み込みに失敗しました')); };

        video.addEventListener('loadedmetadata', onMeta);
        video.addEventListener('error', onErr);
    });
}

function seekTo(video, time) {
    return new Promise((resolve, reject) => {
        let done = false;
        const onDone = () => {
            if (done) return;
            done = true;
            video.removeEventListener('seeked', onDone);
            video.removeEventListener('error', onErr);
            resolve();
        };
        const onErr = () => {
            if (done) return;
            done = true;
            video.removeEventListener('seeked', onDone);
            video.removeEventListener('error', onErr);
            reject(new Error('シークに失敗しました'));
        };
        video.addEventListener('seeked', onDone);
        video.addEventListener('error', onErr);
        const safe = Math.min(video.duration ?? time, Math.max(0, time));
        video.currentTime = safe;
    });
}

async function captureAllFrames(video, { start, end, fps, width, height, onProgress }) {
    const duration = end - start;
    const frameCount = Math.max(1, Math.floor(duration * fps));
    const frames = [];

    for (let i = 0; i < frameCount; i++) {
        const t = clamp(start + i / fps, start, end);
        await seekTo(video, t);

        const c = createCanvas(width, height);
        const cx = getHQContext(c);
        cx.drawImage(video, 0, 0, width, height);

        frames.push(c);
        onProgress((i + 1) / frameCount);
    }

    return frames;
}

async function encodeFromFrames(frames, { outWidth, outHeight, quality, delayMs, dither, onProgress }) {
    if (typeof window.GIF !== 'function') {
        throw new Error('gif.js (GIF) が読み込まれていません');
    }

    const workerUrl = await getWorkerBlobUrl(GIF_WORKER_URL);
    const gif = new window.GIF({
        workers: 2,
        quality,
        width: outWidth,
        height: outHeight,
        workerScript: workerUrl,
        dither: dither ? GIF_DITHER : false,
    });

    const canvas = createCanvas(outWidth, outHeight);
    const ctx = getHQContext(canvas, { willReadFrequently: true });

    const srcW = frames[0]?.width || outWidth;
    const aggressive = srcW > outWidth * 2;

    for (let i = 0; i < frames.length; i++) {
        ctx.clearRect(0, 0, outWidth, outHeight);
        if (aggressive) {
            const scaled = steppedDownscale(frames[i], outWidth, outHeight);
            ctx.drawImage(scaled, 0, 0, outWidth, outHeight);
        } else {
            ctx.drawImage(frames[i], 0, 0, outWidth, outHeight);
        }
        const frameImage = ctx.getImageData(0, 0, outWidth, outHeight);
        gif.addFrame(frameImage, { delay: delayMs });
        onProgress((i + 1) / frames.length * 0.5);
    }

    return new Promise((resolve, reject) => {
        gif.on('progress', (p) => onProgress(0.5 + p * 0.5));
        gif.on('finished', (blob) => resolve(blob));
        gif.on('abort', () => reject(new Error('エンコードが中断されました')));
        try {
            gif.render();
        } catch (err) {
            reject(err);
        }
    });
}
