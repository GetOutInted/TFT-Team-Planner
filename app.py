from flask import Flask, render_template, request, jsonify
from models import db, bcrypt, User, Board
from flask_cors import CORS

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tft_planner.db'
app.config['SECRET_KEY'] = 'tft-geheimnis-123'
CORS(app)

db.init_app(app)
bcrypt.init_app(app)

# Datenbank initialisieren
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Validierung: Sind Daten da und nicht leer?
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({"error": "Nutzername und Passwort dürfen nicht leer sein"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Nutzername bereits vergeben"}), 400
    
    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, password_hash=hashed_pw)
    
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "Registrierung erfolgreich!"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({"error": "Bitte alle Felder ausfüllen"}), 400

    user = User.query.filter_by(username=username).first()
    
    if user and bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"user_id": user.id, "username": user.username})
    
    return jsonify({"error": "Ungültige Anmeldedaten"}), 401

if __name__ == '__main__':
    app.run(debug=True)