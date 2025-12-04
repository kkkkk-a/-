// handlers.js
import * as state from './state.js';
import * as ui from './ui.js';
import { exportGame } from './export.js';

// --- セクションとノードの選択 ---
export function selectSection(id) {
    state.setActiveSectionId(id);
    state.setActiveNodeId(null);
    ui.renderAll();
}
export function selectNode(id) {
    state.setActiveNodeId(id);
    ui.updateAssetDropdowns();
    ui.updateVariableSelects();
    ui.renderNodeList();
    ui.renderNodeEditor();
}

// --- 主要なイベントハンドラ初期化 ---
export function initHandlers() {
    // ナビゲーション
    document.querySelector('#main-nav').addEventListener('click', e => {
        if (e.target.matches('.nav-button')) {
            const newMode = e.target.dataset.mode;
            state.setActiveMode(newMode);
            ui.switchModeUI(newMode);
            if (newMode === 'scenario') ui.updateAllNodeSelects();
        }
    });

    // セクションリストのクリック
    document.getElementById('section-list').addEventListener('click', e => {
        if (e.target.matches('.section-item')) selectSection(e.target.dataset.id);
    });
    
    // 書き出しボタン
    document.getElementById('export-game-btn').addEventListener('click', exportGame);

    // Quillエディタの変更監視
    state.quill.on('text-change', () => {
        if (!state.activeNodeId) return;
        const node = state.projectData.scenario.sections[state.activeSectionId].nodes[state.activeNodeId];
        if (node.type === 'text') {
            node.message = state.quill.root.innerHTML;
        }
    });
}