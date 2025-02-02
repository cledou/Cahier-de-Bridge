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
  last_db TEXT DEFAULT 'example.db',
  binette BLOB,
  admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE notifications (
  id_user_de INTEGER KEY,
  id_user_vers INTEGER KEY,
  message TEXT,
  lu BOOLEAN DEFAULT FALSE
);

CREATE TABLE persistance (
  id INTEGER PRIMARY KEY,
  id_user INTEGER KEY,
  nom_base TEXT,
  choix TEXT DEFAULT '{"flags": 1}'
);

INSERT INTO users (id,nom,last_db) VALUES (1,'Anonyme','example.db');
INSERT INTO persistance (id_user,nom_base) VALUES (1,'example.db');
INSERT INTO users (id,nom,admin,last_db) VALUES (2,'Administrateur',true,'bridge.db');
INSERT INTO persistance (id_user,nom_base) VALUES (2,'bridge.db');

CREATE TRIGGER on_delete_user AFTER DELETE ON users
BEGIN
  DELETE FROM persistance WHERE id_user = OLD.id;
  DELETE FROM notifications WHERE id_user_de = OLD.id OR id_user_vers = OLD.id;
  INSERT INTO notifications (id_user_de,id_user_vers,message) VALUES (OLD.id,2,'Effacement de ' || OLD.nom || ' (base: id_' || OLD.id || '.db)');
END;

CREATE TRIGGER on_add_user AFTER INSERT ON users
BEGIN
  INSERT INTO persistance (id_user,nom_base) VALUES (NEW.id,'id_' || NEW.id || '.db');
  INSERT INTO notifications (id_user_de,id_user_vers,message) VALUES (2,NEW.id,'Bienvenue ' || NEW.nom || ' !');
  INSERT INTO notifications (id_user_de,id_user_vers,message) VALUES (NEW.id,2,'Inscription de ' || NEW.nom);
END;
