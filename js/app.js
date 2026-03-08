// ============================================================
// app.js — Main Game Application Controller
// ============================================================

const App = {
    state: null,
    selectedDifficulty: 'medium',
    selectedMode: '6players',
    humanPlayer: null,
    isProcessing: false,
    turnTimerDuration: 30000, // 30 seconds
    dealAnimDelay: 400,

    // ---- Initialize ----
    init() {
        UI.init();
        this.bindEvents();
        this.loadPreferences();
        UI.showStartScreen();
    },

    loadPreferences() {
        const save = loadSave();
        this.selectedDifficulty = save.preferredDifficulty || 'medium';
        this.selectedMode = save.preferredMode || '6players';
        this.highlightSelection();
    },

    highlightSelection() {
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.difficulty === this.selectedDifficulty);
        });
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.mode === this.selectedMode);
        });
    },

    // ---- Event Binding ----
    bindEvents() {
        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedDifficulty = btn.dataset.difficulty;
                this.highlightSelection();
            });
        });

        // Mode selection
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedMode = btn.dataset.mode;
                this.highlightSelection();
            });
        });

        // Start game
        UI.els.startBtn.addEventListener('click', () => this.startGame());

        // Action buttons
        UI.els.btnFold.addEventListener('click', () => this.handleAction('fold'));
        UI.els.btnCheck.addEventListener('click', () => this.handleAction('check'));
        UI.els.btnCall.addEventListener('click', () => this.handleAction('call'));
        UI.els.btnRaise.addEventListener('click', () => this.showRaise());
        UI.els.btnAllin.addEventListener('click', () => this.handleAction('allin'));

        // Raise controls
        UI.els.raiseConfirm.addEventListener('click', () => {
            const amount = UI.getRaiseValue();
            this.handleAction('raise', amount);
        });
        UI.els.raiseCancel.addEventListener('click', () => {
            UI.els.raiseControls.classList.add('hidden');
        });

        // Result overlay
        UI.els.resultNextBtn.addEventListener('click', () => this.nextHand());
        UI.els.resultLeaveBtn.addEventListener('click', () => this.leaveGame());
    },

    // ---- Start Game ----
    startGame() {
        const buyIn = 1000;
        const numBots = this.selectedMode === '1v1' ? 1 : 5;

        // Create human player
        this.humanPlayer = createPlayer(0, 'You', buyIn, true);

        // Create bots
        const players = [this.humanPlayer];
        for (let i = 0; i < numBots; i++) {
            const bot = createBot(i + 1, BOT_NAMES[i], 1000, this.selectedDifficulty);
            players.push(bot);
        }

        this.state = createGameState(players);
        this.state.dealerIndex = Math.floor(Math.random() * players.length);

        UI.showGameScreen();
        this.startNewHand();
    },

    // ---- Hand Flow ----
    async startNewHand() {
        this.isProcessing = true;
        UI.hideActions();
        UI.hideResult();
        UI.clearCommunityCards();

        startNewHand(this.state);

        // Render everything
        UI.renderBots(this.state);
        UI.updatePot(this.state.pot);
        UI.updatePhase(this.state.phase);
        UI.updatePlayerInfo(this.humanPlayer, this.state);

        // Animate dealing
        await this.sleep(this.dealAnimDelay);
        UI.renderPlayerHand(this.humanPlayer, true);
        await this.sleep(600);

        this.isProcessing = false;
        this.processCurrentPlayer();
    },

    async processCurrentPlayer() {
        if (this.isProcessing) return;

        // Check if only one player left
        const active = getActivePlayers(this.state);
        if (active.length <= 1) {
            await this.endHand();
            return;
        }

        // Check if round is complete
        if (isRoundComplete(this.state)) {
            if (this.state.phase === 'river') {
                // All betting done, go to showdown
                advancePhase(this.state);
                await this.endHand();
                return;
            }

            this.isProcessing = true;
            advancePhase(this.state);
            UI.updatePhase(this.state.phase);
            UI.renderCommunityCards(this.state, true);
            UI.renderBots(this.state);
            await this.sleep(800);
            this.isProcessing = false;

            this.processCurrentPlayer();
            return;
        }

        const currentPlayer = this.state.players[this.state.currentPlayerIndex];

        // Skip folded or all-in
        if (currentPlayer.folded || currentPlayer.allIn) {
            advanceToNextPlayer(this.state);
            this.state.actionsThisRound++;
            this.processCurrentPlayer();
            return;
        }

        if (currentPlayer.isHuman) {
            this.promptHumanAction();
        } else {
            await this.processBotAction(currentPlayer);
        }
    },

    // ---- Human Turn ----
    promptHumanAction() {
        const actions = getAvailableActions(this.state, this.state.currentPlayerIndex);
        UI.showActions(actions, this.state, this.state.currentPlayerIndex);
        UI.renderBots(this.state);

        // Start turn timer
        UI.startTimer(this.turnTimerDuration, () => {
            // Auto-action on timeout
            if (actions.includes('check')) {
                this.handleAction('check');
            } else {
                this.handleAction('fold');
            }
        });
    },

    async handleAction(action, amount = 0) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        UI.stopTimer();
        UI.hideActions();

        const playerIndex = this.state.currentPlayerIndex;
        doAction(this.state, playerIndex, action, amount);

        UI.updatePot(this.state.pot);
        UI.updatePlayerInfo(this.humanPlayer, this.state);
        UI.showLastAction(`You: ${this.humanPlayer.lastAction}`);

        await this.sleep(300);

        advanceToNextPlayer(this.state);
        this.isProcessing = false;
        this.processCurrentPlayer();
    },

    showRaise() {
        UI.showRaiseControls(this.state, this.state.currentPlayerIndex);
    },

    // ---- Bot Turn ----
    async processBotAction(bot) {
        this.isProcessing = true;
        const botIndex = this.state.players.indexOf(bot);

        UI.showBotThinking(bot.id);
        UI.renderBots(this.state);

        const thinkTime = getBotThinkTime(bot.difficulty);
        await this.sleep(thinkTime);

        const decision = getBotAction(this.state, botIndex);

        // Validate action
        const actions = getAvailableActions(this.state, botIndex);
        let finalAction = decision.action;
        let finalAmount = decision.amount || 0;

        if (!actions.includes(finalAction)) {
            if (actions.includes('check')) finalAction = 'check';
            else if (actions.includes('call')) finalAction = 'call';
            else finalAction = 'fold';
        }

        doAction(this.state, botIndex, finalAction, finalAmount);

        UI.hideBotThinking(bot.id);
        UI.renderBots(this.state);
        UI.updatePot(this.state.pot);
        UI.showLastAction(`${bot.name}: ${bot.lastAction}`);

        await this.sleep(400);

        advanceToNextPlayer(this.state);
        this.isProcessing = false;
        this.processCurrentPlayer();
    },

    // ---- End Hand ----
    async endHand() {
        this.isProcessing = true;

        // If showdown, reveal community cards
        while (this.state.communityCards.length < 5 && getActivePlayers(this.state).length > 1) {
            advancePhase(this.state);
            UI.renderCommunityCards(this.state, true);
            await this.sleep(600);
        }

        UI.updatePhase('showdown');

        // Determine winners
        determineWinners(this.state);

        // Reveal bot cards if showdown
        UI.renderBots(this.state);
        await this.sleep(500);

        // Highlight winners
        for (const w of this.state.winners) {
            UI.highlightWinner(w.player.id, w.player.isHuman);
        }

        const won = this.state.winners.some(w => w.player.isHuman);
        recordGameResult(won);

        await this.sleep(1000);

        UI.showResult(this.state.winners, this.humanPlayer);
        this.isProcessing = false;
    },

    // ---- Next Hand / Leave ----
    async nextHand() {
        // Auto-reset chips if player runs out
        if (this.humanPlayer.chips <= 0) {
            this.humanPlayer.chips = 1000;
            updateChips(1000);
        }

        // Remove busted bots and add new ones if needed
        this.state.players = this.state.players.filter(p => p.chips > 0 || p.isHuman);

        if (this.state.players.filter(p => !p.isHuman).length === 0) {
            // All bots busted, create new ones
            const numBots = this.selectedMode === '1v1' ? 1 : 5;
            for (let i = 0; i < numBots; i++) {
                const bot = createBot(i + 1, BOT_NAMES[i], 1000, this.selectedDifficulty);
                this.state.players.push(bot);
            }
        }

        rotateDealerButton(this.state);
        this.startNewHand();
    },

    leaveGame() {
        UI.showStartScreen();
    },



    // ---- Utility ----
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// ---- Bootstrap ----
document.addEventListener('DOMContentLoaded', () => App.init());
