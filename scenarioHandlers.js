// scenarioHandlers.js (Fixed: Rename Section Added)

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
    ui.updateVariableSelects(); 
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

// ★追加: 章の名前変更機能
function renameSection() {
    const activeSectionId = state.getActiveSectionId();
    if (!activeSectionId) {
        alert('名前を変更する章(セクション)を選択してください。');
        return;
    }
    
    const projectData = state.getProjectData();
    const section = projectData.scenario.sections[activeSectionId];
    
    const newName = prompt('章の新しい名前を入力してください:', section.name);
    if (!newName || newName.trim() === "") return;
    
    section.name = newName;
    
    // ツリーとエディタ（プルダウン内の章名など）を更新
    ui.renderScenarioTree();
    ui.updateAllNodeSelects();
}

function addNode() {
    const activeSectionId = state.getActiveSectionId();
    if (!activeSectionId) {
        alert('ノードを追加する章(セクション)を選択してください。');
        return;
    }
    
    const projectData = state.getProjectData();
    const section = projectData.scenario.sections[activeSectionId];

    // 新しいノードのIDとデータを作成
    const newId = `node_${Date.now()}`;
    section.nodes[newId] = { type: 'text', message: '' };
    
    // ★修正: 自動接続ロジック
    const autoLinkCheckbox = document.getElementById('auto-link-next-node');
    const activeNodeId = state.getActiveNodeId();
    
    // チェックボックスがONで、かつノードが選択されている場合
    if (autoLinkCheckbox && autoLinkCheckbox.checked && activeNodeId) {
        const activeNode = section.nodes[activeNodeId];
        // 選択中のノードのタイプに応じて、適切な「次のノードID」プロパティに設定
        if (activeNode) {
            if (activeNode.type === 'text' || activeNode.type === 'variable') {
                activeNode.nextNodeId = newId;
            }
            // 選択肢や条件分岐は複雑なので、ここではテキストと変数操作ノードのみ対象とするのが安全
        }
    }

    // まだ開始ノードがなければ、これを開始ノードにする
    if (!projectData.scenario.startNodeId) { 
        projectData.scenario.startNodeId = newId; 
    }
    
    // 新しく作ったノードを選択状態にする
    selectNode(newId);
}

function deleteNode() {
    const activeNodeId = state.getActiveNodeId();
    const activeSectionId = state.getActiveSectionId();
    if (!activeNodeId || !activeSectionId) return;
    
    if (confirm(`ノード「${activeNodeId}」を本当に削除しますか？`)) {
        const projectData = state.getProjectData();
        delete projectData.scenario.sections[activeSectionId].nodes[activeNodeId];
        
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

    if (target.classList.contains('section-filter-select')) return;

    if (node.type === 'text') {
        const charEl = document.getElementById('node-character');
        if(charEl) node.characterId = charEl.value;

        const customNameEl = document.getElementById('node-custom-name');
        if(customNameEl) node.customName = customNameEl.value;

        const posEl = document.getElementById('node-position');
        if(posEl) node.characterPosition = posEl.value;

        const bgEl = document.getElementById('node-background');
        if(bgEl) node.backgroundId = bgEl.value;

        const bgmEl = document.getElementById('node-bgm');
        if(bgmEl) node.bgmId = bgmEl.value;

        const soundEl = document.getElementById('node-sound');
        if(soundEl) node.soundId = soundEl.value;

        const nextEl = document.getElementById('node-next-text');
        if(nextEl) node.nextNodeId = nextEl.value;
        
        const effectEl = document.getElementById('node-effect');
        if(effectEl) node.effect = effectEl.value;
    } 
    else if (node.type === 'variable') {
        const targetEl = document.getElementById('var-target');
        if(targetEl) node.targetVariable = targetEl.value;

        const opEl = document.getElementById('var-operator');
        if(opEl) node.operator = opEl.value;

        const valEl = document.getElementById('var-value');
        if(valEl) node.value = valEl.value;

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
        if(target.id === 'node-next-conditional-else') {
            node.elseNextNodeId = target.value;
        } else {
            const { index, field } = target.dataset;
            if(index !== undefined && field && node.conditions[index]) {
                node.conditions[index][field] = target.value;
            }
        }
    }
    else if (node.type === 'map') {
        const destEl = document.getElementById('node-map-dest');
        if(destEl) node.mapId = destEl.value;
        
        const spawnEl = document.getElementById('node-map-spawn');
        if(spawnEl) node.spawnId = spawnEl.value;
    }
}

// --- ノード並べ替え機能 ---

function reorderNodes(sectionId, draggedId, targetId, position) {
    const projectData = state.getProjectData();
    const section = projectData.scenario.sections[sectionId];
    if (!section) return;

    const oldNodes = section.nodes;
    const nodeIds = Object.keys(oldNodes);
    
    const fromIndex = nodeIds.indexOf(draggedId);
    const toIndex = nodeIds.indexOf(targetId);
    
    if (fromIndex === -1 || toIndex === -1) return;

    nodeIds.splice(fromIndex, 1);
    
    let insertIndex = toIndex;
    if (fromIndex < toIndex) {
        insertIndex = (position === 'after' ? toIndex : toIndex - 1);
    } else {
        insertIndex = (position === 'after' ? toIndex + 1 : toIndex);
    }

    nodeIds.splice(insertIndex, 0, draggedId);

    const newNodes = {};
    nodeIds.forEach(id => {
        newNodes[id] = oldNodes[id];
    });

    section.nodes = newNodes;
    ui.renderScenarioTree();
}

// --- メイン初期化関数 ---

export function initScenarioHandlers() {
    const sidebar = document.querySelector('.scenario-sidebar');
    const editorPanel = document.getElementById('node-editor');
    const treeContainer = document.getElementById('scenario-tree');

    sidebar.addEventListener('click', e => {
        if (e.target.id === 'add-section-btn') addSection();
        // ★追加: 名前変更ボタンのイベント
        if (e.target.id === 'rename-section-btn') renameSection();
        
        if (e.target.id === 'add-node-btn') addNode();
        if (e.target.matches('.tree-section-header')) selectSection(e.target.dataset.id);
        if (e.target.closest('.tree-node')) {
            const nodeEl = e.target.closest('.tree-node');
            const sectionId = nodeEl.closest('.tree-section').querySelector('.tree-section-header').dataset.id;
            state.setActiveSectionId(sectionId);
            selectNode(nodeEl.dataset.id);
        }
    });

    editorPanel.addEventListener('change', e => {
        const activeNodeId = state.getActiveNodeId();
        const activeSectionId = state.getActiveSectionId();
        if (!activeNodeId) return;
        const projectData = state.getProjectData();
        const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];
        
        if (e.target.id === 'is-start-node') {
            projectData.scenario.startNodeId = e.target.checked ? activeNodeId : null;
            ui.renderScenarioTree();
            return;
        }
        
        if (e.target.id === 'node-type') {
            node.type = e.target.value;
            if (node.type === 'choice' && !node.choices) node.choices = [];
            if (node.type === 'conditional' && !node.conditions) node.conditions = [];
            
            ui.renderNodeEditor();
            ui.renderScenarioTree(); 
            return;
        }
        
        updateNodeData(e.target);
    });

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
                    ui.renderScenarioTree();
                }
                break;
            case 'add-condition-btn':
                if (node.type === 'conditional') {
                    node.conditions.push({ variable: '', operator: '==', compareValue: '', nextNodeId: '' });
                    ui.renderConditionsEditor(node.conditions);
                    ui.renderScenarioTree();
                }
                break;
        }
        
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

    if (state.quill) {
        state.quill.on('text-change', () => {
            const activeNodeId = state.getActiveNodeId();
            const activeSectionId = state.getActiveSectionId();
            if (activeNodeId && activeSectionId) {
                const projectData = state.getProjectData();
                const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];
                if (node && node.type === 'text') {
                    node.message = state.quill.root.innerHTML;
                }
            }
        });
    }

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
            document.querySelectorAll('.tree-node').forEach(el => {
                el.style.borderTop = '';
                el.style.borderBottom = '';
            });
        });

        treeContainer.addEventListener('dragover', e => {
            e.preventDefault(); 
            const targetNode = e.target.closest('.tree-node');
            if (!targetNode || !draggedItem || targetNode === draggedItem) return;

            const sourceSection = draggedItem.closest('.tree-section');
            const targetSection = targetNode.closest('.tree-section');
            if (sourceSection !== targetSection) return;

            const rect = targetNode.getBoundingClientRect();
            const next = (e.clientY - rect.top) / (rect.height) > 0.5;
            
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

            targetNode.style.borderTop = '';
            targetNode.style.borderBottom = '';

            const sourceSection = draggedItem.closest('.tree-section');
            const targetSection = targetNode.closest('.tree-section');
            
            if (sourceSection !== targetSection) return;

            const draggedId = draggedItem.dataset.id;
            const targetId = targetNode.dataset.id;
            const position = targetNode.dataset.dropPos || 'after';
            const sectionId = targetSection.querySelector('.tree-section-header').dataset.id;
            
            reorderNodes(sectionId, draggedId, targetId, position);
        });
    }
}
