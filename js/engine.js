// ============================================================
// engine.js — Texas Hold'em Game Engine
// ============================================================

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

const HAND_RANKS = {
    HIGH_CARD: 0,
    ONE_PAIR: 1,
    TWO_PAIR: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8,
    ROYAL_FLUSH: 9
};

const HAND_NAMES = {
    0: 'High Card',
    1: 'Pair',
    2: 'Two Pair',
    3: 'Three of a Kind',
    4: 'Straight',
    5: 'Flush',
    6: 'Full House',
    7: 'Four of a Kind',
    8: 'Straight Flush',
    9: 'Royal Flush'
};

// ---- Deck ----
function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank, value: RANK_VALUES[rank] });
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    const d = [...deck];
    for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
}

// ---- Hand Evaluation ----
function getCombinations(arr, k) {
    const result = [];
    function combine(start, combo) {
        if (combo.length === k) {
            result.push([...combo]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]);
            combine(i + 1, combo);
            combo.pop();
        }
    }
    combine(0, []);
    return result;
}

function evaluateHand(fiveCards) {
    const sorted = [...fiveCards].sort((a, b) => b.value - a.value);
    const values = sorted.map(c => c.value);
    const suits = sorted.map(c => c.suit);

    const isFlush = suits.every(s => s === suits[0]);

    // Check straight
    let isStraight = false;
    let straightHigh = 0;

    // Normal straight
    if (values[0] - values[4] === 4 && new Set(values).size === 5) {
        isStraight = true;
        straightHigh = values[0];
    }
    // Ace-low straight (A-2-3-4-5)
    if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
        isStraight = true;
        straightHigh = 5;
    }

    // Count groups
    const counts = {};
    for (const v of values) {
        counts[v] = (counts[v] || 0) + 1;
    }
    const groups = Object.entries(counts).map(([v, c]) => ({ value: parseInt(v), count: c }));
    groups.sort((a, b) => b.count - a.count || b.value - a.value);

    if (isStraight && isFlush) {
        if (straightHigh === 14) {
            return { rank: HAND_RANKS.ROYAL_FLUSH, kickers: [14], name: HAND_NAMES[9] };
        }
        return { rank: HAND_RANKS.STRAIGHT_FLUSH, kickers: [straightHigh], name: HAND_NAMES[8] };
    }

    if (groups[0].count === 4) {
        const quad = groups[0].value;
        const kicker = groups[1].value;
        return { rank: HAND_RANKS.FOUR_OF_A_KIND, kickers: [quad, kicker], name: HAND_NAMES[7] };
    }

    if (groups[0].count === 3 && groups[1].count === 2) {
        return { rank: HAND_RANKS.FULL_HOUSE, kickers: [groups[0].value, groups[1].value], name: HAND_NAMES[6] };
    }

    if (isFlush) {
        return { rank: HAND_RANKS.FLUSH, kickers: values, name: HAND_NAMES[5] };
    }

    if (isStraight) {
        return { rank: HAND_RANKS.STRAIGHT, kickers: [straightHigh], name: HAND_NAMES[4] };
    }

    if (groups[0].count === 3) {
        const trip = groups[0].value;
        const kickers = groups.slice(1).map(g => g.value);
        return { rank: HAND_RANKS.THREE_OF_A_KIND, kickers: [trip, ...kickers], name: HAND_NAMES[3] };
    }

    if (groups[0].count === 2 && groups[1].count === 2) {
        const high = Math.max(groups[0].value, groups[1].value);
        const low = Math.min(groups[0].value, groups[1].value);
        const kicker = groups[2].value;
        return { rank: HAND_RANKS.TWO_PAIR, kickers: [high, low, kicker], name: HAND_NAMES[2] };
    }

    if (groups[0].count === 2) {
        const pair = groups[0].value;
        const kickers = groups.slice(1).map(g => g.value);
        return { rank: HAND_RANKS.ONE_PAIR, kickers: [pair, ...kickers], name: HAND_NAMES[1] };
    }

    return { rank: HAND_RANKS.HIGH_CARD, kickers: values, name: HAND_NAMES[0] };
}

function bestHand(holeCards, communityCards) {
    const allCards = [...holeCards, ...communityCards];
    const combos = getCombinations(allCards, 5);
    let best = null;
    for (const combo of combos) {
        const result = evaluateHand(combo);
        if (!best || compareHands(result, best) > 0) {
            best = result;
            best.cards = combo;
        }
    }
    return best;
}

function compareHands(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    for (let i = 0; i < Math.min(a.kickers.length, b.kickers.length); i++) {
        if (a.kickers[i] !== b.kickers[i]) return a.kickers[i] - b.kickers[i];
    }
    return 0;
}

// ---- Game State ----
function createPlayer(id, name, chips, isHuman = false) {
    return {
        id,
        name,
        chips,
        isHuman,
        holeCards: [],
        currentBet: 0,
        totalBetThisRound: 0,
        folded: false,
        allIn: false,
        lastAction: '',
        seatIndex: id
    };
}

function createGameState(players, smallBlind = 10, bigBlind = 20) {
    return {
        players: [...players],
        deck: [],
        communityCards: [],
        pot: 0,
        sidePots: [],
        smallBlind,
        bigBlind,
        dealerIndex: 0,
        currentPlayerIndex: 0,
        phase: 'preflop', // preflop, flop, turn, river, showdown
        currentBet: 0,
        minRaise: bigBlind,
        lastRaiserIndex: -1,
        actionsThisRound: 0,
        winners: [],
        handNumber: 0
    };
}

// ---- Dealing ----
function startNewHand(state) {
    state.handNumber++;
    state.deck = shuffleDeck(createDeck());
    state.communityCards = [];
    state.pot = 0;
    state.sidePots = [];
    state.phase = 'preflop';
    state.currentBet = 0;
    state.minRaise = state.bigBlind;
    state.lastRaiserIndex = -1;
    state.actionsThisRound = 0;
    state.winners = [];

    // Reset players
    for (const p of state.players) {
        p.holeCards = [];
        p.currentBet = 0;
        p.totalBetThisRound = 0;
        p.folded = false;
        p.allIn = false;
        p.lastAction = '';
    }

    // Remove busted players
    state.players = state.players.filter(p => p.chips > 0 || p.isHuman);

    // Deal hole cards
    for (const p of state.players) {
        p.holeCards = [state.deck.pop(), state.deck.pop()];
    }

    // Post blinds
    const activePlayers = state.players.filter(p => !p.folded && p.chips > 0);
    if (activePlayers.length < 2) return state;

    const sbIndex = getNextActiveIndex(state, state.dealerIndex);
    const bbIndex = getNextActiveIndex(state, sbIndex);

    postBlind(state, sbIndex, state.smallBlind);
    postBlind(state, bbIndex, state.bigBlind);

    state.currentBet = state.bigBlind;
    state.currentPlayerIndex = getNextActiveIndex(state, bbIndex);
    state.lastRaiserIndex = bbIndex;

    return state;
}

function postBlind(state, playerIndex, amount) {
    const player = state.players[playerIndex];
    const actual = Math.min(amount, player.chips);
    player.chips -= actual;
    player.currentBet = actual;
    player.totalBetThisRound += actual;
    state.pot += actual;
    if (player.chips === 0) player.allIn = true;
}

function getNextActiveIndex(state, fromIndex) {
    let idx = (fromIndex + 1) % state.players.length;
    let safety = 0;
    while ((state.players[idx].folded || state.players[idx].allIn || state.players[idx].chips <= 0) && safety < state.players.length) {
        idx = (idx + 1) % state.players.length;
        safety++;
    }
    return idx;
}

function getActivePlayers(state) {
    return state.players.filter(p => !p.folded);
}

function getActivePlayersCanAct(state) {
    return state.players.filter(p => !p.folded && !p.allIn);
}

// ---- Actions ----
function doAction(state, playerIndex, action, amount = 0) {
    const player = state.players[playerIndex];

    switch (action) {
        case 'fold':
            player.folded = true;
            player.lastAction = 'Fold';
            break;

        case 'check':
            player.lastAction = 'Check';
            break;

        case 'call': {
            const callAmount = Math.min(state.currentBet - player.currentBet, player.chips);
            player.chips -= callAmount;
            player.currentBet += callAmount;
            player.totalBetThisRound += callAmount;
            state.pot += callAmount;
            if (player.chips === 0) player.allIn = true;
            player.lastAction = `Call ${callAmount}`;
            break;
        }

        case 'raise': {
            const toCall = state.currentBet - player.currentBet;
            const totalPut = Math.min(amount, player.chips);
            player.chips -= totalPut;
            player.currentBet += totalPut;
            player.totalBetThisRound += totalPut;
            state.pot += totalPut;
            state.currentBet = player.currentBet;
            state.minRaise = player.currentBet - state.currentBet + state.bigBlind;
            if (state.minRaise < state.bigBlind) state.minRaise = state.bigBlind;
            state.lastRaiserIndex = playerIndex;
            if (player.chips === 0) player.allIn = true;
            player.lastAction = `Raise ${totalPut}`;
            break;
        }

        case 'allin': {
            const allAmount = player.chips;
            player.currentBet += allAmount;
            player.totalBetThisRound += allAmount;
            state.pot += allAmount;
            player.chips = 0;
            player.allIn = true;
            if (player.currentBet > state.currentBet) {
                state.currentBet = player.currentBet;
                state.lastRaiserIndex = playerIndex;
            }
            player.lastAction = `All-In ${allAmount}`;
            break;
        }
    }

    state.actionsThisRound++;
    return state;
}

function getAvailableActions(state, playerIndex) {
    const player = state.players[playerIndex];
    if (player.folded || player.allIn) return [];

    const actions = ['fold'];
    const toCall = state.currentBet - player.currentBet;

    if (toCall === 0) {
        actions.push('check');
    } else {
        actions.push('call');
    }

    if (player.chips > toCall) {
        actions.push('raise');
    }

    actions.push('allin');

    return actions;
}

function getCallAmount(state, playerIndex) {
    const player = state.players[playerIndex];
    return Math.min(state.currentBet - player.currentBet, player.chips);
}

function getMinRaise(state, playerIndex) {
    const player = state.players[playerIndex];
    const toCall = state.currentBet - player.currentBet;
    return Math.min(toCall + state.bigBlind, player.chips);
}

function getMaxRaise(state, playerIndex) {
    return state.players[playerIndex].chips;
}

// ---- Round Progression ----
function isRoundComplete(state) {
    const canAct = getActivePlayersCanAct(state);
    if (canAct.length <= 1) return true;

    // All active players who can act have had a turn, and all bets are matched
    const allMatched = canAct.every(p => p.currentBet === state.currentBet);
    if (allMatched && state.actionsThisRound >= canAct.length) return true;

    return false;
}

function advancePhase(state) {
    // Reset for new betting round
    for (const p of state.players) {
        p.currentBet = 0;
    }
    state.currentBet = 0;
    state.minRaise = state.bigBlind;
    state.actionsThisRound = 0;
    state.lastRaiserIndex = -1;

    switch (state.phase) {
        case 'preflop':
            state.phase = 'flop';
            state.communityCards.push(state.deck.pop(), state.deck.pop(), state.deck.pop());
            break;
        case 'flop':
            state.phase = 'turn';
            state.communityCards.push(state.deck.pop());
            break;
        case 'turn':
            state.phase = 'river';
            state.communityCards.push(state.deck.pop());
            break;
        case 'river':
            state.phase = 'showdown';
            break;
    }

    // Set first player after dealer
    if (state.phase !== 'showdown') {
        state.currentPlayerIndex = getNextActiveIndex(state, state.dealerIndex);
    }

    return state;
}

function determineWinners(state) {
    const active = getActivePlayers(state);

    if (active.length === 1) {
        state.winners = [{
            player: active[0],
            amount: state.pot,
            hand: null
        }];
        active[0].chips += state.pot;
        return state;
    }

    // Evaluate hands
    const evaluations = active.map(p => ({
        player: p,
        hand: bestHand(p.holeCards, state.communityCards)
    }));

    // Sort by hand strength
    evaluations.sort((a, b) => compareHands(b.hand, a.hand));

    // Find winners (could be tie)
    const bestEval = evaluations[0].hand;
    const winners = evaluations.filter(e => compareHands(e.hand, bestEval) === 0);

    const share = Math.floor(state.pot / winners.length);
    const remainder = state.pot - share * winners.length;

    state.winners = winners.map((w, i) => {
        const amount = share + (i === 0 ? remainder : 0);
        w.player.chips += amount;
        return {
            player: w.player,
            amount,
            hand: w.hand
        };
    });

    return state;
}

function advanceToNextPlayer(state) {
    state.currentPlayerIndex = getNextActiveIndex(state, state.currentPlayerIndex);
    return state;
}

function isHandOver(state) {
    const active = getActivePlayers(state);
    return active.length <= 1 || state.phase === 'showdown';
}

function rotateDealerButton(state) {
    state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
    let safety = 0;
    while (state.players[state.dealerIndex].chips <= 0 && safety < state.players.length) {
        state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
        safety++;
    }
}

// ---- Card Display Helpers ----
function cardToString(card) {
    const suitSymbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    return `${card.rank}${suitSymbols[card.suit]}`;
}

function getSuitColor(suit) {
    return (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
}

function getSuitSymbol(suit) {
    const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    return symbols[suit];
}
