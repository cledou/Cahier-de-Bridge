Le fichier config.json présent dans le repertoire d'installation est utilisé pour le paramétrage de l'application. Le paramètre le plus importatnt est celui déterminant si vous êtes seul à utiliser le logiciel, ou si vous partagez les données avec plusieurs utilisateurs. Voici une explication de chaque partie :

## Configuration mono-utilisateur

```json
{
	"need_login": false,
	"http_url": "http://localhost:3005",
	"http_port": 3005,
	"user": "Administrateur",
	"hash": "5f4dcc3b5aa765d61d8327deb882cf99"
}
```

### Explication des éléments

-   **need_login** : Mettre 'false' si vous ne partages pas vos données.
-   **http_url** : L'adresse ou le navigateur internet doit se connecter.
-   **http_port** : Le port sur lequel l'application va écouter une connexion non-sécurisée.
-   **user** : Mettre "Administrateur" dans cette configuration.
-   **hash** : Laissez la valeur par défaut, ou mettez votre propre chaîne hexadécimale (0..9 a..f). Cette chaîne permet de renforcer la sécurité lors de la navigation dans l'application. C'est plus une 'bonne pratique' que réellement utile pour cette application

## Configuration multi-utilisateurs

Cette configuration permet à plusieurs personnes de se connecter au serveur. Elle implique un contrôle d'accès avec mot de passe et bien sûr un mécanisme de récupération du mot de passe par email.
Donc vous devez configurer votre ordinateur/serveur privé pour l'envoi d'email et idéalement la connexion sécurisé via HTTPS.
Le fichier de configuration conporte donc beaucoup plus de lignes:

```json
{
	"need_login": true,
	"mail": {
		"host": "smtp.votre_provider.fr",
		"port": 465,
		"auth": {
			"user": "votre_adresse_mail",
			"pass": "votre_password_boite_mail"
		}
	},
	"http_url": "https://votre_site.fr",
	"http_port": 3005,
	"https_port": 443,
	"ssl_dir": "/etc/ssl/votre_site.fr/",
	"user": "Anonyme",
	"hash": "5f4dcc3b5aa765d61d8327deb882cf99",
	"email_to": "admin@votre_site.fr)"
}
```

Le paramétrage exacte dépend bien sûr de votre configuration. Idéalement, vous devriez utliser un reverse proxy comme nginx pour accéder à votre site.

### Explication des éléments

-   **need_login** : Mettre 'true'. Vous devrez alors passer obligatoirement par l'écran de connexion pour rentrer dans le cahier.
-   **http_url** : L'adresse du serveur.
-   **http_port** : Le port sur lequel le serveur va écouter une connexion non-sécurisée (http), ou bien sur le port sur lequel le reverse proxy va envoyer le trafic.
-   **https_port** : Mettez 0 si vous ne voulez pas utiliser le protocole https, ou si vous utilisez un reverse proxy en amont de l'application pour gérer le protocole https.
-   **ssl_dir** : Dossier dans lequel trouver les certificats de sécurité
    -   privkey.pem (clé privée)
    -   cert.pem (le certificat)
    -   chain.pem (selon les cas).
        Si c'est nginx ou un autre reverse proxy qui gère la connexion https, cette ligne est sans objet et peut-être retirée
-   **user** : Mettre "Anonyme" par défaut. Cette application est livrée avec deux identifiants de connexion:
    -   **Administrateur**: Permet toutes es opérations. Pas de mot de passe par défaut. Mettez un mot de passe dès que l'installation est terminé. -**Anonyme** Permet de créer après inscription sa propre base de donnée, ou bien consulter la base exemple.
-   **email_to** : Adresse mail de l'interlocuteur chargé des problèmes de connexion (mot de passe oublié..). Cet personne doit être un administrateur du site
-   **hash** : Laissez la valeur par défaut, ou mettez votre propre chaîne hexadécimale (0..9 a..f). Cette chaîne permet de renforcer la sécurité lors de la navigation dans l'application. C'est plus une 'bonne pratique' que réellement utile pour cette application
