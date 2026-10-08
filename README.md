# Hollow House

Play online: **https://wrightiv-dotcom.github.io/HideandSeek/**

The GitHub Pages version works without a running terminal or Codespace. Saved progress stays in the browser you use to play.

Open `index.html` in a modern browser to play. No install or build is needed.

The game now uses a WebGL 2 renderer for smooth, lit 3D geometry. Rounded survivor and Slenderman models animate continuously; clothing pockets, backpacks, fingers, pale faces, and glowing eyes have volume. Wall and floor textures use mipmaps, linear filtering, and anisotropic filtering where supported. Raised picture frames, ceiling beams, 3D furniture, contact shadows, rotating faceted relics, flashlight highlights, and distance fog give the maze more depth. Phone controls use a smaller render buffer for responsiveness. The original canvas renderer remains available automatically if WebGL is unavailable or the graphics context is lost.

The main menu fades in over a haunted-house picture with a dripping blood title. Select **Play**, choose **Computer** or **Phone**, choose **Normal mode** or **Psycho mode**, then pick a stage from the haunted door selector. Click through three story screens about traveling through the woods, blacking out, and waking in a maze before entering the stage. Music starts after your first interaction; the title-screen music button and Settings control audio.

The pause menu includes **Back to home**. It saves your run and returns to the haunted title screen; select the same mode and stage to resume your position and collected relics.

Wardrobes and low cabinets are solid 3D shapes with shaded side faces, wooden panels, brass handles, and perspective tops. Approach a wardrobe and press **H** on computer or tap **Hide** on phone. Use the same control to leave. You cannot move or use the flashlight while hidden. Hiding protects you if Slenderman did not see you enter; if he saw you enter while chasing, he can still catch you. Hidden runs can be paused, saved, and resumed.

Wardrobes become fatal after **10 seconds of active play**. Your vision progressively blurs and slowly pulses red after three seconds. A countdown warns you to leave. Pausing freezes the timer; saving preserves elapsed hiding time. Leaving clears the effects and resets the timer for the next entry. The survivor now has fabric folds, stitching, straps, a shaded backpack, and facial highlights; Slenderman has a sculpted pale head, textured suit, collar details, and red eyes.

Wall pictures vary between mazes: Slenderman, spiders, strange objects, a man and his family, a watching eye, and an old chapel. Being caught plays a loud, high-pitched synthesized scream when sound effects are enabled; muting effects stops it.

- **Normal mode** keeps the original survival gameplay, with portraits of Slenderman, recessed closets, wooden wardrobes, and aged wall panels throughout the maze.
- **Psycho mode** starts in blackout darkness. Press **F** or tap **Light** to toggle the flashlight. Blood, cobwebs, brief harmless scares, and positional synthesized screams add to the atmosphere. Sound effects start when entering this mode and can be muted in Settings. Each mode saves its own stages and progress.
- **Phone controls:** drag the joystick to walk or strafe; swipe the scene to look horizontally or vertically. Hold **Hold to run** to sprint, tap **Pause** to stop, and tap **Light** for the flashlight. Portrait and landscape layouts are supported. The header's Controls button switches device controls.
- **Fullscreen** opens the full-screen website. **Exit fullscreen** returns to the original view; unsupported browsers hide this button.

The haunted-house background is stored in `assets/haunted-house.png` and was made with the built-in image generation tool. Prompt: "A terrifying abandoned Victorian haunted house at night, decaying timber, crooked roof, broken windows with faint red light, heavy ground fog, dead trees, moonlit clouds, dark cinematic photographic realism. Landscape title-screen background with room for overlaid title and buttons; no text, logos, or watermark."

## Play locally

In Git Bash, run:

```bash
bash scripts/local.sh
```

Open http://localhost:8000. Keep the terminal open while playing; press Ctrl+C to stop the server. This uses Node.js, requires no extra packages, and serves only the game files on your own computer.

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
- Choose First person or Third person under Your Survivor or Settings, or press V during play. Third person follows behind your customized survivor and pulls forward near walls. Your view choice is saved.
- The survivor and Slenderman have alternating footfalls, bent knees, and swinging arms. Running uses a stronger, quicker stride. Animation follows distance traveled, so pushing against a wall doesn't trigger walking.
- WASD moves relative to where you face (A/D strafe). Q/E or left/right arrows turn; up/down arrows walk forward/backward. Click the game for mouse look. Escape releases the mouse and pauses. Hold Shift to sprint, and press Space to pause.
- Collect every gold relic, then reach the green exit at the far corner of the maze.
- Walls block Slenderman’s sight. It patrols, chases when it sees you, and searches your last known position. Nearby sprinting attracts it.
- Turn Sound on to hear a double-thump heartbeat when Slenderman is nearby. It becomes louder and faster as the shadow approaches, even through walls, and stops when you pause or mute sound.
- Your footsteps combine a boot impact and a gritty floor scuff, alternating slightly left and right. Steps follow actual movement; sprinting makes them quicker and heavier. Standing still, pushing against a wall, pausing, or muting stops them.
- Each cleared floor increases enemy speed and perception. Relic counts and maze sizes also increase at intervals.
- Open Stages to choose a level. Stage 1 is available immediately; completing it unlocks Stage 2, and so on. Completed stages can be replayed. Each unfinished stage keeps its own saved run when you switch stages.
- When Slenderman catches you, his red-eyed face lunges into view with a brief jumpscare and a synthesized sound sting (when sound effects are enabled).
- Settings has separate toggles for sound effects and eerie background music, plus Save & return home. Music begins after your first interaction and continues in menus. Preferences are saved; music is enabled by default.
- Customize your detailed survivor in the sidebar with a female or male character, name, coat color, skin tone, hair, and explorer, quilted, or tactical outfit. Progress, collected relics, your current position, and your character save automatically in this browser. Use Save & pause before leaving.
- Being caught restarts the current floor with a new maze; cleared floors remain saved.
- Being caught clears only the caught stage’s run; other saved stages and unlocks are preserved.
- Touch direction controls appear on smaller screens. Drag across the game to look around.

Browser storage must be enabled to save. Saves stay in the same browser and page location. The game works offline; fonts fall back to system fonts if unavailable.

Slenderman uses a sculpted pale skull, recessed featureless facial shading, procedural skin mottling, tailored wool suit geometry, satin lapels, a white collar and tie, and articulated pale fingers. Cool directional lighting and subtle rim light emphasize the silhouette; Psycho mode retains its flashlight-only darkness. Desktop GPU rendering scales up to 1800 pixels wide, while phones retain the lighter 800-pixel buffer.

The realism pass adds a flashlight depth shadow map with soft filtering, material-driven surface relief and damp floor highlights, full-resolution worn stone tiles, raised corridor skirting and cornices, projecting wardrobe trim and brass handles, and a lit 3D hand-held flashlight. Psycho lighting, phone render resolution, and the canvas fallback remain supported.

Additional realism: an AI-generated photographic plaster texture (assets/wall-plaster.jpg) replaces repetitive bare brick surfaces, with procedural wood and framed art preserved. GPU shading uses roughness-aware microfacet highlights and Fresnel reflection, linear-light material colors, filmic tone mapping, smoother joints and subtle breathing. Desktop flashlight shadows use a 1024-pixel map, with a lighter 512-pixel map on phones. Texture prompt: seamless neglected Victorian olive-gray plaster with peeling ivory wallpaper, fine cracks, mineral detail and damp staining; flat neutral photographic lighting, no text or objects. The procedural wall remains the fallback while the image loads or if loading fails.
