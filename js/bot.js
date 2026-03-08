// ============================================================
// bot.js — Bot AI for Texas Hold'em (3 Difficulty Levels)
// ============================================================

const BOT_NAMES = ['Catalán', 'Migel', 'Árabe', 'Moro', 'Pablo'];

const BOT_AVATARS = ['🤖', '👽', '🎭', '🦊', '🐺'];

function createBot(id, name, chips, difficulty = 'medium') {
    const player = createPlayer(id, name, chips, false);
    player.difficulty = difficulty;
    player.avatar = BOT_AVATARS[id - 1] || '🤖';
    return player;
}

// ---- Hand Strength Estimation ----
function getHandStrength(holeCards, communityCards) {
    if (communityCards.length === 0) {
        return getPreflopStrength(holeCards);
    }
    const hand = bestHand(holeCards, communityCards);
    // Normalize: 0-1 scale
    return Math.min(1, (hand.rank * 0.1) + 0.1 + (hand.kickers[0] / 14) * 0.05);
}

function getPreflopStrength(holeCards) {
    const c1 = holeCards[0], c2 = holeCards[1];
    const highVal = Math.max(c1.value, c2.value);
    const lowVal = Math.min(c1.value, c2.value);
    const isPair = c1.value === c2.value;
    const isSuited = c1.suit === c2.suit;
    const gap = highVal - lowVal;

    let strength = 0;

    if (isPair) {
        strength = 0.5 + (highVal / 14) * 0.5; // Pairs: 0.5-1.0
    } else {
        strength = ((highVal + lowVal) / 28) * 0.6;
        if (isSuited) strength += 0.08;
        if (gap <= 2) strength += 0.05;
        if (highVal >= 12) strength += 0.1; // Face cards bonus
    }

    return Math.min(1, Math.max(0, strength));
}

// ---- Bot Decision Making ----
function getBotAction(state, playerIndex) {
    const player = state.players[playerIndex];
    const available = getAvailableActions(state, playerIndex);
    const strength = getHandStrength(player.holeCards, state.communityCards);
    const toCall = getCallAmount(state, playerIndex);
    const potOdds = toCall > 0 ? toCall / (state.pot + toCall) : 0;

    const difficulty = player.difficulty || 'medium';

    switch (difficulty) {
        case 'easy':
            return easyBotDecision(available, strength, toCall, state, player, potOdds);
        case 'medium':
            return mediumBotDecision(available, strength, toCall, state, player, potOdds);
        case 'hard':
            return hardBotDecision(available, strength, toCall, state, player, potOdds);
        default:
            return mediumBotDecision(available, strength, toCall, state, player, potOdds);
    }
}

function easyBotDecision(available, strength, toCall, state, player, potOdds) {
    const rand = Math.random();

    // Easy bot plays ~70% of hands, calls too much
    if (strength < 0.15 && toCall > 0) {
        // Even weak hands: 30% call
        if (rand < 0.3) return { action: 'call' };
        return { action: 'fold' };
    }

    if (toCall === 0) {
        // Check most of the time, rarely raise
        if (strength > 0.6 && rand < 0.2) {
            const raiseAmt = Math.min(state.bigBlind * 2, player.chips);
            return { action: 'raise', amount: raiseAmt };
        }
        return { action: 'check' };
    }

    // Has to call
    if (strength > 0.3 || rand < 0.5) {
        if (strength > 0.8 && rand < 0.15) {
            return { action: 'allin' };
        }
        return { action: 'call' };
    }

    return { action: 'fold' };
}

function mediumBotDecision(available, strength, toCall, state, player, potOdds) {
    const rand = Math.random();
    const stackRatio = player.chips / (state.bigBlind * 10);

    if (toCall === 0) {
        if (strength > 0.7 && rand < 0.5) {
            const raiseAmt = Math.min(state.pot * 0.6 + state.bigBlind, player.chips);
            return { action: 'raise', amount: Math.ceil(raiseAmt) };
        }
        if (strength > 0.5 && rand < 0.3) {
            const raiseAmt = Math.min(state.bigBlind * 2.5, player.chips);
            return { action: 'raise', amount: Math.ceil(raiseAmt) };
        }
        return { action: 'check' };
    }

    // Pot odds based decision
    if (strength > potOdds + 0.15) {
        if (strength > 0.8 && rand < 0.3) {
            const raiseAmt = Math.min(state.pot * 0.75 + toCall, player.chips);
            return { action: 'raise', amount: Math.ceil(raiseAmt) };
        }
        return { action: 'call' };
    }

    if (strength > potOdds) {
        if (rand < 0.4) return { action: 'call' };
        return { action: 'fold' };
    }

    // Occasional bluff
    if (rand < 0.1 && toCall < state.bigBlind * 3) {
        return { action: 'call' };
    }

    return { action: 'fold' };
}

function hardBotDecision(available, strength, toCall, state, player, potOdds) {
    const rand = Math.random();
    const stackRatio = player.chips / (state.bigBlind * 10);
    const position = getRelativePosition(state, player);

    if (toCall === 0) {
        // Aggressive with strong hands
        if (strength > 0.75) {
            const raiseAmt = Math.min(state.pot * 0.7 + state.bigBlind, player.chips);
            return { action: 'raise', amount: Math.ceil(raiseAmt) };
        }
        // Occasional bluff raise
        if (strength < 0.3 && rand < 0.12 && position === 'late') {
            const raiseAmt = Math.min(state.bigBlind * 2.5, player.chips);
            return { action: 'raise', amount: Math.ceil(raiseAmt) };
        }
        if (strength > 0.45 && rand < 0.4) {
            const raiseAmt = Math.min(state.bigBlind * 2, player.chips);
            return { action: 'raise', amount: Math.ceil(raiseAmt) };
        }
        return { action: 'check' };
    }

    // Strong hand: raise/call
    if (strength > 0.8) {
        if (rand < 0.5) {
            const raiseAmt = Math.min(state.pot * 0.8 + toCall, player.chips);
            return { action: 'raise', amount: Math.ceil(raiseAmt) };
        }
        if (strength > 0.9 && rand < 0.2) {
            return { action: 'allin' };
        }
        return { action: 'call' };
    }

    // Decent hand: pot odds
    if (strength > potOdds + 0.1) {
        if (strength > 0.6 && rand < 0.25) {
            const raiseAmt = Math.min(state.pot * 0.5 + toCall, player.chips);
            return { action: 'raise', amount: Math.ceil(raiseAmt) };
        }
        return { action: 'call' };
    }

    // Bluff: steal attempts in late position
    if (position === 'late' && rand < 0.08 && state.pot < state.bigBlind * 6) {
        const raiseAmt = Math.min(state.pot + state.bigBlind, player.chips);
        return { action: 'raise', amount: Math.ceil(raiseAmt) };
    }

    // Marginal call
    if (strength > potOdds - 0.05 && rand < 0.3) {
        return { action: 'call' };
    }

    return { action: 'fold' };
}

function getRelativePosition(state, player) {
    const idx = state.players.indexOf(player);
    const active = state.players.filter(p => !p.folded);
    const playerPosInActive = active.indexOf(player);
    const ratio = playerPosInActive / active.length;

    if (ratio > 0.66) return 'late';
    if (ratio > 0.33) return 'middle';
    return 'early';
}

function getBotThinkTime(difficulty) {
    switch (difficulty) {
        case 'easy': return 600 + Math.random() * 800;
        case 'medium': return 800 + Math.random() * 1200;
        case 'hard': return 1000 + Math.random() * 1500;
        default: return 800 + Math.random() * 1000;
    }
}
