// Konfiguration
const API_URL = ""; 

/**
 * Steuert Login und Registrierung
 */
async function handleAuth(type) {
    const userVal = document.getElementById('username').value;
    const passVal = document.getElementById('password').value;

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
                alert("Registrierung erfolgreich!");
            }
        } else {
            alert("Fehler: " + (data.error || "Unbekannter Fehler"));
        }
    } catch (err) {
        alert("Server ist nicht erreichbar.");
    }
}

/**
 * Generiert das Hexagon-Board
 */
function renderApp() {
    const userString = localStorage.getItem('tft_user');
    
    if (userString) {
        const user = JSON.parse(userString);
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('planner-section').style.display = 'block';
        document.getElementById('user-display').innerText = user.username;
        
        const board = document.getElementById('tft-board');
        board.innerHTML = ''; 

        const rows = 4;
        const cols = 7;

        for (let r = 0; r < rows; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'board-row';

            for (let c = 0; c < cols; c++) {
                const slot = document.createElement('div');
                slot.className = 'hex-slot';
                
                const slotId = (r * cols) + c;
                slot.dataset.pos = slotId;
                slot.innerText = slotId; 

                rowDiv.appendChild(slot);
            }
            board.appendChild(rowDiv);
        }
    } else {
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('planner-section').style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('tft_user');
    location.reload();
}

window.onload = renderApp;