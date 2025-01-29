// bridge.js version 1.0.2
/**************
/     NOTES
 **************
Pour lancer le programme:
node bridge
Persistance réglages: https://socket.io/how-to/use-with-express-session
Set-ExecutionPolicy Unrestricted -Scope CurrentUser -Force
*/

//**************
// Declarations
//**************
"use strict";
const express = require("express");
const { createServer } = require("http");
const { join } = require("path");
const { Server } = require("socket.io");
const session = require("express-session");
const app = express();
const httpServer = createServer(app);

const sessionMiddleware = session({
	secret: "WqiZvuvVsIV1zmzJQeYUgINqXYe",
	resave: true,
	saveUninitialized: true,
});

app.use(sessionMiddleware);
const io = new Server(httpServer);
io.engine.use(sessionMiddleware);

const fs = require("fs");
const sqlite3 = require("sqlite3");
const child_process = require("child_process");
const favicon = require("serve-favicon"); // icone page web
const multer = require("multer"); // upload middleware
const { exit } = require("process");
//******************
// Initialisations
//******************
//initialisation du serveur web, des chemins locaux et du socket
app.set("env", process.env.ENV || "development");
// utiliser des répertoires statiques chainés (si page manquante, passe au rép suivant..)
app.use("/public", express.static("./")); // 'public' est en réalité ./
app.use("/css", express.static("./css/"));
app.use("/images", express.static("./images/"));
app.use("/node", express.static("./node_modules/"));
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
var app_config = {};

// récupérer la configuration
const config_filename = __dirname + "/config.json";
if (fs.existsSync(config_filename)) {
	//file exists
	//onsole.log('file ' + config_filename + ' exists');
	try {
		let s = fs.readFileSync(config_filename);
		if (s != "{}") {
			app_config = JSON.parse(s);
		}
	} catch (e) {
		console.error("Parsing error 130", e);
		exit(-1);
	}
} else console.log(config_filename + " introuvable. A créer");

//*******************************
// Initialisation de la session
//*******************************
var nbr_clients = 0;

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

let db_dir = __dirname + dir_sep + "db" + dir_sep;
try {
	fs.statSync(db_dir);
} catch (e) {
	if (e.code == "ENOENT") fs.mkdirSync(db_dir);
}

const dir_upload = __dirname + dir_sep + "upload";
if (!fs.existsSync(dir_upload)) {
	console.log("Créer le dossier " + dir_upload);
	fs.mkdirSync(dir_upload);
}

// base des users
var db_login;
const db_def_filename = "bridge.db";
var db_list = [];
openBase("", "login")
	.then((db) => {
		db_login = db;
		// s'assurer qu'il existe bien une base par défaut
		openBase(db_dir, "bridge").then((db1) => {
			db1.close();
			fs.readdir(db_dir, function (err, files) {
				//handling error
				if (!err) {
					for (let f of files) {
						if ((f.endsWith(".db") || f.endsWith(".bkp")) && IsBridge(f)) db_list.push(f);
					}
					console.log(db_list);
				}
			});
		});
	})
	.catch((e) => console.error(e));

//*******************
//    Socket.io
//*******************
// Chaque fois qu'une page web est affichée, 'connection' ouvre un nouveau socket.
//
const SESSION_RELOAD_INTERVAL = 10 * 60 * 1000;

async function GetUser(nom) {
	let foo = await db_get(db_login, "SELECT * FROM users WHERE nom=?", [nom]);
	if (foo == undefined) foo = await db_get(db_login, "SELECT * FROM users ORDER BY id LIMIT 1");
	let user = {
		id: foo.id,
		nom: foo.nom,
		is_admin: Boolean(foo.admin),
		can_add: Boolean(foo.can_add),
		can_edit: Boolean(foo.can_edit),
		can_delete: Boolean(foo.can_delete),
	};
	try {
		user.choix = JSON.parse(foo.choix);
	} catch (e) {
		console.error(e);
		user.choix = {};
	}
	//console.log(user);
	return user;
}

io.on("connection", async (socket) => {
	const files_to_remove = [];
	const session = socket.request.session;
	// timeout si inactif...
	const timer = setInterval(() => {
		socket.request.session.reload((err) => {
			if (err) {
				// forces the client to reconnect
				socket.emit("alert", "Echec reload");
				socket.conn.close();
			}
		});
	}, SESSION_RELOAD_INTERVAL);

	// récupérer user
	if (session.user == undefined) session.user = await GetUser(app_config.user);
	let db_name = session.user.choix.db || db_def_filename; // nom de la base ouverte par socket.io
	let db = new sqlite3.Database(db_dir + db_name);
	// passons aux choses sérieuses
	session.multiposte = app_config.multiposte;
	nbr_clients++;
	console.log(session.user.nom + " est connecté à " + db_name);

	// et maintenant, on attend le ping-pong

	socket.on("session", () => {
		socket.emit("session", session);
		socket.emit("info", "Database utilisée: " + db_name);
		socket.emit("db_list", db_list);
	});

	socket.on("disconnect", async function () {
		//console.log("disconnect", session);
		clearInterval(timer);
		try {
			if (session.dirty == true) {
				//console.log("Choix change:", session.user.choix);
				const info = await db_run(db_login, "UPDATE users SET choix=? WHERE id=" + session.user.id, [JSON.stringify(session.user.choix)]);
				session.dirty = false;
			}
		} catch (err) {
			console.error(err.message);
		}

		nbr_clients--;
		let st = session.user.nom + " déconnecté. ";
		if (nbr_clients > 1) st += "Encore " + nbr_clients + " connectés";
		else if (nbr_clients == 1) st += "Reste un seul client connecté";
		else st += "Plus personne n'est connecté";
		console.log(st);
		if (db != undefined) {
			// if (db.inTransaction) db_all(db,"ROLLBACK").run();
			db.close();
			db = undefined;
		}
		/* Effacer les fichiers uploadés */
		for (let path of files_to_remove) if (fs.existsSync(path)) fs.unlinkSync(path);
	});

	socket.onAny((event, p1, p2, p3, p4, p5) => {
		if (p5 != undefined) console.log("IO WEB->", event, p1, p2, p3, p4, p5);
		else if (p4 != undefined) console.log("IO WEB->", event, p1, p2, p3, p4);
		else if (p3 != undefined) console.log("IO WEB->", event, p1, p2, p3.toString().substring(0, 20));
		else if (p2 != undefined) console.log("IO WEB->", event, p1, p2);
		else if (p1 != undefined) console.log("IO WEB->", event, p1);
		else console.log("IO WEB->", event);
	});

	/*****************/
	/* AVEC CALLBACK */
	/*****************/
	async function AddTreeNode(node, id_parent) {
		if (node.jeux == undefined) node.jeux = await db_all(db, "SELECT d.id,d.nom FROM data2tree t LEFT JOIN donnes d ON d.id==t.id_donne WHERE t.id_arbre" + id_parent);
		node.childs = await db_all(db, "SELECT id,itm,pos FROM arbre WHERE id_parent" + id_parent + " ORDER BY pos");
		for (let el of node.childs) {
			await AddTreeNode(el, "=" + el.id);
		}
		return node;
	}

	socket.on("get_tree", async (cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			try {
				let node = {};
				node.jeux = await db_all(db, "SELECT id,nom FROM donnes WHERE id NOT IN(SELECT id_donne FROM data2tree)");
				await AddTreeNode(node, " IS NULL");
				cb(node);
			} catch (e) {
				cb({ err: e.message });
			}
	});

	socket.on("cb_all", async (query, values, cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			db.all(query, values || [], function (err, rows) {
				cb(err ? { err: err.message } : rows);
			});
	});

	socket.on("cb_get", async (query, values, cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			db.get(query, values || [], function (err, rows) {
				//if (err) console.error(err.message, query, values);
				cb(err ? { err: err.message } : rows);
			});
	});

	socket.on("cb_run", async (query, values, cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			db.run(query, values || [], function (err, info) {
				cb(err ? { err: err.message } : info);
			});
	});

	/* socket.on("chg_mp", function (id, old_val, new_val, cb) {
		if (db == undefined) cb({ err: "Session fermée. Reconnectez vous" });
		else
			try {
				let info = {};
				let enr = db_login.prepare("SELECT id,hash,LENGTH(hash) AS pwl FROM users WHERE id=?").get(id);
				if (enr == undefined) throw new Error("Erreur dans les identifiants");
				else if ((old_val != "" || (enr.hash != undefined && enr.pwl != 0)) && bcrypt.compareSync(old_val, enr.hash) == false) throw new Error("Ancien mot de passe incorrect");
				else if (new_val != "")
					bcrypt.hash(new_val, 10, function (err, hash) {
						if (err) throw new Error("Hash:" + err.message);
						else info = db_login.prepare("UPDATE users SET hash=? WHERE id=" + enr.id).run(hash);
						if (info.changes == 1) cb("Mot de passe modifié");
						else throw new Error("Mot de passe inchangé..");
					});
				else {
					info = db_login.prepare("UPDATE users SET hash=null WHERE id=" + enr.id).run();
					if (info.changes == 1) cb("Mot de passe supprimé");
					else throw new Error("Mot de passe inchangé..");
				}
			} catch (err) {
				console.error(err.message);
				cb({ err: err.message });
			}
	});*/

	socket.on("upducfg", (nom, valeur) => {
		let b = false;
		if (typeof valeur == "object") b = JSON.stringify(session.user.choix[nom]) === JSON.stringify(valeur);
		else b = session.user.choix[nom] == valeur;
		if (!b) {
			session.user.choix[nom] = valeur; // ajout dynamique.
			session.dirty = true;
			session.save();
		}
	});

	socket.on("liste_donnes", async (cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			try {
				cb(await db_all(db, "SELECT id,nom FROM donnes ORDER BY nom"));
			} catch (e) {
				cb({ err: e.message });
			}
	});

	socket.on("load_donne", async (id, cb) => {
		if (db == undefined) cb({ err: "Session expirée. Identifiez-vous" });
		else
			try {
				let enr = await db_get(db, "SELECT data FROM donnes WHERE id=?" + id);
				if (enr == undefined) cb({ err: "Donne effacée" });
				else cb(enr);
			} catch (e) {
				cb({ err: e.message });
			}
	});

	socket.on("save_donne", async (enr, cb) => {
		if (db == undefined) cb({ err: "Session fermée. Reconnectez-vous" });
		else
			try {
				const contenu = JSON.stringify(enr.jeu);
				if (enr.id == undefined) cb(await db_run(db, "INSERT INTO donnes (nom,data) VALUES (?,?)", [enr.nom, contenu]));
				else cb(await db_run(db, "UPDATE donnes set nom=?,data=? WHERE id=?"), [enr.nom, contenu, enr.id]);
			} catch (err) {
				cb({ err: err.message });
			}
	});
	socket.on("export", async (ar, cb) => {
		if (db == undefined) cb({ err: "Session fermée. Reconnectez-vous" });
		else
			try {
				let st = "";
				let nom = "";
				for (let id of ar) {
					const row = await db_get(db, "SELECT * FROM donnes WHERE id=" + id);
					if (nom != "") nom += ",";
					nom += row.nom;
					st += "INSERT INTO donnes (nom,data) VALUES ('" + row.nom + "', '" + row.data.replace(/'/g, "''").replace('", "txt1":', '",\n"txt1":').replace('", "txt2":', '",\n"txt2":').replace('", "donne":', '",\n"donne":').replace('], "enchere":', '],\n"enchere":') + "');\n";
				}
				nom += ".sql";
				const fn = dir_upload + dir_sep + nom;
				fs.writeFileSync(fn, st);
				files_to_remove.push(fn);
				cb({ fn: "/public/upload/" + nom });
			} catch (e) {
				cb({ err: err.message });
			}
	});

	socket.on("import", async (fn, cb) => {
		if (db == undefined) cb("Session fermée. Reconnectez-vous");
		else {
			files_to_remove.push(fn);
			cb(await MakeSQLfile(db, fn));
		}
	});

	// Database#backup(filename, [callback])
	// Database#backup(filename, destName, sourceName, filenameIsDest, [callback])
	socket.on("bkp", (cb) => {
		if (db == undefined) cb({ err: "Session fermée. Reconnectez-vous" });
		else
			try {
				const d = new Date();
				session.bkp = "bridge " + d.toISOString().substring(0, 10) + ".bkp";

				let backup = db.backup(db_dir + session.bkp, function (err) {
					if (err) throw err;
					backup.step(-1, function (err) {
						if (err) throw err;
						backup.finish(function (err) {
							if (err) throw err;
							cb("/public/db/" + session.bkp);
						});
					});
				});
			} catch (e) {
				cb({ err: e.message });
			}
	});

	socket.on("restore", async (file, cb) => {
		if (db == undefined) cb({ err: "Session fermée. Reconnectez-vous" });
		else
			try {
				// copier le fichier dans le répertoire de BDD
				const idx = file.lastIndexOf(dir_sep);
				const nom = file.substring(idx + 1);
				openBase(db_dir, nom)
					.then((db1) => {
						db1.close();
						const dest = db_dir + nom;
						if (dest != file) {
							console.log("Copier " + file + " dans " + dest);
							fs.copyFileSync(file, dest);
							files_to_remove.push(file);
						}
						if (db_list.indexOf(nom) == -1) db_list.push(nom);
						cb("OK"); // le reste par appel à open_db
					})
					.catch((e) => cb(e.message));
			} catch (e) {
				console.error(e.message);
				cb(e);
			}
	});

	socket.on("open_db", async (nom, cb) => {
		try {
			if (db == undefined) throw new Error("Session fermée. Reconnectez-vous");
			if (db_list.indexOf(nom) == -1) throw new Error("Base inconnue !");
			cb("OK");
			if (nom != db_name) {
				console.log("open_db", nom, db_name, session.choix.db);
				session.choix.db = nom;
				const info = await db_all(db_login, "UPDATE users SET choix=? WHERE id=" + session.user.id, [JSON.stringify(session.choix)]);
				session.dirty = true;
				session.save();
				socket.emit("reload");
			}
		} catch (e) {
			console.error(e);
			cb(e);
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

//*******************
//    GET Routes
//*******************
// L'utilisation de multer pour charger un fichier dans un répertoire fourni lors du POST
// est assez complexe. https://stackoverflow.com/questions/75157185/how-to-upload-a-file-using-multer-in-a-specific-directory-defined-by-the-fronten
app.post("/upload_this", function (req, res) {
	upload(req, res, function (err) {
		res.send("OK:" + req.file.path);
	});
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

httpServer.on("error", (e) => {
	onErreurServer(e);
});
httpServer.listen(app_config.http_port, () => {
	console.log("Ecoute port " + app_config.http_port + ". CTRL-C pour finir");
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
	httpsServer.listen(app_config.https_port, () => {
		console.log("HTTPS Server running on port " + app_config.https_port);
		io.attach(httpsServer);
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

//*******************
//  Upload storage
//*******************
let storage = multer.diskStorage({
	destination: (req, file, callback) => {
		callback(null, dir_upload); // set upload directory on local system.
	},
	filename: (req, file, callback) => {
		callback(null, req.body.nom == undefined ? file.originalname : req.body.nom);
	},
});

let upload = multer({
	storage: storage,
}).single("userFile");

//*******************
// SQLITE PROMISIFY
//*******************
async function db_get(db, query, values = []) {
	return new Promise(function (resolve, reject) {
		db.get(query, values, function (err, row) {
			if (err) {
				return reject(err);
			}
			return resolve(row);
		});
	});
}

async function db_all(db, query, values = []) {
	return new Promise(function (resolve, reject) {
		db.all(query, values, function (err, rows) {
			if (err) {
				return reject(err);
			}
			return resolve(rows);
		});
	});
}

async function db_run(db, query, values = []) {
	return new Promise(function (resolve, reject) {
		db.run(query, values, function (err, row) {
			if (err) {
				return reject(err);
			}
			return resolve(row);
		});
	});
}

async function MakeSQLfile(db, path) {
	let ok = fs.existsSync(path);
	if (ok) {
		const lignes = fs.readFileSync(path).toString().split("\n");
		let stm = "";
		let bloc = false;
		for (let el of lignes) {
			let lig = el.replace("\r", "");
			if (!(lig.startsWith("#") || lig.startsWith("//"))) {
				stm += lig + " ";
				if (lig == "BEGIN") bloc = true;
				else if (lig.startsWith("END")) bloc = false;
				if (!bloc && lig.endsWith(";")) {
					try {
						await db_run(db, stm);
					} catch (e) {
						console.error(e);
						ok = false;
					}
					stm = "";
				}
			}
		}
		if (ok) return await getVersion(db);
	} else console.log(path + ": fichier manquant");
	return undefined;
}

async function getVersion(db) {
	try {
		let foo = await db_get(db, "SELECT paramValue FROM parametres WHERE paramName='VERSION_BASE'");
		return Number(foo.paramValue);
	} catch (e) {
		return undefined;
	}
}

async function openBase(dir, nom) {
	let db = new sqlite3.Database(dir + nom + ".db");
	let version = (await getVersion(db)) || (await MakeSQLfile(db, nom + ".sql"));
	console.log("openBase", nom, version);
	if (!version) return Promise.reject(new Error("Pas de VERSION_BASE")); // exit
	else {
		let row = await db_get(db, "SELECT paramValue FROM parametres WHERE paramName='NATURE_BASE'");
		if (version) while (await MakeSQLfile(db, row.paramValue.toLowerCase() + version + "vers" + (version + 1) + ".sql")) version++;
		return db;
	}
}

async function IsBridge(nom) {
	let ok = false;
	const db = new sqlite3.Database(db_dir + nom);
	let version = await getVersion(db);
	if (version) {
		const row = await db_get(db, "SELECT paramValue FROM parametres WHERE paramName='NATURE_BASE'");
		const nature = row.paramValue.toLowerCase();
		if (nature == "bridge") {
			while (await MakeSQLfile(db, nature + version + "vers" + (version + 1) + ".sql")) version++;
			ok = true;
		}
	}
	db.close();
	return ok;
}
//******************
