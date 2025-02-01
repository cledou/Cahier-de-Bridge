CREATE TABLE parametres (
  paramName TEXT,
  paramValue TEXT
);

INSERT INTO parametres VALUES ('VERSION_BASE',1);
INSERT INTO parametres VALUES ('NATURE_BASE','LOGIN');

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  nom  VARCHAR(64),
  email VARCHAR(64),
  hash VARCHAR(60),
  reset_hash VARCHAR(60),
  choix TEXT DEFAULT '{"flags": 1}',
  binette BLOB,
  admin BOOLEAN DEFAULT FALSE,
  can_add BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_restore BOOLEAN DEFAULT FALSE
);

INSERT INTO users (id,nom) VALUES (1,'Anonyme');
INSERT INTO users (id,nom,admin,can_add,can_edit,can_delete,can_restore) VALUES (2,'Administrateur',true,true,true,true,true);
