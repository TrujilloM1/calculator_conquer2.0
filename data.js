// data.js — Constants and utility functions for Conquista Online Loot Tracker

// ─── Default Item ────────────────────────────────────────────────────────────
const DEFAULT_ITEM_NAME  = 'DBS';
const DEFAULT_ITEM_PRICE = 25000;

// ─── Craft Levels ────────────────────────────────────────────────────────────
const CRAFT_MIN_LEVEL = 2;
const CRAFT_MAX_LEVEL = 12;

// ─── Set Personaje — Gem & Socket Constants ───────────────────────────────────
const SET_PRICE_SUPER_GEM    = 85000;    // Gema Super de Dragón (CPS)
const SET_PRICE_TORTOISE_GEM = 114000;   // Gema Tortoise (CPS)
const SET_PRICE_AMETHYST     = 270000;   // Amatista (CPS)
const SET_SOCKET2_AMETHYSTS  = 7;        // Amatistas needed to open Socket 2 (armors/accessories)
const SET_SOCKET1_WPN_DBS    = 1;        // DBS needed for weapon Socket 1
const SET_SOCKET1_ARM_DBS    = 12;       // DBS needed for armor/accessory Socket 1
const SET_SOCKET2_WPN_DBS    = 5;        // DBS needed for weapon Socket 2
const SET_HP_MAX             = 255;      // Max HP gems per slot
const SET_DMG_COST_TO_M5     = 342000;   // CPS: -3 → -5 (3 Tortoise)
const SET_DMG_COST_TO_M7     = 570000;   // CPS: -5 → -7 (5 Tortoise) additional

// ─── Set Personaje — Slot Definitions ────────────────────────────────────────
// hasS1: Socket 1 (excluded: Caballo, Botella, Frac)
// hasS2: Socket 2 (excluded: Arma Der, Arma Izq, Caballo, Botella, Traje, Frac)
// hasDmg: Damage upgrade (excluded: Caballo, Botella, Traje, Frac)
// hasHP:  HP gems (excluded: Caballo, Botella, Traje, Frac)
// isWeapon: affects Socket 1 cost (1 DBS vs 12 DBS)
// isOther: grouped separately in results (fewer upgrade paths)
const SET_SLOTS = [
    { id:'casco',    name:'Casco',            hasLevel:true,  hasS1:true,  hasS2:true,  hasDmg:true,  hasHP:true,  isWeapon:false, isOther:false },
    { id:'collar',   name:'Collar',           hasLevel:true,  hasS1:true,  hasS2:true,  hasDmg:true,  hasHP:true,  isWeapon:false, isOther:false },
    { id:'anillo',   name:'Anillo',           hasLevel:true,  hasS1:true,  hasS2:true,  hasDmg:true,  hasHP:true,  isWeapon:false, isOther:false },
    { id:'armadura', name:'Armadura',         hasLevel:true,  hasS1:true,  hasS2:true,  hasDmg:true,  hasHP:true,  isWeapon:false, isOther:false },
    { id:'traje',    name:'Traje',            hasLevel:true,  hasS1:true,  hasS2:true,  hasDmg:true,  hasHP:true,  isWeapon:false, isOther:false },
    { id:'arma-der', name:'Arma Derecha',     hasLevel:true,  hasS1:true,  hasS2:true,  hasDmg:true,  hasHP:true,  isWeapon:true,  isOther:false },
    { id:'arma-izq', name:'Arma Izquierda',   hasLevel:true,  hasS1:true,  hasS2:true,  hasDmg:true,  hasHP:true,  isWeapon:true,  isOther:false },
    { id:'botas',    name:'Botas',            hasLevel:true,  hasS1:true,  hasS2:true,  hasDmg:true,  hasHP:true,  isWeapon:false, isOther:false },
    { id:'caballo',  name:'Caballo',          hasLevel:false, hasS1:false, hasS2:false, hasDmg:false, hasHP:false, isWeapon:false, isOther:true  },
    { id:'botella',  name:'Botella Superior', hasLevel:false, hasS1:false, hasS2:false, hasDmg:false, hasHP:false, isWeapon:false, isOther:true  },
    { id:'frac',     name:'Frac',             hasLevel:false, hasS1:false, hasS2:false, hasDmg:false, hasHP:false, isWeapon:false, isOther:true  },
];

/**
 * Returns the number of +1 items needed to craft a +N item.
 * Formula: 3^(N-1)
 */
function itemsNeededForLevel(level) {
    return Math.pow(3, level - 1);
}

/**
 * Returns the compose amount needed to craft a +N item from 2 items of +(N-1).
 * +2: 20, +3: 80, +4: 240, +5: 720, ... (+3 each step from +3 onward)
 */
function composeNeededForLevel(level) {
    if (level < 2) return 0;
    if (level === 2) return 20;
    return 80 * Math.pow(3, level - 3);
}

/**
 * Format a number with thousands separators, no decimals.
 */
function formatCPS(value) {
    const num = Math.round(Number(value) || 0);
    return num.toLocaleString('es-ES');
}

/**
 * Format an ISO date string as a readable Spanish locale date/time.
 */
function formatDate(dateValue) {
    const d = new Date(dateValue);
    return d.toLocaleDateString('es-ES', {
        day:    '2-digit',
        month:  '2-digit',
        year:   'numeric',
        hour:   '2-digit',
        minute: '2-digit',
    });
}

/**
 * Load sessions array from localStorage.
 */
function loadSessions() {
    try {
        return JSON.parse(localStorage.getItem('co_loot_sessions')) || [];
    } catch {
        return [];
    }
}

/**
 * Persist sessions array to localStorage.
 */
function saveSessions(sessions) {
    localStorage.setItem('co_loot_sessions', JSON.stringify(sessions));
}
