About The Project
Fonts are only the beginning. Creating glyphs that fit neatly in a line is just the surface level of script design. My true passion is crafting writing systems that are so unique they completely defy becoming a font altogether.

Dscriptor is a procedural font generation and layout toolchain built for worldbuilders, conlangers, and 3D artists. It bridges the gap between 2D vector drawing, organic handwriting simulation, and 3D asset integration.

Windows portable exe, no install required

Need to click "run anyways" on Windows.	
If that is unacceptable due to security issues, you can get it from the windows store : http://dscript.org/dscriptor

Try the Web Version: www.dscript.org/dscriptor

Tech Stack
Core: Rust, Tauri, Vite, TypeScript
Frontend: HTML, Vanilla CSS, React (for UI panels)
3D & Graphics: WebGL, Three.jsu

The Toolchain Pipeline
Dscriptor is divided into specialized modules, each serving a distinct purpose in bringing your writing systems to life:

Genesis (Editor): This is where it begins. Get inspired and design foundational glyphs, symbols, and characters, then collect them into your personal character bank.

Codex (Fonts): Take your character bank and turn it into fonts of many styles. You can download raw .ttf font files directly, or pass your library down the workflow.

Scribe (Text): [In Development] The Scribe uses your characters, but not just as a static font. It adds the organic imperfections of true handwriting, ensuring that no two characters ever look the same—even when the same character is repeated.

Stamper: Take the organic text produced by the Scribe and stamp it onto your 3D assets, either as a floating decal or baked directly into the model's texture.

Sculptor: Extrude your 2D designs into the third dimension. Export your characters as 3D .stl files for 3D printing or for further sculpting in other software.

Carver: An experimental expert at digital engraving. The Carver uses height maps, normal maps, ambient occlusion, and advanced 3D tricks to carve your characters deep into your 3D models.
Web Version

Dscriptor is also available fully online without installation! (Note: The web version is heavily reliant on a mouse for precision vector editing and 3D navigation, and is not optimized for mobile devices.)

