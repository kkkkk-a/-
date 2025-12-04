// mainHandlers.js

import * as state from './state.js';
import * as ui from './ui.js';
import { initScenarioHandlers } from './scenarioHandlers.js';
import { initVariableHandlers } from './variableHandlers.js';

function switchMode(newMode) {
    state.setActiveMode(newMode);
    ui.switchModeUI(newMode); // ui.jsの関数を呼び出すだけ

    // プレビューモードに切り替えたときに、最新の状態でプレビューを更新する
    if (newMode === 'preview') {
        // uiモジュールにプレビュー更新用の関数を新設して呼び出す
        ui.updatePreview(); 
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