# Nos courses

Budget courses et listes partagées, avec lecture des tickets par Google Cloud Vision.
Page statique (`index.html`) + fonctions Vercel (`api/`) + base Neon.

## Variables d'environnement (Vercel → Settings → Environment Variables)

| Nom | Valeur |
|---|---|
| `DATABASE_URL` | Chaîne de connexion Neon (projet perso, pas celui d'Aid'Aux) |
| `APP_PASSWORD` | Le mot de passe que vous taperez tous les deux |
| `APP_SECRET` | Une longue suite de caractères au hasard (sert à signer la connexion) |
| `GOOGLE_VISION_API_KEY` | Clé API Google Cloud avec Cloud Vision API activée |

Les tables se créent toutes seules au premier lancement.
Les scans sont bloqués à 950 par mois pour rester dans la tranche gratuite de Google Vision.
