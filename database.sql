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

CREATE TABLE arbre (
  id INTEGER PRIMARY KEY,
  id_parent INTEGER,
  itm TEXT,
  pos INTEGER DEFAULT 0
);

INSERT INTO arbre VALUES (1,NULL,'Exemples',0);
INSERT INTO arbre VALUES (2,NULL,'Autres exemples',1);

CREATE TABLE data2tree (
  id_donne INTEGER,
  id_arbre INTEGER
);

CREATE TRIGGER on_delete_donne AFTER DELETE ON donnes
BEGIN
    DELETE FROM data2tree WHERE id_donne = OLD.id;
END;

CREATE TRIGGER on_delete_arbre AFTER DELETE ON arbre
BEGIN
    DELETE FROM arbre WHERE id_parent = OLD.id;
    DELETE FROM data2tree WHERE id_arbre = OLD.id;
END;

INSERT INTO donnes (nom,data) VALUES ('Exemple 1', '{"donneur": "S","vul": "EW", "entame": "4K",
"txt1": "Est répond 2C au nom de ses 7HLD. Il est temps pour Sud, à qui il ne manquait qu''un point pour ouvrir, de se manifester.\nNord, avec un singleton dans la couleur adverse et trois beaux honneurs, conclut à la manche.",
"txt2": "Le déclarant appelle l''As de carreau puis le 2 de Coeur pour ouvrir sa coupe. \n Pour battre la manche, Est doit plonger du Roi et rejouer Trèfle pour dégager Ouest dans la couleur.\nCelui-ci doit alors rejouer Carreau sans tirer son second honneur à Trèfle...\nGageons qu''une si belle défense ne sera que rarement trouvée à la table !",
"donne": ["R763", "2", "AR105", "10762", "92", "R985", "V96", "9543", "AV1054", "D104", "832", "RV"],
"enchere": ["-", "1C", "-", "2C", "2P", "-", "4P", " "]}');
INSERT INTO donnes (nom,data) VALUES ('Exemple 2', '{"donneur": "W","vul": "-", "entame": "2P",
"txt1": "Nord ouvre d''1&clubs; et Sud soutient à 3&clubs;, ce qui montre, dans le standard français, un fit au moins cinquième et une dizaine de points, dans une main irrégulière.\nLa main de Nord mérite un effort de manche, et dans cette optique l''enchère de 3&#9826;, qui montre une force, semble appropriée afin de déterminer s''il faut jouer à Sans-Atout ou à Trèfle.\nSans arrêt dans les majeures, Sud conclut à 5&clubs; sans tergiverser.",
"txt2": "Le déclarant capture l''entame du 2 de Pique avec l''As, tire As Roi de Trèfle et joue petit Coeur vers la Dame pour le cas du Roi au moins quatrième chez Est, (ou Roi Valet courts), ce qui lui permettrait de réaliser trois levées dans la couleur et de défausser deux Carreaux du mort. Telles que sont les cartes, le déclarant doit concéder le Roi de Coeur et une levée à Carreau, pour, au final, totaliser onze levées.",
"donne": ["A", "A1053", "R32", "RV975", "D7642", "V92", "DV84", "D", "95", "D8", "A1065", "A10843"],
"enchere": ["", "-", "1T", "-", "3T", "-", "3K", "-","5T"]}');
INSERT INTO donnes (nom,data) VALUES ('Exemple 3', '{"donneur":"N","vul":"NS","entame":"5T",
"txt1":"Séquence d''enchères de routine où, après l''ouverture d''1 SA par Nord,\nSud transite par un Stayman avant de conclure à 3SA après la réponse à 2C de l''ouvreur.",
"txt2":"Après l''entame du 5 de Trèfle, le déclarant place le 10 du mort pour le cas où Est posséderait Dame Valet. Si le déclarant fournissait le 4, Ouest devrait sélectionner le 8 en espérant un honneur accompagné du 9 chez l''entameur. \nNord remporte la levée du Roi et joue Roi de Pique et Pique vers le Valet du mort, capturé par la Dame d''Ouest.\nCelui-ci repart du 8 de Trèfle que le déclarant prend de l''As avant de faire une première impasse à Coeur.\nPuis il remonte au mort par l''As de Pique, encaisse le Pique maître et renouvelle l''impasse à Coeur.\nIl encaisse ensuite l''As de Coeur et doit se contenter de 9 levées lorsque le Roi n''apparaît pas.",
"donne":["R54","ADV10","A95","R62","D86","R643","D83","V83","1097","975","RV10","D975","AV32","82","7642","A104"],
"enchere":[" "," ","1SA","-","2T","-","2C","-","3SA"," "]}');
INSERT INTO donnes (nom,data) VALUES ('Exemple 4', '{"donneur":"E","vul":"EW","entame":"AK",
"txt1":" Est ouvre d''1K, Sud intervient à 2&clubs; et Ouest soutient à 3&#9826;, tendance barrage dans cette situation. La parole revient chez Sud, qui réveille par un Contre d''appel, parfaitement justifié par la distribution agréable et un support pour les deux majeures. Nord doit maintenant donner le plein de sa main en sautant à 4P avec son As cinquième, un superbe Roi de Coeur et la courte à Carreau connue chez le partenaire.",
"txt2":"Est ne distingue pas de meilleure entame que l''As de Carreau, couleur énergiquement soutenue par son partenaire. Il continue Carreau, que le déclarant coupe au mort, avant de rentrer en main par le Roi de Coeur pour jouer Trèfle. Est bondit sur l''As et continue Carreau. Le mort à la demande du déclarant coupe, encaisse le Roi de Pique et poursuit par Roi de Trèfle et Trèfle coupé par Nord et surcoupé par Est. Est rejoue Coeur pour le Valet du mort et le déclarant, bloqué au mort, ne peut enlever les atouts et doit se résoudre à chuter d''une levée puisqu''il subit une nouvelle coupe à Trèfle.\n",
"donne":["A6532","R76","865","42","V8","432","RDV103","D73","D109","D985","A742","A9","R74","AV10","9","RV10865"],
"enchere":[" "," "," ","1K","2T","3K","-","-","X","-","4P"," "]}');

INSERT INTO data2tree VALUES (1,1);
INSERT INTO data2tree VALUES (2,1);
INSERT INTO data2tree VALUES (3,2);

