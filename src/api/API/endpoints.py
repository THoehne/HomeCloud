'''
This file contains all available endpoint. It checks permission and returns the result of the worker functions.
The desctinction between caller and worker was made, because it then is easier to read and we have clear structure between permission and function. 
Worker functions are called from their respective files. Their name is the same as the caller function, though it leaves the prefix (fc/account). 
Working with a destinction also allows a simpler logging, where events are only logged, if called from caller and not from worker.
This way we can call different workers, from within workers, without the event being falsly logged. 
'''

import json
import base64

from binascii import Error as b64Error

import API.users as users
import API.admin as admin

from misc.boilerplate import make_result

import API.session as session
import misc.message_statics as message_statics
import misc.security as security
import misc.db_handler as db_handler
import misc.file_reg as file_reg
import misc.hc_logger as hc_logger 

import API.file_control_tools as fc_tools

import flask 


@hc_logger.logged_api_request_handler
def api_get_file(file_id:str, secret_key:bytes) -> str:
    '''This endpoint returns a files content.
        
        Arguments:
            file_id (str): Id of file, to be read.

        Errors:
            FILE_TO_LARGE_TO_GET: File is larger than 5 MiB.
            FILE_DELETED: File can't be read.
            BASE64_ERROR: Base64 encoding of files content failed.
        
        Notes:
            Usage only for files <= 5 MiB.
            This function is ideal for preview functionality of client software.

    '''
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    if not str(type(file_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not file_reg.check_file_id(file_id): return message_statics.NO_FILE
    if not security.clean_input(file_id): return message_statics.DANGEROUS_INPUT
    if not file_reg.check_file_perm(user, file_id, 'read'): return message_statics.NO_PERMISSION
    if file_reg.is_file_locked(file_id): return message_statics.FILE_LOCKED

    return fc_tools.get_file(file_id)


@hc_logger.logged_api_request_handler
def api_save_file(file_id:str, file_name:str, content:str, secret_key:bytes) -> str:
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not str(type(file_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(file_name)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(content)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 

    if not file_reg.check_file_perm(user, file_id, 'write'): return message_statics.NO_PERMISSION

    if not file_reg.check_file_id(file_id): return message_statics.NO_FILE
    if not security.clean_input(file_id): return message_statics.DANGEROUS_INPUT
    if not security.clean_input(file_name): return message_statics.DANGEROUS_INPUT
    if file_reg.is_file_locked(file_id): message_statics.FILE_LOCKED

    try:
        content_bytes:bytes = base64.decodebytes(content.encode())
        file_name:str = base64.decodebytes(file_name.encode()).decode()
    except b64Error:
        return message_statics.BASE64_ERROR

    return fc_tools.save_file(file_id, file_name, content_bytes)


@hc_logger.logged_api_request_handler
def account_get_username(user_id:str, secret_key:str):
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    if user_id != None and not str(type(user_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING

    if user_id == None:
        user_id = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))['id']

    db_con, db_cursor = db_handler.create_connection()
    query = 'SELECT username FROM Users WHERE id=?'
    db_cursor.execute(query, (user_id,))
    username = db_cursor.fetchone()
    if username == None: return message_statics.UKNOWN_USER_ID

    return '{"status":"0","result":"' + username[0] + '"}'

    

@hc_logger.logged_api_request_handler
def api_rename_file(file_id:str, new_name:str, secret_key) -> str:
    '''Renames file.'''

    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    if not str(type(file_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(new_name)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not file_reg.check_file_id(file_id): return message_statics.NO_FILE

    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))
    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT containing_folder FROM Files WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    folder_id = db_cursor.fetchall()[0][0]
    if not file_reg.check_folder_perm(user, folder_id, 'write'): return message_statics.NO_PERMISSION

    if not security.clean_input(file_id): return message_statics.DANGEROUS_INPUT
    if not security.clean_input(new_name): return message_statics.DANGEROUS_INPUT
    if file_reg.is_file_locked(file_id): return message_statics.FILE_LOCKED

    if file_reg.file_exists(new_name, folder_id): return message_statics.DUPLICATE_FILE_NAME
    
    try:
        name = base64.decodebytes(new_name.encode()).decode()
    except b64Error:
        return message_statics.BASE64_ERROR

    return fc_tools.rename_file(file_id, name)

@hc_logger.logged_api_request_handler
def api_rename_folder(folder_id:str, new_name:str, secret_key) -> str:
    '''Renames folder.'''

    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT containing_folder FROM Folders WHERE folder_id=?"
    db_cursor.execute(query, (folder_id,))
    containing_folder_id = db_cursor.fetchall()[0][0]

    if not session.check_session_id(secret_key): return message_statics.NO_SESSION

    if not str(type(folder_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(new_name)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 

    if not file_reg.check_folder_id(folder_id): return message_statics.NO_FOLDER

    if not security.clean_input(folder_id): return message_statics.DANGEROUS_INPUT
    if not security.clean_input(new_name): return message_statics.DANGEROUS_INPUT

    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))
    if not file_reg.check_folder_perm(user, containing_folder_id, 'write'): return message_statics.NO_PERMISSION

    if file_reg.folder_exists(new_name, containing_folder_id): return message_statics.DUPLICATE_FOLDER_NAME

    try:
        name = base64.decodebytes(new_name.encode()).decode()
    except:
        return message_statics.BASE64_ERROR

    return fc_tools.rename_folder(folder_id, name)

@hc_logger.logged_api_request_handler
def api_set_file_properties(file_id:str, properties:list, values:list, secret_key:str) -> str:
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not str(type(file_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(properties)) == '<class \'list\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(values)) == '<class \'list\'>': return message_statics.TYPES_NOT_MATCHING 

    if not file_reg.check_file_perm(user, file_id, 'properties'): return message_statics.NO_PERMISSION
    if not file_reg.check_file_id(file_id): return message_statics.NO_FILE

    return fc_tools.set_file_properties(file_id, properties, values)


@hc_logger.logged_api_request_handler
def api_set_folder_properties(folder_id:str, properties:list, values:list, secret_key:str) -> str:
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not str(type(folder_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(properties)) == '<class \'list\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(values)) == '<class \'list\'>': return message_statics.TYPES_NOT_MATCHING 

    if not file_reg.check_folder_id(folder_id): return message_statics.NO_FILE
    if not file_reg.check_folder_perm(user, folder_id, 'properties'): return message_statics.NO_PERMISSION

    return fc_tools.set_folder_properties(folder_id, properties, values)    
    

            

@hc_logger.logged_api_request_handler
def api_move_file(file_id:str, folder_id:str, name:str, secret_key:str) -> str:
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not str(type(folder_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(file_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if name != None and not str(type(name)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 

    if not security.clean_input(folder_id): return message_statics.DANGEROUS_INPUT
    if not security.clean_input(file_id): return message_statics.DANGEROUS_INPUT
    if name != None and not security.clean_input(name): return message_statics.DANGEROUS_INPUT
    if not file_reg.check_folder_id(folder_id): return message_statics.NO_FOLDER
    if not file_reg.check_file_id(file_id): return message_statics.NO_FILE
    if file_reg.is_file_locked(file_id): return message_statics.FILE_LOCKED
    
    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT containing_folder, file_name FROM Files WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    containing_folder_id, file_name = db_cursor.fetchall()[0]

    if not file_reg.check_folder_perm(user, containing_folder_id, 'write'): return message_statics.NO_PERMISSION
    if not file_reg.check_folder_perm(user, folder_id, 'write'): return message_statics.NO_PERMISSION
    if not file_reg.check_file_perm(user, file_id, 'read'): return message_statics.NO_PERMISSION
    if file_reg.file_exists(name, folder_id): return message_statics.DUPLICATE_FILE_NAME
    


    return fc_tools.move_file(file_id, containing_folder_id, folder_id, name, file_name)


@hc_logger.logged_api_request_handler
def api_move_folder(folder_id:str, new_folder_id:str, name:str, secret_key:str) -> str:
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not str(type(new_folder_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(folder_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if name != None and not str(type(name)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 

    if not security.clean_input(new_folder_id): return message_statics.DANGEROUS_INPUT
    if not security.clean_input(folder_id): return message_statics.DANGEROUS_INPUT
    if name != None and not security.clean_input(name): return message_statics.DANGEROUS_INPUT
    if not file_reg.check_folder_id(new_folder_id): return message_statics.NO_FOLDER
    if not file_reg.check_folder_id(folder_id): return message_statics.NO_FOLDER

    db_con, db_cursor = db_handler.create_connection()
    query = "SELECT containing_folder, folder_name FROM Folders WHERE folder_id=?"
    db_cursor.execute(query, (folder_id,))
    containing_folder_id, folder_name = db_cursor.fetchall()[0]

    if not file_reg.check_folder_perm(user, containing_folder_id, 'write'): return message_statics.NO_PERMISSION
    if not file_reg.check_folder_perm(user, new_folder_id, 'write'): return message_statics.NO_PERMISSION
    if not file_reg.check_folder_perm(user, folder_id, 'read'): return message_statics.NO_PERMISSION
    if file_reg.folder_exists(name, new_folder_id): return message_statics.DUPLICATE_FOLDER_NAME

    return fc_tools.move_folder(folder_id, containing_folder_id, new_folder_id, name, folder_name)



@hc_logger.logged_api_request_handler
def api_copy_file(file_id:str, new_folder_id:str, secret_key:str):
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION

    if not str(type(file_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(new_folder_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 

    if not security.clean_input(new_folder_id): return message_statics.DANGEROUS_INPUT
    if not security.clean_input(file_id): return message_statics.DANGEROUS_INPUT
    if not file_reg.check_folder_id(new_folder_id): return message_statics.NO_FOLDER
    if not file_reg.check_file_id(file_id): return message_statics.NO_FOLDER
    
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))
    if not file_reg.check_folder_perm(user, new_folder_id, 'write'): return message_statics.NO_PERMISSION
    if not file_reg.check_file_perm(user, file_id, 'read'): return message_statics.NO_PERMISSION

    return fc_tools.copy_file(file_id, new_folder_id, user['id'])


@hc_logger.logged_api_request_handler
def api_get_file_properties(file_id:str, properties:list, secret_key:bytes) -> str:
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not str(type(file_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(properties)) == '<class \'list\'>': return message_statics.TYPES_NOT_MATCHING 

    if not file_reg.check_file_id(file_id): return message_statics.NO_FILE
    if not file_reg.check_file_perm(user, file_id, 'read') and not file_reg.check_file_perm(user, file_id, 'write') and not file_reg.check_file_perm(user, file_id, 'properties'): return message_statics.NO_PERMISSION

    return fc_tools.get_file_properties(file_id, properties)


@hc_logger.logged_api_request_handler
def api_get_folder_properties(folder_id:str, properties:list, secret_key:bytes) -> str:
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not str(type(folder_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(properties)) == '<class \'list\'>': return message_statics.TYPES_NOT_MATCHING 

    if not file_reg.check_folder_id(folder_id): return message_statics.NO_FOLDER
    if not file_reg.check_folder_perm(user, folder_id, 'read') and not file_reg.check_folder_perm(user, folder_id, 'write') and not file_reg.check_folder_perm(user, folder_id, 'properties'): return message_statics.NO_PERMISSION

    return fc_tools.get_folder_properties(folder_id, properties)


@hc_logger.logged_api_request_handler
def api_folder_content(folder_id:str, secret_key:bytes) -> str:
    '''Returns information about the files and folders inside a given folder.'''

    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not str(type(folder_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 

    if not file_reg.check_folder_id(folder_id): return message_statics.NO_FOLDER
    if not security.clean_input(folder_id): return message_statics.DANGEROUS_INPUT
    if not file_reg.check_folder_perm(user, folder_id, 'read'): return message_statics.NO_PERMISSION

    return fc_tools.get_folder_content(folder_id, user)


@hc_logger.logged_api_request_handler
def api_new_file(file_name:str, folder_id:str, secret_key:bytes) -> str:
    '''Creates a new file in a folder.'''

    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not str(type(file_name)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(folder_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 

    if not file_reg.check_folder_id(folder_id): return message_statics.NO_FOLDER
    if not security.clean_input(folder_id): return message_statics.DANGEROUS_INPUT
    if not security.clean_input(file_name): return message_statics.DANGEROUS_INPUT
    if not file_reg.check_folder_perm(user, folder_id, 'write'): return message_statics.NO_PERMISSION

    try:
        file_name = base64.decodebytes(file_name.encode()).decode()
    except b64Error:
        return message_statics.BASE64_ERROR

    return fc_tools.new_file(file_name, folder_id, user['id'])


@hc_logger.logged_api_request_handler
def api_new_folder(folder_name:str, containing_folder_id:str, secret_key:bytes) -> str:
    '''Creates new folder inside a folder.'''
    
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    if not str(type(folder_name)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not str(type(containing_folder_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not file_reg.check_folder_id(containing_folder_id): return message_statics.NO_FOLDER
    if not security.clean_input(containing_folder_id): return message_statics.DANGEROUS_INPUT
    if not security.clean_input(folder_name): return message_statics.DANGEROUS_INPUT

    try:
        folder_name = base64.decodebytes(folder_name.encode()).decode()
    except b64Error:
        return message_statics.BASE64_ERROR

    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))
    if not file_reg.check_folder_perm(user, containing_folder_id, 'write'): return message_statics.NO_PERMISSION

    if file_reg.folder_exists(folder_name, containing_folder_id): return message_statics.DUPLICATE_FOLDER_NAME

    return fc_tools.new_folder(folder_name, containing_folder_id, user['id'])

    


@hc_logger.logged_api_request_handler
def api_remove_folder(folder_id:str, secret_key:bytes) -> str:
    '''Removes a folder.'''

    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))
    
    if not str(type(folder_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    
    if not security.clean_input(folder_id): return message_statics.DANGEROUS_INPUT
    if not file_reg.check_folder_id(folder_id): return message_statics.NO_FOLDER

    _, db_cursor = db_handler.create_connection()
    query = "SELECT containing_folder FROM Folders WHERE folder_id=?"
    db_cursor.execute(query, (folder_id,))
    containing_folder_id:str = db_cursor.fetchall()[0][0]

    if not file_reg.check_folder_perm(user, containing_folder_id, 'write'): return message_statics.NO_PERMISSION

    return fc_tools.remove_folder(folder_id, containing_folder_id)


@hc_logger.logged_api_request_handler
def api_remove_file(file_id:str, secret_key:bytes) -> str:
    '''Removes a file'''

    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    if not str(type(file_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not security.clean_input(file_id): return message_statics.DANGEROUS_INPUT
    if not file_reg.check_file_id(file_id): return message_statics.NO_FILE
    if file_reg.is_file_locked(file_id): return message_statics.FILE_LOCKED

    _, db_cursor = db_handler.create_connection()
    query = "SELECT containing_folder, owner_id FROM Files WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    file:list = db_cursor.fetchall()[0]

    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))
    if not file_reg.check_folder_perm(user, file[0], 'write'): return message_statics.NO_PERMISSION

    return fc_tools.remove_file(file_id, file)


@hc_logger.logged_api_request_handler
def api_force_unlock_file(file_id:str, secret_key:bytes) -> str:
    '''Forces a file to unlock without key. Only allowed by by file owner.'''

    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    if not str(type(file_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not file_reg.check_file_id(file_id): return message_statics.NO_FILE
    if not security.clean_input(file_id): return message_statics.DANGEROUS_INPUT
    _, db_cursor = db_handler.create_connection()
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))
    query = "SELECT owner_id FROM Files WHERE file_id=?"
    db_cursor.execute(query, (file_id,))
    result = db_cursor.fetchall()[0][0]
    if user['id'] != result: return message_statics.NO_PERMISSION
    if not file_reg.is_file_locked(file_id): return make_result('File successfully unlocked.')

    return fc_tools.force_unlock_file(file_id)
    

@hc_logger.logged_api_request_handler
def api_init_upload(file_id:str, secret_key:bytes) -> str:
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))
   
    if not str(type(file_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
   
    if not file_reg.check_file_id(file_id): return message_statics.NO_FILE
    if not security.clean_input(file_id): return message_statics.DANGEROUS_INPUT
    if file_reg.is_file_locked(file_id): return message_statics.FILE_LOCKED
    
    if not file_reg.check_file_perm(user, file_id, 'write'): return message_statics.NO_PERMISSION

    return fc_tools.init_upload(file_id, user['id'])


def api_upload_chunk(upload_id:str, chunk:str, _:str) -> str:
    if not str(type(upload_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not security.clean_input(upload_id): return message_statics.DANGEROUS_INPUT
    if not file_reg.check_upload_id(upload_id): return message_statics.NO_UPLOAD

    try:
        chunk_bytes:bytes = base64.decodebytes(chunk.encode())
    except b64Error:
        return message_statics.BASE64_ERROR
    
    return fc_tools.upload_chunk(upload_id, chunk_bytes)


def api_complete_chunked_upload(upload_id:str, _:str) -> str:
    if not str(type(upload_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not security.clean_input(upload_id): return message_statics.DANGEROUS_INPUT
    if not file_reg.check_upload_id(upload_id): return message_statics.NO_UPLOAD

    return fc_tools.complete_chunked_upload(upload_id)


def api_cancel_chunked_upload(upload_id:str, _:str) -> str:
    if not str(type(upload_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not security.clean_input(upload_id): return message_statics.DANGEROUS_INPUT
    if not file_reg.check_upload_id(upload_id): return message_statics.NO_UPLOAD
    
    return fc_tools.cancel_chunked_upload(upload_id)

@hc_logger.logged_api_request_handler
def api_init_download(file_id:str, secret_key:bytes):
    if not str(type(file_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not file_reg.check_file_id(file_id): return message_statics.NO_FILE
    if not security.clean_input(file_id): return message_statics.DANGEROUS_INPUT
    user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))
    if not file_reg.check_file_perm(user, file_id, 'read'): return message_statics.NO_PERMISSION
    if file_reg.is_file_locked(file_id): return message_statics.FILE_LOCKED

    return fc_tools.init_download(file_id, user['id'])

def api_download_chunk(download_id:str, _:str):
    '''Download file in 1MiB chunks'''
    if not str(type(download_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not security.clean_input(download_id): return message_statics.DANGEROUS_INPUT
    if not file_reg.check_download_id(download_id): return message_statics.NO_DOWNLOAD
    if file_reg.download_time_out(download_id): return message_statics.TIMEOUT

    return fc_tools.download_chunk(download_id)

def api_complete_chunked_download(download_id:str, _:str):
    if not str(type(download_id)) == '<class \'str\'>': return message_statics.TYPES_NOT_MATCHING 
    if not security.clean_input(download_id): return message_statics.DANGEROUS_INPUT
    if not file_reg.check_download_id(download_id): return message_statics.NO_DOWNLOAD

    return fc_tools.complete_chunked_download(download_id)


@hc_logger.logged_api_request_handler
def account_get_acccount_properties(user_id:str, properties:list, secret_key:str):
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION

    user:dict = {}
    requesting_user = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if (user_id == None):
        user:dict = requesting_user
    else: 
        if not security.clean_input(user_id): return message_statics.DANGEROUS_INPUT
        if not (requesting_user['is_admin'] or requesting_user['id'] == user_id): return message_statics.NO_PERMISSION
        if not users.check_user_id(user_id): return message_statics.INVALID_USER_ID

        user:dict = users.get_user_properties_by_user_id(user_id)
   
    user.pop('home_dir')

    user_out:dict = {}
    user_out['status'] = '0'
    user_out['result'] = {}

    keys:set = set(user.keys())

    for property in properties:
        if property in keys:
            user_out['result'][property] = user[property]
    
    return json.dumps(user_out)

@hc_logger.logged_api_request_handler
def account_get_group_properties(group_id:str, properties:list, secret_key:str):
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION

    requesting_user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if (group_id == None):
        group_id = requesting_user['group_id']
    
    else:   
        if not security.clean_input(group_id): return message_statics.DANGEROUS_INPUT
        if not (requesting_user['is_admin'] or requesting_user['group_id'] == group_id): return message_statics.NO_PERMISSION
        if not users.check_group_id(group_id): return message_statics.UKNOWN_GROUP_ID
    
    group:dict = users.get_group_properties(group_id)

    group_out:dict = {}
    group_out['status'] = '0'
    group_out['result'] = {}

    for prop in group.keys():
        if prop in properties:
            group_out['result'][prop] = group[prop]

    return json.dumps(group_out)


@hc_logger.logged_api_request_handler
def admin_get_accounts(secret_key:str):
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION

    requesting_user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not requesting_user['is_admin']: return message_statics.NO_PERMISSION

    return admin.get_accounts()

@hc_logger.logged_api_request_handler
def admin_delete_account(user_id:str, secret_key:str):
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    if not security.clean_input(user_id): return message_statics.DANGEROUS_INPUT

    requesting_user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not requesting_user['is_admin']: return message_statics.NO_PERMISSION
    if not users.check_user_id(user_id): return message_statics.INVALID_USER_ID

    return admin.delete_account(user_id)

@hc_logger.logged_api_request_handler
def admin_create_account(username:str, group_id:str, secret_key:str):
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    if not security.clean_input(username): return message_statics.DANGEROUS_INPUT
    if not security.clean_input(group_id): return message_statics.DANGEROUS_INPUT

    requesting_user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not requesting_user['is_admin']: return message_statics.NO_PERMISSION
    if not users.check_group_id(group_id): return message_statics.UKNOWN_GROUP_ID
    if username.find(' ') != -1: return message_statics.INVALID_VALUE
    if users.check_username(username): return message_statics.DUPLICATE_USERNAME

    return admin.create_user_account(username, group_id)

@hc_logger.logged_api_request_handler
def admin_set_user_properties(user_id:str, properties:list, values:list, secret_key:str):
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION
    if not security.clean_input(user_id): return message_statics.DANGEROUS_INPUT

    requesting_user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not requesting_user['is_admin']: return message_statics.NO_PERMISSION
    if not users.check_user_id(user_id): return message_statics.UKNOWN_GROUP_ID

    return admin.set_user_properties(user_id, properties, values)

@hc_logger.logged_api_request_handler
def account_change_password():
    return make_result('Command not set')

@hc_logger.logged_api_request_handler
def admin_get_groups(secret_key:str):
    if not session.check_session_id(secret_key): return message_statics.NO_SESSION

    requesting_user:dict = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), secret_key))

    if not requesting_user['is_admin']: return message_statics.NO_PERMISSION

    return admin.get_groups()