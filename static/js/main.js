let allUnits = []; 
let draggedFromSlot = null;

async function handleAuth(type, event) {
    if (event) event.preventDefault();
    const userVal = document.getElementById('username').value;
    const passVal = document.getElementById('password').value;
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
            } else alert("Registriert! Du kannst dich einloggen.");
        } else alert(data.error);
    } catch (e) { console.error(e); }
}

async function loadUnitBank() {
    try {
        const response = await fetch('/api/units');
        allUnits = await response.json();
        populateTraitFilter();
        displayUnits(allUnits);
    } catch (e) { console.error(e); }
}

function populateTraitFilter() {
    const select = document.getElementById('trait-filter');
    if (!select) return;
    const traits = new Set();
    allUnits.forEach(u => u.traits.forEach(t => traits.add(t)));
    select.innerHTML = '<option value="">Alle Traits</option>';
    Array.from(traits).sort().forEach(t => {
        select.innerHTML += `<option value="${t}">${t}</option>`;
    });
}

function filterUnits() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const trait = document.getElementById('trait-filter').value;
    const cost = document.getElementById('cost-filter').value;
    const filtered = allUnits.filter(u => 
        u.name.toLowerCase().includes(search) &&
        (trait === "" || u.traits.includes(trait)) &&
        (cost === "" || u.cost.toString() === cost)
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
        card.innerHTML = `
            <div class="icon-container cost-${unit.cost}">
                <img src="${unit.icon}" class="unit-icon" draggable="false">
            </div>
            <div class="unit-name">${unit.name}</div>
        `;
        card.ondragstart = (e) => {
            draggedFromSlot = null;
            e.dataTransfer.setData('application/json', JSON.stringify(unit));
        };
        bank.appendChild(card);
    });
}

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
    list.innerHTML = '';
    Object.entries(counts).sort((a,b) => b[1]-a[1]).forEach(([t, c]) => {
        list.innerHTML += `<div class="synergy-item"><span>${t}</span><span class="synergy-count">${c}</span></div>`;
    });
}

function drawBoard() {
    const board = document.getElementById('tft-board');
    if(!board) return;
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
            slot.ondragover = (e) => { e.preventDefault(); slot.classList.add('drag-over'); };
            slot.ondragleave = () => slot.classList.remove('drag-over');
            slot.ondrop = (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const data = e.dataTransfer.getData('application/json');
                if (!data) return;
                const incoming = JSON.parse(data);
                const currentAtTarget = slot.dataset.unit;

                if (draggedFromSlot && draggedFromSlot !== slot) {
                    if (currentAtTarget) placeUnit(draggedFromSlot, JSON.parse(currentAtTarget));
                    else clearUnit(draggedFromSlot);
                }
                placeUnit(slot, incoming);
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
    const wrapper = slot.parentElement;
    if (wrapper) {
        wrapper.className = `hex-wrapper cost-${unit.cost}`;
    }
}

function clearUnit(slot) {
    slot.innerHTML = '';
    delete slot.dataset.unit;
    const wrapper = slot.parentElement;
    if (wrapper) {
        wrapper.className = 'hex-wrapper';
    }
}

function renderApp() {
    const user = sessionStorage.getItem('tft_user');
    if (user) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('planner-section').style.display = 'block';
        document.getElementById('user-display').innerText = JSON.parse(user).username;
        drawBoard();
        loadUnitBank();
    }
}

document.getElementById('login-form').onsubmit = (e) => handleAuth('login', e);
function logout() { sessionStorage.clear(); location.reload(); }
window.onload = renderApp;