
var sceneMan;
let _itemLib;
let sadIcon;
let happyIcon;
let errorIcon;
let repBG;


let bgMusic, DeathSFX = [],loseSFX,winSFX,buttonSFX,CoinSFX

function preload(){

    //#region SFX
    bgMusic = loadSound("Sound/Music.mp3")
    DeathSFX.push(loadSound("Sound/death1.mp3"))
    DeathSFX.push(loadSound("Sound/death2.mp3"))
    DeathSFX.push(loadSound("Sound/death3.mp3"))
    DeathSFX.push(loadSound("Sound/death4.mp3"))
    loseSFX = loadSound("Sound/Failed.mp3")
    winSFX = loadSound("Sound/Win.mp3")
    CoinSFX = loadSound("Sound/CoinUp.mp3")
    buttonSFX = loadSound("Sound/buttonSFX.mp3")
    //#endregion

    _itemLib = loadJSON("Item_Lib.json");
    sadIcon = loadImage("assets/SadFileIcon.png")
    happyIcon = loadImage("assets/HappyFileIcon.png")
    errorIcon = loadImage("assets/AwSnapIcon.png")
    repBG = loadImage("assets/101backGround.png")
  }

function setup(){

  frameRate(60)
  bgMusic.play()
  bgMusic.setLoop(true)
  outputVolume(0.5)
  sceneMan = new SceneManager()
  sceneMan.addScene (Intro);
  sceneMan.addScene (Game);
  sceneMan.addScene (Instructions);
  sceneMan.addScene (FailedEnd)
  sceneMan.addScene (WinEnd);
  sceneMan.addScene (Statement);
  sceneMan.showNextScene();
  sceneMan.showScene(Intro)
}

function draw() {

  sceneMan.draw()
}

function mouseReleased(){
  mouseDown = false;
  userStartAudio()
}