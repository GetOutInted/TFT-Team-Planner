let allUnits = [];
let allItems = []; 
let draggedFromSlot = null;
let currentBoardId = null;
let boardIdToDelete = null; 

// --- NEU: VARIABLEN FÜR DRAG & SCROLL LOGIK ---
let isAppDragging = false;
let autoScrollInterval = null;
let scrollDirection = 0;

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
    
    // --- NEU: GLOBALE DRAG & SCROLL EVENTS ---
    document.addEventListener('dragstart', () => isAppDragging = true);
    
    document.addEventListener('dragend', () => {
        isAppDragging = false;
        stopAutoScroll();
    });
    
    document.addEventListener('drop', () => {
        isAppDragging = false;
        stopAutoScroll();
    });


    document.addEventListener('dragover', (e) => {
        if (!isAppDragging) return;
        
        const threshold = 100; // Pixel Abstand zum oberen/unteren Rand
        
        if (e.clientY < threshold) {
            scrollDirection = -18; // Nach oben scrollen
        } else if (window.innerHeight - e.clientY < threshold) {
            scrollDirection = 18; // Nach unten scrollen
        } else {
            scrollDirection = 0;
        }

        if (scrollDirection !== 0 && !autoScrollInterval) {
            autoScrollInterval = setInterval(() => {
                window.scrollBy(0, scrollDirection);
            }, 20);
        } else if (scrollDirection === 0 && autoScrollInterval) {
            stopAutoScroll();
        }
    });

    function stopAutoScroll() {
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
        scrollDirection = 0;
    }

    const logoEasterEgg = document.getElementById('logo-easter-egg');
    if (logoEasterEgg) {
        logoEasterEgg.addEventListener('click', () => {
            const audio = new Audio('/static/sounds/veigar.mp3');
            audio.play().catch(error => console.log("Sound konnte nicht abgespielt werden:", error));
        });
    }

    const boardElement = document.getElementById('tft-board');
    if (boardElement) {
        drawBoard();
        await fetchUnits(); 
        await fetchItems(); 
        
        const urlParams = new URLSearchParams(window.location.search);
        const boardId = urlParams.get('board_id');
        if (boardId) {
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

    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
        document.getElementById('modal-confirm-btn').addEventListener('click', confirmDeletion);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
});

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message; 
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.remove(); }, 400); 
    }, 3000);
}

// --- BACKEND API ---
async function handleAuth(type) {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    if (!user || !pass) {
        showToast("Bitte fülle Benutzername und Passwort aus!", "warning");
        return;
    }

    try {
        const res = await fetch(`/${type}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: user, password: pass})
        });
        
        const data = await res.json();
        
        if (res.ok) {
            if (type === 'register') {
                showToast("Erfolgreich registriert! Du kannst dich jetzt einloggen.", "success");
                document.getElementById('password').value = '';
            } else {
                window.location.href = '/planner';
            }
        } else {
            showToast(data.error || "Ein Fehler ist aufgetreten", 'error'); 
        }
    } catch (error) {
        showToast("Netzwerkfehler. Bitte versuche es später nochmal.", "error");
    }
}

async function fetchUnits() {
    const res = await fetch('/api/units');
    allUnits = await res.json();
    populateTraitFilter();
    displayUnits(allUnits);
}

async function fetchItems() {
    try {
        const res = await fetch('/api/items');
        if (res.ok) {
            allItems = await res.json();
            displayItems(allItems);
        }
    } catch (error) {
        console.error("Fehler beim Laden der Items:", error);
    }
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
                
                const unitObj = JSON.parse(slot.dataset.unit);
                const payload = {
                    unit: unitObj,
                    items: slot.dataset.items ? JSON.parse(slot.dataset.items) : [],
                    isMovedChampion: true
                };
                e.dataTransfer.setData('application/json', JSON.stringify(payload));
                
                const dragGhost = document.createElement('div');
                dragGhost.className = `icon-container cost-${unitObj.cost}`;
                dragGhost.style.position = 'absolute';
                dragGhost.style.top = '-1000px'; 
                dragGhost.innerHTML = `<img src="${unitObj.icon}" class="unit-icon">`;
                document.body.appendChild(dragGhost);
                
                e.dataTransfer.setDragImage(dragGhost, 30, 30);
                setTimeout(() => document.body.removeChild(dragGhost), 0);
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
    
    const droppedObj = JSON.parse(data);

    if (droppedObj.isItem) {
        if (!slot.dataset.unit) {
            showToast("Du musst zuerst einen Champion platzieren!", "warning");
            return;
        }
        
        let currentItems = slot.dataset.items ? JSON.parse(slot.dataset.items) : [];
        if (currentItems.length >= 3) {
            showToast("Dieser Champion hat bereits 3 Items!", "warning");
            return;
        }
        
        currentItems.push(droppedObj);
        placeUnit(slot, JSON.parse(slot.dataset.unit), currentItems);
        return;
    }

    if (draggedFromSlot === slot) {
        return; 
    }

    if (draggedFromSlot && draggedFromSlot !== slot) {
        const targetUnitData = slot.dataset.unit;
        const targetItemsData = slot.dataset.items;
        
        const sourceUnit = droppedObj.unit;
        const sourceItems = droppedObj.items || [];

        if (targetUnitData) {
            placeUnit(draggedFromSlot, JSON.parse(targetUnitData), targetItemsData ? JSON.parse(targetItemsData) : []);
        } else {
            clearUnit(draggedFromSlot);
        }
        placeUnit(slot, sourceUnit, sourceItems);
        updateSynergies();
        return;
    }

    placeUnit(slot, droppedObj, []);
    updateSynergies();
}

function placeUnit(slot, unit, items = []) {
    slot.dataset.unit = JSON.stringify(unit);
    
    if (items.length > 0) {
        slot.dataset.items = JSON.stringify(items);
    } else {
        delete slot.dataset.items;
    }
    
    renderHex(slot);
    updateSynergies();
}

function renderHex(slot) {
    if (!slot.dataset.unit) return;
    
    const unit = JSON.parse(slot.dataset.unit);
    let html = `<img src="${unit.icon}" draggable="false" class="champion-img">`;
    
    if (slot.dataset.items) {
        const items = JSON.parse(slot.dataset.items);
        if (items.length > 0) {
            html += `<div class="item-container">`;
            items.forEach((item, index) => {
                html += `<img src="${item.icon}" class="mini-item" title="${item.name}" 
                         oncontextmenu="removeSpecificItem(event, this.parentElement.parentElement, ${index})" 
                         draggable="false">`;
            });
            html += `</div>`;
        }
    }
    
    slot.innerHTML = html;
    slot.parentElement.className = `hex-wrapper cost-${unit.cost}`;
}

function clearUnit(slot) {
    slot.innerHTML = '';
    delete slot.dataset.unit;
    delete slot.dataset.items;
    slot.parentElement.className = 'hex-wrapper';
    updateSynergies();
}

window.removeSpecificItem = function(e, slot, itemIndex) {
    e.preventDefault();
    e.stopPropagation(); 
    
    if (!slot.dataset.items) return;
    
    let items = JSON.parse(slot.dataset.items);
    items.splice(itemIndex, 1); 
    
    placeUnit(slot, JSON.parse(slot.dataset.unit), items);
};

function clearBoard() {
    document.querySelectorAll('.hex-slot').forEach(s => clearUnit(s));
    document.getElementById('board-name').value = '';
    currentBoardId = null;
    const url = new URL(window.location);
    url.searchParams.delete('board_id');
    window.history.replaceState({}, '', url);
    showToast("Board wurde geleert", "info");
}

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
        if (b.tierLevel !== a.tierLevel) return b.tierLevel - a.tierLevel; 
        return a.trait.localeCompare(b.trait);
    });

    list.innerHTML = '';
    traitsArray.forEach(t => {
        const item = document.createElement('div');
        item.className = `synergy-item ${t.isActive ? 'active' : ''} ${t.tierClass}`;
        const iconFilename = t.trait.toLowerCase().replace(/[^a-z0-9]/g, '');
        item.innerHTML = `
            <div class="synergy-count-box">${t.count}</div>
            <img src="/static/img/traits/${iconFilename}.png" class="synergy-icon" alt="${t.trait}" onerror="this.style.display='none'">
            <div>
                <div style="font-weight:bold; font-size:0.85rem;">${t.trait}</div>
                <div style="font-size:0.7rem; opacity:0.7;">${t.thresholds.join(' / ')}</div>
            </div>
        `;
        list.appendChild(item);
    });
}

// --- FILTER & BANK ---
function switchTab(tabName) {
    document.getElementById('champion-container').classList.add('hidden');
    document.getElementById('item-container').classList.add('hidden');
    document.getElementById('tab-champions').classList.remove('active');
    document.getElementById('tab-items').classList.remove('active');

    if (tabName === 'champions') {
        document.getElementById('champion-container').classList.remove('hidden');
        document.getElementById('tab-champions').classList.add('active');
    } else if (tabName === 'items') {
        document.getElementById('item-container').classList.remove('hidden');
        document.getElementById('tab-items').classList.add('active');
    }
}

function displayUnits(units) {
    const bank = document.getElementById('unit-bank');
    if (!bank) return;
    bank.innerHTML = '';
    units.forEach(unit => {
        const div = document.createElement('div');
        div.className = 'unit-card';
        div.innerHTML = `
            <div class="icon-container cost-${unit.cost}"><img src="${unit.icon}" class="unit-icon" draggable="false"></div>
            <div style="font-size:0.75rem; margin-top:4px;">${unit.name}</div>
        `;
        div.draggable = true;
        
        div.ondragstart = (e) => {
            draggedFromSlot = null;
            e.dataTransfer.setData('application/json', JSON.stringify(unit));
            
            const dragGhost = document.createElement('div');
            dragGhost.className = `icon-container cost-${unit.cost}`;
            dragGhost.style.position = 'absolute';
            dragGhost.style.top = '-1000px'; 
            dragGhost.innerHTML = `<img src="${unit.icon}" class="unit-icon">`;
            document.body.appendChild(dragGhost);
            
            e.dataTransfer.setDragImage(dragGhost, 30, 30);
            setTimeout(() => document.body.removeChild(dragGhost), 0);
        };
        
        div.onclick = () => {
            const emptySlot = Array.from(document.querySelectorAll('.hex-slot')).find(s => !s.dataset.unit);
            if (emptySlot) { 
                placeUnit(emptySlot, unit); 
                updateSynergies(); 
            } else {
                showToast("Das Board ist bereits voll!", "warning");
            }
        };
        
        bank.appendChild(div);
    });
}

function displayItems(items) {
    const bank = document.getElementById('item-bank');
    if (!bank) return;
    bank.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-card';
        div.innerHTML = `
            <div class="icon-container"><img src="${item.icon}" class="unit-icon" alt="${item.name}" draggable="false"></div>
            <div style="font-size:0.75rem; margin-top:4px;">${item.name}</div>
        `;
        div.draggable = true;
        
        div.ondragstart = (e) => {
            draggedFromSlot = null;
            e.dataTransfer.setData('application/json', JSON.stringify({ ...item, isItem: true }));
            
            const dragGhost = document.createElement('div');
            dragGhost.className = `icon-container`;
            dragGhost.style.position = 'absolute';
            dragGhost.style.top = '-1000px'; 
            dragGhost.innerHTML = `<img src="${item.icon}" class="unit-icon">`;
            document.body.appendChild(dragGhost);
            
            e.dataTransfer.setDragImage(dragGhost, 30, 30);
            setTimeout(() => document.body.removeChild(dragGhost), 0);
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

function filterItems() {
    const search = document.getElementById('item-search-input').value.toLowerCase();
    const category = document.getElementById('item-category-filter').value;
    const filtered = allItems.filter(i => 
        i.name.toLowerCase().includes(search) &&
        (category === "" || i.category === category)
    );
    displayItems(filtered);
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

function resetItemFilters() {
    document.getElementById('item-search-input').value = '';
    document.getElementById('item-category-filter').value = '';
    filterItems();
}

// --- PROFILE ACTIONS & BOARD LADEN ---
async function saveCurrentBoard() {
    const name = document.getElementById('board-name').value || "Unbenanntes Team";
    const layout = [];
    
    document.querySelectorAll('.hex-slot').forEach(slot => {
        if (slot.dataset.unit) {
            layout.push({ 
                index: slot.dataset.index, 
                unit: JSON.parse(slot.dataset.unit),
                items: slot.dataset.items ? JSON.parse(slot.dataset.items) : []
            });
        }
    });

    const res = await fetch('/api/save_board', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ boardId: currentBoardId, name, layout })
    });
    
    if (res.ok) {
        const data = await res.json();
        if (data.board_id && !currentBoardId) {
            currentBoardId = data.board_id;
            const url = new URL(window.location);
            url.searchParams.set('board_id', currentBoardId);
            window.history.replaceState({}, '', url);
        }
        showToast(data.message, 'success');
    } else {
        showToast("Fehler beim Speichern des Boards!", 'error');
    }
}

function loadBoard(id) { window.location.href = `/planner?board_id=${id}`; }

async function fetchAndApplyBoard(id) {
    try {
        const res = await fetch(`/api/get_board/${id}`);
        if (res.ok) {
            const data = await res.json();
            currentBoardId = id;
            const nameInput = document.getElementById('board-name');
            if (nameInput) nameInput.value = data.name;
            
            let layoutData = data.layout;
            if (typeof layoutData === 'string') layoutData = JSON.parse(layoutData);
            
            if (layoutData && Array.isArray(layoutData)) {
                layoutData.forEach(item => {
                    const slot = document.querySelector(`.hex-slot[data-index="${item.index}"]`);
                    if (slot && item.unit) placeUnit(slot, item.unit, item.items || []);
                });
                updateSynergies();
            }
        } else {
             showToast("Das Board konnte nicht geladen werden", 'error');
        }
    } catch (error) { console.error("Fehler beim Abrufen des Boards:", error); }
}

let actionToDelete = null;

function openModal(id) {
    actionToDelete = 'board';
    boardIdToDelete = id;
    
    const modalBox = document.querySelector('#confirmation-modal .modal-box');
    modalBox.querySelector('h3').innerText = "Board löschen?";
    modalBox.querySelector('p').innerText = "Möchtest du dieses Board wirklich unwiderruflich löschen?";
    
    document.getElementById('confirmation-modal').classList.remove('hidden');
}

function openAccountDeleteModal() {
    actionToDelete = 'account';
    
    const modalBox = document.querySelector('#confirmation-modal .modal-box');
    modalBox.querySelector('h3').innerText = "Account löschen?";
    modalBox.querySelector('h3').style.color = "var(--danger)"; 
    modalBox.querySelector('p').innerText = "Bist du dir absolut sicher? Alle deine Boards und deine Logindaten werden für immer gelöscht. Das kann nicht rückgängig gemacht werden!";
    
    document.getElementById('confirmation-modal').classList.remove('hidden');
}

function closeModal() {
    boardIdToDelete = null;
    actionToDelete = null;
    
    document.querySelector('#confirmation-modal .modal-box h3').style.color = "var(--accent-color)";
    document.getElementById('confirmation-modal').classList.add('hidden');
}

function deleteBoard(id) { openModal(id); }

async function confirmDeletion() {
    if (actionToDelete === 'board' && boardIdToDelete) {
        try {
            const res = await fetch(`/api/delete_board/${boardIdToDelete}`, { method: 'DELETE' });
            closeModal(); 
            if (res.ok) location.reload(); 
            else {
                const data = await res.json();
                showToast("Fehler beim Löschen: " + data.error, 'error');
            }
        } catch (error) {
            console.error("Fehler beim Löschen des Boards:", error);
            closeModal();
        }
    } else if (actionToDelete === 'account') {
        try {
            const res = await fetch('/api/delete_account', { method: 'DELETE' });
            closeModal();
            if (res.ok) {
                window.location.href = '/'; 
            } else {
                const data = await res.json();
                showToast("Fehler: " + data.error, 'error');
            }
        } catch (error) {
            console.error("Fehler beim Löschen des Accounts:", error);
            closeModal();
        }
    }
}

async function toggleTheme() {
    const isLight = document.body.classList.contains('light-mode');
    const newTheme = isLight ? 'dark' : 'light';
    
    await fetch('/api/update_theme', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ theme: newTheme })
    });
    location.reload();
}

async function toggleDesign() {
    const isLol = document.querySelector('link[href*="lol-style.css"]') !== null;
    const newDesign = isLol ? 'standard' : 'lol';
    
    await fetch('/api/update_design', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ design: newDesign })
    });
    
    location.reload(); 
}