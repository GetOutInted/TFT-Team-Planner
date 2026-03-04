import requests
import json
import os 
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from models import db, bcrypt, User, Unit, Board, Item 
from flask_cors import CORS

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tft_planner.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.urandom(24) 
CORS(app)

db.init_app(app)
bcrypt.init_app(app)

# --- GLOBALE ITEM-LISTEN FÜR IMPORT UND KATEGORISIERUNG ---
STANDARD_ITEMS = [
    "Adaptive Helm", "Archangel's Staff", "Bloodthirster", "Blue Buff", 
    "Bramble Vest", "Crownguard", "Deathblade", "Dragon's Claw", 
    "Edge of Night", "Evenshroud", "Gargoyle Stoneplate", "Giant Slayer", 
    "Guardbreaker", "Guinsoo's Rageblade", "Hand of Justice", 
    "Hextech Gunblade", "Infinity Edge", "Ionic Spark", "Jeweled Gauntlet", 
    "Kraken's Fury", "Last Whisper", "Morellonomicon", "Nashor's Tooth", "Protector's Vow", 
    "Quicksilver", "Rabadon's Deathcap", "Red Buff", 
    "Spear of Shojin", "Spirit Visage", 
    "Steadfast Heart", "Sterak's Gage", "Strikers Flail", "Sunfire Cape", 
    "Thief's Gloves", "Titan's Resolve", "Void Staff", "Warmog's Armor"
]

ARTIFACTS = [
    "Aegis of Dawn", "Aegis of Dusk", "Blighting Jewel", "Cappa Juice", "Dawncore", 
    "Deathfire Grasp", "Death's Defiance", "Eternal Pact", "Fishbones", "Flickerblade", 
    "Gambler's Blade", "Gold Collector", "Hellfire Hatchet", "Hullcrusher", "Indomitable Gauntlet", 
    "Infinity Force", "Innervating Locket", "Lesser Mirrored Persona", "Lich Bane", 
    "Lightshield Crest", "Luden's Tempest", "Manazane", "Mirrored Persona", "Mittens", 
    "Mogul's Mail", "Prowler's Claw", "Rapid Firecannon", "Seeker's Armguard", "Shadow Puppet", 
    "Silvermere Dawn", "Sniper's Focus", "Spectral Cutlass", "Statikk Shiv", "Suspicious Trench Coat", 
    "Talisman of Ascension", "The Darkin Aegis", "The Darkin Bow", "The Darkin Scythe", 
    "The Darkin Staff", "Titanic Hydra", "Trickster's Glass", "Unending Despair", "Wit's End", "Zhonya's Paradox"
]

EMBLEMS = [
    "Arcanist Emblem", "Bruiser Emblem", "Defender Emblem", "Invoker Emblem", "Juggernaut Emblem", 
    "Quickstriker Emblem", "Slayer Emblem", "Vanquisher Emblem", "Bilgewater Emblem", 
    "Demacia Emblem", "Freljord Emblem", "Ionia Emblem", "Noxus Emblem", "Void Emblem", 
    "Yordle Emblem", "Zaun Emblem", "Disruptor Emblem", "Gunslinger Emblem", "Ixtal Emblem", 
    "Longshot Emblem", "Piltover Emblem", "Warden Emblem"
]

# Hilfsfunktion, um Namen "kugelsicher" zu machen
def normalize_string(s):
    if not s: return ""
    return s.lower().replace(" ", "").replace("'", "").replace("-", "")

# Vorab normalisierte Sets für blitzschnelles Kategorisieren
NORM_ARTIFACTS = set(normalize_string(x) for x in ARTIFACTS)
NORM_EMBLEMS = set(normalize_string(x) for x in EMBLEMS)

# --- IMPORT LOGIK ---
def setup_units_from_json():
    url = "https://raw.communitydragon.org/latest/cdragon/tft/en_us.json"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        champions = []
        for s in data.get('setData', []):
            if s.get('number') == 16 or "Set16" in s.get('mutator', ''):
                champions = s.get('champions', [])
                break

        for champ in champions:
            if not champ.get('traits') or champ.get('cost', 0) == 0: continue
            raw_path = champ.get('tileIcon') or champ.get('character_id')
            clean_path = raw_path.split('ASSETS/')[-1].lower().replace('.tex', '.png').replace('.dds', '.png') if 'ASSETS/' in str(raw_path) else ""
            icon_url = f"https://raw.communitydragon.org/latest/game/assets/{clean_path}" if clean_path else ""

            if not Unit.query.filter_by(unit_id=champ['apiName']).first():
                new_unit = Unit(unit_id=champ['apiName'], name=champ['name'], cost=champ['cost'],
                                traits=", ".join(champ['traits']), icon_path=icon_url)
                db.session.add(new_unit)
        db.session.commit()
    except Exception as e: print(f"Fehler beim Champion-Import: {e}")

def setup_items_from_json():
    url = "https://raw.communitydragon.org/latest/cdragon/tft/en_us.json"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        items = data.get('items', [])
        
        all_allowed_raw = STANDARD_ITEMS + ARTIFACTS + EMBLEMS
        allowed_names_normalized = set(normalize_string(name) for name in all_allowed_raw)
        
        for item in items:
            name = item.get('name', '')
            raw_path = item.get('icon', '')
            
            normalized_api_name = normalize_string(name)
            
            if normalized_api_name not in allowed_names_normalized:
                continue
                
            clean_path = raw_path.split('ASSETS/')[-1].lower().replace('.tex', '.png').replace('.dds', '.png')
            icon_url = f"https://raw.communitydragon.org/latest/game/assets/{clean_path}"
            
            if not Item.query.filter_by(name=name).first():
                new_item = Item(item_id=str(item.get('apiName')), name=name, icon_path=icon_url)
                db.session.add(new_item)
            
        db.session.commit()
        print(f"[DEBUG] Setup Items fertig. Items in der Datenbank: {Item.query.count()}")
    except Exception as e: print(f"Fehler beim Item-Import: {e}")

with app.app_context():
    db.create_all()
    if Unit.query.count() == 0: setup_units_from_json()
    if Item.query.count() == 0: setup_items_from_json()

# --- SEITEN-ROUTEN ---
@app.route('/')
def index():
    if 'user_id' in session: return redirect(url_for('planner'))
    return render_template('login.html')

@app.route('/planner')
def planner():
    if 'user_id' not in session: return redirect(url_for('index'))
    user = User.query.get(session['user_id'])
    return render_template('planner.html', user=user)

@app.route('/profile')
def profile():
    if 'user_id' not in session: return redirect(url_for('index'))
    user = User.query.get(session['user_id'])
    user_boards = Board.query.filter_by(user_id=user.id).order_by(Board.created_at.desc()).all()
    return render_template('profile.html', user=user, boards=user_boards)

# --- AUTH API ---
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"error": "Name vergeben"}), 400
    hashed_pw = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(username=data['username'], password_hash=hashed_pw)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "Erfolg"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and bcrypt.check_password_hash(user.password_hash, data.get('password')):
        session['user_id'] = user.id
        return jsonify({"message": "Eingeloggt"})
    # ANGEPASST: Die neue, exaktere Fehlermeldung
    return jsonify({"error": "Falscher Nutzername oder Passwort"}), 401

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('index'))

# --- PLANNER API ---
@app.route('/api/units')
def get_units():
    units = Unit.query.order_by(Unit.cost, Unit.name).all()
    return jsonify([{"name": u.name, "cost": u.cost, "traits": u.traits.split(", "), "icon": u.icon_path} for u in units])

@app.route('/api/items')
def get_items():
    items = Item.query.order_by(Item.name).all()
    result = []
    
    for i in items:
        norm_name = normalize_string(i.name)
        if norm_name in NORM_ARTIFACTS:
            category = "Artifact"
        elif norm_name in NORM_EMBLEMS:
            category = "Emblem"
        else:
            category = "Standard"
            
        result.append({"id": i.item_id, "name": i.name, "icon": i.icon_path, "category": category})
        
    return jsonify(result)

@app.route('/api/save_board', methods=['POST'])
def save_board():
    if 'user_id' not in session: return jsonify({"error": "Nicht eingeloggt"}), 401
    data = request.get_json()
    
    board_id = data.get('boardId')
    name = data.get('name', 'Unbenanntes Team')
    layout_data = data.get('layout', [])
    user_id = session['user_id']
    
    if board_id:
        board = Board.query.filter_by(id=board_id, user_id=user_id).first()
        if board:
            board.name = name
            board.board_data = json.dumps(layout_data)
            db.session.commit()
            return jsonify({"message": "Board erfolgreich aktualisiert!", "board_id": board.id})
            
    new_board = Board(
        name=name,
        board_data=json.dumps(layout_data),
        user_id=user_id
    )
    db.session.add(new_board)
    db.session.commit()
    return jsonify({"message": "Neues Board gespeichert!", "board_id": new_board.id})

@app.route('/api/get_board/<int:board_id>')
def get_board(board_id):
    if 'user_id' not in session: return jsonify({"error": "Nicht eingeloggt"}), 401
    
    board = Board.query.filter_by(id=board_id, user_id=session['user_id']).first()
    if not board: return jsonify({"error": "Board nicht gefunden"}), 404
    
    return jsonify({
        "name": board.name,
        "layout": json.loads(board.board_data)
    })

@app.route('/api/delete_board/<int:board_id>', methods=['DELETE'])
def delete_board(board_id):
    if 'user_id' not in session: return jsonify({"error": "Nicht eingeloggt"}), 401
    board = Board.query.filter_by(id=board_id, user_id=session['user_id']).first()
    
    if not board: return jsonify({"error": "Board nicht gefunden oder keine Berechtigung"}), 404
        
    db.session.delete(board)
    db.session.commit()
    return jsonify({"message": "Board erfolgreich gelöscht"})

@app.route('/api/update_theme', methods=['POST'])
def update_theme():
    if 'user_id' not in session: return jsonify({"error": "Nicht eingeloggt"}), 401
    data = request.get_json()
    user = User.query.get(session['user_id'])
    user.theme = data.get('theme', 'dark')
    db.session.commit()
    return jsonify({"message": "Theme aktualisiert"})

if __name__ == '__main__':
    app.run(debug=True)