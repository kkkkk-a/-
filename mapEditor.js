// mapEditor.js (Fixed: Instant Dropdown Update)

import * as state from './state.js';
import { createLinkedSelects, populateAssetSelect, updateAllNodeSelects } from './ui.js';

// エディタの状態
let currentMapId = null;
let currentTool = 'pointer'; 
let ctx = null;
let canvas = null;
let isDrawing = false;
let selectedObject = null;
const imageCache = {};

// 描画設定
let penSettings = {
    visualType: 'color', color: '#888888', opacity: 1.0, charId: '',
    isWall: true, effectType: 'none', 
    moveType: 'fixed', moveSpeed: 2, moveRange: 3,
    hasEvent: false, eventTrigger: 'touch', eventRepeat: 'once', eventList: [{ nodeId: '' }],
    condition: { variable: '', operator: '==', value: '' },
    isSpawn: false, spawnId: ''
};
const GRID_SIZE = 32;

export function refreshMapEditorUI() {
    // 現在マップが選択されている場合のみ、UIを再描画する
    if (currentMapId) {
        loadMap(currentMapId);
    }
}

export function initMapEditor() {
    canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    document.getElementById('create-map-btn').addEventListener('click', createNewMap);
    document.getElementById('map-list-select').addEventListener('change', (e) => { if (e.target.value) { loadMap(e.target.value); } else { currentMapId = null; toggleEditorVisibility(false); } });
    document.getElementById('map-settings-form').addEventListener('change', updateMapSettings);
    document.querySelectorAll('.map-tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.map-tool-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTool = e.target.dataset.tool;
            if (currentTool !== 'pointer') { selectedObject = null; updateFormFromData(penSettings); drawMap(); }
        });
    });

    canvas.addEventListener('mousedown', handleCanvasDown);
    canvas.addEventListener('mousemove', handleCanvasMove);
    canvas.addEventListener('mouseup', handleCanvasUp);
    canvas.addEventListener('mouseleave', handleCanvasUp);
    
    const objForm = document.getElementById('obj-settings-form');
    ['change', 'input'].forEach(evtType => {
        objForm.addEventListener(evtType, (e) => {
            if(e.target.id === 'add-event-step-btn' || e.target.classList.contains('del-event-step-btn')) return;
            syncDataFromForm();
        });
    });

    // SpawnID変更時にUI（シナリオエディタのセレクトボックス）も更新する
    document.getElementById('obj-spawn-id').addEventListener('change', () => {
         updateAllNodeSelects();
    });

    document.getElementById('add-event-step-btn').addEventListener('click', () => {
        const target = selectedObject || penSettings; if (!target.eventList) target.eventList = [];
        target.eventList.push({ nodeId: '' }); renderEventList(target.eventList);
    });
    document.getElementById('obj-event-list-container').addEventListener('click', (e) => {
        if (e.target.classList.contains('del-event-step-btn')) {
            const index = parseInt(e.target.dataset.index);
            const target = selectedObject || penSettings;
            if (target.eventList && target.eventList.length > 1) { target.eventList.splice(index, 1); renderEventList(target.eventList); syncDataFromForm(); }
        }
    });

    renderMapList();
    toggleEditorVisibility(false);
}

export function resetMapEditor() { currentMapId = null; selectedObject = null; renderMapList(); toggleEditorVisibility(false); }
export function toggleEditorVisibility(show) {
    const ui = document.getElementById('map-editor-ui'); const canvasEl = document.getElementById('map-canvas'); const placeholder = document.getElementById('map-placeholder');
    if (show) { ui.classList.remove('hidden'); canvasEl.classList.remove('hidden'); placeholder.classList.add('hidden'); }
    else { ui.classList.add('hidden'); canvasEl.classList.add('hidden'); placeholder.classList.remove('hidden'); }
}

function createNewMap() {
    const name = prompt("マップ名:", "新規マップ"); if (!name) return;
    const id = `map_${Date.now()}`;
    state.getProjectData().maps[id] = { name: name, type: 'topdown', width: 20, height: 15, bgImageId: '', scrollDir: 'none', scrollSpeed: 1, objects: [] };
    
    renderMapList(); 
    document.getElementById('map-list-select').value = id; 
    loadMap(id);

    // ★追加: マップ作成直後にシナリオエディタ側のプルダウンも更新する
    updateAllNodeSelects();
}

export function renderMapList() {
    const select = document.getElementById('map-list-select'); if (!select) return; const currentVal = select.value;
    select.innerHTML = '<option value="">-- マップ選択 --</option>'; const maps = state.getProjectData().maps;
    if (maps) { for (const id in maps) { select.add(new Option(maps[id].name, id)); } }
    if(maps && maps[currentVal]) { select.value = currentVal; }
}

function loadMap(id) {
    if (!id) return; 
    currentMapId = id; 
    const map = state.getProjectData().maps[id];
    
    toggleEditorVisibility(true);
    document.getElementById('map-name').value = map.name; 
    document.getElementById('map-type').value = map.type;
    document.getElementById('map-width').value = map.width; 
    document.getElementById('map-height').value = map.height;
    
    const bgSelect = document.getElementById('map-bg-select'); 
    populateAssetSelect(bgSelect, 'backgrounds', 'なし'); 
    bgSelect.value = map.bgImageId || '';
    
    document.getElementById('map-scroll-dir').value = map.scrollDir || 'none'; 
    document.getElementById('map-scroll-speed').value = map.scrollSpeed || 1;

    // ★追加: クラッシュイベント用プルダウンの生成
    const crushContainer = document.getElementById('map-crush-event-select');
    if (crushContainer) {
        createLinkedSelects(crushContainer, 'map-crush-event-node-id', map.crushEventNodeId || '');
    }
    
    canvas.width = map.width * GRID_SIZE; 
    canvas.height = map.height * GRID_SIZE;
    selectedObject = null; 
    updateFormFromData(penSettings); 
    drawMap();
}

function updateMapSettings(e) {
    if (!currentMapId) return; 
    const map = state.getProjectData().maps[currentMapId];
    
    map.name = document.getElementById('map-name').value; 
    map.type = document.getElementById('map-type').value;
    map.width = parseInt(document.getElementById('map-width').value); 
    map.height = parseInt(document.getElementById('map-height').value);
    map.bgImageId = document.getElementById('map-bg-select').value;
    map.scrollDir = document.getElementById('map-scroll-dir').value; 
    map.scrollSpeed = parseInt(document.getElementById('map-scroll-speed').value) || 1;
    
    // ★追加: クラッシュイベントIDの保存
    const crushNodeSelect = document.getElementById('map-crush-event-node-id');
    if (crushNodeSelect) {
        map.crushEventNodeId = crushNodeSelect.value;
    }

    canvas.width = map.width * GRID_SIZE; 
    canvas.height = map.height * GRID_SIZE;
    drawMap(); 
    
    if(e.target.id === 'map-name') {
        renderMapList();
        updateAllNodeSelects();
    }
}

function renderEventList(list) {
    const container = document.getElementById('obj-event-list-container'); container.innerHTML = '';
    list.forEach((item, index) => {
        const row = document.createElement('div'); row.style.display='flex'; row.style.alignItems='center'; row.style.marginBottom='5px'; row.style.gap='5px';
        const label = document.createElement('span'); label.textContent = `${index + 1}:`; label.style.fontSize='0.8em';
        const selectDiv = document.createElement('div'); selectDiv.className = 'smart-select-mini'; selectDiv.style.flex = '1';
        createLinkedSelects(selectDiv, `temp-event-list-${index}`, item.nodeId);
        selectDiv.addEventListener('change', () => { const nodeSelect = document.getElementById(`temp-event-list-${index}`); if (nodeSelect) { item.nodeId = nodeSelect.value; syncDataFromForm(); } });
        const delBtn = document.createElement('button'); delBtn.textContent='×'; delBtn.className='danger-button del-event-step-btn'; delBtn.dataset.index = index; delBtn.style.padding='2px 6px';
        row.append(label, selectDiv, delBtn); container.appendChild(row);
    });
}

function updateFormFromData(data) {
    const visualType = data.visualType || 'color'; document.getElementById('obj-visual-type').value = visualType;
    document.getElementById('obj-visual-color-group').style.display = (visualType === 'color') ? 'block' : 'none';
    document.getElementById('obj-visual-image-group').style.display = (visualType === 'image') ? 'block' : 'none';
    document.getElementById('obj-color').value = data.color || '#888888';
    document.getElementById('obj-opacity').value = Math.round((data.opacity !== undefined ? data.opacity : 1.0) * 100);
    const charSelect = document.getElementById('obj-char-select'); populateAssetSelect(charSelect, 'characters', 'なし'); charSelect.value = data.charId || '';
    document.getElementById('obj-img-opacity').value = Math.round((data.opacity !== undefined ? data.opacity : 1.0) * 100);
    const cond = data.condition || { variable: '', operator: '==', value: '' };
    document.getElementById('obj-cond-var').value = cond.variable || ''; document.getElementById('obj-cond-op').value = cond.operator || '=='; document.getElementById('obj-cond-val').value = cond.value || '';
    document.getElementById('obj-is-wall').checked = !!data.isWall; document.getElementById('obj-effect-type').value = data.effectType || 'none';
    const moveType = data.moveType || 'fixed'; document.getElementById('obj-move-type').value = moveType;
    document.getElementById('obj-move-details').style.display = (moveType !== 'fixed') ? 'block' : 'none';
    document.getElementById('obj-move-speed').value = data.moveSpeed || 2; document.getElementById('obj-move-range').value = data.moveRange || 3;
    document.getElementById('obj-has-event').checked = !!data.hasEvent; document.getElementById('obj-event-details').style.display = data.hasEvent ? 'block' : 'none';
    document.getElementById('obj-event-trigger').value = data.eventTrigger || 'touch'; document.getElementById('obj-event-repeat').value = data.eventRepeat || 'once';
    if (!data.eventList || data.eventList.length === 0) { data.eventList = [{ nodeId: data.eventNodeId || '' }]; }
    renderEventList(data.eventList);
    document.getElementById('obj-is-spawn').checked = !!data.isSpawn; document.getElementById('obj-spawn-details').style.display = data.isSpawn ? 'block' : 'none';
    document.getElementById('obj-spawn-id').value = data.spawnId || '';
}

function syncDataFromForm() {
    const target = selectedObject || penSettings;
    target.visualType = document.getElementById('obj-visual-type').value;
    document.getElementById('obj-visual-color-group').style.display = (target.visualType === 'color') ? 'block' : 'none';
    document.getElementById('obj-visual-image-group').style.display = (target.visualType === 'image') ? 'block' : 'none';
    if (target.visualType === 'color') { target.color = document.getElementById('obj-color').value; target.opacity = parseInt(document.getElementById('obj-opacity').value) / 100; }
    else { target.charId = document.getElementById('obj-char-select').value; target.opacity = parseInt(document.getElementById('obj-img-opacity').value) / 100; }
    target.condition = { variable: document.getElementById('obj-cond-var').value, operator: document.getElementById('obj-cond-op').value, value: document.getElementById('obj-cond-val').value };
    target.isWall = document.getElementById('obj-is-wall').checked; target.effectType = document.getElementById('obj-effect-type').value;
    target.moveType = document.getElementById('obj-move-type').value;
    document.getElementById('obj-move-details').style.display = (target.moveType !== 'fixed') ? 'block' : 'none';
    if(target.moveType !== 'fixed') { target.moveSpeed = parseFloat(document.getElementById('obj-move-speed').value); target.moveRange = parseFloat(document.getElementById('obj-move-range').value); }
    target.hasEvent = document.getElementById('obj-has-event').checked;
    document.getElementById('obj-event-details').style.display = target.hasEvent ? 'block' : 'none';
    if (target.hasEvent) { target.eventTrigger = document.getElementById('obj-event-trigger').value; target.eventRepeat = document.getElementById('obj-event-repeat').value; }
    target.isSpawn = document.getElementById('obj-is-spawn').checked;
    document.getElementById('obj-spawn-details').style.display = target.isSpawn ? 'block' : 'none';
    if (target.isSpawn) { target.spawnId = document.getElementById('obj-spawn-id').value; }
    drawMap();
}

function drawMap() {
    if (!currentMapId) return; 
    const projectData = state.getProjectData(); 
    const map = projectData.maps[currentMapId];
    
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    ctx.fillStyle = '#fff'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 背景描画処理
    if (map.bgImageId && projectData.assets.backgrounds[map.bgImageId]) {
        const asset = projectData.assets.backgrounds[map.bgImageId];
        
        // ★修正: データが動画か画像かで処理を分ける
        if (asset.data.startsWith('data:video')) {
            // 動画の場合：エディタ上では黒背景＋テキスト表示にしてエラーを回避
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#fff';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("🎬 動画背景 (編集中はプレビュー不可)", canvas.width / 2, canvas.height / 2);
            
            // 描画設定を戻す
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
        } else {
            // 画像の場合：通常通り描画
            let img = imageCache[map.bgImageId]; 
            if (!img) { 
                img = new Image(); 
                img.src = asset.data; 
                imageCache[map.bgImageId] = img; 
            }
            // 読み込み完了チェックを追加
            if (img.complete && img.naturalWidth !== 0) { 
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height); 
            }
        }
    }
    
    // グリッド描画
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; 
    ctx.lineWidth = 1;
    for (let x = 0; x <= map.width; x++) { ctx.beginPath(); ctx.moveTo(x * GRID_SIZE, 0); ctx.lineTo(x * GRID_SIZE, canvas.height); ctx.stroke(); }
    for (let y = 0; y <= map.height; y++) { ctx.beginPath(); ctx.moveTo(0, y * GRID_SIZE); ctx.lineTo(canvas.width, y * GRID_SIZE); ctx.stroke(); }
    
    // オブジェクト描画
    map.objects.forEach(obj => {
        const gx = obj.x * GRID_SIZE; const gy = obj.y * GRID_SIZE;
        ctx.save(); ctx.globalAlpha = obj.opacity !== undefined ? obj.opacity : 1.0;
        if (obj.visualType === 'image') {
            if (obj.charId && projectData.assets.characters[obj.charId]) {
                const asset = projectData.assets.characters[obj.charId];
                let img = imageCache[obj.charId]; 
                if (!img) { img = new Image(); img.src = asset.data; imageCache[obj.charId] = img; }
                
                // ここも読み込みチェックを追加
                if(img.complete && img.naturalWidth !== 0) {
                    // スプライトシート対応: 最初の1コマだけ表示
                    const cols = asset.cols || 1;
                    const rows = asset.rows || 1;
                    const srcW = img.width / cols;
                    const srcH = img.height / rows;
                    
                    ctx.drawImage(img, 
                        0, 0, srcW, srcH, // ソース: 左上の1コマ
                        gx, gy, GRID_SIZE, GRID_SIZE // 描画先
                    );
                } else {
                    // 読み込み中は枠線のみ
                    ctx.strokeStyle='#ccc'; ctx.strokeRect(gx+2,gy+2,GRID_SIZE-4,GRID_SIZE-4);
                }
            } else { 
                ctx.strokeStyle='#ccc'; ctx.strokeRect(gx+2,gy+2,GRID_SIZE-4,GRID_SIZE-4); ctx.fillStyle='#666'; ctx.fillText("IMG",gx+10,gy+20); 
            }
        } else { 
            ctx.fillStyle = obj.color || '#888888'; ctx.fillRect(gx, gy, GRID_SIZE, GRID_SIZE); 
        }
        ctx.restore();
        
        if (obj.isWall) { ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=2; ctx.strokeRect(gx, gy, GRID_SIZE, GRID_SIZE); }
        else { ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=1; ctx.setLineDash([2,2]); ctx.strokeRect(gx, gy, GRID_SIZE, GRID_SIZE); ctx.setLineDash([]); }
        
        if (obj.effectType === 'ladder') { ctx.fillStyle='#fff'; ctx.fillText('H', gx+12, gy+20); }
        if (obj.effectType === 'jump') { ctx.fillStyle='#f0f'; ctx.fillText('J', gx+12, gy+20); }
        if (obj.moveType && obj.moveType !== 'fixed') { ctx.fillStyle='#000'; ctx.fillText('M', gx+12, gy+12); }
        if (obj.isSpawn) { ctx.fillStyle='#00ff00'; ctx.beginPath(); ctx.arc(gx+5, gy+5, 3, 0, Math.PI*2); ctx.fill(); }
        if (obj.hasEvent) { ctx.fillStyle='#0000ff'; ctx.beginPath(); ctx.arc(gx+GRID_SIZE-5, gy+5, 3, 0, Math.PI*2); ctx.fill(); }
        if (obj === selectedObject) { ctx.strokeStyle='red'; ctx.lineWidth=2; ctx.setLineDash([]); ctx.strokeRect(gx, gy, GRID_SIZE, GRID_SIZE); }
    });
}

function getGridPos(e) { const rect = canvas.getBoundingClientRect(); return { x: Math.floor((e.clientX - rect.left) / GRID_SIZE), y: Math.floor((e.clientY - rect.top) / GRID_SIZE) }; }
function handleCanvasDown(e) {
    if (!currentMapId) return; const { x, y } = getGridPos(e); const map = state.getProjectData().maps[currentMapId];
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) return;
    isDrawing = true;
    if (currentTool === 'pointer') {
        let found = null; for (let i = map.objects.length - 1; i >= 0; i--) { if (map.objects[i].x === x && map.objects[i].y === y) { found = map.objects[i]; break; } }
        selectedObject = found; if (selectedObject) updateFormFromData(selectedObject); else updateFormFromData(penSettings); drawMap();
    } else if (currentTool === 'pen') {
        const idx = map.objects.findIndex(o => o.x === x && o.y === y); if (idx !== -1) map.objects.splice(idx, 1);
        const newObj = JSON.parse(JSON.stringify(penSettings)); newObj.id = `obj_${Date.now()}_${Math.random()}`; newObj.x = x; newObj.y = y;
        map.objects.push(newObj); drawMap();
    } else if (currentTool === 'erase') {
        const idx = map.objects.findIndex(o => o.x === x && o.y === y); if (idx !== -1) { map.objects.splice(idx, 1); if (selectedObject && selectedObject.x === x && selectedObject.y === y) { selectedObject = null; updateFormFromData(penSettings); } drawMap(); }
    }
}
function handleCanvasMove(e) {
    if (!isDrawing || !currentMapId) return; const { x, y } = getGridPos(e); const map = state.getProjectData().maps[currentMapId];
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) return;
    if (currentTool === 'pen') {
        const isDuplicate = map.objects.some(o => o.x === x && o.y === y);
        if (!isDuplicate) { const newObj = JSON.parse(JSON.stringify(penSettings)); newObj.id = `obj_${Date.now()}_${Math.random()}`; newObj.x = x; newObj.y = y; map.objects.push(newObj); drawMap(); }
    } else if (currentTool === 'erase') {
        const idx = map.objects.findIndex(o => o.x === x && o.y === y); if (idx !== -1) { map.objects.splice(idx, 1); drawMap(); }
    }
}
function handleCanvasUp() { isDrawing = false; }
