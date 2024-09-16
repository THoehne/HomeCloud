import os 
import json
import configparser

from enum import Enum


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

#main constants
HOMECLOUD_DB_PATH = get_value_of_config("DEFAULT", "home_cloud_db")
API_LOG_PATH = get_value_of_config("DEFAULT", "logging_out")
WEB_SERVER_HOME = os.getcwd()
# main constants end

class Error(Enum):

    DECRYPTION_ERROR = 0


def make_result(result_values:dict | str = None, status:int = 0):
    '''Bakes result with positive status'''

    result:dict = {}
    result['status'] = status
    result['result'] = {}
    
    if str(type(result_values)) == '<class \'dict\'>':
        for value in result_values.keys():
            result['result'][value] = result_values[value]
    elif str(type(result_values)) == '<class \'str\'>':
         result['result'] = result_values
    elif result_values == None:
         result.pop('result')

    return  json.dumps(result)
