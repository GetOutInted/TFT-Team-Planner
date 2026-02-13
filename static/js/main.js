/**
 * TFT Team Planner - Vollständige JS Logik
 */

let allUnits = []; 

// 1. Authentifizierung
async function handleAuth(type) {
    const userVal = document.getElementById('username').value;
    const passVal = document.getElementById('password').value;
    if (!userVal || !passVal) return alert("Bitte alle Felder ausfüllen!");

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
            } else { alert("Registrierung erfolgreich! Bitte einloggen."); }
        } else { alert(data.error || "Fehler"); }
    } catch (err) { console.error("Auth-Fehler:", err); }
}

// 2. Laden der Daten
async function loadUnitBank() {
    try {
        const response = await fetch('/api/units');
        allUnits = await response.json();
        populateTraitFilter();
        displayUnits(allUnits);
    } catch (e) { console.error("Fehler beim Laden:", e); }
}

// 3. Filter-Logik
function populateTraitFilter() {
    const traitSelect = document.getElementById('trait-filter');
    if (!traitSelect) return;
    traitSelect.innerHTML = '<option value="">Alle Traits</option>';
    
    const traits = new Set();
    allUnits.forEach(u => u.traits.forEach(t => traits.add(t)));
    
    Array.from(traits).sort().forEach(trait => {
        const opt = document.createElement('option');
        opt.value = trait;
        opt.innerText = trait;
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

// 4. Anzeige der Einheiten
function displayUnits(units) {
    const bank = document.getElementById('unit-bank');
    if (!bank) return;
    bank.innerHTML = '';

    units.forEach(unit => {
        const card = document.createElement('div');
        card.className = 'unit-card';
        const initial = unit.name ? unit.name.charAt(0) : '?';
        
        card.innerHTML = `
            <div class="icon-container cost-${unit.cost}">
                <img src="${unit.icon}" class="unit-icon" alt="${unit.name}"
                     onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=fallback-char>${initial}</span>'">
            </div>
            <div class="unit-name">${unit.name}</div>
        `;

        card.onclick = () => {
            console.log("Ausgewählt:", unit.name);
        };
        
        bank.appendChild(card);
    });
}

// 5. Board Zeichnen
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
            wrapper.appendChild(slot);
            rowDiv.appendChild(wrapper);
        }
        board.appendChild(rowDiv);
    }
}

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
        authSection.style.display = 'block';
        plannerSection.style.display = 'none';
    }
}

function logout() { sessionStorage.clear(); location.reload(); }
window.onload = renderApp;