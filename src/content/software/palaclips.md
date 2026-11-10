---
name: PalaClips
tagline: Enregistre tes meilleurs moments en jeu après coup, avec une piste audio séparée pour chaque logiciel.
order: 1
repo: Palawizard/PalaClips
color: crimson
icon: ../../assets/software/palaclips/icon.svg
screenshots:
  - src: ../../assets/software/palaclips/player.png
    alt: "Le lecteur de PalaClips : la vidéo en haut, puis une ligne par piste audio (mix complet, micro, Discord, jeu)."
  - src: ../../assets/software/palaclips/gallery.png
    alt: "La galerie : tes clips rangés par jour, avec leur aperçu."
  - src: ../../assets/software/palaclips/audio-sources.png
    alt: "La page Audio : une piste par logiciel, avec son niveau sonore en direct."
  - src: ../../assets/software/palaclips/compress.png
    alt: "La compression : tu choisis la taille du fichier, par exemple 20 Mo pour Discord."
  - src: ../../assets/software/palaclips/replay-quality.png
    alt: "Les réglages du replay et de la qualité, avec la taille estimée de tes clips."
  - src: ../../assets/software/palaclips/first-launch.png
    alt: "Le premier lancement : PalaClips te pose ses questions une par une."
kind: windows
installerPattern: '^PalaClips_.+_x64-setup\.exe$'
unsignedInstaller: true
requirements:
  - label: Windows 11 (Windows 10 ne marche pas avec PalaClips)
  - label: Une carte graphique NVIDIA, AMD ou Intel est conseillée. Sans elle, PalaClips marche quand même mais demande plus d’effort au processeur pendant que tu joues.
---

## Ce que ça fait

PalaClips garde en mémoire les derniers instants de ta partie. Un raccourci (Alt+F10 au départ) les enregistre en clip sans quitter le jeu.

- Chaque clip a une piste audio par logiciel : le jeu, Discord, la musique, ton micro. Au montage, tu peux couper la musique ou le vocal sans toucher au son du jeu.
- Il peut aussi enregistrer ton écran (Ctrl+Alt+F9).
- Une galerie te permet de revoir, couper et réduire tes clips, par exemple sous 20 Mo pour les envoyer sur Discord.
- Il n’injecte rien dans les jeux et a été testé avec Fortnite et son anti-triche.
- Pas de compte à créer, et il n’envoie pas de données d’utilisation.
- Il se met à jour tout seul.


## Installer

1. Télécharge le fichier avec le bouton Télécharger, puis ouvre-le.
2. L’installation se fait pour ton compte Windows, sans mot de passe administrateur.
3. Au premier lancement, PalaClips te pose quelques questions une par une (écran, micro, durée du replay, dossier des clips, raccourci). Tu peux les passer : les réglages de départ marchent très bien.

Tes clips sont rangés dans ton dossier Vidéos, sous PalaClips, avec un dossier par jeu.
