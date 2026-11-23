# ROUND ZERO · MMA WORLD — alpha 0.1

Playable mobile-first MMA career / gym simulator created for DashByte.

## Quick start

Open \`index.html\` in a modern browser (Android Chrome, desktop Chrome, Edge, Firefox). The entire game is a single offline-capable file. It has no network dependencies.

Source: https://github.com/maxteilor55-sudo/dashbyte-studio/blob/main/mma-world/index.html

GitHub itself displays the source rather than executing HTML. Use **Download raw file** and open it in your mobile browser, or upload the single \`index.html\` file to a separate HTTPS directory such as \`/mma-world/\` on an existing host. This project is intentionally isolated from the existing DashByte and customer websites.

### Telegram Mini App

The client includes optional \`window.Telegram.WebApp.ready()\` and \`expand()\` support, but is **not yet connected to a bot menu button or server-side persistence**. To launch it in Telegram, deploy over HTTPS and configure the exact URL in Telegram's bot web app settings. Avoid putting secrets inside the public file.

## Game modes

- **COACH**: manage a club in Perm; choose from 3 starting fighters; develop their stats; recruit athletes from the regional pool; upgrade gym, physiotherapy, and media departments; schedule regional fights; send instructions during a fight.
- **FIGHTER**: create a fighter (default Maxim Sobyanin); train and build your fight record; choose opponents; control tactical fight decisions.

## Features working in this alpha

- Autonomous regional fighter pool with simulated fights and changing win/loss records.
- Three weight classes (70 / 77 / 84 kg).
- Cash balance, upkeep, sponsorship payments, training budgets, fanbase, gym reputation.
- Interactive 5-step training drills in striking, grappling, defense and cardio.
- Energy, fight shape, injury, morale, fighter skills.
- Two-week pre-fight camp, choice of opponents, home/away venue.
- Canvas-rendered animated 2D cage fights, 3 rounds, health, stamina, AI choices, punches, kicks, takedowns, ground-and-pound, submissions, decisions.
- Local fan effects: arena audience estimate depends on venue, hype and regional popularity.
- Generated fictional news posts / comments / simulated highlights that reflect the actual career events.
- Auto-save to localStorage, repeatable gameplay, new-game reset with confirmation.
- Touch-friendly UI, works without installing dependencies.

## Important scope limitations

This is a **prototype, not a 3D fighting game**. There is no player movement in real time, live multiplayer, professional voice commentary, real UFC fighters, EA assets, official licenses, video highlights, online accounts or cloud saves. Fight animations are 2D silhouettes; fights are turn-based tactical exchanges. News comments are local procedurally generated text, not external social media or AI API responses. Tournament titles and team rivalries are planned for later versions.

Balance and mobile-device visual compatibility still need real user testing.

## How to play

1. Select fighter or coach and input your name.
2. Open Fighters to choose the active trainee, then Gym to train. The mini-drill asks you to repeat five trainer commands.
3. Select Tournaments and sign a bout; advance two weeks, during which you can train or promote.
4. Start the fight. Choose attack, kick, takedown or defense. In ground position use ground-and-pound, submission, stand-up or defense.
5. Follow results in News, spend rewards on your club, and recruit more athletes as a coach.
6. Save happens automatically in this browser's local storage. Clearing browser/site data removes the save.

## Next milestone

- Real training minigame with dodges and timing; animated player-controlled 2D fighting.
- Persistent regional ranking ladders, title fights and belts.
- More gyms, locations, distinct fighter personalities, dynamic contracts.
- Better stadium assets, audio and presentation.
- Telegram bot launch, online persistence and optional social sharing.

© DashByte concept. Original fictional MMA universe; no UFC or fighter license required.
