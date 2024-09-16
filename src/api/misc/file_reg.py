import sqlite3
import time
import datetime

import API.users as users
from misc.boilerplate import HOMECLOUD_DB_PATH

import misc.db_handler as db_handler
import misc.security as security
import misc.message_statics as message_statics

import misc.hc_exceptions as hc_exceptions

import flask 


def check_download_id(download_id:str) -> bool:
        '''Checks whether a valid upload with given id is active. Does not check for timeout.'''

        db_con, db_cursor = db_handler.create_connection()

        query = "SELECT id FROM Downloads WHERE id=?"
        db_cursor.execute(query, (download_id,))
        result = db_cursor.fetchall()

        if len(result) == 1: return True
        else: return False

    
def check_folder_write_perm(user:dict, folder_id:str) -> bool:
    if not check_folder_id(folder_id): raise LookupError("Invalid folder id.")

    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT perm FROM Folders WHERE folder_id=?"
    db_cursor.execute(query, (folder_id,))
    perm = db_cursor.fetchone()[0]

    db_cursor.execute("SELECT public FROM Folders WHERE folder_id=?", (folder_id,))
    is_public = db_cursor.fetchone()[0]

    if (is_public == 1) and (perm[5] == 'w'): return True

    db_cursor.execute("SELECT owner_id FROM Folders WHERE folder_id=?", (folder_id,))
    owner_id = db_cursor.fetchone()[0]
    db_cursor.execute("SELECT UserGroups.group_id FROM Users INNER JOIN UserGroups ON UserGroups.group_id = Users.user_group WHERE id=?", (owner_id,))
    owner_group = db_cursor.fetchone()[0]

    if (user['group_id'] == owner_group) and (perm[3] == 'w'): return True


    if (owner_id == user['id']) and (perm[1] == 'w'): return True

    return False


def check_folder_read_perm(user:dict, folder_id:str) -> bool:
    if not check_folder_id(folder_id): raise LookupError("Invalid folder id.")

    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT perm FROM Folders WHERE folder_id=?"
    db_cursor.execute(query, (folder_id,))
    perm = db_cursor.fetchone()[0]

    db_cursor.execute("SELECT public FROM Folders WHERE folder_id=?", (folder_id,))
    is_public = db_cursor.fetchone()[0]

    if (is_public == 1) and (perm[4] == 'r'): return True


    db_cursor.execute("SELECT owner_id FROM Folders WHERE folder_id=?", (folder_id,))
    owner_id = db_cursor.fetchone()[0]
    db_cursor.execute("SELECT UserGroups.group_id FROM Users INNER JOIN UserGroups ON UserGroups.group_id = Users.user_group WHERE id=?", (owner_id,))
    owner_group = db_cursor.fetchone()[0]

    if (user['group_id'] == owner_group) and (perm[2] == 'r'): return True


    if (owner_id == user['id']) and (perm[0] == 'r'): return True

    return False


def check_folder_perm(user:dict, folder_id:str, intended_process:str) -> bool:
    '''Checks if user has permission on the folder.
    
    user: user dict

    folder_id: Id of folder

    intended_process: Procedure to be testet (read/write/properties)
    '''

    if user['is_admin']: return True 
    
    db_con, db_cursor = db_handler.create_connection()

    if not check_folder_id(folder_id): 
        raise LookupError("Invalid folder id.")

    match intended_process:
        case 'read':
            return check_folder_read_perm(user, folder_id)
        case 'write':
            return check_folder_write_perm(user, folder_id)
        case 'properties':
            db_cursor.execute("SELECT owner_id FROM Folders WHERE folder_id=?", (folder_id,))
            file_owner = db_cursor.fetchone()[0]
            if file_owner == user['id']: return True

    return False


def check_folder_id(folder_id) -> bool: 
    '''Returns true if folder id does exist and false if not.''' 

    db_con, db_cursor = db_handler.create_connection()

    query = "SELECT folder_id FROM Folders WHERE folder_id=?"
    db_cursor.execute(query, (folder_id,))
    result = db_cursor.fetchall()

    if len(result) == 1: return True
    else: return False


def check_file_id(file_id:str) -> bool:
    '''Returns true if file id does exist and false if not.'''

    db_con, db_cursor = db_handler.create_connection()

    query = "SELECT file_id FROM Files WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    result = db_cursor.fetchall()

    if len(result) == 1: return True
    else: return False


def file_exists(file_name, folder_id) -> bool:
    '''Returns true if file with name exists in the folder.'''

    db_con, db_cursor = db_handler.create_connection()

    query = "SELECT file_id From Files WHERE file_name=? AND containing_folder=?"
    db_cursor.execute(query, (file_name, folder_id))
    result = db_cursor.fetchall()

    if len(result) == 0: return False
    else: return True


def folder_exists(folder_name, containing_folder_id):
    '''Returns true if folder with name exists in the folder.'''

    db_con, db_cursor = db_handler.create_connection()

    query = "SELECT folder_id From Folders WHERE folder_name=? AND containing_folder=?"
    db_cursor.execute(query, (folder_name, containing_folder_id))
    result = db_cursor.fetchall()

    if len(result) == 0: return False
    else: return True


def check_file_write_perm(user:dict, file_id:str) -> bool:
    if not check_file_id(file_id): raise LookupError("Invalid file id.")

    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT perm FROM Files WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    perm = db_cursor.fetchone()[0]

    db_cursor.execute("SELECT public FROM Files WHERE file_id=?", (file_id,))
    is_public = db_cursor.fetchone()[0]

    if (is_public == 1) and (perm[5] == 'w'): return True


    db_cursor.execute("SELECT owner_id FROM Files WHERE file_id=?", (file_id,))
    owner_id = db_cursor.fetchone()[0]
    db_cursor.execute("SELECT UserGroups.group_id FROM Users INNER JOIN UserGroups ON UserGroups.group_id = Users.user_group WHERE id=?", (owner_id,))
    owner_group = db_cursor.fetchone()[0]

    if (user['group_id'] == owner_group) and (perm[3] == 'w'): return True


    if (owner_id == user['id']) and (perm[1] == 'w'): return True

    return False


def check_file_read_perm(user:dict, file_id:str) -> bool:
    if not check_file_id(file_id): raise LookupError("Invalid file id.")

    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT perm FROM Files WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    perm = db_cursor.fetchone()[0]

    db_cursor.execute("SELECT public FROM Files WHERE file_id=?", (file_id,))
    is_public = db_cursor.fetchone()[0]

    if (is_public == 1) and (perm[4] == 'r'): return True


    db_cursor.execute("SELECT owner_id FROM Files WHERE file_id=?", (file_id,))
    owner_id = db_cursor.fetchone()[0]
    db_cursor.execute("SELECT UserGroups.group_id FROM Users INNER JOIN UserGroups ON UserGroups.group_id = Users.user_group WHERE id=?", (owner_id,))
    owner_group = db_cursor.fetchone()[0]

    if (user['group_id'] == owner_group) and (perm[2] == 'r'): return True


    if (owner_id == user['id']) and (perm[0] == 'r'): return True

    return False


    
def check_file_perm(user:dict, file_id:str, intended_process:str) -> bool:
    '''Checks if user has permission on the file.
    
    user: user dict

    file_id: Id of file

    intended_process: Procedure to be testet (read/write/properties)
    '''

    if user['is_admin']: return True 
    
    db_con, db_cursor = db_handler.create_connection()

    if not check_file_id(file_id): 
        raise LookupError("Invalid file id.")

    match intended_process:
        case 'read':
            return check_file_read_perm(user, file_id)
        
        case 'write':
            return check_file_write_perm(user, file_id)
        
        case 'properties':
            db_cursor.execute("SELECT owner_id FROM Files WHERE file_id=?", (file_id,))
            file_owner = db_cursor.fetchone()[0]
            if file_owner == user['id']: return True

        case 'read_properties':
            db_cursor.execute("SELECT owner_id FROM Files WHERE file_id=?", (file_id,))
            file_owner = db_cursor.fetchone()[0]

            if file_owner == user['id']: return True

            db_cursor.execute("SELECT group_id FROM Users WHERE id=?", (file_owner,))
            owner_group = db_cursor.fetchone()[0]
            
            if owner_group == user['group_id']: return True

    return False


def is_file_locked(file_id:str) -> bool:
    '''Returns true if file is locked by any process.'''

    db_con, db_cursor = db_handler.create_connection()

    query = "SELECT lock FROM Files WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    result = db_cursor.fetchall()[0][0]


    if result == '': return False
    else: return True 


def download_time_out(download_id:str) -> bool:
    '''Checks if given download is timed out.'''

    db_con, db_cursor = db_handler.create_connection()

    query = "SELECT timed_out FROM Downloads WHERE id=?"
    db_cursor.execute(query, (download_id,))
    result = db_cursor.fetchall()

    if len(result) == 0: return None
    elif result[0][0] == 1: return True
    else: return False 

    
def check_upload_id(upload_id:str) -> bool:
    '''Checks whether a valid upload with given id is active. Does not check for timeout.'''

    db_con, db_cursor = db_handler.create_connection()

    query = "SELECT id FROM Uploads WHERE id=?"
    db_cursor.execute(query, (upload_id,))
    result = db_cursor.fetchall()

    if len(result) == 1: return True
    else: return False


def check_perm_validity(perm:str) -> bool:

    if (len(perm) != 6): return False

    for c in perm:
        if (not (c == 'r' or c == 'w' or c == '_')):
            return False
    
    return True

def get_file_type(file_suffix:str) -> str:
    '''Returns file of a type.'''

    db_con, db_cursor = db_handler.create_connection()

    query = "SELECT file_type FROM FileTypes WHERE file_suffix=?"
    db_cursor.execute(query, ('.' + file_suffix,))
    result = db_cursor.fetchall()

    if len(result) == 1:
        return result[0][0]
    else: 
        return file_suffix.capitalize() + 'File'
    
def get_file_properties(file_id:str) -> dict:
    '''Returns all properties of a file.
    
    file['file_id']             =       Unique id of file
    
    file['file_name']           =       name of file
    
    file['containing_folder']   =       folder the file is contained in
    
    file['owner_id']            =       owner id of the file owner
    
    file['last_opened']         =       unixepoch timestamp, when file was last opened
    
    file['last_changed']        =       unixepoch timestamp, when file was last changed
    
    file['created']             =       unixepoch timestamp, when file was created
    
    file['description']         =       user description of the file
    
    file['file_size']           =       size of the file in bytes
    
    file['file_type']           =       type of the file defined in HomeCloud.db
    
    file['perm']                =       file permission setting
    
    file['public']              =       0 for not public / 1 for public (public files are visible by everybody with the file id)
    
    file['allowed_users']       =       a specific set of users allowed to access the file. Specific permission defined, by third perm bit
    
    file['lock']                =       lock id for file locks (empty if no lock is enforced) 
    
    file['lock_owner_id']       =       owner of lock id (empty of no lock is enforced)

    '''
    file:dict = {}
    
    db_con, db_cursor = db_handler.create_connection()

    query = "SELECT * FROM Files WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    file_props = db_cursor.fetchall()[0]
    
    file['file_id']             =       file_props[0]
    file['file_name']           =       file_props[1]
    file['containing_folder']   =       file_props[2]
    file['owner_id']            =       file_props[3]
    file['last_opened']         =       file_props[4]
    file['last_changed']        =       file_props[5]
    file['created']             =       file_props[6]
    file['description']         =       file_props[7]
    file['file_size']           =       file_props[8]
    file['file_type']           =       file_props[9]
    file['perm']                =       file_props[10]
    file['public']              =       file_props[11]
    file['allowed_users']       =       file_props[12]
    file['lock']                =       file_props[13]
    file['lock_owner_id']       =       file_props[14]

    return file

def get_folder_properties(folder_id:str) -> dict:
    '''Returns all properties of a file.
    
    folder['folder_id']           =       Unique id of folder
    
    folder['folder_name']         =       name of folder
    
    folder['containing_folder']   =       folder the folder is contained in
    
    folder['owner_id']            =       owner id of the folder owner
    
    folder['last_changed']        =       unixepoch timestamp, when folder was last changed
    
    folder['created']             =       unixepoch timestamp, when folder was created
    
    folder['description']         =       user description of the folder
    
    folder['folder_type']         =       type of the folder defined in HomeCloud.db
    
    folder['perm']                =       folder permission setting
    
    folder['public']              =       0 for not public / 1 for public (public folders are visible by everybody with the folders id)
    
    folder['allowed_users']       =       a specific set of users allowed to access the folder. Specific permission defined, by third perm bit

    '''
    folder:dict = {}
    
    db_con, db_cursor = db_handler.create_connection()

    query = "SELECT * FROM Folders WHERE folder_id=?"
    db_cursor.execute(query, (folder_id,))
    folder_props = db_cursor.fetchall()[0]
    
    folder['folder_id']           =       folder_props[0]
    folder['folder_name']         =       folder_props[1]
    folder['containing_folder']   =       folder_props[2]
    folder['owner_id']            =       folder_props[3]
    folder['last_changed']        =       folder_props[4]
    folder['created']             =       folder_props[5]
    folder['description']         =       folder_props[6]
    folder['folder_type']         =       folder_props[7]
    folder['perm']                =       folder_props[8]
    folder['public']              =       folder_props[9]
    folder['allowed_users']       =       folder_props[10]

    return folder

def lock_file(file_id:str, user_id:str) -> str:
    '''Makes a file unaccessible by a different process. Lock id is necessary to unlock file again'''

    if not check_file_id(file_id): raise LookupError("File id not valid.")
    if is_file_locked(file_id): raise hc_exceptions.FileLocked('File is already locked by other process.')

    lock_id = security.generate_id()

    db_con, db_cursor = db_handler.create_connection()
    query = "UPDATE Files SET lock=? WHERE file_id=?"
    db_cursor.execute(query, (lock_id, file_id))
    db_con.commit()
    query = "UPDATE Files SET lock_owner_id=? WHERE file_id=?"
    db_cursor.execute(query, (user_id, file_id))
    db_con.commit()

    return lock_id

@staticmethod
def unlock_file(file_id:str, lock_id:str) -> str:
    '''Makes a locked file accessible again. Lock id is needed to confirm ownership of the lock.'''

    if not check_file_id(file_id): raise LookupError("File id not valid.")
    if not is_file_locked(file_id): return

    db_con, db_cursor = db_handler.create_connection()
    query = "UPDATE Files SET lock_owner_id='' WHERE file_id=? and lock=?"
    db_cursor.execute(query, (file_id, lock_id))
    db_con.commit()

    query = "UPDATE Files SET lock='' WHERE file_id=? and lock=?"
    db_cursor.execute(query, (file_id, lock_id))
    db_con.commit()

    if is_file_locked(file_id): return message_statics.WRONG_LOCK_ID


def update_last_opened(file_id, timestamp:float = None) -> None:
    '''Updates the last opened date of a file.'''

    if timestamp == None:
        timestamp = time.mktime(datetime.datetime.now().timetuple())

    db_con = sqlite3.connect(HOMECLOUD_DB_PATH)
    db_cursor = db_con.cursor()

    query = "UPDATE Files SET last_opened=? WHERE file_id=?"
    db_cursor.execute(query, (timestamp, file_id))
    db_con.commit()

def update_last_changed_folder(folder_id:str) -> None:
    '''Updates the last changed date of a folder.'''

    db_con = sqlite3.connect(HOMECLOUD_DB_PATH)
    db_cursor = db_con.cursor()

    query = "UPDATE Folders SET last_changed=? WHERE folder_id=?"
    db_cursor.execute(query, (time.mktime(datetime.datetime.now().timetuple()), folder_id))
    db_con.commit()

def update_last_changed_file(file_id:str) -> None:
    '''Update the "last_changed" date of a file.'''

    db_con, db_cursor = db_handler.create_connection()
    query = "UPDATE Files SET last_changed=? WHERE file_id=?"
    db_cursor.execute(query, (time.mktime(datetime.datetime.now().timetuple()), file_id))
    db_con.commit()