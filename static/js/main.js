let allUnits = [];
let draggedFromSlot = null;

// Synergie-Grenzwerte
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

document.addEventListener('DOMContentLoaded', async () => {
    const boardElement = document.getElementById('tft-board');
    if (boardElement) {
        drawBoard();
        await fetchUnits(); // Warten, bis die Units geladen sind
        
        // Prüfen, ob wir ein Board aus dem Profil laden sollen
        const urlParams = new URLSearchParams(window.location.search);
        const boardId = urlParams.get('board_id');
        if (boardId) {
            console.log("Erkannte Board-ID in URL:", boardId);
            fetchAndApplyBoard(boardId);
        }
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            handleAuth('login');
        };
    }
});

// --- BACKEND API ---
async function handleAuth(type) {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    const res = await fetch(`/${type}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: user, password: pass})
    });
    
    if (res.ok) window.location.href = '/planner';
    else alert((await res.json()).error);
}

async function fetchUnits() {
    const res = await fetch('/api/units');
    allUnits = await res.json();
    populateTraitFilter();
    displayUnits(allUnits);
}

// --- BOARD LOGIK ---
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
            slot.dataset.index = `${r}-${c}`;
            
            slot.draggable = true;
            slot.ondragstart = (e) => {
                if (!slot.dataset.unit) return e.preventDefault();
                draggedFromSlot = slot;
                e.dataTransfer.setData('application/json', slot.dataset.unit);
            };
            slot.ondragover = (e) => e.preventDefault();
            slot.ondrop = (e) => handleDrop(e, slot);
            slot.oncontextmenu = (e) => { e.preventDefault(); clearUnit(slot); };

            wrap.appendChild(slot);
            row.appendChild(wrap);
        }
        board.appendChild(row);
    }
}

function handleDrop(e, slot) {
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
    updateSynergies();
}

function clearBoard() {
    document.querySelectorAll('.hex-slot').forEach(s => {
        s.innerHTML = '';
        delete s.dataset.unit;
        s.parentElement.className = 'hex-wrapper';
    });
    updateSynergies();
}

// --- SYNERGIE BERECHNUNG ---
function updateSynergies() {
    const list = document.getElementById('synergy-list');
    if (!list) return;
    
    const slots = document.querySelectorAll('.hex-slot');
    const counts = {};
    const seenNames = new Set();

    slots.forEach(slot => {
        if (slot.dataset.unit) {
            const unit = JSON.parse(slot.dataset.unit);
            if (!seenNames.has(unit.name)) {
                seenNames.add(unit.name);
                unit.traits.forEach(t => counts[t] = (counts[t] || 0) + 1);
            }
        }
    });

    const traitsArray = Object.entries(counts).map(([trait, count]) => {
        const thresholds = traitData[trait] || [2, 4, 6];
        let tierClass = "";
        let isActive = false;
        let tierLevel = 0; 

        for (let i = 0; i < thresholds.length; i++) {
            if (count >= thresholds[i]) {
                isActive = true;
                if (thresholds.length === 1 && thresholds[0] === 1) {
                    tierClass = "tier-gold";
                    tierLevel = 3; 
                } else {
                    tierClass = ["tier-bronze", "tier-silver", "tier-gold", "tier-prismatic"][Math.min(i, 3)];
                    tierLevel = i + 1; 
                }
            }
        }
        return { trait, count, thresholds, isActive, tierClass, tierLevel };
    });

    traitsArray.sort((a, b) => {
        if (b.tierLevel !== a.tierLevel) {
            return b.tierLevel - a.tierLevel; 
        }
        return a.trait.localeCompare(b.trait);
    });

    list.innerHTML = '';
    traitsArray.forEach(t => {
        const item = document.createElement('div');
        item.className = `synergy-item ${t.isActive ? 'active' : ''} ${t.tierClass}`;
        item.innerHTML = `
            <div class="synergy-count-box">${t.count}</div>
            <div>
                <div style="font-weight:bold; font-size:0.85rem;">${t.trait}</div>
                <div style="font-size:0.7rem; opacity:0.7;">${t.thresholds.join(' / ')}</div>
            </div>
        `;
        list.appendChild(item);
    });
}

// --- FILTER & BANK ---
function displayUnits(units) {
    const bank = document.getElementById('unit-bank');
    if (!bank) return;
    bank.innerHTML = '';
    units.forEach(unit => {
        const div = document.createElement('div');
        div.className = 'unit-card';
        div.innerHTML = `
            <div class="icon-container cost-${unit.cost}"><img src="${unit.icon}" class="unit-icon"></div>
            <div style="font-size:0.75rem; margin-top:4px;">${unit.name}</div>
        `;
        div.draggable = true;
        div.ondragstart = (e) => {
            draggedFromSlot = null;
            e.dataTransfer.setData('application/json', JSON.stringify(unit));
        };
        div.onclick = () => {
            const emptySlot = Array.from(document.querySelectorAll('.hex-slot')).find(s => !s.dataset.unit);
            if (emptySlot) { placeUnit(emptySlot, unit); updateSynergies(); }
        };
        bank.appendChild(div);
    });
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

function populateTraitFilter() {
    const select = document.getElementById('trait-filter');
    if (!select) return;
    const traits = new Set();
    allUnits.forEach(u => u.traits.forEach(t => traits.add(t)));
    select.innerHTML = '<option value="">Alle Traits</option>';
    Array.from(traits).sort().forEach(t => select.innerHTML += `<option value="${t}">${t}</option>`);
}

function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('trait-filter').value = '';
    document.getElementById('cost-filter').value = '';
    filterUnits();
}

// --- PROFILE ACTIONS & BOARD LADEN ---
async function saveCurrentBoard() {
    const name = document.getElementById('board-name').value || "Unbenanntes Team";
    const layout = [];
    document.querySelectorAll('.hex-slot').forEach(slot => {
        if (slot.dataset.unit) {
            layout.push({ index: slot.dataset.index, unit: JSON.parse(slot.dataset.unit) });
        }
    });

    const res = await fetch('/api/save_board', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, layout })
    });
    if (res.ok) alert("Board gespeichert!");
}

function loadBoard(id) {
    window.location.href = `/planner?board_id=${id}`;
}

async function fetchAndApplyBoard(id) {
    try {
        console.log("Frage Backend nach Board mit ID:", id);
        const res = await fetch(`/api/get_board/${id}`);
        
        if (res.ok) {
            const data = await res.json();
            console.log("Erfolgreich geladene Board-Daten:", data);
            
            const nameInput = document.getElementById('board-name');
            if (nameInput) nameInput.value = data.name;
            
            // Absicherung: Falls die Daten als JSON-String statt als Array ankommen
            let layoutData = data.layout;
            if (typeof layoutData === 'string') {
                layoutData = JSON.parse(layoutData);
            }
            
            if (layoutData && Array.isArray(layoutData)) {
                layoutData.forEach(item => {
                    const slot = document.querySelector(`.hex-slot[data-index="${item.index}"]`);
                    if (slot && item.unit) {
                        placeUnit(slot, item.unit);
                    }
                });
                updateSynergies();
                console.log("Champions erfolgreich platziert!");
            } else {
                console.warn("Das Layout in der Datenbank ist leer oder ungültig.");
            }
        } else {
            console.error("Backend meldet einen Fehler:", res.status, await res.text());
        }
    } catch (error) {
        console.error("Fehler beim Abrufen des Boards:", error);
    }
}

async function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';
    
    await fetch('/api/update_theme', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ theme: newTheme })
    });
    location.reload();
}