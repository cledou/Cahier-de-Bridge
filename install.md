# Installation

Ce logiciel est open source et vous pouvez l'installer sur différents systèmes d'exploitation: Windows, Linux, etc...
Par défaut, il s'installe en mode mono-utilisateur, c'est-à-dire que vous serez la seule personne à utiliser ce logiciel.

La technologie utilisée par cette application est du type Client-Serveur:

-   On installe un programme 'Serveur' qui tourne en permanence sur votre ordinateur ou un serveur dédié sur un réseau (Internet ou local)
-   On utilise un navigateur Web standard (le 'client') comme Chrome, Firefox (ou autres...) pour exécuter les opérations requises: Afficher des donnes, les classer, les imprimer, etc..

Dans le cas le plus simple, et le plus fréquent, les deux processus tournent sur la même machine.

L'installation du logiciel suit toujours les mêmes étapes quelle que soit la plateforme ou la configuration utilisée:

1. Installation du logiciel 'serveur' Node.Js qui va lire et exécuter les scripts constituant l'application.
2. Récupération des sources sur la plate-forme Github ou via un gestionnaire de paquets
3. Pré-compilation des sources sur votre machine ou votre serveur pour obtenir des 'modules' optimisés pour votre matériel.
4. Optionnel: Modifier le fichier de configuration en fonction des fonctionnalités requises (multi-utilisateur, contrôle d'accès, etc..)
5. Lancement du programme 'serveur' sur votre machine.
6. Lancement d'un navigateur internet qui va se connecter au 'serveur' et afficher l'application

Les étapes 1,2 et 3 ne doivent êtres exécutées qu'une fois, lors de l'installation.
L'étape 4 (Configuration) n'est généralement pas nécessaire, ou alors une fois durant l'installation.

Fort heureusement, la plupart des étapes sont assez simple à réaliser.

## Exemple 1: Installation sur une plateforme Windows 10

### Installation de Node.Js et du gestionnaire de paquets NPM (inclu dans Node.JS)

Comme cette étape n'est pas spécifique à mon application, et plutôt que réécrire ce que beaucoup de personnes ont fait avant moi, je vous invite à consulter les nombreux articles sur le sujet.

Par exemple: [Installation de NPM](https://kinsta.com/fr/blog/comment-installer-node-js/)

Lien direct vers le paquet d'installation: [Node.Js et NPM pour machine 32 bits](https://nodejs.org/dist/v22.13.0/node-v22.13.0-x64.msi)

Lien direct vers le paquet d'installation: [Node.Js et NPM pour machine 64 bits](https://nodejs.org/dist/v22.13.0/node-v22.13.0-x86.msi)

Vous trouverez d'autres configurations plus rares sur [le site de Node.JS](https://nodejs.org/fr/download)

### Installation des sources

Allez sur la page Github consacrée à mon application [Cahier de Bridge](https://github.com/cledou/Bridge-virginie)

### Pré-compilation des sources

[Ouvrir un terminal sous Windows 10-11](https://lecrabeinfo.net/ouvrir-et-utiliser-le-terminal-windows-sur-windows-11-10.html)

### Lancement du programme

Dans le terminal, tapez
`node bridge`
Sous Windows, ceci lancera aussi le navigateur Web sur la page d'accueil
[Exemple de lancement du serveur réussi](./doc/lancement.png)

Se connecter par la suite sur la [page locale](http://localhost:3005/) pour ré-ouvrir la page d'accueil

Note: Le port utilisé (3005 par défaut) est défini dans le [fichier de configuration](./config.json)

### Création d'un raccourci vers le bureau

## Exemple 2: Installation sur une plateforme Linux type Debian

### Installation (ou mise à jour) du gestionnaire de paquets

`sudo apt install -y nodejs`

### Installation des sources

`git clone git@github.com:cledou/bridge-notebbok.git`

### Pré-compilation des sources

`sudo rm package-lock.json`
`sudo npm install`

Prendre un café, thé ou autre en attendant le message de fin (6mn sur mon Rockpi4)

### Lancement du programme

`node bridge`

Se connecter ensuite sur la [page locale](http://localhost:3005/)

### installer le serveur comme service du système

`sed 's,$PWD,'"$PWD"/',g' --in-place cahier.service`
`sudo mv cahier.service /etc/systemd/system/`
`sudo systemctl enable cahier.service`
`sudo systemctl daemon-reload`
