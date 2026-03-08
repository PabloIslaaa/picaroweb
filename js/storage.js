// ============================================================
// storage.js — LocalStorage Persistence
// ============================================================

const STORAGE_KEY = 'poker_holdem_save';

function getDefaultSave() {
    return {
        totalChips: 1000,
        maxChips: 1000,
        preferredDifficulty: 'medium',
        preferredMode: '6players',
        gamesPlayed: 0,
        gamesWon: 0
    };
}

function loadSave() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return getDefaultSave();
        const data = JSON.parse(raw);
        return { ...getDefaultSave(), ...data };
    } catch {
        return getDefaultSave();
    }
}

function saveSave(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // Storage full or unavailable
    }
}

function updateChips(newTotal) {
    const data = loadSave();
    data.totalChips = newTotal;
    if (newTotal > data.maxChips) data.maxChips = newTotal;
    saveSave(data);
}

function recordGameResult(won) {
    const data = loadSave();
    data.gamesPlayed++;
    if (won) data.gamesWon++;
    saveSave(data);
}

function savePreferences(difficulty, mode) {
    const data = loadSave();
    data.preferredDifficulty = difficulty;
    data.preferredMode = mode;
    saveSave(data);
}
