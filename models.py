from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    theme = db.Column(db.String(20), default='dark', nullable=False)
    design = db.Column(db.String(20), default='standard')
    boards = db.relationship('Board', backref='author', lazy=True)

class Unit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    unit_id = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    cost = db.Column(db.Integer)
    traits = db.Column(db.String(200)) 
    icon_path = db.Column(db.String(300))

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    icon_path = db.Column(db.String(255))


class Board(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    board_data = db.Column(db.Text, nullable=False) 
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow) 
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)