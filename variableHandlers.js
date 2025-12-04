// variableHandlers.js

import * as state from './state.js';
import * as ui from './ui.js';

function addVariable() {
    const nameInput = document.getElementById('new-variable-name');
    const valueInput = document.getElementById('new-variable-value');
    
    const varName = nameInput.value.trim();
    if (!varName.match(/^[a-zA-Z0-9_]+$/)) {
        alert('変数名は半角英数字とアンダースコア(_)のみ使用できます。');
        return;
    }

    const projectData = state.getProjectData();
    if (projectData.variables.hasOwnProperty(varName)) {
        alert('エラー: 同じ名前の変数がすでに存在します。');
        return;
    }

    const initialValue = valueInput.value.trim() || '0';
    projectData.variables[varName] = initialValue;

    nameInput.value = '';
    valueInput.value = '';
    
    // UIを更新
    ui.renderVariablesList();
    
    // ★修正点: 変数が増えたので、シナリオエディタ側のプルダウンも即座に更新する
    ui.updateVariableSelects();
    // 条件分岐のセレクトボックスも更新するために必要
    ui.renderNodeEditor(); 
}

function updateVariable(varName, newValue) {
    const projectData = state.getProjectData();
    if (projectData.variables.hasOwnProperty(varName)) {
        projectData.variables[varName] = newValue;
    }
}

function deleteVariable(varName) {
    const projectData = state.getProjectData();
    if (projectData.variables.hasOwnProperty(varName)) {
        if (confirm(`変数「${varName}」を本当に削除しますか？\nこの変数を使用している分岐処理なども修正が必要になります。`)) {
            delete projectData.variables[varName];
            
            // UIを更新
            ui.renderVariablesList();
            
            // ★修正点: 変数が減ったので、プルダウンを更新する
            ui.updateVariableSelects();
            ui.renderNodeEditor();
        }
    }
}

export function initVariableHandlers() {
    const variableModeContainer = document.getElementById('mode-variables');
    if (!variableModeContainer) return;

    variableModeContainer.addEventListener('click', e => {
        if (e.target.id === 'add-variable-btn') addVariable();
        if (e.target.matches('.danger-button[data-var-name]')) {
            deleteVariable(e.target.dataset.varName);
        }
    });

    variableModeContainer.addEventListener('change', e => {
        if (e.target.matches('input[type="text"][data-var-name]')) {
            updateVariable(e.target.dataset.varName, e.target.value);
        }
    });
}