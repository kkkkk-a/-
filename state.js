// state.js (Error Fixed - Final Version)

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

// 1. プロジェクトデータ
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
        
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#FFFFFF'
    }
};

// 2. UI状態
let activeMode = 'scenario';
let activeSectionId = null;
let activeNodeId = null;


// --- ゲッターとセッター ---
export function getProjectData() {
    return projectData;
}
export function getActiveMode() { return activeMode; }
export function getActiveSectionId() { return activeSectionId; }
export function getActiveNodeId() { return activeNodeId; }

export function setProjectData(newData) {
    if (newData && newData.scenario && newData.assets && newData.variables) {
        projectData = newData;
    } else {
        alert("無効なプロジェクトデータのため、読み込みを中断しました。");
    }
}

export function setActiveMode(mode) {
    activeMode = mode;
}
export function setActiveSectionId(id) {
    activeSectionId = id;
}
export function setActiveNodeId(id) {
    activeNodeId = id;
}
