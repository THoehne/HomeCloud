import sqlite3
import os

import API.users as users

from misc.boilerplate import HOMECLOUD_DB_PATH
from misc.boilerplate import get_value_of_config

import misc.security as security
import misc.db_handler as db_handler

import flask 


def remove_file(file_id:str) -> None:
    db_con, db_cursor = db_handler.create_connection()

    query = "SELECT owner_id FROM Files WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    owner_id = db_cursor.fetchall()[0][0]

    os.remove(get_absolut_path_by_user('/' + file_id, owner_id))


def crop_path(path:str, _len:int) -> str:
    '''Crop path to specific size and inserts "...".'''

    if len(path) <= _len: return path

    path_split = path.split('/')
    splitted_path = '/'.join(path_split[:len(path_split)-2])
    cropped_path = splitted_path[:_len-3]
    cropped_path = cropped_path + '...'
    cropped_path = cropped_path + '/' + path_split[len(path_split)-1]
    return cropped_path 


def path_to_last_element(path:str) -> str:
    '''Removes last element of path'''

    path_elements = path.split('/')
    path_elements.pop()
    path_elements.pop()
    return '/' + '/'.join(path_elements)


def get_file_type(file_name:str) -> str:
    '''Returns the file type of a file.'''

    db_con = sqlite3.connect(HOMECLOUD_DB_PATH)
    db_cursor = db_con.cursor()

    file_suffix = '.' + file_name.split('.').pop()
    query = "SELECT FileTypes.file_type FROM FileTypes WHERE FileTypes.file_suffix=?"
    db_cursor.execute(query, (file_suffix,))

    result = db_cursor.fetchall()[0][0]

    if len(result) == 1:
        return result[0][0]

    return None


def get_last_element(path:str) -> str:
    '''Gets last element of a path.'''

    if path.endswith('/'): path = path[:-1]
    try:
        return path.split('/')[-1]
    except:
        return ''
    

def get_absolut_path(path:str, secret_key:bytes) -> str:
    '''Get the absolut path of a path.'''

    if path[1] == ':': return path

    user = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))
    
    if user['home_dir'] == '/': home_dir = ''
    else: home_dir = user['home_dir']

    return get_value_of_config('DEFAULT', 'home') + home_dir + path


def get_absolut_path_by_user(path:str, user_id:str) -> str:
    if path[1] == ':': return path

    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT home_dir FROM Users WHERE id=?"
    db_cursor.execute(query, (user_id,))
    home_dir:str = db_cursor.fetchall()[0][0]
    
    if home_dir == '/': home_dir = ''
    else: home_dir = home_dir

    return get_value_of_config('DEFAULT', 'home') + home_dir + path