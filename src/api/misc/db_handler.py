import sqlite3

from misc.boilerplate import HOMECLOUD_DB_PATH

from misc.directory import remove_file

def grep_column(n:int, data:list) -> list:
        if len(data) == 0: return []
        if len(data[0]) < (n + 1): return []

        column = []

        for dataset in data:
            column.append(dataset[n])

        return column

def remove_folder_content(folder_id:str):
        db_con, db_cursor = create_connection()
        folders_to_clear:list = [folder_id]

        while len(folders_to_clear) > 0:
            current_id = folders_to_clear.pop(0)
            query = "SELECT folder_id FROM Folders WHERE containing_folder=?"
            db_cursor.execute(query, (current_id,))

            sub_folders = grep_column(0, db_cursor.fetchall())

            folders_to_clear.extend(sub_folders)

            query = "SELECT file_id, owner_id FROM Files WHERE containing_folder=?"
            db_cursor.execute(query, (current_id,))
            files = grep_column(0, db_cursor.fetchall())

            for file in files:
                remove_file(file)

            query = "DELETE FROM Files WHERE containing_folder=?"
            db_cursor.execute(query, (current_id,))
            query = "DELETE FROM Folders WHERE containing_folder=?"
            db_cursor.execute(query, (current_id,))
            db_con.commit()

def create_connection() -> tuple:
        '''Returns (db_connection, db_cursor)'''

        db_con = sqlite3.connect(HOMECLOUD_DB_PATH)
        db_cursor = db_con.cursor()

        return (db_con, db_cursor)