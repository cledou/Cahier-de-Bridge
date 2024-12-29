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
app.use("/views", express.static("./views/"));
app.use("/js", express.static("./js/"));
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

