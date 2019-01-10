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

var pilgrimCounter = 0
var crusaderCounter = 0

export function castleTurn(r) {
    if (r.me.turn == 1) {
        r.log("I am a Castle")
    }
    if (r.karbonite > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL && crusaderCounter * 300 < r.me.turn) {
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            r.log("Built Crusader")
            return r.buildUnit(SPECS.CRUSADER, buildDirection[1], buildDirection[0])
        }
        crusaderCounter++
    }
    return
}