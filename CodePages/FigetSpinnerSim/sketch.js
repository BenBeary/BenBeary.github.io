

// ##### Changable Variables #####

//Spinner Materials
let baseColor; // done
let secoundaryColor; // done
let spinnerCount = 3; // done

// Spinner Speed
let spinReduct = 5;
let maxSpeed = 15; 
let friction = 3;



// ##### EDITOR VARIABLES #####
let sheetOpened = false;
let SheetSize = 300;

// Color
let baseR = 100;
let baseG = 200;
let baseB = 200;

let secondR = 200;
let secondG = 100;
let secondB = 100;

let complementaryLock = false;
let complementaryPressed = false;
// Sizing
let spinnerScale = 75;

let roundingRight = 0
let roundingLeft = 0

// Segments
let segmentStrip = false;
let segmentSpikes = false;

let segmentSpikesPressed = false;
let segmentStripPressed = false;
let segmentUp = false;
let segmentDown = false;

// Images
let arrow_L;
let arrow_R;
let checkMark;

// ##### Toggle Bools #####

let mouseIsOnSpinner = false;
let toggleKey = false;
let maxSpeedChange = false;

// ##### Non-Changables #####
let currentRad = 0;
let spinVelocity = 0;
let prevPosX = 0;
let prevPosY = 0;
let posTimer = 0;
let backgroundBrightness = 0;
let maxSpeedTimer = 0;


function setup(){
  createCanvas(600,600);
  background(20, 19, 33);
  textSize(25);

  arrow_L = loadImage("assets/Arrow_Left.png")
  arrow_R = loadImage("assets/Arrow_Right.png")
  checkMark = loadImage("assets/Check.png")
  
  baseColor = color(baseR,baseG,baseB);
  secoundaryColor = color(secondR,secondG,secondB);

  // reduce so set up number looks better;
  friction /= 80;
}




function draw(){
  background(20+backgroundBrightness, 19+backgroundBrightness, 33+backgroundBrightness)
  fill(255-backgroundBrightness*3,50)
  noStroke()
  rect(90,90, 420,420) // Spin System Bounding Box

  if(complementaryLock){
    baseColor = color(baseR,baseG,baseB);
    secoundaryColor = color(255 - baseR, 255 - baseG, 255 - baseB);
  }
  else {
    baseColor = color(baseR,baseG,baseB);
    secoundaryColor = color(secondR,secondG,secondB);
  }

  
  
  if(sheetOpened){ // Resizing & reTranslating to center if Editor is open
    editorMode();
    DisplayMaxSpeed((width-SheetSize))
    translate((width-SheetSize)/2, height/2); // Center Object
  }
  else{ 
    DisplayMaxSpeed(width)
    translate(width/2, height/2);
  }


  if(keyIsPressed){ // Hotkey input
    keyInputs();

  } else{ toggleKey = false;}

  
  rotate(radians(currentRad));
  // console.log(round(spinVelocity));
 

  figetSpinnerDraw(); // Draw System
  SpinnerSpin(); // Spin System

}

// displays max speed when changed
function DisplayMaxSpeed(position){
  if(maxSpeedChange){

    if (maxSpeedTimer >= 30){
      strokeWeight(2)
      stroke(0,255 - (maxSpeedTimer*2-30))
      fill(255,255 - (maxSpeedTimer*2-30))
      text(maxSpeed, position - 50,20,50,255);
      if (maxSpeedTimer*2-30 >= 255){
        maxSpeedTimer = 0;
        maxSpeedChange = false;
      }
      maxSpeedTimer++
    }
    else {
      strokeWeight(2)
      stroke(0)
      fill(255)
      text(maxSpeed, position - 50,20,50,255);
      maxSpeedTimer++;
    }

  }
  else {maxSpeedTimer = 0;}
}

// gets time when mouse is released to change the speed velocity based
// off of distance between previous mouse x and current mouse x
function mouseReleased(){
 if(mouseIsOnSpinner) {
  
    SpinDirection();
    mouseIsOnSpinner = false;
 }
}

// Draws Base of Spinner and Stems Depending on spinnerCount
function figetSpinnerDraw(){
  
  // ### STEMS PART ###
  scale(.25 + spinnerScale/100)

  for (let i = 0; i < spinnerCount; i++){
    division = 360 / spinnerCount;
    
    drawSpinnerStems();
    // Evenly Divides Spinners by 360
    rotate(radians(division));

  }
  for (let i = 0; i < spinnerCount; i++){
    division = 360 / spinnerCount;
    
    SpinnerAddons();
    // Evenly Divides Spinners by 360
    rotate(radians(division));

  }
  //  ### BASE PART ###

  strokeWeight(15);
  stroke(secoundaryColor);
  fill(0)
  ellipse(0,0,80,80);
  
}

// Spinner Stems Module
function drawSpinnerStems() {

    // ### Top Piece

    noStroke();
    fill(baseColor)
    rect(-50,0,100,-170); // going out

  
    strokeWeight(25);
    stroke(baseColor);
    fill(0)
    ellipse(0,-170,110,110); // Bigger ball
    

    strokeWeight(15);
    stroke(secoundaryColor);
    fill(0)
    ellipse(0,-170,80,80); // first ball


    noStroke()
    fill(baseColor);
        //   BL    TL        TR     BR
    quad(47,0, 47,-130, 67+roundingRight,-40, 110,0)
    quad(-47,0, -47,-130, -67-roundingLeft,-40, -110,0) // reflected
}


// called after segments to be placed over them
function SpinnerAddons() {

  if(segmentStrip){
    noStroke();
    fill(secoundaryColor)
    rect(-10,0,20,-130); // Stripe
  }



  if (segmentSpikes){
    fill(baseColor)
    noStroke()
          //   BL    TL        TR     BR
    quad(35,-225, 47,-230, 77,-230, 67,-165)
    quad(47,-230, 45,-250, 60,-260, 77,-230)
    quad(45,-250, 38,-267, 40,-270, 60,-260)
    // mirror
    quad(-35,-225, -47,-230, -77,-230, -67,-165)
    quad(-47,-230, -45,-250, -60,-260, -77,-230)
    quad(-45,-250, -38,-267, -40,-270, -60,-260)
  }
}

// move based off distance from previous mouse position
// to the current mouse position
function SpinDirection(){
  if(mouseIsOnSpinner) {
  
    posXDist = prevPosX - mouseX
    posYDist = prevPosY - mouseY

    if (Math.abs(posXDist) > Math.abs(posYDist)){
      
      if(mouseY > height/2){
        spinVelocity = (posXDist) / spinReduct;
      }  
      else { // Inverts direction because its the inverse spot
        spinVelocity = (posXDist)*-1 / spinReduct;
      }
    }
    
    else{

      canvasHalf = width/2 
      // Checks for sheet opened   
      if(sheetOpened){
        canvasHalf = (width-SheetSize)/2;
      }


      if (mouseX < canvasHalf){
        spinVelocity = (posYDist) / spinReduct;
      }  
      else { // Inverts direction because its the inverse spot
        spinVelocity = (posYDist)*-1 / spinReduct;
      }
    }
  }
}

// Changes Rotation Speed based off mouse tracking when in bounding box
// Reduces Rotation Speed over time
function SpinnerSpin(){

    // Spinner Interaction
    if (inButton(90 ,90 , 420,420)) {
      mouseIsOnSpinner = true;
      prevPosX = mouseX;
      prevPosY = mouseY;
      // console.log("Spin the Spinner!")
    }

    if(mouseIsOnSpinner){

      // timer system 
      if (posTimer >= 5){


        SpinDirection();
        


        // reset prev to current
        prevPosX = mouseX
        prevPosY = mouseY
        posTimer = 0;
      }else {posTimer ++}


      
    }



    // #### VELOCITY CODE
    if (spinVelocity > maxSpeed){ // speed Check
      spinVelocity = maxSpeed
    }
    else if (spinVelocity < -maxSpeed){
      spinVelocity = -maxSpeed;
    }

    currentRad += spinVelocity; // change rad over time

    
    
    // #### FRICTION CODE
    if (spinVelocity > -.1 && spinVelocity < .1){
      spinVelocity = 0
    }
    // slow down mechanic
    if (spinVelocity > 0){

      spinVelocity -= friction
    }
    else if (spinVelocity < 0) {
      spinVelocity += friction
    }



}

// All HotKeys and Commands Through Here
function keyInputs(){

  switch(key){

    case 'e':
    case 'E':
      if(!toggleKey){
        sheetOpened = !sheetOpened;
        if (sheetOpened){
          resizeCanvas(600+SheetSize,600);
        }
        else {
          resizeCanvas(600,600);
        }

        toggleKey = true;
      }
      break;
    // print screen
    case "p":
    case "P":
      if(!toggleKey){
      saveFrames('image-0', 'png', 1, 1);
      toggleKey = true;
      }
      break;
    case 'w':
    case 'W':
      if (backgroundBrightness < 220){
        backgroundBrightness ++;
      }
      break;
    case 's':
    case 'S':
      if (backgroundBrightness > 0){
        backgroundBrightness --;
      }
      break;
    case 'q':
    case 'Q':
      if (maxSpeed < 100){
  
        maxSpeed++;
        maxSpeedTimer = 0;
        maxSpeedChange = true
      }
      break;
    case 'a':
    case 'A':
      if (maxSpeed > 1){

        maxSpeed--
        maxSpeedTimer = 0
        maxSpeedChange = true
      }
      break;
  }


}

// toggled to show ways you can edit the Spinner
// uses InButton and sliderAreaCreator to control the changes
function editorMode(){
  strokeWeight(2);
  stroke(0);
  fill(100)
  area = width-SheetSize

  rect(area,0, area,height); // Background

  //#region Color Editor
  fill(0)
  text("Base Color",area+90,40)

  baseR = round(sliderAreaCreator(area+80,60,150,15,baseR,1.7))
  baseG = round(sliderAreaCreator(area+80,90,150,15,baseG,1.7))
  baseB = round(sliderAreaCreator(area+80,120,150,15,baseB,1.7))

  text("R",area+50,70);
  text("G",area+50,100);
  text("B",area+52,130); 
  text(baseR,area+250,70);
  text(baseG,area+250,100);
  text(baseB,area+250,130);

  text("Secondary Color",area+70,170)

  secondR = round(sliderAreaCreator(area+80,190,150,15,secondR,1.7))
  secondG = round(sliderAreaCreator(area+80,220,150,15,secondG,1.7))
  secondB = round(sliderAreaCreator(area+80,250,150,15,secondB,1.7))

  text("R",area+50,200);
  text("G",area+50,230);
  text("B",area+52,260);  
  text(secondR,area+250,200);
  text(secondG,area+250,230);
  text(secondB,area+250,260);
  //#endregion
  // last Y was 260


  //#region Segment Editor
    text("Segments:",area+40,320)

    // Down
    drawButton(area+175,300,25,25,arrow_L)
    if(spinnerCount > 2 && mouseIsPressed && inButton(area+170,300,25,25)){
      if(!segmentDown) {
        fill(0,50);
        rect(area+170,300,25,25,7)
        spinnerCount--;
        segmentDown = true;
      } 
    }else {segmentDown = false;}
    // Up
    drawButton(area+260,300,25,25,arrow_R)
    if(spinnerCount < 8 && mouseIsPressed && inButton(area+260,300,25,25)){
      if(!segmentUp) {
        fill(0,50);
        rect(area+260,300,25,25,7)
        spinnerCount++;
        segmentUp = true;
      } 
    }else {segmentUp = false;}
    strokeWeight(2)
    stroke(0)
    fill(0)
    text(spinnerCount,area+222.5,320)

  //#endregion
  // last Y was 320


  //#region Scale Editor
  text("Extra Parts",area+90,360)
  // Scale
  text("Scale",area+40,400)

  spinnerScale = round(sliderAreaCreator(area+120,390,100,15,spinnerScale,1), 1)
    
  text(spinnerScale/100 + .25, area+240,400)
  
  // Roundness
  text("Right",area+40,440)
  text("Left", area+40,480)

  roundingRight = round(sliderAreaCreator(area+120,430,100,15,roundingRight,0.5), 1)
  roundingLeft = round(sliderAreaCreator(area+120,470,100,15,roundingLeft,0.5), 1)

  text(roundingRight, area+240,440)
  text(roundingLeft, area+240,480)
  //#endregion
  // last Y was 480


  //#region Misc

  text("Stripe",area+40,520)
  fill(200)
  rect(area+120,500,25,25,7)
  if(mouseIsPressed && inButton(area+120,500,25,25)){
    if (!segmentStripPressed){
      segmentStrip = !segmentStrip

      segmentStripPressed = true;
    }
  } else {segmentStripPressed = false  }
  if (segmentStrip){
    fill(0,255,0,100)
    noStroke()
    rect(area+120,500,25,25,7)
  }
  fill(0)
  strokeWeight(2)
  stroke(0)

  text("Spikes",area+160,520)
  fill(200)
  rect(area+250,500,25,25,7)
  if(mouseIsPressed && inButton(area+250,500,25,25)){
    if (!segmentSpikesPressed){
      segmentSpikes = !segmentSpikes

      segmentSpikesPressed = true;
    }
  } else {segmentSpikesPressed = false  }
  if (segmentSpikes){
    fill(0,255,0,100)
    noStroke()
    rect(area+250,500,25,25,7)
  }
  fill(0)
  strokeWeight(2)
  stroke(0)



  text("Complementary",area+40,560)
  fill(200)
  rect(area+250,540,25,25,7)
  if(mouseIsPressed && inButton(area+250,540,25,25)){
    if (!complementaryPressed){
      complementaryLock = !complementaryLock

      complementaryPressed = true;
    }
  } else {complementaryPressed = false  }
  if (complementaryLock){
    fill(0,255,0,100)
    noStroke()
    rect(area+250,540,25,25,7)
  }
  fill(0)
  strokeWeight(2)
  stroke(0)


  //#endregion
}

// Bool Statement to create a button in given area
function inButton(x1, y1, x2, y2){

  x2 += x1;
  y2 += y1;
  if (mouseIsPressed && mouseX >= x1 && mouseX <= x2 &&
  mouseY >= y1 && mouseY <= y2){
    return true;
  }
  return false;
}

// used to create slider values for mouse
function sliderAreaCreator(x1, y1, x2, y2, newValue, division){
  x2 += x1;
  y2 += y1;

  offset = (y1-y2)*-1 /2;

  fill(200)
  rect(x1, y1, (x1-x2)*-1 - offset, (y1-y2)*-1 - offset);
  fill(0)
  
  if (mouseIsPressed && mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2){
    ellipse(mouseX, y1+offset,10,10);
    console.log(newValue);

    // changes to new value
    return (mouseX-x1)*division
  }
  else {
    // move circle to color value reduced
    ellipse(x1 + newValue/division, y1+offset/2, offset*2,offset*2);
    return newValue;
  }

}

// draws rounded box with image
function drawButton(x,y, w,h, img){
  
  fill(200)
  noStroke()
  rect(x,y,w,h, 7)
  tint(100)
  image(img, x + h/w, y + w/h, w,h)
}