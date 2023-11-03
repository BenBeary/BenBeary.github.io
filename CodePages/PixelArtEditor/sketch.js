


let gridSize = 40; // size of squares should adjust to canvas size and gridAmount
let gridAmount = 10; // how many squares in array
let gridArray = []

let colorSelected;

let canvasSizeSet = false;
let arrow_Left;
let arrow_right;
let replaceMode = false;

let editorTab = 300;
let canvas;
let seperator = ', ';


let keyDown = false;
let buttonClicked = false;

let colorsOnTheBoard = [];
let columnSize = 3;

// EDITOR
let ColorR = 150;
let ColorG = 150;
let ColorB = 150;

// input scripting
let inputPosition = 0;

function preload(){
    arrow_Left = loadImage("assets/Arrow_Left.png");
    arrow_Right = loadImage("assets/Arrow_Right.png");
}

function setup() {
    createCanvas(800,800);
    background(50);
    
    colorSelected = color(ColorR,ColorG,ColorB);
    colorsOnTheBoard.push(colorSelected);
    //createPixelLayout();
   // noLoop()
}


function draw() {
    if (keyCode === ENTER && keyIsPressed) {
        inputPosition = 0
    }


    if (!canvasSizeSet) {
        setUpCanvas();
    }
    else {

        for(let i = 0; i < gridAmount; i++){
            for (let j = 0; j < gridAmount; j++){
                push()
                
                gridArray[i][j].Update();
                
                checkForNewColors(gridArray[i][j].currentColor);

                pop()
            }
            
         }

         Editor();
         clearUnusedColors();
    }

    
}

function clearUnusedColors(){

    

    for(let c = 0; c < colorsOnTheBoard.length; c++){
        let colorIsUsed = false;
        for(let i = 0; i < gridAmount; i++){
            for(let j = 0; j < gridAmount; j++){

                if(str(colorsOnTheBoard[c]) === str(gridArray[i][j].currentColor)){
                    colorIsUsed = true;
                    break;
                }
            }
        }

        if (!colorIsUsed){
            colorsOnTheBoard.splice(c,1);
            console.log("Removed Color From Board");
        }
    }


}

function checkForNewColors(checkColor){

    let notOnList = true;

    for(let i = 0; i < colorsOnTheBoard.length; i++ ){

        if(str(colorsOnTheBoard[i]) === str(checkColor)) { // if the color is on the list, break
            
            notOnList = false;
            break;
        }
    }

    if (notOnList) {
        colorsOnTheBoard.push(checkColor);
        //console.log("Current Colors: " + colorsOnTheBoard);
    }

}


function setUpCanvas(){

    let movement = createVector(0,0)
    push()
    rectMode(CENTER)
    fill(150)
    translate(width/2, height/2)
    movement.add(width/2, height/2)

    rect(0, 0, 500,300)

    fill(0)
    textSize(30)
    textStyle(BOLD)
    translate(-200,0)
    movement.add(-200,0);
    
    text("Grid Size:", 0,0)
    text(gridAmount, 280,0)
    push()
    rectMode(CORNER)
    drawButton(200,-30,40,40,arrow_Left);
    drawButton(350,-30,40,40,arrow_Right);

    rect(0,50,400,80,15);
    textSize(40);
    fill(0);
    text("Create Grid", 90,105);
    pop()

    if(!buttonClicked && inButton(movement.x + 200, movement.y - 30,40,40)){
        
        if (gridAmount > 5)
        {
            gridAmount--;
        }
        buttonClicked = true;
    }
    if(!buttonClicked && inButton(movement.x + 350, movement.y - 30,40,40)){
        
            gridAmount++;
        buttonClicked = true;
    }
    if(!buttonClicked && inButton(movement.x, movement.y + 50, 400, 80)){

        
        createPixelLayout();
        canvasSizeSet = true;

    }

    pop();
}

function Editor(){
    let movement = createVector(0,0)
    eCanvas = width - editorTab;
    push()
    translate(eCanvas,0)
    movement.add(eCanvas,0)
    push()
    fill(50)
    rect(0,0,editorTab,height)
    pop()

    push()
    fill(colorSelected);
    rect(50,50,200,200)
    pop()
    push()
    translate(0,250);
    movement.add(0,250);
    textSize(30);

    fill(255)
    text("R",50,65)
    text("G",50,115)
    text("B",50,165)



    // Color Input Code
    if (inputPosition == 1) {
        push()
        fill(50,100);
        rect(230,38,60,34);
        pop()
        ColorR = ValueInput(ColorR,createVector(235,40),30,255);
    }
    else {
        push()
        fill(100,100)
        rect(230,38,60,34);
        pop()
        text(ColorR,235,65)
    }
    if (inputPosition == 2) {
        push()
        fill(50,100);
        rect(230,88,60,34);
        pop()
        ColorG = ValueInput(ColorG,createVector(235,90),30,255);
    }
    else {
        push()
        fill(100,100)
        rect(230,88,60,34);
        pop()
        text(ColorG,235,115)
    }
    if (inputPosition == 3) {
        push()
        fill(50,100);
        rect(230,138,60,34);
        pop()
        ColorB = ValueInput(ColorB,createVector(235,140),30,255);
    }
    else {
        push()
        fill(100,100)
        rect(230,138,60,34);
        pop()
        text(ColorB,235,165)
    }
    if (!buttonClicked && inButton(movement.x + 230,movement.y+38,60,34)){
        inputPosition = 1;
        buttonClicked = true;
    }
    if (!buttonClicked && inButton(movement.x + 230,movement.y+88,60,34)){
        inputPosition = 2;
        buttonClicked = true;
    }
    if (!buttonClicked && inButton(movement.x + 230,movement.y+138,60,34)){
        inputPosition = 3;
        buttonClicked = true;
    }




    textSize(25)
    text("Replace Color",50, 215)

    if (!buttonClicked && inButton(movement.x + 230,movement.y + 188, 40,40)){
        buttonClicked = true;
        replaceMode = !replaceMode
    }
    if (replaceMode){
        push()
        fill (150)
        rect(230,188,40,40,5)
        fill(0);
        textStyle(BOLD);
        text("X",242,217)   
        pop()        
    }
    else {
        rect(230,188,40,40,5)
    }   

    pop()
    pop()

    ColorR = round(sliderAreaCreator(movement.x + 100,movement.y + 50,100,30,ColorR,2.55));
    ColorG = round(sliderAreaCreator(movement.x + 100,movement.y + 100,100,30,ColorG,2.55));
    ColorB = round(sliderAreaCreator(movement.x + 100,movement.y + 150,100,30,ColorB,2.55));
    colorSelected = color(ColorR,ColorG,ColorB);

    
    

    // Colors On The Board Show
    

    
    //console.log(colorsOnTheBoard.length + " Colors");
    
                        // Grid Space is 200 x 180 or 150 x 150 with out padding
    let column = 0;
    let row = 0;
    let squareSize =  150 / columnSize;
    let padding = squareSize + 10

    if (colorsOnTheBoard.length > columnSize*columnSize) {
        columnSize ++;
    }

    for(let i = 0; i < colorsOnTheBoard.length; i++){
        if (column >= columnSize){
            column = 0
            row ++;
        }
        
        push()
        fill(colorsOnTheBoard[i])
        rect(movement.x + 70 + padding*column, movement.y + 250 + padding*row, squareSize)
        if (!buttonClicked && inButton(movement.x + 70 + padding*column,movement.y + 250 + padding*row, squareSize, squareSize)){
            buttonClicked = true;
            ColorR = turnColorToString(colorsOnTheBoard[i], 0);
            ColorG = turnColorToString(colorsOnTheBoard[i], 1); 
            ColorB = turnColorToString(colorsOnTheBoard[i], 2);
            
        }
        pop()
        column ++;

        if (i >= columnSize*columnSize - 1){ // stop going
            break;
        }
    }

    
    push()
    fill(255)
    rect(movement.x + 50, movement.y + 470,200,60)
    fill(0)
    textSize(35)
    textStyle(BOLD)
    text("Print Code", movement.x + 65, movement.y + 512) 
    pop()
    if (!buttonClicked && inButton(movement.x + 50, movement.y + 470,200,60)){
        buttonClicked = true;
        codePrinter();
    }

}

function turnColorToString(changeThisColor, arrayPos){

    let temp = str(changeThisColor);
    temp = temp.split("(").pop(0); // Clear the rgba( from the thing for some reason XD
    temp = temp.split(",");
    temp.pop(); // Clear the Alpha for some reason
    
    return int(temp[arrayPos])

}

function createPixelLayout() {

    resizeCanvas(800+editorTab,800);
    
    gridSize = 800 / gridAmount
    

    
    for(let i  = 0; i < gridAmount; i++){

        gridArray[i] = []; // creates nested array
        
        for(let j = 0; j < gridAmount; j++){

            gridArray[i][j] = new pixel(j*gridSize,i*gridSize, gridSize, colorSelected)

        }

    }

}

function colorConvertToNumber(pos1, pos2){

    let temp;
    for(let i = 0; i < colorsOnTheBoard.length; i++){
        if(str(gridArray[pos1][pos2].currentColor) === str(colorsOnTheBoard[i])) {
            temp = i;
            break;
        }

    }
    
    return temp;

}

function codePrinter(){

    let list = [];
    let colorScript = [];

    colorScript[0] = "switch(a) {"; 

    for(let i = 0; i < gridAmount; i++){
        list[i] = "[";

        for(let j = 0; j < gridAmount; j++){
            list[i] += str(colorConvertToNumber(i,j)) + seperator
        }
        list[i] += "],";
    }
    list[list.length] = "";
    for(let i = 0; i < colorsOnTheBoard.length; i++) {
        let temp = "color(" + turnColorToString(colorsOnTheBoard[i],0) + ", " 
                    + turnColorToString(colorsOnTheBoard[i],1) + ", "
                    + turnColorToString(colorsOnTheBoard[i],2) + ")";

        colorScript[colorScript.length] =   "   case " + i + ":"
        colorScript[colorScript.length] =   "       fill(" + temp + ");"
        colorScript[colorScript.length] =   "       break;"
        list[list.length] = i + " = " + temp;
    }
    colorScript[colorScript.length] = "}"
    list[list.length] = "";
    for (let i = 0; i < colorScript.length; i++){
        list[list.length] = colorScript[i];
    }

    // console.log(list);
    saveStrings(list, "ColorArray.txt")
}

function mouseReleased(){

    buttonClicked = false;
}

function replaceColor(currentColor){

    for(let i = 0; i < gridAmount; i++ ){
        for (let j = 0; j < gridAmount; j++){

            if(str(gridArray[i][j].currentColor) === str(currentColor)) { // if array = color selected, change it to new color
                gridArray[i][j].currentColor = colorSelected;
            }
        }
    }
}

class pixel {


    position;
    size;
    currentColor;


    constructor (posX, posY, size, startColor){

        this.position = createVector(posX, posY);
        this.size = size;
        this.currentColor = startColor;
    }

    Update(){

        push()
        fill(this.currentColor)
        rect(this.position.x,this.position.y, this.size,this.size)
        pop()

        if(!replaceMode && inButton(this.position.x,this.position.y,this.size,this.size)){
            
            this.currentColor = colorSelected; 
        }
        else if (inButton(this.position.x,this.position.y,this.size,this.size)){
            replaceColor(this.currentColor);
        }

    }
}

function ValueInput(value, pos, size, maxValue){
    
    textSize(size);
    let input = str(value);
    let charWidth = textWidth(input);
    //console.log(charWidth);
    push()
    fill(0,255,0)
    strokeWeight(1)
    stroke(0)
    textAlign(LEFT,TOP);
    
    text(input, pos.x, pos.y);

    if(keyIsPressed){
        rect(pos.x + charWidth + size/15,pos.y - size/10, size/8, size);       
        if (!keyDown) {
            
            
            if (input.length < 3 && keyInputs() != null) {

                input += keyInputs();

            }
            if (keyCode === BACKSPACE){
                if (input.length == 1) {
                    input = "0"
                }
                else {
                    input = input.slice(0,-1);
                }
                keyDown = true;
            }
            if (maxValue && int(input) > maxValue) {
                input = maxValue;
            }


            pop()
            return int(input);
        }

    }
    else {
        keyDown = false;
    }
    pop()

    return value;
}


function keyInputs() {

    switch(key) {
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
        case '0':
            keyDown = true;
            return str(key);
        default:
            return null;
        }
            

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
    push()
    x2 += x1;
    y2 += y1;
  
    offset = (y1-y2)*-1 /2;
  
    fill(100)
    rect(x1, y1, (x1-x2)*-1, (y1-y2)*-1 - offset, 10);
    fill(255)
    rect(x1,y1,newValue/division,(y1-y2)*-1 - offset,10)

    if (mouseIsPressed && mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2){
      ellipse(mouseX, y1+offset/2,y2 - y1, y2 - y1);
      //console.log(newValue);
      pop()
      // changes to new value
      return (mouseX-x1)*division
    }
    else {
      // move circle to color value reduced
      ellipse(x1 + newValue/division, y1+offset/2, offset*2,offset*2);
      pop()
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