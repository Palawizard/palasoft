---
name: Pala's Item Clear
tagline: Nettoie les objets au sol pour réduire le lag de ton serveur, avec des avertissements et une poubelle de récupération.
order: 6
repo: Palawizard/PalasItemClear
color: emerald
category: GameApplication
icon: ../../assets/software/palas-item-clear/icon.svg
screenshots:
  - src: ../../assets/software/palas-item-clear/recovery-bin.png
    alt: "La poubelle de récupération : un coffre où tu reprends les objets retirés."
  - src: ../../assets/software/palas-item-clear/chat-warnings.png
    alt: "Les avertissements en couleur dans le chat avant chaque nettoyage, puis le nombre d’objets retirés."
kind: minecraft-mod
versionMatrix: versions/version-matrix.json
modrinth: https://modrinth.com/mod/palas-item-clear
curseforge: https://www.curseforge.com/minecraft/mc-mods/palas-item-clear
---

## Ce que ça fait

Pala's Item Clear retire régulièrement les objets qui traînent au sol sur ton serveur Minecraft, pour réduire le lag.

- Au départ, il nettoie toutes les 5 minutes, et prévient dans le chat 60, 30 et 5 secondes avant.
- Les objets retirés restent récupérables pendant 2 minutes avec la commande /palasitemclear bin.
- Tu peux protéger des objets, des mondes ou les objets jetés par les joueurs.
- Les commandes /palasitemclear demandent le niveau de permission 2 (opérateur).
- Il marche avec Forge, Fabric et NeoForge, de Minecraft 1.20.1 à 26.2.

## Installer

1. Choisis le loader et la version de Minecraft de ton serveur, puis télécharge le fichier.
2. Mets le fichier dans le dossier mods du serveur.
3. Avec Fabric, installe aussi Fabric API. En 1.20.1 avec Forge ou Fabric, installe aussi Architectury API.
4. Démarre le serveur une fois : il crée le fichier de réglages config/palasitemclear.json.

Après avoir modifié ce fichier, lance /palasitemclear reload. Les messages du chat sont en anglais au départ, et tu peux tous les changer.
