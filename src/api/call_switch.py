# Null for None as 

from enum import Enum

import API.endpoints as endpoints
import misc.hc_exceptions as hc_exceptions

import flask

NONE = -1

secret_key:bytes = b''


class ArgumentTypes(Enum):
    STRING = 0
    LIST = 1

def parse_args(args:str) -> list:
    arg_list:list = []
    argument_type = ArgumentTypes.STRING
    current_arg = ''
    current_list_arg = ''

    for i in range(len(args)):
    

        if args[i] == ' ' and argument_type == ArgumentTypes.STRING:
            if (current_arg == NONE): current_arg = None
            arg_list.append(current_arg)
            current_arg = ''
            current_list_arg = ''
        
        elif args[i] == '[' and current_arg == '':
            argument_type = ArgumentTypes.LIST
            current_arg = []
        
        elif args[i] == ']' and argument_type == ArgumentTypes.LIST:
            current_arg.append(current_list_arg)
            argument_type = ArgumentTypes.STRING    

        elif args[i] == ',' and argument_type == ArgumentTypes.LIST:
            if current_list_arg == NONE: current_list_arg = None
            current_arg.append(current_list_arg)
            current_list_arg = ''
        
        elif argument_type == ArgumentTypes.STRING:
            current_arg = current_arg + args[i]
            if (current_arg == '!null'): current_arg = NONE

        elif argument_type == ArgumentTypes.LIST and args[i] != ' ':
            current_list_arg = current_list_arg + args[i]
            if (current_list_arg == '!null'): current_list_arg = NONE



    if current_arg != None: 
        if current_arg == NONE: current_arg = None
        arg_list.append(current_arg)

    return arg_list

# request dictionaries (command name:arguments needed)

file_control_endpoint_dict:dict = {
    'get_file':                     (1, endpoints.api_get_file),                    # file_id(str)
    'get_folder':                   (1, endpoints.api_folder_content),              # folder_id(str)
    'save_file':                    (2, endpoints.api_save_file),                   # file_id(str) {data:content}
    'new_file':                     (2, endpoints.api_new_file),                    # file_name(str) containing_folder_id(str) 
    'new_folder':                   (2, endpoints.api_new_folder),                  # folder_name(str) containing_folder_id(str) 
    'remove_file':                  (1, endpoints.api_remove_file),                 # folder_id(str)
    'remove_folder':                (1, endpoints.api_remove_folder),               # file_id(str)
    'init_chunked_upload':          (1, endpoints.api_init_upload),                 # file_id(str)
    'upload_chunk':                 (1, endpoints.api_upload_chunk),                # upload_id(str) {data:content}
    'complete_chunked_upload':      (1, endpoints.api_complete_chunked_upload),     # upload_id(str)
    'cancel_chunked_upload':        (1, endpoints.api_cancel_chunked_upload),       # upload_id(str)
    'force_unlock_file':            (1, endpoints.api_force_unlock_file),           # file_id(str)
    'init_chunked_download':        (1, endpoints.api_init_download),               # file_id(str)
    'download_chunk':               (1, endpoints.api_download_chunk),              # download_id(str)
    'complete_chunked_download':    (1, endpoints.api_complete_chunked_download),   # download_id(str)
    'rename_file':                  (2, endpoints.api_rename_file),                 # file_id(str) new_name(str)
    'rename_folder':                (2, endpoints.api_rename_folder),               # folder_id(str) new_name(str)
    'get_file_properties':          (2, endpoints.api_get_file_properties),         # file_id(str) properties(list)
    'get_folder_properties':        (2, endpoints.api_get_folder_properties),       # folder_id(str) properties(list)
    'set_file_properties':          (3, endpoints.api_set_file_properties),         # file_id(str) properties(list) value(list)
    'set_folder_properties':        (3, endpoints.api_set_folder_properties),       # folder_id(str) properties(list) value(list)
    'move_folder':                  (3, endpoints.api_move_folder),                 # folder_id(str) new_folder_id(str) new_name(str)
    'move_file':                    (3, endpoints.api_move_file),                   # file_id(str) new_folder_id(str) new_name(str)
    'copy_file':                    (2, endpoints.api_copy_file)                    # file_id(str) new_folder_id(str)
}

account_endpoint_dictionary:dict = {
    'get_username':                 (1, endpoints.account_get_username),            # user_id(str / none)
    'get_account_properties':       (2, endpoints.account_get_acccount_properties), # user_id(str / none) properties(list)
    'get_group_properties':         (2, endpoints.account_get_group_properties),    # group_id(str / none) properties(list)
    'change_password':              (3, endpoints.account_change_password),         # user_id(str) old_password(str) new_password(str) 
}  

admin_endpoint_dictionary:dict = {
    'get_accounts':             (0, endpoints.admin_get_accounts),                  #
    'get_groups':               (0, endpoints.admin_get_groups),                    #
    'delete_account':           (1, endpoints.admin_delete_account),                # user_id(str)
    'create_account':           (2, endpoints.admin_create_account),                # username(str) group_id(str)
    'set_user_properties':      (3, endpoints.admin_set_user_properties),           # user_id(str) properties(list) value(list)
}

class CommandInterpreter:

    _request:str
    _args:list
    _needed_args:int
    _raise_error:str
    _endpoint:None

    def __init__(self, request:str, endpoint:str) -> None:
        self._raise_error = ''
        self._request, self._needed_args = (None, None)

        match endpoint:
            case 'api':
                if request in file_control_endpoint_dict.keys(): 
                    self._request = request
                    self._needed_args, self._endpoint = file_control_endpoint_dict[request]
            case 'account':
                if request in account_endpoint_dictionary.keys(): 
                    self._request = request
                    self._needed_args, self._endpoint = account_endpoint_dictionary[request]
            case 'admin':
                if request in admin_endpoint_dictionary.keys(): 
                    self._request = request
                    self._needed_args, self._endpoint = admin_endpoint_dictionary[request]

    def set_args(self, args:list) -> None:
        
        if self._request == None: raise hc_exceptions.CommandNotValid('Command not valid.')

        elif len(args) == self._needed_args:
            # self._needed_args = None
            self._args = []
            for arg in args:
                self._args.append(arg)
        else:
            self._request = None
            self._raise_error = '{"error":"Current request needs ' + str(self._needed_args) + ' arguments. ' + str(len(args)) + ' was passed."}'

    def exec_request(self, content:str = None):
        if (self._request == None): return self._raise_error
        if flask.request.method == 'POST':
            self._args.append(content)
        
        return self._endpoint(*self._args, secret_key)