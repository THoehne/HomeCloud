import time
import datetime
import functools
import ast
import json

from base64 import b64encode
from io import TextIOWrapper
from enum import Enum

from misc.boilerplate import API_LOG_PATH 
import API.users as users

from misc.hc_exceptions import NoSessionError
import misc.security as security

import flask

class Levels(Enum):
    INFO = 0
    WARNING = 1
    ERROR = 2
    SECURITY = 3

log_file:TextIOWrapper = open(API_LOG_PATH, 'a')

def log(level:Levels, process:str, caption:str, msg:str, hc_status:int, user_id:str, operation:str, _other:dict = {}) -> None:
    '''Logs to log file.
    
    Arguments:
        level (int): Level of importance of the log (see also Levels).
        process (str): Name of the process calling the log.
        caption (str): Log caption to identify what was logged.
        msg (str): Message to be logged.

        user_id (str): Id of the user, that did the api request.
        operation (str): Operation performed (e.g. rename_file / move_folder / ...).
        _other (dict): Other abitrary information to be logged (e.g. file_id / file_size / ...).
    '''

    current_time = time.mktime(datetime.datetime.now().timetuple())

    log_entry = {
            'level':level.value,
            'process':process,
            'caption':caption,
            'msg':msg,
            'hc_status':hc_status,
            'user_id':user_id,
            'operation':operation,
            'time':current_time,
            '_other':_other
    }

    log_encoded = b64encode(str(log_entry).encode()).decode()
    
    log_file.write(log_encoded + '\r')

def logged_api_request_handler(api_handler):
    functools.wraps(api_handler)

    def wrapper(*args, **kwargs):
        res = api_handler(*args, **kwargs)
        
        try:
          res_dict:dict = ast.literal_eval(res)
        except:
            return res
        
        try:
            user_id:str = users.get_user_properties_by_session(security.decryptAES(flask.request.headers.get('SessionId'), args[-1]))['id']
        except:
            log(Levels.INFO, 'API-REQUEST-EXECUTION', 'Error during user request', 'No active session', 1, 'Unknown', api_handler.__name__.replace('_', ':', 1), {'Note':'UserId is unknown, because it\'s fetched via SessionId'})
            return

        log_level:Levels = Levels.INFO
        _other:dict = {}
        msg = ''
        caption = 'Handling user request'

        if (res_dict['status'] == '7'):
            log_level = Levels.SECURITY
            _other = {'Attack Vector':'SQLI'}

        if 'error' in res_dict.keys():
            caption = 'Error during user request'
            msg = res_dict['error']
        else:
            msg = res_dict['result']
        
        log(log_level, 'API-REQUEST-EXECUTION', caption, msg, int(res_dict['status']), user_id, api_handler.__name__.replace('_', ':', 1), _other)

        return res

    return wrapper