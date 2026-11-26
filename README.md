# Lumen – chat en ligne (version à télécharger)

Chat mobile au style « verre liquide » : fond animé, bulles en 3D, salons, indicateur d’écriture et présence.

## Contenu
- `index.html` : la page
- `style.css` : le design
- `app.js` : la logique du chat
- `backend-local.js` : stockage des messages (démo locale)

## Lancer
Ouvrez `index.html` dans un navigateur (de préférence sur téléphone, ou en mode mobile sur ordinateur).
Les polices viennent de Google Fonts : sans connexion, des polices système prennent le relais.

## Important : démo locale
En l’état, les messages restent dans le navigateur et ne sont partagés qu’entre les onglets du même appareil.
Pour discuter à plusieurs en ligne, il faut un serveur.

## Passer en vrai chat en ligne
Remplacez `backend-local.js` par un backend réel (Firebase Firestore, Supabase, etc.) qui fournit, via `window.claude.use(nom)` :
- `"user"` : `me()` renvoie `{id, name}`
- `"db"` : `collection(chemin).orderBy("t","desc").limit(n).onSnapshot(cb)` et `collection(chemin).add(objet)`
  - les documents d’un snapshot ont `id` et `data()` (champs : `text`, `name`, `uid`, `t`)
- `"room"` (facultatif) : `presence(objet)`, `peers()`, `onPeers(cb)` pour les personnes en ligne et « écrit… »

Le reste du code n’a pas besoin de changer. Hébergez ensuite le dossier sur n’importe quel hébergement statique (Netlify, Vercel, GitHub Pages…).
