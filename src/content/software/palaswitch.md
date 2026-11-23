---
name: palaswitch
tagline: Change le profil de ta souris Logitech d’un clic ou d’un raccourci clavier, sans ouvrir G HUB.
order: 7
newUntil: 2026-12-23
repo: Palawizard/palaswitch
color: tangerine
category: UtilitiesApplication
languages: ['fr', 'en']
shareCard: 1
icon: ../../assets/software/palaswitch/icon.svg
screenshots:
  - src: ../../assets/software/palaswitch/settings-window.png
    alt: "Les réglages de palaswitch : la souris G502 X PLUS et son profil actif, puis un nom et un raccourci clavier pour chaque profil."
  - src: ../../assets/software/palaswitch/tray-menu.png
    alt: "Le menu de palaswitch ouvert au-dessus de son icône près de l’horloge : trois profils, avec une coche sur le profil actif."
kind: windows
installerPattern: '^palaswitch-win-Setup\.exe$'
unsignedInstaller: true
requirements:
  - label: Windows 10 ou 11
  - label: Une souris de jeu Logitech qui garde ses profils dans sa mémoire
---

## Ce que ça fait

palaswitch change le profil de ta souris de jeu Logitech sans ouvrir G HUB : un clic dans son menu ou un raccourci clavier suffit.

- Il reste près de l’horloge, dans la zone de notification. Son icône montre le numéro du profil actif, ou une souris barrée quand aucune souris ne répond.
- Un clic sur l’icône ouvre le menu : tes profils, avec une coche sur le profil actif. Choisis-en un pour l’activer.
- Dans les réglages, tu donnes un nom à chaque profil, qui remplace « Profil 1 » dans le menu, et un raccourci clavier, par exemple Ctrl+Alt+F1. Les raccourcis marchent aussi dans les jeux en plein écran.
- « Lancer avec Windows » le démarre tout seul à l’ouverture de ta session, directement près de l’horloge.
- Il ne fait que choisir le profil actif : les boutons, le DPI, l’éclairage et les macros se règlent toujours dans G HUB ou Onboard Memory Manager.

## Installer

1. Télécharge le fichier avec le bouton Télécharger, puis ouvre-le.
2. L’installation se fait pour ton compte Windows, sans droits d’administrateur, puis palaswitch démarre. Une notification te dit où trouver son icône.
3. Si Windows range l’icône derrière la flèche ^ de la barre des tâches, fais-la glisser sur la barre pour la garder en vue.

## Bon à savoir

- Ferme G HUB et Onboard Memory Manager pendant que palaswitch tourne : ils parlent à la souris par le même canal.
- Une souris sans fil qui n’a pas bougé depuis quelques minutes se met en veille et ne répond plus : bouge-la, puis réessaie.
- Testé avec une G502 X PLUS, avec le câble et avec le récepteur sans fil. Les autres souris Logitech qui gardent leurs profils dans leur mémoire devraient marcher, mais aucune n’a encore été essayée.
- Les raccourcis ne marchent pas dans un jeu lancé en administrateur.
- Il se met à jour tout seul : une fois par jour, il regarde s’il existe une nouvelle version et te la propose dans son menu. C’est le seul moment où il va sur internet.
- L’interface suit la langue de Windows : français ou anglais.
- Pour le désinstaller : Paramètres, Applications, Applications installées. Tes réglages restent dans `%APPDATA%\palaswitch` ; supprime ce dossier pour les effacer aussi.
