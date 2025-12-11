// state.js (Ultimate Final 3D Version)

// Quill Rich Text Editorのインスタンスを先に初期化
// (HTMLに #rich-text-editor が存在することが前提)
const Font = Quill.import('formats/font');
// フォントの内部名と表示名の定義
Font.whitelist = [
    'sans-serif', // 標準ゴシック
    'serif',      // 標準明朝
    'monospace',  // 等幅
    'dotgothic',  // ドット文字
    'rounded',    // 丸ゴシック
    'klee',       // 手書き風
    'mincho-b'    // 特太明朝
];
Quill.register(Font, true);


// Quill Rich Text Editorのインスタンスを先に初期化
export const quill = new Quill('#rich-text-editor', {
    theme: 'snow',
    modules: { 
        toolbar: [
            [{ 'font': Font.whitelist }], 
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
        sounds: {},
        models: {},
        animations: {}
    },
    variables: {},
    scenario: {
        startNodeId: null,
        sections: {}
    },
    maps: {},
    settings: {
        windowColor: '#000000',
        windowOpacity: 75,
        windowBgTransparent: false,
        windowImage: null,
        
        buttonColor: '#1990ff',
        buttonOpacity: 80,
        buttonBgTransparent: false,
        buttonImage: null,
        buttonTextColor: '#FFFFFF',

        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#FFFFFF'
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
    // 読み込んだデータに新しい項目がない場合も、デフォルト値で補完する
    const newSettings = { ...projectData.settings, ...(newData.settings || {}) };
    newData.settings = newSettings;
    
    if (!newData.assets.models) {
        newData.assets.models = {};
    }

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

export const modelExpressionCache = {};
