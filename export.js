// export.js

import { getProjectData } from './state.js';

export function generateGameHtml(data, startNodeOverride = null) {
    const dataString = JSON.stringify(data);
    const initialNodeId = startNodeOverride || data.scenario.startNodeId;

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Novel Game</title>
    <style>
        body { margin: 0; font-family: sans-serif; background-color: #000; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
        p{
        margin:0;}
        #game-container { position: relative; width: 800px; height: 600px; max-width: 100%; max-height: 100vh; overflow: hidden; background-color: #000; box-shadow: 0 0 20px rgba(255, 255, 255, 0.2); }
        
        /* アニメーション用レイヤー設定 */
        .layer { 
            position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
            transition: opacity 0.5s ease-in-out; 
            background-size: cover; /* 静止画用デフォルト */
            background-position: center; 
            background-repeat: no-repeat;
        }
        
        #character-layer {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            display: flex; justify-content: center; align-items: flex-end;
            transition: opacity 0.5s ease-in-out; pointer-events: none;
            padding: 0 5%; box-sizing: border-box;
        }
        #character-layer.pos-left { justify-content: flex-start; }
        #character-layer.pos-right { justify-content: flex-end; }
        #character-layer.pos-center { justify-content: center; }

        /* キャラクターアニメーション用コンテナ */
        .sprite-char {
            width: 100%; height: 95%; /* 親に合わせる */
            background-repeat: no-repeat;
            background-position: center bottom;
            background-size: contain; /* 静止画用デフォルト */
            image-rendering: pixelated; /* ドット絵用 */
        }

        #text-box { position: absolute; bottom: 4%; left: 5%; width: 90%; height: 30%; background: rgba(0, 0, 0, 0.75); color: #fff; border-radius: 10px; padding: 20px; box-sizing: border-box; cursor: pointer; border: 1px solid #444; backdrop-filter: blur(2px); user-select: none; }
        #character-name { font-size: 1.4em; font-weight: 700; margin: 0 0 10px; padding-bottom: 5px; border-bottom: 1px solid #777; color: #f1c40f; min-height: 1em; }
        #message { font-size: 1.2em; line-height: 1.6; height: calc(100% - 40px); overflow-y: auto; }
                #message .ql-size-small { font-size: 0.8em !important; line-height: 1.5; }
        #message .ql-size-large { font-size: 1.4em !important; line-height: 1.6; }
        #message .ql-size-huge { font-size: 1.8em !important; line-height: 1.4; }
        /* Quillのデフォルトサイズ（おそらく span なし、または特定のクラス）への対応も必要かもしれませんが、とりあえず大きいものから対応 */
                #message strong, #message b { font-weight: bold; }
        #message em { font-style: italic; }
        #message u { text-decoration: underline; }
        #message span[style*="color"] { /* Quillのカラー設定をキャッチ */ }
        
        #choices-box { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; gap: 15px; z-index: 10; width: 80%; max-height: 80%; overflow-y: auto; }
        .choice-button { padding: 15px 30px; font-size: 1.2em; cursor: pointer; background: rgba(25, 144, 255, 0.8); color: #fff; border: 2px solid #fff; border-radius: 10px; text-align: center; transition: all 0.3s; backdrop-filter: blur(5px); }
        .choice-button:hover { background-color: rgba(60, 170, 255, 1); transform: scale(1.02); }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
    </style>
</head>
<body>
    <div id="game-container">
        <div id="background-layer-1" class="layer"></div>
        <div id="background-layer-2" class="layer" style="opacity:0;"></div>
        <div id="character-layer" class="layer">
            <!-- キャラクター表示用DIV (imgタグから変更) -->
            <div id="char-sprite" class="sprite-char"></div>
        </div>
        <div id="text-box"><div id="character-name"></div><div id="message"></div></div>
        <div id="choices-box"></div>
    </div>

    <script>
        console.log('--- EXPORTED GAME JS START ---');
        const gameData = ${dataString};
        let gameState = { ...gameData.variables };
        let currentNodeId = "${initialNodeId}";
        let isWaitingForInput = true;
        let currentBgmAudio = null;
        let currentBgmId = null;
        let queuedSound = null;
        let hasInteracted = false;
        
        // ★★★ 修正点: lastTimeの初期化 ★★★
        let lastTime = performance.now(); 
        
        // アニメーション管理用オブジェクト
        const animState = {
            bg: { id: null, frame: 0, timer: 0, element: null },
            chara: { id: null, frame: 0, timer: 0, element: null }
        };

        const bg1 = document.getElementById('background-layer-1');
        const bg2 = document.getElementById('background-layer-2');
        let activeBg = 1;
        const charaLayer = document.getElementById('character-layer');
        const charSprite = document.getElementById('char-sprite');
        const nameEl = document.getElementById('character-name');
        const msgEl = document.getElementById('message');
        const choicesBox = document.getElementById('choices-box');
        const textBox = document.getElementById('text-box');

        // ★★★ 変数置換ロジック ★★★
        function replaceVariablesInText(content) {
            let result = content;
            
            for (const key in gameState) {
                // マーカー {{key}} を検索する正規表現
                const regex = new RegExp('\\{\\{' + key + '\\}\\}', 'g'); 
                const replacement = gameState[key];
                result = result.replace(regex, replacement);
            }
            return result;
        }

        // ★★★ アニメーション処理関連 (簡略化) ★★★
        function updateSpriteAnimation(target, dt) {
            if (!target.id || !target.element) return;
            const assetType = (target.element === charSprite) ? 'characters' : 'backgrounds';
            const asset = gameData.assets[assetType][target.id];
            if (!asset) return;

            if ((asset.cols || 1) <= 1 && (asset.rows || 1) <= 1) return;

            const fps = asset.fps || 12;
            const interval = 1000 / fps;
            
            target.timer += dt;
            if (target.timer >= interval) {
                target.timer = 0;
                target.frame++;
                
                const totalFrames = (asset.cols || 1) * (asset.rows || 1);
                
                if (target.frame >= totalFrames) {
                    target.frame = (asset.loop !== false) ? 0 : totalFrames - 1;
                }
                
                // applySpriteFrameのロジックをインライン化
                const cols = asset.cols || 1;
                const rows = asset.rows || 1;
                target.element.style.backgroundSize = \`\${cols * 100}% \${rows * 100}%\`;
                const col = target.frame % cols;
                const row = Math.floor(target.frame / cols);
                // 以前のコードのNaNチェックは不要なため削除または簡略化
                const x = col * (100 / (cols - 1 || 1));
                const y = row * (100 / (rows - 1 || 1));
                target.element.style.backgroundPosition = \`\${x}% \${y}%\`;
            }
        }
        
        function gameLoop(timestamp) {
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;

            updateSpriteAnimation(animState.bg, deltaTime);
            updateSpriteAnimation(animState.chara, deltaTime);

            requestAnimationFrame(gameLoop);
        }
        // lastTimeの初期化をしたので、ここでアニメーションループを開始
        requestAnimationFrame(gameLoop);
        
        function userInteraction() {
            if (hasInteracted) return;
            hasInteracted = true;
            if (queuedSound) { queuedSound.play().catch(e => console.error(e)); queuedSound = null; }
            if (currentBgmAudio && currentBgmAudio.paused) { currentBgmAudio.play().catch(e => console.error(e)); }
        }
        
        function findNode(nodeId) {
            for (const secId in gameData.scenario.sections) {
                if (gameData.scenario.sections[secId].nodes[nodeId]) return gameData.scenario.sections[secId].nodes[nodeId];
            }
            return null;
        }

        function resolveValue(value) {
            if (typeof value !== 'string') return value;
            if (value.match(/^\\d+d\\d+(\\+\\d+)?$/)) {
                const parts = value.split('+');
                const bonus = parts.length > 1 ? parseInt(parts[1], 10) : 0;
                const [numDice, numFaces] = parts[0].split('d').map(n => parseInt(n, 10));
                let total = 0;
                for (let i = 0; i < numDice; i++) total += Math.floor(Math.random() * numFaces) + 1;
                return total + bonus;
            }
            if (!isNaN(value) && value.trim() !== '') return Number(value);
            if (gameState.hasOwnProperty(value)) {
                const val = gameState[value];
                return !isNaN(val) ? Number(val) : val;
            }
            return value;
        }

        function evaluateCondition(cond) {
            let left = gameState[cond.variable];
            if (left === undefined) left = 0;
            let right = resolveValue(cond.compareValue);
            if (!isNaN(left) && !isNaN(right)) { left = Number(left); right = Number(right); }
            switch(cond.operator) {
                case '==': return left == right;
                case '!=': return left != right;
                case '>': return left > right;
                case '<': return left < right;
                case '>=': return left >= right;
                case '<=': return left <= right;
                default: return false;
            }
        }

        function processNode(nodeId) {
            if (!nodeId) { isWaitingForInput = false; textBox.style.cursor = 'default'; return; }
            const node = findNode(nodeId);
            if (!node) { console.error('Node not found:', nodeId); return; }
            
            isWaitingForInput = false;
            textBox.style.cursor = 'pointer';
            console.log('Processing Node ID:', nodeId, 'Type:', node.type);

            switch(node.type) {
                case 'text':
                    // 背景/キャラ/音響処理（簡略化・省略）
                    if (node.backgroundId && gameData.assets.backgrounds[node.backgroundId]) {
                        const asset = gameData.assets.backgrounds[node.backgroundId];
                        const targetBg = (activeBg === 1) ? bg2 : bg1;
                        // 背景の切り替えロジックを修正
                        if (!targetBg.style.backgroundImage.includes(asset.data)) {
                            targetBg.style.backgroundImage = \`url(\${asset.data})\`;
                            document.getElementById((activeBg === 1) ? 'background-layer-1' : 'background-layer-2').style.opacity = 0;
                            targetBg.style.opacity = 1;
                            activeBg = (activeBg === 1) ? 2 : 1;
                            animState.bg.id = node.backgroundId; animState.bg.frame = 0; animState.bg.timer = 0; animState.bg.element = targetBg;
                            if((asset.cols||1)===1 && (asset.rows||1)===1) targetBg.style.backgroundSize = 'cover';
                        }
                    }
                    if (node.characterId && gameData.assets.characters[node.characterId]) {
                        const asset = gameData.assets.characters[node.characterId];
                        charSprite.style.backgroundImage = \`url(\${asset.data})\`;
                        if(animState.chara.id !== node.characterId) {
                            animState.chara.id = node.characterId; animState.chara.frame = 0; animState.chara.timer = 0; animState.chara.element = charSprite;
                        }
                        if((asset.cols||1)===1 && (asset.rows||1)===1) charSprite.style.backgroundSize = 'contain';
                        nameEl.textContent = asset.name; nameEl.style.display = 'block'; charaLayer.style.opacity = 1;
                        charaLayer.className = 'layer pos-' + (node.characterPosition || 'center');
                    } else {
                        nameEl.style.display = 'none'; charaLayer.style.opacity = 0; animState.chara.id = null;
                    }
                    if (node.bgmId) {
                        if (node.bgmId === 'stop') { if (currentBgmAudio) currentBgmAudio.pause(); currentBgmAudio = null; currentBgmId = null; }
                        else if (node.bgmId !== currentBgmId && gameData.assets.sounds[node.bgmId]) {
                            if (currentBgmAudio) currentBgmAudio.pause();
                            const bgm = gameData.assets.sounds[node.bgmId];
                            currentBgmAudio = new Audio(bgm.data); currentBgmAudio.loop = true; currentBgmId = node.bgmId;
                            if (hasInteracted) currentBgmAudio.play().catch(e => console.error(e));
                        }
                    }
                    if (node.soundId && gameData.assets.sounds[node.soundId]) {
                        const audio = new Audio(gameData.assets.sounds[node.soundId].data);
                        if(hasInteracted) audio.play().catch(e=>{}); else queuedSound = audio;
                    }
                    
                    choicesBox.innerHTML = '';
                    currentNodeId = node.nextNodeId;
                    isWaitingForInput = true;
                    break;

                case 'choice':
                    msgEl.innerHTML = ''; choicesBox.innerHTML = ''; nameEl.style.display = 'none';
                    node.choices.forEach(choice => {
                        const btn = document.createElement('div');
                        btn.className = 'choice-button';
                        // 選択肢テキストの変数置換を実行
                        btn.textContent = replaceVariablesInText(choice.text);
                        btn.onclick = (e) => { e.stopPropagation(); userInteraction(); currentNodeId = choice.nextNodeId; processNode(currentNodeId); };
                        choicesBox.appendChild(btn);
                    });
                    break;

                case 'variable':
                    const targetVar = node.targetVariable;
                    const val = resolveValue(node.value);
                    if (gameState[targetVar] === undefined) gameState[targetVar] = 0;
                    const currentVal = !isNaN(gameState[targetVar]) ? Number(gameState[targetVar]) : gameState[targetVar];
                    const operateVal = !isNaN(val) ? Number(val) : val;
                    switch(node.operator) {
                        case '=': gameState[targetVar] = operateVal; break;
                        case '+=': gameState[targetVar] = currentVal + operateVal; break;
                        case '-=': gameState[targetVar] = currentVal - operateVal; break;
                        case '*=': gameState[targetVar] = currentVal * operateVal; break;
                        case '/=': gameState[targetVar] = currentVal / operateVal; break;
                    }
                    currentNodeId = node.nextNodeId;
                    setTimeout(() => processNode(currentNodeId), 0);
                    break;

                case 'conditional':
                    let jumped = false;
                    for(const cond of node.conditions) {
                        if (evaluateCondition(cond)) {
                            currentNodeId = cond.nextNodeId;
                            jumped = true;
                            break;
                        }
                    }
                    if (!jumped) currentNodeId = node.elseNextNodeId;
                    setTimeout(() => processNode(currentNodeId), 0);
                    break;
            }
            
            // ★★★ メッセージの変数置換処理 ★★★
            if (node.type === 'text' && isWaitingForInput) {
                // node.messageはHTMLを含む（scenarioHandlers.jsによる）
                msgEl.innerHTML = replaceVariablesInText(node.message);
            }

        } // processNode の終了


    textBox.addEventListener('click', () => { userInteraction(); if (isWaitingForInput) processNode(currentNodeId); });
    window.onload = () => { if(currentNodeId && currentNodeId !== "null") processNode(currentNodeId); };
    console.log('--- EXPORTED GAME JS END ---');
    // ★★★ 修正点: テンプレートリテラル内でJS終了タグをエスケープ ★★★
    <\/script></body></html>`;
}

export function exportGame() {
    const projectData = getProjectData();
    if (!projectData.scenario.startNodeId) { alert('エラー: 開始ノードが設定されていません。'); return; }
    try {
        const gameHtml = generateGameHtml(projectData);
        const blob = new Blob([gameHtml], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'game.html';
        document.body.appendChild(link); 
        link.click(); 
        document.body.removeChild(link); 
        URL.revokeObjectURL(link.href);
    } catch (error) { 
        console.error("Export Error:", error); 
        alert("書き出しエラーが発生しました。コンソールを確認してください。"); 
    }
}