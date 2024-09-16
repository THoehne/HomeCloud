import os
import json
import base64

from binascii import Error as b64Error
from hashlib import sha256

import misc.db_handler as db_handler
import misc.directory as directory
import misc.security as security
import API.file_control_tools as file_control_tools
import misc.boilerplate as boilerplate
import API.users as users
import misc.message_statics as message_statics

from misc.boilerplate import make_result

def get_accounts() -> str:
    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT id FROM Users"
    db_cursor.execute(query)

    ids:list = db_handler.grep_column(0, db_cursor.fetchall())

    result:dict = {}
    result['ids'] = ids

    return make_result(result)

def get_groups() -> str:
    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT group_id FROM UserGroups"
    db_cursor.execute(query)

    ids:list = db_handler.grep_column(0, db_cursor.fetchall())

    result:dict = {}
    result['ids'] = ids

    return make_result(result)

def delete_account(user_id:str) -> str:
    
    # clear directory
    home_dir:str = directory.get_absolut_path_by_user('##', user_id)[:-2]
    os.rmdir(home_dir)

    # clear database registery
    db_con, db_cursor = db_handler.create_connection()
    query = "DELETE FROM Files WHERE owner_id = ?"
    db_cursor.execute(query, (user_id,))

    query = "DELETE FROM Folders WHERE owner_id = ?"
    db_cursor.execute(query, (user_id,))

    query = "DELETE FROM Sessions WHERE user_id = ?"
    db_cursor.execute(query, (user_id,))

    query = "DELETE FROM Users WHERE id = ?"
    db_cursor.execute(query, (user_id,))

    db_con.commit()

    
    return make_result('User successfully removed.')


def create_user_account(username:str, group_id:str):
    
    id = security.generate_id()
    root_folder_id = json.loads(file_control_tools.new_folder(username, '0'*119, id))['result']['folder_id']


    db_con, db_cursor = db_handler.create_connection()
    query = "INSERT INTO Users (id, username, password, user_group, home_dir, root_dir) VALUES (?, ?, ?, ?, ?, ?)"
    db_cursor.execute(query, (id, username, sha256(username.encode()).hexdigest(), group_id, '/' + username, root_folder_id))

    query = "UPDATE Folders SET folder_type = ? WHERE folder_id = ?"
    db_cursor.execute(query, ("UserFolder", root_folder_id))
    db_con.commit()

    os.mkdir(boilerplate.get_value_of_config('DEFAULT', 'home') + '/' + username)

    result:dict = {}
    result['user_id'] = id

    return make_result(result)

def set_user_properties(user_id:str, properties:list, values:list):
    
    db_con, db_cursor = db_handler.create_connection()

    for property in range(len(properties)):
        match properties[property]:
            case 'username':
                if values[property].find(' ') != -1: return message_statics.INVALID_VALUE

                query = "UPDATE Users SET username = ? WHERE id = ?"
                db_cursor.execute(query, (values[property], user_id))
                db_con.commit()
            case 'password':
                try:
                    password = base64.decodebytes(values[property].encode()).decode()
                except b64Error:
                    return message_statics.BASE64_ERROR
                
                query = "UPDATE Users SET password = ? WHERE id = ?"
                password = sha256(password.encode()).hexdigest()
                db_cursor.execute(query, (password, user_id))
                db_con.commit()
            case 'user_group':
                if not users.check_group_id(values[property]): return message_statics.UKNOWN_GROUP_ID

                query = "UPDATE Users SET user_group = ? WHERE id = ?"
                db_cursor.execute(query, (values[property], user_id))
                db_con.commit()


    return make_result('Properties successfully changed')