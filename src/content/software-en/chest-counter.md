---
tagline: Counts the chests you open in Fortnite, match by match, from the replays already on your PC.
screenshotAlts:
  - "The Chest Counter window in light mode, with sample data: 3,119 chests in total, 2,748 read from replays and 371 estimated, and 33 chests in the last match."
  - "The same window in dark mode: it follows your Windows theme."
requirements:
  - Windows 10 or 11, 64-bit
  - Microsoft Edge WebView2, already included in Windows 11
  - Replays turned on in Fortnite (settings, Replays section)
---

## What gets counted

Every chest you open yourself: regular, rare, buried, relic and bounty chests, and the chest types added by game updates. A chest that refills and that you open again counts a second time; a chest you only see again doesn’t. Ammo boxes and coolers don’t count.

## After each match

Under the big number, you see your average per match: the estimated total divided by all your matches. “Last match” shows the chests of your latest match, opened plus broken estimated, when it ended, today’s chests with your average for the day, and your best match. “See all matches” lists every counted match with the same total and its opened chests by type. A Windows notification also tells you how many chests each match added; you can turn it off in the settings.

## While you play and stream

The button at the top right of the window opens the settings:

- **Overlay while Fortnite runs**: the total and your last match over the game, in fullscreen or windowed mode. Your clicks go through it. Ctrl+Shift+O hides or shows it, Ctrl+Shift+L lets you move it, then locks it again. The “Overlay” and “Move” buttons at the top of the window do the same.
- **Page for OBS**: an address such as `http://127.0.0.1:28470/`, to add as a Browser source in OBS. The page is transparent and updates every few seconds.
- **Open with Fortnite**: a small process starts with Windows, waits quietly and opens Chest Counter by the clock when Fortnite starts.

Closing the window keeps Chest Counter running by the clock, so the overlay, the OBS page and the notifications keep working. To quit, right-click its icon by the clock, then choose “Quit”.

## The limits

- Fortnite keeps about 100 replays. A match whose replay is deleted before the app reads it can only be estimated: open Chest Counter at least once every 100 matches.
- Replays don’t say who broke a chest. A chest destroyed along with its loot counts for you if you were the closest player, within 10 m. In a vehicle your position isn’t tracked, so those chests count as 0.7. That share always stays in the estimate.
- Chests from the relic detector aren’t counted.
- A match cut short by a crash leaves an unfinished replay: it is shown apart and can’t be counted. A match you quit from the menu is counted normally.
- Every game mode in the replays folder is counted.

## If you already had version 2.2 or older

Version 2.3 counts more accurately. Before, a chest you opened, then saw again later in the match, was often counted a second time: on 99 test matches, the old count was about 25% too high. So “Read from replays” goes down after the update, and that’s expected. Your replays still on the PC are read again once, and matches counted by an older version whose replay is gone move to “Matches without a replay”, where they are estimated. The window shows the numbers before and after, once.

## Your data

Chest Counter only reads your replays folder and never changes it. No account, no connection to Epic or to stats sites: your replays stay on your PC. The app only goes online to look for its updates on GitHub. The OBS page, when you turn it on, can only be reached from your own PC. “Open with Fortnite” adds a startup entry for your Windows account only, without administrator rights, and uninstalling removes it.

Chest Counter is not affiliated with or endorsed by Epic Games. Fortnite is a trademark of Epic Games, Inc.
