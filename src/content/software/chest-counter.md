---
name: Chest Counter
tagline: Compte les coffres que tu ouvres dans Fortnite, partie par partie, à partir des replays déjà sur ton PC.
order: 0
newUntil: 2026-12-10
repo: Palawizard/chest-counter
color: amber
category: UtilitiesApplication
languages: ['fr', 'en']
shareCard: 3
icon: ../../assets/software/chest-counter/icon.svg
screenshots:
  - src: ../../assets/software/chest-counter/window-light.png
    alt: "La fenêtre de Chest Counter en clair, avec des données d’exemple : 3 119 coffres au total, dont 2 748 lus dans les replays et 371 estimés, et 33 coffres dans la partie d’avant."
  - src: ../../assets/software/chest-counter/window-dark.png
    alt: "La même fenêtre en sombre : elle suit le thème de Windows."
kind: windows
installerPattern: '^Palawi\.ChestCounter-win-Setup\.exe$'
unsignedInstaller: true
requirements:
  - label: Windows 10 ou 11, 64 bits
  - label: Microsoft Edge WebView2, déjà inclus dans Windows 11
    url: https://developer.microsoft.com/microsoft-edge/webview2/
  - label: Les replays activés dans Fortnite (réglages, section Replays)
---

## Ce qui est compté

Chaque coffre que tu ouvres toi-même : normal, rare, enterré, relique et avis de recherche, ainsi que les types de coffres ajoutés par les mises à jour du jeu. Un coffre qui se remplit à nouveau et que tu rouvres compte une deuxième fois ; un coffre que tu revois sans le rouvrir ne compte pas. Les caisses de munitions et les glacières ne comptent pas.

## Après chaque partie

Sous le grand nombre, tu vois ta moyenne par partie : le total estimé divisé par toutes tes parties. « Partie d’avant » donne les coffres de ta dernière partie, ouverts plus cassés estimés, l’heure à laquelle elle a fini, tes coffres du jour avec ta moyenne du jour, et ta meilleure partie. « Voir les parties » liste chaque partie comptée avec le même total et ses coffres ouverts par type. Une notification Windows te dit aussi combien de coffres chaque partie a ajoutés ; tu peux la couper dans les réglages.

## Pendant le jeu et en stream

Le bouton en haut à droite de la fenêtre ouvre les réglages :

- **Overlay pendant Fortnite** : le total et la partie d’avant par-dessus le jeu, en plein écran comme en fenêtré. Tes clics passent au travers. Ctrl+Maj+O le cache ou l’affiche, Ctrl+Maj+L te laisse le déplacer puis le fixe. Les boutons « Overlay » et « Déplacer » en haut de la fenêtre font la même chose.
- **Page pour OBS** : une adresse comme `http://127.0.0.1:28470/`, à ajouter comme source Navigateur dans OBS. La page est transparente et se met à jour toutes les quelques secondes.
- **S’ouvrir avec Fortnite** : un petit processus démarre avec Windows, attend sans rien faire et ouvre Chest Counter près de l’horloge quand Fortnite se lance.

Fermer la fenêtre laisse Chest Counter tourner près de l’horloge, pour que l’overlay, la page OBS et les notifications continuent. Pour le quitter, fais un clic droit sur son icône près de l’horloge, puis « Quitter ».

## Les limites

- Fortnite garde environ 100 replays. Une partie dont le replay est supprimé avant que l’app le lise ne peut être qu’estimée : ouvre Chest Counter au moins une fois toutes les 100 parties.
- Les replays ne disent pas qui a cassé un coffre. Un coffre détruit avec son butin compte pour toi si tu étais le joueur le plus proche, à moins de 10 m. En véhicule, ta position n’est pas suivie : ces coffres comptent pour 0,7. Cette part reste toujours dans l’estimation.
- Les coffres du détecteur de reliques ne sont pas comptés.
- Une partie coupée par un plantage laisse un replay inachevé : elle est affichée à part et ne peut pas être comptée. Une partie quittée depuis le menu est comptée normalement.
- Tous les modes de jeu présents dans le dossier des replays sont comptés.

## Si tu avais déjà une version 2.2 ou plus ancienne

La 2.3 compte plus juste. Avant, un coffre ouvert, puis revu plus tard dans la partie, était souvent compté une deuxième fois : sur 99 parties de test, l’ancien compte était environ 25 % trop haut. Après la mise à jour, « Lu dans les replays » baisse donc, c’est normal. Tes replays encore sur le PC sont relus une fois, et les parties comptées par une ancienne version dont le replay a disparu passent dans « Parties sans replay », où elles sont estimées. La fenêtre affiche une fois les chiffres d’avant et d’après.

## Tes données

Chest Counter lit seulement ton dossier de replays, sans jamais le modifier. Pas de compte, pas de connexion à Epic ni aux sites de stats : tes replays restent sur ton PC. L’app ne se connecte à internet que pour chercher ses mises à jour sur GitHub. La page pour OBS, si tu l’actives, n’est accessible que depuis ton PC. « S’ouvrir avec Fortnite » ajoute une entrée de démarrage pour ton compte Windows seulement, sans droits d’administrateur, et la désinstallation la retire.

Chest Counter n’est ni affilié à Epic Games ni approuvé par Epic Games. Fortnite est une marque d’Epic Games, Inc.
