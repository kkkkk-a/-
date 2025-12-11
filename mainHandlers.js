// mainHandlers.js

import * as state from './state.js';
import * as ui from './ui.js';
import { initScenarioHandlers } from './scenarioHandlers.js';
import { initVariableHandlers } from './variableHandlers.js';
import { refreshMapEditorUI } from './mapEditor.js';
function switchMode(newMode) {
    state.setActiveMode(newMode);
    ui.switchModeUI(newMode);

    // ★修正: プレビューモードなら更新、それ以外ならプレビューを破棄して軽量化
    if (newMode === 'preview') {
        ui.updatePreview(); 
    } else {
        // 編集モードに戻ったらiframeを消してメモリ/CPUを開放する
        ui.clearPreview();
    }
    if (newMode === 'map') {
        refreshMapEditorUI();
    }
}

export function initMainHandlers() {
    const mainNav = document.getElementById('main-nav');
    mainNav.addEventListener('click', e => {
        if (e.target.matches('.nav-button')) {
            const mode = e.target.dataset.mode;
            if (mode) {
                switchMode(mode);
            }
        }
    });

    // ▼▼▼ スマホ用タブのイベントリスナーは完全に削除 ▼▼▼

    initScenarioHandlers();
    initVariableHandlers();
    
    switchMode('scenario');
}
