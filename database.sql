CREATE TABLE parametres (
  paramName TEXT,
  paramValue TEXT
);

INSERT INTO parametres VALUES ('VERSION_BASE',1);
INSERT INTO parametres VALUES ('NATURE_BASE','BRIDGE');

CREATE TABLE user (
  id INTEGER PRIMARY KEY,
  email VARCHAR(64),
  hash VARCHAR(60),
  choix TEXT,
  admin BOOLEAN DEFAULT TRUE,
  can_add BOOLEAN DEFAULT TRUE,
  can_edit BOOLEAN DEFAULT TRUE,
  can_delete BOOLEAN DEFAULT TRUE
);

CREATE TABLE donnes (
  id INTEGER PRIMARY KEY,
  nom TEXT,
  data TEXT
);

INSERT INTO donnes (nom,data) VALUES ('Exemple 1', '{donneur: "S",vul: "EW", entame: "4K",
		txt1: "Est répond 2V au nom de ses 7HLD. Il est temps pour Sud, à qui il ne manquait qu''un point pour ouvrir, de se manifester.\nNord, avec un singleton dans la couleur adverse et trois beaux honneurs, conclut à la manche.",
		txt2: "Le déclarant appelle l''As de carreau puis le 2 de Coeur pour ouvrir sa coupe. \n Pour battre la manche, Est doit plonger du Roi et rejouer Trèfle pour dégager Ouest dans la couleur.\nCelui-ci doit alors rejouer Carreau sans tirer son second honneur à Trèfle...\nGageons qu''une si belle défense ne sera que rarement trouvée à la table !",
		donne: ["R 7 6 3", "2", "A R 10 5", "10 7 6 2", "9 2", "R 9 8 5", "V 9 6", "9 5 4 3", "A V 10 5 4", "D 10 4", "8 3 2", "R V"],
		enchere: ["-", "1C", "-", "2C", "2P", "-", "4P", " "]}');

CREATE TABLE arbre (
  id INTEGER PRIMARY KEY,
  id_parent INTEGER,
  itm TEXT
);

INSERT INTO arbre VALUES (1,NULL,'Exemples');

CREATE TABLE data2tree (
  id_donne INTEGER,
  id_arbre INTEGER
);

INSERT INTO data2tree VALUES (1,1);

CREATE TRIGGER on_delete_donne AFTER DELETE ON donnes
BEGIN
    DELETE FROM data2tree WHERE id_donne = OLD.id;
END;

CREATE TRIGGER on_delete_arbre AFTER DELETE ON arbre
BEGIN
    DELETE FROM data2tree WHERE id_arbre = OLD.id;
END;



