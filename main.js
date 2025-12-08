// main.js
// アプリケーション全体のエントリーポイント。
// 各モジュールをインポートし、初期化処理を実行する責務を持つ。

// --- 各モジュールの初期化関数をインポート ---
import { initUi } from './ui.js';
import { initAssetHandlers } from './assets.js';
import { initProjectHandlers } from './project.js';
import { initMainHandlers } from './mainHandlers.js'; 
import { exportGame } from './export.js'; 
import { initMapEditor } from './mapEditor.js'; // ★追加: マップエディタの読み込み

/**
 * アプリケーションを起動するメイン関数
 */
function main() {
    // 各モジュールの初期化を実行
    // この順番は重要。UIが最初に存在し、次にデータ操作、最後に入力処理。
    initUi();
    initAssetHandlers();
    initProjectHandlers();
    initMainHandlers(); 
    
    // ★追加: マップエディタの初期化を実行
    initMapEditor();

    // 書き出しボタンに直接イベントリスナーを設定
    const exportButton = document.getElementById('export-game-btn');
    if(exportButton) {
        exportButton.addEventListener('click', exportGame);
    } else {
        console.error("致命的エラー: 書き出しボタンが見つかりません。");
    }
}

// --- アプリケーションの起動 ---
// DOMツリーの構築が完了したら、メイン関数を実行する
document.addEventListener('DOMContentLoaded', main);
