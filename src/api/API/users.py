import sqlite3

from misc.boilerplate import HOMECLOUD_DB_PATH

import misc.hc_exceptions as hc_exceptions

# can't include db_handler, due to circular import created by directory module !IMPORTANT: Might need fix.
def create_connection() -> tuple:
        '''Returns (db_connection, db_cursor)'''

        db_con = sqlite3.connect(HOMECLOUD_DB_PATH)
        db_cursor = db_con.cursor()

        return (db_con, db_cursor)
    

def get_user_properties_by_session(session_id:str) -> dict:
    '''Gets all properties of a user.
    username

    home_dir

    group_id

    id

    is_admin

    '''

    db_con = sqlite3.connect(HOMECLOUD_DB_PATH)
    db_cursor = db_con.cursor()

    query = "SELECT username, home_dir, user_group, id, admin, root_dir FROM Users INNER JOIN Sessions ON Users.id = Sessions.user_id INNER JOIN UserGroups ON UserGroups.group_id = Users.user_group WHERE session_id=?"
    db_cursor.execute(query, (session_id,))
    user:dict = {}

    result = db_cursor.fetchall()[0]
    if len(result) != 6:
        raise hc_exceptions.NoSessionError('This operations requires an active session of the user.') 

    if result[4] == 1:
        is_admin = True
    else:
        is_admin = False

    user['username'], user['home_dir'], user['group_id'], user['id'], user['is_admin'], user['root_folder_id'] = result
    user['is_admin'] = is_admin

    return user


def get_user_properties_by_user_id(user_id:str) -> dict:
    '''Gets all properties of a user.
    username

    home_dir

    perm

    id

    is_admin

    '''

    db_con = sqlite3.connect(HOMECLOUD_DB_PATH)
    db_cursor = db_con.cursor()

    query = "SELECT username, home_dir, user_group, id, admin, root_dir FROM Users INNER JOIN UserGroups ON UserGroups.group_id = Users.user_group WHERE id=?"
    db_cursor.execute(query, (user_id,))
    user:dict = {}

    result = db_cursor.fetchall()[0]
    if len(result) != 6:
        raise hc_exceptions.InvalidUserId('User id corresponds to no user.')

    if result[4] == 1:
        is_admin = True
    else:
        is_admin = False

    user['username'], user['home_dir'], user['group_id'], user['id'], user['is_admin'], user['root_folder_id'] = result
    user['is_admin'] = is_admin

    return user


def check_user_id(user_id:str):
    try:
        query = "SELECT id FROM Users WHERE id=?"
        db_con, db_cursor = create_connection()
        db_cursor.execute(query, (user_id,))
        if len(db_cursor.fetchall()) >= 1: 
            return True
    except:
        return False
    
def check_username(username:str):
    query = "SELECT username FROM Users WHERE username = ?"
    db_con, db_cursor = create_connection()
    db_cursor.execute(query, (username,))

    if len(db_cursor.fetchall()) >= 1: 
            return True
    else: 
        return False
    

def get_group_properties(group_id):
    db_con = sqlite3.connect(HOMECLOUD_DB_PATH)
    db_cursor = db_con.cursor()

    query = "SELECT group_name, admin, group_folder FROM UserGroups WHERE group_id = ?"
    db_cursor.execute(query, (group_id,))
    result:list = db_cursor.fetchone()

    data:dict = {}

    data['group_name'] = result[0]
    data['is_admin'] = result[1]
    data['group_folder'] = result[2]

    return data


def check_group_id(group_id):
    try:
        query = "SELECT group_id FROM UserGroups WHERE group_id=?"
        db_con, db_cursor = create_connection()
        db_cursor.execute(query, (group_id,))
        if len(db_cursor.fetchone()) == 1: 
            return True
    except:
        return False