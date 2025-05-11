
let TopSection = 50;
let ShopSection = 200;
let ConsoleSection = 200;
let mouseDown = false;
let lastMousePos;
let errorName = [];
let screenSizeChange = false;


// Game Variables 

let gameIsPlaying = false;
let playerPasswordInput = null; // position updated in Game.updateWindow()
let playerPassword = "";
let errorTags = [];
let PasswordStrength = 0; // base health;
let minHealth = 4;
let healthcounter = 5;
let newGamePlus = false;


//#region Window Resizing
window.addEventListener('resize', onWindowResize, false);
function onWindowResize(){
    resizeCanvas(window.innerWidth, window.innerHeight);
    console.log("Canvas Resized");
    screenSizeChange = true;
}
//#endregion



function keyPressed(){
  
  if(!gameIsPlaying){
    console.log("stopped here")
    return;
  }
  if (keyCode === ENTER && playerPassword.length == 0){
    let temp = playerPasswordInput.value();

    PasswordChecker(temp);
  }
}

function PasswordChecker(item){
  //#region Error Stoppers
  errorTags = [];
  const badChars = ",.<>/:;'\"[]}{=+()\\|"
  const goodChars = "-_`~!@#$%^&*"
  // List of commonly used patterns to check
  const commonPatterns = [
    '1234', '12345', '123456', '1234567', '12345678', '123456789', 
    'qwerty', 'asdf', 'password', 'abc', '1111', 'admin', 'letmein', 'welcome'
];

  if(item.length < 4){
    errorTags.push("Password too short")
  }
  else if(item.length > 12){
    errorTags.push("Password too long")
  }
  
  if(item.indexOf(' ') > 0){
    errorTags.push("Has Spaces")
  }
  
  
  
  //#endregion
  
  //#region health System
  PasswordStrength = 0
  let repeatingChars = 0;
  for (let pattern of commonPatterns) {
    if (item.includes(pattern)) {
        
        PasswordStrength -= pattern.length - 1; // Deduct points if a common pattern is found
    }
  }
  for(let i = 0; i < item.length; i++){

    // check if same letters
    if(i > 0 && item.charAt(i-1) == item.charAt(i)){
      PasswordStrength -= repeatingChars;
      repeatingChars++;
    }
    else {
      repeatingChars = 0;
    }
    // check if char is a number
    if(!isNaN(parseInt(item.charAt(i),10))){ 
      PasswordStrength ++;
    }
    // check if char is a special char
    if(badChars.includes(item.charAt(i))){
      errorTags.push("illegal Char")
      break;
    }
    else if(goodChars.includes(item.charAt(i))){
      PasswordStrength++;
    }

    // add 1 for each char
    PasswordStrength++;
  }

  
  if(errorTags.length > 0){
    errorTags.unshift("Error:")
    console.log(errorTags);
  }
  else {
    playerPassword = item;
    if(PasswordStrength < minHealth) PasswordStrength = minHealth;
    console.log("Password Set: " + playerPassword);
    console.log("Password Strength: " + PasswordStrength);
    playerPasswordInput.hide();
    healthcounter = PasswordStrength;
  }
}



function Intro() {
  
  let counter = 0;

  this.setup = function(){
    gameIsPlaying = false;
    createCanvas(window.innerWidth,window.innerHeight)
  }


  this.draw = function() {
    push()
      background(30,30,40);
      fill(255)
      textSize(75);
      textAlign(CENTER,CENTER);
      textStyle(BOLD)
      text("Password Protector", width/2,200)
      textSize(40)
      if(newGamePlus) text("New Game+", width/2, 275)
      fill(150,150,255);
      textStyle(NORMAL)
      textSize(22)
      push()
        let currentName = "Play Game"
        let lineW = textWidth(currentName)/2;
        translate(0,-50)
        text(currentName,width/2,400)
        stroke(150,150,255)
        line(width/2-lineW,410,width/2+lineW,410)
        noStroke()
        currentName = "Instructions"
        lineW = textWidth(currentName)/2;
        text(currentName,width/2,450)
        stroke(150,150,255)
        line(width/2-lineW,460,width/2+lineW,460)
        noStroke()
        currentName = "Statement"
        lineW = textWidth(currentName)/2;
        text(currentName,width/2,500)
        stroke(150,150,255)
        line(width/2-lineW,510,width/2+lineW,510)
      pop()

      currentName = "Play Game"
      lineW = textWidth(currentName)/2;
      if(inButton(width/2-lineW,330,lineW*2,30)){ // GAME BUTTON
        if(!mouseDown){
          sceneMan.showScene(Game);
          gameIsPlaying = true;
          if(playerPasswordInput != null) playerPasswordInput.show();
          mouseDown = true;
          if(!buttonSFX.isPlaying()){
            buttonSFX.play()
          }
        }
      }
      currentName = "Instructions"
      lineW = textWidth(currentName)/2;
      if(inButton(width/2-lineW,380,lineW*2,30)){
        if(!mouseDown){
          sceneMan.showScene(Instructions)
          mouseDown = true;
          if(!buttonSFX.isPlaying()){
            buttonSFX.play()
          }
        }
      }
      currentName = "Statement"
      lineW = textWidth(currentName)/2;
      if(inButton(width/2-lineW,430,lineW*2,30)){
        if(!mouseDown){
          sceneMan.showScene(Statement)
          mouseDown = true;
          if(!buttonSFX.isPlaying()){
            buttonSFX.play()
          }
        }
      }
    pop()

    // File Icon Pictures
    push()
    translate(width/6,380)
    counter++;
    rotate(radians(sin(counter/30)*10))
    imageMode(CENTER)
    image(sadIcon,0,0,150)
    pop()
    push()
    translate(width-(width/6),380)
    rotate(radians(sin(-counter/30)*10))
    imageMode(CENTER)
    image(happyIcon,0,0,150)
    pop()
  }

}

  /* Color Values
  * 15,15,20    |   Black Blue    | Game Background?
  * 25,25,35    |   Dark Blue     | Console Background
  * 30,30,40    |   Navy Blue    *| BASE COLOR
  * 50,50,60    |   Dark Grey     | Shop bg
  * 90,90,95    |   Grey          | Button Highlight
  * 240,200,90  |   Yellow        | Text Color
  * 
  * 
  */

function Game(){

  



  //#region VARIABLES
  let pathLength = 0;
  let basePathLength = 1000;
  
  let gameArea = createVector(width - ShopSection, height - TopSection)

  let currentEnemies = []; // enemies in play
  let currentTowers = []; // towers in play
  let selectedTower = null; // trying to build
  
  let Currency = 10; // Buying towers
  let waveMax = 5; // Waves Left Obv
  let waveCur = -1;
  let waveData = [] // holds JSON data for waves
  
  let gameStart = false // once start button clicked 

  // None interactive Vars

  let baseCol;
  let size = 100;


  let counter = 0;
  let threatCounter = 0;

  // Scroll Bars
  let shopScrollBar;


  //#region Password Creator Variables (Moved to global Variables)

  let mapLinePoints = []; // data for pathing enemies (OG idea is to have a winding path)
  let towerSpawns = createVector(3,5); // range of tower locations the line will spawn
  let threatLevel = 1; // incrementing over time to the point of impossible difficulty
  //#endregion
  
  function updateWindow(){


    shopScrollBar.UpdateBounds(width-35,TopSection+30,30,height-TopSection-60);
    if(playerPasswordInput != null) playerPasswordInput.position(width/2 - playerPasswordInput.width/2,height/2-75);

    let pathBuildSize = gameArea.x / 5
    for(let i = 0; i < mapLinePoints.length; i++){

      mapLinePoints[i].UpdatePath(createVector(pathBuildSize/2 + (pathBuildSize * i), TopSection),gameArea.y-TopSection-size)
    }


  }


  this.setup = function() {
    gameArea = createVector(width - ShopSection, height - TopSection)
    gameIsPlaying = true;
    playerPassword = "";

    createCanvas(window.innerWidth,window.innerHeight)
    textAlign(CENTER, CENTER);
    ellipseMode(CENTER)
    textSize(14)
    textStyle(BOLD);
    lastMousePos = createVector(mouseX,mouseY);
    shopScrollBar = new vertScrollBar(width-35,TopSection+30,30,height-TopSection-60)
    
    //#region Password Creator Setup #####################

    playerPasswordInput = createInput();
    playerPasswordInput.attribute("placeholder", "Set Password Here")
    playerPasswordInput.position(width/2 - playerPasswordInput.width/2,height/2-75);
    playerPasswordInput.style("width",300);
    playerPasswordInput.style("height",30)
    playerPasswordInput.style("font-size",20)
    playerPasswordInput.style("color",color(255,255,255))
    playerPasswordInput.style("background-color", color(15,15,20 ))
    playerPasswordInput.style("outline-style", "solid")
    playerPasswordInput.style("outline-color", color(50,50,60 ))
    playerPasswordInput.style("text-align", "center")
    //#endregion

    updateWindow();

    sec = second();
  
    gridSize = createVector(10,10)
    baseCol = color(50,50,60);
    secCol = color(255 - baseCol.r, 255 - baseCol.g, 255 - baseCol.b);
  
    
    // createPath();
    // LOADING WAVE DAT
    for(let i = 0; i < _itemLib.WaveDat.length; i++){
      waveData.push({... JSON.parse(JSON.stringify(_itemLib.WaveDat[i]))});
    }
  }
  
  this.draw = function() {
    background(0)
    if(screenSizeChange){
      screenSizeChange = false;
      updateWindow();
    }
    gameArea = createVector(width - ShopSection, height - TopSection)
    
    
    waveManager();

    for(let mapDat of mapLinePoints){
      mapDat.Render()
    }

    
    
    currentTowers.forEach(function(item){
      item.BuildingRender();
      if(selectedTower != null){
        item.Building.showRange = true;
      }
      else {
        item.Building.showRange = false;
      }
    });
 

    
    
  
    if(selectedTower != null){
      selectedTower.pos = createVector(mouseX,mouseY)
      selectedTower.Render();
    }
    if(playerPassword.length > 0) { AddEnemyLines(); }
    
    
    EnemyManager();
    drawShopPanel();
    drawTopPanel();
    shopScrollBar.Render()
    if(playerPassword.length > 0) { drawPasswordBoxes(); }
    
    if(playerPassword.length == 0) { drawPasswordStart(); }

    if(!mouseDown){
      lastMousePos = createVector(mouseX,mouseY);
    }
  }
  



  function drawPasswordStart(){
    push()
      push()
        fill(0,0,0,230)
        rect(0,0,width,height); // darken screen
      pop()
      rectMode(CENTER)
      fill(30,30,40)
      rect(width/2,height/2, playerPasswordInput.width + 25) // bg square
      textAlign(CENTER, CENTER)
      fill(240,200,90)
      textSize(dynamicText("Set your Password to Begin",playerPasswordInput.width))
      text("Set your Password to Begin",width/2,height/2 - playerPasswordInput.width/2 + 25)
      text("(4 - 12 Characters)",width/2,height/2 - playerPasswordInput.width/2 + 50)
      pop()
      

      if(errorTags.length == 0) {return;}
      let spaceBetween = 0;
      let padding = 10;
      for(let i = 0; i < errorTags.length; i++){
        textSize(dynamicText("Set your Password to Begin",playerPasswordInput.width)) // shit doesnt carry over to for loops rip
        fill(240,200,90)
        if(i > 0) fill(255,120,120)
        text(errorTags[i],width/2, height/2 - playerPasswordInput.width/2 + 125 + spaceBetween)
        spaceBetween += 25 + padding;
      }
    
  }

  function AddEnemyLines(){
    // add new line based on every 5 threatLevels
    // max of 5 lines? idk probably just hard code
    if(threatLevel > 20) return;
    let pathBuildSize = gameArea.x / 5
    if(Math.floor(threatLevel/5) >= mapLinePoints.length) { // spawn new line
      console.log("Adding Path " + (mapLinePoints.length+1) + " | Threat Level: " + threatLevel)
      mapLinePoints.push(new lineData(createVector(pathBuildSize/2 + (pathBuildSize * mapLinePoints.length), TopSection),gameArea.y-TopSection-size))

      let amountOfTowers = Math.floor(Math.random() * (towerSpawns.y - towerSpawns.x)) + towerSpawns.x;
      
      mapLinePoints[mapLinePoints.length-1].AddTowerSlot(amountOfTowers)
      
      pathLength = mapLinePoints[0].endPos.y - mapLinePoints[0].startPos.y
    }
  }


  function drawPasswordBoxes(){
    
    let padding = 10;
    let boxSize = 150 

    push()
      fill(25,25,35)
      rect(20,gameArea.y - boxSize, gameArea.x - 40, boxSize)
      fill(15,15,20)
      rect(20+10,gameArea.y - boxSize+10, gameArea.x - 40-20, boxSize - 20)
      
      fill(240,200,90)
      textSize(dynamicText("%%",boxSize))
      
      // Change size to fit if bigger than box container
      if(textWidth(playerPassword) > gameArea.x - 70){
        textSize(dynamicText(playerPassword, gameArea.x - 70))
      }
      
      text(playerPassword, gameArea.x/2,gameArea.y - boxSize/2 + 10)
    pop()
    
    // for (let i = 0; i < 6; i++){
      
    //   fill(25,25,35);
    //   rect(20  + (boxSize+padding)*i, gameArea.y - 20 - boxSize, boxSize);
    //   fill(15,15,20)
    //   rect(20  + (boxSize+padding)*i + 10, gameArea.y - 20 - boxSize + 10, boxSize-20);
    //   fill(240,200,90)
    //   let currentText = null;
    //   // 0 * 2 = 0 || 1 * 2 = 2 || 2 * 2 = 4 || 3 * 2 = 6
    //   if(i*2 >= playerPassword.length) continue;
    //   else if(i*2+1 >= playerPassword.length){
    //     currentText = playerPassword.charAt(i*2)
    //   }
    //   else {
    //     currentText = playerPassword.charAt(i*2) + playerPassword.charAt(i*2+1)
    //   }
    //   textSize(dynamicText("&&",boxSize-40))
    //   text(currentText,20  + (boxSize+padding)*i + boxSize/2, gameArea.y - 20 - boxSize + boxSize/2 + 10)
    // }

  }



  function drawTopPanel(){
    push()
    fill(25,25,35)
    rect(0,0,width,TopSection);
    fill(240,200,90)
    textSize(25)
    textAlign(LEFT,CENTER)
    translate(0,TopSection/2)
    
    if(gameStart == false){
      push()
      fill(50,50,60);
      rect(width/2 - textWidth("Start"),-TopSection/2, 100,50)
      fill("white")
      text("Start",width/2- 35,0);
      if(playerPassword.length > 0 && inButton(width/2- textWidth("Start"),0,100,50)){
        if(!mouseDown){
          gameStart = true
          waveCur++; 
          for(let item in waveData){
            item.curTime = second()
          }
          mouseDown = true;
        }
      }


      pop()
    }

    text("Money: " + Currency,10,0)
    text("Health: " + healthcounter, 30 + textWidth("Money: 0000"), 0)
    text("Threat Level: " + Math.floor(threatLevel/5+1), 60 + textWidth("Money: 0000") + textWidth("Health: 00"),0)
    textAlign(CENTER,CENTER)
    text("Shop",width-100,0)
    pop()
  }
  
  function drawShopPanel(){
    push()
    translate(width-ShopSection,TopSection);
    fill(30,30,40)
    rect(0,0,ShopSection,height)
  
    fill(50,50,60)
    rect(10,20,ShopSection-10,height-TopSection-40)
    translate(20,30)
    fill(70,70,75)
  
    let itemSize = 140;
    let padding = 10;
    let maxAmountItemsOnScreen = Math.floor((height-TopSection-50) / (itemSize+padding))
    let newGameTowersAmount = 0;
    if(newGamePlus == true) newGameTowersAmount = _itemLib.NewGameTowers.length

    for(let i = 0; i < _itemLib.Towers.length; i++){
      if(_itemLib.Towers.length > 3){ // only use this if we have more than 3 items
        // hide stuff outside shop
        if((i+1)*itemSize - shopScrollBar.getValue() < TopSection-50 ||
           i*itemSize - shopScrollBar.getValue() > height - itemSize){
          continue;
        }
  
      }
      push()
        if(playerPassword.length > 0 && inButton(width-ShopSection+20,TopSection+30+(itemSize+padding)*i - shopScrollBar.getValue(),itemSize,itemSize)){
          if(!mouseDown && _itemLib.Towers[i].cost <= Currency){
            // add functions here
            console.log("Bought Tower");
            selectedTower = new tower(_itemLib.Towers[i]);
          }
          fill(90,90,95)
        }
        rect(0,(itemSize+padding)*i - shopScrollBar.getValue(),itemSize)
        fill(200)
        rectMode(CENTER)
        textSize(dynamicText(_itemLib.Towers[i].name,itemSize-40))
        // textSize(20)
        let temp = color(_itemLib.Towers[i].objCol[0],_itemLib.Towers[i].objCol[1],_itemLib.Towers[i].objCol[2])
        fill(temp)
        text(_itemLib.Towers[i].name,itemSize/2,(itemSize+padding)*i+itemSize/2 - shopScrollBar.getValue(),itemSize-40)
        
        textSize(20)
        fill(240,200,90)
        text("Cost: " + _itemLib.Towers[i].cost,itemSize/2,(itemSize+padding)*i+itemSize-15 - shopScrollBar.getValue())
      pop()
    }
    if(newGamePlus == true){
      for(let j = 0; j < _itemLib.NewGameTowers.length; j++){
        push()
          if(playerPassword.length > 0 && inButton(width-ShopSection+20,TopSection+30+(itemSize+padding)*(_itemLib.Towers.length+j) - shopScrollBar.getValue(),itemSize,itemSize)){
            if(!mouseDown && _itemLib.NewGameTowers[j].cost <= Currency){
              // add functions here
              console.log("Bought Tower");
              selectedTower = new tower(_itemLib.NewGameTowers[j]);
            }
            fill(90,90,95)
          }
          rect(0,(itemSize+padding)*(_itemLib.Towers.length+j) - shopScrollBar.getValue(),itemSize)
          fill(200)
          rectMode(CENTER)
          textSize(dynamicText(_itemLib.NewGameTowers[j].name,itemSize-40))
          // textSize(20)
          let temp = color(_itemLib.NewGameTowers[j].objCol[0],_itemLib.NewGameTowers[j].objCol[1],_itemLib.NewGameTowers[j].objCol[2])
          fill(temp)
          text(_itemLib.NewGameTowers[j].name,itemSize/2,(itemSize+padding)*(_itemLib.Towers.length+j)+itemSize/2 - shopScrollBar.getValue(),itemSize-40)
          
          textSize(20)
          fill(240,200,90)
          text("Cost: " + _itemLib.NewGameTowers[j].cost,itemSize/2,(itemSize+padding)*(_itemLib.Towers.length+j)+itemSize-15 - shopScrollBar.getValue())
        pop()
      }
    }        
    if(_itemLib.Towers.length + newGameTowersAmount > maxAmountItemsOnScreen){
      shopScrollBar.reduceSize = (((_itemLib.Towers.length+newGameTowersAmount)-maxAmountItemsOnScreen)*itemSize+padding*((_itemLib.Towers.length+newGameTowersAmount)- maxAmountItemsOnScreen))
      // console.log(shopScrollBar.reduceSize)
    }
    else { shopScrollBar.reduceSize = 0;}
  
  
  
  
    push()
    noStroke();
    fill(30,30,40)
    rect(-20,-30,ShopSection,20)
    rect(-20,height-TopSection-50,ShopSection,20)
    pop()
    pop()
  }
  
  // Displays What Enemies are on the board
  function EnemyManager(){

  
    let row = 0;
    currentEnemies.forEach(function(obj){
      
  
      if(obj.finishedPath){
        healthcounter--;
        if(healthcounter == 0){
          ResetScene();
          loseSFX.play()
          sceneMan.showScene(FailedEnd);
          gameIsPlaying = false;
        }
        currentEnemies.splice(row,1)
      }
      else if(obj.health <= 0){
        currentEnemies.splice(row,1);
        DeathSFX[int(random(0,DeathSFX.length))].play()
        counter++;
        threatCounter++;
        if(counter == 3){
          Currency++
          counter = 0;
          CoinSFX.play();
        }
        if(threatCounter == 4){
          threatLevel++;
          threatCounter = 0;
        }
      }
      obj.Render();
      row++
    })
    
    
    
    
  }
  
  function waveManager() {
  
    switch(waveCur){
      case -1:
        //console.log("Game Not Started");
        return;
      case waveData[0].count.length:
        console.log("waves Complete");
        sceneMan.showScene(WinEnd);
        newGamePlus = true;
        gameIsPlaying = false;
        ResetScene();
        winSFX.play();
        return;
    }
  
    
    let waveFin = 0;
    // console.log(waveData)
    for(let i = 0; i < waveData.length; i++){
  
      let dif = second()-waveData[i].curTime;
      if(second() < waveData[i].curTime){
        dif = second() - (waveData[i].curTime-60)
      }

      let difficultyScale = waveData[i].delay - (Math.floor(threatLevel/5)/10);
      if(difficultyScale > 0.5) difficultyScale = 0.5

      if(dif >= difficultyScale && waveData[i].count[waveCur] > 0){
        // enemy spawning?
        let randPath = Math.floor(Math.random() * mapLinePoints.length) 
        currentEnemies.push(new enemy(mapLinePoints[randPath].startPos,mapLinePoints[randPath].endPos, _itemLib.Enemies[i]))
        waveData[i].count[waveCur]--;
        waveData[i].curTime = second();
      }
      else if(waveData[i].count[waveCur] <= 0){
        waveFin ++;
      }
    }
    // console.log(waveFin)
    if(waveFin == waveData.length && currentEnemies.length == 0){
      waveCur++;
      // console.log(waveCur)
      for(let item in waveData){
        item.curTime = second()
      }
    }
    
  }
  
  function ResetScene(){
    playerPasswordInput.unhid
    playerPassword = ""
    currentEnemies = []; // enemies in play
    currentTowers = []; // towers in play
    selectedTower = null; // trying to build
    gameStart = false 
    gameIsPlaying = true;
    Currency = 10; // Buying towers
    waveMax = 5; // Waves Left Obv
    waveCur = -1;
    waveData = [] // holds JSON data for waves
    
    counter = 0;
    healthcounter = 5;


    mapLinePoints = [];
    threatLevel = 1;

    // createPath();
    
    for(let i = 0; i < _itemLib.WaveDat.length; i++){
      waveData.push({... JSON.parse(JSON.stringify(_itemLib.WaveDat[i]))});
    }


  }
  

  class lineData { 
    constructor(startPos, length){
      this.startPos = startPos
      this.endPos = createVector(startPos.x,startPos.y + length)
      this.tileData = [];
    }

    Render() {
      push()
        stroke("red")
        strokeWeight(10)
        line(this.startPos.x,this.startPos.y,this.endPos.x,this.endPos.y);
      pop()

      for(let tile of this.tileData){
        tile.Render()
      }
    }

    AddTowerSlot(amount){

      for(let i = 0; i < amount; i++){
        this.tileData.push(new TileData(createVector(0,0),color(50,50,60),false,true))
      }

      let length = this.endPos.y - this.startPos.y 
      let towerDistances = (length-size) / this.tileData.length

      for(let i = 0; i < this.tileData.length; i++){
        this.tileData[i].UpdatePosition(createVector(this.startPos.x - size - 10, towerDistances * i + size+10));
      }
    }

    UpdatePath(newPos, length){
      this.startPos = newPos
      this.endPos = createVector(this.startPos.x,this.startPos.y + length)

      let towerDistances = (length-size) / this.tileData.length

      for(let i = 0; i < this.tileData.length; i++){
        this.tileData[i].UpdatePosition(createVector(this.startPos.x - size - 10, towerDistances * i + size+10));
      }
    }

  }


  class enemy {
    constructor(startPos, pathEnd, EnemyDat){
      this.pos = createVector(startPos.x,startPos.y);
      this.target = createVector(pathEnd.x,pathEnd.y);
      this.health = EnemyDat.hp;
      this.speed = (EnemyDat.speed / 10) / (basePathLength/pathLength);
      this.color = color(EnemyDat.objCol[0],EnemyDat.objCol[1],EnemyDat.objCol[2]);
      this.maxHealth = this.health;
    
      this.finishedPath = false;
      this.pathDistanceRemaining = pathLength;
      
    }
  
    Render(){
      
      push()
 
      // translate(this.pos.x,this.pos.y);
      this.followPath();

      
      

      fill(this.color);
      ellipseMode(CENTER)
      ellipse(this.pos.x,this.pos.y, 10 + this.maxHealth*3)
      

      pop()
    }
  
    followPath(){
      //console.log(MoveTowards(this.pos,this.target,this.speed) + " | " + this.pos.y + " / " + this.target.y);
      let prevPos = createVector(this.pos.x,this.pos.y);
      this.pos.add(MoveTowards(this.pos,this.target,this.speed));
      this.pathDistanceRemaining -= abs(prevPos.x - this.pos.x) + abs(prevPos.y - this.pos.y);
  
      if(MoveTowards(this.pos,this.target,this.speed) == 0){
        this.finishedPath = true;
      }
      
    }
  
  }
  
  class tower {
  
    constructor(towerData) {
  
      this.name = towerData.name;
      this.cost = towerData.cost;
      
      this.allowToShoot = false;
      this.damage = towerData.damage * 2;
      this.range = towerData.range / (basePathLength/pathLength);
      
      this.hasFired = false;
      this.speed = (towerData.shootSpeed*1000) / ((basePathLength/pathLength)/2); // fireRate
      this.bulletText = towerData.bulletText;
      this.showRange = true;
      this.bulletsInplay = [];
      
      this.TowCol = color(towerData.objCol[0],towerData.objCol[1],towerData.objCol[2])
      this.pos;
  
      this.bulletDat = {
        name: towerData.bulletText,
        speed: 30 / (basePathLength/pathLength) + this.damage*2,
        color: color(towerData.bulCol[0],towerData.bulCol[1],towerData.bulCol[2]),
        damage: this.damage
      }
    }
    
    Render(){
      push()
      rectMode(CENTER,CENTER)
      
      this.TowerAI() // shows range and checks for shooting
      
      textSize(dynamicText(this.name,size-2));
      fill(this.TowCol)
      text(this.name,this.pos.x,this.pos.y,size-size/4);
      pop()
    }
  
    TowerAI(){
      // Range UI
      if(this.showRange){
        noStroke()
        fill(0,255,0,40);
        if(!this.allowToShoot){
          fill(255,255,0,40)
        }
        
        rect(this.pos.x, this.pos.y, size*this.range, size*this.range);
      }
  
      // SHOOTING
      if(this.allowToShoot && !this.hasFired){ 
        if(this.TowerCheck()){
          this.hasFired = true;
        }
      }
  
      // Bullet Updates
      for(let i = 0; i < this.bulletsInplay.length; i++){
        let bul = this.bulletsInplay[i];
        bul.Render();
        if(bul.hitTarget){
          bul.target.health -= this.damage;
          this.bulletsInplay.splice(i,1);
        }
      }
  
    }
  
  
    TowerCheck(){
      
      let targetEnem = {pathDistanceRemaining: pathLength}; // grab the enemy that is the furthest in the trail
      // find the furthest down the path within range
      for(let curEnem of currentEnemies) {
  
          let distence = createVector(abs(this.pos.x - curEnem.pos.x), abs(this.pos.y - curEnem.pos.y)); 
          if(distence.x < (this.range*size)/2 && distence.y < (this.range*size)/2 ){
            if(curEnem.pathDistanceRemaining < targetEnem.pathDistanceRemaining)
            targetEnem = curEnem;
          }
      }
      if(targetEnem.pathDistanceRemaining == pathLength){
        // console.log("false")
        return false;
      }
  
  
      this.bulletsInplay.push(new bullet(this.bulletDat,this.pos,targetEnem))
      setTimeout(() => {
              this.hasFired = false;
      },this.speed)
      
      return true;
    }
  
  }
  
  class bullet {
    constructor(bulDat, pos, target){
      this.speed = bulDat.speed / 10;
      this.name = bulDat.name;
      this.bulCol = bulDat.color;
      this.size = bulDat.damage;
      
      this.pos = createVector(pos.x,pos.y);
      this.target = target;
      
      this.hitTarget = false;
    }
  
    Render(){
  
      this.pos.add(MoveTowards(this.pos,this.target.pos,this.speed));
      push()
      //textSize(dynamicText(this.name,size));
      noStroke()
      fill(this.bulCol)
      ellipseMode(CENTER)
      ellipse(this.pos.x,this.pos.y, 15 + this.size*3)
      //text(this.name,this.pos.x,this.pos.y)
      pop()
  
      if(MoveTowards(this.pos,this.target.pos,this.speed) == 0) {
        this.hitTarget = true;
      }
  
    }
  }
  
  
  class TileData {
  
    constructor(startPos,tileColor,isRoad,isBuildable){
  
      this.pos = startPos
      

      this.tileColor = tileColor;
      this.isRoad = isRoad; // Enemy moves here;
      this.isBuildable = isBuildable; // Buildings can be placed here;
      this.isSelected = false; // Turn Tile green to show what is buildable;
      this.Building; // Add building data stuff here I think? idk
    }
  
  
    Render(){
      // REPLACE WITH SPRITES
      push()
      noStroke()
      fill(this.tileColor)
      rect(this.pos.x,this.pos.y,size,size)
      pop()
      if(this.isBuildable && selectedTower != null && inButton(this.pos.x,this.pos.y,size,size)){
        this.Building = selectedTower
        Currency -= this.Building.cost;
        this.Building.allowToShoot = true;
        this.Building.showRange = false;
        this.Building.pos = createVector(this.pos.x+size/2,this.pos.y+size/2);
        currentTowers.push(this);
        selectedTower = null;
      }
      
    }
  
    BuildingRender(){
      this.Building.Render()
    }
    
    UpdatePosition(newPos){
      this.pos = newPos;
      if(this.Building != null){
        this.Building.pos = createVector(this.pos.x+size/2,this.pos.y+size/2);
      }
    }
  
  }
  

}  



function Instructions() {
  this.setup = function(){
    createCanvas(window.innerWidth, window.innerHeight)
    gameIsPlaying = false;

  }
  
  this.draw = function() {
    push()
      background(30,30,40);
      fill(255)
      textSize(50);
      textAlign(LEFT,CENTER)
      text("Instructions",50,50);
      text("----------------------------",40,100)
      text("Enemies:",width-250,50)
      push()
        let maxSize = height - 100 - 20 
        let pos = maxSize / _itemLib.Enemies.length;
        textStyle(BOLD)
        textAlign(CENTER)
        for(let i = 0; i < _itemLib.Enemies.length; i++){
          let enem = _itemLib.Enemies[i];
          push()
          fill(enem.objCol[0],enem.objCol[1],enem.objCol[2])
          //textSize(dynamicText(enem.name,150))
          //text(enem.name,width-200, pos+20 + pos*i,100)
          ellipseMode(CENTER)
          ellipse(width-100,pos+20 + pos * i, 10 + enem.hp*3)
          pop()
        }
      pop()
      textSize(20)
      fill(255,255,100)
      text("- Stop the Hacker dots from reaching the end", 60,150)
      text("- Each defense piece has different attack speeds and damage", 60,190)
      text("- New lines of attack spawn in as the threat level increases", 60,230)
      text("- You have a limited number of placements so place your towers wisely", 60,270)
      text("- Having a longer password with different letters and symbols gives you more health", 60,310)
      text("- Once the last hacker dot is removed, your password shall be safe", 60,350)
      fill(150,150,255);
      textStyle(NORMAL)
      textSize(22) 
      let buttonText = "Return Home";
      let buttonSize = textWidth(buttonText)/2;
      text(buttonText,50,400)
      stroke(150,150,255)
      line(50,410,buttonSize*2 + 50,410)
      if(inButton(50,380,buttonSize*2,30)){
        if(!mouseDown){
          sceneMan.showScene(Intro)
          mouseDown = true;
          if(!buttonSFX.isPlaying()){
            buttonSFX.play()
          }
        }
  
      }
    pop()
  }
}



function FailedEnd() {
  let iconPos;
  let target1;
  let target2;
  let dir;

  this.setup = function(){
    createCanvas(window.innerWidth, window.innerHeight)
    iconPos = createVector(width-200, height-250)
    target1 = createVector(width-200, 25)
    target2 = createVector(width-200, height-250)
    gameIsPlaying = false;
  }

  this.draw = function(){
    push()
      background(30,30,40);
      fill(255)
      textSize(50);
      textAlign(LEFT,LEFT)
      textStyle(BOLD)
      translate(0,30) // <<<<<<<<<<<<<<<<<< TRANSLATE
      text("Hackers have Breached your Password!",20,20)
      text("-----------------------",20,70);
      fill("red")
      textSize(20)
      text("Would you Like to retry with a new Password?",20,100)
      fill(255,100,100)
      textStyle(NORMAL)


      push()
        if(dir){
          if(MoveTowards(iconPos,target1,4/10) == 0){ dir = false; }
          iconPos.add(MoveTowards(iconPos,target1,10/10))
        }
        else {
          if(MoveTowards(iconPos,target2,4/10) == 0) {dir = true;}
          iconPos.add(MoveTowards(iconPos,target2,10/10))
        }
        translate(iconPos.x+75, iconPos.y+75)
        rotate(radians(sin(iconPos.y/20-30)*10))
        imageMode(CENTER)
        image(errorIcon,0,0,150)
      pop()
      push()

        fill(150,150,255);
        textStyle(NORMAL)
        textSize(22) 
        let currentName = "Enter a New Password"
        let lineW = textWidth(currentName);
        text(currentName,50,400)
        stroke(150,150,255)
        line(50,410,50+lineW,410)
        if(inButton(50,410,lineW,30)){
          if(!mouseDown){
            errorName = [];
            sceneMan.showScene(Game)
            gameIsPlaying = true;
            if(playerPasswordInput != null) playerPasswordInput.show();
            mouseDown = true;
            if(!buttonSFX.isPlaying()){
              buttonSFX.play()
            }
          }
    
        }
      pop()
      push()
        fill(150,150,255);
        textStyle(NORMAL)
        textSize(22)
        currentName = "Return to menu"
        lineW = textWidth(currentName); 
        text(currentName,50,440)
        stroke(150,150,255)
        line(50,450,50+lineW,450)
        if(inButton(50,450,lineW,30)){
          if(!mouseDown){
            errorName = [];
            sceneMan.showScene(Intro)
            mouseDown = true;
            if(!buttonSFX.isPlaying()){
              buttonSFX.play()
            }
          }
    
        }
      pop()
    pop()

  }
}



function WinEnd(){
  let iconPos;
  let target1;
  let target2;
  let counter = 0;

  this.setup = function(){
    createCanvas(window.innerWidth, window.innerHeight)
    iconPos = createVector(width-200,0)
    target1 = createVector(width-200,0)
    target2 = createVector(width-200,height)
    gameIsPlaying = false;
  }

  this.draw = function(){
    push()
    background(30,30,40);
    fill(255)
    textSize(50);
    textAlign(LEFT,CENTER)
    text("Good Job!",40,60)
    text("-------------------------------",40,100)
    textSize(25);
    text("All Hackers have been Repelled...",40,180)
    rectMode(CORNER,CENTER)
    fill(255,255,100)
    text("Be wary, more people will come to breach your password whenever they can.",40,260,width/2)
    text("Always make sure to keep your password protected and unique to other passwords.",40,330,width/2)
    
    fill(150,150,255);
    textStyle(NORMAL)
    textSize(22) 
    let current = "Return to Menu"
    text(current,50,400)
    stroke(150,150,255)
    line(50,410,textWidth(current)+50,410)
    if(inButton(50,380,textWidth(current),30)){
      if(!mouseDown){
        sceneMan.showScene(Intro)
        mouseDown = true;
        if(!buttonSFX.isPlaying()){
          buttonSFX.play()
        }
      }

    }
    current = "Statement"
    noStroke();
    text(current,50,440)
    stroke(150,150,255)
    line(50,450,textWidth(current)+50,450)
    if(inButton(50,420,textWidth(current),30)){
      if(!mouseDown){
        sceneMan.showScene(Statement)
        mouseDown = true;
        if(!buttonSFX.isPlaying()){
          buttonSFX.play()
        }
      }

    }
    pop()
    push()
    translate(width/2+80,380)
    counter++;
    rotate(radians(sin(counter/20)*10))
    imageMode(CENTER)
    image(happyIcon,0,0,150)
    pop()

    push() // 10101 background Image Scrolling
    iconPos.add(MoveTowards(iconPos,target2,1))
    if(MoveTowards(iconPos,target2,1) == 0){
      iconPos = createVector(target1.x,target1.y);
    }
    tint(150,150,255,150)
    translate(iconPos.x,iconPos.y)
    image(repBG,0,0,200,height)
    image(repBG,0,-height,200,height) // creates an infinite loop
    pop()
  }
}

function Statement() {

  let extraWidth = 0;
  let widthChanged = false;

  this.setup = function(){
    createCanvas(window.innerWidth, window.innerHeight)

    gameIsPlaying = false;
  }

  this.draw = function(){
    if(screenSizeChange){
      screenSizeChange = false;
      widthChanged = false;
    }
    push()
      background(30,30,40);
      fill(255)
      textSize(50);
      textAlign(LEFT,LEFT)
      textStyle(BOLD)
      translate(0,30) // <<<<<<<<<<<<<<<<<< TRANSLATE
      text("Statement",20,20)
      text("-----------------------",20,70);
      fill(240,200,90 )
      textSize(20)
      text("By: Ben Beary",20,100)
      fill(255,100,100)
      textStyle(NORMAL)

      push()

      fill("white")
      textAlign(TOP, CENTER)
      textSize(20)
      let currentParagraph = "With new forms of artificial intelligence and password-cracking robots, it's become harder and harder to hold on to a secure password that would last all your life. There are around 30% of people on the internet that have at some point been breached due to a weak password. This is why for my project, I wanted to show off the power of having a strong password while also having strong protections to help further secure your passwords and data in the form of a game."
      text(currentParagraph, width/2, 100, (width/3+extraWidth))
      
      let lines = ((textWidth(currentParagraph)*20*2) / (width/3+extraWidth)) + 75
      currentParagraph = "The goal behind this project was to gamify the \“behind-the-scenes\” on how many people try to hack into your password and how certain applications can handle defending it. As the game progresses further, more lines of attack open up to represent the multiple accounts that are linked to that single password. This is mainly used to represent the statistic that two-thirds of Americans use the same password across multiple accounts. Finally, the strength of the password created by the player directly affects the difficulty of the password with longer passwords with different symbols and numbers increasing the overall health the player has to work with."
      text(currentParagraph,width/2, lines, (width/3+extraWidth))  	
      
      lines += ((textWidth(currentParagraph)*20) / (width/3+extraWidth)) + 50
      currentParagraph = "The entire website is built with p5 play JavaScript just to make it \“easier\” to code. To make the process easier to improve on, the enemies, towers, and wave spawner use a JSON file to store their data. This mainly allowed me to quickly add new units and towers to the game without needing to rework different systems in the game."
      text(currentParagraph,width/2, lines, (width/3+extraWidth))
      lines += ((textWidth(currentParagraph)*20) / (width/3+extraWidth))

      if(!widthChanged && lines > height){
        extraWidth = (lines - height)
        widthChanged = true;
      }
      else if(!widthChanged && lines < height){
        extraWidth = 0
        widthChanged = true;
      }

      pop()

      
      push()

        fill(150,150,255);
        textStyle(NORMAL)
        textSize(22) 
        let currentName = "Create a Password!"
        let lineW = textWidth(currentName);
        text(currentName,50,400)
        stroke(150,150,255)
        line(50,410,50+lineW,410)
        if(inButton(50,410,lineW,30)){
          if(!mouseDown){
            errorName = [];
            sceneMan.showScene(Game)
            gameIsPlaying = true;
            if(playerPasswordInput != null) playerPasswordInput.show();
            mouseDown = true;
            if(!buttonSFX.isPlaying()){
              buttonSFX.play()
            }
          }
    
        }
      pop()
      push()
        fill(150,150,255);
        textStyle(NORMAL)
        textSize(22)
        currentName = "Return to menu"
        lineW = textWidth(currentName); 
        text(currentName,50,440)
        stroke(150,150,255)
        line(50,450,50+lineW,450)
        if(inButton(50,450,lineW,30)){
          if(!mouseDown){
            errorName = [];
            sceneMan.showScene(Intro)
            mouseDown = true;
            if(!buttonSFX.isPlaying()){
              buttonSFX.play()
            }
          }
    
        }
      pop()
    pop()

  }
}