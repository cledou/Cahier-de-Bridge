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
