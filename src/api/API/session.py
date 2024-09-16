import sqlite3
import datetime
import time

from hashlib import sha256

from misc.boilerplate import HOMECLOUD_DB_PATH
from misc.boilerplate import Error

import misc.security as security
import misc.db_handler as db_handler

import flask


def validate_user_credentials(username:str, password:str) -> bool:
    '''Validates the user credentials.'''

    db_con = sqlite3.connect(HOMECLOUD_DB_PATH)
    db_cursor = db_con.cursor()
    
    password = sha256(password.encode()).hexdigest()

    try:
        query = "SELECT id FROM Users WHERE username= ? AND password= ?"
        db_cursor.execute(query, (username, password))
    except:
        return False

    if len(db_cursor.fetchall()) == 1:
        return True
    else:
        return False


def create_session(username:str, session_id:str) -> None:
    '''Creates a session, with custon id for a user.'''

    timestamp:float = time.mktime(datetime.datetime.now().timetuple())

    db_con = sqlite3.connect(HOMECLOUD_DB_PATH)
    db_cursor = db_con.cursor()

    query = "SELECT id FROM Users WHERE username=?"
    db_cursor.execute(query, (username,))
    user_id = db_cursor.fetchall()[0][0]

    
    query = "INSERT INTO Sessions (user_id, session_id, login_time) VALUES (?, ?, ?)"
    db_cursor.execute(query, (user_id, session_id, timestamp))
    db_con.commit()


def delete_session(session_id:str) -> None:
    '''Deletes a session with the passed id.'''

    if (session_id == Error.DECRYPTION_ERROR): return

    query = "SELECT session_id FROM Sessions WHERE session_id=?"
    db_con, db_cursor = db_handler.create_connection()
    db_cursor.execute(query, (session_id,))
    if len(db_cursor.fetchone()) != 1: 
        return False

    db_con = sqlite3.connect(HOMECLOUD_DB_PATH)
    db_cursor = db_con.cursor()
    
    query = "DELETE FROM Sessions WHERE session_id=?"
    db_cursor.execute(query, (session_id,))
    db_con.commit()


def clear_prev_session(username:str) -> None:
    '''Clears previous sessions of the user.'''

    db_con = sqlite3.connect(HOMECLOUD_DB_PATH)
    db_cursor = db_con.cursor()

    query = "SELECT id FROM Users WHERE username=?"
    db_cursor.execute(query, (username,))
    user_id = db_cursor.fetchall()[0][0]

    query = "DELETE FROM Sessions WHERE user_id=?"
    db_cursor.execute(query, (user_id,))
    db_con.commit()


def check_session_id(secret_key:str) -> bool:
    '''Checks if request comes with a session id.'''

    if "SessionId" in flask.request.headers:
        
        # Handle AES padding error, when server restarts and client tryes to call an endpoint with old SessionId.
        try:
            id = security.decryptAES(flask.request.headers.get('SessionId'), secret_key)

            query = "SELECT session_id FROM Sessions WHERE session_id=?"
            db_con, db_cursor = db_handler.create_connection()
            db_cursor.execute(query, (id,))

            if len(db_cursor.fetchone()) == 1: 
                return True
            else:
                return False
            
        except:
            return False
        
    return False
