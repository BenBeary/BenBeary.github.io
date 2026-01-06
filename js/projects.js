const projects = {
    cleanupCrew: {
        title: "TEAM PROJECT | Game: Clean Up Crew",
        playLink: "https://benbeary.itch.io/cleanup-crew",
        
        background: "images/CleanUpCrew/Blurred.jpg",

        date: "July 29, 2025",

        rankings: {
            programming: 1,
            ui_ux: 1,
            level_design: 2,
            sound_design: 2,
            modeling: 2,
        },

        images: [
            "images/CleanUpCrew/16_9 shot.png",
            "images/CleanUpCrew/MenuLoadIn.mp4",
            "images/CleanUpCrew/Homescreen.png",
            "images/CleanUpCrew/Gameplay1.png",
            "images/CleanUpCrew/UI.png",
            "images/CleanUpCrew/ControlUI.png",
            "images/CleanUpCrew/map_layout.png",
            "images/CleanUpCrew/map_layout4.png",
            "images/CleanUpCrew/map_layout2.png",
            "images/CleanUpCrew/map_layout3.png",
            "images/CleanUpCrew/3DModel.png",
            "images/CleanUpCrew/spawnObjects.png",
            "images/CleanUpCrew/fpsGunSpread.png"
        ],

        tags: [
            "Programming",
            "UI / UX",
            "Level Design",
            "3D Modeling",
            "3D Animation",
        ],

        bullets: [
            "Created the map layout",
            "Created a first person modular gun system that could work with multiple gun types",
            "Created all the UI including the leaderboard system",
            "Created A spawner system that would spawn items on top of terrain geometry",
            "Worked on Particle systems and animations for 3D Assets"
        ],

        summary: "We took parts from different games like Risk of Rain 2 and the old school Doom games. We wanted to create a large world the player could move around through while keeping the game low poly to save performance due to it being a web-based game."
    },

    dockingBay: {
        title: "TEAM PROJECT | Game: [Docking Bay]",
        playLink: "https://zorzini.itch.io/dockingbay",
        
        background: "images/DockingBay/Blurred.png",

        date: "October 17, 2025",

        rankings: {
            programming: 2,
            ui_ux: 2,
            level_design: 1,
            sound_design: 1,
            modeling: 1,
        },

        images: [
            "images/DockingBay/DockingBay_Poster_Warm_Wide.png",
            "images/DockingBay/MenuAnimation.mp4",
            "images/DockingBay/HomeScreen.png",
            "images/DockingBay/Monitor4.png",
            "images/DockingBay/Monitor.png",
            "images/DockingBay/Monitor2.png",
            "images/DockingBay/Monitor3.png",
            "images/DockingBay/sideView.png",
            "images/DockingBay/Camera.png",
            "images/DockingBay/layout.png",
            "images/DockingBay/DialogueTest.gif",
            "images/DockingBay/DockingBay Front Panel Timeline_Condensed.png"
        ],

        tags: [
            "Programming",
            "UI / UX",
            "Level Design",
            "3D Modeling",
            "Sound Design"
        ],

        bullets: [
            "Created the room layout and Exterior scene",
            "Created a sound system to efficiently play audio",
            "Made all 3D animations and particle effects",
            "Created Menu Screen and pause menu UI",
            "Created a Dialogue system that could match Voice Acting audio"
        ],

        summary: "We created a game similar to Paper's Please. We wanted there to be more interactivity by having the player swivel in a chair to each different station. We wanted to create an atmosphere that was eerie and made the player constantly second guess their actions."
    },
    
    IdolOfAshes: {
        title: "TEAM PROJECT | Game: Idol of Ashes",
        playLink: "https://zorzini.itch.io/idol-of-ashes",
        
        background: "images/IdolofAshes/Blurred.png",

        date: "June 9, 2025",

        rankings: {
            programming: 4,
            ui_ux: 3,
            level_design: 10,
            sound_design: 3,
            modeling: 3,
        },

        images: [
            "images/IdolofAshes/IdolOfAshes.png",
            "images/IdolofAshes/Img_4.png",
            "images/IdolofAshes/Img_2.png",
            "images/IdolofAshes/Img_3.png",
            "images/IdolofAshes/Img_5.png",
            "images/IdolofAshes/Outline.png",
            "images/IdolofAshes/Shader.png",
            "images/IdolofAshes/UI.png",
            "images/IdolofAshes/UI2.png",

        ],

        tags: [
            "Programming",
            "UI / UX",
            "Sound Design"
        ],

        bullets: [
            "Created All of the UI for the Game",
            "Created a Quest system",
            "Created a dialogue system from scratch",
            "Created a toon shader with an outline",
        ],

        summary: "I was mainly the back end for this project and worked heavily on the UI and other systems. Some of the main systems I created was a dialogue, quest, and manual system within a week long time span for the game jam."
    },    

    SpiritOutbreak: {
        title: "Game: Spirit Outbreak",
        playLink: "https://benbeary.itch.io/spirit-outbreak",
        
        background: "images/SpiritOutbreak/Blurred.jpg",

        date: "April 19, 2025",

        rankings: {
            programming: 2,
            ui_ux: 2,
            level_design: 2,
            sound_design: 10,
            modeling: 4,
            pixel_art: 1,
        },

        images: [
            "images/SpiritOutbreak/FrontImage.jpg",
            "images/SpiritOutbreak/video1.mp4",
            "images/SpiritOutbreak/video2.mp4",
            "images/SpiritOutbreak/video3.mp4",
            "images/SpiritOutbreak/img1.png",
            "images/SpiritOutbreak/img2.png",
            "images/SpiritOutbreak/img3.png",
            "images/SpiritOutbreak/img4.png",
        ],

        tags: [
            "Programming",
            "Level Design",
            "UI / UX",
            "Pixel Art"
        ],

        bullets: [
            "Created a Custom UI Line Renderer for a custom made graph",
            "Created a custom A* pathfinder that worked for Isometric grids",
            "Created multiple enemy types that would all behave differently",
            "Created an Upgrade system that would add effects or change how a trap worked",
            "Created a map system that could change the overall layout of the map as the game progressed"
        ],

        summary: "I made this game within a year and created a map making system that allowed for the quick creation of new maps. Enemies could adapt and change actions based on traps and walls being placed in realtime. The game had over 14 traps and 6 map designs that would all change over time."
    },
        
    diceClimber: {
        title: "Game: Dice Climbers: Shelf of Chaos",
        playLink: "https://benbeary.itch.io/dice-climber-shelf-of-chaos",
        
        background: "images/DiceClimber/Blurred.jpg",

        date: "May 20, 2025",

        rankings: {
            programming: 4,
            ui_ux: 7,
            level_design: 3,
            sound_design: 9,
            modeling: 3,
            pixel_art: 2,
        },

        images: [
            "images/DiceClimber/Title Poster.jpg",
            "images/DiceClimber/Menu.png",
            "images/DiceClimber/img1.png",
            "images/DiceClimber/img2.png",
            "images/DiceClimber/img3.png",
            "images/DiceClimber/img4.png",
            "images/DiceClimber/img5.png",
            "images/DiceClimber/img6.png",
            "images/DiceClimber/img7.png",
            "images/DiceClimber/img8.png",
            "images/DiceClimber/img9.png",
            "images/DiceClimber/img10.png",
            
        ],

        tags: [
            "Programming",
            "Level Design",
            "UI / UX",
            "Pixel Art"
        ],

        bullets: [
            "Created Modular puzzle pieces for reuse",
            "Created a dialogue system from scratch",
            "Created visual editor guides to help map creation",
            "Created multiple mechanics that the player learns over time",
            "Created a cutscene system",
        ],

        summary: "This was my first attempt at creating a platformer. I created all the assets and code that runs in the game. I created a modular design to all the different mechanics like enemy movement, cutscenes, and interactables.",
    }, 
            
    DeathTides: {
        title: "TEAM PROJECT | Game: Death Tides",
        playLink: "https://benbeary.itch.io/death-tides",
        
        background: "images/DeathTides/Blurred.png",

        date: "July 27, 2024",

        rankings: {
            programming: 5,
            level_design: 5,
            ui_ux: 6,
            pixel_art: 3,
        },

        images: [
            "images/DeathTides/DeathTides_1000px.png",
            "images/DeathTides/img1.png",
            "images/DeathTides/img2.png",
            "images/DeathTides/img3.png",
            "images/DeathTides/img4.png",
            "images/DeathTides/img5.png",
            
        ],

        tags: [
            "Programming",
            "Level Design",
            "UI / UX",
            "Pixel Art"
        ],

        bullets: [
            "Created all the pixel art in a module design for reuse",
            "AI uses a faction system allowing different ai to fight each other",
            "AI uses a field of view so you can sneak up behind them",
            "Created a modular wave system for quick and easy to make objectives",
            "Created a system of loading map in chunks for performance",
        ],

        summary: "This game was part of a week long game jam. I was the lead artist, coder, and game designer. I worked with one other person who helped with some art assets and programming. My main role in this was creating the enemy AI and the world design which used a chunk loading system to increase overall performance.",
    }, 
                
    DodgeKarts: {
        title: "Game: Dodge Kart",
        playLink: "https://benbeary.itch.io/dodge-kart",
        
        background: "images/DodgeKarts/Blurred.png",

        date: "October 27, 2023",

        rankings: {
            programming: 6,
            level_design: 8,
            pixel_art: 6,
        },

        images: [
            "images/DodgeKarts/DodgeKarts_1000px.png",
            "images/DodgeKarts/img1.png",
            "images/DodgeKarts/img2.png",
            "images/DodgeKarts/img3.png",
            // "images/PortLochne/img4.jpg",
            // "images/PortLochne/img5.jpg",

            
        ],

        tags: [
            "Programming",
            "Level Design",
            "UI / UX",
            "Pixel Art"
        ],

        bullets: [
            "Created a shader to randomize car colors",
            "Made a spawner that progressively made harder challenges over time",
        ],

        summary: "This was a class partner assignment where I took on the artist roll. I used unity's shadergraph mechanic to change the car colors so I could save time and reduce the required amount of tilesheets.",
    }, 
                
    DevilsAcre: {
        title: "TEAM PROJECT | Game: Devil's Acre",
        playLink: "https://zorzini.itch.io/devils-acre",
        
        background: "images/DevilsAcre/Blurred.png",

        date: "April 22, 2022",

        rankings: {
            programming: 5,
            pixel_art: 5,
        },

        images: [
            "images/DevilsAcre/DevilsAcre_Title_1000px.png",
            "images/DevilsAcre/img1.gif",
            "images/DevilsAcre/img2.gif",
            "images/DevilsAcre/img3.png",
            "images/DevilsAcre/img4.png",
            "images/DevilsAcre/img5.png",
            "images/DevilsAcre/img6.png",
            "images/DevilsAcre/img7.png",

        ],

        tags: [
            "Programming",
            "Pixel Art"
        ],

        bullets: [
            "Created environmental art for the game",    
            "Worked on the boss AI",        
            "Created Pause Menu UI",        
        
        ],

        summary: "This was a class group project in which I mainly focused on the enviroment art. I also pitched in on the code and created the final boss's AI and attack moves. The overall project time was around 2 months in total.",
    }, 
                
    PortLochne: {
        title: "Modded Map: Port Lochne",
        playLink: "",
        
        background: "images/PortLochne/Blurred.png",

        date: "April 22, 2022",

        rankings: {
            level_design: 4,
            modeling: 2,
        },

        images: [
            "images/PortLochne/PortLochne_1000px.png",
            "images/PortLochne/img1.jpg",
            "images/PortLochne/img2.jpg",
            "images/PortLochne/img3.jpg",
            "images/PortLochne/img4.jpg",
            "images/PortLochne/img5.jpg",

            
        ],

        tags: [
            "Level Design",
            "3D Modeling"
        ],

        bullets: [
            "Created a map for a mod on Garry's Mod",
            "Areas were created to make certain spots more popular and group people together",
        ],

        summary: "This map was created in the hammer editor used for the source engine of the game Garry's Mod. The map is used for the game mode \"Trouble In Terrorist Town.\" The map design is of a city cargo station made entirely from scratch. I did not make any of the textures or complex props.",
    }, 
    
    Meoware: {
        title: "TEAM PROJECT | Game: Meoware Defender",
        playLink: "https://withcyber.itch.io/meoware-defender",
        
        background: "images/MeowareDefender/Blurred.png",

        date: "September 2, 2025",

        rankings: {
            programming: 6,
            ui_ux: 4,
            level_design: 8,
        },

        images: [
            "images/MeowareDefender/Menu.png",
            "images/MeowareDefender/img1.png",
            "images/MeowareDefender/img2.png",
            "images/MeowareDefender/img3.png",
            "images/MeowareDefender/img4.png",
            // "images/MeowareDefender/img5.png",

            
        ],

        tags: [
            "Programming",
            "Level Design",
            "UI / UX",
        ],

        bullets: [
            "State funded team project",
            "Created a player customizer system",
            "Created a system that allowed for Mobile compatibility",
            "Made a save system that allowed the player to customize the living room",
            "Made the password creator mini game",
       
        ],

        summary: "This was a state-funded project where I worked on a team to create a game targeted toward 3rd- and 4th-grade students, aiming to boost their motivation to pursue a cybersecurity career path. I primarily focused on programming and UI design, and helped integrate the entire team's contributions into the final game.",
    },

    SignalLink: {
        title: "TEAM PROJECT | Game: Signal-Link",
        playLink: "https://benbeary.itch.io/signal-link",
        
        background: "images/Signal-Link/Blurred.jpg",

        date: "January 4, 2026",

        rankings: {
            programming: 0,
            ui_ux: 1,
            level_design: 1,
            modeling: 1,
            sound_design: 5,
        },

        images: [
            "images/Signal-Link/singla_link_poster.png",
            "images/Signal-Link/Menu Setup.mp4",
            "images/Signal-Link/MainMenu_Blender.png",
            "images/Signal-Link/MainMenu_Unity.png",
            "images/Signal-Link/MainMenu_GameView.png",
            "images/Signal-Link/Level_1.png",
            "images/Signal-Link/Game_1.png",
            "images/Signal-Link/ExtraImage_2.png",
            "images/Signal-Link/ExtraImage_1.png",
            "images/Signal-Link/ExtraImage_3.png",
            "images/Signal-Link/ExtraImage_4.png",
            "images/Signal-Link/Modeling_Layout.png",
            "images/Signal-Link/Modeling_Layout_2.png",
            "images/Signal-Link/Level2_Progress_1.png",
            "images/Signal-Link/Level2_Progress_2.png",
            "images/Signal-Link/Level2_Progress_3.png",
            "images/Signal-Link/Level2_Progress_4.png",
            "images/Signal-Link/Level_2.png",

            // "images/MeowareDefender/img5.png",

            
        ],

        tags: [
            "Level Design",
            "Programming",
            "UI / UX",
            "3D Modeling",
            "Sound Design"
        ],

        bullets: [
            "2 Week long Game Jam",
            "Created Scenary for 2 Worlds and The Main Menu Scene",
            "Main Menu Scene integrates UI and the 3D world into 1 space",
            "Created Multiple puzzles that are built into the world",
            "Created multiple 3D assets and 2D UI tools to make the Interface come alive",
       
        ],

        summary: "This was a 2 week long game jam where I worked with my team to create a game with the game theme being connections. My main part in the project was Level Design and Environment Art. I created both worlds and also created the entire menu scene on my own. I also helped program the puzzle mechanics for the game and created some of my own puzzles with them aswell.",
    }, 
};