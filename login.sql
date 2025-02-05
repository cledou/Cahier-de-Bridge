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
  last_db INTEGER REFERENCES bases(id),
  binette BLOB,
  admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE bases (
  id INTEGER PRIMARY KEY,
  filename TEXT UNIQUE,
  id_owner INTEGER key REFERENCES users(id)
);

INSERT INTO users (id,nom) VALUES (1,'Anonyme');
INSERT INTO users (id,nom,admin) VALUES (2,'Administrateur',true);
INSERT INTO bases (id,filename,id_owner) VALUES (1,'example.db',1);
INSERT INTO bases (id,filename,id_owner) VALUES (2,'bridge.db',2);
UPDATE users SET last_db = 1 WHERE id = 1;
UPDATE users SET last_db = 2 WHERE id = 2;

CREATE TABLE user_base (
  id_user INTEGER REFERENCES users(id),
  id_base INTEGER REFERENCES bases(id),
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  choix TEXT DEFAULT '{"flags": 1}'
);

INSERT INTO user_base (id_user,id_base) VALUES (1,1);
INSERT INTO user_base (id_user,id_base,can_edit, can_delete) VALUES (2,2,1,1);

CREATE TABLE groupes (
  id INTEGER PRIMARY KEY,
  nom VARCHAR(64)
);

CREATE TABLE user_groupe (
  id_user INTEGER REFERENCES users(id),
  id_groupe INTEGER REFERENCES groupes(id)
);

CREATE TABLE notifications (
  id_user_de INTEGER REFERENCES users(id),
  id_user_vers INTEGER REFERENCES users(id),
  t TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  message TEXT,
  lu BOOLEAN DEFAULT FALSE
);

// ON DELETE CASCADE trop aléatoire (PRAGMA etc...)

CREATE TRIGGER on_delete_user AFTER DELETE ON users
BEGIN
  INSERT INTO notifications (id_user_de,id_user_vers,message) VALUES (OLD.id,2,'Effacement de ' || OLD.nom || ' (base: id_' || OLD.id || '.db)');
  DELETE FROM user_base WHERE id_user=OLD.id;
  DELETE FROM user_groupe WHERE id_user=OLD.id;
  DELETE FROM notifications WHERE id_user_de=OLD.id OR id_user_vers=OLD.id;
  DELETE FROM bases WHERE id_owner=OLD.id;
END;

CREATE TRIGGER on_delete_base AFTER DELETE ON bases
BEGIN
  DELETE FROM user_base WHERE id_base=OLD.id;
END;

CREATE TRIGGER on_delete_groupe AFTER DELETE ON groupes
BEGIN
DELETE FROM user_groupe WHERE id_groupe=OLD.id;
END;

CREATE TRIGGER on_add_user AFTER INSERT ON users
BEGIN
  INSERT INTO notifications (id_user_de,id_user_vers,message) VALUES (2,NEW.id,'Bienvenue ' || NEW.nom || ' !');
  INSERT INTO notifications (id_user_de,id_user_vers,message) VALUES (NEW.id,2,'Inscription de ' || NEW.nom);
END;
