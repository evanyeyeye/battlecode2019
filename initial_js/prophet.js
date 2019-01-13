import {SPECS} from 'battlecode'
var karboniteMines = {}  // maps mine locations to distance from base castle location
var fuelMines = {}
var mineID = {}  // maps location of mine to its ID
var fuelMines = {}
export function prophetTurn(r) {
    return
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
                counter++
            }
        }
    }
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