// assets.js

import * as state from './state.js';
import * as ui from './ui.js';

function setupAssetManager(type, fileInputId, accept) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput) return;

    fileInput.addEventListener('change', (e) => {
        for (const file of e.target.files) {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            if (!accept.includes(fileExtension) && !(type === 'sounds' && file.type === 'audio/mpeg' && accept.includes('mp3'))) {
                alert(`無効なファイル形式です: ${file.name}`);
                continue;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const id = `${type.slice(0, -1)}_${Date.now()}`;
                const projectData = state.getProjectData();
                
                projectData.assets[type][id] = {
                    name: file.name,
                    data: event.target.result,
                    // アニメーション初期設定
                    cols: 1, rows: 1, fps: 12, loop: true
                };
                
                ui.renderAssetList(type);
                ui.updateAssetDropdowns();
            };
            reader.readAsDataURL(file);
        }
        fileInput.value = '';
    });
}

function handleAssetNameChange(e) {
    const { id, type } = e.target.dataset;
    const projectData = state.getProjectData();
    if (projectData.assets[type] && projectData.assets[type][id]) {
        projectData.assets[type][id].name = e.target.value;
        ui.updateAssetDropdowns();
    }
}

function handleAssetDelete(e) {
    const { id, type } = e.target.dataset;
    const projectData = state.getProjectData();
    if (confirm(`アセット「${projectData.assets[type][id].name}」を削除しますか？`)) {
        delete projectData.assets[type][id];
        ui.renderAssetList(type);
        ui.updateAssetDropdowns();
    }
}

// ★追加: アニメーション設定の変更処理
function handleAnimSettingChange(e) {
    const { id, type, setting } = e.target.dataset;
    const projectData = state.getProjectData();
    const asset = projectData.assets[type][id];
    
    if (setting === 'loop') {
        asset.loop = e.target.checked;
    } else {
        asset[setting] = parseInt(e.target.value) || 1;
    }
}

// ★追加: 外部JSONの読み込み処理
function handleJsonLoad(btn) {
    const { id, type } = btn.dataset;
    
    // 一時的なファイル入力を作成
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = evt => {
            try {
                const json = JSON.parse(evt.target.result);
                const projectData = state.getProjectData();
                const asset = projectData.assets[type][id];

                // スプライトツールのJSON仕様に合わせてデータを取得
                // { cols: 10, rows: 5, fps: 12, ... }
                if (json.cols) asset.cols = json.cols;
                if (json.rows) asset.rows = json.rows;
                if (json.fps) asset.fps = json.fps;
                
                alert('設定を反映しました！');
                ui.renderAssetList(type); // UI更新
            } catch (err) {
                alert('JSONの読み込みに失敗しました');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

export function initAssetHandlers() {
    setupAssetManager('characters', 'character-file-input', 'webp');
    setupAssetManager('backgrounds', 'background-file-input', 'webp');
    setupAssetManager('sounds', 'sound-file-input', 'mp3,ogg,opus');

    const mainContent = document.getElementById('main-content');
    
    mainContent.addEventListener('change', (e) => {
        if (e.target.matches('.asset-card input[type="text"]')) {
            handleAssetNameChange(e);
        }
        // ★追加: アニメーション設定の変更検知
        if (e.target.matches('.asset-card input[data-setting]')) {
            handleAnimSettingChange(e);
        }
    });

    mainContent.addEventListener('click', (e) => {
        if (e.target.matches('.asset-card .danger-button')) {
            handleAssetDelete(e);
        }
        // ★追加: JSON読込ボタン
        if (e.target.matches('.json-btn')) {
            handleJsonLoad(e.target);
        }
    });
}