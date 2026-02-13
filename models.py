from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

class Unit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    unit_id = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    cost = db.Column(db.Integer)
    traits = db.Column(db.String(200)) # Gespeichert als "Mage, Rebel"
    icon_path = db.Column(db.String(300))