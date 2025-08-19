document.addEventListener('DOMContentLoaded', () => {
    // Game Configuration
    const SYMBOLS = {
        'orange': { name: '橘子', payout: 2 },
        'grapes': { name: '葡萄', payout: 5 },
        'bell': { name: '鈴鐺', payout: 10 },
        'watermelon': { name: '西瓜', payout: 15 },
        'star': { name: '星星', payout: 20 },
        '77': { name: '77', payout: 50 },
        'bar': { name: 'BAR', payout: 100 },
        'luck': { name: 'LUCK', payout: 0 } // Special symbol
    };

    const BOARD_LAYOUT = [
        'orange', 'grapes', 'bell', 'watermelon',
        'luck', null, null, 'star',
        'bar', null, null, '77',
        'orange', 'grapes', 'bell', 'watermelon'
    ];

    const MAX_BET_PER_SYMBOL = 50;

    // DOM Elements
    const playerScoreEl = document.getElementById('player-score');
    const winAmountEl = document.getElementById('win-amount');
    const totalBetEl = document.getElementById('total-bet');
    const gameBoardEl = document.getElementById('game-board');
    const startBtn = document.getElementById('start-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const clearBtn = document.getElementById('clear-btn');
    const autoPlayCheckbox = document.getElementById('auto-play-checkbox');

    // Double Up Panel Elements
    const doubleUpPanel = document.getElementById('double-up-panel');
    const doubleWinAmountEl = document.getElementById('double-win-amount');
    const collectBtn = document.getElementById('collect-btn');
    const doubleHalfBtn = document.getElementById('double-half-btn');
    const doubleAllBtn = document.getElementById('double-all-btn');
    const guessSection = document.getElementById('guess-section');
    const guessBigBtn = document.getElementById('guess-big-btn');
    const guessSmallBtn = document.getElementById('guess-small-btn');


    // Game State
    let playerScore = 1000;
    let bets = {};
    let lastBets = {};
    let totalBet = 0;
    let currentWin = 0;
    let isRunning = false;

    // --- Audio Engine ---
    let audioCtx;
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playSound(type, duration = 0.1) {
        if (!audioCtx) return;
        try {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            let freq = 440;
            switch (type) {
                case 'bet':
                    oscillator.type = 'triangle';
                    freq = 800;
                    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
                    break;
                case 'tick':
                    oscillator.type = 'square';
                    freq = 1200;
                    duration = 0.05;
                    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
                    break;
                case 'win':
                    playSound('tick');
                    setTimeout(() => playSound('tick', 0.05), 120);
                    setTimeout(() => playSound('bet', 0.2), 240);
                    return; 
                case 'lose':
                    oscillator.type = 'sawtooth';
                    freq = 200;
                    duration = 0.2;
                    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + duration);
                    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
                    break;
                case 'collect':
                    playSound('bet', 0.05);
                    setTimeout(() => playSound('tick', 0.08), 100);
                    return;
            }
            oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + duration);
        } catch (e) {
            console.error("Error playing sound:", e);
        }
    }

    // --- Initialization ---
    function init() {
        console.log("Initializing game...");
        createBoard();
        updateDisplay();
        addEventListeners();
        document.body.addEventListener('click', initAudio, { once: true });
    }

    function createBoard() {
        BOARD_LAYOUT.forEach((symbolKey, index) => {
            if (symbolKey) {
                const symbolInfo = SYMBOLS[symbolKey];
                const symbolEl = document.createElement('div');
                symbolEl.classList.add('symbol');
                symbolEl.dataset.symbol = symbolKey;
                symbolEl.id = `symbol-${index}`;

                const nameEl = document.createElement('div');
                nameEl.classList.add('symbol-name');
                nameEl.textContent = symbolInfo.name;

                const payoutEl = document.createElement('div');
                payoutEl.classList.add('symbol-payout');
                payoutEl.textContent = `${symbolInfo.payout}x`;
                if (symbolKey === 'luck') {
                    payoutEl.textContent = '???';
                }

                const betEl = document.createElement('div');
                betEl.classList.add('symbol-bet');
                betEl.id = `bet-${symbolKey}`;
                betEl.textContent = '0';

                symbolEl.appendChild(nameEl);
                symbolEl.appendChild(payoutEl);
                symbolEl.appendChild(betEl);

                const row = Math.floor(index / 4) + 1;
                const col = (index % 4) + 1;
                symbolEl.style.gridArea = `${row} / ${col}`;

                gameBoardEl.appendChild(symbolEl);
            }
        });
    }

    // --- Event Listeners ---
    function addEventListeners() {
        gameBoardEl.addEventListener('click', handleBet);
        startBtn.addEventListener('click', startGame);
        clearBtn.addEventListener('click', clearBets);
        repeatBtn.addEventListener('click', repeatBets);

        collectBtn.addEventListener('click', collectWinnings);
        doubleHalfBtn.addEventListener('click', () => startDoubleUp(false));
        doubleAllBtn.addEventListener('click', () => startDoubleUp(true));
        guessBigBtn.addEventListener('click', () => handleGuess(true));
        guessSmallBtn.addEventListener('click', () => handleGuess(false));
    }

    // --- Game Logic ---
    function handleBet(event) {
        if (isRunning) return;
        const symbolEl = event.target.closest('.symbol');
        if (!symbolEl) return;

        const symbolKey = symbolEl.dataset.symbol;
        let currentBet = bets[symbolKey] || 0;

        if (currentBet < MAX_BET_PER_SYMBOL && (totalBet + 1) <= playerScore) {
            currentBet++;
            bets[symbolKey] = currentBet;
            playSound('bet');
            updateDisplay();
        }
    }

    function startGame() {
        if (isRunning || totalBet === 0 || totalBet > playerScore) return;

        isRunning = true;
        lastBets = { ...bets };
        playerScore -= totalBet;
        currentWin = 0;
        updateDisplay();
        toggleControls(false);

        let lightPosition = 0;
        let currentSpeed = 100;
        const totalRounds = 3 + Math.floor(Math.random() * 2);
        const stopIndex = Math.floor(Math.random() * 12);
        const totalSteps = totalRounds * 12 + stopIndex;
        let step = 0;

        const lightLoop = () => {
            document.querySelectorAll('.symbol.active').forEach(s => s.classList.remove('active'));
            
            const currentBoardIndex = getBoardIndex(lightPosition % 12);
            const currentLightEl = document.getElementById(`symbol-${currentBoardIndex}`);
            if (currentLightEl) currentLightEl.classList.add('active');
            playSound('tick');

            step++;
            lightPosition++;

            if (step >= totalSteps) {
                const finalSymbolKey = BOARD_LAYOUT[currentBoardIndex];
                handleResult(finalSymbolKey);
                return;
            }

            if (step > totalSteps - 12) {
                currentSpeed += 30;
            } else if (step > totalSteps - 24) {
                currentSpeed += 15;
            }

            setTimeout(lightLoop, currentSpeed);
        };

        lightLoop();
    }

    function handleResult(symbolKey) {
        const betOnSymbol = bets[symbolKey] || 0;

        if (betOnSymbol > 0) {
            playSound('win');
            const payout = SYMBOLS[symbolKey].payout;
            currentWin = betOnSymbol * payout;

            if (symbolKey === 'luck') {
                currentWin = totalBet * (Math.floor(Math.random() * 5) + 2);
                alert(`幸運！您獲得了 ${currentWin} 分的隨機獎勵！`);
            }

            playerScore += currentWin;
            updateDisplay();

            if (!autoPlayCheckbox.checked) {
                showDoubleUpPanel();
            } else {
                setTimeout(resetAfterRound, 1000);
            }
        } else {
            playSound('lose');
            setTimeout(resetAfterRound, 500);
        }
    }

    function resetAfterRound() {
        document.querySelectorAll('.win-animation').forEach(el => el.classList.remove('win-animation'));
        const autoPlayEnabled = autoPlayCheckbox.checked;
        const lastBetAmount = Object.values(lastBets).reduce((sum, val) => sum + val, 0);
        
        currentWin = 0;
        bets = {};
        isRunning = false;
        toggleControls(true);

        if (autoPlayEnabled && playerScore >= lastBetAmount && lastBetAmount > 0) {
            bets = { ...lastBets };
            updateDisplay();
            setTimeout(startGame, 1500);
        } else {
            updateDisplay();
        }
    }

    function showDoubleUpPanel() {
        doubleWinAmountEl.textContent = currentWin;
        doubleUpPanel.classList.remove('hidden');
        guessSection.classList.add('hidden');
        doubleHalfBtn.classList.remove('hidden');
        doubleAllBtn.classList.remove('hidden');
    }

    function toggleControls(enabled) {
        startBtn.disabled = !enabled;
        clearBtn.disabled = !enabled;
        repeatBtn.disabled = !enabled;
        gameBoardEl.style.pointerEvents = enabled ? 'auto' : 'none';
    }

    function getBoardIndex(lightIndex) {
        const sequence = [0, 1, 2, 3, 7, 11, 15, 14, 13, 12, 8, 4];
        return sequence[lightIndex];
    }

    // --- Double Up Game Logic ---
    let doubleUpBet = 0;

    function collectWinnings() {
        playSound('collect');
        doubleUpPanel.classList.add('hidden');
        resetAfterRound();
    }

    function startDoubleUp(isAll) {
        doubleUpBet = isAll ? currentWin : Math.floor(currentWin / 2);

        if (doubleUpBet > 0) {
            playSound('bet');
            playerScore -= currentWin;
            currentWin -= doubleUpBet;
            playerScore += currentWin;
            updateDisplay();

            doubleHalfBtn.classList.add('hidden');
            doubleAllBtn.classList.add('hidden');
            guessSection.classList.remove('hidden');
        }
    }

    function handleGuess(isGuessBig) {
        const roll = Math.floor(Math.random() * 12) + 1;
        const isWin = isGuessBig ? (roll >= 7) : (roll <= 6);

        if (isWin) {
            playSound('win');
            doubleUpBet *= 2;
            currentWin = doubleUpBet;
            doubleWinAmountEl.textContent = currentWin;
            alert(`猜對了！數字是 ${roll}。您的獎金變為 ${currentWin}`);
            guessSection.classList.add('hidden');
            doubleHalfBtn.classList.remove('hidden');
            doubleAllBtn.classList.remove('hidden');
        } else {
            playSound('lose');
            alert(`猜錯了！數字是 ${roll}。您失去了 ${doubleUpBet} 分。`);
            doubleUpPanel.classList.add('hidden');
            resetAfterRound();
        }
    }

    function clearBets() {
        if (isRunning) return;
        bets = {};
        updateDisplay();
    }

    function repeatBets() {
        if (isRunning || Object.keys(lastBets).length === 0) return;
        const requiredScore = Object.values(lastBets).reduce((sum, val) => sum + val, 0);

        if (playerScore >= requiredScore) {
            bets = { ...lastBets };
            updateDisplay();
        } else {
            alert("分數不足以重複上一局押注!");
        }
    }

    function updateDisplay() {
        totalBet = Object.values(bets).reduce((sum, val) => sum + val, 0);
        playerScoreEl.textContent = playerScore;
        winAmountEl.textContent = currentWin;
        totalBetEl.textContent = totalBet;

        document.querySelectorAll('.symbol-bet').forEach(el => {
            const key = el.id.replace('bet-', '');
            el.textContent = bets[key] || '0';
        });
    }

    init();
});
