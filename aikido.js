// aikido.js version bêta
/**************
/     NOTES
 **************
Pour lancer le programme:
nodemon --ignore node_modules --ignore db --ignore js --ignore Clubs aikido.js
export démo: SELECT NOM,PRENOM,TELEPHONE,a.adresse, a.localite, a.codepostal, a.ville FROM CLIENTS c
LEFT JOIN ADRESSES a ON a.indx = c.indx_adr1
WHERE c.indx > 0 AND c.indx < 75
ORDER BY NOM
https://xsgames.co/randomusers/assets/avatars/male/21.jpg
 */
//**************
// Declarations
//**************
"use strict";

// https://nodejs.org/api/fs.html#fs_file_system
const fs = require("fs");
// utiliser le framework 'express' (alias: app)
const express = require("express");
const app = express();
const net = require("net");
const sqlite3 = require("better-sqlite3");
const bcrypt = require("bcrypt");
const child_process = require("child_process");
// authentificaton
const Session = require("express-session");
// nécessaire pour récupérer les paramètres dans POST
const bodyParser = require("body-parser");

// créer le serveur web (alias: httpserver)
const httpserver = require("http").createServer(app);

// Créer socket d'échange page Web<->Node Js
const socketio = require("socket.io")(httpserver);
const favicon = require("serve-favicon"); // icone page web
const ios = require("socket.io-express-session");
const multer = require("multer"); // upload middleware
//const parseString = require('xml2js').parseString;
const nodemailer = require("nodemailer");
const { exit } = require("process");
const PDFDocument = require("pdfkit");
const printMe = require("./printPDF");
const ttfInfo = require("ttfinfo");
const unzipper = require("unzipper");

//******************
// Initialisations
//******************
//initialisation du serveur web, des chemins locaux et du socket
app.set("env", process.env.ENV || "development");
app.set("port", process.env.PORT || 3004);

// utiliser des répertoires statiques chainés (si page manquante, passe au rép suivant..)
app.use("/public", express.static("./")); // 'public' est en réalité ./
app.use("/css", express.static("./css/"));
app.use("/fonts", express.static("./fonts/"));
app.use("/images", express.static("./images/"));
app.use("/help", express.static("./help/"));
app.use("/db", express.static("./db/"));
app.use("/views", express.static("./views/"));
app.use("/includes", express.static("./includes/"));
app.use("/js", express.static("./js/"));
app.use("/jquery", express.static("./node_modules/jquery/dist/"));
// exécuter favicon(path) à chaque appel d'une fonction de app
app.use(favicon("./images/favicon.ico"));
//initialisation du serveur web, des chemins locaux et du socket. Indispensable, même si ejs n'est pas utilisé
app.set("view engine", "ejs");
// un moteur de rendu est nécessaire. Mon choix: ejs..
app.engine(".html", require("ejs").__express);
app.use(
	express.urlencoded({
		extended: true,
	})
);
app.use(express.json());

var old_date = new Date().getDate();

//*******************************
// Initialisation de la session
//*******************************

var session = Session({
	// Defaults to MemoryStore, meaning sessions are stored as POJOs
	// in server memory, and are cleared out when the server restarts.
	name: "sid",
	saveUninitialized: false,
	resave: false,
	secret: "WqiZvuvVsIV1zmzJQeYUgINqXYe",
	cookie: {
		maxAge: 1000 * 60 * 60 * 2,
		sameSite: true,
		secure: process.env.NODE_ENV === "production",
	},
});

// On passe nos sessions à socket.io
socketio.use(ios(session));
app.use(session);

var nbr_clients = 0;
var config_filename = __dirname + "/config.json";
var app_config = {};
var echec_cnx = 0;
var idx_browser = -1;

//*********************************
// Initialiser quelques variables !
//*********************************

// récupérer date de package.json
//console.log(__dirname);
try {
	let stats = fs.statSync("package.json");
	let rawdata = JSON.parse(fs.readFileSync("package.json"));
	console.log(rawdata.description + " version " + rawdata.version + " du " + stats.mtime.toLocaleDateString("fr-FR"));
} catch (error) {
	throw error.message;
}

// récupérer la configuration
if (fs.existsSync(config_filename)) {
	//file exists
	//onsole.log('file ' + config_filename + ' exists');
	try {
		let s = fs.readFileSync(config_filename);
		if (s != "{}") {
			app_config = JSON.parse(s);
			if (app_config.port != undefined) app.set("port", app_config.port);
		}
	} catch (e) {
		console.error("Parsing error 130", e);
		exit(-1);
	}
} else console.log(config_filename + " introuvable. A créer");

// récupérer le séparateur dossier (win ou linux)
let dir_sep = "";
for (let index = __dirname.length - 1; index >= 0 && dir_sep == ""; index--) {
	const char = __dirname[index];
	if (char == "/" || char == "\\") dir_sep = char;
}
if (dir_sep == "") {
	console.error("Séparateur de dossier pas trouvé...");
	dir_sep == "/";
}

var clubs_dir = __dirname + dir_sep + "Clubs" + dir_sep;
try {
	let statsObj = fs.statSync(clubs_dir);
} catch (e) {
	if (e.code == "ENOENT") fs.mkdirSync(clubs_dir);
}

var db_login = LoginDatabaseFactory();
// Refaire login à partir des clubs
// Normalement inutile, mais sait-on jamais
try {
	fs.readdir(clubs_dir, function (err, files) {
		//handling error
		if (!err) {
			files.forEach((file) => {
				const e1 = db_login.prepare("SELECT COUNT(*) AS cnt FROM login WHERE club=?").get(file);
				if (e1 == undefined || e1.cnt == 0) {
					let db = ClubDatabaseFactory(file, true);
					const e2 = db.prepare("SELECT hash,email FROM club WHERE code=?").get(file);
					if (e2 != undefined) db_login.prepare("INSERT INTO login (club,hash,reset_email) VALUES (?,?,?)").run(file, e2.hash, e2.email);
					else db_login.prepare("INSERT INTO login (club) VALUES (?)").run(file);
					console.log("Ajout de " + file + " dans les login");
				}
			});
		}
	});
} catch (e) {
	console.error("NTBS 160:" + e.message);
}

//*******************
//    Databases
//*******************
function MakePatch(_db, fn) {
	console.log("MakePatch", fn);
	let rawdata = fs.readFileSync(fn);
	let lignes = rawdata.toString().split("\n");
	let stm = "";
	let bloc = false;
	lignes.forEach((el) => {
		let lig = el.replace("\r", "");
		if (!(lig.startsWith("#") || lig.startsWith("//"))) {
			stm += lig + " ";
			if (lig == "BEGIN") bloc = true;
			else if (lig.startsWith("END")) bloc = false;
			if (!bloc && lig.endsWith(";")) {
				try {
					_db.prepare(stm).run();
					stm = "";
				} catch (e) {
					console.error(e.message);
				}
			}
		}
	});
}

function LoginDatabaseFactory() {
	// créer le réperoire db
	let db_dir = __dirname + dir_sep + "db" + dir_sep;
	try {
		let statsObj = fs.statSync(db_dir);
	} catch (e) {
		if (e.code == "ENOENT") fs.mkdirSync(db_dir);
	}

	let db_filename = db_dir + "login.db";
	try {
		const b = fs.existsSync(db_filename);
		let _db = new sqlite3(db_filename, { readonly: false });
		if (!b) {
			console.log("Créer la base " + db_filename);
			// chercher fichier base
			let init_file = __dirname + dir_sep + "login.sql";
			if (!fs.existsSync(init_file)) {
				console.error("Fichier manquant:" + init_file);
				process.exit();
			} else MakePatch(_db, init_file);
		}
		return _db;
	} catch (err) {
		console.error("NTBS 207", err);
	}
}

function ClubDatabaseFactory(code, ro) {
	// créer le réperoire db
	let db_dir = clubs_dir + code + dir_sep;
	try {
		let statsObj = fs.statSync(db_dir);
	} catch (e) {
		if (e.code == "ENOENT") fs.mkdirSync(db_dir);
	}

	let db_filename = db_dir + code + ".db";
	//let idx_1 = db_dir.indexOf("www");
	//app.use("/base", express.static("." + db_dir.substring(idx_1 + 3)));
	try {
		const b = fs.existsSync(db_filename);
		let _db = new sqlite3(db_filename, { readonly: b && ro == true });
		if (!b) {
			console.log("Créer la base " + db_filename);
			// chercher fichier base
			let init_file = __dirname + dir_sep + "database.sql";
			if (!fs.existsSync(init_file)) {
				console.error("Fichier manquant:" + init_file);
				process.exit();
			} else MakePatch(_db, init_file);
		}
		let version = Number(_db.prepare("SELECT paramValue FROM parametres WHERE paramName='VERSION_BASE'").get().paramValue);
		let found = true;
		while (found) {
			let fn = "patch" + version + "vers" + (version + 1) + ".sql";
			//console.log('Cherche ' + fn);
			found = fs.existsSync(fn);
			if (found) {
				MakePatch(_db, fn);
				version += 1;
			}
		}
		console.log(code + ".db (version " + version + ") est ouverte" + (ro == true ? " en mode lecture seule" : ""));
		return _db;
	} catch (err) {
		console.error("NTBS 271", err);
	}
}

//*******************
//    Socket.io
//*******************
// Chaque fois qu'une page web est affichée, 'connection' ouvre un nouveau socket.
//
socketio.on("connection", (client) => {
	let session = client.handshake.session;
	//console.log("connection", client.handshake.session);
	let db;
	session.dirty = false;
	if (session.login == undefined) {
		const enr = db_login.prepare("SELECT paramValue FROM parametres WHERE paramName='CLUB'").get();
		if (enr != undefined && enr.paramValue != undefined && enr.paramValue != "") {
			Log2Club(db_login.prepare("SELECT * FROM login WHERE club=?").get(enr.paramValue), session);
			session.login.ro = true;
			session.login.f = 0; // aucun droit
			console.log("Ouverture de session sur club par défaut");
			session.dirty = true;
			db = ClubDatabaseFactory(enr.paramValue, true);
		} else console.log("Ouverture de session anonyme");
	} else {
		db = ClubDatabaseFactory(session.login.club, session.login.RO);
		let foo = db.prepare("SELECT * FROM club WHERE code=?").get(session.login.club);
		if (foo == undefined) {
			let r = db.prepare("INSERT INTO club (code,nom) VALUES (?,?)").run(session.login.club, session.login.club);
			foo = db.prepare("SELECT * FROM club WHERE code=?").get(session.login.club);
			console.log("Créé club " + session.login.club);
		}
		console.log("Ouverture de session de " + session.club.nom);
	}

	nbr_clients++;
	if (session.erreur != undefined) {
		client.emit("alert", session.erreur);
		session.erreur = null;
		session.save();
	}

	if (session.warning != undefined) {
		client.emit("warning", session.warning);
		session.warning = null;
		session.save();
	}

	if (session.info != undefined) {
		client.emit("info", session.info);
		session.info = null;
		session.save();
	}
	// les positions/tailles des fenêtres pop-up
	// sont mémorisées au niveau général (identiques sur toutes les pages)
	if (session.choix == undefined) {
		session.choix = {
			itm: 1,
			flags: 0,
		};
		session.dirty = true;
	}
	delete session.choix.param;
	if (session.choix.flags == undefined) {
		session.choix.flags = 0;
		session.dirty = true;
	}

	if (session.choix.forms == undefined) {
		session.choix.forms = {
			flags: 0,
		};
		session.dirty = true;
	}

	if (session.choix.report == undefined) {
		session.choix.report = {
			flags: 0,
		};
		session.dirty = true;
	}
	//delete session.choix.moveable;
	// position des fenêtres (sauf si elles dépendent d'un formulaire)
	if (session.choix.windows == undefined) {
		session.choix.windows = {
			getImage: { show: false },
			rsz_crop: {},
			inspecteur: { show: true, no_w: true, no_h: true },
			lst_tables: { show: true },
			sql_explorer: { show: true },
		};
		session.dirty = true;
	}

	if (session.dirty) session.save();

	client.on("session", () => {
		client.emit("session", session);
	});

	client.onAny((event, p1, p2, p3, p4, p5) => {
		/*
		if (p5 != undefined) console.log("IO WEB->", event, p1, p2, p3, p4, p5);
		else if (p4 != undefined) console.log("IO WEB->", event, p1, p2, p3, p4);
		else if (p3 != undefined) console.log("IO WEB->", event, p1, p2, p3.toString().substring(0, 20));
		else if (p2 != undefined) console.log("IO WEB->", event, p1, p2);
		else if (p1 != undefined) console.log("IO WEB->", event, p1);
		else console.log("IO WEB->", event);
		*/
	});

	/*****************/
	/* AVEC CALLBACK */
	/*****************/
	client.on("cb_all", (requete, param, cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			try {
				if (param == undefined) cb(db.prepare(requete).all());
				else cb(db.prepare(requete).all(param));
			} catch (e) {
				cb({ err: e.message });
			}
	});

	client.on("cb_get", (requete, param, cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			try {
				if (param == undefined) cb(db.prepare(requete).get());
				else cb(db.prepare(requete).get(param));
			} catch (e) {
				cb({ err: e.message });
			}
	});

	client.on("cb_run", (requete, param, cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			try {
				console.log(requete, param);
				if (param == undefined) cb(db.prepare(requete).run());
				else cb(db.prepare(requete).run(param));
			} catch (e) {
				cb({ err: e.message });
			}
	});

	client.on("cb_test", (requete, param, cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			try {
				db.prepare("BEGIN").run();
				if (param == undefined) cb(db.prepare(requete).run());
				else cb(db.prepare(requete).run(param));
			} catch (e) {
				cb({ err: e.message });
			}
		db.prepare("ROLLBACK").run();
	});

	client.on("cb_images", (cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			try {
				let r = [
					{ d: "/images/bibli/", f: [] },
					{ d: "/images/textures/", f: [] },
					{ d: "/public/Clubs/" + session.club.code + "/images/", f: [] },
				];
				fs.readdir(__dirname + dir_sep + "images/bibli", function (err, files) {
					if (err) cb({ err: "Impossible de lire les images: " + err });
					else {
						files.forEach((file) => r[0].f.push(file));
						fs.readdir(__dirname + dir_sep + "images/textures", function (err, files) {
							if (err) cb({ err: "Impossible de lire les images: " + err });
							else {
								files.forEach((file) => r[1].f.push(file));
								fs.readdir(clubs_dir + session.club.code + dir_sep + "images", function (err, files) {
									if (err) cb({ err: "Impossible de lire les images: " + err });
									else {
										files.forEach((file) => r[2].f.push(file));
										cb(r);
									}
								});
							}
						});
					}
				});
			} catch (e) {
				cb({ err: e.message });
			}
	});

	client.on("chg_mp", function (club, licence, old_val, new_val, cb) {
		if (session.club == undefined) cb({ err: "Session fermée. Reconnectez vous" });
		else
			try {
				let info = {};
				const stm = "SELECT id,hash,LENGTH(hash) AS pwl FROM login WHERE club=? AND licence";
				let enr;
				if (licence == undefined) enr = db_login.prepare(stm + " IS NULL").get(club);
				else enr = db_login.prepare(stm + "=?").get(club, licence);
				if (enr == undefined) throw new Error("Erreur dans les identifiants");
				else if ((old_val != "" || (enr.hash != undefined && enr.pwl != 0)) && bcrypt.compareSync(old_val, enr.hash) == false) throw new Error("Ancien mot de passe incorrect");
				else if (new_val != "")
					bcrypt.hash(new_val, 10, function (err, hash) {
						if (err) throw new Error("Hash:" + err.message);
						else info = db_login.prepare("UPDATE login SET hash=? WHERE id=" + enr.id).run(hash);
						if (info.changes == 1) cb("Mot de passe modifié");
						else throw new Error("Mot de passe inchangé..");
					});
				else {
					info = db_login.prepare("UPDATE login SET hash=null WHERE id=" + enr.id).run();
					if (info.changes == 1) cb("Mot de passe supprimé");
					else throw new Error("Mot de passe inchangé..");
				}
			} catch (err) {
				console.log(err.message);
				cb({ err: err.message });
			}
	});

	// callback indispensable car sinon déconnexion session AVANT sauvegarde
	client.on("updSession", (nom, valeur, cb) => {
		//console.log(session);
		if (session.club == undefined) cb({ err: "Session fermée. Reconnectez vous" });
		else {
			updSession(nom, valeur);
			cb({});
		}
	});

	client.on("liste_forms", (id_club, cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			try {
				cb(db.prepare("SELECT id,nom FROM formulaires WHERE id_club IS NULL OR id_club=?").all(id_club));
			} catch (e) {
				cb({ err: e.message });
			}
	});

	client.on("load_form", (id, cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			try {
				let enr = db.prepare("SELECT id,contenu FROM formulaires WHERE id=?").get(id);
				if (enr == undefined) cb({ err: "Formulaire effacé" });
				else cb(enr);
			} catch (e) {
				cb({ err: e.message });
			}
	});

	client.on("save_form", (form, cb) => {
		if (db == undefined) cb({ err: "Session fermée. Reconnectez-vous" });
		else
			try {
				const id = form.id;
				delete form.id; // retirer id du JSON avant stringify
				BeforeSaveForm(form);
				const contenu = JSON.stringify(form);
				//console.log(contenu);
				//db.prepare("BEGIN").run();
				if (id == undefined) cb(db.prepare("INSERT INTO formulaires (id_club,nom,contenu) VALUES (?,?,?)").run(session.club.id, form.nom, contenu));
				else cb(db.prepare("UPDATE formulaires set nom=?,contenu=? WHERE id=?").run(form.nom, contenu, id));
			} catch (err) {
				cb({ err: err.message });
			}
		//db.prepare("ROLLBACK").run(); // pour tests
	});

	client.on("chk_img", (dest, cb) => {
		if (db == undefined) cb({ err: "Session fermée. Reconnectez-vous" });
		else cb(fs.existsSync(clubs_dir + session.club.code + dir_sep + dest));
	});

	function BeforeSaveChamp(el) {
		if (!el) return; // slot vide
		delete el.idx;
	}
	function BeforeSaveBande(b) {
		if (b && b.champs != undefined) b.champs.forEach((el) => BeforeSaveChamp(el));
		delete b.no_ligne;
	}

	client.on("save_etat", (etat, cb) => {
		if (db == undefined) cb({ err: "Session fermée. Reconnectez-vous" });
		else
			try {
				const id = etat.id;
				delete etat.id; // retirer id du JSON avant stringify
				if (etat.champs != undefined) etat.champs.forEach((el) => BeforeSaveChamp(el));
				if (etat.bandes != undefined) etat.bandes.forEach((bd) => BeforeSaveBande(bd));
				const contenu = JSON.stringify(etat);
				if (id == undefined) cb(db.prepare("INSERT INTO report (id_club,nom,contenu) VALUES (?,?,?)").run(session.club.id, etat.nom, contenu));
				else cb(db.prepare("UPDATE report set nom=?,contenu=? WHERE id=?").run(etat.nom, contenu, id));
			} catch (err) {
				console.error(err);
				cb({ err: err.message });
			}
	});

	client.on("makePdf", (etat, polices, b, cb) => {
		const filename = etat.nom + ".pdf";
		if (etat && etat && etat.pages.length) {
			var fstream = fs.createWriteStream(filename);
			printMe.printThis(fstream, etat, polices);

			fstream.on("error", function (err) {
				console.log("ERROR:", err);
				fstream.end();
				cb("[E]" + err.message);
			});

			fstream.on("close", function (err) {
				let foo = "";
				if (err != undefined) foo = err.message;
				else if (b == true)
					child_process.exec("start " + filename, (error, stdout, stderr) => {
						if (error != undefined) foo = error.message;
					});
				cb(foo != "" ? "[E]" + foo : "Le PDF est prêt dans " + filename);
			});
		}
	});

	/*****************/
	/* SANS CALLBACK */
	/* (a éliminer)  */
	/*****************/

	client.on("sql_all", (id_unique, requete, param) => {
		if (db == undefined) client.emit(id_unique, { err: "Session expirée. Identifiez-vous" });
		else
			try {
				if (param == undefined) client.emit(id_unique, db.prepare(requete).all());
				else client.emit(id_unique, db.prepare(requete).all(param));
			} catch (e) {
				console.error(e.message);
				client.emit(id_unique, {
					err: e.message,
				});
			}
	});

	client.on("faire_req", (nom, corps, p) => {
		if (db == undefined) client.emit(nom, { err: "Session expirée. Identifiez-vous" });
		else
			try {
				let foo;
				//console.log(nom, corps, p);
				// impossible d'utiliser les fonctions de l'objet requete, car elles ne passent pas avec l'objet
				// donc on ne prend que les éléments nécessaires
				if (corps.substring(0, 7).toUpperCase() == "SELECT ") {
					if (p != undefined) foo = db.prepare(corps).all(p);
					else foo = db.prepare(corps).all();
				} else if (p != undefined) foo = db.prepare(corps).run(p);
				else foo = db.prepare(corps).run();
				client.emit(nom, foo);
			} catch (e) {
				console.error(e.message);
				client.emit(nom, {
					err: e.message,
				});
			}
	});

	client.on("sql_test", (id_unique, requete, p) => {
		if (db == undefined) client.emit(id_unique, { err: "Session expirée. Identifiez-vous" });
		else
			try {
				db.prepare("BEGIN").run();
				if (p == undefined) client.emit(id_unique, db.prepare(requete).run());
				else client.emit(id_unique, db.prepare(requete).run(p));
			} catch (e) {
				console.error(e.message);
				client.emit(id_unique, {
					err: e.message,
				});
			}
		db.prepare("ROLLBACK").run();
	});

	client.on("begin_transaction", () => {
		try {
			if (db.inTransaction) client.emit("warning", "Transaction déjà active");
			else db.prepare("BEGIN").run();
		} catch (e) {
			console.error(e.message);
			client.emit("alert", e.message);
		}
	});

	client.on("end_transaction", (commit) => {
		try {
			if (db.inTransaction) db.prepare(commit ? "COMMIT" : "ROLLBACK").run();
		} catch (e) {
			console.error(e.message);
			client.emit("alert", e.message);
		}
	});

	client.on("table_info", (id_unique, nom) => {
		try {
			client.emit(id_unique, { ar: db.pragma("table_info = " + nom) });
		} catch (e) {
			client.emit(id_unique, {
				err: e.message,
			});
		}
	});

	client.on("sql_run", (id_unique, requete, p1, p2, p3) => {
		if (db == undefined) client.emit(id_unique, { err: "Session expirée. Identifiez-vous" });
		else
			try {
				//console.log(requete, p1, p2, p3);
				if (p3) client.emit(id_unique, db.prepare(requete).run(p1, p2, p3));
				else if (p2) client.emit(id_unique, db.prepare(requete).run(p1, p2));
				else if (p1) client.emit(id_unique, db.prepare(requete).run(p1));
				else client.emit(id_unique, db.prepare(requete).run());
			} catch (e) {
				console.error(e.message);
				client.emit(id_unique, {
					err: e.message,
				});
			}
	});

	client.on("dring", (what, p1) => {
		socketio.emit("dring", what, p1);
	});

	client.on("sql_get", (id_unique, requete, p1, p2) => {
		if (db == undefined) client.emit(id_unique, { err: "Session expirée. Identifiez-vous" });
		else
			try {
				if (p2) client.emit(id_unique, db.prepare(requete).get(p1, p2));
				else if (p1) client.emit(id_unique, db.prepare(requete).get(p1));
				else client.emit(id_unique, db.prepare(requete).get());
			} catch (e) {
				console.error(e.message);
				client.emit(id_unique, {
					err: e.message,
				});
			}
	});

	client.on("get_pwl", (val) => {
		try {
			// la suite dans POST /login
			client.emit("get_pwl", db_login.prepare("SELECT id,LENGTH(hash) AS pwl FROM login WHERE club=? OR licence=?").get(val, val));
		} catch (e) {
			console.error(e.message);
			client.emit("get_pwl", {
				err: e.message,
			});
		}
	});

	client.on("can_log", (id_membre, val) => {
		if (db == undefined) client.emit(id_unique, { err: "Session expirée. Identifiez-vous" });
		else
			try {
				// extraire les infos nécessaires
				let enr = db.prepare("SELECT licence,email,date_naissance FROM membres WHERE id=" + id_membre).get();
				if (enr == undefined) throw new Error("NTBS 507: ID membre manquante");
				else {
					db_login.prepare("DELETE FROM login WHERE club=? AND licence=?").run(session.login.club, enr.licence);
					if (val == true) {
						const ar = enr.date_naissance.split("-");
						const foo = ar[2] + "/" + ar[1] + "/" + ar[0];
						//console.log(foo, session.login.club);
						bcrypt.hash(foo, 10, function (err, hash) {
							if (err) throw new Error(err);
							else db_login.prepare("INSERT INTO login (club,licence,hash,reset_email) VALUES (?,?,?,?)").run(session.login.club, enr.licence, hash, enr.email);
						});
					}
				}
			} catch (e) {
				console.error(e);
				client.emit("alert", { err: e.message });
			}
	});

	function updSession(nom, valeur) {
		let b = false;
		if (typeof valeur == "object") b = JSON.stringify(session.choix[nom]) === JSON.stringify(valeur);
		else b = session.choix[nom] == valeur;
		if (!b) {
			session.choix[nom] = valeur; // ajout dynamique.
			session.dirty = true;
			session.save();
		}
	}

	client.on("upducfg", (nom, valeur) => {
		if (session.club == undefined) client.emit("upducfg:", "Session fermée. Reconnectez vous");
		else {
			updSession(nom, valeur);
			client.emit("upducfg:", "");
		}
	});

	/*	client.on("liste_etats", (id_club) => {
		if (db == undefined) client.emit("alert", "Session expirée. Identifiez-vous");
		else client.emit("liste_etats", db.prepare("SELECT id,nom FROM report WHERE id_club IS NULL OR id_club=?").all(id_club));
	});

	client.on("load_etat", (id) => {
		if (db == undefined) client.emit("alert", "Session expirée. Identifiez-vous");
		else
			try {
				let enr = db.prepare("SELECT id,contenu FROM report WHERE id=?").get(id);
				if (enr == undefined) client.emit("alert", "État effacé");
				else client.emit("load_etat", enr);
			} catch (e) {
				client.emit("alert", e.message);
			}
	});*/
	client.on("image", (msg) => {
		console.log(typeof msg, msg);
	});

	function BeforeSaveForm(f) {
		for (let el of f.elements) {
			delete el.idx;
			delete el.val0;
			delete el._val;
			delete el.init_str;
			delete el.val_str;
			delete el.ref2me;
			if (el.label != undefined && el.label.txt == "" && el.label.pos == 0) delete el.label;
			if (el.style != undefined) {
				if (el.style.fontFamily == f.style.fontFamily) delete el.style.fontFamily;
				if (el.style.fontSize == f.style.fontSize) delete el.style.fontSize;
				if (el.style.fontWeight == f.style.fontWeight) delete el.style.fontWeight;
				if (el.style.fontStyle == f.style.fontStyle) delete el.style.fontStyle;
				if (Object.keys(el.style).length == 0) delete el.style;
			}
		}
		for (let el of f.requetes) {
			delete el.rows;
			delete el.idx_row;
			delete el.plus;
			delete el.ref2me;
			if (el.params != undefined) {
				if (el.params.length == 0) delete el.params;
				else
					el.params.forEach((p) => {
						if (p.calc != undefined) delete p.calc;
					});
			}
		}
		// params à refaire à chaque chargement
		delete f.params;
		delete f.temp;
		delete f.coul;
		delete f.magnet;
	}

	client.on("close_form", (choix, form) => {
		updSession("forms", choix);
		let r = "OK";
		if (form != undefined) {
			if (db == undefined) r = "Session expirée. Identifiez-vous";
			else
				try {
					BeforeSaveForm(form);
					const contenu = JSON.stringify(form);
					if (form.id == undefined) {
						let info = db.prepare("INSERT INTO formulaires (id_club,nom,contenu) VALUES (?,?,?)").run(session.club.id, form.nom, contenu);
						r = "UPD:" + info.lastInsertRowid;
					} else {
						db.prepare("UPDATE formulaires set nom=?,contenu=? WHERE id=?").run(form.nom, contenu, form.id);
					}
					//client.emit("rfh_reports:", db.prepare("SELECT * FROM report WHERE id_club IS NULL OR id_club==?").all(session.club.id));
				} catch (err) {
					console.error(err);
					r = "ERR:" + err.message;
				}
		}
		client.emit("close_form", r);
	});

	client.on("disconnect", function () {
		//console.log("disconnect", session);
		let st = "";
		if (session.login != undefined) {
			if (session.login.f & 1) {
				// need_save
				session.login.f &= ~1;
				const info = db_login.prepare("UPDATE login SET flags=" + session.login.f + " WHERE id=" + session.login.id).run();
			}
		}
		if (session.club != undefined) {
			st = session.club.nom + " déconnecté. ";
			//saveJconfig();
			try {
				if (session.dirty == true) {
					delete session.choix.windows.inspecteur.w;
					delete session.choix.windows.inspecteur.h;
					if (db_login != undefined) {
						const info = db_login.prepare("UPDATE login SET choix=? WHERE id=" + session.login.id).run(JSON.stringify(session.choix));
					}
					session.dirty = false;
				}
			} catch (err) {
				console.error(err.message);
			}
		}
		nbr_clients--;
		if (nbr_clients > 1) st += "Encore " + nbr_clients + " connectés";
		else if (nbr_clients == 1) st += "Reste un seul client connecté";
		else st += "Plus personne n'est connecté";
		console.log(st);
		if (db != undefined) {
			if (db.inTransaction) db.prepare("ROLLBACK").run();
			db.close();
			db = undefined;
		}
	});

	function envoiImages(dossier) {
		try {
			fs.readdir(__dirname + dir_sep + "images" + dir_sep + dossier, function (err, files) {
				if (err) client.emit("alert", "Impossible de lire les images: " + err);
				else {
					let list1 = [];
					files.forEach((file) => {
						list1.push(file);
					});
					client.emit("get_" + dossier + ":", { pdir: "/images/" + dossier + "/", f: list1 });
				}
			});
		} catch (e) {
			console.error("NTBS 565:" + e.message);
			client.emit("alert", e.message);
		}
	}

	client.on("get_textures", function () {
		envoiImages("textures");
		envoiImages("bibli");
	});

	client.on("get_images", function () {
		listerImagesClub();
	});

	client.on("get_ttf", function () {
		if (session.club == undefined || session.club.code == undefined) client.emit("alert", "NTBS 834: Info club manquantes");
		else {
			const fn = clubs_dir + session.club.code + dir_sep + "font.json";
			if (!fs.existsSync(fn)) makeFontface();
			else {
				fs.readFile(fn, (err, data) => {
					if (err) client.emit("alert", "NTBS 836" + err);
					else {
						client.emit("add_fonts", data.toString());
					}
				});
			}
		}
	});

	client.on("make_fontface", function () {
		if (session.club == undefined || session.club.code == undefined) client.emit("alert", "NTBS 841: Info club manquantes");
		else
			makeFontface()
				.then(client.emit("need_refresh")) // refaire la page pour intégrer les nouvelles polices)
				.catch((e) => client.emit("alert", e));
	});

	function makeFontface() {
		return new Promise((resolve, reject) => {
			if (session.club == undefined || session.club.code == undefined) reject("makeFontface: Info club manquantes");
			else {
				let foo = clubs_dir + session.club.code;
				try {
					if (!fs.existsSync(foo)) fs.mkdirSync(foo);
					foo += dir_sep + "fonts";
					if (!fs.existsSync(foo)) fs.mkdirSync(foo);
					fs.readdir(foo, function (err, files) {
						if (err) client.emit("alert", "NTBS 843" + err);
						else {
							let st = "";
							let json = "";
							// ttfInfo est asynchrone, et ne se termine pas forcéent dans l'ordre des index..
							let nbr = files.length;
							console.log(files);
							files.forEach((fn) => {
								console.log(fn);
								ttfInfo(foo + dir_sep + fn, function (err, info) {
									// piège: en cas d'erreur plus bas, cette fonction est réappellée est info undefined et err valide
									//console.log("Make fontface de " + fn, nbr, info == undefined, err);
									if (err != undefined) reject(err);
									else if (info != undefined && info.tables != undefined && info.tables.name != undefined && info.tables.name[1] != undefined) {
										if (json != "") json += ",";
										//json += '{ "name": "' + info.tables.name[1] + '", "file": "' + clubs_dir + session.club.code + dir_sep + "fonts" + dir_sep + fn + '"}';
										json += '{ "name": "' + info.tables.name[1] + '", "file": "/public/Clubs/' + session.club.code + "/fonts/" + fn + '"}';
										st += '@font-face { font-family: "' + info.tables.name[1] + '"; src: url("/public/Clubs/' + session.club.code + "/fonts/" + fn + '") format("truetype");}\n';
										if (--nbr == 0)
											fs.writeFile(clubs_dir + session.club.code + dir_sep + "fontface.css", st, (err) => {
												if (err) console.error("Erreur lors de l'écriture du fichier fontface.css");
												json = "[" + json + "]";
												console.log(json);
												client.emit("add_fonts", json);
												fs.writeFile(clubs_dir + session.club.code + dir_sep + "font.json", json, (err) => {
													if (err) console.error("Erreur lors de l'écriture du fichier font.json");
													resolve();
												});
											});
									} else reject("Erreur sur info:"); //console.error(info);
								});
							});
						}
					});
				} catch (e) {
					reject(e.message);
				}
			}
		});
	}

	client.on("unzip", function (src, dest, filtre) {
		if (session.club == undefined || session.club.code == undefined) client.emit("alert", "NTBS 887: Info club manquantes");
		else {
			let nbr_ttf = 0;
			fs.createReadStream(src)
				.pipe(unzipper.Parse())
				.on("entry", function (entry) {
					if (entry.type != "File") entry.autodrain();
					else {
						let ok = filtre.length == 0 ? true : false;
						filtre.forEach((el) => {
							if (entry.path.toLowerCase().endsWith(el)) ok = true;
						});
						if (ok) {
							const fileName = clubs_dir + session.club.code + dir_sep + dest + dir_sep + entry.path;
							if (fs.existsSync(fileName)) {
								client.emit("warning", entry.path + " est déjà installé");
								entry.autodrain();
							} else {
								entry.pipe(fs.createWriteStream(fileName));
								nbr_ttf += 1;
								client.emit("info", "Ajoute " + entry.path);
							}
						} else entry.autodrain();
					}
				})
				.on("end", function () {
					if (nbr_ttf > 0) {
						makeFontface()
							.then(client.emit("need_refresh")) // refaire la page pour intégrer les nouvelles polices)
							.catch((e) => client.emit("alert", e));
					}
					fs.unlink(src, function (err) {
						if (err) console.error(err.message);
					});
				});
		}
	});

	client.on("del_news", function (id) {
		if (db == undefined) client.emit("alert", "Session expirée. Identifiez-vous");
		else
			try {
				let enr = db.prepare("SELECT url_pj FROM news WHERE id=" + id).get();
				if (enr != undefined && enr.url_pj != undefined) {
					let path = clubs_dir + session.login.club + dir_sep + "news" + dir_sep + enr.url_pj;
					if (!fs.existsSync(path)) client.emit("alert", "Le fichier " + enr.url_pj + " est introuvable.");
					else
						fs.unlink(path, function (err) {
							if (err) client.emit("alert", err.message);
						});
				}
				db.prepare("DELETE FROM news WHERE id=" + id).run();
				client.emit("get_news", db.prepare("SELECT * FROM news ORDER BY date_fin ASC").all());
			} catch (e) {
				console.error("NTBS 754:" + e.message);
				client.emit("alert", e.message);
			}
	});

	client.on("cvs", function (cb, fn) {
		ImporteCSV(fn, session.login != undefined ? session.login.club : undefined, session.choix != undefined ? session.choix.saison : undefined)
			.then((msg) => client.emit(cb, msg))
			.catch((e) => client.emit(cb, { err: e }));
	});

	client.on("delimg", function (path, fn) {
		if (path == "") path = clubs_dir + session.club.code + dir_sep + "images" + dir_sep;
		if (!fs.existsSync(path)) fs.mkdirSync(path);
		fs.unlink(path + fn, function (err) {
			if (err) client.emit("alert", err.message);
			else if (path == "") listerImagesClub("get_images_fp:");
			else listerImagesClub("get_images:");
		});
	});

	function listerImagesClub() {
		if (session.club == undefined || session.club.code == undefined) client.emit("alert", "NTBS 542: Info club manquantes");
		else {
			let foo = clubs_dir + session.club.code;
			try {
				if (!fs.existsSync(foo)) fs.mkdirSync(foo);
				foo += dir_sep + "images";
				if (!fs.existsSync(foo)) fs.mkdirSync(foo);
				fs.readdir(foo, function (err, files) {
					//handling error
					if (err) client.emit("alert", "Impossible de lire les images: " + err);
					else {
						//listing all files using forEach
						let list1 = [];
						files.forEach((file) => {
							//let n = db.prepare("SELECT COUNT(*) AS n FROM messages WHERE id_mairie=" + local_session.user.id_mairie + " AND xml LIKE '%" + file.replace("'", "''") + "%'").get().n;
							list1.push({
								img: file,
								n: 1,
							});
						});
						client.emit("get_images:", {
							pdir: "/public/Clubs/" + session.club.code + "/images/",
							imgs: list1,
						});
					}
				});
			} catch (e) {
				console.error("NTBS 565:" + e.message);
				client.emit("alert", e.message);
			}
		}
	}
}); // on socket connection

//*******************
//    GET Routes
//*******************

// checkAuthenticated envoi la page de login si échec (pas connecté)
// checkNotAuthenticated envoi la page des messages si échec (user connecté)
app.get("/", (req, res) => {
	res.render("index.html");
});

app.get("/index", (req, res) => {
	res.render("index.html");
});

app.get("/dashboard", checkClub, (req, res) => {
	res.render("dashboard.html");
});

app.get("/print_f", (req, res) => {
	res.render("print_f.html");
});

app.get("/visuPDF", (req, res) => {
	res.render("visuPDF.html");
});

//app.get("/test", (req, res) => {	res.render("test_print.html");});

app.get("/news", checkClub, (req, res) => {
	res.render("news.html");
});

app.get("/club", checkClub, (req, res) => {
	res.render("club.html");
});

app.get("/federal", checkClub, (req, res) => {
	res.render("federal.html");
});

app.get("/report", checkIsAdmin, (req, res) => {
	res.render("report.html", { id_club: req.session.login.club });
});

app.get("/forms", checkIsAdmin, (req, res) => {
	res.render("formulaire.html");
});

app.get("/logout", (req, res) => {
	// Upon logout, we can destroy the session and unset req.session.
	if (req.session)
		req.session.destroy((err) => {
			// We can also clear out the cookie here. But even if we don't, the
			// session is already destroyed at this point, so either way, they
			// won't be able to authenticate with that same cookie again.
			if (err) console.error("NTBS 863", err.message);
			//res.clearCookie('sid')
		});
	res.render("index.html");
});

//*******************
//   POST Routes
//*******************
app.post("/login", (req, res) => {
	checkLogin(req.body.numero, req.body.password)
		.then((enr) => {
			Log2Club(enr, req.session);
			// pas sûr que switch marche sur undefined
			if (req.session.choix.itm == 6) res.redirect("/federal");
			else if (req.session.choix.itm == 5) res.redirect("/club");
			else if (req.session.choix.itm == 4) res.redirect("/forms");
			else if (req.session.choix.itm == 3) res.redirect("/report");
			else if (req.session.choix.itm == 2) res.redirect("/news");
			else res.redirect("/dashboard");
		})
		.catch((err) => {
			console.error(err);
			req.session.login = null;
			req.session.erreur = err;
			res.redirect("/index");
		});
});

function Log2Club(enr, se) {
	//console.log("Log2Club", enr, se.login);
	let db = ClubDatabaseFactory(enr.club, true);
	const e1 = db.prepare("SELECT * FROM club WHERE code=?").get(enr.club);
	se.login = { id: enr.id, club: enr.club, ro: enr.RO, checks: enr.checks, f: enr.flags };
	se.club = e1 != undefined ? { id: e1.id, code: e1.code, nom: e1.nom, email: e1.email, logo: e1.logo } : { code: enr.club, nom: enr.club, email: enr.reset_email, logo: "/public/Clubs/" + enr.club + "/images/logo.png" };
	if (enr.licence != undefined) {
		const e2 = db.prepare("SELECT * FROM membres WHERE licence=?").get(enr.licence);
		se.login.nom = e2.prenom + " " + e2.nom;
		se.login.licence = enr.licence;
		// répercuter le status 'Administrateur' du membre dans le login
		if (typeof e2.checks == "string" && e2.checks.length > 5 && e2.checks[5] == "X") se.login.f |= 2;
		else se.login.f &= ~2;
	} else {
		se.login.nom = se.club.nom;
	}
	db.close();
	se.choix = JSON.parse(enr.choix || '{ "itm": 1 }');
}

function checkLogin(code, password) {
	// Promise plus simple à lire, et prête pour bcrypt asynchrone ultérieur
	return new Promise((accept, reject) => {
		let enr = {};
		try {
			enr = db_login.prepare("SELECT *,LENGTH(hash) AS pwl FROM login WHERE licence=? OR (licence IS NOT NULL AND reset_email=?) OR (licence IS NULL AND club=?)").get(code, code, code);
			if (enr == undefined) reject("Le club ou la licence " + code + " n'existent pas");
			else if ((password != "" || (enr.hash != undefined && enr.pwl != 0)) && bcrypt.compareSync(password, enr.hash) == false) reject("Mot de passe incorrect");
			else accept(enr);
		} catch (err) {
			console.error(err.message);
			reject(err.message);
		}
	});
}

function checkIsAdmin(req, res, next) {
	// isAuthenticated est une fonction du middleware passport
	//console.log("checkIsAdmin", req.session.login);
	if (req.session != undefined && req.session.club != undefined && Boolean(req.session.login.f & 2)) {
		next();
	} else {
		req.session.erreur = "Réservé aux administrateurs du site !";
		res.redirect("/index");
	}
}

function checkClub(req, res, next) {
	// si la session ne contient pas de club cible, l'ajouter en mode lecture seule
	//console.log("checkClub", req.session);
	if (req.session != undefined && req.session.club != undefined) {
		next();
	} else {
		let enr = db_login.prepare("SELECT * FROM login WHERE licence IS NULL AND club=(SELECT paramValue FROM parametres WHERE paramName='CLUB')").get();
		if (enr != undefined) {
			//console.log(enr);
			let db = ClubDatabaseFactory(enr.club, true);
			const e1 = db.prepare("SELECT * FROM club WHERE code=?").get(enr.club);
			req.session.login = { id: enr.id, club: enr.club, ro: true, checks: enr.checks, f: 0, nom: e1.nom };
			req.session.club = { id: e1.id, code: e1.code, nom: e1.nom, email: e1.email, logo: e1.logo };
			db.close();
			req.session.choix = JSON.parse(enr.choix || '{ "itm": 1 }');
			next();
		} else {
			req.session.erreur = "Aucun club par défaut !";
			res.redirect("/index");
		}
	}
}

// L'utilisation de multer pour charger un fichier dans un répertoire fourni lors du POST
// est assez complexe. https://stackoverflow.com/questions/75157185/how-to-upload-a-file-using-multer-in-a-specific-directory-defined-by-the-fronten
app.post("/upload_this", function (req, res) {
	upload(req, res, function (err) {
		res.send("OK:" + req.file.path);
	});
});

//*******************
//  Upload storage
//*******************
let storage = multer.diskStorage({
	destination: (req, file, callback) => {
		/// créer dossier uploads si besoin
		const isCSV = file.mimetype == "text/csv" || file.originalname.toLowerCase().endsWith(".csv");
		const foo = req.body.club == undefined ? __dirname + dir_sep + "upload" : clubs_dir + req.body.club + dir_sep + req.body.dest;
		if (!fs.existsSync(foo)) {
			console.log("Créer le dossier " + foo);
			fs.mkdirSync(foo);
		}
		callback(null, foo); // set upload directory on local system.
	},
	filename: (req, file, callback) => {
		callback(null, req.body.nom == undefined ? file.originalname : req.body.nom);
	},
});

let upload = multer({
	storage: storage,
}).single("userFile");

let multiple_upload = multer({
	storage: storage,
}).any("userFiles");

//**********************
//  Import fichier CSV
//**********************
function GetClub(lignes) {
	// extraire le nom du club du fichier CVS
	let ar1 = lignes[0].split("\t");
	let ar2 = lignes[1].split("\t");
	if (ar1.length > 1) {
		if (ar1[1] == "numéro de club") return ar2[1];
		for (let i = 0; i < ar1.length; i++) {
			if (ar1[i].toLowerCase() == "club") return ar2[i];
		}
	}
	return undefined;
}
function ImporteCSV(fn, club, saison) {
	return new Promise(function (resolve, reject) {
		fs.access(fn, fs.constants.F_OK, (err) => {
			if (err) reject(err);
			else {
				let st = fs
					.readFileSync(fn, {
						encoding: "latin1",
					})
					.toString();
				let lignes = fs
					.readFileSync(fn, {
						encoding: "latin1",
					})
					.toString()
					.replace(/\r/g, "")
					.replace(/;/g, "\t")
					.split("\n");
				let done = 0;
				let last_name = "";
				let foo = GetClub(lignes);
				if (club == undefined && foo == undefined) reject("Aucun identifiant de club. Veuillez ajouter un champ 'club' dans votre fichier");
				else if (club != undefined && club != undefined && foo != club) reject("Ce fichier n'est pas pour le club " + club + " (semble être pour " + foo + ")");
				else {
					if (club == undefined) club = foo;
					let db = ClubDatabaseFactory(club, false);
					if (fn.endsWith("ffab.csv") || fn.includes(dir_sep + "ffab")) {
						lignes.forEach((el, index) => {
							// sauter les entetes
							if (index > 0 && el != "") {
								let champs = el.trimStart().trim().replace(/\r/g, "").replace(/\n/g, "").split("\t");
								// vérifier club
								let id_ligue = "";
								let id_club = "";
								let id_membre = "";
								try {
									//let id_adresse = "";
									let enr = db.prepare("SELECT id FROM ligue WHERE code=?").get(champs[0]);
									if (enr == undefined) {
										let info = db.prepare("INSERT INTO ligue(code) VALUES(?)").run(champs[0]);
										id_ligue = info.lastInsertRowid;
									} else id_ligue = enr.id;
									enr = db.prepare("SELECT id FROM club WHERE code=?").get(champs[1]);
									if (enr == undefined) {
										let info = db.prepare("INSERT INTO club(code,nom,id_ligue) VALUES(?,?,?)").run(champs[1], champs[2], id_ligue);
										id_club = info.lastInsertRowid;
									} else id_club = enr.id;
									enr = db.prepare("SELECT id FROM membres WHERE licence=?").get(champs[4]);
									// sqlite impose le format de date YYYY-MM-DD
									let annee = Number(champs[12].substring(6));
									if (annee < 1900) {
										annee += 1900;
										if (annee < 1940) annee += 100;
									}
									let dn = annee + "-" + champs[12].substring(3, 5) + "-" + champs[12].substring(0, 2);
									if (enr == undefined) {
										let info = db.prepare("INSERT INTO membres(id_club,licence,nom,prenom,sexe,adresse1,adresse2,cp,ville,fixe,portable,email,date_naissance,grade,diplome) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(id_club, champs[4], champs[5], champs[6], champs[7], champs[8], champs[9], champs[10], champs[11], champs[19], champs[18], champs[20], dn, champs[14], champs[15]);
										id_membre = info.lastInsertRowid;
										last_name = champs[5] + " " + champs[6];
										console.log("Importe " + last_name);
										done++;
									} else id_membre = enr.id;
									if (saison != undefined && saison > 0) {
										let n = db.prepare("SELECT COUNT(*) AS nbr FROM membres_par_saison WHERE id_membre=" + id_membre + " AND id_saison=" + saison).get().nbr;
										if (n == 0) db.prepare("INSERT INTO membres_par_saison (id_membre,id_saison) VALUES (?,?)").run(id_membre, saison);
									}
								} catch (e) {
									reject(e.message);
								}
							}
						});
						db.prepare("UPDATE membres SET grade='--' WHERE grade =''").run();
					} else {
						try {
							// créer un log
							var fstream = fs.createWriteStream(clubs_dir + club + dir_sep + "Importation.log");
							// récupérer la liste des colonnes de la table membres.
							let ar = db.pragma("table_info = membres");
							// récupérer la liste des champs externes
							let ar1 = lignes[0].split("\t");
							let not_found = "";
							let found = [];
							let idx_nom;
							let idx_prenom;
							let idx_licence;
							ar1.forEach((st, idx_cvs) => {
								let idx = ar.findIndex((el) => el.name.toLowerCase() == st.toLowerCase());
								if (idx != -1) {
									fstream.write("Le champ " + st + " est dans la table\n");
									found.push(ar[idx].name);
									if (ar[idx].name == "nom") idx_nom = idx_cvs;
									else if (ar[idx].name == "prenom") idx_prenom = idx_cvs;
									else if (ar[idx].name == "licence") idx_licence = idx_cvs;
								} else {
									if (not_found != "") not_found += "\n";
									not_found += "Le champ " + st + " n'est PAS dans la table";
									found.push("");
								}
							});
							if (not_found != "") fstream.write(not_found);
							if (idx_licence == undefined && idx_nom == undefined) throw new Error("Aucun critère de sélection. Il faut un champ 'licence' ou un champ 'nom'. Arrêt de l'importation");
							else {
								lignes.forEach((el, index) => {
									if (index > 0 && el != "") {
										let ar2 = el.split("\t");
										// ce membre existe déjà ?
										let n;
										if (idx_licence != undefined) n = db.prepare("SELECT COUNT(*) as n FROM membres WHERE licence=?").get(ar2[idx_licence]).n;
										else n = db.prepare("SELECT COUNT(*) as n FROM membres WHERE nom=? AND prenom=?").get(ar2[idx_nom], ar2[idx_prenom]).n;
										//
										if (n == 0) {
											done++;
											last_name = (ar2[idx_prenom] || "") + " " + ar2[idx_nom];
											let stm1 = "";
											let stm2 = "";
											let p = [];
											fstream.write("Importe " + last_name + "\n");
											found.forEach((st, idx) => {
												if (st != "") {
													if (stm1 != "") {
														stm1 += ",";
														stm2 += ",";
													}
													stm1 += "'" + found[idx] + "'";
													stm2 += "?";
													p.push(ar2[idx]);
												}
											});
											if (p.length) db.prepare("INSERT INTO membres (" + stm1 + ") VALUES (" + stm2 + ")").run(p);
										}
									}
								});
								db.prepare("UPDATE membres SET grade='--' WHERE grade =''").run();
								fstream.close();
							}
						} catch (e) {
							console.error(e);
							fstream.write(e.message);
							fstream.close();
							reject(e);
						}
					}
					resolve(done == 0 ? "Pas de nouveaux membres" : done == 1 ? last_name + " importé" : done + " membres importés.");
				}
			}
		});
	});
}

//**********************
// Routines de service
//**********************

function QuotedChars(val) {
	return "'" + val.replace(/'/g, "''") + "'";
}

function onErreurServer(e) {
	if (e.errno == "EADDRINUSE") {
		console.log("Le port " + e.port + " est déjà écouté. Fermez l'application qui l'utilise");
		process.exit();
	} else throw e;
}

function SaveAppConfig() {
	//console.log(config_filename, JSON.stringify(app_config, null, 2));
	fs.writeFileSync(config_filename, JSON.stringify(app_config, null, 2), (err) => {
		if (err) console.error("Erreur lors de l'écriture du fichier " + config_filename);
	});
}

function IsNumber(st) {
	for (let i = 0; i < st.length; i++) if (st.charAt(i) < "0" || st.charAt(i) > "9") return false;
	return true;
}

//*********************
// Dé-Initialisations
//*********************

function unInit() {
	if (db_login != undefined) {
		db_login.close();
		db_login = null;
	}
}

//********************
// En arrière toute !
//********************

// Evenement beforeExit (executé a la fermeture normale du programme)
process.on("beforeExit", function () {
	unInit();
	console.log("Au revoir tout le monde.");
});

//Evenement SIGINT (executé a la fermeture par CTRL-C du programme)
process.on("SIGINT", function () {
	unInit();
	console.log("Adieu, monde cruel !");
	process.exit();
});

//*******************
// En avant toute !
//*******************

// lancer les serveurs web
httpserver.on("error", (e) => {
	onErreurServer(e);
});
httpserver.listen(app.get("port"), () => {
	console.log("Ecoute port " + app.get("port") + ". CTRL-C pour finir");
});

if (app_config.certificats != undefined) {
	// Certificate
	const privateKey = fs.readFileSync(app_config.certificats + "privkey.pem", "utf8");
	const certificate = fs.readFileSync(app_config.certificats + "cert.pem", "utf8");
	const ca = fs.readFileSync(app_config.certificats + "chain.pem", "utf8");

	const credentials = {
		key: privateKey,
		cert: certificate,
		ca: ca,
	};

	const httpsServer = require("https").createServer(credentials, app);

	httpsServer.on("error", (e) => {
		onErreurServer(e);
	});
	httpsServer.listen(443, () => {
		console.log("HTTPS Server running on port 443");
		socketio.attach(httpsServer);
	});
}

// lancer le navigateur par défaut sur la page par défaut
if (dir_sep != "/")
	child_process.exec("start http://localhost:" + app.get("port"), (error, stdout, stderr) => {
		if (error) {
			console.error("oups", error.message);
		}
	});

// lancer un timer horaire pour vérifier les BDD
setInterval(everyHour, 3600000);
everyDay();

function everyHour() {
	let d = new Date();
	console.log("tick", d.toLocaleDateString());
	if (d.getDate() != old_date) {
		old_date = d.getDate();
		everyDay();
	}
}

function everyDay() {
	console.log("every day");
	db_login
		.prepare("select club from login WHERE licence IS NULL")
		.all()
		.forEach((row) => {
			checkNews(row.club);
		});
}

function checkNews(club) {
	let _db = ClubDatabaseFactory(club, false);
	try {
		// effacer les news obsolètes (si date_fin < date_publication, ne pas effacer)
		let obso = _db.prepare("SELECT id,url_pj FROM news where date_fin IS NOT NULL AND date_fin < CURRENT_TIMESTAMP AND del_obso IS TRUE").all();
		obso.forEach((enr) => {
			if (enr.url_pj != undefined) {
				let path = clubs_dir + club + dir_sep + "news" + dir_sep + enr.url_pj;
				if (fs.existsSync(path))
					fs.unlink(path, function (err) {
						if (err) console.error(err);
						else console.log("Efface " + path);
					});
			}
		});
		_db.prepare("DELETE FROM news WHERE date_fin IS NOT NULL AND date_fin < CURRENT_TIMESTAMP AND del_obso IS TRUE").run();
	} catch (err) {
		console.error(err);
	}
}
