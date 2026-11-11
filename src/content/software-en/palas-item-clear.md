---
tagline: Clears items lying on the ground to reduce lag on your server, with warnings and a recovery bin.
screenshotAlts:
  - "The recovery bin: a chest where you take back the items that were removed."
  - "Colored warnings in the chat before each clear, then the number of items removed."
---

## What it does

Pala's Item Clear regularly removes the items lying on the ground on your Minecraft server, to reduce lag.

- By default it clears every 5 minutes, and warns in the chat 60, 30 and 5 seconds before.
- Removed items can be recovered for 2 minutes with the /palasitemclear bin command.
- You can protect items, worlds, or the items players drop.
- The /palasitemclear commands need permission level 2 (operator).
- It works with Forge, Fabric and NeoForge, from Minecraft 1.20.1 to 26.2.

## Install

1. Choose your server’s loader and Minecraft version, then download the file.
2. Put the file in the server’s mods folder.
3. With Fabric, also install Fabric API. On 1.20.1 with Forge or Fabric, also install Architectury API. Their download buttons show up under Download once you have made your choice.
4. Start the server once: it creates the settings file config/palasitemclear.json.

After editing that file, run /palasitemclear reload. Chat messages are in English by default, and you can change all of them.
