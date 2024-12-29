CREATE TABLE parametres (
  paramName TEXT,
  paramValue TEXT
);

INSERT INTO parametres VALUES ('VERSION_BASE',3);
INSERT INTO parametres VALUES ('NATURE_BASE','AIKIDO_V4');

CREATE TABLE ligue (
  id INTEGER PRIMARY KEY,
  code VARCHAR(3),
  nom VARCHAR(80)
);

CREATE TABLE club (
  id INTEGER PRIMARY KEY,
  id_ligue INTEGER KEY,
  code VARCHAR(10),
  nom VARCHAR(128),
  adresse1 VARCHAR(128),
  adresse2 VARCHAR(128),
  ville  VARCHAR(128),
  cp VARCHAR(5),
  fixe VARCHAR(16),
  portable VARCHAR(16),
  email VARCHAR(64),
  hash VARCHAR(60),
  choix TEXT, 
  siret VARCHAR(20),
  RNA VARCHAR(10),
  IBAN VARCHAR(34),
  BIC VARCHAR(11),
  logo TEXT
);

CREATE TABLE news (
  id INTEGER PRIMARY KEY,
  html TEXT,
  url_pj TEXT,
  date_publication DATE DEFAULT CURRENT_TIMESTAMP,
  date_fin DATE,
  del_obso BOOLEAN DEFAULT TRUE
);

CREATE TABLE membres (
  id INTEGER PRIMARY KEY,
  id_club INTEGER KEY,
  licence VARCHAR(12),
  nom VARCHAR(80),
  nomJF VARCHAR(80),
  prenom VARCHAR(80),
  sexe VARCHAR(1),
  type_licence VARCHAR(1),
  ecole VARCHAR(1),
  adresse1 VARCHAR(128),
  adresse2 VARCHAR(128),
  ville  VARCHAR(128),
  cp VARCHAR(5),
  fixe VARCHAR(16),
  portable VARCHAR(16),
  email VARCHAR(64),
  date_naissance DATE,
  grade VARCHAR(4) DEFAULT '6K',
  diplome VARCHAR(16),
  photo TEXT,
// 0:autorisation photo, 1:RPGD 2:Status Club OK, 3:Status Fédé Ok,  4:Logging OK, 5:Administrateur
  checks VARCHAR(16) DEFAULT '-'
);

CREATE TABLE membre_mineur (
  id_membre INTEGER KEY,
  responsable VARCHAR(80),
  fixe VARCHAR(16),
  portable VARCHAR(16),
  email VARCHAR(64),
  choix1 INTEGER
);

CREATE TABLE report (
  id INTEGER PRIMARY KEY,
  id_club INTEGER,
  nom VARCHAR(64),
  contenu TEXT,
  in_tree BOOLEAN DEFAULT TRUE
);

CREATE TABLE formulaires (
  id INTEGER PRIMARY KEY,
  id_club INTEGER,
  nom VARCHAR(64),
  contenu TEXT
);

CREATE TABLE saison (
  id INTEGER PRIMARY KEY,
  label VARCHAR(10)
);

INSERT INTO saison (label) VALUES ('2022-2023');
INSERT INTO saison (label) VALUES ('2023-2024');

CREATE TABLE membres_par_saison (
  id_membre INTEGER KEY,
  id_saison INTEGER KEY
);

CREATE TABLE passport (
  id_membre INTEGER,
  id_saison INTEGER,
  code_recu VARCHAR(15)
);

CREATE TABLE image (
  id INTEGER PRIMARY KEY,
  img TEXT,
  alt TEXT
);

INSERT INTO image (id,img,alt) VALUES (1,'/images/bibli/ceinture_noire.png','Ceinture noire');
INSERT INTO image (id,img,alt) VALUES (2,'/images/bibli/ceinture_marron.png','Ceinture marron');
INSERT INTO image (id,img,alt) VALUES (3,'/images/bibli/ceinture_bm.png','Ceinture bleu-marron');
INSERT INTO image (id,img,alt) VALUES (4,'/images/bibli/ceinture_bleu.png','Ceinture bleu');
INSERT INTO image (id,img,alt) VALUES (5,'/images/bibli/ceinture_vb.png','Ceinture verte-bleu');
INSERT INTO image (id,img,alt) VALUES (6,'/images/bibli/ceinture_verte.png','Ceinture verte');
INSERT INTO image (id,img,alt) VALUES (7,'/images/bibli/ceinture_ov.png','Ceinture orange-verte');
INSERT INTO image (id,img,alt) VALUES (8,'/images/bibli/ceinture_orange.png','Ceinture orange');
INSERT INTO image (id,img,alt) VALUES (9,'/images/bibli/ceinture_jo.png','Ceinture jaune-orange');
INSERT INTO image (id,img,alt) VALUES (10,'/images/bibli/ceinture_jaune.png','Ceinture jaune');
INSERT INTO image (id,img,alt) VALUES (11,'/images/bibli/ceinture_bj.png','Ceinture blanc-jaune');
INSERT INTO image (id,img,alt) VALUES (12,'/images/bibli/ceinture_blanche2b.png','Ceinture blanche 2 Barettes Jaune');
INSERT INTO image (id,img,alt) VALUES (13,'/images/bibli/ceinture_blanche1b.png','Ceinture blanche Barette Jaune');
INSERT INTO image (id,img,alt) VALUES (14,'/images/bibli/ceinture_blanche.png','Ceinture blanche');


CREATE TABLE grade (
  rang INTEGER KEY,
  abrege VARCHAR(4) PRIMARY KEY,
  label VARCHAR(32),
  id_image INTEGER
);

INSERT INTO grade (rang,abrege,label,id_image) VALUES (2,'9D','9ème Dan',1);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (4,'8D','Hachidan',1);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (6,'7D','Nanadan',1);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (8,'6D','Rokudan',1);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (10,'5D','Godan',1);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (12,'4D','Yondan',1);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (14,'3D','Sandan',1);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (16,'2D','Nidan',1);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (18,'1D','Shodan',1);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (20,'1K','1er Kyu',2);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (22,'2K+','2ème Kyu BM',3);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (24,'2K','2ème Kyu',4);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (26,'3K+','3ème Kyu VB',5);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (28,'3K','3ème Kyu',6);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (30,'4K+','4ème Kyu OV',7);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (32,'4K','4ème Kyu',8);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (34,'5K+','5ème Kyu JO',9);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (36,'5K','5ème Kyu',10);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (38,'6K+','6ème Kyu BJ',11);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (40,'6K2B','6ème Kyu 2B',12);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (42,'6K1B','6ème Kyu 1B',13);
INSERT INTO grade (rang,abrege,label,id_image) VALUES (44,'6K','6ème Kyu',14);
INSERT INTO grade (rang,abrege,label) VALUES (99,'--','Myukyu');

CREATE TABLE historique_grade (
  id_membre INTEGER KEY,
  abrege VARCHAR(4) PRIMARY KEY,
  date_obtention DATE
);

CREATE TRIGGER on_delete_membre AFTER DELETE ON membres
BEGIN
    DELETE FROM membres_par_saison WHERE id_membre = OLD.id;
    DELETE FROM passport WHERE id_membre = OLD.id;
    DELETE FROM historique_grade WHERE id_membre = OLD.id;
    DELETE FROM membre_mineur WHERE id_membre = OLD.id;
END;

CREATE TRIGGER on_delete_saison AFTER DELETE ON saison
BEGIN
    DELETE FROM membres_par_saison WHERE id_saison = OLD.id;
    DELETE FROM passport WHERE id_saison = OLD.id;
END;

# Programmation défensive: triggers normalement jamais utilisés.

CREATE TRIGGER on_delete_club AFTER DELETE ON club
BEGIN
    UPDATE membres SET id_club=NULL WHERE id_club=OLD.id;
    DELETE FROM report WHERE id_club = OLD.id;
    DELETE FROM formulaires WHERE id_club = OLD.id;
END;

CREATE TRIGGER on_delete_ligue AFTER DELETE ON ligue
BEGIN
    UPDATE club SET id_ligue=NULL WHERE id_ligue=OLD.id;
END;
