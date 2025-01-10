# Cahier de Bridge

## Introduction

![Vue générale en mode lecture](./doc/general.png)
J'ai écrit ce logiciel Open-source suite à une demande de ma sœur qui enseigne le bridge à des débutants. Elle utilise un cahier pour noter les donnes qu'elle commente avec ses élèves et passe beaucoup de temps à transcrire ses notes manuscrites en support de cours.
J'ai donc créé cette application pour qu'elle puisse:

1. Transcrire au propre ses notes
2. Les sauvegarder
3. Les imprimer
4. Et même éventuellement les partager en ligne avec ses élèves.

A la date de Janvier 2025, l'application est fonctionnelle et utilisable en mode mono-utilisateur. La roadmap est la suivante:

-   [x] Editeur de mains de bridge
-   [x] Classement dans un arbre de sélection
-   [x] Editeur de l'arborescence de tri
-   [x] Impression des mains
-   [x] Sauvegarde de mains au format SQL
-   [x] Sauvegarde de la base de donnée
-   [x] Mise en ligne sur Github et npm
-   [ ] Fichiers d'aide (en cours..)
-   [ ] Restauration de la base
-   [ ] Contrôle d'accès multi-utilisateurs
-   [ ] Undo-Redo (Possibilité d'annuler une action)
-   [ ] Tutoriels vidéos

## Description de l'interface

Après [installation](./install.md) du logiciel vous vous retrouvez devant l'écran ci-dessus.

Vous remarquez en haut une barre de menu
![Barres des menus](./doc/menus.png)
| Bouton | Usage |
|:-:|---|
|![Barres des menus](./images/arrow_d.png)| ouvrir et fermer l'arbre de navigation |
|![Barres des menus](./images/dossier.png)| Gérer les jeux |
|![Accès éditeur](./images/Unlock.png.png)| **IMPORTANT:** Bascule entre le mode 'Édition' et le mode 'Consultation' |
|![Imprimer](./images/print_30px.png)| Imprimer la main affichée, ou les mains sélectionnées dans l'arbre par ctrl-clic |
|![Sauver](./images/save_30px.png)| Sauvegarder les modifications |

A gauche un arbre de navigation qui permet de classer les jeux et rechercher une ou plusieurs donnes
![Arbre](./doc/arbre.png)
et au milieu une zone d'affichage qui permet de voir les données éventuellement de les éditer les modifier
![Zone de saisie](./doc/saisie.png)

## Interactions en mode consultation ![Mode consultation](./images/Lock.png)

-   Cliquez dans la barre de recherche pour sélectionner un jeu par son nom ou par son contenu

-   Click dans l'arbre pour ouvrir/fermer un dossier, pour ouvrir un jeu

-   ctrl-click dans l'arbre pour sélectionner plusieurs jeux avant de les imprimer

-   Cliquez sur l'icône ![Imprimer](./images/print_30px.png) pour imprimer la donne

## Interactions en mode édition ![Mode édition](./images/Unlock.png)

En plus des actions ci-dessus, vous pouvez:

### Dans la zone centrale (édition des jeux)

-   Cliquer directement sur une distribution, un commentaire, le titre de jeu, pour les modifier. Une fine bordure grise encadre les contenus éditables.
-   Dans la zone des enchères, vous pouvez utiliser
    -   P C K T comme raccourcis pour Pique Coeur Carreau Trèfle.
    -   X pour 'Contre'
    -   XX pour 'Surcontre'
    -   Le signe '-' pour 'Passe'

Les boutons ![Boutons](./doc/boutons.png) permettent de copier dans le presse-papier les caractères **♠ ♥ ♦ ♣** pour ensuite, avec ctrl-v, les coller dans votre texte.

**N'oubliez pas de sauvegarder vos modifications.**

### Dans la zone de tri à gauche (édition de l'arbre)

Les modifications se font ensentiellement par Glisser-Lâcher ('Drag & Drop') avec la souris:

-   Faire glisser l'image ![Arborescence](./images/subtree.png) sur un dossier pour créer un sous-dossier

-   Faire glisser l'image ![Arborescence](./images/subtree.png) sous les dossier, dans la zone 'Non-classés' pour créer un dossier

-   Faire glisser un dossier ou un sous-dossier VERS l'image ![Poubelle](./images/Trash.png) pour effacer un dossier. **CECI N'EFFACE PAS LE CONTENU DU DOSSIER**. Les jeux contenus dans le dossier effacé sont déplacés vers son parent ou vers la zone 'Non-classés'

-   Faire glisser un jeu vers l'image ![Poubelle](./images/Trash.png) **EFFACE CE JEU**. Cette opération est irréversible. Un mécanisme 'Undo-redo' est prévu dans la roadmap.

-   Cliquez dans le nom du dossier pour le modifier

-   Pour déplacer un jeu dans un dossier ou le remettre en 'Non-classé', faire glisser son nom à l'endroit choisi.

-   Pour placer un jeu dans plusieurs dossier, appuyez sur la touche MAJ ('Shift'), et le faire glisser à l'endroit désiré pour la copie.

-   NOTE: Pour modifier le nom d'un jeu, cliquez dans le titre en haut de la zone de saisie.
