// state.js
// アプリケーション全体のデータとUIの状態を一元管理する責務を持つモジュール

// Quill Rich Text Editorのインスタンスを先に初期化
// (HTMLに #rich-text-editor が存在することが前提)
export const quill = new Quill('#rich-text-editor', {
    theme: 'snow',
    modules: { 
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            [{ 'align': [] }],
            ['clean']
        ] 
    }
});

// --- アプリケーションの状態 ---

// 1. プロジェクトデータ: 保存・読込・書き出しの対象となる永続的なデータ
let projectData = {
    assets: { 
        characters: {}, 
        backgrounds: {}, 
        sounds: {} 
    },
    variables: {},
    scenario: {
        startNodeId: null,
        sections: {}
    }
};

// 2. UI状態: 現在の編集状況など、一時的なデータ
let activeMode = 'scenario';
let activeSectionId = null;
let activeNodeId = null;


// --- 状態を外部から安全に操作するための関数 (ゲッターとセッター) ---

// プロジェクトデータを取得 (読み取り専用のように扱う)
export function getProjectData() {
    return projectData;
}

// UI状態を取得
export function getActiveMode() { return activeMode; }
export function getActiveSectionId() { return activeSectionId; }
export function getActiveNodeId() { return activeNodeId; }

// プロジェクトデータを一括で設定 (主にプロジェクト読込時に使用)
export function setProjectData(newData) {
    // 簡単なバリデーション
    if (newData && newData.scenario && newData.assets && newData.variables) {
        projectData = newData;
    } else {
        alert("無効なプロジェクトデータのため、読み込みを中断しました。");
    }
}

// UI状態を設定
export function setActiveMode(mode) {
    activeMode = mode;
}
export function setActiveSectionId(id) {
    activeSectionId = id;
}
export function setActiveNodeId(id) {
    activeNodeId = id;
}
