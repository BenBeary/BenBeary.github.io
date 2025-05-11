function dynamicText(text,Xborder){

    let currentSize;
    push()
    textSize(1);
    let textLength = textWidth(text)
  
    currentSize = Xborder / textLength;
    
    pop()
    return currentSize;
  }
  


  function MoveTowards(current,target,speed){
  
    difference = createVector(target.x - current.x, target.y - current.y)
    movement = createVector(0,0)
    underSpeed = false;
  
    if(difference.x == 0 && difference.y == 0){
      return 0;
    }
  
    if(difference.x != 0){
      if(difference.x < speed && difference.x > -speed){
        movement.add(difference.x,0);
        underSpeed = true;
      }
      else if(difference.x > 0) { movement.add(speed);}
      else { movement.add(-speed);}
    }
    
    if (difference.y != 0){
      if(difference.y < speed && difference.y > -speed){
        movement.add(0,difference.y)
        underSpeed = true;
      }
      else if(difference.y > 0) {movement.add(0,speed);}
      else { movement.add(0,-speed);}
    }
  
    // Normalize
    if(movement.x != 0 && movement.y != 0 && !underSpeed){
      movement.x = movement.x / sqrt(2)
      movement.y = movement.y / sqrt(2)
    }
  
    return movement;
    
  }





// You are weak, my son is Invincible - Omni Man
// x1 y1 = positions | x2 y2 = size
function inButton(x, y, w, h){


  w += x;
  h += y;
    if (mouseIsPressed && mouseX >= x && mouseX <= w &&
    mouseY >= y && mouseY <= h){
      return true;
    }
    return false;
  }
  
  function inButton(x1, y1, x2, y2, drawDebug){

    if(drawDebug){
      push()
      rectMode(TOP,LEFT)
      fill(255,100,100,50)
      rect(x1,y1,x2,y2)
      pop()
    }
    x2 += x1;
    y2 += y1;
      if (mouseIsPressed && mouseX >= x1 && mouseX <= x2 &&
      mouseY >= y1 && mouseY <= y2){
        return true;
      }
      return false;
    }

  // This shit is janky as all hell
  // DEPENDENCY: lastMousePos = createVector(mouseX,mouseY)
  class vertScrollBar{
    constructor(posX,posY,w,h){
      this.pos = 0 // pos of the bar atm
      this.upBounds = createVector(posX,posY) // upper clamp
      this.downBounds = createVector(w,h) // lower clamp
      this.reduceSize = 0; // amount the bar can move
      this.division = 1; // changes movement distance if at min size;
    }
    
    UpdateBounds(x,y,w,h){
      this.upBounds = createVector(x,y);
      this.downBounds = createVector(w,h);
    }
  
    Render(){
      push()
        noStroke()
        translate(this.upBounds.x,this.upBounds.y); // set position
        // boundary box
        fill(255,40)
        rect(0,0,this.downBounds.x,this.downBounds.y);
  
        push()
          let scrollerLength = this.downBounds.y - this.reduceSize;
          
          // does not move to show the rest of the items being scrolled
          if (scrollerLength < 50){ // min length
            scrollerLength = 50
            // take the amount of space that needs to be moved
            this.division = (this.reduceSize)/(this.downBounds.y-scrollerLength)
          }
  
          // Scroller
          fill(200)
          if(scrollerLength == this.downBounds.y) { fill(200,200,200,50) } // grey out when nothing to do
          rect(3,this.pos,this.downBounds.x-6,scrollerLength,10);
          
          // Scroller detail
          fill(0,60)
          rectMode(CENTER)
          rect(this.downBounds.x/2,this.pos+scrollerLength/2 - 10, this.downBounds.x/2,5,10)
          rect(this.downBounds.x/2,this.pos+scrollerLength/2, this.downBounds.x/2,5,10)
          rect(this.downBounds.x/2,this.pos+scrollerLength/2 + 10, this.downBounds.x/2,5,10)
        pop()
        // Scrollbar Movement
        if(inButton(this.upBounds.x,this.upBounds.y+this.pos,this.downBounds.x,scrollerLength)){
          this.pos = mouseY - (lastMousePos.y - this.pos);
          // console.log(this.pos);
        }
        // Clamp Up & Down
        if(this.pos < 0){
          this.pos = 0
          //console.log("Scrollbar minClamp")
        }
        else if (this.pos > this.downBounds.y - scrollerLength){
          this.pos =  this.downBounds.y - scrollerLength;
          //console.log("Scrollbar maxClamp")
        }
      pop()
      // Debug for Button Box
      // fill(200,0,200,100);
      // rect(this.upBounds.x,this.upBounds.y+this.pos,this.downBounds.x,scrollerLength)
    }
  
    
    
    // Returns the relative position
    getValue(){
      return this.pos*this.division
    }
  
  }

