'''
This is file is the worker file for the file_control endpoint. 
See endpoints.py for further reference
'''

import os
import datetime
import time
import json
import threading
import base64
import shutil
import math

from misc.boilerplate import make_result
import misc.message_statics as message_statics
import misc.directory as directory
import misc.security as security
import misc.db_handler as db_handler
import misc.file_reg as file_reg 

from binascii import Error as b64Error

def get_file(file_id:str) -> str:
    _, db_cursor = db_handler.create_connection()

    content = ''

    query = "SELECT file_name, owner_id, file_size FROM Files WHERE file_id = ?"
    db_cursor.execute(query, (file_id,))
    file:list = db_cursor.fetchall()[0]

    try:
        if (file[2] / (1024 * 1024)) > 5:
            return message_statics.FILE_TO_LARGE_TO_GET

        with open(directory.get_absolut_path_by_user('/' + file_id, file[1]), 'rb') as _file:
            content_bytes = _file.read()
            _file.close()
    except:
        return message_statics.FILE_DELETED

    file_reg.update_last_opened(file_id, None)

    try:
        content = base64.b64encode(content_bytes).decode()
    except b64Error:
        return message_statics.BASE64_ERROR

    result:dict = {}
    result['content'] = content
    result['file_name'] = file[0]

    return make_result(result)


def save_file(file_id:str, file_name:str, content_bytes:str):
    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT containing_folder, owner_id, file_size FROM Files WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    file:list = db_cursor.fetchall()[0]

    if (len(content_bytes) / (1024 * 1024)) > 5:
        return message_statics.FILE_TO_LARGE_TO_SAVE

    if file_name != None:
        rename_file(file_id, file_name)

    file_reg.update_last_changed_file(file_id)
    
    with open(directory.get_absolut_path_by_user('/' + file_id, file[1]), 'wb') as _file:
            _file.write(content_bytes)
            _file.close()
    
    size = os.path.getsize(directory.get_absolut_path_by_user('/' + file_id, file[1]))

    query = "UPDATE Files SET file_size=? WHERE file_id=?"
    db_cursor.execute(query, (size, file_id))
    db_con.commit()
    
    return make_result('File saved successfully.')


def rename_file(file_id:str, name:str):
    db_con, db_cursor = db_handler.create_connection()

    query = "UPDATE Files SET file_name=?, file_type=? WHERE file_id=?"
    db_cursor.execute(query, (name, file_reg.get_file_type(name.split('.')[-1]), file_id))
    db_con.commit()

    return make_result('File successfully renamed.')

def rename_folder(folder_id:str, name:str):
    db_con, db_cursor = db_handler.create_connection()
    query = "UPDATE Folders SET folder_name=? WHERE folder_id=?"
    db_cursor.execute(query, (name, folder_id,))
    db_con.commit()

    return make_result("Folder successfully renamed.")


def set_file_properties(file_id:str, properties:list, values:list) -> str:
    db_con, db_cursor = db_handler.create_connection()

    if (len(properties) != len(values)):
        return message_statics.LIST_LEN_DOES_NOT_MATCH

    i:int = 0

    for property in properties:
        
        match property:
            case 'name':
                query:str = "UPDATE Files SET file_name=? WHERE file_id=?"
                try:
                    db_cursor.execute(query, (base64.decodebytes(values[i].encode()).decode(), file_id))
                except b64Error:
                    return message_statics.BASE64_ERROR
            case 'perm':
                if (not file_reg.check_perm_validity(values[i])): return message_statics.SYNTAX_ERROR
                query:str = "UPDATE Files SET perm=? WHERE file_id=?"
                db_cursor.execute(query, (values[i], file_id))
            case 'allowed_users':
                query:str = "UPDATE Files SET allowed_users=? WHERE file_id=?"
                db_cursor.execute(query, (values[i], file_id))
            case 'description':
                query:str = "UPDATE Files SET description=? WHERE file_id=?"
                try:
                    db_cursor.execute(query, (base64.decodebytes(values[i].encode()).decode(), file_id))
                except b64Error:
                    return message_statics.BASE64_ERROR
            case 'is_public':
                if (str(type(values[i])) != 'bool'): message_statics.SYNTAX_ERROR
                query:str = "UPDATE Files SET public=? WHERE file_id=?"
                db_cursor.execute(query, (values[i], file_id))
            case _:
                return message_statics.UNKNOWN_PROPERTY_NAME
                
        i = i + 1
            
    db_con.commit()

    return make_result('File properties changed successfully.')

def set_folder_properties(folder_id:str, properties:list, values:list) -> str:
    db_con, db_cursor = db_handler.create_connection()

    if (len(properties) != len(values)):
        return message_statics.LIST_LEN_DOES_NOT_MATCH
    
    i:int = 0

    for property in properties:
        
        match property:
            case 'name':
                query:str = "UPDATE Folders SET folder_name=? WHERE folder_id=?"
                try:
                    db_cursor.execute(query, (base64.decodebytes(values[i].encode()).decode(), folder_id))
                except b64Error:
                    return message_statics.BASE64_ERROR
            case 'perm':
                if (not file_reg.check_perm_validity(values[i])): return message_statics.SYNTAX_ERROR
                query:str = "UPDATE Folders SET perm=? WHERE folder_id=?"
                db_cursor.execute(query, (values[i], folder_id))
            case 'allowed_users':
                query:str = "UPDATE Folders SET allowed_users=? WHERE folder_id=?"
                db_cursor.execute(query, (values[i], folder_id))
            case 'description':
                query:str = "UPDATE Folders SET description=? WHERE folder_id=?"
                try:
                    db_cursor.execute(query, (base64.decodebytes(values[i].encode()).decode(), folder_id))
                except b64Error:
                    return message_statics.BASE64_ERROR
            case 'is_public':
                if (str(type(values[i])) != 'bool'): message_statics.SYNTAX_ERROR
                query:str = "UPDATE Folders SET public=? WHERE folder_id=?"
                db_cursor.execute(query, (values[i], folder_id))
            case _:
                return message_statics.UNKNOWN_PROPERTY_NAME

        i = i + 1    

    db_con.commit()

    return make_result('Folder properties changed successfully.')


def move_file(file_id:str, containing_folder:str, new_folder_id:str, name:str, old_name:str) -> str:
    db_con, db_cursor = db_handler.create_connection()

    if (name == None): name = old_name
    else:
        try:
            name = base64.decodebytes(name.encode()).decode()
        except b64Error:
            return message_statics.BASE64_ERROR


    file_reg.update_last_changed_folder(containing_folder)
    file_reg.update_last_changed_folder(new_folder_id)

    query = "UPDATE Files SET containing_folder=?, file_name=? WHERE file_id=?"
    db_cursor.execute(query, (new_folder_id, name, file_id,))
    db_con.commit()

    return make_result('File successfully moved.')

def move_folder(folder_id:str, containing_folder_id:str, new_folder_id:str, name:str, old_name:str) -> str:

    db_con, db_cursor = db_handler.create_connection()
    if (name == None): name = old_name
    else:
        try:
            name = base64.decodebytes(name.encode()).decode()
        except b64Error:
            return message_statics.BASE64_ERROR


    file_reg.update_last_changed_folder(containing_folder_id)
    file_reg.update_last_changed_folder(new_folder_id)

    query = "UPDATE Folders SET containing_folder=?, folder_name=? WHERE folder_id=?"
    db_cursor.execute(query, (new_folder_id, name, folder_id,))
    db_con.commit()

    return make_result('Folder successfully moved.')

def copy_file(file_id:str, new_folder_id:str, user_id:str) -> str:
    file_reg.update_last_changed_folder(new_folder_id)

    file:dict = file_reg.get_file_properties(file_id)

    copy_name:str = file['file_name']
    file_extension:str = copy_name.split('.')[-1]
    copy_name = ''.join(copy_name.split('.')[:-1])

    while file_reg.file_exists(copy_name + '.' + file_extension, new_folder_id):
        copy_name = copy_name + ' - copy'

    copy_file_id:str = json.loads(new_file(copy_name + '.' + file_extension, new_folder_id, user_id))['result']['file_id']

    shutil.copyfile(directory.get_absolut_path_by_user('/' + file_id, file['owner_id']), directory.get_absolut_path_by_user('/' + copy_file_id, file['owner_id']))
    
    file_size:int = os.path.getsize(directory.get_absolut_path_by_user('/' + copy_file_id, file['owner_id']))

    db_con, db_cursor = db_handler.create_connection()
    query:str = "UPDATE Files SET file_size=? WHERE file_id=?"
    db_cursor.execute(query, (file_size, copy_file_id))
    db_con.commit()

    return make_result('File successfully copied.')

def get_file_properties(file_id:str, properties:list) -> str:

    file:dict = file_reg.get_file_properties(file_id)

    result:dict = {}

    for property in properties:
        if not property in file.keys(): return message_statics.UNKNOWN_PROPERTY_NAME 

        result[property] = file[property]

    return make_result(result)

def get_folder_properties(folder_id:str, properties:str) -> str:
    folder:dict = file_reg.get_folder_properties(folder_id)

    result:dict = {}

    for property in properties:
        if not property in folder.keys(): return message_statics.UNKNOWN_PROPERTY_NAME 

        result[property] = folder[property]

    return make_result(result)



def get_folder_content(folder_id:str, user:dict) -> str:
    result:dict = {}
    result['folders'] = {}
    result['files'] = {}

    db_con, db_cursor = db_handler.create_connection()

    query = "SELECT folder_id, folder_name, Users.username, last_changed, folder_type FROM Folders INNER JOIN Users ON Users.id = Folders.owner_id WHERE containing_folder=?"
    db_cursor.execute(query, (folder_id,))
    folders = db_cursor.fetchall()

    for folder in folders:
        _folder_id = folder[0]
        result['folders'][_folder_id] = {}
        result['folders'][_folder_id]['folder_name']         = folder[1]
        result['folders'][_folder_id]['folder_type']         = folder[4]

        if not file_reg.check_folder_perm(user, folder[0], 'read'): continue

        result['folders'][_folder_id]['owner']               = folder[2]
        result['folders'][_folder_id]['last_changed']        = folder[3]

    query = "SELECT file_id, file_name, Users.username, last_changed, file_size, file_type FROM Files INNER JOIN Users ON Users.id = Files.owner_id WHERE containing_folder=?"
    db_cursor.execute(query, (folder_id,))
    files = db_cursor.fetchall()

    for file in files:
        _file_id = file[0]
        result['files'][_file_id] = {}
        result['files'][_file_id]['file_name']           = file[1]
        result['files'][_file_id]['file_type']           = file[5]
        result['files'][_file_id]['file_size']           = file[4]

        if not file_reg.check_file_perm(user, file[0], 'read'): continue

        result['files'][_file_id]['owner']               = file[2]
        result['files'][_file_id]['last_changed']        = file[3]

    return make_result(result)

def new_file(file_name:str, folder_id:str, user_id:str) -> str:

    if file_reg.file_exists(file_name, folder_id): return message_statics.DUPLICATE_FILE_NAME

    db_con, db_cursor = db_handler.create_connection()

    while True:
        file_id = security.generate_id()
        query = "SELECT file_id FROM Files WHERE file_id = ?"
        db_cursor.execute(query, (file_id,))
        if len(db_cursor.fetchall()) == 0: break

    current_time = time.mktime(datetime.datetime.now().timetuple())

    file_type = file_reg.get_file_type(file_name.split('.').pop())

    query = "INSERT INTO Files (file_id, file_name, containing_folder, owner_id, last_opened, last_changed, created, description, file_size, file_type, perm, public, allowed_users) VALUES (?, ?, ?, ?, ?, ?, ?, '', 0, ?, 'rwr_r_', 0, '')"
    db_cursor.execute(query, (file_id, file_name, folder_id, user_id, current_time, current_time, current_time, file_type))
    db_con.commit()

    with open(directory.get_absolut_path_by_user('/' + file_id, user_id), 'x') as file:
        file.close()

    file_reg.update_last_changed_folder(folder_id)

    result:dict = {}
    result['file_id'] = file_id

    return make_result(result)


def new_folder(folder_name:str, containing_folder_id:str, user_id:str) -> str:
    db_con, db_cursor = db_handler.create_connection()

    while True:
        folder_id = security.generate_id()
        query = "SELECT folder_id FROM Folders WHERE folder_id = ?"
        db_cursor.execute(query, (folder_id,))
        if len(db_cursor.fetchall()) == 0: break

    current_time = time.mktime(datetime.datetime.now().timetuple())

    query = "INSERT INTO Folders (folder_id, folder_name, containing_folder, owner_id, last_changed, created, description, folder_type, perm, public, allowed_users) VALUES (?, ?, ?, ?, ?, ?, '', 'Folder', 'rwr_r_', 0, '')"
    db_cursor.execute(query, (folder_id, folder_name, containing_folder_id, user_id, current_time, current_time))
    db_con.commit()

    file_reg.update_last_changed_folder(containing_folder_id)

    result:dict = {}
    result['folder_id'] = folder_id

    return make_result(result)

def remove_folder(folder_id:str, containing_folder_id:str) -> str:
    db_con, db_cursor = db_handler.create_connection()

    query = "DELETE FROM Folders WHERE folder_id=?"
    db_cursor.execute(query, (folder_id,))
    db_con.commit()

    file_reg.update_last_changed_folder(containing_folder_id)

    threading.Thread(target = db_handler.remove_folder_content, args = (folder_id,)).start()

    return make_result('Folder deleted successfully.')

def remove_file(file_id:str, file:str) -> str:
    db_con, db_cursor = db_handler.create_connection()

    query = "DELETE FROM Files WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    db_con.commit()

    os.remove(directory.get_absolut_path_by_user('/' + file_id, file[1]))

    file_reg.update_last_changed_folder(file[0])

    return make_result('File deleted successfully.')

def force_unlock_file(file_id:str) -> str:
    db_con, db_cursor = db_handler.create_connection()

    query = "UPDATE Files SET lock='' WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    db_con.commit()
    
    query = "UPDATE Files SET lock_owner_id='' WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    db_con.commit()

    return make_result('File successfully unlocked.')

def init_upload(file_id:str, user_id:str) -> str:
    db_con, db_cursor = db_handler.create_connection()

    upload_id:str = security.generate_id()
    current_time:float = time.mktime(datetime.datetime.now().timetuple())

    lock_id = file_reg.lock_file(file_id, user_id)
    
    query = "INSERT INTO Uploads (id, user_id, file_id, start, lock_id) VALUES (?, ?, ?, ?, ?)"
    db_cursor.execute(query, (upload_id, user_id, file_id, current_time, lock_id))
    db_con.commit()

    result:dict = {}
    result['upload_id'] = upload_id

    return make_result(result)


def upload_chunk(upload_id:str, chunk_bytes:str) -> str:
    _, db_cursor = db_handler.create_connection()

    query = "SELECT id, user_id, file_id From Uploads WHERE id=?"
    db_cursor.execute(query, (upload_id,))
    upload:list = db_cursor.fetchall()[0]

    with open(directory.get_absolut_path_by_user('/' + upload[2], upload[1]), 'ab') as file:
        file.write(chunk_bytes)
        file.close()

    return make_result()


def complete_chunked_upload(upload_id:str) -> str:
    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT id, user_id, file_id, lock_id From Uploads WHERE id=?"
    db_cursor.execute(query, (upload_id,))
    upload:list = db_cursor.fetchall()[0]

    query = "UPDATE Uploads SET lock_id='' WHERE id=?"
    db_cursor.execute(query, (upload_id,))
    db_con.commit()

    size = os.path.getsize(directory.get_absolut_path_by_user('/' + upload[2], upload[1]))

    query = "UPDATE Files SET file_size=? WHERE file_id=?"
    db_cursor.execute(query, (size, upload[2]))
    db_con.commit()

    try:
        file_reg.unlock_file(upload[2], upload[3])
    except:
        return make_result('File upload completed. Lock couldn\'t be lifted', status = 402)

    return make_result('File upload successfully finished.')

def cancel_chunked_upload(upload_id:str) -> str:
    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT id, user_id, file_id From Uploads WHERE id=?"
    db_cursor.execute(query, (upload_id,))
    upload:list = db_cursor.fetchall()[0]

    query = "DELETE FROM Files WHERE file_id=?"
    db_cursor.execute(query, (upload[2],))
    db_con.commit()
    query = "UPDATE Uploads SET lock_id='' WHERE id=?"
    db_cursor.execute(query, (upload_id,))
    db_con.commit()

    os.remove(directory.get_absolut_path_by_user('/' + upload[2], upload[1]))

    return make_result('Upload successfully canceled.')

def init_download(file_id:str, user_id:str) -> str:
    db_con, db_cursor = db_handler.create_connection()

    download_id:str = security.generate_id()
    current_time:float = time.mktime(datetime.datetime.now().timetuple())

    lock_id = file_reg.lock_file(file_id, user_id)

    query = "SELECT owner_id FROM Files WHERE file_id = ?"
    db_cursor.execute(query, (file_id,))
    file_owner_id = db_cursor.fetchone()[0]

    all_chunks = math.floor(os.path.getsize(directory.get_absolut_path_by_user('/' + file_id, file_owner_id)) / (1024 * 1024)) + 1

    query = "INSERT INTO Downloads (id, user_id, file_id, start, lock_id, all_chunks, current_chunk) VALUES (?, ?, ?, ?, ?, ?, 0)"
    db_cursor.execute(query, (download_id, user_id, file_id, current_time, lock_id, all_chunks))
    db_con.commit()

    result:dict = {}
    result['download_id'] = download_id
    result['chunks'] = str(all_chunks)

    return make_result(result)


def download_chunk(download_id:str) -> str:
    db_con, db_cursor = db_handler.create_connection()

    query = "SELECT current_chunk, all_chunks FROM Downloads WHERE id=?"
    db_cursor.execute(query, (download_id,))
    current_chunks, all_chunks = db_cursor.fetchall()[0]

    if current_chunks == all_chunks: return message_statics.DOWNLOAD_FINISHED

    query = "SELECT Downloads.id, Downloads.user_id, Downloads.file_id, Downloads.current_chunk, Files.owner_id From Downloads RIGHT JOIN Files ON Files.file_id = Downloads.file_id WHERE id=?"
    db_cursor.execute(query, (download_id,))
    download:list = db_cursor.fetchall()[0]


    data = bytes()

    with open(directory.get_absolut_path_by_user('/' + download[2], download[4]), 'rb') as file:
        # Seek to the n MiB position (n * 1024 * 1024 bytes)
        file.seek((download[3]) * 1024 * 1024, 0)
        
        # Read 1 MiB of data
        data = file.read(1024 * 1024)

    try:
        data_b64 = base64.b64encode(data).decode()
    except b64Error:
        return message_statics.BASE64_ERROR

    query = "UPDATE Downloads SET current_chunk = CASE WHEN current_chunk <> all_chunks THEN current_chunk + 1 ELSE current_chunk END WHERE id=?"
    db_cursor.execute(query, (download_id,))
    db_con.commit()

    current_time = time.mktime(datetime.datetime.now().timetuple())

    query = "UPDATE Downloads SET last_download=? WHERE id=?"
    db_cursor.execute(query, (current_time, download_id))
    db_con.commit()

    return make_result(data_b64)

def complete_chunked_download(download_id:str) -> str:

    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT id, user_id, file_id, lock_id From Downloads WHERE id=?"
    db_cursor.execute(query, (download_id,))
    download:list = db_cursor.fetchall()[0]

    query = "UPDATE Downloads SET lock_id='' WHERE id=?"
    db_cursor.execute(query, (download_id,))
    db_con.commit()

    try:
        file_reg.unlock_file(download[2], download[3])
    except:
        return message_statics.UNKNOWN_ERROR

    return make_result('Download successfully completed.')