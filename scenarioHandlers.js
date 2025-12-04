// scenarioHandlers.js

import * as state from './state.js';
import * as ui from './ui.js';

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
    if (!projectData.scenario.startNodeId) { projectData.scenario.startNodeId = id; }
    selectNode(id);
    ui.updateAllNodeSelects();
}

function deleteNode() {
    const activeNodeId = state.getActiveNodeId();
    const activeSectionId = state.getActiveSectionId();
    if (!activeNodeId || !activeSectionId) return;
    if (confirm(`ノード「${activeNodeId}」を本当に削除しますか？`)) {
        const projectData = state.getProjectData();
        delete projectData.scenario.sections[activeSectionId].nodes[activeNodeId];
        if (projectData.scenario.startNodeId === activeNodeId) projectData.scenario.startNodeId = null;
        state.setActiveNodeId(null);
        ui.renderScenarioTree();
        ui.renderNodeEditor();
        ui.updateAllNodeSelects();
    }
}

function updateNodeData(target) {
    const activeNodeId = state.getActiveNodeId();
    const activeSectionId = state.getActiveSectionId();
    if (!activeNodeId || !activeSectionId) return;
    const projectData = state.getProjectData();
    const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];

    if (node.type === 'text') {
        // ★★★ 修正点1: QuillのHTMLをそのまま保存（リッチテキスト保持のため） ★★★
        node.message = state.quill.root.innerHTML; 
        
        node.characterId = document.getElementById('node-character').value;
        node.characterPosition = document.getElementById('node-position').value;
        node.backgroundId = document.getElementById('node-background').value;
        node.bgmId = document.getElementById('node-bgm').value;
        node.soundId = document.getElementById('node-sound').value;
        node.nextNodeId = document.getElementById('node-next-text').value;
    } 
    else if (node.type === 'variable') {
        node.targetVariable = document.getElementById('var-target').value;
        node.operator = document.getElementById('var-operator').value;
        node.value = document.getElementById('var-value').value;
        node.nextNodeId = document.getElementById('node-next-variable').value;
    }
    else if (node.type === 'choice') {
        const { index, field } = target.dataset;
        if(index && field && node.choices[index]) node.choices[index][field] = target.value;
    }
    else if (node.type === 'conditional') {
        if(target.id === 'node-next-conditional-else') {
            node.elseNextNodeId = target.value;
        } else {
            const { index, field } = target.dataset;
            if(index && field && node.conditions[index]) node.conditions[index][field] = target.value;
        }
    }
}

export function initScenarioHandlers() {
    const sidebar = document.querySelector('.scenario-sidebar');
    const editorPanel = document.getElementById('node-editor');

    sidebar.addEventListener('click', e => {
        if (e.target.id === 'add-section-btn') addSection();
        if (e.target.id === 'add-node-btn') addNode();
        if (e.target.matches('.tree-section-header')) selectSection(e.target.dataset.id);
        if (e.target.matches('.tree-node')) {
            const sectionId = e.target.closest('.tree-section').querySelector('.tree-section-header').dataset.id;
            state.setActiveSectionId(sectionId);
            selectNode(e.target.dataset.id);
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
                }
                break;
            case 'add-condition-btn':
                if (node.type === 'conditional') {
                    node.conditions.push({ variable: '', operator: '==', compareValue: '', nextNodeId: '' });
                    ui.renderConditionsEditor(node.conditions);
                }
                break;
        }
        if (e.target.matches('.danger-button')) {
            const index = parseInt(e.target.dataset.index, 10);
            if (isNaN(index)) return;
            if (node.type === 'choice' && node.choices) {
                node.choices.splice(index, 1);
                ui.renderChoicesEditor(node.choices);
            } else if (node.type === 'conditional' && node.conditions) {
                node.conditions.splice(index, 1);
                ui.renderConditionsEditor(node.conditions);
            }
        }
    });

    state.quill.on('text-change', () => {
        const activeNodeId = state.getActiveNodeId();
        const activeSectionId = state.getActiveSectionId();
        if (activeNodeId && activeSectionId) {
            const projectData = state.getProjectData();
            const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];
            if (node && node.type === 'text') {
                // ★★★ 修正点2: QuillのHTMLをそのまま保存 ★★★
                node.message = state.quill.root.innerHTML;
            }
        }
    });
}