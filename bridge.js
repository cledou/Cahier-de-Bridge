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
const nodemailer = require("nodemailer");
//const SendmailTransport = require("nodemailer/lib/sendmail-transport");

const md5 = require("md5");
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
app.use("/js", express.static("./js"));
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
var transport;

// récupérer la configuration
const config_filename = __dirname + "/config.json";
if (!fs.existsSync(config_filename)) fs.copyFileSync(__dirname + "/_config.json", config_filename);
if (fs.existsSync(config_filename)) {
	//file exists
	//onsole.log('file ' + config_filename + ' exists');
	try {
		let s = fs.readFileSync(config_filename);
		if (s != "{}") {
			app_config = JSON.parse(s);
			if (app_config.mail != undefined)
				try {
					transport = nodemailer.createTransport(app_config.mail);
					console.log("Envoi Email via " + app_config.mail.host);
				} catch (e) {
					console.error("Erreur transport mail", e);
				}
			else console.error("Pas de configuration mail");
		}
	} catch (e) {
		console.error("Parsing error 130", e);
		exit(-1);
	}
} else console.error("NTBS:" + config_filename + " introuvable. A créer");

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
var db_list = [];
openBase("login.db", "login.sql")
	.then((db) => {
		db_login = db;
		// s'assurer qu'il existe bien une base par défaut
		openBase(db_dir + "bridge.db").then((db1) => {
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
	const stmt = "SELECT U.id,U.nom,U.last_db,U.admin,P.id as id_choix, P.choix FROM users U LEFT JOIN persistance P ON P.id_user=U.id AND P.nom_base=U.last_db WHERE U.nom=?";
	let row = await db_get(db_login, stmt, [nom]);
	if (row == undefined) row = await db_get(db_login, stmt, "Anonyme");
	let user = {
		id: row.id,
		nom: row.nom,
		last_db: row.last_db,
		is_admin: Boolean(row.admin),
		choix: JSON.parse(row.choix),
		id_choix: row.id_choix,
	};
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
	const db_rw = session.user.id > 1; // si id=1, c'est un Anonyme
	let db;
	nbr_clients++;
	// et maintenant, on attend le ping-pong

	socket.on("session", (cb) => {
		session.need_login = app_config.need_login;
		openBase(db_dir + session.user.last_db).then((db1) => {
			db = db1;
			const who = session.user.nom + " est connecté à " + session.user.last_db;
			console.log(who);
			cb(session);
			socket.emit("info", who);
			socket.emit("db_list", db_list);
		});
	});

	socket.on("disconnect", async function () {
		clearInterval(timer);
		try {
			if (session.dirty == true) {
				//console.log("Choix change:", session.user.choix);
				if (db_rw) {
					if (session.user.id_choix == undefined) {
						await db_run(db_login, "INSERT INTO persistance (id_user,nom_base,choix) VALUES (?,?,?)", [session.user.id, session.user.last_db, JSON.stringify(session.user.choix)]);
						session.user.id_choix = db_login.lastID;
					} else await db_run(db_login, "UPDATE persistance SET choix=? WHERE id=?", [JSON.stringify(session.user.choix), session.user.id_choix]);
				}
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

	socket.on("save_donne", async (enr, cb) => {
		if (db == undefined) cb({ err: "Session fermée. Reconnectez-vous" });
		else if (!db_rw) cb({ err: "Accès en écriture refusé en mode 'Visiteur'" });
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
				openBase(db_dir + nom)
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
			if (nom != session.user.last_db) {
				session.user.last_db = nom;
				const info = await db_all(db_login, "UPDATE users SET last_db=? WHERE id=" + session.user.id, [nom]);
				session.dirty = true;
				session.save();
				socket.emit("reload");
			}
		} catch (e) {
			console.error(e);
			cb(e);
		}
	});

	/********************/
	/* Contrôle d'accès */
	/********************/

	socket.on("connect_me", async function (nom, pw, cb) {
		db_login.get("SELECT nom,hash FROM users WHERE nom LIKE ? OR email LIKE ?", [nom, nom], (err, row) => {
			if (err) cb(err.message);
			else if (PasswordOK(pw, row.hash))
				GetUser(row.nom).then((user) => {
					session.user = user;
					session.save();
					cb("OK");
				});
			else cb("Mot de passe incorrect");
		});
	});

	socket.on("forgot", (nom, cb) => {
		if (db_login == undefined) cb("NTBS: Liste des utilisateurs inaccessible");
		else
			db_login.get("SELECT id,nom,email FROM users WHERE nom LIKE ? OR email LIKE ?", [nom, nom], (err, row) => {
				if (err) cb({ err: err.message, contact: app_config.email_to });
				else if (row == undefined) cb({ err: "Utilisateur introuvable" });
				else if (transport == undefined) cb({ err: "Envoi d'email pas configuré sur ce site", contact: app_config.email_to });
				else {
					// envoi d'un mail pour réinitialiser le mot de passe
					if (row.email == undefined) cb({ err: "Email de '" + nom + "' manquant", contact: app_config.email_to });
					else {
						const hash = md5(row.id + row.nom + Date.now());
						db_login.run("UPDATE users SET reset_hash=? WHERE id=?", [hash, row.id], (err) => {
							if (err) cb({ err: err.message, contact: app_config.email_to });
							else {
								// le lien expire après 5 mn
								setTimeout(() => {
									db_login.run("UPDATE users SET reset_hash=null WHERE reset_hash=?", [hash], (err) => {
										if (err) console.error(err.message);
									});
								}, 300000);
								const raz_url = app_config.http_url + "/reset?p1=" + hash;
								const message = {
									from: app_config.mail.auth.user, // Sender address
									to: row.email || app_config.email_to, // List of recipients
									subject: "Demande de réinitialisation de mot de passe pour " + row.nom, // Subject line
									html: 'Cliquez sur le lien pour réinitialiser votre mot de passe: <a href="' + raz_url + '">Nouveau mot de passe</a>',
									text: "Pour réinitialiser votre mot de passe, cliquez ou copier dans votre navigateur l'adresse suivante: " + raz_url,
								};
								transport.sendMail(message, function (err, info) {
									if (err) cb({ err: err.message, contact: app_config.email_to });
									else cb("Un Email contenant le lien pour réinitialiser votre mot de passe a été envoyé à " + row.email);
								});
							}
						});
					}
				}
			});
	});

	socket.on("get_hash", (hash, cb) => {
		if (db_login == undefined) cb({ err: "NTBS: Liste des utilisateurs inaccessible" });
		else
			db_login.get("SELECT nom,id FROM users WHERE reset_hash=?", [hash], (err, row) => {
				if (err) cb({ err: err.message });
				else if (row == undefined) cb({ err: "Lien de réinitialisation expiré" });
				else cb(row);
			});
	});

	socket.on("set_hash", (reset_hash, pw, cb) => {
		if (db_login == undefined) cb({ err: "NTBS: Liste des utilisateurs inaccessible" });
		else {
			db_login.run("UPDATE users SET hash=?,reset_hash=NULL WHERE reset_hash=?", [pw == "" ? "NULL" : md5(pw), reset_hash], function (err) {
				if (err) cb({ err: err.message });
				else if (this.changes != 1) cb({ err: "Lien expiré" });
				else cb("OK");
			});
		}
	});

	socket.on("get_user", (id, cb) => {
		if (db_login == undefined) cb({ err: "NTBS: Liste des utilisateurs inaccessible" });
		else
			db_login.get("SELECT nom,email,admin FROM users WHERE id=" + id, (err, row) => {
				if (err) cb({ err: err.message });
				else if (row == undefined) cb({ err: "NTBS: Utilisateur effacé" });
				else cb({ nom: row.nom, email: row.email, admin: Boolean(row.admin), has_mp: Boolean(row.hash != undefined) });
			});
	});

	socket.on("is_user", (nom, cb) => {
		if (db_login == undefined) cb("NTBS: Liste des utilisateurs inaccessible");
		else
			db_login.get("SELECT COUNT(*) as cnt FROM USERS WHERE nom LIKE ? OR email LIKE ?", [nom, nom], (err, row) => {
				if (!err && row && row.cnt) cb("OK:" + row.cnt);
				else cb("");
			});
	});

	socket.on("is_dispo", (champ, value, cb) => {
		if (db_login == undefined) cb({ err: "NTBS: Liste des utilisateurs inaccessible" });
		else
			db_login.get("SELECT COUNT(*) as cnt FROM USERS WHERE " + champ + " LIKE ? AND id <> " + session.user.id, [value], (err, row) => {
				if (err) cb({ err: err.message });
				else cb({ dispo: row.cnt == 0 });
			});
	});

	socket.on("updUser", (champ, value, cb) => {
		if (db_login == undefined) cb({ err: "NTBS: Session fermée. Reconnectez vous" });
		else
			db_login.run("UPDATE users SET " + champ + "=? WHERE id=" + session.user.id, [value], (err) => {
				if (err) cb(err.message);
				else cb("OK");
			});
	});

	function PasswordOK(pw, hash) {
		// Pour une petite appli sans gros enjeux de sécurité, le md5 suffit largement.
		// Pour une appli plus secure, utiliser bcrypt (mais install compliqué) ou Crypto
		return (!hash && pw == "") || hash == md5(pw);
	}

	async function ChangeMP(id, pw) {
		db_login.run("UPDATE users SET hash=" + (pw == "" ? "NULL" : "'" + md5(pw) + "'") + " WHERE id=" + id, (err) => {
			return err ? err.message : "OK";
		});
	}

	async function CheckMP(id, pw) {
		db_login.get("SELECT hash FROM users WHERE id=" + id, (err, row) => {
			if (err) return err.message;
			else if (row == undefined) return "Utilisateur introuvable";
			else if (!PasswordOK(pw, row.hash)) return "Mot de passe incorrect";
			else return "OK";
		});
	}

	socket.on("updpwd", async (old_pw, new_pw, cb) => {
		let r = await CheckMP(session.user.id, old_pw);
		if (r != "OK") cb(r);
		else ChangeMP(id, new_pw).then((r) => cb(r));
	});
}); // fin socket.io

//*******************
//    GET Routes
//*******************

app.get("/login", (req, res) => {
	req.session.user = undefined;
	res.render("login.html");
});

app.get("/", checkAuthenticated, (req, res) => {
	res.render("index.html");
});

app.get("/index", checkAuthenticated, (req, res) => {
	res.render("index.html");
});

app.get("/user", checkAuthenticated, (req, res) => {
	res.render("user.html");
});

app.get("/reset", (req, res) => {
	res.render("resetpw.html");
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

function checkAuthenticated(req, res, next) {
	//console.log("checkAuthenticated", app_config.need_login, req.sesssion);
	if (app_config.need_login == false) next();
	else if (req.session != undefined && req.session.user != undefined) {
		//console.log(req.session.user.nom);
		next();
	} else {
		res.redirect("/login");
		//console.log("Echec auth");
	}
}

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

if (app_config.https_port != undefined && app_config.https_port > 0 && app_config.ssl_dir != undefined && fs.existsSync(app_config.ssl_dir))
	try {
		// Certificate
		const privateKey = fs.readFileSync(app_config.ssl_dir + "privkey.pem", "utf8");
		const certificate = fs.readFileSync(app_config.ssl_dir + "cert.pem", "utf8");
		const ca = fs.readFileSync(app_config.ssl_dir + "chain.pem", "utf8");

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
	} catch (e) {
		console.error(e.message);
	}

// lancer le navigateur par défaut sur la page par défaut. Le séparateur de dossier est différent sous Windows
if (dir_sep != "/")
	child_process.exec("start http://localhost:" + app_config.http_port, (error, stdout, stderr) => {
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
			db.lastID = this.lastID;
			db.changes = this.changes;
			return resolve(row);
		});
	});
}

async function MakeSQLfile(db, path, verbose = true) {
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
	} else if (verbose) console.log(path + ": fichier manquant");
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

async function openBase(path, sql = "bridge.sql") {
	let db = new sqlite3.Database(path);
	let version = (await getVersion(db)) || (await MakeSQLfile(db, sql));
	//console.log("openBase", nom, version);
	if (!version) return Promise.reject(new Error("Pas de VERSION_BASE")); // exit
	else {
		let row = await db_get(db, "SELECT paramValue FROM parametres WHERE paramName='NATURE_BASE'");
		if (version) while (await MakeSQLfile(db, row.paramValue.toLowerCase() + version + "vers" + (version + 1) + ".sql", false)) version++;
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
			while (await MakeSQLfile(db, nature + version + "vers" + (version + 1) + ".sql", false)) version++;
			ok = true;
		}
	}
	db.close();
	return ok;
}
//******************
