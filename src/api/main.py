# get quick timestamp: print(__import__('time').mktime(__import__('datetime').datetime.now().timetuple()))
# INSERT, UPDATE, DELETE, or REPLACE are transactions that need to be commited
import sqlite3
import json
import os
import configparser
import asyncio

from threading import Thread
from Crypto.Random import get_random_bytes

import call_switch
import misc.message_statics as message_statics
import API.session as session
import misc.db_handler as db_handler
import misc.security as security
import misc.hc_exceptions as hc_exceptions

import flask 


CONFIG_PATH = os.getcwd() + '/HomeCloud.cfg'

global config
config = configparser.ConfigParser()
config.read(CONFIG_PATH)

def get_value_of_config(section:str, key:str):
        section = config.items(section)
        for i in range(len(section)):
            if section[i][0] == key:
                return section[i][1]
        return None

# main constants
HOMECLOUD_DB_PATH = get_value_of_config("DEFAULT", "home_cloud_db")
WEB_LOG_PATH = get_value_of_config("DEFAULT", "logging_out")
WEB_SERVER_HOME = os.getcwd()
# main constants end

# page paths 
LOGIN = "/session/login"
LOGOUT = "/session/logout"
# page paths end

app = flask.Flask('HomeCloud - API')
app.secret_key = get_random_bytes(32)

call_switch.secret_key = app.secret_key

@app.errorhandler(404)
def handle_404(error):
    return message_statics.UNKNOWN_RESOURCE

@app.errorhandler(500)
def handle_500(error):
    return message_statics.INTERNAL_SERVER_ERROR

@app.errorhandler(405)
def handle_405(error):
    return message_statics.FORBIDDEN_METHOD

@app.errorhandler(400)
def handle_400(error):
    return message_statics.BAD_REQUEST

@app.post(LOGIN)
def login():
    username = flask.request.form['username']

    if session.validate_user_credentials(username, flask.request.form['password']):
        session.clear_prev_session(username)

        session_id = ''

        while True:
            session_id = security.generate_id()
            try:
                session.create_session(username, session_id)
                break
            except sqlite3.OperationalError:
                pass
        
        enc = security.encryptAES(session_id, app.secret_key)

        return '{"status":"0", "result":{"msg":"Login successfull", "session_id":"' + enc + '"}}'
    
    else:
        return message_statics.WRONG_CREDENTIALS

@app.get(LOGOUT)
def logout():
    if not "SessionId" in flask.request.headers: return message_statics.NO_SESSION

    session.delete_session(security.decryptAES(flask.request.headers.get("SessionId"), app.secret_key))
    return '{"status":"0", "result":"Logout successfull"}'


@app.route('/<endpoint>/<_request>', methods=['GET', 'POST'])
def api(endpoint, _request):
    args = flask.request.headers.get('HomeCloud-API-Args')

    _endpoint = ''

    match endpoint:
        case 'api':
            _endpoint = 'api'
        case 'account':
            _endpoint = 'account'
        case 'session':
            _endpoint = 'session'
        case 'admin':
            _endpoint = 'admin'
        case _:
            _endpoint = '_'

    command_interpreter:call_switch.CommandInterpreter = call_switch.CommandInterpreter(_request, _endpoint)

    try:
        if not args == None: 
            command_interpreter.set_args(call_switch.parse_args(args))
        else:
            command_interpreter.set_args([])
    except hc_exceptions.CommandNotValid:
        return message_statics.INVALID_COMMAND

    if flask.request.method == 'GET':
        result = command_interpreter.exec_request()
    else:
        data = flask.request.json
        if not "data" in data: 
            return message_statics.DATA_MISSING
        result = command_interpreter.exec_request(data.get("data"))

    return result

# ------------------------------------------------------

def start_file_process_mgr_routine(routine):
    asyncio.set_event_loop(routine)
    routine.run_forever()

async def file_process_mgr_routine():
    '''Checks up on running processes, like uploads / downloads.'''
    
    db_con, db_cursor = db_handler.create_connection()

    while True:
        query = "SELECT last_download FROM Downloads WHERE lock_id = ''"
        db_cursor.execute(query)
        downloads = db_cursor.fetchall()

        for download in downloads: 
            pass # build process mgr


if __name__ == '__main__':
    
    # loop = asyncio.new_event_loop()
    # file_process_mgr_thread:Thread = Thread(target=start_file_process_mgr_routine, args=(loop,), daemon=False)
    # file_process_mgr_thread.start()

    # asyncio.run_coroutine_threadsafe(file_process_mgr_routine(), loop)

    app.run("0.0.0.0", 80, False)