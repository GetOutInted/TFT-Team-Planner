let allUnits = [];
let draggedFromSlot = null;

const traitData = {
    "Arcanist": [2, 4, 6], "Ascendant": [1], "Assimilator": [1], "Bilgewater": [3, 5, 7, 10],
    "Blacksmith": [1], "Bruiser": [2, 4, 6], "Caretaker": [1], "Chainbreaker": [1],
    "Chronokeeper": [1], "Dark Child": [1], "Darkin": [1, 2, 3], "Defender": [2, 4, 6],
    "Demacia": [3, 5, 7, 11], "Disruptor": [2, 4], "Dragonborn": [1], "Emperor": [1],
    "Eternal": [1], "Freljord": [3, 5, 7], "Glutton": [1], "Gunslinger": [2, 4],
    "Harvester": [1], "Heroic": [1], "HexMech": [1], "Huntress": [1],
    "Immortal": [1], "Invoker": [2, 4], "Ionia": [3, 5, 7, 10], "Ixtal": [3, 5, 7],
    "Juggernaut": [2, 4, 6], "Longshot": [2, 3, 4, 5], "Noxus": [3, 5, 7, 10],
    "Piltover": [2, 4, 6], "Quickstriker": [2, 3, 4, 5], "Riftscourge": [1],
    "Rune Mage": [1], "Shadow Isles": [2, 3, 4, 5], "Shurima": [2, 3, 4],
    "Slayer": [2, 4, 6], "Soulbound": [1], "Star Forger": [1], "Targon": [1],
    "The Boss": [1], "Vanquisher": [2, 3, 4, 5], "Void": [2, 4, 6, 9],
    "Warden": [2, 3, 4, 5], "World Ender": [1], "Yordle": [2, 4, 5, 8, 10],
    "Zaun": [3, 5, 7]
};

// --- AUTH ---
async function handleAuth(type, event) {
    if (event) event.preventDefault();
    const userVal = document.getElementById('username').value;
    const passVal = document.getElementById('password').value;
    const response = await fetch(`/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userVal, password: passVal })
    });
    const data = await response.json();
    if (response.ok) {
        if (type === 'login') {
            sessionStorage.setItem('tft_user', JSON.stringify(data));
            renderApp();
        } else alert("Registrierung erfolgreich!");
    } else alert(data.error);
}

function renderApp() {
    const user = sessionStorage.getItem('tft_user');
    if (user) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('planner-section').style.display = 'block';
        document.getElementById('user-display').innerText = JSON.parse(user).username;
        resetFilters(false);
        drawBoard(); 
        updateSynergies(); 
        loadUnitBank();
    } else {
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('planner-section').style.display = 'none';
        document.getElementById('synergy-list').innerHTML = '';
        document.getElementById('tft-board').innerHTML = '';
    }
}

function resetFilters(shouldRefresh = false) {
    const search = document.getElementById('search-input');
    const trait = document.getElementById('trait-filter');
    const cost = document.getElementById('cost-filter');
    if (search) search.value = '';
    if (trait) trait.value = '';
    if (cost) cost.value = '';
    if (shouldRefresh) filterUnits();
}

function logout() {
    sessionStorage.removeItem('tft_user');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    resetFilters(false);
    renderApp();
}

// --- BOARD STEUERUNG ---
function clearBoard() {
    const slots = document.querySelectorAll('.hex-slot');
    slots.forEach(slot => clearUnit(slot));
    updateSynergies();
}

function drawBoard() {
    const board = document.getElementById('tft-board');
    if (!board) return;
    board.innerHTML = '';
    for (let r = 0; r < 4; r++) {
        const row = document.createElement('div');
        row.className = 'board-row';
        for (let c = 0; c < 7; c++) {
            const wrap = document.createElement('div');
            wrap.className = 'hex-wrapper';
            const slot = document.createElement('div');
            slot.className = 'hex-slot';
            slot.draggable = true;
            slot.ondragstart = (e) => {
                if (!slot.dataset.unit) return e.preventDefault();
                draggedFromSlot = slot;
                e.dataTransfer.setData('application/json', slot.dataset.unit);
            };
            slot.ondragover = (e) => e.preventDefault();
            slot.ondrop = (e) => {
                e.preventDefault();
                const data = e.dataTransfer.getData('application/json');
                if (!data) return;
                const unit = JSON.parse(data);
                if (draggedFromSlot && draggedFromSlot !== slot) {
                    const targetData = slot.dataset.unit;
                    if (targetData) placeUnit(draggedFromSlot, JSON.parse(targetData));
                    else clearUnit(draggedFromSlot);
                }
                placeUnit(slot, unit);
                updateSynergies();
            };
            slot.oncontextmenu = (e) => { e.preventDefault(); clearUnit(slot); updateSynergies(); };
            wrap.appendChild(slot);
            row.appendChild(wrap);
        }
        board.appendChild(row);
    }
}

function placeUnit(slot, unit) {
    slot.dataset.unit = JSON.stringify(unit);
    slot.innerHTML = `<img src="${unit.icon}" draggable="false">`;
    slot.parentElement.className = `hex-wrapper cost-${unit.cost}`;
}

function clearUnit(slot) {
    slot.innerHTML = '';
    delete slot.dataset.unit;
    slot.parentElement.className = 'hex-wrapper';
}

// --- SYNERGIEN ---
function updateSynergies() {
    const list = document.getElementById('synergy-list');
    if (!list) return;
    const slots = document.querySelectorAll('.hex-slot');
    const counts = {};
    const seen = new Set();
    slots.forEach(s => {
        if (s.dataset.unit) {
            const u = JSON.parse(s.dataset.unit);
            if (!seen.has(u.name)) {
                seen.add(u.name);
                u.traits.forEach(t => counts[t] = (counts[t] || 0) + 1);
            }
        }
    });
    list.innerHTML = ''; 
    const sortedTraits = Object.entries(counts).sort((a, b) => {
        const nameA = a[0]; const countA = a[1];
        const nameB = b[0]; const countB = b[1];
        const bpsA = traitData[nameA] || [2, 4, 6];
        const bpsB = traitData[nameB] || [2, 4, 6];
        let tierA = -1;
        if (bpsA.length === 1 && countA >= bpsA[0]) tierA = 2;
        else { for (let i = 0; i < bpsA.length; i++) { if (countA >= bpsA[i]) tierA = i; } }
        let tierB = -1;
        if (bpsB.length === 1 && countB >= bpsB[0]) tierB = 2;
        else { for (let i = 0; i < bpsB.length; i++) { if (countB >= bpsB[i]) tierB = i; } }
        if (tierA !== tierB) return tierB - tierA;
        return nameA.localeCompare(nameB);
    });
    sortedTraits.forEach(([traitName, count]) => {
        const bps = traitData[traitName] || [2, 4, 6];
        let tierClass = ""; let isActive = false;
        for (let i = 0; i < bps.length; i++) {
            if (count >= bps[i]) {
                isActive = true;
                if (bps.length === 1) tierClass = "tier-gold";
                else tierClass = ["tier-bronze", "tier-silver", "tier-gold", "tier-prismatic"][Math.min(i, 3)];
            }
        }
        const iconName = traitName.toLowerCase().replace(/\s+/g, '');
        list.innerHTML += `
            <div class="synergy-item ${isActive ? 'active' : ''} ${tierClass}">
                <div class="synergy-info">
                    <div class="trait-icon-container">
                        <img src="/static/img/traits/${iconName}.png" class="trait-icon-mini" onerror="this.style.display='none'">
                    </div>
                    <div class="synergy-count-box">${count}</div>
                    <div class="synergy-text-data">
                        <div class="synergy-name">${traitName}</div>
                        <div class="synergy-thresholds">${bps.join(' / ')}</div>
                    </div>
                </div>
            </div>`;
    });
}

// --- BANK & FILTER ---
async function loadUnitBank() {
    try {
        const response = await fetch('/api/units');
        allUnits = await response.json();
        populateTraitFilter();
        filterUnits();
    } catch (e) { console.error(e); }
}

function populateTraitFilter() {
    const select = document.getElementById('trait-filter');
    if (!select) return;
    const traits = new Set();
    allUnits.forEach(u => u.traits.forEach(t => traits.add(t)));
    select.innerHTML = '<option value="">Alle Traits</option>';
    Array.from(traits).sort().forEach(t => select.innerHTML += `<option value="${t}">${t}</option>`);
}

function filterUnits() {
    const searchInput = document.getElementById('search-input');
    const traitFilter = document.getElementById('trait-filter');
    const costFilter = document.getElementById('cost-filter');
    if (!searchInput || !traitFilter || !costFilter) return;
    const search = searchInput.value.toLowerCase();
    const trait = traitFilter.value;
    const cost = costFilter.value;
    const filtered = allUnits.filter(u => 
        u.name.toLowerCase().includes(search) && 
        (trait === "" || u.traits.includes(trait)) &&
        (cost === "" || u.cost == cost)
    );
    displayUnits(filtered);
}

function displayUnits(units) {
    const bank = document.getElementById('unit-bank');
    if (!bank) return;
    bank.innerHTML = '';
    units.forEach(unit => {
        const card = document.createElement('div');
        card.className = 'unit-card';
        card.draggable = true;
        card.onclick = () => {
            const slots = document.querySelectorAll('.hex-slot');
            for (let slot of slots) {
                if (!slot.dataset.unit) { placeUnit(slot, unit); updateSynergies(); break; }
            }
        };
        card.ondragstart = (e) => { 
            draggedFromSlot = null; e.dataTransfer.setData('application/json', JSON.stringify(unit)); 
        };
        card.innerHTML = `<div class="icon-container cost-${unit.cost}"><img src="${unit.icon}" class="unit-icon" draggable="false"></div><div class="unit-name">${unit.name}</div>`;
        bank.appendChild(card);
    });
}

document.getElementById('login-form').onsubmit = (e) => handleAuth('login', e);
window.onload = renderApp;