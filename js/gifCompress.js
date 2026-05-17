import {
    DEFAULT_QUALITY, MAX_OPTIMIZE_RETRIES, MIN_SCALE,
    GIF_DITHER, GIF_WORKER_URL,
} from './constants.js';
import { getWorkerBlobUrl, clamp } from './utils.js';
import { createCanvas, getHQContext, steppedDownscale } from './canvas.js';

export async function compressGif(file, opts = {}) {
    if (!file) throw new Error('ファイルが指定されていません');

    const {
        maxBytes,
        targetBytes,
        onProgress = () => {},
        onPhase = () => {},
    } = opts;

    if (!maxBytes || !targetBytes) throw new Error('maxBytes/targetBytes が未指定です');

    onPhase('解析中…');
    const arrayBuffer = await file.arrayBuffer();
    const u8 = new Uint8Array(arrayBuffer);

    if (typeof window.GifReader !== 'function') {
        throw new Error('omggif (GifReader) が読み込まれていません');
    }

    const reader = new window.GifReader(u8);
    const width  = reader.width;
    const height = reader.height;
    const frameCount = reader.numFrames();

    if (frameCount <= 0) throw new Error('フレームが見つかりません');

    if (file.size <= maxBytes) {
        onProgress(100);
        return {
            blob: file,
            attempts: 0,
            scale: 1.0,
            width,
            height,
            passthrough: true,
        };
    }

    onPhase('フレームをデコード中…');
    const decoded = decodeAllFrames(reader, width, height);

    let scale = clamp(Math.sqrt(targetBytes / file.size), MIN_SCALE, 1.0);
    let best = null;
    let lastBlob = null;
    let lastScale = scale;
    let attempt = 0;

    for (; attempt < MAX_OPTIMIZE_RETRIES; attempt++) {
        if (attempt === 0) {
            onPhase('高品質エンコード中…');
        } else {
            onPhase(`サイズ調整中 (${attempt + 1}/${MAX_OPTIMIZE_RETRIES})…`);
        }

        lastBlob = await encodeGif({
            decodedFrames: decoded,
            srcWidth: width,
            srcHeight: height,
            scale,
            quality: DEFAULT_QUALITY,
            onProgress,
        });
        lastScale = scale;

        const size = lastBlob.size;

        if (size <= maxBytes) {
            if (!best || size > best.blob.size) {
                best = { blob: lastBlob, scale };
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

    const chosen = best || { blob: lastBlob, scale: lastScale };

    return {
        blob: chosen.blob,
        attempts: attempt + 1,
        scale: chosen.scale,
        width:  Math.max(1, Math.floor(width  * chosen.scale)),
        height: Math.max(1, Math.floor(height * chosen.scale)),
        passthrough: false,
    };
}

function decodeAllFrames(reader, width, height) {
    const frameCount = reader.numFrames();
    const list = [];
    for (let i = 0; i < frameCount; i++) {
        const info = reader.frameInfo(i);
        const rgba = new Uint8ClampedArray(width * height * 4);
        reader.decodeAndBlitFrameRGBA(i, rgba);
        list.push({ rgba, delayMs: info.delay * 10 });
    }
    return list;
}

async function encodeGif({ decodedFrames, srcWidth, srcHeight, scale, quality, onProgress }) {
    const targetWidth  = Math.max(1, Math.floor(srcWidth  * scale));
    const targetHeight = Math.max(1, Math.floor(srcHeight * scale));

    if (typeof window.GIF !== 'function') {
        throw new Error('gif.js (GIF) が読み込まれていません');
    }

    const workerUrl = await getWorkerBlobUrl(GIF_WORKER_URL);

    const gif = new window.GIF({
        workers: 2,
        quality,
        width:  targetWidth,
        height: targetHeight,
        workerScript: workerUrl,
        dither: GIF_DITHER,
    });

    const srcCanvas = createCanvas(srcWidth, srcHeight);
    const srcCtx = getHQContext(srcCanvas, { willReadFrequently: true });

    const targetCanvas = createCanvas(targetWidth, targetHeight);
    const targetCtx = getHQContext(targetCanvas, { willReadFrequently: true });

    const frameCount = decodedFrames.length;
    const aggressive = scale < 0.6;

    for (let i = 0; i < frameCount; i++) {
        const { rgba, delayMs } = decodedFrames[i];
        const imageData = new ImageData(rgba, srcWidth, srcHeight);
        srcCtx.putImageData(imageData, 0, 0);

        targetCtx.clearRect(0, 0, targetWidth, targetHeight);
        if (aggressive) {
            const scaled = steppedDownscale(srcCanvas, targetWidth, targetHeight);
            targetCtx.drawImage(scaled, 0, 0, targetWidth, targetHeight);
        } else {
            targetCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);
        }

        const frameImage = targetCtx.getImageData(0, 0, targetWidth, targetHeight);
        gif.addFrame(frameImage, { delay: delayMs });
        onProgress((i + 1) / frameCount * 50);
    }

    return new Promise((resolve, reject) => {
        gif.on('progress', (p) => onProgress(50 + p * 50));
        gif.on('finished', (blob) => resolve(blob));
        gif.on('abort', () => reject(new Error('エンコードが中断されました')));
        try {
            gif.render();
        } catch (err) {
            reject(err);
        }
    });
}
