
let velocityX;
let velocityY;
let minVel = -40; // go negative for this
let maxVel = 10;
let minVelX = -20;

let gravityForce = 2; // how fast the ball falls
let bounciness = 5; // Determines how bouncy the ball is 5 default
let friction = 2; // how fast the ball slows down on X axis
let maxSpeed = 100; // Terminal Velocity (how fast the ball can fall)

let currentPosX;
let currentPosY;

let objHeight = 40;
let objWidth = 40;


let colorR = 200;
let colorG = 0;
let colorB = 0;

let currentLevel;
let startLevel = 4;

let colorDown = false;
let colorNext = false;
let colorNext2 = false;

let xMarked = false;
let yMarked = false;

let timerY = 0;
let timer = 0;

function setup() {
  createCanvas(768,432);
  background(0);
  noStroke();
  //frameRate(30);
  resetPosition();
  textSize(40)
} 

function draw() {
  background(0,0,0,50);

  text(currentLevel, width-40,10,10,255)
  
  Gravity();
  wallBounce();
  ColorRandomizer();

  currentPosX += velocityX;
  currentPosY += velocityY;
  

  ellipse(currentPosX,currentPosY,objWidth,objHeight);

}


function ColorRandomizer(){
  fill(colorR,colorB,colorG);

  if (colorR <= 255 && !colorDown && !colorNext2) {
    colorR++
  }
  else if (colorR >= 255){
    colorR --
    colorDown = true;
    colorNext = true;
  }
  else {
    colorDown = false;
  }
  if (colorNext){
    colorB ++
    if (colorB >= 255){
      colorNext = false;
    }
  }
  else if (colorB >= 0){
    colorB --
    colorNext2 = true;
  }
  if (colorNext2) {
    colorG ++
    if (colorG >= 255) {
      colorNext2 = false;
    }
  }
  else if (colorG >= 0) {
    colorG --
  }


}

function wallBounce() {
  
  // Move to the top of screen unless we are on the bottom level 0
  if (currentLevel > 1){
    // go down a level
    if (currentPosY > height){
      currentLevel --;
      currentPosY = 0;
    }
    // go up a level
    else if (currentPosY < 0){
      currentLevel ++;
      currentPosY = height;
    }
  }
  else {
    // Bounce off floor of canvas
    if (currentPosY + objHeight/2 >= height){
      velocityY *= -1;
    }
    // go up a level
    if (currentPosY < 0){
      currentLevel ++;
      currentPosY = height;
    }
  }
  
  // Bounce off sides
  if (currentPosX + objWidth/2 >= width 
    || currentPosX - objWidth/2 <= 0) {
    velocityX *= -1;
  }

  // reset if X is out of Bounds
  if (currentPosX >= width + 50 || currentPosX <= 0 - 50){
    resetPosition();
  }
}

function Gravity(){

  if (currentPosY <= height - objHeight/2) { 
    // if object is higher than height

    if (velocityY < 0) {
      // loses speed going up faster than going down
      velocityY += gravityForce/bounciness;
    }
    else if (velocityY <= maxSpeed) { 
      // make velocityY go down until it reaches maxSpeed
      velocityY += gravityForce/10;
    }
    else if (velocityY > maxSpeed) {
      // if going to fast, slow to terminal Velocity
      velocityY -= gravityForce/10;
    }

    
  }
  else if (currentLevel == 1 && currentPosY >= height - objHeight) {
    // Object is on the ground

    Friction(10);

  }

  if (velocityX == 0) {
    // if velocityX stops before velocityY, the ball resets
    // resets after timer runs out;
    if (timer >= 100) {
      xMarked = true;
    }
    timer++;
  } else { timer = 0}

  if (currentPosY + objHeight >= height){
    // Y must not be moving or is touching the height for a certain
    // amount of time or timer resets;
    if(timerY >= 100) {
      yMarked = true;
    }
    timerY++;
  }else {timerY = 0}

  if (yMarked && xMarked){
    resetPosition();
  }
}


function Friction(drag) {
    // Slow down velocity overtime
    if (velocityX > 0) {
      velocityX -= friction/drag;
    }
    else if (velocityX < 0) {
      velocityX += friction/drag;
    }
    
    if (velocityX < 0.2 && velocityX > -0.2) {
      // stops velocityX after it gets supper slow
      velocityX = 0;
    }
}

function resetPosition(){
  currentPosX = width/2;
  currentPosY = height/2;

  xMarked = false;
  yMarked = false;

  currentLevel = startLevel;
  velocityX = random(minVelX,maxVel);
  velocityY = random(minVel,maxVel);
}