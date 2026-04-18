// app.js — Conquista Online Loot & Craft Tracker

// ─── State ───────────────────────────────────────────────────────────────────
let rowIdCounter  = 0;
let lastCalcResult = null;   // holds the most recent calculation output

// ─── DOM References ──────────────────────────────────────────────────────────
const itemsList        = document.getElementById('items-list');
const btnAddItem       = document.getElementById('btn-add-item');
const btnCalculate     = document.getElementById('btn-calculate');
const btnSave          = document.getElementById('btn-save');
const resultsPanel     = document.getElementById('results-panel');
const looseCPSInput    = document.getElementById('loose-cps');
const sessionTimeInput = document.getElementById('session-time');
const craftPriceInput  = document.getElementById('craft-price');
const craftLevelSelect = document.getElementById('craft-level-select');
const craftTbody       = document.getElementById('craft-tbody');
const historyList      = document.getElementById('history-list');
const historyEmpty     = document.getElementById('history-empty');

// ─── Tab Navigation ──────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab;

        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        document.getElementById('tab-' + target).classList.add('active');

        if (target === 'history') renderHistory();
        if (target === 'craft')   updateCraftTable();
    });
});

// ─── Loot Tab: Item Rows ──────────────────────────────────────────────────────
function createItemRow(name, qty, price) {
    rowIdCounter++;

    const row = document.createElement('div');
    row.className  = 'item-row';
    row.dataset.rowId = rowIdCounter;
    row.setAttribute('role', 'listitem');

    row.innerHTML =
        '<input class="item-name"  type="text"   placeholder="Nombre del item" value="' + escapeAttr(name  || '') + '">' +
        '<input class="item-qty"   type="number" placeholder="0"  min="0" step="1" value="' + escapeAttr(qty   || '') + '">' +
        '<input class="item-price" type="number" placeholder="0"  min="0" step="1" value="' + escapeAttr(price || '') + '">' +
        '<span  class="item-subtotal">0</span>' +
        '<button class="btn-row-remove" type="button" title="Eliminar fila" aria-label="Eliminar fila">✕</button>';

    const qtyEl    = row.querySelector('.item-qty');
    const priceEl  = row.querySelector('.item-price');
    const subEl    = row.querySelector('.item-subtotal');
    const removeBtn= row.querySelector('.btn-row-remove');

    function recalcSubtotal() {
        const sub = (parseFloat(qtyEl.value) || 0) * (parseFloat(priceEl.value) || 0);
        subEl.textContent  = formatCPS(sub);
        subEl.dataset.value = sub;
    }

    qtyEl.addEventListener('input',   recalcSubtotal);
    priceEl.addEventListener('input',  recalcSubtotal);
    removeBtn.addEventListener('click', () => row.remove());

    // Compute initial subtotal if both values already present
    if ((qty || qty === 0) && (price || price === 0)) recalcSubtotal();

    return row;
}

function addItemRow(name, qty, price) {
    const row = createItemRow(name, qty, price);
    itemsList.appendChild(row);
    return row;
}

// Safe attribute escaping
function escapeAttr(str) {
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;');
}

// ─── Calculate ────────────────────────────────────────────────────────────────
btnCalculate.addEventListener('click', calculate);

function calculate() {
    let itemsTotal = 0;

    document.querySelectorAll('#items-list .item-row').forEach(row => {
        const qty   = parseFloat(row.querySelector('.item-qty').value)   || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        itemsTotal += qty * price;
    });

    const looseCPS   = parseFloat(looseCPSInput.value)    || 0;
    const timeMins   = parseFloat(sessionTimeInput.value) || 0;
    const grandTotal = itemsTotal + looseCPS;
    const cpsPerHour = timeMins > 0 ? (grandTotal / timeMins) * 60 : null;

    document.getElementById('res-items-total').textContent = formatCPS(itemsTotal)  + ' CPS';
    document.getElementById('res-loose-cps').textContent   = formatCPS(looseCPS)    + ' CPS';
    document.getElementById('res-grand-total').textContent = formatCPS(grandTotal)  + ' CPS';
    document.getElementById('res-cps-hour').textContent    = cpsPerHour !== null
        ? formatCPS(cpsPerHour) + ' CPS/h'
        : '— CPS/h';

    resultsPanel.removeAttribute('hidden');

    lastCalcResult = { itemsTotal, looseCPS, grandTotal, cpsPerHour, timeMins };
    return lastCalcResult;
}

// ─── Save Session ─────────────────────────────────────────────────────────────
btnSave.addEventListener('click', () => {
    // Make sure we have fresh calculations
    const result = calculate();

    const items = [];
    document.querySelectorAll('#items-list .item-row').forEach(row => {
        const name  = row.querySelector('.item-name').value.trim();
        const qty   = parseFloat(row.querySelector('.item-qty').value)   || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        if (name || qty > 0 || price > 0) {
            items.push({ name, qty, price, subtotal: qty * price });
        }
    });

    const session = {
        id:          Date.now(),
        date:        new Date().toISOString(),
        items,
        looseCPS:    result.looseCPS,
        timeMinutes: result.timeMins,
        grandTotal:  result.grandTotal,
        cpsPerHour:  result.cpsPerHour || 0,
    };

    const sessions = loadSessions();
    sessions.unshift(session);
    saveSessions(sessions);

    flashButton(btnSave, '✓ SESIÓN GUARDADA', 'btn-success');
});

function flashButton(btn, text, cls) {
    const originalHTML = btn.innerHTML;
    btn.innerHTML = text;
    btn.classList.add(cls);
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove(cls);
        btn.disabled = false;
    }, 2200);
}

// ─── History ──────────────────────────────────────────────────────────────────
function renderHistory() {
    const sessions = loadSessions();
    historyList.innerHTML = '';

    if (sessions.length === 0) {
        historyEmpty.style.display = '';
        return;
    }

    historyEmpty.style.display = 'none';

    sessions.forEach(s => {
        const entry = document.createElement('div');
        entry.className = 'history-entry';
        entry.setAttribute('role', 'listitem');

        // Build expandable items section
        let itemsHTML = '';
        if (s.items && s.items.length > 0) {
            const rows = s.items.map(it =>
                '<div class="history-item-row">' +
                    '<span class="hi-name">'  + escapeAttr(it.name || 'Sin nombre') + '</span>' +
                    '<span class="hi-qty">'   + it.qty + '×</span>' +
                    '<span class="hi-price">' + formatCPS(it.price)    + ' CPS</span>' +
                    '<span class="hi-sub">'   + formatCPS(it.subtotal) + ' CPS</span>' +
                '</div>'
            ).join('');

            itemsHTML =
                '<details class="history-items-details">' +
                    '<summary>Ver items (' + s.items.length + ')</summary>' +
                    '<div class="history-items-inner">' + rows + '</div>' +
                '</details>';
        }

        entry.innerHTML =
            '<div class="history-entry-header">' +
                '<span class="history-entry-date">📅 ' + formatDate(s.date) + '</span>' +
                '<button class="btn-delete-entry" type="button" data-id="' + s.id + '" title="Eliminar sesión" aria-label="Eliminar sesión">✕</button>' +
            '</div>' +
            '<div class="history-entry-body">' +
                '<div class="h-stat">' +
                    '<span>Total CPS</span>' +
                    '<span class="h-value gold">' + formatCPS(s.grandTotal) + ' CPS</span>' +
                '</div>' +
                '<div class="h-stat">' +
                    '<span>CPS / Hora</span>' +
                    '<span class="h-value gold">' + (s.cpsPerHour > 0 ? formatCPS(s.cpsPerHour) + ' CPS/h' : '—') + '</span>' +
                '</div>' +
                '<div class="h-stat">' +
                    '<span>Duración</span>' +
                    '<span class="h-value">' + (s.timeMinutes > 0 ? s.timeMinutes + ' min' : '—') + '</span>' +
                '</div>' +
                itemsHTML +
            '</div>';

        // Delete button handler
        entry.querySelector('.btn-delete-entry').addEventListener('click', e => {
            const id = Number(e.currentTarget.dataset.id);
            const updated = loadSessions().filter(x => x.id !== id);
            saveSessions(updated);
            renderHistory();
        });

        historyList.appendChild(entry);
    });
}

// ─── Crafting Calculator ──────────────────────────────────────────────────────
function updateCraftTable() {
    const price1         = parseFloat(craftPriceInput.value)  || 0;
    const selectedLevel  = parseInt(craftLevelSelect.value)   || CRAFT_MAX_LEVEL;

    craftTbody.innerHTML = '';

    for (let level = CRAFT_MIN_LEVEL; level <= CRAFT_MAX_LEVEL; level++) {
        const needed     = itemsNeededForLevel(level);
        const compose    = composeNeededForLevel(level);
        const cost       = needed * price1;
        const isSelected = level === selectedLevel;

        const tr = document.createElement('tr');
        if (isSelected) tr.classList.add('selected-level');

        tr.innerHTML =
            '<td class="cell-level' + (isSelected ? ' gold-text' : '') + '">+' + level + '</td>' +
            '<td>'                                                                   + formatCPS(needed)  + '</td>' +
            '<td class="cell-compose">'                                              + formatCPS(compose) + '<span class="compose-sub"> (2 × +' + (level - 1) + ')</span></td>' +
            '<td class="'          + (isSelected ? 'gold-text'   : '') + '">'      + formatCPS(cost)    + ' CPS</td>';

        craftTbody.appendChild(tr);
    }

    // Update result card
    const resNeeded = itemsNeededForLevel(selectedLevel);
    const resCost   = resNeeded * price1;

    document.getElementById('craft-res-level').textContent = '+' + selectedLevel;
    document.getElementById('craft-res-items').textContent = formatCPS(resNeeded);
    document.getElementById('craft-res-cost').textContent  = formatCPS(resCost) + ' CPS';
}

craftPriceInput.addEventListener('input',  updateCraftTable);
craftLevelSelect.addEventListener('change', updateCraftTable);

// ─── Initialization ───────────────────────────────────────────────────────────
function init() {
    // Default DBS row + one blank row
    addItemRow(DEFAULT_ITEM_NAME, '', String(DEFAULT_ITEM_PRICE));
    addItemRow();

    btnAddItem.addEventListener('click', () => addItemRow());

    // Build craft table on load (tab may be visited without clicking)
    updateCraftTable();
}

init();

// ══════════════════════════════════════════════════════════════
// ALMACÉN TAB
// ══════════════════════════════════════════════════════════════

// ─── Almacén DOM references ───────────────────────────────────
const almLeveledList = document.getElementById('alm-leveled-list');
const almSpecialList = document.getElementById('alm-special-list');
const btnAlmAddLev   = document.getElementById('btn-alm-add-leveled');
const btnAlmAddSpec  = document.getElementById('btn-alm-add-special');
const btnAlmCalc     = document.getElementById('btn-alm-calculate');
const almResultsEl   = document.getElementById('alm-results');

// Guard that prevents saving while rows are being restored from localStorage
let _almLoading = false;

// ─── Leveled item row ─────────────────────────────────────────
function createAlmLeveledRow(name, level, qty, price) {
    const lvl = parseInt(level) || 1;

    const levelOptions = [1, 2, 3, 4, 5, 6, 7, 8].map(n =>
        '<option value="' + n + '"' + (n === lvl ? ' selected' : '') + '>+' + n + '</option>'
    ).join('');

    const row = document.createElement('div');
    row.className = 'alm-row alm-row-leveled';
    row.setAttribute('role', 'listitem');

    row.innerHTML =
        '<input class="alm-name"  type="text"   placeholder="Nombre del item" value="' + escapeAttr(name  || '') + '">' +
        '<select class="alm-level">' + levelOptions + '</select>' +
        '<input class="alm-qty"   type="number" placeholder="0" min="0" step="1" value="' + escapeAttr(qty   != null ? qty   : '') + '">' +
        '<input class="alm-price" type="number" placeholder="0" min="0" step="1" value="' + escapeAttr(price != null ? price : '') + '">' +
        '<span  class="alm-equiv">0</span>' +
        '<span  class="alm-subtotal">0</span>' +
        '<button class="btn-row-remove" type="button" title="Eliminar fila" aria-label="Eliminar fila">✕</button>';

    const levelEl  = row.querySelector('.alm-level');
    const qtyEl    = row.querySelector('.alm-qty');
    const priceEl  = row.querySelector('.alm-price');
    const equivEl  = row.querySelector('.alm-equiv');
    const subEl    = row.querySelector('.alm-subtotal');
    const removeBtn= row.querySelector('.btn-row-remove');

    function recalc() {
        const lv   = parseInt(levelEl.value) || 1;
        const q    = parseFloat(qtyEl.value)   || 0;
        const p    = parseFloat(priceEl.value) || 0;
        equivEl.textContent  = formatCPS(itemsNeededForLevel(lv) * q);
        subEl.textContent    = formatCPS(q * p);
        saveAlmacen();
    }

    levelEl.addEventListener('change', recalc);
    qtyEl.addEventListener('input',    recalc);
    priceEl.addEventListener('input',  recalc);
    removeBtn.addEventListener('click', () => { row.remove(); saveAlmacen(); });

    // Compute on creation if values provided
    if (qty != null || price != null) recalc();

    return row;
}

function addAlmLeveledRow(name, level, qty, price) {
    almLeveledList.appendChild(createAlmLeveledRow(name, level, qty, price));
}

// ─── Special item row ─────────────────────────────────────────
function createAlmSpecialRow(name, qty, price) {
    const row = document.createElement('div');
    row.className = 'alm-row alm-row-special';
    row.setAttribute('role', 'listitem');

    row.innerHTML =
        '<input class="alm-name"  type="text"   placeholder="Nombre del item" value="' + escapeAttr(name  || '') + '">' +
        '<input class="alm-qty"   type="number" placeholder="0" min="0" step="1" value="' + escapeAttr(qty   != null ? qty   : '') + '">' +
        '<input class="alm-price" type="number" placeholder="0" min="0" step="1" value="' + escapeAttr(price != null ? price : '') + '">' +
        '<span  class="alm-subtotal">0</span>' +
        '<button class="btn-row-remove" type="button" title="Eliminar fila" aria-label="Eliminar fila">✕</button>';

    const qtyEl    = row.querySelector('.alm-qty');
    const priceEl  = row.querySelector('.alm-price');
    const subEl    = row.querySelector('.alm-subtotal');
    const removeBtn= row.querySelector('.btn-row-remove');

    function recalc() {
        subEl.textContent = formatCPS((parseFloat(qtyEl.value) || 0) * (parseFloat(priceEl.value) || 0));
        saveAlmacen();
    }

    qtyEl.addEventListener('input',    recalc);
    priceEl.addEventListener('input',  recalc);
    removeBtn.addEventListener('click', () => { row.remove(); saveAlmacen(); });

    if (qty != null || price != null) recalc();

    return row;
}

function addAlmSpecialRow(name, qty, price) {
    almSpecialList.appendChild(createAlmSpecialRow(name, qty, price));
}

// ─── Button listeners ─────────────────────────────────────────
btnAlmAddLev.addEventListener('click',  () => addAlmLeveledRow());
btnAlmAddSpec.addEventListener('click', () => addAlmSpecialRow());
btnAlmCalc.addEventListener('click', calculateAlmacen);

// ─── Calculate inventory ──────────────────────────────────────
function calculateAlmacen() {
    // Aggregate leveled items by level
    const byLevel = {};
    for (let lv = 1; lv <= 8; lv++) byLevel[lv] = { units: 0, equiv1: 0, cps: 0 };

    document.querySelectorAll('#alm-leveled-list .alm-row-leveled').forEach(row => {
        const lv  = parseInt(row.querySelector('.alm-level').value) || 1;
        const qty = parseFloat(row.querySelector('.alm-qty').value)   || 0;
        const pr  = parseFloat(row.querySelector('.alm-price').value) || 0;
        byLevel[lv].units  += qty;
        byLevel[lv].equiv1 += itemsNeededForLevel(lv) * qty;
        byLevel[lv].cps    += qty * pr;
    });

    // Collect special items
    const specials = [];
    let specialTotal = 0;
    document.querySelectorAll('#alm-special-list .alm-row-special').forEach(row => {
        const nm  = row.querySelector('.alm-name').value.trim() || 'Sin nombre';
        const qty = parseFloat(row.querySelector('.alm-qty').value)   || 0;
        const pr  = parseFloat(row.querySelector('.alm-price').value) || 0;
        const sub = qty * pr;
        specials.push({ name: nm, qty, price: pr, sub });
        specialTotal += sub;
    });

    let leveledTotal = 0;
    for (let lv = 1; lv <= 8; lv++) leveledTotal += byLevel[lv].cps;
    const grandTotal = leveledTotal + specialTotal;

    renderAlmResults(byLevel, specials, grandTotal);
    almResultsEl.removeAttribute('hidden');
    almResultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Render results ───────────────────────────────────────────
function renderAlmResults(byLevel, specials, grandTotal) {
    const hasLeveled  = Object.values(byLevel).some(b => b.units > 0);
    const hasSpecials = specials.some(s => s.qty > 0 || s.price > 0);
    let html = '';

    if (hasLeveled) {
        html += '<div class="alm-res-section">';
        html += '<div class="alm-res-title">⚔ Desglose por Nivel</div>';
        html += '<div class="alm-res-table-header">' +
                    '<span>NIVEL</span>' +
                    '<span>UNIDADES</span>' +
                    '<span>EQUIV +1</span>' +
                    '<span>VALOR (CPS)</span>' +
                '</div>';

        for (let lv = 1; lv <= 8; lv++) {
            if (byLevel[lv].units === 0) continue;
            html +=
                '<div class="alm-res-row">' +
                    '<span class="alm-res-level">+' + lv + '</span>' +
                    '<span>' + formatCPS(byLevel[lv].units)  + '</span>' +
                    '<span>' + formatCPS(byLevel[lv].equiv1) + '</span>' +
                    '<span class="gold">' + formatCPS(byLevel[lv].cps) + ' CPS</span>' +
                '</div>';
        }
        html += '</div>';
    }

    if (hasSpecials) {
        html += '<div class="alm-res-section">';
        html += '<div class="alm-res-title">💎 DBS &amp; Especiales</div>';
        html += '<div class="alm-res-table-header">' +
                    '<span>NOMBRE</span>' +
                    '<span>CANT</span>' +
                    '<span>PRECIO/U</span>' +
                    '<span>VALOR (CPS)</span>' +
                '</div>';

        specials.forEach(s => {
            if (s.qty === 0 && s.price === 0) return;
            html +=
                '<div class="alm-res-row">' +
                    '<span class="alm-res-name">' + escapeAttr(s.name) + '</span>' +
                    '<span>' + formatCPS(s.qty) + '</span>' +
                    '<span>' + formatCPS(s.price) + '</span>' +
                    '<span class="gold">' + formatCPS(s.sub) + ' CPS</span>' +
                '</div>';
        });
        html += '</div>';
    }

    if (!hasLeveled && !hasSpecials) {
        html = '<div class="alm-res-empty">No hay items registrados en el almacén.</div>';
    }

    html +=
        '<div class="alm-res-grand-total">' +
            '<span>TOTAL GENERAL DEL ALMACÉN</span>' +
            '<span class="alm-total-value">' + formatCPS(grandTotal) + ' CPS</span>' +
        '</div>';

    almResultsEl.innerHTML = html;
}

// ─── localStorage persistence ─────────────────────────────────
function saveAlmacen() {
    if (_almLoading) return;

    const leveledItems = [];
    document.querySelectorAll('#alm-leveled-list .alm-row-leveled').forEach(row => {
        leveledItems.push({
            name:  row.querySelector('.alm-name').value,
            level: parseInt(row.querySelector('.alm-level').value) || 1,
            qty:   parseFloat(row.querySelector('.alm-qty').value)   || 0,
            price: parseFloat(row.querySelector('.alm-price').value) || 0,
        });
    });

    const specialItems = [];
    document.querySelectorAll('#alm-special-list .alm-row-special').forEach(row => {
        specialItems.push({
            name:  row.querySelector('.alm-name').value,
            qty:   parseFloat(row.querySelector('.alm-qty').value)   || 0,
            price: parseFloat(row.querySelector('.alm-price').value) || 0,
        });
    });

    localStorage.setItem('co_almacen', JSON.stringify({ leveledItems, specialItems }));
}

function loadAlmacen() {
    _almLoading = true;
    try {
        const data = JSON.parse(localStorage.getItem('co_almacen'));
        if (data) {
            (data.leveledItems || []).forEach(it =>
                addAlmLeveledRow(it.name, it.level, it.qty, it.price)
            );
            if (!data.leveledItems || data.leveledItems.length === 0) addAlmLeveledRow();

            (data.specialItems || []).forEach(it =>
                addAlmSpecialRow(it.name, it.qty, it.price)
            );
            if (!data.specialItems || data.specialItems.length === 0)
                addAlmSpecialRow(DEFAULT_ITEM_NAME, '', String(DEFAULT_ITEM_PRICE));

            _almLoading = false;
            return;
        }
    } catch { /* ignore corrupt data */ }

    // No saved data — show defaults
    addAlmLeveledRow();
    addAlmSpecialRow(DEFAULT_ITEM_NAME, '', String(DEFAULT_ITEM_PRICE));
    _almLoading = false;
}

loadAlmacen();

// ══════════════════════════════════════════════════════════════
// SET PERSONAJE TAB
// ══════════════════════════════════════════════════════════════

let _setLoading = false;

// ─── Build slot cards from SET_SLOTS config ───────────────────
function generateSlotCards() {
    const container = document.getElementById('set-slots-container');
    if (!container) return;

    SET_SLOTS.forEach(sl => {
        const card = document.createElement('div');
        card.className      = 'set-slot-card';
        card.dataset.slotId = sl.id;
        if (sl.isOther) card.dataset.isOther = 'true';

        // ─ Level options (used for both full-level and level-only slots)
        const levelOpts = [1,2,3,4,5,6,7,8,9,10,11,12]
            .map(n => '<option value="' + n + '">+' + n + '</option>').join('');

        let html = '<div class="set-slot-header"><span class="set-slot-name">' + sl.name + '</span></div>';
        html += '<div class="set-slot-body">';

        // — Level + Price (or price-only for Caballo/Botella/Frac)
        if (sl.hasLevel) {
            html +=
                '<div class="set-field set-field-row">' +
                    '<span class="set-field-label">Nivel / Precio</span>' +
                    '<div class="set-field-controls">' +
                        '<select class="set-level">' + levelOpts + '</select>' +
                        '<input type="number" class="set-price" placeholder="Precio CPS" min="0" step="1">' +
                    '</div>' +
                '</div>';
        } else {
            html +=
                '<div class="set-field set-field-row">' +
                    '<span class="set-field-label">Precio</span>' +
                    '<div class="set-field-controls">' +
                        '<input type="number" class="set-price" placeholder="Costo CPS" min="0" step="1">' +
                    '</div>' +
                '</div>';
        }

        // — Socket 1
        if (sl.hasS1) {
            const dbsQty = sl.isWeapon ? SET_SOCKET1_WPN_DBS : SET_SOCKET1_ARM_DBS;
            html +=
                '<div class="set-field">' +
                    '<div class="set-field-row">' +
                        '<label class="set-toggle-label">' +
                            '<input type="checkbox" class="set-s1-cb"> Socket 1' +
                        '</label>' +
                        '<span class="set-cost-dim">' + dbsQty + ' DBS</span>' +
                    '</div>' +
                    '<div class="set-s1-sub set-sub hidden">' +
                        '<label class="set-gem-label">Gema S.Dragón:&nbsp;' +
                            '<input type="number" class="set-s1-gems" min="0" max="1" value="0">' +
                            '&nbsp;<span class="set-gem-max">máx 1 · 85,000 CPS</span>' +
                        '</label>' +
                    '</div>' +
                '</div>';
        }

        // — Socket 2
        if (sl.hasS2) {
            const s2CostHint = sl.isWeapon
                ? SET_SOCKET2_WPN_DBS + ' DBS'
                : '1,890,000 CPS';
            html +=
                '<div class="set-field">' +
                    '<div class="set-field-row">' +
                        '<label class="set-toggle-label">' +
                            '<input type="checkbox" class="set-s2-cb"> Socket 2' +
                        '</label>' +
                        '<span class="set-cost-dim">' + s2CostHint + '</span>' +
                    '</div>' +
                    '<div class="set-s2-sub set-sub hidden">' +
                        '<label class="set-gem-label">Gema S.Dragón:&nbsp;' +
                            '<input type="number" class="set-s2-gems" min="0" max="1" value="0">' +
                            '&nbsp;<span class="set-gem-max">máx 1 · 85,000 CPS</span>' +
                        '</label>' +
                    '</div>' +
                '</div>';
        }

        // — Damage
        if (sl.hasDmg) {
            html +=
                '<div class="set-field set-field-row">' +
                    '<span class="set-field-label">Daño</span>' +
                    '<div class="set-field-controls">' +
                        '<select class="set-dmg">' +
                            '<option value="-3">-3 (base)</option>' +
                            '<option value="-5">-5</option>' +
                            '<option value="-7">-7</option>' +
                        '</select>' +
                        '<span class="set-dmg-cost">0 CPS</span>' +
                    '</div>' +
                '</div>';
        }

        // — HP gems
        if (sl.hasHP) {
            html +=
                '<div class="set-field set-field-row">' +
                    '<span class="set-field-label">HP Gemas</span>' +
                    '<div class="set-field-controls">' +
                        '<input type="number" class="set-hp-gems" min="0" max="255" value="0">' +
                        '<span class="set-hp-info">0 HP</span>' +
                    '</div>' +
                '</div>';
        }

        html += '</div>'; // .set-slot-body
        card.innerHTML = html;

        // ─ Socket visibility toggles (no saveSet here — card listener handles it)
        const s1cb = card.querySelector('.set-s1-cb');
        if (s1cb) s1cb.addEventListener('change', () =>
            card.querySelector('.set-s1-sub').classList.toggle('hidden', !s1cb.checked));

        const s2cb = card.querySelector('.set-s2-cb');
        if (s2cb) s2cb.addEventListener('change', () =>
            card.querySelector('.set-s2-sub').classList.toggle('hidden', !s2cb.checked));

        // ─ Damage cost live label
        const dmgSel = card.querySelector('.set-dmg');
        if (dmgSel) dmgSel.addEventListener('change', () => refreshDmgCost(card, dmgSel.value));

        // ─ HP info live label
        const hpInput = card.querySelector('.set-hp-gems');
        if (hpInput) hpInput.addEventListener('input', () => refreshHPInfo(card, hpInput));

        // ─ One catch-all save listener on the card (fires after all child handlers)
        card.addEventListener('change', saveSet);
        card.addEventListener('input',  saveSet);

        container.appendChild(card);
    });
}

// ─── Live label helpers ───────────────────────────────────────
function refreshDmgCost(card, dmgVal) {
    const el = card.querySelector('.set-dmg-cost');
    if (!el) return;
    let cost = 0;
    if (dmgVal === '-5') cost = SET_DMG_COST_TO_M5;
    if (dmgVal === '-7') cost = SET_DMG_COST_TO_M5 + SET_DMG_COST_TO_M7;
    el.textContent = cost > 0 ? formatCPS(cost) + ' CPS' : '0 CPS';
}

function refreshHPInfo(card, hpInput) {
    const el = card.querySelector('.set-hp-info');
    if (!el) return;
    const gems = Math.min(parseInt(hpInput.value) || 0, SET_HP_MAX);
    if (parseInt(hpInput.value) > SET_HP_MAX) hpInput.value = SET_HP_MAX;
    el.textContent = gems + ' HP';
}

// ─── Calculate set ────────────────────────────────────────────
function calculateSet() {
    const dbsPrice = parseFloat(document.getElementById('set-dbs-price').value) || 0;

    let totalMainCost    = 0;
    let totalOtherCost   = 0;
    let totalS1DBS       = 0;
    let totalS2AmaOpens  = 0;   // non-weapon S2 (amatistas)
    let totalS2WpnDBS    = 0;   // weapon S2 (DBS)
    let totalSocketGems  = 0;
    let totalHPGems      = 0;
    let totalTortoise    = 0;
    let totalHP          = 0;

    document.querySelectorAll('#set-slots-container .set-slot-card').forEach((card, idx) => {
        const sl    = SET_SLOTS[idx];
        const price = parseFloat(card.querySelector('.set-price')?.value) || 0;

        if (sl.isOther) totalOtherCost += price;
        else            totalMainCost  += price;

        if (sl.hasS1) {
            const cb = card.querySelector('.set-s1-cb');
            if (cb?.checked) {
                totalS1DBS += sl.isWeapon ? SET_SOCKET1_WPN_DBS : SET_SOCKET1_ARM_DBS;
                totalSocketGems += Math.min(parseInt(card.querySelector('.set-s1-gems')?.value) || 0, 1);
            }
        }

        if (sl.hasS2) {
            const cb = card.querySelector('.set-s2-cb');
            if (cb?.checked) {
                if (sl.isWeapon) totalS2WpnDBS += SET_SOCKET2_WPN_DBS;
                else             totalS2AmaOpens++;
                totalSocketGems += Math.min(parseInt(card.querySelector('.set-s2-gems')?.value) || 0, 1);
            }
        }

        if (sl.hasDmg) {
            const dmg = card.querySelector('.set-dmg')?.value || '-3';
            if (dmg === '-5') totalTortoise += 3;
            if (dmg === '-7') totalTortoise += 8; // 3 + 5
        }

        if (sl.hasHP) {
            const hpG = Math.min(parseInt(card.querySelector('.set-hp-gems')?.value) || 0, SET_HP_MAX);
            totalHPGems += hpG;
            totalHP     += hpG;
        }
    });

    const totalS1Cost       = totalS1DBS * dbsPrice;
    const totalS2AmaCost    = totalS2AmaOpens * SET_SOCKET2_AMETHYSTS * SET_PRICE_AMETHYST;
    const totalS2WpnCost    = totalS2WpnDBS * dbsPrice;
    const totalS2Cost       = totalS2AmaCost + totalS2WpnCost;
    const totalSuperGemCost = (totalSocketGems + totalHPGems) * SET_PRICE_SUPER_GEM;
    const totalTortoiseCost = totalTortoise * SET_PRICE_TORTOISE_GEM;
    const grandTotal    = totalMainCost + totalOtherCost + totalS1Cost + totalS2Cost + totalSuperGemCost + totalTortoiseCost;
    const usdRate       = parseFloat(document.getElementById('set-usd-rate')?.value) || 8;
    const grandTotalUSD = (grandTotal / 1000000) * usdRate;

    renderSetResults({
        dbsPrice,
        totalMainCost, totalOtherCost,
        totalS1DBS, totalS1Cost,
        totalS2AmaOpens, totalS2AmaCost,
        totalS2WpnDBS,   totalS2WpnCost,
        totalSocketGems, totalHPGems, totalSuperGemCost,
        totalTortoise, totalTortoiseCost,
        totalHP, grandTotal, usdRate, grandTotalUSD,
    });

    const resEl = document.getElementById('set-results');
    resEl.removeAttribute('hidden');
    resEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Render results panel ─────────────────────────────────────
function renderSetResults(d) {
    const allGems = d.totalSocketGems + d.totalHPGems;
    const s2AmaLabel = d.totalS2AmaOpens + ' apertura' + (d.totalS2AmaOpens !== 1 ? 's' : '') + ' &times; 1,890,000 CPS';
    const s2WpnLabel = formatCPS(d.totalS2WpnDBS) + ' DBS &times; ' + formatCPS(d.dbsPrice) + ' CPS';

    const html =
        '<div class="set-res-title">⚔ Resumen del Set de Personaje</div>' +
        '<div class="set-res-rows">' +
            setResRow('Equipo principal (Casco, Collar, Anillo, Armadura, Armas, Botas)', d.totalMainCost) +
            setResRow('Items especiales (Caballo, Botella, Frac)',                         d.totalOtherCost) +
            setResRow('Socket 1 &mdash; ' + formatCPS(d.totalS1DBS) + ' DBS &times; ' + formatCPS(d.dbsPrice) + ' CPS', d.totalS1Cost) +
            (d.totalS2AmaOpens > 0 ? setResRow('Socket 2 armaduras &mdash; ' + s2AmaLabel, d.totalS2AmaCost) : '') +
            (d.totalS2WpnDBS   > 0 ? setResRow('Socket 2 armas &mdash; '     + s2WpnLabel, d.totalS2WpnCost) : '') +
            (d.totalS2AmaOpens === 0 && d.totalS2WpnDBS === 0 ? setResRow('Socket 2', 0) : '') +
            setResRow('Gemas Super de Drag&oacute;n &mdash; ' + allGems + ' gemas &times; 85,000 CPS', d.totalSuperGemCost) +
            '<div class="set-res-sub">' +
                '<span>Sockets: ' + d.totalSocketGems + '</span>' +
                '<span>HP: '      + d.totalHPGems      + '</span>' +
            '</div>' +
            setResRow('Gemas Tortoise (Da&ntilde;o) &mdash; ' + d.totalTortoise + ' gemas &times; 114,000 CPS', d.totalTortoiseCost) +
        '</div>' +
        '<div class="set-res-hp">&#10084; HP Total del Set: <strong>' + d.totalHP + ' HP</strong>' +
            (d.totalHP > 0 ? ' &nbsp;(' + formatCPS(d.totalHP) + ' Gemas Super)' : '') +
        '</div>' +
        '<div class="set-res-grand">' +
            '<span>COSTO TOTAL DEL SET</span>' +
            '<div class="set-grand-values">' +
                '<span class="set-total-value">' + formatCPS(d.grandTotal) + ' CPS</span>' +
                '<span class="set-total-usd">&#8776; ' + d.grandTotalUSD.toFixed(2) + ' USD</span>' +
                '<span class="set-total-usd-note">(1M CPS = ' + d.usdRate + ' USD)</span>' +
            '</div>' +
        '</div>';

    document.getElementById('set-results').innerHTML = html;
}

function setResRow(label, value) {
    return '<div class="set-res-row"><span>' + label + '</span><span class="gold">' + formatCPS(value) + ' CPS</span></div>';
}

// ─── LocalStorage persistence ─────────────────────────────────
function saveSet() {
    if (_setLoading) return;

    const dbsPrice = parseFloat(document.getElementById('set-dbs-price')?.value) || 25000;
    const usdRate  = parseFloat(document.getElementById('set-usd-rate')?.value)  || 8;
    const slots    = {};

    document.querySelectorAll('#set-slots-container .set-slot-card').forEach((card, idx) => {
        const sl = SET_SLOTS[idx];
        const sd = { price: parseFloat(card.querySelector('.set-price')?.value) || 0 };

        if (sl.hasLevel)  sd.level  = parseInt(card.querySelector('.set-level')?.value)  || 1;
        if (sl.hasS1) {
            sd.s1     = !!card.querySelector('.set-s1-cb')?.checked;
            sd.s1gems = parseInt(card.querySelector('.set-s1-gems')?.value) || 0;
        }
        if (sl.hasS2) {
            sd.s2     = !!card.querySelector('.set-s2-cb')?.checked;
            sd.s2gems = parseInt(card.querySelector('.set-s2-gems')?.value) || 0;
        }
        if (sl.hasDmg) sd.dmg    = card.querySelector('.set-dmg')?.value    || '-3';
        if (sl.hasHP)  sd.hpGems = parseInt(card.querySelector('.set-hp-gems')?.value) || 0;

        slots[sl.id] = sd;
    });

    localStorage.setItem('co_set_personaje', JSON.stringify({ dbsPrice, usdRate, slots }));
}

function loadSet() {
    _setLoading = true;
    try {
        const data = JSON.parse(localStorage.getItem('co_set_personaje'));
        if (data) {
            const dbsEl = document.getElementById('set-dbs-price');
            if (dbsEl && data.dbsPrice) dbsEl.value = data.dbsPrice;
            const usdEl = document.getElementById('set-usd-rate');
            if (usdEl && data.usdRate)  usdEl.value = data.usdRate;

            document.querySelectorAll('#set-slots-container .set-slot-card').forEach((card, idx) => {
                const sl = SET_SLOTS[idx];
                const sd = data.slots?.[sl.id];
                if (!sd) return;

                if (sl.hasLevel && sd.level) {
                    const el = card.querySelector('.set-level');
                    if (el) el.value = sd.level;
                }

                const priceEl = card.querySelector('.set-price');
                if (priceEl && sd.price) priceEl.value = sd.price;

                if (sl.hasS1 && sd.s1 !== undefined) {
                    const cb = card.querySelector('.set-s1-cb');
                    if (cb) {
                        cb.checked = sd.s1;
                        card.querySelector('.set-s1-sub')?.classList.toggle('hidden', !sd.s1);
                    }
                    const gemEl = card.querySelector('.set-s1-gems');
                    if (gemEl && sd.s1gems != null) gemEl.value = sd.s1gems;
                }

                if (sl.hasS2 && sd.s2 !== undefined) {
                    const cb = card.querySelector('.set-s2-cb');
                    if (cb) {
                        cb.checked = sd.s2;
                        card.querySelector('.set-s2-sub')?.classList.toggle('hidden', !sd.s2);
                    }
                    const gemEl = card.querySelector('.set-s2-gems');
                    if (gemEl && sd.s2gems != null) gemEl.value = sd.s2gems;
                }

                if (sl.hasDmg && sd.dmg) {
                    const el = card.querySelector('.set-dmg');
                    if (el) { el.value = sd.dmg; refreshDmgCost(card, sd.dmg); }
                }

                if (sl.hasHP && sd.hpGems != null) {
                    const el = card.querySelector('.set-hp-gems');
                    if (el) { el.value = sd.hpGems; refreshHPInfo(card, el); }
                }
            });
        }
    } catch { /* ignore corrupt data */ }
    _setLoading = false;
}

// ─── Initialize SET tab ───────────────────────────────────────
(function initSet() {
    const container = document.getElementById('set-slots-container');
    if (!container) return;

    generateSlotCards();
    loadSet();

    document.getElementById('btn-set-calculate')?.addEventListener('click', calculateSet);
    document.getElementById('set-dbs-price')?.addEventListener('input', saveSet);
    document.getElementById('set-usd-rate')?.addEventListener('input',  saveSet);
})();
