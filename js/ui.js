// ============================================================
// ui.js — DOM Rendering, Animations, and UI Controls
// ============================================================

const UI = {
    // ---- Element References (cached on init) ----
    els: {},

    init() {
        this.els = {
            startScreen: document.getElementById('start-screen'),
            gameScreen: document.getElementById('game-screen'),
            difficultyBtns: document.querySelectorAll('.difficulty-btn'),
            modeBtns: document.querySelectorAll('.mode-btn'),
            startBtn: document.getElementById('start-btn'),
            menuChips: document.getElementById('menu-chips'),
            menuMaxChips: document.getElementById('menu-max-chips'),
            menuGamesPlayed: document.getElementById('menu-games-played'),

            botsContainer: document.getElementById('bots-container'),
            communityCards: document.getElementById('community-cards'),
            potDisplay: document.getElementById('pot-amount'),
            phaseDisplay: document.getElementById('phase-display'),

            playerCards: document.getElementById('player-cards'),
            playerChips: document.getElementById('player-chips'),
            playerName: document.getElementById('player-name'),
            playerBetDisplay: document.getElementById('player-bet'),

            actionButtons: document.getElementById('action-buttons'),
            btnFold: document.getElementById('btn-fold'),
            btnCheck: document.getElementById('btn-check'),
            btnCall: document.getElementById('btn-call'),
            btnRaise: document.getElementById('btn-raise'),
            btnAllin: document.getElementById('btn-allin'),

            raiseControls: document.getElementById('raise-controls'),
            raiseSlider: document.getElementById('raise-slider'),
            raiseAmount: document.getElementById('raise-amount'),
            raiseConfirm: document.getElementById('raise-confirm'),
            raiseCancel: document.getElementById('raise-cancel'),
            quickX2: document.getElementById('quick-x2'),
            quickHalf: document.getElementById('quick-half'),
            quickPot: document.getElementById('quick-pot'),
            quickAllin: document.getElementById('quick-allin'),

            timerBar: document.getElementById('timer-bar'),
            lastActionDisplay: document.getElementById('last-action'),

            resultOverlay: document.getElementById('result-overlay'),
            resultTitle: document.getElementById('result-title'),
            resultHand: document.getElementById('result-hand'),
            resultAmount: document.getElementById('result-amount'),
            resultNextBtn: document.getElementById('result-next'),
            resultLeaveBtn: document.getElementById('result-leave')
        };
    },

    // ---- Screen Management ----
    showStartScreen() {
        this.els.startScreen.classList.remove('hidden');
        this.els.gameScreen.classList.add('hidden');
        this.els.resultOverlay.classList.add('hidden');
        this.updateMenuStats();
    },

    showGameScreen() {
        this.els.startScreen.classList.add('hidden');
        this.els.gameScreen.classList.remove('hidden');
    },

    updateMenuStats() {
        if (this.els.menuChips) this.els.menuChips.textContent = '1,000';
        if (this.els.menuMaxChips) this.els.menuMaxChips.textContent = '1,000';
        if (this.els.menuGamesPlayed) this.els.menuGamesPlayed.textContent = '0';
    },

    // ---- Card Rendering ----
    createCardElement(card, faceDown = false) {
        const el = document.createElement('div');
        el.className = 'playing-card';
        if (faceDown) {
            el.classList.add('card-back');
            el.innerHTML = `<div class="card-back-design">♠♥♦♣</div>`;
            return el;
        }
        const color = getSuitColor(card.suit);
        el.classList.add(`card-${color}`);
        el.innerHTML = `
            <span class="card-rank">${card.rank}</span>
            <span class="card-suit">${getSuitSymbol(card.suit)}</span>
        `;
        return el;
    },

    // ---- Render Bots ----
    renderBots(state) {
        this.els.botsContainer.innerHTML = '';
        const bots = state.players.filter(p => !p.isHuman);

        bots.forEach((bot, index) => {
            const botEl = document.createElement('div');
            botEl.className = 'bot-seat';
            botEl.id = `bot-${bot.id}`;
            if (bot.folded) botEl.classList.add('folded');
            if (state.currentPlayerIndex === state.players.indexOf(bot)) {
                botEl.classList.add('active-player');
            }

            const cardsHTML = bot.folded ? '' :
                (state.phase === 'showdown' && !bot.folded) ?
                    bot.holeCards.map(c => `
                        <div class="mini-card card-${getSuitColor(c.suit)}">
                            <span>${c.rank}</span><span>${getSuitSymbol(c.suit)}</span>
                        </div>
                    `).join('') :
                    `<div class="mini-card card-back"><span>?</span></div>
                     <div class="mini-card card-back"><span>?</span></div>`;

            const dealerBadge = state.players.indexOf(bot) === state.dealerIndex ? '<span class="badge dealer-b">D</span>' : '';
            const sbIndex = (state.dealerIndex + 1) % state.players.length;
            const bbIndex = (state.dealerIndex + 2) % state.players.length;
            const sbBadge = state.players.indexOf(bot) === sbIndex ? '<span class="badge sb-b">SB</span>' : '';
            const bbBadge = state.players.indexOf(bot) === bbIndex ? '<span class="badge bb-b">BB</span>' : '';

            botEl.innerHTML = `
                <div class="bot-avatar">${bot.avatar || '🤖'}</div>
                <div class="bot-info">
                    <div class="bot-name">${bot.name} ${dealerBadge}${sbBadge}${bbBadge}</div>
                    <div class="bot-chips">${formatChips(bot.chips)}</div>
                    <div class="bot-action">${bot.lastAction || ''}</div>
                </div>
                <div class="bot-cards">${cardsHTML}</div>
            `;
            this.els.botsContainer.appendChild(botEl);
        });
    },

    // ---- Render Community Cards ----
    renderCommunityCards(state, animate = false) {
        const container = this.els.communityCards;
        const existingCount = container.children.length;
        const targetCount = state.communityCards.length;

        // Only add new cards
        for (let i = existingCount; i < targetCount; i++) {
            const card = state.communityCards[i];
            const el = this.createCardElement(card);
            if (animate) {
                el.classList.add('card-deal-anim');
                el.style.animationDelay = `${(i - existingCount) * 0.15}s`;
            }
            container.appendChild(el);
        }
    },

    clearCommunityCards() {
        this.els.communityCards.innerHTML = '';
    },

    // ---- Render Player Hand ----
    renderPlayerHand(player, show = true) {
        this.els.playerCards.innerHTML = '';
        if (!player.holeCards.length) return;

        player.holeCards.forEach((card, i) => {
            const el = this.createCardElement(card, !show);
            el.classList.add('player-card', 'card-deal-anim');
            el.style.animationDelay = `${i * 0.2}s`;
            this.els.playerCards.appendChild(el);
        });
    },

    // ---- Update Player Info ----
    updatePlayerInfo(player, state) {
        this.els.playerChips.textContent = formatChips(player.chips);
        this.els.playerName.textContent = player.name;

        const sbIndex = (state.dealerIndex + 1) % state.players.length;
        const bbIndex = (state.dealerIndex + 2) % state.players.length;
        const playerIdx = state.players.indexOf(player);

        let badges = '';
        if (playerIdx === state.dealerIndex) badges += ' <span class="badge dealer-b">D</span>';
        if (playerIdx === sbIndex) badges += ' <span class="badge sb-b">SB</span>';
        if (playerIdx === bbIndex) badges += ' <span class="badge bb-b">BB</span>';
        this.els.playerName.innerHTML = player.name + badges;
    },

    // ---- Pot and Phase ----
    updatePot(amount) {
        this.els.potDisplay.textContent = formatChips(amount);
        this.els.potDisplay.classList.add('pot-update');
        setTimeout(() => this.els.potDisplay.classList.remove('pot-update'), 400);
    },

    updatePhase(phase) {
        const names = {
            preflop: 'Pre-Flop',
            flop: 'Flop',
            turn: 'Turn',
            river: 'River',
            showdown: 'Showdown'
        };
        this.els.phaseDisplay.textContent = names[phase] || phase;
    },

    // ---- Action Buttons ----
    showActions(availableActions, state, playerIndex) {
        this.els.actionButtons.classList.remove('hidden');
        this.els.actionButtons.classList.add('action-grid');
        this.els.raiseControls.classList.add('hidden');
        this.els.raiseControls.classList.remove('raise-panel');

        const callAmt = getCallAmount(state, playerIndex);

        this.els.btnFold.classList.toggle('hidden', !availableActions.includes('fold'));
        this.els.btnCheck.classList.toggle('hidden', !availableActions.includes('check'));
        this.els.btnCall.classList.toggle('hidden', !availableActions.includes('call'));
        this.els.btnRaise.classList.toggle('hidden', !availableActions.includes('raise'));
        this.els.btnAllin.classList.toggle('hidden', !availableActions.includes('allin'));

        if (availableActions.includes('call')) {
            this.els.btnCall.textContent = `Call ${formatChips(callAmt)}`;
        }

        const player = state.players[playerIndex];
        this.els.btnAllin.textContent = `All-In ${formatChips(player.chips)}`;
    },

    hideActions() {
        this.els.actionButtons.classList.add('hidden');
        this.els.actionButtons.classList.remove('action-grid');
        this.els.raiseControls.classList.add('hidden');
        this.els.raiseControls.classList.remove('raise-panel');
    },

    showRaiseControls(state, playerIndex) {
        const player = state.players[playerIndex];
        const minR = getMinRaise(state, playerIndex);
        const maxR = getMaxRaise(state, playerIndex);

        this.els.raiseControls.classList.remove('hidden');
        this.els.raiseControls.classList.add('raise-panel');
        this.els.actionButtons.classList.add('hidden');
        this.els.actionButtons.classList.remove('action-grid');

        this.els.raiseSlider.min = minR;
        this.els.raiseSlider.max = maxR;
        this.els.raiseSlider.value = minR;
        this.els.raiseAmount.textContent = formatChips(minR);

        this.els.raiseSlider.oninput = () => {
            this.els.raiseAmount.textContent = formatChips(parseInt(this.els.raiseSlider.value));
        };

        // Quick buttons
        this.els.quickX2.onclick = () => {
            const val = Math.min(state.currentBet * 2, maxR);
            this.els.raiseSlider.value = val;
            this.els.raiseAmount.textContent = formatChips(val);
        };
        this.els.quickHalf.onclick = () => {
            const val = Math.min(Math.floor(state.pot * 0.5), maxR);
            this.els.raiseSlider.value = Math.max(val, minR);
            this.els.raiseAmount.textContent = formatChips(Math.max(val, minR));
        };
        this.els.quickPot.onclick = () => {
            const val = Math.min(state.pot, maxR);
            this.els.raiseSlider.value = Math.max(val, minR);
            this.els.raiseAmount.textContent = formatChips(Math.max(val, minR));
        };
        this.els.quickAllin.onclick = () => {
            this.els.raiseSlider.value = maxR;
            this.els.raiseAmount.textContent = formatChips(maxR);
        };
    },

    getRaiseValue() {
        return parseInt(this.els.raiseSlider.value);
    },

    // ---- Timer ----
    startTimer(durationMs, onExpire) {
        this.els.timerBar.classList.remove('hidden');
        const bar = this.els.timerBar.querySelector('.timer-fill');
        bar.style.transition = 'none';
        bar.style.width = '100%';

        requestAnimationFrame(() => {
            bar.style.transition = `width ${durationMs}ms linear`;
            bar.style.width = '0%';
        });

        this._timerTimeout = setTimeout(() => {
            this.els.timerBar.classList.add('hidden');
            if (onExpire) onExpire();
        }, durationMs);
    },

    stopTimer() {
        if (this._timerTimeout) clearTimeout(this._timerTimeout);
        this.els.timerBar.classList.add('hidden');
    },

    // ---- Last Action Display ----
    showLastAction(text) {
        this.els.lastActionDisplay.textContent = text;
        this.els.lastActionDisplay.classList.add('action-flash');
        setTimeout(() => this.els.lastActionDisplay.classList.remove('action-flash'), 600);
    },

    // ---- Result Overlay ----
    showResult(winners, humanPlayer, lostAmount = 0) {
        this.els.resultOverlay.classList.remove('hidden');
        const won = winners.some(w => w.player.id === humanPlayer.id);

        this.els.resultTitle.textContent = won ? '🎉 You Win!' : '😔 You Lose';
        this.els.resultTitle.className = `result-title ${won ? 'win' : 'lose'}`;

        if (winners.length > 0) {
            const w = winners[0];
            this.els.resultHand.textContent = w.hand ? w.hand.name : 'All folded';
            
            if (won) {
                this.els.resultAmount.textContent = `+${formatChips(w.amount)}`;
                this.els.resultAmount.className = 'result-amount win';
            } else {
                this.els.resultAmount.textContent = `-${formatChips(lostAmount)}`;
                this.els.resultAmount.className = 'result-amount lose';
            }
        }
    },

    hideResult() {
        this.els.resultOverlay.classList.add('hidden');
    },



    // ---- Bot thinking indicator ----
    showBotThinking(botId) {
        const el = document.getElementById(`bot-${botId}`);
        if (el) el.classList.add('thinking');
    },

    hideBotThinking(botId) {
        const el = document.getElementById(`bot-${botId}`);
        if (el) el.classList.remove('thinking');
    },

    // ---- Highlight winner ----
    highlightWinner(playerId, isHuman) {
        if (isHuman) {
            document.getElementById('player-area').classList.add('winner-glow');
            setTimeout(() => document.getElementById('player-area').classList.remove('winner-glow'), 3000);
        } else {
            const el = document.getElementById(`bot-${playerId}`);
            if (el) {
                el.classList.add('winner-glow');
                setTimeout(() => el.classList.remove('winner-glow'), 3000);
            }
        }
    }
};

// ---- Utility ----
function formatChips(amount) {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 10000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toLocaleString();
}
