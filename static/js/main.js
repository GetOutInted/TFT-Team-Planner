/**
 * TFT Planner - Frontend Logik
 */

// Authentifizierung (Login/Register)
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
                // Felder leeren für Sicherheit
                userField.value = "";
                passField.value = "";
            } else {
                alert("Registrierung erfolgreich! Du kannst dich jetzt einloggen.");
            }
        } else {
            alert("Fehler: " + (data.error || "Unbekannter Fehler"));
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        alert("Server ist nicht erreichbar.");
    }
}

/**
 * Erstellt das Spielfeld basierend auf dem Login-Status
 */
function renderApp() {
    const userString = localStorage.getItem('tft_user');
    const authSection = document.getElementById('auth-section');
    const plannerSection = document.getElementById('planner-section');
    
    if (userString) {
        const user = JSON.parse(userString);
        authSection.style.display = 'none';
        plannerSection.style.display = 'block';
        document.getElementById('user-display').innerText = user.username;
        
        const board = document.getElementById('tft-board');
        board.innerHTML = ''; 

        const rows = 4;
        const cols = 7;

        for (let r = 0; r < rows; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'board-row';

            for (let c = 0; c < cols; c++) {
                // Wrapper für den gleichmäßigen Rand
                const wrapper = document.createElement('div');
                wrapper.className = 'hex-wrapper';

                // Das eigentliche Hex-Feld
                const slot = document.createElement('div');
                slot.className = 'hex-slot';
                
                // Position berechnen und als ID setzen
                const slotId = (r * cols) + c;
                slot.dataset.pos = slotId;
                slot.innerText = slotId; 

                // Klick-Event für spätere Unit-Platzierung
                slot.onclick = () => {
                    console.log(`Feld ${slotId} ausgewählt`);
                    // Hier können wir später die Unit-Logik einbauen
                };

                wrapper.appendChild(slot);
                rowDiv.appendChild(wrapper);
            }
            board.appendChild(rowDiv);
        }
    } else {
        // Nicht eingeloggt
        authSection.style.display = 'block';
        plannerSection.style.display = 'none';
    }
}

/**
 * Löscht die Session und lädt die Seite neu
 */
function logout() {
    localStorage.removeItem('tft_user');
    location.reload();
}

// Initialer Check beim Laden der Seite
window.onload = renderApp;