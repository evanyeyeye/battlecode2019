import {SPECS} from 'battlecode'
var karboniteMines = {}  // maps mine locations to distance from base castle location
var fuelMines = {}
var mineID = {}  // maps location of mine to its ID
var fuelMines = {}
var curMine=null
var checkedMine={}
var idToMine={};
var baseLocation=null;

export function prophetTurn(r) {
    if (r.me.turn == 1) {
        r.log("I am a prophet")
        iDMines(r)
        // find the closest castle, probably built from there
        for (let otherRobot of r.getVisibleRobots()) {  // may be bad for optimization?
            if (otherRobot.team == r.me.team && otherRobot.unit==SPECS.CASTLE && r.isRadioing(otherRobot)) {
                // recieve message
                let message = otherRobot.signal()
            }
        }
    }

   
  

    // ok now find the best move
    let friendlyRobots = {}
    let enemyRobots = {}

    // look around
    for (let otherRobot of r.getVisibleRobots()) {   	

        let distance = getManhattanDistance(r.me.x, r.me.y, otherRobot.x, otherRobot.y)
        if (otherRobot.team == r.me.team) {
            // set closest friendly castle or church as base
            if ( (otherRobot.unit==SPECS.CASTLE || otherRobot.unit == SPECS.CHURCH) && (baseLocation == null  || (getManhattanDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1]) < distance) )) {
                baseLocation = [otherRobot.x, otherRobot.y]
            }
            friendlyRobots[otherRobot.id] = distance
            updateMines(r)  // refresh mines based on distance to base castle location
        }
        else {
            enemyRobots[otherRobot.id] = distance
        }
    }

    // edit this so that if does make sense go for other resource
    // return to church/castle if full
    if (r.me.karbonite == SPECS.UNITS[SPECS.PROPHET].KARBONITE_CAPACITY || r.me.fuel == SPECS.UNITS[SPECS.PROPHET].FUEL_CAPACITY) {
        // r.log("Carrying resources back to " + baseLocation)
        if(getSquaredDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1]) <= 2) {
            // close enough to give the collected resources
            return r.give(baseLocation[0] - r.me.x, baseLocation[1] - r.me.y, r.me.karbonite, r.me.fuel)
        }

        // return to church/castle
        let pf = r.pm.getPathField(baseLocation)
        if (r.fuel > SPECS.UNITS[SPECS.PROPHET].FUEL_PER_MOVE) {
            let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
            return tryMoveRotate(r, test)
        }
    }


    /*
    **************************************
    this portion is for attacking strategy
	**************************************

    */

  
	let targetMine = [5];
    let curLocation = r.me.x.toString() + "," + r.me.y.toString()
    // r.log('curloc: ' + curLocation)
    // for (let i of occupiedLoc) { r.log(i); }

   	
    // path to location
	let pf = r.pm.getPathField(targetMine)  // this keeps the reversal
    if (r.fuel > SPECS.UNITS[SPECS.PROPHET].FUEL_PER_MOVE) {
        // r.log("I want to move to " + targetMine)
        let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
        return tryMoveRotate(r, test)
    }

    return
}

//decide which direction to go when kiting, or it can just not kite
function kite(r){
	let visibleRobotMap = r.getVisibleRobotMap();
	



}
function findAttack(){


}
function isEmpty(r, x, y) {
    let passableMap = r.map;
    let visibleRobotMap = r.getVisibleRobotMap();
    return passableMap[y][x] && visibleRobotMap[y][x] == 0;
}

function notEmpty(r, x, y) {
    let passableMap = r.map;
    let visibleRobotMap = r.getVisibleRobotMap();
    return passableMap[y][x] && visibleRobotMap[y][x] > 0;  // passable, but visibly has a robot id
}
// update mine locations based on distance from 
function updateMines(r) {
    for (let j = 0; j<r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i]) {
                karboniteMines[[i, j]] = getManhattanDistance(i, j, baseLocation[0], baseLocation[1])  // confirm this ordering, idk
            }
            if (r.fuel_map[j][i]) {
                fuelMines[[i, j]] = getManhattanDistance(i, j, baseLocation[0], baseLocation[1])
            }
        }
    }
}
function getSquaredDistance(x1, y1, x2, y2) {
    return (x2 - x1)**2 + (y2 - y1)**2
}

function getManhattanDistance(x1, y1, x2, y2) {
return Math.abs(x2 - x1) + Math.abs(y2 - y1)
}

function enemyInRange(r, enemy, l) {
    if (enemy.unit == SPECS.CRUSADER || enemy.unit == SPECS.PROPHET || enemy.unit == SPECS.PREACHER) {
        if (getSquaredDistance(enemy.x, enemy.y, l[0], l[1]) < SPECS.UNITS[enemy.unit].ATTACK_RADIUS[1]) {
            return true;    
        }
    }
    return false;
}

function iDMines(r) {  // deterministically label mines
    let counter = 0
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i] || r.fuel_map[j][i]){
                // r.log("Pilgrim: Mine at " + [i, j] + " is " + counter)
                mineID[[i, j]] = counter
                idToMine[counter]=[i,j];
                r.log(idToMine);
                counter++
            }
        }
    }
}

function inRange(r, enemy, l) {
    // not sure if location is x or y

    if (enemy.unit == SPECS.PROPHET || enemy.unit == SPECS.PROPHET || enemy.unit == SPECS.PREACHER) {
        if (getSquaredDistance(enemy.x, enemy.y, l[0], l[1]) < SPECS.UNITS[enemy.unit].ATTACK_RADIUS[1]) {
            return true
        }
    }
    return false

}

function rotate(dir, n) {
    return directions[(imBad[dir] + n + 8) % 8]
}

// I am lazy I will make this a for loop later
function tryMoveRotate(r, dir) {
    let x = r.me.x
    let y = r.me.y
    let visible = r.getVisibleRobotMap()
    let passable = r.getPassableMap()
    let x1 = x + dir[0]
    let y1 = y + dir[1]
    if (x1 >= 0 && x1 < passable.length && y1 >= 0 && y1 < passable[0].length && passable[y1][x1] && visible[y1][x1] == 0) {
        return r.move(dir[0], dir[1])
    }
    let dir1 = rotate(dir, 1)
    x1 = x + dir[0]
    y1 = y + dir1[1]
    if (x1 >= 0 && x1 < passable.length && y1 >= 0 && y1 < passable[0].length && passable[y1][x1] && visible[y1][x1] == 0) {
        return r.move(dir[0], dir1[1])
    }
    dir1 = rotate(dir, -1)
    x1 = x + dir[0]
    y1 = y + dir1[1]
    if (x1 >= 0 && x1 < passable.length && y1 >= 0 && y1 < passable[0].length && passable[y1][x1] && visible[y1][x1] == 0) {
        return r.move(dir[0], dir1[1])
    }
    return 
}