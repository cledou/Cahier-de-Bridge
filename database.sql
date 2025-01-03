CREATE TABLE parametres (
  paramName TEXT,
  paramValue TEXT
);

INSERT INTO parametres VALUES ('VERSION_BASE',1);
INSERT INTO parametres VALUES ('NATURE_BASE','BRIDGE');

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  nom  VARCHAR(64),
  email VARCHAR(64),
  hash VARCHAR(60),
  choix TEXT DEFAULT '{"flags": 0}',
  admin BOOLEAN DEFAULT FALSE,
  can_add BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE
);

INSERT INTO users (id,nom) VALUES (1,'Anonyme');
INSERT INTO users (id,nom,admin,can_add,can_edit,can_delete) VALUES (2,'Administrateur',true,true,true,true);

CREATE TABLE donnes (
  id INTEGER PRIMARY KEY,
  nom TEXT,
  data TEXT
);

INSERT INTO donnes (nom,data) VALUES ('Exemple 1', '{"donneur": "S","vul": "EW", "entame": "4K",
"txt1": "Est répond 2C au nom de ses 7HLD. Il est temps pour Sud, à qui il ne manquait qu''un point pour ouvrir, de se manifester.\nNord, avec un singleton dans la couleur adverse et trois beaux honneurs, conclut à la manche.",
"txt2": "Le déclarant appelle l''As de carreau puis le 2 de Coeur pour ouvrir sa coupe. \n Pour battre la manche, Est doit plonger du Roi et rejouer Trèfle pour dégager Ouest dans la couleur.\nCelui-ci doit alors rejouer Carreau sans tirer son second honneur à Trèfle...\nGageons qu''une si belle défense ne sera que rarement trouvée à la table !",
"donne": ["R 7 6 3", "2", "A R 10 5", "10 7 6 2", "9 2", "R 9 8 5", "V 9 6", "9 5 4 3", "A V 10 5 4", "D 10 4", "8 3 2", "R V"],
"enchere": ["-", "1C", "-", "2C", "2P", "-", "4P", " "]}');
INSERT INTO donnes (nom,data) VALUES ('Exemple 2', '{"donneur": "W","vul": "", "entame": "2P",
"txt1": "Nord ouvre d''1&clubs; et Sud soutient à 3&clubs;, ce qui montre, dans le standard français, un fit au moins cinquième et une dizaine de points, dans une main irrégulière.\nLa main de Nord mérite un effort de manche, et dans cette optique l''enchère de 3&#9826;, qui montre une force, semble appropriée afin de déterminer s''il faut jouer à Sans-Atout ou à Trèfle.\nSans arrêt dans les majeures, Sud conclut à 5&clubs; sans tergiverser.",
"txt2": "Le déclarant capture l''entame du 2 de Pique avec l''As, tire As Roi de Trèfle et joue petit Coeur vers la Dame pour le cas du Roi au moins quatrième chez Est, (ou Roi Valet courts), ce qui lui permettrait de réaliser trois levées dans la couleur et de défausser deux Carreaux du mort. Telles que sont les cartes, le déclarant doit concéder le Roi de Coeur et une levée à Carreau, pour, au final, totaliser onze levées.",
"donne": ["A", "A 10 5 3", "R 3 2", "R V 9 7 5", "D 7 6 4 2", "V 9 2", "D V 8 4", "D", "9 5", "D 8", "A 10 6 5", "A 10 8 4 3"],
"enchere": ["", "-", "1T", "-", "3T", "-", "3K", "-","5T"]}');

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



