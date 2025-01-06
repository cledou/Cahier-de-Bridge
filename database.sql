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
  choix TEXT DEFAULT '{"flags": 1}',
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
INSERT INTO arbre VALUES (1,NULL,'Difficulté ⭐☆☆',0);
INSERT INTO arbre VALUES (2,NULL,'Difficulté ⭐⭐☆',1);
INSERT INTO arbre VALUES (3,NULL,'Difficulté ⭐⭐⭐',2);
INSERT INTO arbre VALUES (4,NULL,'Grand chelem',3);
INSERT INTO arbre VALUES (5,NULL,'Autres exemples',4);

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

INSERT INTO donnes (nom,data) VALUES ('Exemple 1', '{"donneur":"S","vul":"EW","entame":"4 de ♦",
"txt1":"Est répond 2♥ au nom de ses 7HLD. Il est temps pour Sud, à qui il ne manquait qu''un point pour ouvrir, de se manifester. Nord, avec un singleton dans la couleur adverse et trois beaux honneurs, conclut à la manche.\n",
"txt2":"Le déclarant appelle l''As de carreau puis le 2 de Coeur pour ouvrir sa coupe.\nPour battre la manche, Est doit plonger du Roi et rejouer Trèfle pour dégager Ouest dans la couleur.\nCelui-ci doit alors rejouer Carreau sans tirer son second honneur à Trèfle...\nGageons qu''une si belle défense ne sera que rarement trouvée à la table !",
"donne":["R763","2","AR105","10762","92","R985","V96","9543","AV1054","D104","832","RV","D 8","A V 7 6 3","D 7 4","A D 8"],
"enchere":["-","1C","-","2C","2P","-","4P"," "],"score":"-1 (100 E.O)"}');
INSERT INTO donnes (nom,data) VALUES ('Exemple 2', '{"donneur":"W","vul":"-","entame":"2 de ♠",
"txt1":"Nord ouvre d''1♣ et Sud soutient à 3♣, ce qui montre, dans le standard français, un fit au moins cinquième et une dizaine de points, dans une main irrégulière.\nLa main de Nord mérite un effort de manche, et dans cette optique l''enchère de 3♦, qui montre une force, semble appropriée afin de déterminer s''il faut jouer à Sans-Atout ou à Trèfle.\nSans arrêt dans les majeures, Sud conclut à 5♣ sans tergiverser.",
"txt2":"Le déclarant capture l''entame du 2 de Pique avec l''As, tire As Roi de Trèfle et joue petit Coeur vers la Dame pour le cas du Roi au moins quatrième chez Est, (ou Roi Valet courts), ce qui lui permettrait de réaliser trois levées dans la couleur et de défausser deux Carreaux du mort. Telles que sont les cartes, le déclarant doit concéder le Roi de Coeur et une levée à Carreau, pour, au final, totaliser onze levées.",
"donne":["A","A1053","R32","RV975","D7642","V92","DV84","D","95","D8","A1065","A10843","R V 10 8 3","R 7 6 4","9 7","6 2"],
"enchere":["","-","1T","-","3T","-","3K","-","5T"],"score":"- (400 N.S)"}');
INSERT INTO donnes (nom,data) VALUES ('Exemple 3', '{"donneur":"N","vul":"NS","entame":"5 de ♣",
"txt1":"Séquence d''enchères de routine où, après l''ouverture d''1 SA par Nord,\nSud transite par un Stayman avant de conclure à 3SA après la réponse à 2C de l''ouvreur.",
"txt2":"Après l''entame du 5 de Trèfle, le déclarant place le 10 du mort pour le cas où Est posséderait Dame Valet. Si le déclarant fournissait le 4, Ouest devrait sélectionner le 8 en espérant un honneur accompagné du 9 chez l''entameur. \nNord remporte la levée du Roi et joue Roi de Pique et Pique vers le Valet du mort, capturé par la Dame d''Ouest.\nCelui-ci repart du 8 de Trèfle que le déclarant prend de l''As avant de faire une première impasse à Coeur.\nPuis il remonte au mort par l''As de Pique, encaisse le Pique maître et renouvelle l''impasse à Coeur.\nIl encaisse ensuite l''As de Coeur et doit se contenter de 9 levées lorsque le Roi n''apparaît pas.",
"donne":["R54","ADV10","A95","R62","D86","R643","D83","V83","1097","975","RV10","D975","AV32","82","7642","A104"],
"enchere":[" "," ","1SA","-","2T","-","2C","-","3SA"," "],"score":"- (100 N.S)"}');
INSERT INTO donnes (nom,data) VALUES ('Exemple 4', '{"donneur":"E","vul":"EW","entame":"As de ♦",
"txt1":"Est ouvre d''1♦, Sud intervient à 2♣ et Ouest soutient à 3♦, tendance barrage dans cette situation. La parole revient chez Sud, qui réveille par un Contre d''appel, parfaitement justifié par la distribution agréable et un support pour les deux majeures. Nord doit maintenant donner le plein de sa main en sautant à 4♠ avec son As cinquième, un superbe Roi de ♥ et la courte à Carreau connue chez le partenaire",
"txt2":"Est ne distingue pas de meilleure entame que l''As de Carreau, couleur énergiquement soutenue par son partenaire. Il continue Carreau, que le déclarant coupe au mort, avant de rentrer en main par le Roi de Coeur pour jouer Trèfle. Est bondit sur l''As et continue Carreau. Le mort à la demande du déclarant coupe, encaisse le Roi de Pique et poursuit par Roi de Trèfle et Trèfle coupé par Nord et surcoupé par Est. Est rejoue Coeur pour le Valet du mort et le déclarant, bloqué au mort, ne peut enlever les atouts et doit se résoudre à chuter d''une levée puisqu''il subit une nouvelle coupe à Trèfle.\n",
"donne":["A6532","R76","865","42","V8","432","RDV103","D73","D109","D985","A742","A9","R74","AV10","9","RV10865"],
"enchere":[" "," "," ","1K","2T","3K","-","-","X","-","4P"," "],"score":"-1 (50 N.S)"}');
INSERT INTO donnes (nom,data) VALUES ('Donne n°5', '{"donneur":"N","vul":"-",
"txt1":"<div>2♦ = Au moins quatre cartes à Carreau et de 6 à 10 S</div><div>3♥ = Barrage avec quatre atouts et de préférence un singleton.&nbsp;</div><div>Avec quatre atouts et 11-12 S, vous diriez 3♦ (cue-bid).</div>",
"txt2":"Sud prend du Roi de Carreau et rejoue un petit Pique sous l''As, <br>Ouest passe le Roi, Sud ayant ouvert il a donc plus de chances de posséder l''As, coupe un Carreau, remonte dans sa main grâce à l''As de Coeur et coupe le dernier Carreau au mort.<br>&nbsp;Il concède donc en tout quatre levées : deux à Pique, le Roi de Carreau et l''As de Trèfle.<br>&nbsp;4♦ ne chutent que d''une levée grâce à la disposition favorable des Trèfles mais, en fit seulement neuvième et sans singleton, il est logique de ne pas surenchérir avec le jeu de Sud.<br><br>",
"donne":["D87","32","D1073","A654","R95","AV1094","985","RD","V432","RD85","2","10873","A106","76","ARV64","V92"],
"enchere":[" "," ","-","-","1K","1C","2K","3C","-","-","-"," "],"entame":"","score":"EO 3♥="}');
INSERT INTO donnes (nom,data) VALUES ('Donne n°6', '{"donneur":"E","vul":"NS",
"txt1":"X = Quatre cartes à Coeur, au moins 7 H.\n3♠= Barrage.\n X = Belle main, trop beau pour dire 5♥.",
"txt2":"Après l''As, Sud contre-attaque de la Dame de Carreau, une levée de chute.\n Très poissard, les points d''Ouest à Pique et à Carreau étant inutiles...\n Une levée de chute à 4♠X.",
"donne":["10954","10864","A97","63","DV3","DV95","R63","1087","2","AR72","82","ARDV92","A R 8 7 6","3","D V 10 5 4","5 4"],
"enchere":[" "," "," ","1T","1P","X","3P","X","4P","-","-","5C",""],"entame":"As ♠","score":"EO 5♥ -1"}');
INSERT INTO donnes (nom,data) VALUES ('Donne n°7', '{"donneur":"S","vul":"NS",
"txt1":"2♣ = Fort indéterminé.\n3♣ = Pour donner l''entame ou trouver une défense.\n6♣ = Gros fit à Pique, espoir de grand chelem et chicane à Trèfle.\n7♠ = Proposition acceptée !",
"txt2":"Sud coupe l''entame Trèfle, joue deux tours d''atout et réclame treize levées sans effort.\nBravo si vous avez déclaré ce grand chelem en séquence compétitive !",
"donne":["R954","D963","AD754","","63","752","863","DV1086","2","1084","1092","AR9732","ADV1087","ARV","RV","54"],
"enchere":["2T","-","2K","3T","3P","5T","6T","-","7P","-","-","-",""],"entame":"D♣","score":"NS 7 ♠="}');
INSERT INTO donnes (nom,data) VALUES ('Donne n°8', '{"donneur":"W","vul":"EW",
"txt1":"3♣= Six belles cartes, 11-17 H.\n3♠ = Au nom du fit neuvième.\n3SA = Pour les gagner !",
"txt2":"L''entame est prise de l''As et Nord encaisse ses neuf levées de tête, Est devant conserver précieusement au moins trois cartes à Coeur, sous peine d''offrir deux surlevées au déclarant.\nBon jugement de Nord, qui a su valoriser son As de Trèfle et ses honneurs \"de tête\".",
"donne":["A106","R543","93","A754","RDV983","D8","A65","83","742","V1092","R8742","9","","A76","DV10","RDV1062"],
"enchere":[" ","1P","-","2P","3T","3P","3SA","-","-","-",""],"entame":"♠2","score":"NS 3SA="}');


INSERT INTO data2tree (id_donne,id_arbre) VALUES (1,3);
INSERT INTO data2tree (id_donne,id_arbre) VALUES (2,5);
INSERT INTO data2tree (id_donne,id_arbre) VALUES (3,1);
INSERT INTO data2tree (id_donne,id_arbre) VALUES (5,2);
INSERT INTO data2tree (id_donne,id_arbre) VALUES (6,1);
INSERT INTO data2tree (id_donne,id_arbre) VALUES (7,3);
INSERT INTO data2tree (id_donne,id_arbre) VALUES (7,4);
INSERT INTO data2tree (id_donne,id_arbre) VALUES (8,1);

