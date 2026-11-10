---
name: Chest Counter
tagline: Compte les coffres que tu ouvres dans Fortnite, partie par partie, à partir des replays déjà sur ton PC.
order: 0
newUntil: 2026-12-10
repo: Palawizard/chest-counter
color: amber
category: UtilitiesApplication
icon: ../../assets/software/chest-counter/icon.svg
screenshots:
  - src: ../../assets/software/chest-counter/window-light.png
    alt: "La fenêtre de Chest Counter en clair, avec des données d’exemple : 3 119 coffres au total, dont 2 748 lus dans les replays et 371 estimés."
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

Chaque coffre que tu ouvres toi-même : normal, rare, enterré, relique et avis de recherche. Un coffre qui se remplit à nouveau et que tu rouvres compte une deuxième fois. Les caisses de munitions et les glacières ne comptent pas.

## Les limites

- Fortnite garde environ 100 replays. Une partie dont le replay est supprimé avant que l’app le lise ne peut être qu’estimée : ouvre Chest Counter au moins une fois toutes les 100 parties.
- Les replays ne disent pas qui a cassé un coffre. Un coffre détruit avec son butin compte pour toi si tu étais le joueur le plus proche, à moins de 10 m. En véhicule, ta position n’est pas suivie : ces coffres comptent pour 0,7. Cette part reste toujours dans l’estimation.
- Les coffres du détecteur de reliques ne sont pas comptés.
- Un type de coffre ajouté par une mise à jour du jeu est ignoré jusqu’à la mise à jour de l’app.
- Tous les modes de jeu présents dans le dossier des replays sont comptés.

## Tes données

Chest Counter lit seulement ton dossier de replays, sans jamais le modifier. Pas de compte, pas de connexion à Epic ni aux sites de stats : tes replays restent sur ton PC. L’app ne se connecte à internet que pour chercher ses mises à jour sur GitHub.

Chest Counter n’est ni affilié à Epic Games ni approuvé par Epic Games. Fortnite est une marque d’Epic Games, Inc.
