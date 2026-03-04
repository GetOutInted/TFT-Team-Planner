from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    
    # NEU: Speichert das bevorzugte Design (Standard ist 'dark')
    theme = db.Column(db.String(20), default='dark', nullable=False) 
    
    # NEU: Verknüpfung zur Board-Tabelle (ermöglicht z.B. user.boards)
    boards = db.relationship('Board', backref='author', lazy=True)

class Unit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    unit_id = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    cost = db.Column(db.Integer)
    traits = db.Column(db.String(200)) # Gespeichert als "Mage, Rebel"
    icon_path = db.Column(db.String(300))

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    icon_path = db.Column(db.String(255))


# NEU: Tabelle für die gespeicherten Teams/Boards
class Board(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False) # Name des Boards (z.B. "Void Brawler")
    
    # Hier speichern wir das Layout als JSON-String ab (welche Unit auf welchem Feld steht)
    board_data = db.Column(db.Text, nullable=False) 
    
    # Praktisch für die Profilseite, um die neuesten Boards oben anzuzeigen
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow) 
    
    # Fremdschlüssel: Welchem User gehört dieses Board?
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)