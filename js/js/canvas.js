export function createCanvas(width, height) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
}

export function getHQContext(canvas, options = {}) {
    const ctx = canvas.getContext('2d', { willReadFrequently: !!options.willReadFrequently });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    return ctx;
}

export function steppedDownscale(source, targetWidth, targetHeight) {
    let current = source;
    let curW = source.width;
    let curH = source.height;

    if (curW <= targetWidth && curH <= targetHeight) {
        return source;
    }

    while (curW > targetWidth * 2 && curH > targetHeight * 2) {
        const nextW = Math.max(targetWidth, Math.floor(curW / 2));
        const nextH = Math.max(targetHeight, Math.floor(curH / 2));
        const next = createCanvas(nextW, nextH);
        const ctx = getHQContext(next);
        ctx.drawImage(current, 0, 0, nextW, nextH);
        current = next;
        curW = nextW;
        curH = nextH;
    }

    if (curW !== targetWidth || curH !== targetHeight) {
        const final = createCanvas(targetWidth, targetHeight);
        const ctx = getHQContext(final);
        ctx.drawImage(current, 0, 0, targetWidth, targetHeight);
        current = final;
    }

    return current;
}

export function drawHQ(targetCtx, source, targetWidth, targetHeight) {
    if (source.width > targetWidth * 2 && source.height > targetHeight * 2) {
        const scaled = steppedDownscale(source, targetWidth, targetHeight);
        targetCtx.clearRect(0, 0, targetWidth, targetHeight);
        targetCtx.drawImage(scaled, 0, 0, targetWidth, targetHeight);
    } else {
        targetCtx.clearRect(0, 0, targetWidth, targetHeight);
        targetCtx.drawImage(source, 0, 0, targetWidth, targetHeight);
    }
}
