// ui.js (Ultimate Final Version - Fixed Map Object Select)

import * as state from './state.js';
import { generateGameHtml } from './export.js';

// --- DOM要素キャッシュ ---
const elements = {
    navButtons: document.querySelectorAll('.nav-button'),
    modeContents: document.querySelectorAll('.mode-content'),
    sectionList: document.getElementById('section-list'),
    scenarioTree: document.getElementById('scenario-tree'),
    nodeEditor: document.getElementById('node-editor'),
    nodeIdDisplay: document.getElementById('node-id-display'),
    isStartNodeCheckbox: document.getElementById('is-start-node'),
    nodeTypeSelect: document.getElementById('node-type'),
    allNodeTypeSettings: document.querySelectorAll('.node-type-settings'),
    textNode: {
        charListContainer: document.getElementById('node-char-list-container'), 
        addCharBtn: document.getElementById('add-char-btn'),
        charList3DContainer: document.getElementById('node-3d-char-list'),
        addChar3DBtn: document.getElementById('add-3d-char-btn'),
        customName: document.getElementById('node-custom-name'),
        background: document.getElementById('node-background'),
        bgm: document.getElementById('node-bgm'),
        sound: document.getElementById('node-sound'),
        nextContainer: document.getElementById('container-next-text')
    },
    choiceNode: { editor: document.getElementById('choices-editor') },
    variableNode: {
        target: document.getElementById('var-target'), operator: document.getElementById('var-operator'),
        value: document.getElementById('var-value'), nextContainer: document.getElementById('container-next-variable')
    },
    conditionalNode: {
        editor: document.getElementById('conditions-editor'),
        elseNextContainer: document.getElementById('container-next-conditional-else')
    },
    mapNode: { dest: document.getElementById('node-map-dest'), spawn: document.getElementById('node-map-spawn') },
    mapBgSelect: document.getElementById('map-bg-select'),
    // ★追加: マップエディタのオブジェクト画像選択肢
    mapObjCharSelect: document.getElementById('obj-char-select'),
    
    variablesList: document.getElementById('variables-list'),
    editorPlaceholder: document.getElementById('editor-placeholder'),
    previewWindow: document.querySelector('.preview-window'),
    helpBtn: document.getElementById('open-help-btn'),
    helpModal: document.getElementById('help-modal'),
    closeHelpBtn: document.querySelector('.close-modal')
};

// --- ヘルパー関数 ---
export function createLinkedSelects(container, selectId, currentValue, dataset = {}) {
    if (!container) return; container.innerHTML = ''; 
    const projectData = state.getProjectData();
    const sectionSelect = document.createElement('select');
    sectionSelect.className = 'section-filter-select';
    sectionSelect.style.marginBottom = '5px';
    sectionSelect.style.backgroundColor = '#f0f8ff';
    const nodeSelect = document.createElement('select');
    if (selectId) nodeSelect.id = selectId;
    Object.keys(dataset).forEach(key => { nodeSelect.dataset[key] = dataset[key]; });
    
    let targetSectionId = state.getActiveSectionId(); 
    if (currentValue) {
        for (const secId in projectData.scenario.sections) {
            if (projectData.scenario.sections[secId].nodes[currentValue]) {
                targetSectionId = secId;
                break;
            }
        }
    }
    if (!targetSectionId && Object.keys(projectData.scenario.sections).length > 0) {
        targetSectionId = Object.keys(projectData.scenario.sections)[0];
    }

    Object.keys(projectData.scenario.sections).forEach(secId => {
        const option = document.createElement('option');
        option.value = secId;
        option.textContent = `📁 ${projectData.scenario.sections[secId].name}`;
        if (secId === targetSectionId) option.selected = true;
        sectionSelect.appendChild(option);
    });

    const updateNodeOptions = (secId) => {
        nodeSelect.innerHTML = '<option value="">(なし / 終了)</option>';
        const section = projectData.scenario.sections[secId];
        if (section && section.nodes) {
            Object.keys(section.nodes).forEach(nodeId => {
                const node = section.nodes[nodeId];
                let icon = '📄'; let summary = node.type;
                if(node.type === 'text') {
                    icon = '💬';
                    const tmp = document.createElement("div"); tmp.innerHTML = node.message || '';
                    summary = tmp.textContent.replace(/\s+/g, ' ').trim().substring(0, 15) + '...';
                } else if(node.type === 'choice') {
                    icon = '🔀'; summary = `選択肢 ${node.choices ? node.choices.length : 0}個`;
                }
                const option = document.createElement('option');
                option.value = nodeId;
                option.textContent = `${nodeId.slice(-4)}: ${icon} ${summary}`;
                if (nodeId === currentValue) option.selected = true;
                nodeSelect.appendChild(option);
            });
        }
    };

    updateNodeOptions(targetSectionId);
    sectionSelect.addEventListener('change', (e) => {
        updateNodeOptions(e.target.value);
        nodeSelect.value = "";
        nodeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    container.appendChild(sectionSelect); container.appendChild(nodeSelect);
}

export function populateAssetSelect(selectElement, type, defaultText = "なし") {
    if (!selectElement) return;
    const projectData = state.getProjectData();
    const currentVal = selectElement.value;
    selectElement.innerHTML = '';
    selectElement.add(new Option(defaultText, ''));
    const assets = projectData.assets[type];
    if (assets) {
        for (const id in assets) {
            selectElement.add(new Option(assets[id].name, id));
        }
    }
    if (currentVal && assets && assets[currentVal]) { selectElement.value = currentVal; }
}

function renderCharacterListEditor(characters) {
    const container = elements.textNode.charListContainer;
    if (!container) return; container.innerHTML = '';
    if (!characters || characters.length === 0) {
        container.innerHTML = '<div style="color:#999; font-size:0.9em; padding:5px;">表示する2Dキャラクターがいません</div>';
        return;
    }
    characters.forEach((charData, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom:8px; background:#f9f9f9; padding:8px; border-radius:4px; border:1px solid #ddd;';
        const row1 = document.createElement('div'); row1.className = 'form-group-row'; row1.style.marginBottom = '5px';
        const charLabel = document.createElement('label'); charLabel.style.cssText = 'flex:1; display:flex; align-items:center; gap:5px; cursor:pointer;';
        const charSelect = document.createElement('select'); charSelect.style.flex = '1';
        populateAssetSelect(charSelect, 'characters', '(画像選択)');
        charSelect.value = charData.characterId || '';
        charSelect.onchange = (e) => { charData.characterId = e.target.value; };
        charLabel.appendChild(charSelect);
        const delBtn = document.createElement('button'); delBtn.className = 'danger-button'; delBtn.textContent = '削除'; delBtn.style.cssText = 'padding:2px 8px; font-size:0.8em;';
        delBtn.onclick = () => { characters.splice(index, 1); renderCharacterListEditor(characters); };
        row1.appendChild(charLabel); row1.appendChild(delBtn);
        const row2 = document.createElement('div'); row2.style.marginBottom = '5px';
        const posLabel = document.createElement('label'); posLabel.style.width = '100%'; posLabel.style.cursor = 'pointer';
        const posSelect = document.createElement('select'); posSelect.style.width = '100%';
        const positions = {
            'bottom-left': '↙ 左下', 'bottom-center': '⬇ 中央下', 'bottom-right': '↘ 右下',
            'center-left': '⬅ 左中', 'center': '⏺ 中央', 'center-right': '➡ 右中',
            'top-left': '↖ 左上', 'top-center': '⬆ 中央上', 'top-right': '↗ 右上'
        };
        for (const [key, label] of Object.entries(positions)) { posSelect.add(new Option(label, key)); }
        posSelect.value = charData.position || 'bottom-center';
        posSelect.onchange = (e) => { charData.position = e.target.value; };
        posLabel.appendChild(posSelect); row2.appendChild(posLabel);
        const row3 = document.createElement('div'); row3.style.cssText = 'display:flex; gap:10px; align-items:center; font-size:0.9em; margin-bottom:5px;';
        const createInp = (icon, val, cb, tip) => {
            const lbl = document.createElement('label'); lbl.style.cssText = 'display:flex; align-items:center; gap:2px; cursor:pointer;'; lbl.title = tip;
            const span = document.createElement('span'); span.textContent = icon;
            const inp = document.createElement('input'); inp.type = 'number'; inp.value = val; inp.style.width = '50px'; inp.style.padding = '2px'; inp.onchange = cb;
            lbl.appendChild(span); lbl.appendChild(inp); return lbl;
        };
        row3.appendChild(createInp('🔍', charData.scale!==undefined?charData.scale:100, e=>charData.scale=parseInt(e.target.value)||100, "拡大率 (%)"));
        row3.appendChild(createInp('↔', charData.x||0, e=>charData.x=parseInt(e.target.value)||0, "横位置調整 (px)"));
        row3.appendChild(createInp('↕', charData.y||0, e=>charData.y=parseInt(e.target.value)||0, "縦位置調整 (px)"));
        const row4 = document.createElement('div'); row4.style.cssText = 'margin-top:5px; border-top:1px dashed #ccc; padding-top:5px;';
        const maskLabel = document.createElement('label'); maskLabel.style.cssText = 'display:flex; align-items:center; gap:5px; cursor:pointer; width:100%;';
        const maskIcon = document.createElement('span'); maskIcon.textContent = '🎭 Mask:'; maskIcon.style.fontSize = '0.8em';
        const maskSelect = document.createElement('select'); maskSelect.style.flex = '1';
        populateAssetSelect(maskSelect, 'characters', '(マスクなし)');
        maskSelect.value = charData.maskId || '';
        maskSelect.onchange = (e) => { charData.maskId = e.target.value; };
        maskLabel.appendChild(maskIcon); maskLabel.appendChild(maskSelect); row4.appendChild(maskLabel);
        wrapper.appendChild(row1); wrapper.appendChild(row2); wrapper.appendChild(row3); wrapper.appendChild(row4);
        container.appendChild(wrapper);
    });
}

function render3DCharacterListEditor(characters3d) {
    const container = elements.textNode.charList3DContainer;
    if (!container) return; container.innerHTML = '';
    if (!characters3d || characters3d.length === 0) return;

    characters3d.forEach((charData, index) => {
        const wrapper = document.createElement('div'); 
        wrapper.style.cssText = 'margin-bottom:10px; background:#fcfcfc; padding:8px; border-radius:4px; border:1px solid #adc6ff;';
        
        // --- モデル選択 ---
        const row1 = document.createElement('div'); 
        row1.style.cssText = 'display:flex; gap:5px; margin-bottom:5px;';
        const modelSelect = document.createElement('select'); 
        modelSelect.style.flex = '1'; 
        populateAssetSelect(modelSelect, 'models', '(3Dモデル選択)'); 
        modelSelect.value = charData.modelId || '';
        
        const delBtn = document.createElement('button'); 
        delBtn.className = 'danger-button'; 
        delBtn.textContent = '×'; 
        delBtn.onclick = () => { characters3d.splice(index, 1); render3DCharacterListEditor(characters3d); };
        row1.appendChild(modelSelect); 
        row1.appendChild(delBtn);

        // --- ★表情選択 (ここからが新規追加) ---
        const rowExpr = document.createElement('div');
        rowExpr.style.cssText = 'display:flex; align-items:center; gap:5px; margin-bottom:5px;';
        const exprLabel = document.createElement('span');
        exprLabel.textContent = '😀 表情:';
        exprLabel.style.cssText = 'font-size:0.8em; width:50px;';
        const exprSelect = document.createElement('select');
        exprSelect.style.flex = '1';
        
        // 表情プルダウンを更新する関数
        const updateExpressions = (modelId) => {
            exprSelect.innerHTML = '<option value="">(デフォルト)</option>';
            // state.js でエクスポートしたキャッシュから表情リストを取得
            const expressions = state.modelExpressionCache[modelId]; 
            if (expressions) {
                expressions.forEach(name => {
                    const option = new Option(name, name);
                    if (name === charData.expression) option.selected = true;
                    exprSelect.add(option);
                });
            }
        };
        
        updateExpressions(charData.modelId); // 初期表示
        
        // モデルが変更されたら、表情リストも更新する
        modelSelect.onchange = (e) => { 
            charData.modelId = e.target.value;
            // 選択肢をリフレッシュ
            updateExpressions(e.target.value);
            // 表情の選択をリセット
            charData.expression = '';
        };

        // 表情が変更されたら保存
        exprSelect.onchange = (e) => {
            charData.expression = e.target.value;
        };
        
        rowExpr.appendChild(exprLabel);
        rowExpr.appendChild(exprSelect);

        // --- アニメーション選択 ---
        const rowAnim = document.createElement('div'); rowAnim.style.cssText = 'display:flex; align-items:center; gap:5px; margin-bottom:5px;';
        const animLabel = document.createElement('span'); animLabel.textContent = '🏃 Anim:'; animLabel.style.cssText = 'font-size:0.8em; width:50px;';
        const animSelect = document.createElement('select'); animSelect.style.flex = '1'; populateAssetSelect(animSelect, 'animations', '(ポーズ/待機)'); animSelect.value = charData.animationId || ''; animSelect.onchange = (e) => { charData.animationId = e.target.value; };
        rowAnim.appendChild(animLabel); rowAnim.appendChild(animSelect);

        // --- 位置・回転・スケール ---
        const createNum = (ph, val, cb, tip) => {
            const inp = document.createElement('input'); inp.type = 'number'; inp.step = '0.1'; inp.placeholder = ph; inp.value = val !== undefined ? val : 0; inp.style.cssText = 'width:40px; font-size:0.8em;'; inp.title = tip; inp.onchange = cb; return inp;
        };
        const rowPos = document.createElement('div'); rowPos.style.cssText = 'display:flex; align-items:center; gap:3px; margin-bottom:3px;';
        rowPos.innerHTML = '<span style="font-size:0.8em; width:30px; font-weight:bold;">Pos:</span>';
        rowPos.appendChild(createNum('X', charData.posX, e=>charData.posX=parseFloat(e.target.value), '位置 X')); rowPos.appendChild(createNum('Y', charData.posY, e=>charData.posY=parseFloat(e.target.value), '位置 Y')); rowPos.appendChild(createNum('Z', charData.posZ, e=>charData.posZ=parseFloat(e.target.value), '位置 Z'));
        const rowRot = document.createElement('div'); rowRot.style.cssText = 'display:flex; align-items:center; gap:3px; margin-bottom:3px;';
        rowRot.innerHTML = '<span style="font-size:0.8em; width:30px; font-weight:bold;">Rot:</span>';
        rowRot.appendChild(createNum('X', charData.rotX, e=>charData.rotX=parseFloat(e.target.value), '回転 X')); rowRot.appendChild(createNum('Y', charData.rotY, e=>charData.rotY=parseFloat(e.target.value), '回転 Y')); rowRot.appendChild(createNum('Z', charData.rotZ, e=>charData.rotZ=parseFloat(e.target.value), '回転 Z'));
        const rowScale = document.createElement('div'); rowScale.style.cssText = 'display:flex; align-items:center; gap:3px;';
        rowScale.innerHTML = '<span style="font-size:0.8em; width:30px; font-weight:bold;">Scl:</span>';
        const scaleInp = createNum('1.0', charData.scale !== undefined ? charData.scale : 1.0, e=>charData.scale=parseFloat(e.target.value), 'サイズ (1.0 = 標準)'); scaleInp.style.flex = '1'; rowScale.appendChild(scaleInp);

        // 要素を組み立て
        wrapper.appendChild(row1); 
        wrapper.appendChild(rowExpr); // ★表情セレクタを追加
        wrapper.appendChild(rowAnim); 
        wrapper.appendChild(rowPos); 
        wrapper.appendChild(rowRot); 
        wrapper.appendChild(rowScale); 
        container.appendChild(wrapper);
    });
}

// --- Main Render ---
export function renderAll() {
    renderScenarioTree(); renderNodeEditor(); renderVariablesList();
    renderAssetList('characters'); renderAssetList('backgrounds'); renderAssetList('sounds');
    renderAssetList('models'); renderAssetList('animations');
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
    const iframe = document.createElement('iframe'); iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.border = 'none';
    const startNode = activeNodeId || projectData.scenario.startNodeId;
    if (!startNode) { elements.previewWindow.innerHTML = '<div style="color:white; padding:20px;">開始ノード設定なし</div>'; return; }
    const gameHtml = generateGameHtml(projectData, startNode);
    const blob = new Blob([gameHtml], { type: 'text/html' });
    iframe.src = URL.createObjectURL(blob);
    elements.previewWindow.innerHTML = ''; elements.previewWindow.appendChild(iframe);
}
export function clearPreview() {
    if (elements.previewWindow) {
        // iframeをDOMから削除することで、内部のスクリプト停止をブラウザに促す
        elements.previewWindow.innerHTML = '';
    }
}

export function renderScenarioTree() {
    if (!elements.scenarioTree) return; elements.scenarioTree.innerHTML = '';
    const projectData = state.getProjectData(); const activeId = state.getActiveNodeId();
    Object.keys(projectData.scenario.sections).forEach(secId => {
        const sec = projectData.scenario.sections[secId];
        const div = document.createElement('div'); div.className = 'tree-section';
        div.innerHTML = `<div class="tree-section-header" data-id="${secId}">📁 ${sec.name}</div><div class="tree-nodes-group"></div>`;
        const group = div.querySelector('.tree-nodes-group');
        Object.keys(sec.nodes).forEach(nId => {
            const n = sec.nodes[nId]; const nd = document.createElement('div'); nd.className = 'tree-node ' + (nId===activeId?'active':''); if(nId===projectData.scenario.startNodeId) nd.classList.add('start-node'); nd.dataset.id=nId;
            let i='📄',s=n.type; if(n.type==='text'){i='💬'; s=(n.message||'').replace(/<[^>]*>/g,'').substring(0,10);} else if(n.type==='choice') {i='🔀';}
            nd.innerHTML = `<span class="node-icon">${i}</span><div class="node-info"><span class="node-summary">${s}</span><span class="node-id-sub">${nId.slice(-4)}</span></div>`;
            group.appendChild(nd);
        });
        elements.scenarioTree.appendChild(div);
    });
}
export function renderNodeEditor() {
    const activeId = state.getActiveNodeId(); const secId = state.getActiveSectionId(); const proj = state.getProjectData();
    if (!activeId || !proj.scenario.sections[secId]?.nodes[activeId]) { elements.nodeEditor.classList.add('hidden'); elements.editorPlaceholder.style.display='flex'; return; }
    elements.nodeEditor.classList.remove('hidden'); elements.editorPlaceholder.style.display='none';
    const node = proj.scenario.sections[secId].nodes[activeId];
    elements.nodeIdDisplay.textContent = activeId; elements.isStartNodeCheckbox.checked = (activeId === proj.scenario.startNodeId); elements.nodeTypeSelect.value = node.type;
    elements.allNodeTypeSettings.forEach(el => el.classList.add('hidden'));
    const setEl = document.getElementById(`${node.type}-node-settings`); if(setEl) setEl.classList.remove('hidden');

    if(node.type === 'text') {
        state.quill.root.innerHTML = node.message || '';
        if(!node.characters) node.characters=[]; renderCharacterListEditor(node.characters);
        elements.textNode.addCharBtn.onclick = () => { node.characters.push({position:'bottom-center', scale:100}); renderCharacterListEditor(node.characters); };
        if(!node.characters3d) node.characters3d=[]; render3DCharacterListEditor(node.characters3d);
        elements.textNode.addChar3DBtn.onclick = () => { node.characters3d.push({modelId:'', posX:0, posY:0, posZ:0, rotX:0, rotY:0, rotZ:0, scale:1.0}); render3DCharacterListEditor(node.characters3d); };
        if(elements.textNode.customName) elements.textNode.customName.value = node.customName||'';
        elements.textNode.background.value = node.backgroundId||''; elements.textNode.bgm.value = node.bgmId||''; elements.textNode.sound.value = node.soundId||'';
        let effSel = document.getElementById('node-effect');
        if(!effSel) {
            const grp = document.createElement('div'); grp.className='form-group'; grp.style.cssText='margin-top:10px; padding:10px; background:#fff0f6; border:1px dashed #ffadd2; border-radius:4px;';
            grp.innerHTML = '<label style="color:#c41d7f; font-weight:bold;">⚡ 画面演出</label>';
            effSel = document.createElement('select'); effSel.id='node-effect';
            const effs = {'':'なし', 'flash-white':'⚪ 白フラッシュ', 'flash-red':'🔴 赤フラッシュ', 'shake-small':'🫨 揺れ(小)', 'shake-medium':'🫨 揺れ(中)', 'shake-hard':'🫨 揺れ(大)', 'fade-black':'⚫ 暗転'};
            for(const [k,v] of Object.entries(effs)) effSel.add(new Option(v,k));
            grp.appendChild(effSel); elements.textNode.sound.closest('.form-group-row').after(grp);
            effSel.onchange = (e) => node.effect = e.target.value;
        }
        effSel.value = node.effect || '';
        createLinkedSelects(elements.textNode.nextContainer, 'node-next-text', node.nextNodeId);
    } else if (node.type === 'choice') { renderChoicesEditor(node.choices||[]); 
    } else if (node.type === 'variable') {
        elements.variableNode.target.value = node.targetVariable||''; elements.variableNode.operator.value = node.operator||'='; elements.variableNode.value.value = node.value||''; createLinkedSelects(elements.variableNode.nextContainer, 'node-next-variable', node.nextNodeId);
    } else if (node.type === 'conditional') {
        renderConditionsEditor(node.conditions||[]); createLinkedSelects(elements.conditionalNode.elseNextContainer, 'node-next-conditional-else', node.elseNextNodeId);
    } else if (node.type === 'map') {
        updateMapSelect(elements.mapNode.dest); elements.mapNode.dest.value = node.mapId||''; 
        elements.mapNode.dest.onchange = () => updateSpawnSelect(elements.mapNode.spawn, elements.mapNode.dest.value);
        updateSpawnSelect(elements.mapNode.spawn, node.mapId); elements.mapNode.spawn.value = node.spawnId||'';
    }
}
function updateMapSelect(el) { const m=state.getProjectData().maps; el.innerHTML='<option value="">(選択)</option>'; if(m) for(const id in m) el.add(new Option(m[id].name, id)); }
function updateSpawnSelect(el, mid) { el.innerHTML='<option value="">(初期位置)</option>'; const m=state.getProjectData().maps[mid]; if(m) m.objects.forEach(o=>{if(o.isSpawn) el.add(new Option(`🚩 ${o.spawnId||'IDなし'}`, o.spawnId||''));}); }
export function renderChoicesEditor(choices) {
    elements.choiceNode.editor.innerHTML = '';
    choices.forEach((c, i) => {
        const d = document.createElement('div'); d.className='choice-editor-item';
        d.innerHTML = `<input type="text" value="${c.text||''}" placeholder="選択肢"><div class="smart-select-mini"></div><button class="danger-button">×</button>`;
        d.querySelector('input').onchange = (e) => c.text = e.target.value;
        createLinkedSelects(d.querySelector('.smart-select-mini'), null, c.nextNodeId, {index:i, field:'nextNodeId'});
        d.querySelector('button').onclick = () => { choices.splice(i, 1); renderChoicesEditor(choices); };
        elements.choiceNode.editor.appendChild(d);
    });
}
export function renderConditionsEditor(conds) {
    elements.conditionalNode.editor.innerHTML = '';
    conds.forEach((c, i) => {
        const d = document.createElement('div'); d.className='condition-editor-item';
        const vSel = document.createElement('select'); updateVariableSelectsFor(vSel); vSel.value=c.variable; vSel.onchange=e=>c.variable=e.target.value;
        const opSel = document.createElement('select'); ['==','!=','>','<','>=','<='].forEach(op=>opSel.add(new Option(op,op))); opSel.value=c.operator; opSel.onchange=e=>c.operator=e.target.value;
        const valInp = document.createElement('input'); valInp.value=c.compareValue||''; valInp.onchange=e=>c.compareValue=e.target.value;
        const nextDiv = document.createElement('div'); nextDiv.className='smart-select-mini'; createLinkedSelects(nextDiv, null, c.nextNodeId, {index:i, field:'nextNodeId'});
        const del = document.createElement('button'); del.textContent='×'; del.className='danger-button'; del.onclick=()=>{ conds.splice(i,1); renderConditionsEditor(conds); };
        d.append(vSel, opSel, valInp, nextDiv, del);
        elements.conditionalNode.editor.appendChild(d);
    });
    updateVariableSelects();
}
function updateVariableSelectsFor(sel) { const v=state.getProjectData().variables; sel.innerHTML='<option value="">(変数)</option>'; Object.keys(v).forEach(k=>sel.add(new Option(k,k))); }
export function renderVariablesList() {
    const v = state.getProjectData().variables;
    let h = '<div class="variable-header"><div>名前</div><div>値</div><div></div></div>';
    if(Object.keys(v).length===0) h+=`<div style="text-align:center; color:#777;">変数はまだありません。</div>`;
    else Object.keys(v).forEach(k => { h += `<div class="variable-row"><div>${k}</div><input type="text" value="${v[k]}" onchange="state.getProjectData().variables['${k}']=this.value"><button class="danger-button" data-var-name="${k}">削除</button></div>`; });
    
    elements.variablesList.innerHTML = h;

    elements.variablesList.querySelectorAll('.danger-button').forEach(btn => {
        btn.onclick = () => {
            const varName = btn.dataset.varName;
            delete state.getProjectData().variables[varName];
            renderVariablesList();
            updateVariableSelects();
        };
    });
}
export function renderAssetList(type) {
    const list = document.getElementById(`${type.slice(0,-1)}-list`); if(!list) return; list.innerHTML = '';
    const assets = state.getProjectData().assets[type]; if (!assets) return;
    for (const id in assets) {
        const a = assets[id];
        const card = document.createElement('div'); card.className = 'asset-card';
        
        let prev = `<img src="${a.data}">`;
        
        if (type === 'models' || type === 'animations') {
            prev = `<div style="background:#eee;height:100px;display:flex;justify-content:center;align-items:center;font-size:30px;">📦</div>`;
        } else if (a.data.startsWith('data:video')) {
            // ★修正: muted を削除し、controls を追加（音量調整や再生バーを表示）
            prev = `<video src="${a.data}" controls playsinline style="width:100%; height:140px; background:#000; object-fit:contain;"></video>`;
        }
        
        let settingsHtml = '';
        if (type === 'characters' || type === 'backgrounds') {
            const width = a.width || '?';
            const height = a.height || '?';
            settingsHtml = `
            <div class="anim-settings">
                <div style="font-size:0.8em; color:#666; margin-bottom:5px;">Size: ${width} x ${height} px</div>
                <div class="anim-row">
                    <label>列(Cols):</label><input type="number" value="${a.cols||1}" min="1" data-id="${id}" data-type="${type}" data-setting="cols">
                    <label>行(Rows):</label><input type="number" value="${a.rows||1}" min="1" data-id="${id}" data-type="${type}" data-setting="rows">
                </div>
                <div class="anim-row">
                    <label>FPS:</label><input type="number" value="${a.fps||12}" min="1" data-id="${id}" data-type="${type}" data-setting="fps">
                    <label><input type="checkbox" ${a.loop!==false?'checked':''} data-id="${id}" data-type="${type}" data-setting="loop">Loop</label>
                </div>
            </div>`;
        }

        card.innerHTML = `${prev}<div class="asset-key">${id}</div>
        <input type="text" value="${a.name}" data-id="${id}" data-type="${type}">
        ${settingsHtml}
        <button class="json-btn" data-id="${id}" data-type="${type}" style="display:none">JSON更新</button>
        <button class="danger-button" data-id="${id}" data-type="${type}">削除</button>`;
        list.appendChild(card);
    }
}

export function updateAllNodeSelects() { renderNodeEditor(); }

// --- ★修正: 汎用アセットリスト更新（マップ用含む） ---
export function updateAssetDropdowns() {
    populateAssetSelect(elements.textNode.background, 'backgrounds', '変更なし');
    populateAssetSelect(elements.mapBgSelect, 'backgrounds', 'なし');
    // ★追加: マップエディタのオブジェクト用画像セレクトも更新
    if (elements.mapObjCharSelect) {
        populateAssetSelect(elements.mapObjCharSelect, 'characters', 'なし');
    }
    
    // サウンド
    const soundSelects = [elements.textNode.bgm, elements.textNode.sound];
    const projectData = state.getProjectData();
    soundSelects.forEach(select => {
        if(!select) return;
        const currentVal = select.value;
        select.innerHTML = '';
        select.add(new Option('変更なし (維持)', ''));
        select.add(new Option('停止 (Stop)', 'stop'));
        const assets = projectData.assets.sounds;
        if (assets) { for (const id in assets) { select.add(new Option(assets[id].name, id)); } }
        select.value = currentVal;
    });

    renderNodeEditor(); // エディタ再描画
}

export function updateVariableSelects() {
    const selects = Array.from(document.querySelectorAll('#var-target, select[data-field="variable"]'));
    const mapCondVar = document.getElementById('obj-cond-var'); if (mapCondVar) selects.push(mapCondVar);
    const v = state.getProjectData().variables;
    const opts = Object.keys(v).map(n => `<option value="${n}">${n}</option>`).join('');
    selects.forEach(sel => {
        let val = sel.value; sel.innerHTML = '<option value="">(変数)</option>' + opts;
        if (val && v.hasOwnProperty(val)) sel.value = val;
    });
}

// UI設定初期化
export function initUISettings() {
    const s = state.getProjectData().settings;
    if(!s) return;
    const bindCheck = (id, k) => { const el=document.getElementById(id); if(el){ el.checked=s[k]; el.onchange=e=>s[k]=e.target.checked; } };
    const bindColor = (id, k) => { const el=document.getElementById(id); if(el){ el.value=s[k]; el.oninput=e=>s[k]=e.target.value; } };
    const bindRange = (id, lId, k) => { const el=document.getElementById(id), l=document.getElementById(lId); if(el){ el.value=s[k]; l.textContent=s[k]+'%'; el.oninput=e=>{s[k]=parseInt(e.target.value); l.textContent=s[k]+'%';}; } };
    const bindNum = (id, k) => { const el=document.getElementById(id); if(el){ el.value=s[k]; el.onchange=e=>s[k]=parseInt(e.target.value)||0; } };
    const setupImg = (btnId, prevId, clearId, k) => {
        const btn=document.getElementById(btnId), prev=document.getElementById(prevId), clr=document.getElementById(clearId);
        if(!btn) return;
        const up = () => { 
            if(s[k]) { prev.style.backgroundImage=`url(${s[k]})`; prev.textContent=''; clr.style.display='inline-block'; }
            else { prev.style.backgroundImage='none'; prev.textContent='なし'; clr.style.display='none'; }
        };
        up();
        const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.style.display='none'; document.body.appendChild(inp);
        btn.onclick=()=>inp.click();
        inp.onchange=e=>{ const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onload=evt=>{s[k]=evt.target.result; up();}; r.readAsDataURL(f); inp.value=''; } };
        clr.onclick=()=>{ s[k]=null; up(); };
    };
    bindCheck('ui-window-bg-transparent', 'windowBgTransparent'); bindColor('ui-window-color', 'windowColor'); bindRange('ui-window-opacity', 'ui-window-opacity-label', 'windowOpacity');
    setupImg('ui-window-image-btn', 'ui-window-image-preview', 'ui-window-image-clear', 'windowImage');
    bindCheck('ui-button-bg-transparent', 'buttonBgTransparent'); bindColor('ui-button-color', 'buttonColor'); bindRange('ui-button-opacity', 'ui-button-opacity-label', 'buttonOpacity');
    setupImg('ui-button-image-btn', 'ui-button-image-preview', 'ui-button-image-clear', 'buttonImage');
    bindNum('ui-border-radius', 'borderRadius'); bindNum('ui-border-width', 'borderWidth'); bindColor('ui-border-color', 'borderColor');
     bindColor('ui-button-text-color', 'buttonTextColor');
}

export function initUi() { renderAll(); initHelpSystem(); initUISettings(); }
