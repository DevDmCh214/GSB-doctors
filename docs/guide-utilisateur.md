# Guide Utilisateur - GSB Doctors

## Sommaire

1. [Connexion](#connexion)
2. [Inscription](#inscription)
3. [Tableau de bord (Dashboard)](#tableau-de-bord)
4. [Liste des medecins](#liste-des-medecins)
5. [Fiche d'un medecin](#fiche-dun-medecin)
6. [Modifier un medecin](#modifier-un-medecin)
7. [Supprimer un medecin](#supprimer-un-medecin)
8. [Creer un rapport de visite](#creer-un-rapport-de-visite)
9. [Consulter un rapport](#consulter-un-rapport)
10. [Modifier un rapport](#modifier-un-rapport)
11. [Supprimer un rapport](#supprimer-un-rapport)
12. [Deconnexion](#deconnexion)

---

## Connexion

1. Ouvrir l'application dans le navigateur (`http://localhost:4200`).
2. Si vous n'etes pas connecte, vous etes redirige vers la page **Connexion**.
3. Saisir votre **Pseudo** et votre **Mot de passe**.
4. Cliquer sur **Se connecter**.
5. En cas d'erreur, un message rouge s'affiche sous le formulaire.

---

## Inscription

1. Depuis la page de connexion, cliquer sur **inscription** dans la barre de navigation.
2. Remplir les champs :
   - **Nom** et **Prenom** (obligatoires)
   - **Pseudo** (obligatoire, doit etre unique)
   - **Mot de passe** (obligatoire, minimum 4 caracteres)
   - **Adresse** (optionnel)
   - **Code postal** (optionnel, doit contenir exactement 5 chiffres)
   - **Ville** (optionnel)
   - **Date d'embauche** (optionnel)
3. Cliquer sur **Valider**.
4. Vous etes automatiquement connecte et redirige vers le tableau de bord.

---

## Tableau de bord

Le tableau de bord est la page d'accueil apres connexion. Il est compose de deux panneaux :

### Panneau gauche - Medecins suivis

- Affiche la liste des medecins pour lesquels vous avez au moins un rapport.
- Chaque ligne indique le nom du medecin et le nombre de rapports.
- Utilisez la barre de **recherche** pour filtrer par nom ou prenom.
- Cliquer sur un medecin pour ouvrir sa fiche.

### Panneau droit - Mes rapports

- Affiche tous vos rapports de visite.
- **Rechercher** : tapez dans la barre de recherche pour filtrer par nom du medecin, motif, ou **date** (format `jj/mm/aaaa`, ex: `02/10` affichera les rapports du 2 octobre).
- **Trier** : cliquer sur les en-tetes **date**, **nom/prenom** ou **motif** pour trier par ordre croissant/decroissant.
- Cliquer sur le bouton **i** d'un rapport pour le consulter.

---

## Liste des medecins

1. Cliquer sur **liste de medecins** dans la barre de navigation.
2. Les medecins sont affiches sous forme de cartes (grille de 4 colonnes).
3. Chaque carte montre : nom, specialite, adresse et telephone.
4. Utilisez la **barre de recherche** en haut pour filtrer par nom ou prenom.
5. Le nombre total de medecins trouves est affiche sous la barre de recherche.
6. Si la liste depasse 20 resultats, une **pagination** apparait en bas de la page.
7. Cliquer sur une carte pour ouvrir la fiche du medecin.

---

## Fiche d'un medecin

La fiche s'ouvre dans une fenetre modale par-dessus la liste des medecins.

Elle contient :
- **Nom et prenom** du medecin, ainsi que sa specialite.
- **Adresse** et **telephone**.
- La liste de vos rapports pour ce medecin (triables par date ou motif).
- Le nombre total de rapports.
- Un bouton **i** sur chaque rapport pour le consulter.
- Un bouton **nouveau rapport** pour creer un nouveau rapport de visite.

Pour fermer la fiche, cliquer sur **x** en haut a droite ou cliquer en dehors de la fenetre.

---

## Modifier un medecin

1. Ouvrir la fiche d'un medecin.
2. Cliquer sur l'icone **crayon** en haut a gauche de la fenetre.
3. La fiche passe en mode edition : les champs **adresse** et **telephone** deviennent modifiables.
4. Modifier les champs souhaites :
   - **Adresse** : obligatoire, 80 caracteres maximum.
   - **Telephone** : optionnel, 15 caracteres maximum, uniquement chiffres, espaces, `+`, `-`, `.`, `()`.
5. Cliquer sur **OK** pour enregistrer.
6. Pour annuler, cliquer a nouveau sur l'icone crayon.

---

## Supprimer un medecin

1. Ouvrir la fiche d'un medecin et passer en mode edition (icone crayon).
2. Cliquer sur le bouton **supprimer** en bas a gauche.
3. Une fenetre de confirmation apparait :
   - Titre : **"Voulez-vous supprimer ce medecin ?"**
   - Message : **"Toutes ces donnes et rapports seront perdus."**
4. Cliquer sur **Oui** pour confirmer la suppression. Le medecin et tous ses rapports seront definitivement supprimes.
5. Cliquer sur **Non** pour annuler et revenir a la fiche.

---

## Creer un rapport de visite

1. Ouvrir la fiche d'un medecin.
2. Cliquer sur **nouveau rapport**.
3. Remplir le formulaire :
   - **Date** (obligatoire) : selectionner une date via le calendrier.
   - **Motif** (obligatoire, 100 caracteres max) : saisir la raison de la visite.
   - **Bilan** (obligatoire, 100 caracteres max) : saisir le compte-rendu de la visite.
4. **Ajouter des echantillons** (medicaments offerts) :
   - Taper le nom d'un medicament dans la barre de recherche en bas du formulaire.
   - Dans les resultats, cliquer sur **+** pour ajouter un medicament a la liste.
   - Cliquer sur **i** pour voir les details du medicament (composition, effets, contre-indications).
   - Le panneau a droite affiche les echantillons selectionnes avec leur quantite.
   - Utiliser les boutons **+** / **-** pour ajuster la quantite de chaque echantillon.
   - Reduire la quantite en dessous de 1 retire le medicament de la liste.
5. Cliquer sur **sauvegarder**.

> Le compteur d'echantillons affiche le **nombre total d'unites** offertes (somme des quantites), pas le nombre de medicaments differents.

---

## Consulter un rapport

1. Depuis le **tableau de bord** : cliquer sur le bouton **i** d'un rapport dans la liste.
2. Depuis la **fiche medecin** : cliquer sur le bouton **i** d'un rapport.
3. La page de detail affiche :
   - Nom du medecin et sa specialite.
   - **Date** et **motif** de la visite.
   - **Bilan** de la visite.
   - Liste des **echantillons offerts** avec le nom du medicament, la famille, et la quantite (ex: `x3`).
   - Bouton **i** sur chaque echantillon pour voir les details du medicament.
4. Pour modifier, cliquer sur l'icone **crayon** en haut a gauche.
5. Pour revenir en arriere, cliquer sur **x** en haut a droite.

---

## Modifier un rapport

1. Ouvrir un rapport (voir [Consulter un rapport](#consulter-un-rapport)).
2. Cliquer sur l'icone **crayon** en haut a gauche.
3. Le formulaire s'ouvre pre-rempli avec les donnees actuelles.
4. Modifier les champs souhaites (date, motif, bilan, echantillons).
5. Cliquer sur **sauvegarder** pour enregistrer les modifications.
6. Pour quitter sans sauvegarder, cliquer sur **x** en haut a droite.

---

## Supprimer un rapport

Un rapport peut etre supprime depuis deux endroits :

### Depuis la page de consultation
1. Ouvrir le rapport.
2. Cliquer sur **supprimer**.
3. Confirmer dans la fenetre de confirmation en cliquant sur **Supprimer**.

### Depuis le mode edition
1. Ouvrir le rapport et cliquer sur le crayon pour passer en mode edition.
2. Cliquer sur **supprimer**.
3. Confirmer dans la fenetre de confirmation en cliquant sur **Supprimer**.

---

## Deconnexion

1. Cliquer sur **deconnexion** dans la barre de navigation (en haut a droite).
2. Vous etes redirige vers la page de connexion.

---

## Barre de navigation

La barre de navigation est presente sur toutes les pages et contient :
- **dashboard** : acces au tableau de bord.
- **liste de medecins** : acces a la liste des medecins.
- **GSB-doctors** : titre de l'application (au centre).
- **Salut, [Prenom] !** : message de bienvenue (quand connecte).
- **deconnexion** : bouton de deconnexion (quand connecte).
- **connexion** / **inscription** : liens d'acces (quand non connecte).
