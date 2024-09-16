import random
import string
import base64
import re
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

from misc.boilerplate import Error


def encryptAES(value:str, secret_key:bytes) -> str:
    cipher = AES.new(secret_key, AES.MODE_ECB)
    padded_message = pad(value.encode(), AES.block_size)
    encrypted_bytes = cipher.encrypt(padded_message)
    encrypted_message = base64.b64encode(encrypted_bytes).decode()
    return encrypted_message

def decryptAES(enc_value:str, secret_key:bytes):
    cipher = AES.new(secret_key, AES.MODE_ECB)
    decrypted_bytes = cipher.decrypt(base64.b64decode(enc_value))
    try:
        decrypted_message = unpad(decrypted_bytes, AES.block_size).decode('utf-8')
    except ValueError:
        return Error.DECRYPTION_ERROR
    return decrypted_message

def generate_id() -> str:
    bytes = string.ascii_letters + string.digits + '_-()äöüÄÖÜ{$}'
    session_id = ''.join(random.choice(bytes) for i in range(random.randrange(64,128)))
    return session_id
    
def clean_input(parameter:str) -> bool:
    suspicious_patterns = [
        r'\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b',
        r'\b(AND|OR|UNION|JOIN)\b',
        r'\b(EXEC|DECLARE|CAST|CONVERT|DELAY)\b',
        r'[;\'"]'
    ]

    for pattern in suspicious_patterns:
        if re.search(pattern, parameter, re.IGNORECASE):
            return False

    return True