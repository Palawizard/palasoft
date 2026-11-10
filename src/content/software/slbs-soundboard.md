---
name: SLB's Soundboard
tagline: Joue des sons dans Discord et en jeu grâce à un micro virtuel, avec des raccourcis clavier.
order: 2
repo: Palawizard/slbs-soundboard
color: magenta
icon: ../../assets/software/slbs-soundboard/icon.png
screenshots:
  - src: ../../assets/software/slbs-soundboard/soundboard.png
    alt: "Ta soundboard : tous tes sons en tuiles, chacun avec son raccourci clavier, et un son en train de jouer."
  - src: ../../assets/software/slbs-soundboard/audio-setup.png
    alt: "La page Audio : tu choisis ton micro et le câble virtuel, puis tu règles le volume de ta voix et de tes sons."
  - src: ../../assets/software/slbs-soundboard/sound-settings.png
    alt: "Les réglages d’un son : son nom, son raccourci, son volume, sa hauteur et sa vitesse."
kind: windows
installerPattern: '^slbs-soundboard_.+_x64\.msi$'
unsignedInstaller: true
requirements:
  - label: VB-CABLE, le câble audio virtuel qui sert de micro
    url: https://vb-audio.com/Cable/
---

## ce que ça fait

SLB's Soundboard mélange ton micro et tes sons, puis envoie le tout dans un câble audio virtuel. Ce câble devient ton micro dans Discord, dans tes jeux et dans les autres logiciels de discussion.

- Tes sons et tes soundboards restent sur ton PC.
- Des raccourcis clavier lancent tes sons, même quand la fenêtre est fermée : le logiciel reste près de l’horloge de Windows.
- Tu entends aussi tes sons en direct, et tu peux régler ce volume ou le couper.
- Il peut se lancer au démarrage de Windows (onglet Réglages).
- Il vérifie les nouvelles versions à chaque démarrage et te propose de les installer.

## installer

1. Installe d’abord VB-CABLE, un câble audio virtuel gratuit de VB-Audio (lien dans « ce qu’il te faut »).
2. Télécharge SLB's Soundboard avec le bouton Télécharger, puis ouvre le fichier pour l’installer.
3. Dans l’onglet Audio du logiciel, choisis ton micro, puis CABLE Input (VB-Audio Virtual Cable) comme câble virtuel.
4. Dans Discord ou dans ton jeu, choisis CABLE Output (VB-Audio Virtual Cable) comme micro.

Le micro marche dès que le logiciel est ouvert : il n’y a rien à démarrer.
