// Konfiguration
const API_URL = ""; // Leer lassen, wenn auf dem gleichen Server

/**
 * Steuert Login und Registrierung
 */
async function handleAuth(type) {
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;

    if (!usernameInput || !passwordInput) {
        alert("Bitte fülle alle Felder aus!");
        return;
    }

    try {
        const response = await fetch(`/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: usernameInput, 
                password: passwordInput 
            })
        });

        const data = await response.json();

        if (response.ok) {
            if (type === 'login') {
                // User-Daten im Browser-Speicher ablegen
                localStorage.setItem('tft_user', JSON.stringify(data));
                renderApp();
            } else {
                alert("Registrierung erfolgreich! Du kannst dich jetzt einloggen.");
            }
        } else {
            alert("Fehler: " + (data.error || "Unbekannter Fehler"));
        }
    } catch (err) {
        console.error(err);
        alert("Server ist nicht erreichbar.");
    }
}

/**
 * Zeigt das Board an und generiert die Hexagone
 */
function renderApp() {
    const userString = localStorage.getItem('tft_user');
    
    if (userString) {
        const user = JSON.parse(userString);
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('planner-section').style.display = 'block';
        document.getElementById('user-display').innerText = user.username;
        
        const board = document.getElementById('tft-board');
        board.innerHTML = ''; // Vorher leeren

        const rows = 4;
        const cols = 7;

        // Erstelle Reihen für das Versatz-System
        for (let r = 0; r < rows; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'board-row';

            for (let c = 0; c < cols; c++) {
                const slot = document.createElement('div');
                slot.className = 'hex-slot';
                
                // Fortlaufende ID berechnen (0-27)
                const slotId = (r * cols) + c;
                slot.dataset.pos = slotId;
                slot.innerText = slotId; // Später kommt hier das Unit-Bild rein

                // Beispiel-Event für später
                slot.onclick = () => console.log(`Feld ${slotId} geklickt`);

                rowDiv.appendChild(slot);
            }
            board.appendChild(rowDiv);
        }
    } else {
        // Falls nicht eingeloggt, zeige Login
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('planner-section').style.display = 'none';
    }
}

/**
 * Loggt den Nutzer aus
 */
function logout() {
    localStorage.removeItem('tft_user');
    location.reload();
}

// Beim Starten der Seite prüfen
window.onload = renderApp;