import {SPECS} from 'battlecode'
import utils from './utils.js'


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
                if (castleTargetMineID >= 900) {
                    continue
                }
                r.log("Pilgrim received a target mine: " + castleTargetMineID)
                // r.castleTalk(castleTargetMineID + 100)  // acknowledge being sent to this mine, castle handles this now
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
        const distance = utils.getManhattanDistance(r.me.x, r.me.y, otherRobot.x, otherRobot.y)
        if (otherRobot.team == r.me.team) {
            // set closest friendly castle or church as base
            if ( (otherRobot.unit==SPECS.CASTLE || otherRobot.unit == SPECS.CHURCH) && (baseLocation == null  || distance < (utils.getManhattanDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1])) )) {
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
        if(utils.getSquaredDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1]) <= 2) {
            // close enough to give the collected resources
            return r.give(baseLocation[0] - r.me.x, baseLocation[1] - r.me.y, r.me.karbonite, r.me.fuel)
        }

        // return to church/castle
        /*
        let pf = r.pm.getPathField(baseLocation)
        if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
            let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
            return utils.tryMoveRotate(r, test)
        }
        */
        // broken a*
        
        let node = r.am.findPath(baseLocation)
        if (node === null) {
            r.log("A*: no path found")
            return
        }
        if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
            const test = r.am.nextDirection(node)
            r.log("A*: direction received is " + test)
            if (utils.isEmpty(r, r.me.x + test[0], r.me.y + test[1]))
                return r.move(test[0], test[1])
            // return utils.tryMoveRotate(r, test)
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

    if (targetMine != null && utils.getManhattanDistance(r.me.x, r.me.y, targetMine[0], targetMine[1]) <= 2) {
        r.castleTalk(mineToID[targetMine[0] + ',' + targetMine[1]])  // when close to mine, let castle update activity
    }

    // check if on top of mine
    if ( (occupiedLoc.has(curLocation) || (targetMine != null && utils.getManhattanDistance(r.me.x, r.me.y, targetMine[0], targetMine[1]) == 0)) && r.fuel >= SPECS.MINE_FUEL_COST) {
        // r.log("i'm actually trying to mine at " + targetMine[0] + ", " + targetMine[1])
        // r.castleTalk(mineToID[targetMine[0] + ',' + targetMine[1]])  // each turn, let castles know you're here mining
        return r.mine()
    }

    // no available mines?
	if (targetMine == null) {
		targetMine = baseLocation
	}

    // path to location
    /*
	let pf = r.pm.getPathField(targetMine)
    if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
        // r.log("I want to move to " + targetMine)
        let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
        return utils.tryMoveRotate(r, test)
    }
    */
    // broken a*
    
    let node = r.am.findPath(targetMine)
    if (node === null){
        r.log("A*: no path to " + targetMine + " found")
        return
    }
    if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
        const test = r.am.nextDirection(node)
        r.log("A*: direction received is " + test)
        if (utils.isEmpty(r, r.me.x + test[0], r.me.y + test[1]))
            return r.move(test[0], test[1])
        // return utils.tryMoveRotate(r, test)
    }
    
    return
}

function iDMines(r) {  // deterministically label mines
    let counter = 0
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i] || r.fuel_map[j][i]){
                // r.log("Pilgrim: Mine at " + [i, j] + " is " + counter)
                counter++
                allMineID[counter] = i.toString() +',' + j.toString()
                mineToID[i.toString() + ',' + j.toString()] = counter
            }
        }
    }
}

// update mine locations based on distance from 
function updateMines(r) {
    for (let j = 0; j<r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i]) {
                karboniteMines[[i, j]] = utils.getManhattanDistance(i, j, baseLocation[0], baseLocation[1])  // confirm this ordering, idk
            }
            if (r.fuel_map[j][i]) {
                fuelMines[[i, j]] = utils.getManhattanDistance(i, j, baseLocation[0], baseLocation[1])
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
        if (utils.isOccupied(r, tempMine[0], tempMine[1])) {
            if (!occupiedLoc.has(tempMine.toString())){
                occupiedLoc.add(tempMine.toString());
            }      
        }
      
        if (utils.isEmpty(r, tempMine[0], tempMine[1])) {
             if (occupiedLoc.has(tempMine.toString())) {
                // r.log('the mine at ' + curMine + ' is no longer occupied')
                occupiedLoc.delete(tempMine.toString());
            }
        }
        // || unsafeLoc.has(curMine) not sure if you check unsafe loc or not
        // only do it if something can possibly be attacked by things in vision
        if (utils.getSquaredDistance(r.me.x,r.me.y,tempMine[0], tempMine[1]) ** 0.5 < 18){
            for (let robot in visible){
                if (robot.team != r.me.team && utils.isEnemyInRange(r, robot, tempMine)){
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

// TODO: build churches
function findBuildLocation(r) {
    return
}
