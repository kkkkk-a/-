// project.js
// プロジェクトファイル(.json)の保存と読み込みに関する責務を持つモジュール

import * as state from './state.js';
import * as ui from './ui.js';
import { pixelsToWebPDataURL } from './utils.js'; 
import { resetMapEditor } from './mapEditor.js'; // ★追加: マップエディタのリセット関数をインポート

/**
 * 現在のプロジェクトデータをJSONファイルとして保存する
 * ユーザーにファイル名の入力を求める
 */
function saveProject() {
    try {
        const now = new Date();
        const defaultName = `project_${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

        let fileName = prompt("保存するファイル名を入力してください（拡張子 .json は不要）", defaultName);

        if (fileName === null) return; 
        if (fileName.trim() === "") fileName = defaultName;

        if (!fileName.endsWith('.json')) {
            fileName += '.json';
        }

        const projectData = state.getProjectData();
        const jsonString = JSON.stringify(projectData, null, 2);
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const link = document.createElement('a');
        
        link.href = URL.createObjectURL(blob);
        link.download = fileName; 
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error("プロジェクトの保存に失敗しました:", error);
        alert("プロジェクトの保存中にエラーが発生しました。");
    }
}

/**
 * ユーザーが選択したJSONファイルを読み込み、プロジェクトデータを復元する
 * @param {Event} event - ファイルinputのchangeイベントオブジェクト
 */
function loadProject(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const newData = JSON.parse(e.target.result);

            // データの簡易チェック
            if (!newData.scenario || !newData.assets) {
                throw new Error("無効なプロジェクトデータです");
            }

            // ★追加: 古いバージョンのデータに maps がない場合の対策
            if (!newData.maps) {
                newData.maps = {};
            }

            // スプライトキャンバスJSON形式の自動変換 (DataURL化)
            const assetTypes = ['characters', 'backgrounds', 'sounds'];
            const assetData = newData.assets;
            const defaultQuality = newData.settings && newData.settings.quality ? newData.settings.quality : 85; 
            
            for (const type of assetTypes) {
                if (!assetData[type]) continue;
                
                for (const id in assetData[type]) {
                    const asset = assetData[type][id];
                    
                    if (asset.isSpriteSheet === true && Array.isArray(asset.pixelData) && asset.width && asset.height) {
                        const webPDataUrl = pixelsToWebPDataURL(asset.pixelData, asset.width, asset.height, defaultQuality);
                        
                        assetData[type][id] = {
                            name: asset.name || id,
                            data: webPDataUrl, 
                            cols: asset.cols || 1,
                            rows: asset.rows || 1,
                            fps: asset.fps || 12,
                            loop: asset.loop !== undefined ? asset.loop : true
                        };
                        console.log(`アセット[${type}][${id}]をスプライトデータから復元しました。`);
                    }
                }
            }

            state.setProjectData(newData);
            
            // 選択状態をリセット
            state.setActiveSectionId(null);
            state.setActiveNodeId(null);
            
            ui.renderAll();
            
            // ★追加: マップエディタのUIをリセット・更新
            resetMapEditor();
            
            alert(`「${file.name}」を読み込みました。`);

        } catch (err) {
            console.error('プロジェクトファイルの読み込み、または解析に失敗しました:', err);
            alert('プロジェクトファイルの読み込みに失敗しました。有効なJSONファイルではありません。');
        }
    };
    
    reader.readAsText(file);
    
    event.target.value = '';
}

/**
 * プロジェクト関連のボタンにイベントハンドラを設定する初期化関数
 */
export function initProjectHandlers() {
    const saveButton = document.getElementById('save-project-btn');
    const loadButton = document.getElementById('load-project-btn');
    const loadInput = document.getElementById('load-project-input');

    saveButton.addEventListener('click', saveProject);
    loadButton.addEventListener('click', () => loadInput.click());
    loadInput.addEventListener('change', loadProject);
}
