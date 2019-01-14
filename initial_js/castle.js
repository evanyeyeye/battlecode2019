import {SPECS} from 'battlecode'

const KARBONITE =  0
const FUEL = 1

const directions = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]]

function isEmpty(r, x, y) {
    const passableMap = r.map;
    const visibleRobotMap = r.getVisibleRobotMap();
    return passableMap[y][x] && visibleRobotMap[y][x] == 0;
}

function getManhattanDistance(x1, y1, x2, y2) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1)
}

function findBuildDirection(r, x, y) {
    for (const dir of directions) {
        if (isEmpty(r, x + dir[0], y + dir[1])) {
            return dir
        }
    }
    return null
}

function iDMines(r) {  // deterministically label mines, build manhattan distances for early use
    let kCounter = 0  // counts number of karbonite mines
    let fCounter = 0  // counts number of fuel mines
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i]){
                kMineID[kCounter] = i.toString()+','+j.toString()
                kMineManhattan[kCounter] = getManhattanDistance(r.me.x, r.me.y, i, j)
                kCounter++
            }
            if (r.fuel_map[j][i]) {
                fMineID[fCounter] = i.toString()+','+j.toString()
                fMineManhattan[fCounter] = getManhattanDistance(r.me.x, r.me.y, i, j)
                fCounter++
            }
        }
    }
    return kCounter + fCounter  // counters end at id+1, this number is accurate
}

// find distance between this castle and mine of a specific id and resource
function calculateMineDistance(r, id, resource) {
    let mineLoc = null
    if (resource == KARBONITE)
        mineLoc = kMineID[id].split(",").map((n) => parseInt(n))
    else
        mineLoc = fMineID[id].split(",").map((n) => parseInt(n))
    let pf = r.pm.getPathField(mineLoc, true)
    return pf.getDistanceFromTarget(r.me.x, r.me.y)
}

// returns number of mines within a certain distance of the castle
function calculateNumMines(r, distance_threshhold){
    let closeMineCount = 0;
    let merged = Object.assign({}, kMineDistance, fMineDistance);
    // r.log(merged)
    for (const [id, distance] of Object.entries(merged)) {
        // r.log(distance)
        if (distance < distance_threshhold) {
            closeMineCount++;
        }
    }
    return closeMineCount;
}

// returns conservative estimate of number of pilgrims we need to have to mine at every mine
// DOES NOT ACCOUNT FOR MINING MULTIPLE RESOURCES WHICH IS A MUCH BETTER IDEA
// Theres usually 2 fuel per karbonite mine i think, but for every 2-mine grouping it would be distance * 2 / 10 + 2 i think
function calculateNumPilgrims(r, pathfinding = false) {
    // pathfinding argument lets this use kMineDistance and fMineDistance as opposed to kMineManhattan and fMineManhattan
    // kMineDistance is maybe guaranteed to be higher, so manhattan works early game
    let num = 0
    let merged = null
    if (pathfinding)
        merged = Object.assign({}, kMineDistance, fMineDistance)
    else
        merged = Object.assign({}, kMineManhattan, fMineManhattan)
    for (const [id, distance] of Object.entries(merged))
        if (distance<20){

          // logic is 10 turns to mine to full, pilgrims walk 1 tile per turn back and forth
        num ++;
    }
    return num
}

var kMineID = {}  // maps mine id to its location
var fMineID = {}

var kMineManhattan = {}  // maps mine id to manhattan distance, use early game before we finish pathfinding
var fMineManhattan = {}

var kMineDistance = {}  // maps mine id to distance from this castle
var fMineDistance = {}

var kMinePilgrim = {}  // maps mine ids to number pilgrims mining there
var fMinePilgrim = {}

var totalMines = 0  // total number of mines

var numKMines = 0  // maybe not all necessary, check dictionary lengths instead?
var numFMines = 0

var numMines = 0  // numMines is number of close mines
var idealNumPilgrims = 0
var numTeamCastles = 0  // number of castles on our team. For now, split mines and pilgrim production

var pilgrimCounter = 0
var crusaderCounter = 0

var recievedMessages = {}

export function castleTurn(r) {
    if (r.me.turn === 1) {
        r.log("I am a Castle")

        totalMines = iDMines(r)  // this calculate total mines, and manhattan distances from each

        numMines = calculateNumMines(r,20);  // this calculates number of mines within range
        
        numKMines = Object.keys(kMineID).length
        numFMines = Object.keys(fMineID).length
        r.log("There are " + numMines + " mines")

        idealNumPilgrims = calculateNumPilgrims(r, false) // based on this being the only castle, split map with opponent

        r.castleTalk(1)
    }

    if (r.me.turn <= 2) {
        // find out how many friendly castles there are, may receive messages on either turn 1 or turn 2
        for (const robot of r.getVisibleRobots()) {
            if (robot.team === r.me.team && robot.unit === SPECS.CASTLE) {
                r.log("I got a message of " + robot.castle_talk + " from " + robot.id)
                recievedMessages[robot.id] = robot.castle_talk
            }
        }
    }
    if (r.me.turn === 3) {
        r.log("This team has " + Object.keys(recievedMessages).length + " castle(s)")  // PROBABLY TEMP WAY TO DO THIS 
    }

    // r.log("The round is: " + r.me.turn)

    // start calculating mine distances, 1 per turn, id of turn-1
    if (r.me.turn <= totalMines) {  // a lot of this is terrible
        let id = r.me.turn - 1
        if (id < numKMines)  // start with karbonite
            kMineDistance[id] = calculateMineDistance(r, id, KARBONITE)
        else {
            id -= numKMines
            // r.log("Finished calculating karbonite distances, id of " + id)
            fMineDistance[id] = calculateMineDistance(r, id, FUEL)
        }
    }

    else if (r.me.turn === totalMines + 1) {
        r.log("Finished calculating fuel distances")
        idealNumPilgrims = calculateNumPilgrims(r, true) // update with newly calculated pathfinding distances
    }

    // build pilgrims
    if (pilgrimCounter < idealNumPilgrims+2 && r.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL) {
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            r.log("Built Pilgrim")
            pilgrimCounter++
            return r.buildUnit(SPECS.PILGRIM, buildDirection[0], buildDirection[1])
        }
    }


    if (r.karbonite > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL) {
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            r.log("Built Prophet")
          
            return r.buildUnit(SPECS.PROPHET, buildDirection[0], buildDirection[1])
        }
    }


    // // build crusaders
    // if (r.karbonite > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL && crusaderCounter * 300 < r.me.turn) {
    //     var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
    //     if (buildDirection != null) {
    //         r.log("Built Crusader")
    //         return r.buildUnit(SPECS.CRUSADER, buildDirection[1], buildDirection[0])
    //         crusaderCounter++
    //     }
    // }
    return
}