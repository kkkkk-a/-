// project.js
// プロジェクトファイル(.json)の保存と読み込みに関する責務を持つモジュール

import * as state from './state.js';
import * as ui from './ui.js';

/**
 * 現在のプロジェクトデータをJSONファイルとして保存する
 * ユーザーにファイル名の入力を求める
 */
function saveProject() {
    try {
        // 現在の日時を取得してデフォルトのファイル名にする (例: project_20231025)
        const now = new Date();
        const defaultName = `project_${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

        // ダイアログを出してユーザーに名前を入力させる
        let fileName = prompt("保存するファイル名を入力してください（拡張子 .json は不要）", defaultName);

        // キャンセルされた場合や空欄の場合は処理を中止
        if (fileName === null) return; 
        if (fileName.trim() === "") fileName = defaultName;

        // 拡張子 (.json) がついていなければ付ける
        if (!fileName.endsWith('.json')) {
            fileName += '.json';
        }

        const projectData = state.getProjectData();
        const jsonString = JSON.stringify(projectData, null, 2);
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const link = document.createElement('a');
        
        link.href = URL.createObjectURL(blob);
        link.download = fileName; // ★ここで入力された名前を使用
        
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

            state.setProjectData(newData);
            
            // 選択状態をリセット
            state.setActiveSectionId(null);
            state.setActiveNodeId(null);
            
            ui.renderAll();
            
            // 読み込んだファイル名を表示すると親切
            alert(`「${file.name}」を読み込みました。`);

        } catch (err) {
            console.error('プロジェクトファイルの読み込み、または解析に失敗しました:', err);
            alert('プロジェクトファイルの読み込みに失敗しました。有効なJSONファイルではありません。');
        }
    };
    
    reader.readAsText(file);
    
    // 同じファイルを連続で読み込めるように、inputの値をクリア
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

    // 「読込」ボタンがクリックされたら、非表示のファイル入力要素をクリックさせる
    loadButton.addEventListener('click', () => loadInput.click());
    
    // ファイル入力要素でファイルが選択されたら(change)、読み込み処理を実行
    loadInput.addEventListener('change', loadProject);
}