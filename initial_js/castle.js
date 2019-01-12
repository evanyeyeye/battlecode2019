import {SPECS} from 'battlecode'

const KARBONITE =  0
const FUEL = 1

var directions = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]]

function isEmpty(r, x, y) {
    var passableMap = r.map;
    var visibleRobotMap = r.getVisibleRobotMap();
    return passableMap[y][x] && visibleRobotMap[y][x] == 0;
}

function findBuildDirection(r, x, y) {
    for (let dir of directions) {
        if (isEmpty(r, x + dir[0], y + dir[1])) {
            return dir
        }
    }
    return null
}

function iDMines(r) {  // deterministically label mines
    let kCounter = 0  // counts number of karbonite mines
    let fCounter = 0  // counts number of fuel mines
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i]){
                kMineID[kCounter] = i.toString()+','+j.toString()
                kCounter++
            }
            if (r.fuel_map[j][i]) {
                fMineID[fCounter] = i.toString()+','+j.toString()
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

var kMineID = {}  // maps mine id to its location
var fMineID = {}

var karboniteMines = {}  // maps mine id to distance from this castle
var fuelMines = {}

var numMines = 0
var numKMines = 0  // maybe not all necessary, check dictionary lengths instead?
var numFMines = 0

var pilgrimCounter = 0
var crusaderCounter = 0

export function castleTurn(r) {
    if (r.me.turn == 1) {
        r.log("I am a Castle")
        numMines = iDMines(r)
        numKMines = Object.keys(kMineID).length
        numFMines = Object.keys(fMineID).length
        r.log("There are " + numMines + " mines")
    }

    // start calculating mine distances, 1 per turn, id of turn-1
    if (r.me.turn <= numMines) {  // a lot of this is terrible
        let id = r.me.turn - 1
        if (id < numKMines)  // start with karbonite
            karboniteMines[id] = calculateMineDistance(r, id, KARBONITE)
        else {
            id -= numKMines
            r.log("Finished calculating karbonite distances, id of " + id)
            fuelMines[id] = calculateMineDistance(r, id, FUEL)
        }
    }
    else if (r.me.turn == numMines+1) {
        r.log("Finished calculating fuel distances")
    }

    // r.log("The round is: " + r.me.turn)
    // build pilgrims
    if (pilgrimCounter < numMines && r.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL) {
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            r.log("Built Pilgrim")
            pilgrimCounter++
            return r.buildUnit(SPECS.PILGRIM, buildDirection[0], buildDirection[1])
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