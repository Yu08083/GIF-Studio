import { initTabs } from './tabs.js';
import { initPresetSelector } from './presetController.js';
import { initGifCompressTab } from './gifCompressController.js';
import { initVideoToGifTab }  from './videoToGifController.js';

function bootstrap() {
    if (typeof window.GIF !== 'function') {
        console.error('gif.js が読み込まれていません');
    }
    if (typeof window.GifReader !== 'function') {
        console.error('omggif が読み込まれていません');
    }

    initTabs();
    initPresetSelector();
    initGifCompressTab();
    initVideoToGifTab();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
    bootstrap();
}
