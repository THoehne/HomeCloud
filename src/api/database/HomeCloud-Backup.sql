BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "ServerConfig" (
	"key"	TEXT NOT NULL UNIQUE,
	"value"	TEXT NOT NULL,
	PRIMARY KEY("key")
);
CREATE TABLE IF NOT EXISTS "FileTypes" (
	"file_suffix"	TEXT NOT NULL UNIQUE,
	"file_type"	TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "Sessions" (
	"user_id"	INTEGER NOT NULL,
	"session_id"	TEXT UNIQUE,
	"login_time"	REAL NOT NULL,
	FOREIGN KEY("user_id") REFERENCES "Users"("id")
);
CREATE TABLE IF NOT EXISTS "UserGroups" (
	"group_id"	INTEGER NOT NULL UNIQUE,
	"group_name"	TEXT NOT NULL UNIQUE,
	"admin"	INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("group_id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "Users" (
	"id"	INTEGER NOT NULL UNIQUE,
	"username"	TEXT NOT NULL UNIQUE,
	"password"	TEXT NOT NULL,
	"user_group"	INTEGER NOT NULL,
	"home_dir"	TEXT NOT NULL,
	"root_dir"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("user_group") REFERENCES "UserGroups"("group_id")
);
CREATE TABLE IF NOT EXISTS "Folders" (
	"folder_id"	TEXT NOT NULL UNIQUE,
	"folder_name"	TEXT NOT NULL,
	"containing_folder"	TEXT NOT NULL,
	"owner_id"	INTEGER NOT NULL,
	"last_changed"	REAL NOT NULL,
	"created"	REAL NOT NULL,
	"description"	TEXT,
	"folder_type"	TEXT,
	"perm"	INTEGER DEFAULT 'r_rw',
	"public"	INTEGER DEFAULT 0,
	"allowed_users"	INTEGER,
	PRIMARY KEY("folder_id")
);
CREATE TABLE IF NOT EXISTS "Files" (
	"file_id"	TEXT NOT NULL UNIQUE,
	"file_name"	TEXT NOT NULL,
	"containing_folder"	TEXT NOT NULL,
	"owner_id"	INTEGER NOT NULL,
	"last_opened"	INTEGER NOT NULL,
	"last_changed"	INTEGER NOT NULL COLLATE BINARY,
	"created"	INTEGER NOT NULL COLLATE BINARY,
	"description"	INTEGER COLLATE BINARY,
	"file_size"	INTEGER NOT NULL DEFAULT 0 COLLATE BINARY,
	"file_type"	TEXT NOT NULL,
	"perm"	INTEGER NOT NULL DEFAULT 'r_rw',
	"public"	INTEGER NOT NULL DEFAULT 0,
	"allowed_users"	TEXT,
	"lock"	TEXT DEFAULT '',
	"lock_owner_id"	INTEGER,
	PRIMARY KEY("file_id"),
	FOREIGN KEY("owner_id") REFERENCES "Users"("id")
);
CREATE TABLE IF NOT EXISTS "Uploads" (
	"id"	TEXT NOT NULL UNIQUE,
	"user_id"	INTEGER NOT NULL,
	"file_id"	TEXT NOT NULL,
	"start"	REAL NOT NULL,
	"lock_id"	TEXT NOT NULL,
	"timed_out"	INTEGER NOT NULL DEFAULT 0,
	"last_upload"	INTEGER,
	PRIMARY KEY("id"),
	FOREIGN KEY("user_id") REFERENCES "Users"("id")
);
CREATE TABLE IF NOT EXISTS "Downloads" (
	"id"	TEXT NOT NULL UNIQUE,
	"user_id"	INTEGER NOT NULL,
	"file_id"	TEXT NOT NULL,
	"start"	REAL NOT NULL,
	"lock_id"	TEXT NOT NULL,
	"all_chunks"	INTEGER NOT NULL,
	"current_chunk"	INTEGER NOT NULL,
	"timed_out"	INTEGER NOT NULL DEFAULT 0,
	"last_download"	INTEGER,
	PRIMARY KEY("id"),
	FOREIGN KEY("user_id") REFERENCES "Users"("id")
);
INSERT INTO "FileTypes" VALUES ('.txt','Text File');
INSERT INTO "FileTypes" VALUES ('.png','Image File');
INSERT INTO "FileTypes" VALUES ('.cur','Cursor File');
INSERT INTO "FileTypes" VALUES ('.docx','Word Document');
INSERT INTO "FileTypes" VALUES ('.dotx','Word Template');
INSERT INTO "FileTypes" VALUES ('.pptx','PowerPoint-Presentation');
INSERT INTO "FileTypes" VALUES ('.ppt','PowerPoint-Presentation');
INSERT INTO "FileTypes" VALUES ('.exe','Executable File');
INSERT INTO "FileTypes" VALUES ('.js','JavaScript File');
INSERT INTO "FileTypes" VALUES ('.html','Hypertext Markup Language File');
INSERT INTO "FileTypes" VALUES ('.css','Cascading Style Sheet');
INSERT INTO "FileTypes" VALUES ('.pdf','PDF Document');
INSERT INTO "FileTypes" VALUES ('.cfg','Configuration File');
INSERT INTO "FileTypes" VALUES ('.conf','Configuration File');
INSERT INTO "FileTypes" VALUES ('.py','Python Script File');
INSERT INTO "FileTypes" VALUES ('.log','Log File');
INSERT INTO "FileTypes" VALUES ('.json','JavaScript Object Notation File');
INSERT INTO "FileTypes" VALUES ('.xml','Extensible Markup Language File');
INSERT INTO "FileTypes" VALUES ('.sh','Shell Script');
INSERT INTO "FileTypes" VALUES ('.cpp','C++ File');
INSERT INTO "FileTypes" VALUES ('.c++','C++ File');
INSERT INTO "FileTypes" VALUES ('.h','C Header File');
INSERT INTO "FileTypes" VALUES ('.hpp','C++ Header File');
INSERT INTO "FileTypes" VALUES ('.c','C File');
INSERT INTO "FileTypes" VALUES ('.zip','Compressed Folder');
INSERT INTO "FileTypes" VALUES ('.bin','Binary File');
INSERT INTO "FileTypes" VALUES ('.csv','Excel Spreadsheet');
INSERT INTO "FileTypes" VALUES ('.crt','Security Certificate');
INSERT INTO "FileTypes" VALUES ('.mp3','Audio File');
INSERT INTO "FileTypes" VALUES ('.wav','Audio File');
INSERT INTO "FileTypes" VALUES ('.mp4','Video File');
INSERT INTO "FileTypes" VALUES ('.mov','Video File');
INSERT INTO "FileTypes" VALUES ('.bat','Batch Script File');
INSERT INTO "FileTypes" VALUES ('.java','Java File');
INSERT INTO "FileTypes" VALUES ('.jpg','Image File');
INSERT INTO "FileTypes" VALUES ('.jpeg','Image File');
INSERT INTO "FileTypes" VALUES ('.gif','Image File');
INSERT INTO "UserGroups" VALUES (1,'root',1);
INSERT INTO "UserGroups" VALUES (2,'ScorpioBlood',0);
INSERT INTO "UserGroups" VALUES (3,'Max',0);
INSERT INTO "Users" VALUES (1,'root','ef12f8c24c1768883907384c1d3450f7a2849093ae53070ffd5e1622a2f77948',1,'/','00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000');
INSERT INTO "Users" VALUES (2,'ScorpioBlood','638ccbadc5627c7bd95f63c15f72480fa3f5396b22dbe96a72f91f2c4f5d679d',2,'/ScorpioBlood','FWGlPoHHt6BCfqmMYV9TfRrb0cvUH2UCea_-Qzmm2ulC6TrQY7j1ER5Qk73R2Ejcd9pFYi-Ov5rBC5XaZLMBiAjaUmJkPgNUStLDH');
INSERT INTO "Users" VALUES (3,'Max','9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',3,'/Max','dTrOmRRN3H9ePYx2y6uRly_9Ctw2iccTSKLRdWjjRC3VmKLwy5Gar51CAvHkvx78B49iEWAJHDy_uxL8tsC1YcBK6fzwqlx5');
INSERT INTO "Folders" VALUES ('00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000','/','0',1,1695586042.0,1692382682.0,NULL,'RootFolder','r_rw',0,NULL);
INSERT INTO "Folders" VALUES ('FWGlPoHHt6BCfqmMYV9TfRrb0cvUH2UCea_-Qzmm2ulC6TrQY7j1ER5Qk73R2Ejcd9pFYi-Ov5rBC5XaZLMBiAjaUmJkPgNUStLDH','ScorpioBlood','00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',2,1697211713.0,1692382682.0,NULL,'UserFolder','r_rw',0,NULL);
INSERT INTO "Folders" VALUES ('dTrOmRRN3H9ePYx2y6uRly_9Ctw2iccTSKLRdWjjRC3VmKLwy5Gar51CAvHkvx78B49iEWAJHDy_uxL8tsC1YcBK6fzwqlx5','Max','00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',3,1694797398.0,1692382882.0,NULL,'UserFolder','r_rw',0,NULL);
COMMIT;
