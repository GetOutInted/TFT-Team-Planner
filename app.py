import requests
import json
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from models import db, bcrypt, User, Unit, Board
from flask_cors import CORS

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tft_planner.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'tft-geheimnis-super-sicher-123' # Wichtig für Sessions
CORS(app)

db.init_app(app)
bcrypt.init_app(app)

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
    except Exception as e: print(f"Fehler beim Import: {e}")

with app.app_context():
    db.create_all()
    if Unit.query.count() == 0: setup_units_from_json()

# --- SEITEN-ROUTEN ---

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('planner'))
    return render_template('login.html')

@app.route('/planner')
def planner():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    user = User.query.get(session['user_id'])
    return render_template('planner.html', user=user)

@app.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    user = User.query.get(session['user_id'])
    # Wir laden die Boards direkt mit
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
        session['user_id'] = user.id  # Session setzen
        return jsonify({"message": "Eingeloggt"})
    return jsonify({"error": "Falsche Daten"}), 401

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('index'))

# --- PLANNER API ---

@app.route('/api/units')
def get_units():
    units = Unit.query.order_by(Unit.cost, Unit.name).all()
    return jsonify([{"name": u.name, "cost": u.cost, "traits": u.traits.split(", "), "icon": u.icon_path} for u in units])

@app.route('/api/save_board', methods=['POST'])
def save_board():
    if 'user_id' not in session: return jsonify({"error": "Nicht eingeloggt"}), 401
    data = request.get_json()
    new_board = Board(
        name=data.get('name', 'Unbenanntes Team'),
        board_data=json.dumps(data.get('layout')),
        user_id=session['user_id']
    )
    db.session.add(new_board)
    db.session.commit()
    return jsonify({"message": "Board gespeichert"})

# NEUE ROUTE: Lade ein spezifisches Board
@app.route('/api/get_board/<int:board_id>')
def get_board(board_id):
    if 'user_id' not in session: return jsonify({"error": "Nicht eingeloggt"}), 401
    board = Board.query.filter_by(id=board_id, user_id=session['user_id']).first()
    if not board: return jsonify({"error": "Board nicht gefunden"}), 404
    
    return jsonify({
        "name": board.name,
        "layout": json.loads(board.board_data)
    })

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