async function handleAuth(type) {
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;

    // Frontend-Check: Gar nicht erst senden, wenn leer
    if (!usernameInput || !passwordInput) {
        alert("Bitte fülle beide Felder aus!");
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
                localStorage.setItem('tft_user', JSON.stringify(data));
                renderApp();
            } else {
                alert(data.message);
            }
        } else {
            alert("Fehler: " + data.error);
        }
    } catch (err) {
        alert("Server ist offline oder nicht erreichbar.");
    }
}

function renderApp() {
    const user = JSON.parse(localStorage.getItem('tft_user'));
    if (user) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('planner-section').style.display = 'block';
        document.getElementById('user-display').innerText = user.username;
        
        const board = document.getElementById('tft-board');
        board.innerHTML = '';
        for (let i = 0; i < 28; i++) {
            const hex = document.createElement('div');
            hex.className = 'hex-slot';
            hex.innerText = i + 1;
            board.appendChild(hex);
        }
    }
}

function logout() {
    localStorage.removeItem('tft_user');
    location.reload();
}

window.onload = renderApp;