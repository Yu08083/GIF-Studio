import { dom } from './dom.js';
import { setPreset } from './preset.js';

export function initPresetSelector() {
    const chips = dom.presetChips();

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const key = chip.dataset.preset;
            chips.forEach(c => c.classList.toggle('active', c === chip));
            setPreset(key);
        });
    });
}
