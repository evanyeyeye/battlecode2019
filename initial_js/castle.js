import {SPECS} from 'battlecode'

const KARBONITE =  0
const FUEL = 1

var directions = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]]

function isEmpty(r, x, y) {
    var passableMap = r.map;
    var visibleRobotMap = r.getVisibleRobotMap();
    return passableMap[y][x] && visibleRobotMap[y][x] == 0;
}

function getManhattanDistance(x1, y1, x2, y2) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1)
}

function findBuildDirection(r, x, y) {
    for (let dir of directions) {
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
function calculateNumMines(r,distance_threshhold){
    let closeMineCount=0;
     let merged = Object.assign({}, kMineDistance, fMineDistance);
     r.log(merged)
     for (const [location, distance] of Object.entries(merged)) {
        // r.log(distance)
        if (distance < distance_threshhold) {
            closeMineCount++;
        }
    }
    return closeMineCount;


    
}

var kMineID = {}  // maps mine id to its location
var fMineID = {}

var kMineDistance = {}  // maps mine id to distance from this castle
var fMineDistance = {}

var kMineManhattan = {}  // maps mine id to manhattan distance, use early game before we finish pathfinding
var fMineManhattan = {}

var kMinePilgrim = {}  // maps mine ids to number pilgrims mining there
var fMinePilgrim = {}

var totalMines = 0  // total mine is number of total mines
var numKMines = 0  // maybe not all necessary, check dictionary lengths instead?
var numFMines = 0
var numMines = 0;  // numMines is number of close mines

var pilgrimCounter = 0
var crusaderCounter = 0

export function castleTurn(r) {
    if (r.me.turn == 1) {
        r.log("I am a Castle")

        totalMines = iDMines(r)  // this calculate total mines

        numMines = calculateNumMines(r,20);  // this calculates number of mines within range
        
        numKMines = Object.keys(kMineID).length
        numFMines = Object.keys(fMineID).length
        r.log("There are " + numMines + " mines")
    }

    // r.log("The round is: " + r.me.turn)

    // start calculating mine distances, 1 per turn, id of turn-1
    if (r.me.turn <= totalMines) {  // a lot of this is terrible
        let id = r.me.turn - 1
        if (id < numKMines)  // start with karbonite
            kMineDistance[id] = calculateMineDistance(r, id, KARBONITE)
        else {
            id -= numKMines
            r.log("Finished calculating karbonite distances, id of " + id)
            fMineDistance[id] = calculateMineDistance(r, id, FUEL)
        }
    }
    else if (r.me.turn == numMines+1) {
        r.log("Finished calculating fuel distances")

    }

    // build pilgrims
    if (pilgrimCounter < numMines+2 && r.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL) {
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            r.log("Built Pilgrim")
            pilgrimCounter++
            return r.buildUnit(SPECS.PILGRIM, buildDirection[0], buildDirection[1])
        }
    }
    /*
    if (r.karbonite > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL) {
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            r.log("Built Prophet")
          
            return r.buildUnit(SPECS.PROPHET, buildDirection[0], buildDirection[1])
        }
    }
    */

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