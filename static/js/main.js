let allUnits = [];
let draggedFromSlot = null;

const traitData = {
    "Noxus": [3, 5, 7, 10], "Demacia": [3, 5, 7, 9], "Ionia": [3, 6, 9],
    "Freljord": [2, 3, 4], "Zaun": [2, 4, 6], "Void": [3, 6, 8],
    "Yordle": [3, 5], "Arcanist": [2, 4, 6, 8], "Bruiser": [2, 4, 6],
    "Bilgewater": [3, 5, 7, 9], "Shadow Isles": [2, 4, 6], "Shurima": [3, 5, 7, 9],
    "Targon": [2, 3, 4], "Ixtal": [2, 3, 4], "Piltover": [3, 6],
    "Invoker": [2, 4, 6], "Juggernaut": [2, 4, 6], "Vanquisher": [2, 4, 6],
    "Warden": [2, 4, 6], "Quickstriker": [2, 3, 4], "The Boss": [1],
    "Star Forger": [1], "Emperor": [1], "Ascendant": [1], "Eternal": [1]
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
        
        // WICHTIG: Erst das Board zeichnen, dann Synergien (leer) initialisieren
        drawBoard(); 
        updateSynergies(); 
        loadUnitBank();
    } else {
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('planner-section').style.display = 'none';
        // Cleanup: Synergie-Liste leeren, wenn man sich ausloggt
        document.getElementById('synergy-list').innerHTML = '';
    }
}

function logout() {
    sessionStorage.removeItem('tft_user');
    renderApp();
}

// --- BOARD STEUERUNG ---
function clearBoard() {
    // Bestätigung entfernt, leert das Board sofort
    const slots = document.querySelectorAll('.hex-slot');
    slots.forEach(slot => clearUnit(slot));
    updateSynergies();
}

function drawBoard() {
    const board = document.getElementById('tft-board');
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

// --- SYNERGIEN & BANK ---
function updateSynergies() {
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

    const list = document.getElementById('synergy-list');
    list.innerHTML = ''; // Liste wird hier jedes Mal komplett geleert
    
    Object.entries(counts).sort((a,b) => b[1]-a[1]).forEach(([traitName, count]) => {
        const bps = traitData[traitName] || [2, 4, 6];
        let tierClass = ""; let isActive = false;
        for (let i = 0; i < bps.length; i++) {
            if (count >= bps[i]) {
                isActive = true;
                tierClass = ["tier-bronze", "tier-silver", "tier-gold", "tier-prismatic"][Math.min(i, 3)];
            }
        }
        const iconName = traitName.toLowerCase().replace(/\s+/g, '');
        list.innerHTML += `
            <div class="synergy-item ${isActive ? 'active' : ''} ${tierClass}">
                <div class="synergy-info">
                    <img src="/static/img/traits/${iconName}.png" class="trait-icon-mini" onerror="this.style.display='none'">
                    <span>${traitName}</span>
                </div>
                <span class="synergy-count">${count}</span>
            </div>`;
    });
}

async function loadUnitBank() {
    const response = await fetch('/api/units');
    allUnits = await response.json();
    populateTraitFilter();
    displayUnits(allUnits);
}

function populateTraitFilter() {
    const select = document.getElementById('trait-filter');
    const traits = new Set();
    allUnits.forEach(u => u.traits.forEach(t => traits.add(t)));
    select.innerHTML = '<option value="">Alle Traits</option>';
    Array.from(traits).sort().forEach(t => select.innerHTML += `<option value="${t}">${t}</option>`);
}

function filterUnits() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const trait = document.getElementById('trait-filter').value;
    const cost = document.getElementById('cost-filter').value;
    const filtered = allUnits.filter(u => 
        u.name.toLowerCase().includes(search) && 
        (trait === "" || u.traits.includes(trait)) &&
        (cost === "" || u.cost == cost)
    );
    displayUnits(filtered);
}

function displayUnits(units) {
    const bank = document.getElementById('unit-bank');
    bank.innerHTML = '';
    units.forEach(unit => {
        const card = document.createElement('div');
        card.className = 'unit-card';
        card.draggable = true;
        card.innerHTML = `<div class="icon-container cost-${unit.cost}"><img src="${unit.icon}" class="unit-icon" draggable="false"></div><div class="unit-name">${unit.name}</div>`;
        card.ondragstart = (e) => { draggedFromSlot = null; e.dataTransfer.setData('application/json', JSON.stringify(unit)); };
        bank.appendChild(card);
    });
}

document.getElementById('login-form').onsubmit = (e) => handleAuth('login', e);
window.onload = renderApp;