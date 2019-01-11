import {SPECS} from 'battlecode'

const MINE = 0
const SCOUT = 1
const BUILD = 2

const KARBONITE =  0
const FUEL = 1

var fuelThreshold =  750 // if over this amount of fuel, free to build. Probably should be variable

var unsafeLoc = new Set();  // set to see place is unsafe 
var priorityResource = -1;  // 0 is karbonite 1 is fuel

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
        let distance = getSquaredDistance(r.me.x, r.me.y, otherRobot.x, otherRobot.y)
        if (otherRobot.team == r.me.team) {
            // set closest friendly castle as base
            if (baseCastleLocation == null  || getSquaredDistance(r.me.x, r.me.y, baseCastleLocation[0], baseCastleLocation[1]) < distance) {
                baseCastleLocation = [otherRobot.x, otherRobot.y]
            }
            friendlyRobots[otherRobot.id] = distance
        }
        else {
            enemyRobots[otherRobot.id] = distance
        }
    }

    // return to castle if full
    if (r.me.karbonite == SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY || r.me.fuel == SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) {
        let pf = r.pm.getPathField(baseCastleLocation)
        if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
            let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
            return r.move(test[1], test[0])
        }
    }

    // look at mines
    updateMines(r)
	let targetMine = closestSafeMine(r)

    // check if on top of mine
    if (targetMine != null && getSquaredDistance(r.me.x, r.me.y, targetMine[1], targetMine[0]) == 0) {
        r.log("i'm actually trying to mine")
        return r.mine()
    }

    // no available mines?
	if (targetMine == null) {
		targetMine = baseCastleLocation
	}

    // path to location
	let pf = r.pm.getPathField(targetMine)
    if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
        r.log("I want to move to " + targetMine)
        let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
        return r.move(test[1], test[0])
    }

}

function isEmpty(r, x, y) {
    var passableMap = r.map;
    var visibleRobotMap = r.getVisibleRobotMap();
    return passableMap[y][x] && visibleRobotMap[y][x] == 0;
}

function updateMines(r) {
    for (let i = 0; i<r.karbonite_map.length; i++) {
        for (let j = 0; j<r.karbonite_map[0].length; j++) {
            if (r.karbonite_map[i][j]) {
                karboniteMines[[i, j]] = getSquaredDistance(j, i, r.me.x, r.me.y)  // confirm this ordering, idk
            }
            if (r.fuel_map[i][j]) {
                fuelMines[[i, j]] = getSquaredDistance(j, i, r.me.x, r.me.y)
            }
        }
    }
}

function getSquaredDistance(x1, y1, x2, y2) {
    return (x2 - x1)**2 + (y1 - y2)**2
}

// check all mines that are dangerous according to units in vision
// later check if you cna safely mine
function checkDanger(r) {
    var merged = new Set([karboniteMines, fuelMines])
   
    var visible = r.getVisibleRobots()
    for (var curMine in merged) {
        // || unsafeLoc.has(curMine) not sure if you check unsafe loc or not
        // only do it if something can possibly be attacked by thigns in vision
        if (getSquaredDistance(r.x,r.y,curMine[0],curMine[1])**0.5<18){
            for (var robot in visible){
                if (inRange(robot,curMine)){
                    unsafeLoc.add(curMine);

                    break;
                }
            }

        }
    }
}

// check where the closest safe mine is 
function closestSafeMine(r) {
	// let dangerSet = checkDanger(r)
    let mines = karboniteMines
    if (priorityResource == FUEL)
        mines = fuelMines
    let target = null
    let minDistance = 2 * 64 * 64

    for (const [location, distance] of Object.entries(mines)) {
        if (distance < minDistance) {
            minDistance = distance
            target = location
        }
    }
    return target.split(",").map((n) => parseInt(n))
}

function findBuildLocation(r) {
    // for building churches
}
function inRange(r,l){
    //not sure if location is x or y
   if (getSquaredDistance(r.x,r.y,l[0],l[1])<SPECS.UNITS[SPECS.r.unit].ATTACK_RADIUS[1]){

    return true;    
   }
   return false;

}
