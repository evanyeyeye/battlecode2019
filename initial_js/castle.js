import {SPECS} from 'battlecode'

var directions = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]]

function isEmpty(r, x, y) {
    var passableMap = r.map;
    var visibleRobotMap = r.getVisibleRobotMap();
    return passableMap[y][x] && visibleRobotMap[y][x] == 0;
}

function findBuildDirection(r, x, y) {
    for (let dir of directions) {
        if (isEmpty(r, x + dir[1], y + dir[0])) {
            return dir
        }
    }
    return null
}

function iDMines(r) {  // deterministically label mines
    let counter = 0
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i] || r.fuel_map[j][i]){
                r.log("Castle: Mine at " + [i, j] + " is " + counter)
                mineID[[i, j]] = counter
                counter++
            }
        }
    }
}

var mineID = {}
var pilgrimCounter = 0
var crusaderCounter = 0

export function castleTurn(r) {
    if (r.me.turn == 1) {
        r.log("I am a Castle")
        iDMines(r)
    }
    // build pilgrims
    if (pilgrimCounter < 3 && r.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL && pilgrimCounter * 300 < r.me.turn) {
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            r.log("Built Pilgrim")
            return r.buildUnit(SPECS.PILGRIM, buildDirection[1], buildDirection[0])
        }
        pilgrimCounter++
    }
    // // build crusaders
    // if (r.karbonite > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL && crusaderCounter * 300 < r.me.turn) {
    //     var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
    //     if (buildDirection != null) {
    //         r.log("Built Crusader")
    //         return r.buildUnit(SPECS.CRUSADER, buildDirection[1], buildDirection[0])
    //     }
    //     crusaderCounter++
    // }
    return
}