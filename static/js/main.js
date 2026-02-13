/**
 * TFT Team Planner - Frontend Logik
 */

// 1. Authentifizierung: Login & Registrierung
async function handleAuth(type) {
    const userField = document.getElementById('username');
    const passField = document.getElementById('password');
    const userVal = userField.value;
    const passVal = passField.value;

    if (!userVal || !passVal) {
        alert("Bitte fülle alle Felder aus!");
        return;
    }

    try {
        const response = await fetch(`/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userVal, password: passVal })
        });

        const data = await response.json();

        if (response.ok) {
            if (type === 'login') {
                localStorage.setItem('tft_user', JSON.stringify(data));
                renderApp();
            } else {
                alert("Registrierung erfolgreich! Du kannst dich jetzt einloggen.");
            }
        } else {
            alert("Fehler: " + (data.error || "Unbekannter Fehler"));
        }
    } catch (err) {
        console.error("Auth-Fehler:", err);
        alert("Server ist nicht erreichbar.");
    }
}

// 2. Champion-Bank: Units vom Backend laden und anzeigen
async function loadUnitBank() {
    try {
        const response = await fetch('/api/units');
        const units = await response.json();
        
        const bank = document.getElementById('unit-bank');
        if (!bank) return;
        
        bank.innerHTML = '';

        console.log("Units empfangen:", units.length);

        if (units.length === 0) {
            bank.innerHTML = '<p style="color: #94a3b8; grid-column: 1/-1;">Keine Champions in der Datenbank. Bitte app.py neu starten.</p>';
            return;
        }

        units.forEach(unit => {
            const card = document.createElement('div');
            card.className = 'unit-card';
            
            // onerror sorgt für ein Ersatzbild, falls der Pfad von CommunityDragon hakt
            card.innerHTML = `
                <img src="${unit.icon}" 
                     class="unit-icon cost-${unit.cost}" 
                     alt="${unit.name}"
                     onerror="this.src='https://via.placeholder.com/50/2c2c54/ffffff?text=?'">
                <div class="unit-name">${unit.name}</div>
            `;
            
            card.onclick = () => {
                console.log("Champion ausgewählt:", unit.name, "Traits:", unit.traits);
                // Hier kommt später die Platzierungs-Logik hin
            };
            
            bank.appendChild(card);
        });
    } catch (e) {
        console.error("Fehler beim Laden der Unit-Bank:", e);
    }
}

// 3. Board-Generierung: Das Hexagon-Spielfeld zeichnen
function drawBoard() {
    const board = document.getElementById('tft-board');
    if (!board) return;
    
    board.innerHTML = ''; 

    const rows = 4;
    const cols = 7;

    for (let r = 0; r < rows; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'board-row';

        for (let c = 0; c < cols; c++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'hex-wrapper';

            const slot = document.createElement('div');
            slot.className = 'hex-slot';
            
            const slotId = (r * cols) + c;
            slot.dataset.pos = slotId;
            // slot.innerText = slotId; // Optional: ID anzeigen zum Debuggen

            wrapper.appendChild(slot);
            rowDiv.appendChild(wrapper);
        }
        board.appendChild(rowDiv);
    }
}

// 4. App-Status: Prüfen ob eingeloggt und Ansicht umschalten
function renderApp() {
    const userString = localStorage.getItem('tft_user');
    const authSection = document.getElementById('auth-section');
    const plannerSection = document.getElementById('planner-section');
    
    if (userString) {
        const user = JSON.parse(userString);
        authSection.style.display = 'none';
        plannerSection.style.display = 'block';
        document.getElementById('user-display').innerText = user.username;
        
        // Erst das Board bauen, dann die Champions laden
        drawBoard();
        loadUnitBank();
    } else {
        authSection.style.display = 'block';
        plannerSection.style.display = 'none';
    }
}

// 5. Logout
function logout() {
    localStorage.removeItem('tft_user');
    location.reload();
}

// Initialisierung beim Seitenstart
window.onload = renderApp;