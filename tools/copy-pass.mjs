/* copy-pass.mjs, one-off copy edits.

   1. Docking Bay's summary led with the "Papers, Please" comparison before
      saying what the game is or what Ben did. Reordered: what it is, what he
      built, then the inspiration.

   2. Signal-Link appears in the Featured, Programming and UI / UX lists on the
      home page with identical text and imagery every time. Adds `featuredCopy`,
      a per-ranking override of the summary and media so each list talks about
      the work that's actually relevant to it. Any ranking without an entry falls
      back to the project's own summary/media.

   Run once from tools/:  node copy-pass.mjs */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = path.join(REPO, 'content', 'projects.json');
const SL = 'images/Blog Images/Signal-Link/';

const data = JSON.parse((await fs.readFile(PROJECTS, 'utf8')).replace(/^﻿/, ''));
const bySlug = (s) => data.projects.find((p) => p.slug === s);

// --- 1. Docking Bay ------------------------------------------------------
const dock = bySlug('docking-bay');
dock.summary =
    'A tense inspection game set on a space station: you sit at a cluttered desk and swivel between ' +
    'workstations, checking paperwork, cameras and radio chatter to decide which ships get cleared to dock. ' +
    'I built the room and exterior scenes, the sound system, the menu and pause UI, and a dialogue system ' +
    'timed to the voice acting, along with the 3D animations and particle effects. It takes its inspiration ' +
    'from “Papers, Please”, pushing that format somewhere more physical and more uneasy, so you spend ' +
    'the whole shift second-guessing your own calls.';

// --- 2. Signal-Link per-ranking copy -------------------------------------
const sl = bySlug('signal-link');
sl.featuredCopy = {
    programming: {
        summary:
            'Signal-Link is built around linking things together, and I worked on the puzzle mechanics that ' +
            'make that idea play. I helped program the connection systems behind both worlds, then used them ' +
            'to design several of the puzzles myself, which meant tuning the rules until they were readable ' +
            'to a player who had never seen them before. All of it inside a two-week jam.',
        media: [
            { src: SL + 'Game_1.png', alt: 'A Signal-Link puzzle mid-solve' },
            { src: SL + 'Level_1.png', alt: 'The first world laid out with its puzzle chain' },
            { src: SL + 'ExtraImage_1.png', alt: 'Connection mechanic in use' },
            { src: SL + 'ExtraImage_2.png', alt: 'Connection mechanic in use' },
            { src: SL + 'ExtraImage_3.png', alt: 'Puzzle wiring detail' },
            { src: SL + 'ExtraImage_4.png', alt: 'Puzzle wiring detail' },
            { src: SL + 'Level_2.png', alt: 'The second world and its puzzles' }
        ]
    },
    'ui-ux': {
        summary:
            'I built Signal-Link’s main menu as a place rather than a screen. Instead of buttons over a ' +
            'background, the interface lives inside a real 3D scene the player looks around, so the menu and ' +
            'the world are one space. I modelled that environment, placed the 2D elements into it, and ' +
            'animated the whole thing so it feels alive before the game has even started.',
        media: [
            { src: SL + 'MainMenu_GameView.png', alt: 'The finished main menu in game' },
            { src: SL + 'Menu Setup.mp4', alt: 'The menu scene animating' },
            { src: SL + 'MainMenu_Unity.png', alt: 'The menu scene assembled in Unity' },
            { src: SL + 'MainMenu_Blender.png', alt: 'Modelling the menu environment in Blender' }
        ]
    }
};

data.contentVersion = (data.contentVersion || 0) + 1;
await fs.writeFile(PROJECTS, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log('docking-bay summary rewritten (' + dock.summary.length + ' chars)');
for (const [key, v] of Object.entries(sl.featuredCopy)) {
    console.log('signal-link featuredCopy.' + key + ': ' + v.media.length + ' media, ' + v.summary.length + ' chars');
}
console.log('contentVersion -> ' + data.contentVersion);
