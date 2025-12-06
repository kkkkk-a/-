// scenarioHandlers.js

import * as state from './state.js';
import * as ui from './ui.js';

// --- セレクション系ヘルパー関数 ---

function selectSection(id) {
    if (!id) return;
    state.setActiveSectionId(id);
    state.setActiveNodeId(null);
    ui.renderAll();
}

function selectNode(id) {
    if (!id) return;
    state.setActiveNodeId(id);
    ui.updateAssetDropdowns();
    ui.updateVariableSelects(); // 条件分岐などで使う変数リストの更新
    ui.renderScenarioTree();
    ui.renderNodeEditor();
}

// --- CRUD操作関数 ---

function addSection() {
    const name = prompt('新しい章(セクション)の名前を入力してください:', '第一章');
    if (!name) return;
    const id = `sec_${Date.now()}`;
    const projectData = state.getProjectData();
    projectData.scenario.sections[id] = { name: name, nodes: {} };
    selectSection(id);
}

function addNode() {
    if (!state.getActiveSectionId()) {
        alert('ノードを追加する章(セクション)を選択してください。');
        return;
    }
    const id = `node_${Date.now()}`;
    const projectData = state.getProjectData();
    projectData.scenario.sections[state.getActiveSectionId()].nodes[id] = { type: 'text', message: '' };
    
    // まだ開始ノードがなければ、これを開始ノードにする
    if (!projectData.scenario.startNodeId) { 
        projectData.scenario.startNodeId = id; 
    }
    
    selectNode(id);
}

function deleteNode() {
    const activeNodeId = state.getActiveNodeId();
    const activeSectionId = state.getActiveSectionId();
    if (!activeNodeId || !activeSectionId) return;
    
    if (confirm(`ノード「${activeNodeId}」を本当に削除しますか？`)) {
        const projectData = state.getProjectData();
        delete projectData.scenario.sections[activeSectionId].nodes[activeNodeId];
        
        // 開始ノードだった場合、設定を解除
        if (projectData.scenario.startNodeId === activeNodeId) {
            projectData.scenario.startNodeId = null;
        }
        
        state.setActiveNodeId(null);
        ui.renderScenarioTree();
        ui.renderNodeEditor();
    }
}

// --- データ更新関数 ---

function updateNodeData(target) {
    const activeNodeId = state.getActiveNodeId();
    const activeSectionId = state.getActiveSectionId();
    if (!activeNodeId || !activeSectionId) return;
    
    const projectData = state.getProjectData();
    const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];

    // スマート選択（章絞り込み用プルダウン）の変更時はデータ更新しない
    if (target.classList.contains('section-filter-select')) return;

    if (node.type === 'text') {
        // QuillのHTMLはイベントリスナー側で同期されるが、念のためここでも取得
        // node.message = state.quill.root.innerHTML; 
        
        const charEl = document.getElementById('node-character');
        if(charEl) node.characterId = charEl.value;

        const posEl = document.getElementById('node-position');
        if(posEl) node.characterPosition = posEl.value;

        const bgEl = document.getElementById('node-background');
        if(bgEl) node.backgroundId = bgEl.value;

        const bgmEl = document.getElementById('node-bgm');
        if(bgmEl) node.bgmId = bgmEl.value;

        const soundEl = document.getElementById('node-sound');
        if(soundEl) node.soundId = soundEl.value;

        // スマート選択で動的に生成されたID
        const nextEl = document.getElementById('node-next-text');
        if(nextEl) node.nextNodeId = nextEl.value;
    } 
    else if (node.type === 'variable') {
        const targetEl = document.getElementById('var-target');
        if(targetEl) node.targetVariable = targetEl.value;

        const opEl = document.getElementById('var-operator');
        if(opEl) node.operator = opEl.value;

        const valEl = document.getElementById('var-value');
        if(valEl) node.value = valEl.value;

        // スマート選択で動的に生成されたID
        const nextEl = document.getElementById('node-next-variable');
        if(nextEl) node.nextNodeId = nextEl.value;
    }
    else if (node.type === 'choice') {
        const { index, field } = target.dataset;
        if(index !== undefined && field && node.choices[index]) {
            node.choices[index][field] = target.value;
        }
    }
    else if (node.type === 'conditional') {
        // ELSEの遷移先 (スマート選択で動的に生成されたID)
        if(target.id === 'node-next-conditional-else') {
            node.elseNextNodeId = target.value;
        } else {
            const { index, field } = target.dataset;
            if(index !== undefined && field && node.conditions[index]) {
                node.conditions[index][field] = target.value;
            }
        }
    }
}

// --- ノード並べ替え機能 (ドラッグ＆ドロップ対応) ---

function reorderNodes(sectionId, draggedId, targetId, position) {
    const projectData = state.getProjectData();
    const section = projectData.scenario.sections[sectionId];
    if (!section) return;

    const oldNodes = section.nodes;
    const nodeIds = Object.keys(oldNodes);
    
    const fromIndex = nodeIds.indexOf(draggedId);
    const toIndex = nodeIds.indexOf(targetId);
    
    if (fromIndex === -1 || toIndex === -1) return;

    // 配列操作で順番を入れ替える
    nodeIds.splice(fromIndex, 1); // 元の場所から削除
    
    // 挿入位置の計算
    let insertIndex = toIndex;
    if (fromIndex < toIndex) {
        // 上から下へ移動: 削除によってターゲットのインデックスが1つ減っている可能性があるため調整
        insertIndex = (position === 'after' ? toIndex : toIndex - 1);
    } else {
        // 下から上へ移動
        insertIndex = (position === 'after' ? toIndex + 1 : toIndex);
    }

    nodeIds.splice(insertIndex, 0, draggedId); // 新しい場所に挿入

    // 新しい順序でオブジェクトを再構築 (JSのオブジェクトは挿入順を維持する性質を利用)
    const newNodes = {};
    nodeIds.forEach(id => {
        newNodes[id] = oldNodes[id];
    });

    section.nodes = newNodes; // 反映
    ui.renderScenarioTree();  // 再描画
}

// --- メイン初期化関数 ---

export function initScenarioHandlers() {
    const sidebar = document.querySelector('.scenario-sidebar');
    const editorPanel = document.getElementById('node-editor');
    const treeContainer = document.getElementById('scenario-tree');

    // 1. サイドバー（ツリー）のクリックイベント
    sidebar.addEventListener('click', e => {
        // 章追加
        if (e.target.id === 'add-section-btn') addSection();
        // ノード追加
        if (e.target.id === 'add-node-btn') addNode();
        // 章選択
        if (e.target.matches('.tree-section-header')) selectSection(e.target.dataset.id);
        // ノード選択
        if (e.target.closest('.tree-node')) {
            const nodeEl = e.target.closest('.tree-node');
            const sectionId = nodeEl.closest('.tree-section').querySelector('.tree-section-header').dataset.id;
            state.setActiveSectionId(sectionId);
            selectNode(nodeEl.dataset.id);
        }
    });

    // 2. エディタパネルの変更イベント (input, select, checkbox)
    editorPanel.addEventListener('change', e => {
        const activeNodeId = state.getActiveNodeId();
        const activeSectionId = state.getActiveSectionId();
        if (!activeNodeId) return;
        const projectData = state.getProjectData();
        const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];
        
        // 開始ノード設定チェックボックス
        if (e.target.id === 'is-start-node') {
            projectData.scenario.startNodeId = e.target.checked ? activeNodeId : null;
            ui.renderScenarioTree();
            return;
        }
        
        // ノードタイプ変更
        if (e.target.id === 'node-type') {
            node.type = e.target.value;
            // データ構造の初期化
            if (node.type === 'choice' && !node.choices) node.choices = [];
            if (node.type === 'conditional' && !node.conditions) node.conditions = [];
            
            ui.renderNodeEditor();
            ui.renderScenarioTree(); // アイコンなどを更新するため
            return;
        }
        
        // その他のデータ更新
        updateNodeData(e.target);
    });

    // 3. エディタパネルのクリックイベント (ボタン操作)
    editorPanel.addEventListener('click', e => {
        const activeNodeId = state.getActiveNodeId();
        const activeSectionId = state.getActiveSectionId();
        if (!activeNodeId) return;
        const projectData = state.getProjectData();
        const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];

        switch(e.target.id) {
            case 'delete-node-btn': deleteNode(); break;
            case 'add-choice-btn':
                if (node.type === 'choice') {
                    node.choices.push({ text: '新しい選択肢', nextNodeId: '' });
                    ui.renderChoicesEditor(node.choices);
                    ui.renderScenarioTree(); // 選択肢数を更新表示
                }
                break;
            case 'add-condition-btn':
                if (node.type === 'conditional') {
                    node.conditions.push({ variable: '', operator: '==', compareValue: '', nextNodeId: '' });
                    ui.renderConditionsEditor(node.conditions);
                    ui.renderScenarioTree(); // 条件数を更新表示
                }
                break;
        }
        
        // 削除ボタン (選択肢や条件の削除)
        if (e.target.matches('.danger-button')) {
            const index = parseInt(e.target.dataset.index, 10);
            if (isNaN(index)) return;
            
            if (node.type === 'choice' && node.choices) {
                node.choices.splice(index, 1);
                ui.renderChoicesEditor(node.choices);
                ui.renderScenarioTree();
            } else if (node.type === 'conditional' && node.conditions) {
                node.conditions.splice(index, 1);
                ui.renderConditionsEditor(node.conditions);
                ui.renderScenarioTree();
            }
        }
    });

    // 4. Quillエディタの変更監視
    if (state.quill) {
        state.quill.on('text-change', () => {
            const activeNodeId = state.getActiveNodeId();
            const activeSectionId = state.getActiveSectionId();
            if (activeNodeId && activeSectionId) {
                const projectData = state.getProjectData();
                const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];
                if (node && node.type === 'text') {
                    // HTMLをそのまま保存
                    node.message = state.quill.root.innerHTML;
                }
            }
        });
    }

    // 5. ドラッグ＆ドロップによる並べ替え機能
    let draggedItem = null;

    if (treeContainer) {
        treeContainer.addEventListener('dragstart', e => {
            const nodeEl = e.target.closest('.tree-node');
            if (nodeEl) {
                draggedItem = nodeEl;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', nodeEl.dataset.id);
                setTimeout(() => nodeEl.classList.add('dragging'), 0);
            }
        });

        treeContainer.addEventListener('dragend', e => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
            // ガイド表示をクリア
            document.querySelectorAll('.tree-node').forEach(el => {
                el.style.borderTop = '';
                el.style.borderBottom = '';
            });
        });

        treeContainer.addEventListener('dragover', e => {
            e.preventDefault(); // ドロップを許可するために必須
            const targetNode = e.target.closest('.tree-node');
            if (!targetNode || !draggedItem || targetNode === draggedItem) return;

            // 同じセクション内かどうかチェック（セクションまたぎの移動は今回は未対応とする）
            const sourceSection = draggedItem.closest('.tree-section');
            const targetSection = targetNode.closest('.tree-section');
            if (sourceSection !== targetSection) return;

            // マウス位置が要素の上半分か下半分かを判定
            const rect = targetNode.getBoundingClientRect();
            const next = (e.clientY - rect.top) / (rect.height) > 0.5;
            
            // 視覚的なガイド表示
            targetNode.style.borderTop = next ? '' : '2px solid #1890ff';
            targetNode.style.borderBottom = next ? '2px solid #1890ff' : '';
            targetNode.dataset.dropPos = next ? 'after' : 'before';
        });
        
        treeContainer.addEventListener('dragleave', e => {
            const targetNode = e.target.closest('.tree-node');
            if (targetNode) {
                targetNode.style.borderTop = '';
                targetNode.style.borderBottom = '';
            }
        });

        treeContainer.addEventListener('drop', e => {
            e.preventDefault();
            const targetNode = e.target.closest('.tree-node');
            if (!targetNode || !draggedItem || targetNode === draggedItem) return;

            // スタイルリセット
            targetNode.style.borderTop = '';
            targetNode.style.borderBottom = '';

            const sourceSection = draggedItem.closest('.tree-section');
            const targetSection = targetNode.closest('.tree-section');
            
            // セクション間移動はガード
            if (sourceSection !== targetSection) return;

            const draggedId = draggedItem.dataset.id;
            const targetId = targetNode.dataset.id;
            const position = targetNode.dataset.dropPos || 'after';
            const sectionId = targetSection.querySelector('.tree-section-header').dataset.id;
            
            // 並べ替え実行
            reorderNodes(sectionId, draggedId, targetId, position);
        });
    }
}
