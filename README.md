# Hollow House

Open `index.html` in a modern browser to play. No install or build is needed.

## GitHub Codespaces (Bash/Linux)

Push this project, including `.devcontainer`, to your GitHub repository, then choose **Code → Codespaces → Create codespace**. The container uses Bash, runs the game checks, and starts `python3 -m http.server 8000` automatically. Port 8000 is forwarded and configured to open in your browser. You can also open the **Ports** tab and select **Open in Browser** for port 8000.

Run all checks manually:

```bash
bash scripts/check.sh
```

If the server isn't running:

```bash
python3 -m http.server 8000
```

Keep that terminal open. The forwarded address is `https://YOUR-CODESPACE-NAME-8000.app.github.dev`; use the actual address shown in the Ports tab. Port access stays private by default.

- Explore in a textured first-person 3D view, with a flashlight, depth shading, and a local map.
- WASD moves relative to where you face (A/D strafe). Q/E or left/right arrows turn; up/down arrows walk forward/backward. Click the game for mouse look. Escape releases the mouse and pauses. Hold Shift to sprint, and press Space to pause.
- Collect every gold relic, then reach the green exit at the far corner of the maze.
- Walls block the Hollow’s sight. It patrols, chases when it sees you, and searches your last known position. Nearby sprinting attracts it.
- Turn Sound on to hear a double-thump heartbeat when the Hollow is nearby. It becomes louder and faster as the monster approaches, even through walls, and stops when you pause or mute sound.
- Your footsteps combine a boot impact and a gritty floor scuff, alternating slightly left and right. Steps follow actual movement; sprinting makes them quicker and heavier. Standing still, pushing against a wall, pausing, or muting stops them.
- Each cleared floor increases enemy speed and perception. Relic counts and maze sizes also increase at intervals.
- Open Stages to choose a level. Stage 1 is available immediately; completing it unlocks Stage 2, and so on. Completed stages can be replayed. Each unfinished stage keeps its own saved run when you switch stages.
- When the Hollow catches you, its mask lunges into view with a brief jumpscare and a synthesized sound sting (when sound effects are enabled).
- Settings has separate toggles for sound effects and eerie background music, plus Save & return home. Music begins after your first interaction and continues in menus. Preferences are saved; music is enabled by default.
- Customize your survivor in the sidebar. Progress, collected relics, your current position, and your character save automatically in this browser. Use Save & pause before leaving.
- Being caught restarts the current floor with a new maze; cleared floors remain saved.
- Being caught clears only the caught stage’s run; other saved stages and unlocks are preserved.
- Touch direction controls appear on smaller screens. Drag across the game to look around.

Browser storage must be enabled to save. Saves stay in the same browser and page location. The game works offline; fonts fall back to system fonts if unavailable.
