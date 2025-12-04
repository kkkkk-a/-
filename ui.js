// ui.js
// 状態を読み込み、それに基づいてDOMを更新する責務を持つモジュール

import * as state from './state.js';
import { generateGameHtml } from './export.js';

// --- DOM要素のキャッシュ ---
const elements = {
    navButtons: document.querySelectorAll('.nav-button'),
    modeContents: document.querySelectorAll('.mode-content'),
    
    // シナリオ編集
    sectionList: document.getElementById('section-list'),
    nodeList: document.getElementById('node-list'),
    currentSectionName: document.getElementById('current-section-name'),
    nodeEditor: document.getElementById('node-editor'),
    nodeIdDisplay: document.getElementById('node-id-display'),
    isStartNodeCheckbox: document.getElementById('is-start-node'),
    nodeTypeSelect: document.getElementById('node-type'),
    allNodeTypeSettings: document.querySelectorAll('.node-type-settings'),
    
    textNode: {
        character: document.getElementById('node-character'),
        position: document.getElementById('node-position'),
        background: document.getElementById('node-background'),
        bgm: document.getElementById('node-bgm'),
        sound: document.getElementById('node-sound'),
        next: document.getElementById('node-next-text')
    },
    choiceNode: { editor: document.getElementById('choices-editor') },
    variableNode: {
        target: document.getElementById('var-target'),
        operator: document.getElementById('var-operator'),
        value: document.getElementById('var-value'),
        next: document.getElementById('node-next-variable')
    },
    conditionalNode: {
        editor: document.getElementById('conditions-editor'),
        elseNext: document.getElementById('node-next-conditional-else')
    },
    
    variablesList: document.getElementById('variables-list'),
    scenarioTree: document.getElementById('scenario-tree'),
    editorPlaceholder: document.getElementById('editor-placeholder'),
    previewWindow: document.querySelector('.preview-window'),

    helpBtn: document.getElementById('open-help-btn'),
    helpModal: document.getElementById('help-modal'),
    closeHelpBtn: document.querySelector('.close-modal')
};

/**
 * UI全体を現在のstateに基づいて再描画する
 */
export function renderAll() {
    renderScenarioTree();
    renderNodeEditor();
    updateAllNodeSelects();
    renderVariablesList();
    
    // ★修正点: 読み込み時にアセットリストも再描画する
    renderAssetList('characters');
    renderAssetList('backgrounds');
    renderAssetList('sounds');
    
    // ドロップダウンも最新のアセット状況に更新
    updateAssetDropdowns();
}

export function switchModeUI(newMode) {
    elements.navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === newMode));
    elements.modeContents.forEach(content => content.classList.toggle('active', content.id === `mode-${newMode}`));
}

function initHelpSystem() {
    if (elements.helpBtn && elements.helpModal && elements.closeHelpBtn) {
        elements.helpBtn.addEventListener('click', () => elements.helpModal.classList.remove('hidden'));
        elements.closeHelpBtn.addEventListener('click', () => elements.helpModal.classList.add('hidden'));
        window.addEventListener('click', (e) => { if (e.target === elements.helpModal) elements.helpModal.classList.add('hidden'); });
    }
}

export function updatePreview() {
    const projectData = state.getProjectData();
    const activeNodeId = state.getActiveNodeId();
    
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    
    const startNode = activeNodeId || projectData.scenario.startNodeId;
    
    if (!startNode) {
        elements.previewWindow.innerHTML = '<div style="color:white; padding:20px; text-align:center;">開始ノードが設定されていないか、ノードが選択されていません。</div>';
        return;
    }

    const gameHtml = generateGameHtml(projectData, startNode);
    const blob = new Blob([gameHtml], { type: 'text/html' });
    iframe.src = URL.createObjectURL(blob);

    elements.previewWindow.innerHTML = '';
    elements.previewWindow.appendChild(iframe);
}

export function renderScenarioTree() {
    if (!elements.scenarioTree) return;
    elements.scenarioTree.innerHTML = '';
    const projectData = state.getProjectData();
    const activeSectionId = state.getActiveSectionId();
    const activeNodeId = state.getActiveNodeId();

    Object.keys(projectData.scenario.sections).forEach(secId => {
        const section = projectData.scenario.sections[secId];
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'tree-section';
        if (secId === activeSectionId) sectionDiv.classList.add('active');

        const header = document.createElement('div');
        header.className = 'tree-section-header';
        header.textContent = section.name;
        header.dataset.id = secId;
        sectionDiv.appendChild(header);

        const nodesGroup = document.createElement('div');
        nodesGroup.className = 'tree-nodes-group';
        
        Object.keys(section.nodes).forEach(nodeId => {
            const node = section.nodes[nodeId];
            const nodeDiv = document.createElement('div');
            nodeDiv.className = 'tree-node';
            nodeDiv.dataset.id = nodeId;
            nodeDiv.dataset.type = node.type;
            if (nodeId === projectData.scenario.startNodeId) nodeDiv.classList.add('start-node');
            if (nodeId === activeNodeId) nodeDiv.classList.add('active');

            let summary = "";
            if (node.type === 'text') {
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = node.message || '';
                summary = tempDiv.textContent.substring(0, 15) + '...';
            } else if (node.type === 'choice') {
                summary = `分岐 (${node.choices ? node.choices.length : 0})`;
            } else {
                summary = node.type;
            }
            nodeDiv.textContent = `${nodeId.slice(-4)}: ${summary}`;
            nodesGroup.appendChild(nodeDiv);
        });
        sectionDiv.appendChild(nodesGroup);
        elements.scenarioTree.appendChild(sectionDiv);
    });
}

export function renderNodeEditor() {
    const activeNodeId = state.getActiveNodeId();
    const activeSectionId = state.getActiveSectionId();
    const projectData = state.getProjectData();
    
    if (!activeNodeId || !activeSectionId || !projectData.scenario.sections[activeSectionId] || !projectData.scenario.sections[activeSectionId].nodes[activeNodeId]) {
        elements.nodeEditor.classList.add('hidden');
        if (elements.editorPlaceholder) elements.editorPlaceholder.style.display = 'flex';
        return;
    }
    
    elements.nodeEditor.classList.remove('hidden');
    if (elements.editorPlaceholder) elements.editorPlaceholder.style.display = 'none';
    
    const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];
    elements.nodeIdDisplay.textContent = activeNodeId;
    elements.isStartNodeCheckbox.checked = (activeNodeId === projectData.scenario.startNodeId);
    elements.nodeTypeSelect.value = node.type;

    elements.allNodeTypeSettings.forEach(el => el.classList.add('hidden'));
    const currentSettings = document.getElementById(`${node.type}-node-settings`);
    if(currentSettings) currentSettings.classList.remove('hidden');

    switch(node.type) {
        case 'text':
            state.quill.root.innerHTML = node.message || '';
            elements.textNode.character.value = node.characterId || '';
            elements.textNode.position.value = node.characterPosition || 'center';
            elements.textNode.background.value = node.backgroundId || '';
            elements.textNode.bgm.value = node.bgmId || '';
            elements.textNode.sound.value = node.soundId || '';
            elements.textNode.next.value = node.nextNodeId || '';
            break;
        case 'choice':
            renderChoicesEditor(node.choices || []);
            break;
        case 'variable':
            elements.variableNode.target.value = node.targetVariable || '';
            elements.variableNode.operator.value = node.operator || '=';
            elements.variableNode.value.value = node.value || '';
            elements.variableNode.next.value = node.nextNodeId || '';
            break;
        case 'conditional':
            renderConditionsEditor(node.conditions || []);
            elements.conditionalNode.elseNext.value = node.elseNextNodeId || '';
            break;
    }
}

export function renderChoicesEditor(choices) {
    elements.choiceNode.editor.innerHTML = '';
    choices.forEach((choice, index) => {
        const item = document.createElement('div');
        item.className = 'choice-editor-item';
        item.innerHTML = `<input type="text" placeholder="選択肢テキスト" value="${choice.text || ''}" data-index="${index}" data-field="text"><span>→</span><select data-index="${index}" data-field="nextNodeId"></select><button class="danger-button" data-index="${index}">×</button>`;
        elements.choiceNode.editor.appendChild(item);
    });
    updateAllNodeSelects();
}

export function renderConditionsEditor(conditions) {
    elements.conditionalNode.editor.innerHTML = '';
    conditions.forEach((cond, index) => {
        const item = document.createElement('div');
        item.className = 'condition-editor-item';
        item.innerHTML = `<span>IF</span><select data-index="${index}" data-field="variable"></select><select data-index="${index}" data-field="operator"><option value="==">==</option><option value="!=">!=</option><option value=">">&gt;</option><option value="<">&lt;</option><option value=">=">&gt;=</option><option value="<=">&lt;=</option></select><input type="text" placeholder="値" value="${cond.compareValue || ''}" data-index="${index}" data-field="compareValue"><span>THEN →</span><select data-index="${index}" data-field="nextNodeId"></select><button class="danger-button" data-index="${index}">×</button>`;
        const op = item.querySelector('select[data-field="operator"]'); if(op) op.value = cond.operator || '==';
        elements.conditionalNode.editor.appendChild(item);
    });
    updateAllNodeSelects();
    updateVariableSelects();
}

export function renderVariablesList() {
    let html = `
        <div class="variable-header">
            <div>変数名</div>
            <div>初期値</div>
            <div>操作</div>
        </div>
    `;

    const projectData = state.getProjectData();
    const variables = projectData.variables;

    if (Object.keys(variables).length === 0) {
        html += `<div style="padding:20px; text-align:center; color:#777;">変数はまだ登録されていません。</div>`;
    } else {
        Object.keys(variables).forEach(varName => {
            const value = variables[varName];
            html += `
                <div class="variable-row">
                    <div class="variable-name">${varName}</div>
                    <input type="text" value="${value}" data-var-name="${varName}" placeholder="初期値">
                    <button class="danger-button" data-var-name="${varName}">削除</button>
                </div>
            `;
        });
    }
    elements.variablesList.innerHTML = html;
}

export function renderAssetList(type) {
    const listElement = document.getElementById(`${type.slice(0, -1)}-list`);
    if (!listElement) return;
    listElement.innerHTML = '';
    const projectData = state.getProjectData();
    
    for (const id in projectData.assets[type]) {
        const asset = projectData.assets[type][id];
        const card = document.createElement('div');
        card.className = 'asset-card';
        
        let contentHtml = '';
        
        // 画像系アセット（キャラ・背景）の場合、アニメーション設定を表示
        if (type === 'characters' || type === 'backgrounds') {
            // 初期値設定
            const cols = asset.cols || 1;
            const rows = asset.rows || 1;
            const fps = asset.fps || 12;
            const loop = asset.loop !== false; // デフォルトtrue

            contentHtml = `
                <img src="${asset.data}" alt="${asset.name}">
                <div class="asset-key">${id}</div>
                <input type="text" value="${asset.name}" data-id="${id}" data-type="${type}" placeholder="アセット名">
                
                <div class="anim-settings">
                    <button class="json-btn" data-id="${id}" data-type="${type}">📄 設定JSONを読込</button>
                    <div class="anim-row">
                        <label>横</label><input type="number" value="${cols}" min="1" data-setting="cols" data-id="${id}" data-type="${type}">
                        <label>縦</label><input type="number" value="${rows}" min="1" data-setting="rows" data-id="${id}" data-type="${type}">
                    </div>
                    <div class="anim-row">
                        <label>FPS</label><input type="number" value="${fps}" min="1" data-setting="fps" data-id="${id}" data-type="${type}">
                        <label><input type="checkbox" ${loop ? 'checked' : ''} data-setting="loop" data-id="${id}" data-type="${type}">ループ</label>
                    </div>
                </div>
                
                <button class="danger-button" data-id="${id}" data-type="${type}">削除</button>
            `;
        } else {
            // 音声などの場合
            contentHtml = `
                <audio controls src="${asset.data}"></audio>
                <div class="asset-key">${id}</div>
                <input type="text" value="${asset.name}" data-id="${id}" data-type="${type}">
                <button class="danger-button" data-id="${id}" data-type="${type}">削除</button>
            `;
        }

        card.innerHTML = contentHtml;
        listElement.appendChild(card);
    }
}

export function updateAllNodeSelects() {
    const selects = document.querySelectorAll('select[id^="node-next"], select[data-field="nextNodeId"]');
    const options = ['<option value="">(終了または未接続)</option>'];
    const projectData = state.getProjectData();
    const activeNodeId = state.getActiveNodeId();
    const activeSectionId = state.getActiveSectionId();

    Object.keys(projectData.scenario.sections).forEach(secId => {
        const section = projectData.scenario.sections[secId];
        options.push(`<optgroup label="${section.name}">`);
        Object.keys(section.nodes).forEach(nodeId => options.push(`<option value="${nodeId}">${nodeId.slice(-4)}: ${section.nodes[nodeId].type}</option>`));
        options.push(`</optgroup>`);
    });

    selects.forEach(select => {
        let currentValue;
        if (activeNodeId && activeSectionId && projectData.scenario.sections[activeSectionId] && select.dataset.field === 'nextNodeId') {
            const node = projectData.scenario.sections[activeSectionId].nodes[activeNodeId];
            const index = select.dataset.index;
            if (node.type === 'choice' && node.choices[index]) currentValue = node.choices[index].nextNodeId;
            else if (node.type === 'conditional' && node.conditions[index]) currentValue = node.conditions[index].nextNodeId;
        } else {
             currentValue = select.value;
        }
        select.innerHTML = options.join('');
        select.value = currentValue || '';
    });
}

export function updateAssetDropdowns() {
    const projectData = state.getProjectData();
    const populate = (select, type, defaultOption) => {
        const currentVal = select.value;
        select.innerHTML = `<option value="">${defaultOption}</option>`;
        for (const id in projectData.assets[type]) {
            select.innerHTML += `<option value="${id}">${projectData.assets[type][id].name}</option>`;
        }
        select.value = currentVal;
    };
    populate(elements.textNode.character, 'characters', 'なし');
    populate(elements.textNode.background, 'backgrounds', '変更なし');
    populate(elements.textNode.sound, 'sounds', 'なし');
    populate(elements.textNode.bgm, 'sounds', '変更なし (維持)');
    elements.textNode.bgm.innerHTML += `<option value="stop">🛑 BGMを停止</option>`;
}

export function updateVariableSelects() {
    const selects = document.querySelectorAll('#var-target, select[data-field="variable"]');
    const projectData = state.getProjectData();
    const options = Object.keys(projectData.variables).map(name => `<option value="${name}">${name}</option>`).join('');
    selects.forEach(select => {
        let currentValue = select.value;
        select.innerHTML = options;
        select.value = currentValue || Object.keys(projectData.variables)[0] || '';
    });
}

export function initUi() {
    renderAll();
    initHelpSystem();
}