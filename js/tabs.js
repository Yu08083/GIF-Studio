import { dom } from './dom.js';

export function initTabs() {
    const buttons = dom.tabButtons();
    const panels  = dom.tabPanels();

    buttons.forEach(btn => {
        btn.addEventListener('click', () => activate(btn.dataset.tab, buttons, panels));
    });
}

function activate(tabId, buttons, panels) {
    buttons.forEach(b => {
        const on = b.dataset.tab === tabId;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
    });

    panels.forEach(p => {
        const on = p.id === `tab-${tabId}`;
        p.classList.toggle('active', on);
        p.hidden = !on;
    });
}
