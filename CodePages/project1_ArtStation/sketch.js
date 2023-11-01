

// Backspace : clears canvas to white 
// O : clears canvas to primary color 
// L : clears canvas tp complimentary color 
// , : makes Stroke smaller 
// . : makes Stroke bigger 
// 1 : default brush 
// 2 : outlined brush 
// 3 : tapering brush
// 4 : Long multiColor brush
// 5 : Eraser tool 
// F : flips color 
// G : changes between Greyscale and RGB 
// V : changes Symmetry mode to Vertical 
// H : changes Symmetry mode to Horizontal



let currentkey = '1';

let bgc ;

let taperCount = 10;
let taperUp = true;

// #### Brush Table
let tableSize = 200;

let colorR = 255;
let colorG = 100;
let colorB = 0;
let colorGrey = 0;
let colorMax = 255;

let colorGrade;
let compColor;
let greyScale = false;
let mouseIsDown = false;
let keyIsDown = false;

let strokeSize = 10;
let currentBrush = 1;

let canvasMiddleX;
let verticalMirror = false;
let horizontolMirror = false;
let pressingVertical = false;
let pressingHorizontal = false;


function setup() {
    createCanvas(800 + tableSize, 600);
    background(255);
    smooth();

    canvasMiddleX = (width-tableSize);
    bgc = color(255);
    key = '1';
    textSize(20);
}

function draw() {


  // changes color modes
  if(!greyScale) {
    colorGrade = color(colorR,colorG,colorB);
    //complimentary colors
    compColor = color(colorMax-colorR,colorMax-colorG,colorMax-colorB);
  } else{
    colorGrade = color(colorGrey)
    // I guess this still counts as complimentary colors XD
    compColor = color(colorMax-colorGrey)
  }

    // triggering the clear_print function
  if( keyIsPressed) {
    lastBrush = 
    otherSettings();

  } else {keyIsDown = false; }

  // triggering the newkeychoice
  if(mouseIsPressed) {
    drawChoice();
  }
  

  // Functions for Brush settings Color | Size | Brush Type
  brushTableSettings();
  switchBrush();

}



// Creates a Interactive Color Table 
function brushTableSettings(){
  tableArea = width-tableSize;
  strokeWeight(2);
  stroke(0);

  //#region  Background
  fill(230, 206, 151) // tan
  rect(tableArea, 0, tableSize,height)
  fill(0)
  rect(tableArea-10, 0, 10, height);
  //#endregion

  //#region  Color Pallete
  

  // Main Color
  fill(colorGrade);
  rect(tableArea + 50, 50, 100, 100);
  
  // Switch to Complementary Color Button
  fill(compColor);
  rect(tableArea + 150, 50, 30,30);
    if (inButton(tableArea+150,50,30,30)) {
      if (!mouseIsDown) {
        if (!greyScale){
          colorR = colorMax-colorR;
          colorG = colorMax-colorG;
          colorB = colorMax-colorB;
        }else {colorGrey = colorMax-colorGrey;}
        mouseIsDown = true;
      }
    }
    else { // this makes it so the action only happens once
      mouseIsDown = false;
    }

  // Sliders
  if (!greyScale){
    // RGB LAYOUT
    colorR = colorLimiter(sliderAreaCreator(tableArea + 50, 170, tableArea + 154, 180, colorR, 2.55));
    colorG = colorLimiter(sliderAreaCreator(tableArea + 50, 190, tableArea + 154, 200, colorG, 2.55));
    colorB = colorLimiter(sliderAreaCreator(tableArea + 50, 210, tableArea + 154, 220, colorB, 2.55));
    
    fill(0);
    text("R", tableArea+20,162,10,255)
    text("G", tableArea+20,182,10,255)
    text("B", tableArea+22,202,10,255)
    textSize(15)
    text(round(colorR), tableArea+160,165,50,255)
    text(round(colorG), tableArea+160,185,50,255)
    text(round(colorB), tableArea+160,205,50,255)
    textSize(20)
  } else {
    // GREYSCALE LAYOUT
    colorGrey = colorLimiter(sliderAreaCreator(tableArea + 50, 170, tableArea + 154, 180, colorGrey, 2.55));
  
    fill(0)
    text("BL", tableArea+15,162,10,255)
    textSize(15)
    text(round(colorGrey), tableArea+160,165,50,255)
    textSize(20)
  }
  //#endregion

  //#region Stroke Size
  fill(0);
  ellipse(tableArea + 100, 260, strokeSize,strokeSize)
  
  strokeSize = strokeSizeMinMax(sliderAreaCreator(tableArea + 70, 320, tableArea + 130, 330, strokeSize, 1));
  text("Brush Size", tableArea + 50,340,200,255)
  textSize(15);
  text(round(strokeSize), tableArea+150,255,50,255);
  textSize(20);
  //#endregion

  //#region Brush Setting
  fill(255)

  rect(tableArea + 40, 400, 50,50);
  if(inButton(tableArea+40,400,50,50)){
      currentBrush = 1;
      key = "1";
  } 
  rect(tableArea + 110,400, 50,50);
  if (inButton(tableArea+110,400,50,50)){
    currentBrush = 2;
    key = "2";
  }
  rect(tableArea + 40, 470, 50,50);
  if(inButton(tableArea+40,470,50,50)){
      currentBrush = 3;
      key = "3"
  } 
  rect(tableArea + 110,470, 50,50);
  if (inButton(tableArea+110,470,50,50)){
    currentBrush = 4;
    key = "4";
  }
  fill(0)
  text("Brushes", tableArea+65,530,200,255)

  // Horizontal Symetry Button
  noFill() 
  rect(tableArea+60,560,20,20)
  fill(0)
  noStroke()
  for (let i = 0; i < 20; i+= 5){
    rect(tableArea+69, 560+i,2,3);
  }
  if(horizontolMirror) {
    fill(0,100)
    rect(tableArea+60,560,20,20)
  }
  strokeWeight(2);
  stroke(0)
  if(inButton(tableArea+60,560,20,20)){
    if(!pressingHorizontal){
      horizontolMirror = !horizontolMirror;
      verticalMirror = false;
      pressingHorizontal = true;
    }
  }else {pressingHorizontal = false;}

  // Vertical Symmetry Button
  noFill() 
  rect(tableArea+120,560,20,20)
  fill(0)
  noStroke()
  for (let i = 0; i < 20; i+= 5){
    rect(tableArea+120+i, 569, 3,2);
  }
  if(verticalMirror) {
    fill(0,100)
    rect(tableArea+120,560,20,20)
  }
  strokeWeight(2)
  stroke(0)
  if(inButton(tableArea+120,560,20,20)){
    if(!pressingVertical){
      verticalMirror = !verticalMirror;
      horizontolMirror = false;
      pressingVertical = true;
    }
  }else {pressingVertical = false;}

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



// used to limit the colors back down to 255 or 0 if it is too high
function colorLimiter(colorInQuestion){
  if (colorInQuestion > colorMax) {
    return colorMax;
  }
  else if (colorInQuestion < 0){
    return 0;
  }
  // nothing is wrong send it back
  return colorInQuestion
}



// Clamps the min max size of Strokes
function strokeSizeMinMax(strokeInQuestion){
  if (strokeInQuestion < 1){
    return 1;
  } else if (strokeInQuestion >= 52) {return 52}
  return strokeInQuestion;
}



// used to create slider values for mouse
function sliderAreaCreator(x1, y1, x2, y2, newValue, division){
  offset = (y1-y2)*-1 /2;

  //console.log(x1 + " | " + x2)
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



// places green square in brush settings table... that's it
function switchBrush() {
  currentBrush = Number(key);
  switch(currentBrush){
    case 1:
      fill(0,255,0)
      rect(tableArea + 40, 400, 50,50);
      break;
    case 2:
      fill(0,255,0)
      rect(tableArea + 110,400, 50,50);
      break;
    case 3:
      fill(0,255,0)
      rect(tableArea + 40, 470, 50,50);
      break;
    case 4:
      fill(0,255,0)
      rect(tableArea + 110,470, 50,50);
      break;
  }
}



// checked every frame for new commands being inputed
function otherSettings() {

  switch(key) {
    // Clear Canvas to white
    case 'Backspace':
      background(255);
      bgc = color(255);
      break;
    // Clear Canvas to Current Color
    case 'o':
    case 'O':
      background(colorGrade);
      bgc = color(colorGrade)
      break;
    // Clear Canvas to Complimentary Color
    case 'l':
    case 'L':
      background(compColor);
      bgc = compColor;
      break;
    // Increase Stroke Size
    case '.':
      strokeSize ++;
      console.log(strokeSize);
      break;
    // Decrease Stroke Size
    case ',':
      strokeSize --;

      break;
    // flip to complimentary
    case 'f':
      if (!keyIsDown)
      {
        if (!greyScale){
          colorR = colorMax-colorR;
          colorG = colorMax-colorG;
          colorB = colorMax-colorB;
        }else {colorGrey = colorMax-colorGrey;}
        keyIsDown = true;
      }
      break;
    // Toggle Grescale <-> RGB
    case 'g':
      if (!keyIsDown)
      {
        greyScale = !greyScale
        keyIsDown = true;
      }
      break;
    // Toggle Vertical Mirroring and turn off horizontal if on
    case 'V':
    case 'v':
      if(!keyIsDown){
        verticalMirror = !verticalMirror;
        horizontolMirror = false;
        keyIsDown = true;
      }
      break;
    //Toggle Horizontal Mirroring and turn off vertical if on
    case 'H':
    case 'h':
      if(!keyIsDown){
        horizontolMirror = !horizontolMirror;
        verticalMirror = false;
        keyIsDown = true;
      }
      break;
      
  }
}



function drawChoice() {
  // the key mapping if statemens that you can change to do anything you want.
  // just make sure each key option has the a stroke or fill and then what type of
  // graphic function

  // converts string to number idk what it does with letters
  currentkey = key;
  currentBrush = Number(key);
switch(currentkey) {
case '1':
  console.log("1");  // Default Line
  drawline(color(colorGrade), mouseX, mouseY, pmouseX, pmouseY);

  if (verticalMirror){
    drawline(color(colorGrade), mouseX, height-mouseY, pmouseX, height-pmouseY);

  }
  else if(horizontolMirror){
    drawline(color(colorGrade), canvasMiddleX-mouseX, mouseY, canvasMiddleX-pmouseX, pmouseY);
  }
  break;
case '2':
  console.log("2");  // Outline
  bbOutlineLine(color(colorGrade), mouseX, mouseY, pmouseX, pmouseY);
  if (verticalMirror){
    bbOutlineLine(color(colorGrade), mouseX, height-mouseY, pmouseX, height-pmouseY);

  }
  else if(horizontolMirror){
    bbOutlineLine(color(colorGrade), canvasMiddleX-mouseX, mouseY, canvasMiddleX-pmouseX, pmouseY);
  }
  break;
case '3':
  console.log("3");  // Taper Line
  bbTaperBrush(taperCount, mouseX, mouseY, pmouseX, pmouseY);
  if (taperUp) {
      taperCount ++;
      if(taperCount >= strokeSize) {taperUp = false}
  } else {
      taperCount--;
      if(taperCount <= 2) {taperUp = true}
  }
  if (verticalMirror){
    bbTaperBrush(taperCount, mouseX, height-mouseY, pmouseX, height-pmouseY);

  }
  else if(horizontolMirror){
    bbTaperBrush(taperCount, canvasMiddleX-mouseX, mouseY, canvasMiddleX-pmouseX, pmouseY);
  }
  break;
case '4':
  console.log("4");  // long multicolor Brush
  bbPaintBrush(mouseX, mouseY, pmouseX, pmouseY);
  if (verticalMirror){
    bbPaintBrush(mouseX, height-mouseY, pmouseX, height-pmouseY);

  }
  else if(horizontolMirror){
    bbPaintBrush(canvasMiddleX-mouseX, mouseY, canvasMiddleX-pmouseX, pmouseY);
  }
  break;
case '5':
  console.log("5");  // Eraser
  eraser(bgc,mouseX, mouseY,pmouseX, pmouseY);
  if (verticalMirror){
    eraser(bgc, mouseX, height-mouseY, pmouseX, height-pmouseY);

  }
  else if(horizontolMirror){
    eraser(bgc, canvasMiddleX-mouseX, mouseY, canvasMiddleX-pmouseX, pmouseY);
  }
   break;


default:
  console.log("Nothing")
}

}

//#region ###### BRUSH TYPES ###### 

// default draw line with custom size from new code
function drawline( k,  lx, ly,  px, py) {
  stroke(k);
  strokeWeight(strokeSize);1
  line(lx, ly, px, py);
  // console.log(mouseX);
  // console.log(pmouseX);
}

// Creates an Outline around the stroke, probably not inovative enought sorry
function bbOutlineLine( currentColor,  lx, ly,  px, py) {
  // Big
  strokeWeight(strokeSize+5)
  stroke(compColor)
  line(lx,ly,px,py);
  // Small
  strokeWeight(strokeSize);
  stroke(currentColor);
  line(lx, ly, px, py);

}

// goes off of min stroke size and current stroke size to make a wierd looking tube
function bbTaperBrush(taperCount, lx, ly,  px, py) {

  strokeWeight(taperCount);
  stroke(colorGrade);
  line(lx, ly, px, py);
}

//Creates multiple lines at a low transparency
function bbPaintBrush(lx,ly,px,py){
  strokeWeight(strokeSize)
  rando = random(-40,40)
  stroke(colorR+rando,colorG-rando,colorB)

  for(let i = 0; i < 10; i++){
    lineWidth = i*(strokeSize/4)
    line(lx+lineWidth, ly+lineWidth, px+lineWidth,py+lineWidth)
  }
}


function eraser( k, lx, ly, px, py) {
  strokeWeight(strokeSize);
  stroke(k);
  line(lx, ly, px,py);
}

//#endregion
