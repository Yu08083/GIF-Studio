export const PRESETS = {
    emoji: {
        label: '絵文字',
        sizeLabel: '256KB',
        maxBytes: 256 * 1024,
        targetBytes: Math.floor(255 * 1024),
    },
    sticker: {
        label: 'スタンプ',
        sizeLabel: '512KB',
        maxBytes: 512 * 1024,
        targetBytes: Math.floor(510 * 1024),
    },
    icon: {
        label: 'アバター / サーバーアイコン',
        sizeLabel: '8MB',
        maxBytes:  8 * 1024 * 1024,
        targetBytes: 7.9 * 1024 * 1024,
    },
    chat: {
        label: 'チャット (Free)',
        sizeLabel: '10MB',
        maxBytes:  10 * 1024 * 1024,
        targetBytes: 9.9 * 1024 * 1024,
    },
    nitroBasic: {
        label: 'Nitro Basic / Boost Lv.2',
        sizeLabel: '50MB',
        maxBytes:  50 * 1024 * 1024,
        targetBytes: 49.5 * 1024 * 1024,
    },
    nitro: {
        label: 'Nitro',
        sizeLabel: '500MB',
        maxBytes: 500 * 1024 * 1024,
        targetBytes: 495 * 1024 * 1024,
    },
};

let _currentKey = 'icon';
const _listeners = new Set();

export function getPreset() {
    return { key: _currentKey, ...PRESETS[_currentKey] };
}

export function setPreset(key) {
    if (!PRESETS[key] || key === _currentKey) return;
    _currentKey = key;
    const preset = getPreset();
    _listeners.forEach(fn => {
        try { fn(preset); } catch (e) { console.error(e); }
    });
}

export function onPresetChange(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}
