import {SPECS} from 'battlecode'

const MINE = 0
const SCOUT = 1
const BUILD = 2

const KARBONITE =  0
const FUEL = 1

var fuelThreshold =  750 // if over this amount of fuel, free to build. Probably should be variable

var unsafeLoc = new Set();  // set to see place is unsafe
var occupiedLoc = new Set(); //set to occupied loc  both take in string verison of location both take in string verison of location
var priorityResource = -1;  // 0 is karbonite 1 is fuel both take in string verison of location

var karboniteMines = {}  // maps mine locations to distance from base castle location
var fuelMines = {}
var baseCastleLocation = null  // castle to return resources to

export function pilgrimTurn(r) {
    if (r.me.turn == 1) {
        r.log("I am a Pilgrim")
    }

    let state = MINE  // idk if this is going to be useful
    if (priorityResource == -1)
        priorityResource = Math.floor(Math.random() * 2)

    //check if current mine is safe or not

    // no reason to float karbonite?
    if (r.karbonite > 2*SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE && r.fuel > fuelThreshold) {
        state = BUILD
    }

    // ok now find the best move
    let friendlyRobots = {}
    let enemyRobots = {}

    // look around
    for (let otherRobot of r.getVisibleRobots()) {
        let distance = getManhattanDistance(r.me.x, r.me.y, otherRobot.x, otherRobot.y)
        if (otherRobot.team == r.me.team) {
            // set closest friendly castle as base
            if (baseCastleLocation == null  || getManhattanDistance(r.me.x, r.me.y, baseCastleLocation[0], baseCastleLocation[1]) < distance) {
                baseCastleLocation = [otherRobot.x, otherRobot.y]
            }
            friendlyRobots[otherRobot.id] = distance
        }
        else {
            enemyRobots[otherRobot.id] = distance
        }
    }
    // edit this so that if does make sense go for other resource
    // return to castle if full
    if (r.me.karbonite == SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY || r.me.fuel == SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) {
        let pf = r.pm.getPathField(baseCastleLocation.reverse())
        if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
            let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
            return r.move(test[1], test[0])
        }
    }

    // look at mines
    updateMines(r)
	let targetMine = closestSafeMine(r)
    let curLocation=r.me.x.toString()+","+r.me.y.toString()
    r.log('curloc')
    r.log(curLocation)
    for(let i of occupiedLoc) { r.log(i); }
    // check if on top of mine
    if (occupiedLoc.has(curLocation)||(targetMine != null && getManhattanDistance(r.me.x, r.me.x, targetMine[0], targetMine[1]) == 0)) {
        r.log("i'm actually trying to mine at " + targetMine[0] + ", " + targetMine[1])
        return r.mine()
    }

    // no available mines?
	if (targetMine == null) {
		targetMine = baseCastleLocation
	}

    // path to location
	let pf = r.pm.getPathField(targetMine.reverse())
    if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
        r.log("I want to move to " + targetMine)
        let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
        return r.move(test[1], test[0])
    }

}

function isEmpty(r, x, y) {
    let passableMap = r.map;
    let visibleRobotMap = r.getVisibleRobotMap();
    return passableMap[y][x] && visibleRobotMap[y][x] == 0;
}
function notEmpty(r, x, y) {
    let passableMap = r.map;
    let visibleRobotMap = r.getVisibleRobotMap();
    return passableMap[y][x] && visibleRobotMap[y][x] != 0 && visibleRobotMap[y][x] != -1; //we know there
}

// update mine locatoins based on distance from 
function updateMines(r) {
    for (let j = 0; j<r.karbonite_map.length; j++) {
        for (let i = 0; i<r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i]) {
                karboniteMines[[i, j]] = getManhattanDistance(i, j, baseCastleLocation[0], baseCastleLocation[1])  // confirm this ordering, idk
            }
            if (r.fuel_map[j][i]) {
                fuelMines[[i, j]] = getManhattanDistance(i, j, baseCastleLocation[0], baseCastleLocation[1])
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

// check all mines that are dangerous according to units in vision
// later check if you cna safely mine
function checkMine(r) {
    
    let merged = Object.assign({},karboniteMines, fuelMines);
   // r.log([r.me.x,r.me.y])
  //r.log(merged);
    let visible = r.getVisibleRobots()
    for (let curMine in merged) {
        let tempMine=curMine.split(",").map((n) => parseInt(n))
       // r.log(tempMine);
        //r.log([r.me.x,r.me.y])


        if (notEmpty(r,tempMine[0],tempMine[1])){
            if (occupiedLoc.has(tempMine)==false){

            occupiedLoc.add(tempMine.toString());

       }      

        }
        if (isEmpty(r,tempMine[0],tempMine[1])){
             if (occupiedLoc.has(tempMine)){

            occupiedLoc.delete(tempMine.toString());
        }
        
       }
        
        // || unsafeLoc.has(curMine) not sure if you check unsafe loc or not
        // only do it if something can possibly be attacked by thigns in vision
        if (getSquaredDistance(r.me.x,r.me.y,tempMine[0],tempMine[1])**0.5<18){
            for (let robot in visible){
                if (inRange(r,tempMine)){
                    unsafeLoc.add(tempMine.toString());

                    break;
                }
            }

        }
    }
  
   
   

}

// check where the closest safe mine is 
function closestSafeMine(r) {
	checkMine(r)
    let mines = karboniteMines

    if (priorityResource == FUEL)
        mines = fuelMines

    let target = null
    let minDistance = 2 * 64 * 64
 

    for (const [location, distance] of Object.entries(mines)) {
        if (distance < minDistance) {
            r.log(location)
            if (occupiedLoc.has(location)==false){

            minDistance = distance
            target = location
            }
            else{
                r.log('mine occupied')
            }

        }

    }
    return target.split(",").map((n) => parseInt(n))
}

function findBuildLocation(r) {
    // for building churches
}

function inRange(r,l) {
    //not sure if location is x or y

    if (r.me.unit==SPECS.CRUSADER||r.me.unit==SPECS.PROPHET||r.me.unit==SPECS.PREACHER)
   if (getSquaredDistance(r.me.x,r.me.y,l[0],l[1])<SPECS.UNITS[r.me.unit].ATTACK_RADIUS[1]){
        return true;    
   }
   return false;

}
