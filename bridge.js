// aikido.js version bêta
/**************
/     NOTES
 **************
Pour lancer le programme:
node bridge
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
const sqlite3 = require("better-sqlite3");
const bcrypt = require("bcrypt");
const child_process = require("child_process");
// authentificaton
const Session = require("express-session");

// créer le serveur web (alias: httpserver)
const httpserver = require("http").createServer(app);

// Créer socket d'échange page Web<->Node Js
const socketio = require("socket.io")(httpserver);
const favicon = require("serve-favicon"); // icone page web
const ios = require("socket.io-express-session");
const { exit } = require("process");

//******************
// Initialisations
//******************
//initialisation du serveur web, des chemins locaux et du socket
app.set("env", process.env.ENV || "development");
app.set("port", process.env.PORT || 3004);

// utiliser des répertoires statiques chainés (si page manquante, passe au rép suivant..)
app.use("/public", express.static("./")); // 'public' est en réalité ./
app.use("/css", express.static("./css/"));
app.use("/images", express.static("./images/"));
//app.use("/views", express.static("."));
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

const db_filename = __dirname + dir_sep + "bridge.db";
// tester existence database et patchs
try {
	const b = fs.existsSync(db_filename);
	let db = new sqlite3(db_filename, { readonly: false });
	if (!b) {
		console.log("Créer la base " + db_filename);
		// chercher fichier base
		let init_file = __dirname + dir_sep + "database.sql";
		if (!fs.existsSync(init_file)) {
			console.error("Fichier manquant:" + init_file);
			process.exit();
		} else MakePatch(db, init_file);
	}
	// patchs
	let version = Number(db.prepare("SELECT paramValue FROM parametres WHERE paramName='VERSION_BASE'").get().paramValue);
	let found = true;
	while (found) {
		let fn = "patch" + version + "vers" + (version + 1) + ".sql";
		//console.log('Cherche ' + fn);
		found = fs.existsSync(fn);
		if (found) {
			MakePatch(db, fn);
			version += 1;
		}
	}
	console.log("Database version " + version + " est prête");
	db.close();
} catch (err) {
	console.error("NTBS 162", err);
}

//*******************
//    Socket.io
//*******************
// Chaque fois qu'une page web est affichée, 'connection' ouvre un nouveau socket.
//
socketio.on("connection", (client) => {
	let session = client.handshake.session;
	let db = new sqlite3(db_filename, { readonly: false });
	session.dirty = false;
	if (session.user == undefined) {
		let foo = db.prepare("SELECT * FROM users WHERE nom=?").get(app_config.user);
		if (foo == undefined) foo = db.prepare("SELECT * FROM users ORDER BY id LIMIT 1").get();
		session.user = {
			id: foo.id,
			nom: foo.nom,
			is_admin: Boolean(foo.admin),
			can_add: Boolean(foo.can_add),
			can_edit: Boolean(foo.can_edit),
			can_delete: Boolean(foo.can_delete),
		};
		try {
			session.choix = JSON.parse(foo.choix);
		} catch (e) {
			console.error(e);
			session.erreur = e;
			session.choix = {};
		}
	}
	nbr_clients++;
	console.log(session.user.nom + " est connecté.");
	client.on("session", () => {
		client.emit("session", session);
	});

	client.on("disconnect", function () {
		//console.log("disconnect", session);
		let st = "";
		if (session.user != undefined) {
			st = session.user.nom + " déconnecté. ";
			try {
				if (session.dirty == true) {
					const info = db.prepare("UPDATE users SET choix=? WHERE id=" + session.user.id).run(JSON.stringify(session.choix));
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

	client.on("chg_mp", function (id, old_val, new_val, cb) {
		if (db == undefined) cb({ err: "Session fermée. Reconnectez vous" });
		else
			try {
				let info = {};
				let enr = db.prepare("SELECT id,hash,LENGTH(hash) AS pwl FROM users WHERE id=?").get(id);
				if (enr == undefined) throw new Error("Erreur dans les identifiants");
				else if ((old_val != "" || (enr.hash != undefined && enr.pwl != 0)) && bcrypt.compareSync(old_val, enr.hash) == false)
					throw new Error("Ancien mot de passe incorrect");
				else if (new_val != "")
					bcrypt.hash(new_val, 10, function (err, hash) {
						if (err) throw new Error("Hash:" + err.message);
						else info = db.prepare("UPDATE users SET hash=? WHERE id=" + enr.id).run(hash);
						if (info.changes == 1) cb("Mot de passe modifié");
						else throw new Error("Mot de passe inchangé..");
					});
				else {
					info = db_login.prepare("UPDATE users SET hash=null WHERE id=" + enr.id).run();
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
		if (db == undefined) cb({ err: "Session fermée. Reconnectez vous" });
		else {
			updSession(nom, valeur);
			cb({});
		}
	});

	client.on("upducfg", (nom, valeur) => {
		updSession(nom, valeur);
	});

	function updSession(nom, valeur) {
		console.log("updSession", nom, valeur);
		let b = false;
		if (session.choix == undefined) session.choix = {};
		if (typeof valeur == "object") b = JSON.stringify(session.choix[nom]) === JSON.stringify(valeur);
		else b = session.choix[nom] == valeur;
		if (!b) {
			session.choix[nom] = valeur; // ajout dynamique.
			session.dirty = true;
			session.save();
		}
	}

	client.on("liste_donnes", (cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			try {
				cb(db.prepare("SELECT id,nom FROM donnes ORDER BY nom").all());
			} catch (e) {
				cb({ err: e.message });
			}
	});

	client.on("load_donne", (id, cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			try {
				let enr = db.prepare("SELECT data FROM donnes WHERE id=?").get(id);
				if (enr == undefined) cb({ err: "Donne effacée" });
				else cb(enr);
			} catch (e) {
				cb({ err: e.message });
			}
	});

	client.on("save_donne", (enr, cb) => {
		if (db == undefined) cb({ err: "Session fermée. Reconnectez-vous" });
		else
			try {
				const contenu = JSON.stringify(enr.donne);
				if (enr.id == undefined) cb(db.prepare("INSERT INTO donnes (nom,contenu) VALUES (?,?)").run(enr.nom, contenu));
				else cb(db.prepare("UPDATE donnes set nom=?,contenu=? WHERE id=?").run(enr.nom, contenu, enr.id));
			} catch (err) {
				cb({ err: err.message });
			}
	});
}); // fin socket.io

//*******************
//    GET Routes
//*******************

app.get("/", (req, res) => {
	res.render("index.html");
});

app.get("/index", (req, res) => {
	res.render("index.html");
});

//********************
// En arrière toute !
//********************

// Evenement beforeExit (executé a la fermeture normale du programme)
process.on("beforeExit", function () {
	console.log("Au revoir tout le monde.");
});

//Evenement SIGINT (executé a la fermeture par CTRL-C du programme)
process.on("SIGINT", function () {
	console.log("Adieu, monde cruel !");
	process.exit();
});

//*******************
// En avant toute !
//*******************

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

//***********************************************
// FIN DU PROGRAMME: ATTEND CONNECTION CLIENT
//***********************************************

//*******************
//    HELPERS
//*******************
function onErreurServer(e) {
	if (e.errno == "EADDRINUSE") {
		console.log("Le port " + e.port + " est déjà écouté. Fermez l'application qui l'utilise");
		process.exit();
	} else throw e;
}

function MakePatch(db, fn) {
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
					db.prepare(stm).run();
					stm = "";
				} catch (e) {
					console.error(e.message);
				}
			}
		}
	});
}
