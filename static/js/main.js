let allUnits = []; 
let draggedFromSlot = null; // Speichert, von welchem Slot verschoben wird

// 1. Authentifizierung
async function handleAuth(type, event) {
    if (event) event.preventDefault();
    const userVal = document.getElementById('username').value;
    const passVal = document.getElementById('password').value;
    if (!userVal || !passVal) return alert("Bitte Felder füllen!");
    try {
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
            } else { alert("Registriert!"); }
        } else { alert(data.error); }
    } catch (err) { console.error(err); }
}

// 2. Daten laden
async function loadUnitBank() {
    try {
        const response = await fetch('/api/units');
        allUnits = await response.json();
        populateTraitFilter();
        displayUnits(allUnits);
    } catch (e) { console.error(e); }
}

// 3. Filter
function populateTraitFilter() {
    const traitSelect = document.getElementById('trait-filter');
    if (!traitSelect) return;
    traitSelect.innerHTML = '<option value="">Alle Traits</option>';
    const traits = new Set();
    allUnits.forEach(u => u.traits.forEach(t => traits.add(t)));
    Array.from(traits).sort().forEach(trait => {
        const opt = document.createElement('option');
        opt.value = trait; opt.innerText = trait;
        traitSelect.appendChild(opt);
    });
}

function filterUnits() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const traitTerm = document.getElementById('trait-filter').value;
    const costTerm = document.getElementById('cost-filter').value;
    const filtered = allUnits.filter(unit => {
        const matchesSearch = unit.name.toLowerCase().includes(searchTerm);
        const matchesTrait = traitTerm === "" || unit.traits.includes(traitTerm);
        const matchesCost = costTerm === "" || unit.cost.toString() === costTerm;
        return matchesSearch && matchesTrait && matchesCost;
    });
    displayUnits(filtered);
}

// 4. Anzeige Champion Bank
function displayUnits(units) {
    const bank = document.getElementById('unit-bank');
    if (!bank) return;
    bank.innerHTML = '';
    units.forEach(unit => {
        const card = document.createElement('div');
        card.className = 'unit-card';
        card.draggable = true;
        card.innerHTML = `
            <div class="icon-container cost-${unit.cost}">
                <img src="${unit.icon}" class="unit-icon" alt="${unit.name}" draggable="false">
            </div>
            <div class="unit-name">${unit.name}</div>
        `;
        card.ondragstart = (e) => {
            draggedFromSlot = null; // Markieren: Kommt aus der Bank
            e.dataTransfer.setData('application/json', JSON.stringify(unit));
        };
        bank.appendChild(card);
    });
}

// 5. Synergie-Update
function updateSynergies() {
    const slots = document.querySelectorAll('.hex-slot');
    const activeTraits = {};
    const seenUnits = new Set();

    slots.forEach(slot => {
        if (slot.dataset.unit) {
            const unit = JSON.parse(slot.dataset.unit);
            if (!seenUnits.has(unit.name)) {
                seenUnits.add(unit.name);
                unit.traits.forEach(t => {
                    activeTraits[t] = (activeTraits[t] || 0) + 1;
                });
            }
        }
    });

    const listContainer = document.getElementById('synergy-list');
    listContainer.innerHTML = '';
    const sortedTraits = Object.entries(activeTraits).sort((a, b) => b[1] - a[1]);

    sortedTraits.forEach(([trait, count]) => {
        const item = document.createElement('div');
        item.className = 'synergy-item';
        item.innerHTML = `<span>${trait}</span> <span class="synergy-count">${count}</span>`;
        listContainer.appendChild(item);
    });
}

// 6. Board & Verschiebe-Logik
function drawBoard() {
    const board = document.getElementById('tft-board');
    if (!board) return;
    board.innerHTML = ''; 
    for (let r = 0; r < 4; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'board-row';
        for (let c = 0; c < 7; c++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'hex-wrapper';
            const slot = document.createElement('div');
            slot.className = 'hex-slot';
            slot.draggable = true; // Board-Slots auch draggable machen

            // START DRAG vom Board
            slot.ondragstart = (e) => {
                if (!slot.dataset.unit) {
                    e.preventDefault();
                    return;
                }
                draggedFromSlot = slot;
                e.dataTransfer.setData('application/json', slot.dataset.unit);
            };

            slot.ondragover = (e) => { e.preventDefault(); slot.classList.add('drag-over'); };
            slot.ondragleave = () => slot.classList.remove('drag-over');

            // DROP auf Board (aus Bank oder anderem Slot)
            slot.ondrop = (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const data = e.dataTransfer.getData('application/json');
                if (!data) return;

                const incomingUnit = JSON.parse(data);
                
                if (draggedFromSlot && draggedFromSlot !== slot) {
                    // Logik für Swap (Tauschen)
                    const unitAtTarget = slot.dataset.unit;
                    
                    // Ziel-Slot füllen
                    placeUnitInHex(slot, incomingUnit);
                    
                    // Ursprungs-Slot leeren oder mit getauschter Unit füllen
                    if (unitAtTarget) {
                        placeUnitInHex(draggedFromSlot, JSON.parse(unitAtTarget));
                    } else {
                        clearHex(draggedFromSlot);
                    }
                } else {
                    // Normales Platzieren aus der Bank
                    placeUnitInHex(slot, incomingUnit);
                }
                updateSynergies();
            };

            slot.oncontextmenu = (e) => {
                e.preventDefault();
                clearHex(slot);
                updateSynergies();
            };

            wrapper.appendChild(slot);
            rowDiv.appendChild(wrapper);
        }
        board.appendChild(rowDiv);
    }
}

function placeUnitInHex(slot, unit) {
    slot.dataset.unit = JSON.stringify(unit);
    slot.innerHTML = `<img src="${unit.icon}" title="${unit.name}" draggable="false">`;
    slot.className = `hex-slot placed-cost-${unit.cost}`;
}

function clearHex(slot) {
    slot.innerHTML = '';
    delete slot.dataset.unit;
    slot.className = 'hex-slot';
}

// 7. App State
function renderApp() {
    const userString = sessionStorage.getItem('tft_user');
    const authSection = document.getElementById('auth-section');
    const plannerSection = document.getElementById('planner-section');
    if (userString) {
        authSection.style.display = 'none';
        plannerSection.style.display = 'block';
        document.getElementById('user-display').innerText = JSON.parse(userString).username;
        drawBoard();
        loadUnitBank();
    } else {
        authSection.style.display = 'flex';
        plannerSection.style.display = 'none';
    }
}

document.getElementById('login-form').onsubmit = (e) => handleAuth('login', e);
function logout() { sessionStorage.clear(); location.reload(); }
window.onload = renderApp;