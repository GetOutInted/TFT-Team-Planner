import requests
from flask import Flask, render_template, request, jsonify
from models import db, bcrypt, User, Unit
from flask_cors import CORS

app = Flask(__name__)
# WICHTIG: Pfad zur DB
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tft_planner.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'tft-geheimnis-123'
CORS(app)

db.init_app(app)
bcrypt.init_app(app)

# --- IMPORT LOGIK FÜR SET 16 ---
def setup_units_from_json():
    url = "https://raw.communitydragon.org/latest/cdragon/tft/en_us.json"
    print("--- Starte Champion-Import für Set 16 ---")
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        set_id_target = 16 
        champions = []

        # Suche in setData
        set_data_root = data.get('setData', [])
        if isinstance(set_data_root, list):
            for s in set_data_root:
                if s.get('number') == set_id_target:
                    champions = s.get('champions', [])
                    break
        
        # Falls Set 16 noch unter Namen läuft
        if not champions:
            for s in data.get('setData', []):
                if "Set16" in s.get('mutator', ''):
                    champions = s.get('champions', [])
                    break

        for champ in champions:
            if not champ.get('traits') or champ.get('cost', 0) == 0:
                continue

            raw_path = champ.get('tileIcon') or champ.get('character_id')
            if raw_path:
                parts = raw_path.split('ASSETS/')
                clean_path = parts[-1].lower() if len(parts) > 1 else raw_path.lower()
                clean_path = clean_path.replace('.tex', '.png').replace('.dds', '.png')
                icon_url = f"https://raw.communitydragon.org/latest/game/assets/{clean_path}"
            else:
                icon_url = ""

            if not Unit.query.filter_by(unit_id=champ['apiName']).first():
                new_unit = Unit(
                    unit_id=champ['apiName'],
                    name=champ['name'],
                    cost=champ['cost'],
                    traits=", ".join(champ['traits']),
                    icon_path=icon_url
                )
                db.session.add(new_unit)
        db.session.commit()
        print("--- Import abgeschlossen! ---")
    except Exception as e:
        print(f"Fehler beim Import: {e}")

# Erstelle Tabellen beim Start
with app.app_context():
    db.create_all()
    if Unit.query.count() == 0:
        setup_units_from_json()

# --- ROUTES ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if User.query.filter_by(username=data['username']).first():
            return jsonify({"error": "Nutzername bereits vergeben"}), 400
        
        hashed_pw = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        new_user = User(username=data['username'], password_hash=hashed_pw)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "Erfolgreich registriert"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = User.query.filter_by(username=data.get('username')).first()
        if user and bcrypt.check_password_hash(user.password_hash, data.get('password')):
            return jsonify({"username": user.username})
        return jsonify({"error": "Ungültige Anmeldedaten"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/units')
def get_units():
    units = Unit.query.order_by(Unit.cost, Unit.name).all()
    return jsonify([{
        "name": u.name, "cost": u.cost, "traits": u.traits.split(", "), "icon": u.icon_path
    } for u in units])

if __name__ == '__main__':
    app.run(debug=True)