import {SPECS} from 'battlecode'

const MINE = 0
const SCOUT = 1
const BUILD = 2

const KARBONITE = 0
const FUEL = 1

var fuelThreshold =  750 // if over this amount of fuel, free to build churches. Probably should be variable

var unsafeLoc = new Set();  // set to see place is unsafe
var occupiedLoc = new Set(); // set to occupied loc  both take in string verison of location both take in string verison of location
var priorityResource = -1;  // 0 is karbonite 1 is fuel both take in string verison of location
// TODO: DOES NOT ACCOUNT FOR OBSTACLES IN HOW EASY A MINE IS TO REACH
var karboniteMines = {}  // maps mine locations to distance from base castle location
var fuelMines = {}
var baseLocation = null  // castle or church to return resources to
var priorityResource=0;
var allMineID = {}  // maps mine ID to its STRING location
var mineToID = {}  // maps string location to id, convenience

var castleTargetMineID = null // the target mine that the castle gives

export function pilgrimTurn(r) {
    if (r.me.turn == 1) {
        r.log("I am a Pilgrim")
        iDMines(r)
        // find the closest castle, probably built from there
        for (let otherRobot of r.getVisibleRobots()) {  // may be bad for optimization?
            if (otherRobot.team == r.me.team && otherRobot.unit==SPECS.CASTLE && r.isRadioing(otherRobot)) {
                // recieve message
                castleTargetMineID = otherRobot.signal
                r.log("Pilgrim received a target mine: " + castleTargetMineID)
                r.castleTalk(castleTargetMineID + 100)  // acknowledge being sent to this mine
            }
        }
    }

    let state = MINE  // idk if this is going to be useful
    if (priorityResource == -1)
        priorityResource = Math.floor(Math.random() * 2)

    // no reason to float karbonite?
    if (r.karbonite > 2*SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE && r.fuel > fuelThreshold) {
        state = BUILD  // not actually used right now
    }

    // ok now find the best move
    let friendlyRobots = {}
    let enemyRobots = {}

    // look around
    for (let otherRobot of r.getVisibleRobots()) {
        const distance = getManhattanDistance(r.me.x, r.me.y, otherRobot.x, otherRobot.y)
        if (otherRobot.team == r.me.team) {
            // set closest friendly castle or church as base
            if ( (otherRobot.unit==SPECS.CASTLE || otherRobot.unit == SPECS.CHURCH) && (baseLocation == null  || distance < (getManhattanDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1])) )) {
                baseLocation = [otherRobot.x, otherRobot.y]
                updateMines(r)  // refresh mines based on distance to base castle location
            }
            friendlyRobots[otherRobot.id] = distance
        }
        else {
            enemyRobots[otherRobot.id] = distance
        }
    }

    // ---------- MOVING BACK TO BASE ----------

    // edit this so that if does make sense go for other resource
    // return to church/castle if full
    if (r.me.karbonite == SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY || r.me.fuel == SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) {
        // r.log("Carrying resources back to " + baseLocation)
        if(getSquaredDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1]) <= 2) {
            // close enough to give the collected resources
            return r.give(baseLocation[0] - r.me.x, baseLocation[1] - r.me.y, r.me.karbonite, r.me.fuel)
        }

        // return to church/castle
        let pf = r.pm.getPathField(baseLocation)
        if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
            let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
            return tryMoveRotate(r, test)
        }
    }

    // ---------- MOVING TO A MINE OR MINING THERE ----------

    // old way to find mines
    

    // look at mines
    // updateMines(r)  // since this only changes with base castle location, moved up to that part of the code
    let targetMine = allMineID[castleTargetMineID].split(",").map((n) => parseInt(n))
    if (targetMine === null)
	   targetMine = closestSafeMine(r)

    let curLocation = r.me.x.toString() + "," + r.me.y.toString()
    // r.log('curloc: ' + curLocation)
    // for (let i of occupiedLoc) { r.log(i); }

    // check if on top of mine
    if ( (occupiedLoc.has(curLocation) || (targetMine != null && getManhattanDistance(r.me.x, r.me.y, targetMine[0], targetMine[1]) == 0)) && r.fuel >= SPECS.MINE_FUEL_COST) {
        // r.log("i'm actually trying to mine at " + targetMine[0] + ", " + targetMine[1])
        r.castleTalk(mineToID[targetMine[0] + ',' + targetMine[1]])  // each turn, let castles know you're here mining
        return r.mine()
    }

    // no available mines?
	if (targetMine == null) {
		targetMine = baseLocation
	}

    // path to location
	let pf = r.pm.getPathField(targetMine)
    if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
        // r.log("I want to move to " + targetMine)
        let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
        return tryMoveRotate(r, test)
    }

    return
}

function isEmpty(r, x, y) {
    if (x >= 0 && x < r.map[0].length && y >= 0 && y < r.map.length) {
        const passableMap = r.map;
        const visibleRobotMap = r.getVisibleRobotMap();
        return passableMap[y][x] && visibleRobotMap[y][x] == 0;
    }
}

function notEmpty(r, x, y) {
    const passableMap = r.map;
    const visibleRobotMap = r.getVisibleRobotMap();
    return passableMap[y][x] && visibleRobotMap[y][x] > 0;  // passable, but visibly has a robot id
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
                allMineID[counter] = i.toString() +',' + j.toString()
                mineToID[i.toString() + ',' + j.toString()] = counter
                counter++
            }
        }
    }
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

// check all mines that are dangerous according to units in vision
// later check if you can safely mine
function checkMine(r) {
    let merged = Object.assign({},karboniteMines, fuelMines);
    let visible = r.getVisibleRobots()
    for (let curMine in merged) {
        let tempMine = curMine.split(",").map((n) => parseInt(n))
        if (notEmpty(r, tempMine[0], tempMine[1])) {
            if (!occupiedLoc.has(tempMine.toString())){
                occupiedLoc.add(tempMine.toString());
            }      
        }
      
        if (isEmpty(r, tempMine[0], tempMine[1])) {
             if (occupiedLoc.has(tempMine.toString())) {
                // r.log('the mine at ' + curMine + ' is no longer occupied')
                occupiedLoc.delete(tempMine.toString());
            }
        }
        // || unsafeLoc.has(curMine) not sure if you check unsafe loc or not
        // only do it if something can possibly be attacked by things in vision
        if (getSquaredDistance(r.me.x,r.me.y,tempMine[0], tempMine[1]) ** 0.5 < 18){
            for (let robot in visible){
                if (robot.team != r.me.team && enemyInRange(r, robot, tempMine)){
                    unsafeLoc.add(tempMine.toString());
                    break;
                }
            }
        }
    }
}

// check where the closest safe mine is 
function closestSafeMine(r) {
	checkMine(r)  // update the status of mines
    let mines = karboniteMines

    if (priorityResource === FUEL)
        mines = fuelMines

    let target = null
    let minDistance = 2 * 64 * 64
 
    for (const [location, distance] of Object.entries(mines)) {
        if (distance < minDistance) {
            if (!occupiedLoc.has(location)) {
                minDistance = distance
                target = location
            }
            else {
                // r.log('mine at ' + location + ' is occupied')
            }
        }
    }
    if (target == null) {
        return null
    }
    return target.split(",").map((n) => parseInt(n))
}

function findBuildLocation(r) {
    // for building churches
}

function inRange(r, enemy, l) {
    // not sure if location is x or y

    if (enemy.unit == SPECS.CRUSADER || enemy.unit == SPECS.PROPHET || enemy.unit == SPECS.PREACHER) {
        if (getSquaredDistance(enemy.x, enemy.y, l[0], l[1]) < SPECS.UNITS[enemy.unit].ATTACK_RADIUS[1]) {
            return true
        }
    }
    return false

}

// sorry this is my terrible code I'll make it as beautiful as Larry later
var directions = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]]
var imBad = {}
imBad[[-1, -1]] = 0
imBad[[-1, 0]] = 1
imBad[[-1, 1]] = 2
imBad[[0, 1]] = 3
imBad[[1, 1]] = 4
imBad[[1, 0]] = 5
imBad[[1, -1]] = 6
imBad[[0, -1]] = 7

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
    x1 = x + dir1[0]
    y1 = y + dir1[1]
    if (x1 >= 0 && x1 < passable.length && y1 >= 0 && y1 < passable[0].length && passable[y1][x1] && visible[y1][x1] == 0) {
        return r.move(dir[0], dir1[1])
    }
    dir1 = rotate(dir, -1)
    x1 = x + dir1[0]
    y1 = y + dir1[1]
    if (x1 >= 0 && x1 < passable.length && y1 >= 0 && y1 < passable[0].length && passable[y1][x1] && visible[y1][x1] == 0) {
        return r.move(dir[0], dir1[1])
    }
    return 
}