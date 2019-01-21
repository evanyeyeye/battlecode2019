import {SPECS} from 'battlecode'


export default {

    attackingUnits: new Set([SPECS.CRUSADER, SPECS.PROPHET, SPECS.PREACHER]),

    // returns boolean
    // true => horizontal symmetry
    // false => vertical symmetry
    findSymmetry: function (r) {
        const passableMap = r.getPassableMap()
        for (let j = 0; j < Math.floor(passableMap.length / 2); j++) {
            for (let i = 0; i < passableMap[0].length; i++) {
                if (passableMap[j][i] !== passableMap[passableMap.length-j-1][i])
                    return false
            }
        }
        return true
    },

    reflectLocation: function(r, loc) {
        const mapLength = r.getPassableMap().length
        if (r.mapSymmetry)  // horizontal symmetry
            return [loc[0], mapLength - loc[1] - 1]
        return [mapLength - loc[0] - 1, loc[1]]  // vertical symmetry
    },

    // counterclockwise order starting from northwest
    directions: [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]],

    directionsWithDiagonalPriority: [[-1, -1], [-1, 1], [1, 1], [1, -1], [1, 0], [0, 1], [-1, 0], [0, -1]],

    directionToIndex: {
        "-1,-1": 0,
        "-1,0": 1,
        "-1,1": 2,
        "0,1": 3,
        "1,1": 4,
        "1,0": 5,
        "1,-1": 6,
        "0,-1": 7
    },

    // rotate dir counterclockwise n times, use negative n for clockwise
    rotateDirection: function (dir, n) {
        return this.directions[(this.directionToIndex[dir] + n + 8) % 8]
    },

    directionToReverse: {
        "-1,-1": [1, 1],
        "-1,0": [1, 0],
        "-1,1": [1, -1],
        "0,1": [0, -1],
        "1,1": [-1, -1],
        "1,0": [-1, 0],
        "1,-1": [-1, 1],
        "0,-1": [0, 1],
        "0,0": [0, 0],
        "2,0": [-2, 0],
        "-2,0": [2, 0],
        "0,2": [0, -2],
        "0,-2": [0, 2]
    },

    reverseDirection: function (dir) {
        return this.directionToReverse[dir]
    },

    directionToDouble: {
        "1,0": [2, 0],
        "-1,0": [-2, 0],
        "0,1": [0, 2],
        "0,-1": [0, -2]
    },

    doubleDirection: function (dir) {
        return this.directionToDouble[dir]
    },

    directionToCost: {
        "0,0": 0,
        "-1,0": 1,
        "0,1": 1,
        "1,0": 1,
        "0,-1": 1,
        "-1,-1": 2,
        "-1,1": 2,
        "1,1": 2,
        "1,-1": 2,
        "2,0": 4,
        "-2,0": 4,
        "0,2": 4,
        "0,-2": 4
    },

    getDirectionCost: function (dir) {
        return this.directionToCost[dir]
    },

    // try to move in dir
    // if occupied, try to move in adjacent left and right dirs
    // returns null if movement failed
    tryMoveRotate: function (r, dir) {
        if (dir === [0, 0] || dir.includes(2) || dir.includes(-2))
            return null

        const x = r.me.x
        const y = r.me.y
        for (const n of [0, 1, -1]) {
            const tryDir = this.rotateDirection(dir, n) 
            const tryX = x + tryDir[0]
            const tryY = y + tryDir[1]
            if ((!r.previousLoc || !(r.previousLoc[0] == r.me.turn - 1 && r.previousLoc[1][0] == tryX && r.previousLoc[1][1] == tryY)) && this.isEmpty(r, tryX, tryY)) {
                r.previousLoc = [r.me.turn, [x, y]]
                return r.move(tryDir[0], tryDir[1])
            }
        }

        return null
    },

    // checks if square is passable and is not occupied
    // (x, y) must be in robot vision range 
    isEmpty: function (r, x, y) {
        if (x < 0 || x >= r.map[0].length || y < 0 || y >= r.map.length)
            return false
        const passableMap = r.getPassableMap();
        const visibleRobotMap = r.getVisibleRobotMap();
        return passableMap[y][x] && visibleRobotMap[y][x] <= 0
    },

    // checks if square is passable, not occupied, and not a mine
    // for use with defensive units
    isStandable: function(r, x, y, spread = false) {
        if (x < 0 || x >= r.map[0].length || y < 0 || y >= r.map.length)
            return false
        if (r.getPassableMap()[y][x] && r.getVisibleRobotMap()[y][x] <= 0 && !r.getKarboniteMap()[y][x] && !r.getFuelMap()[y][x]) {
            for (const dir of this.directions) {
                const possibleRobot = r.getVisibleRobotMap()[y + dir[1]][x + dir[0]]
                if (possibleRobot > 0) {
                    const type = r.getRobot(possibleRobot).unit
                    if (type === SPECS.CHURCH || type === SPECS.CASTLE) {
                        return false
                    }
                    if (spread && type == r.me.unit)
                        return false
                }
            }
            return true
        }
        return false
    },

    // checks the square is passable and is occupied
    // (x, y) must be in robot vision range
    isOccupied: function (r, x, y) {
        if (x < 0 || x >= r.map[0].length || y < 0 || y >= r.map.length)
            return false
        const passableMap = r.getPassableMap();
        const visibleRobotMap = r.getVisibleRobotMap();
        return passableMap[y][x] && visibleRobotMap[y][x] > 0
    },


    // checks to see if an enemy unit can attack and is within range of loc
    isEnemyInRange: function (enemy, loc) {
        const isAttackingUnit = this.attackingUnits.has(enemy.unit)
        const isWithinRange = this.getSquaredDistance(enemy.x, enemy.y, loc[0], loc[1]) < SPECS.UNITS[enemy.unit].ATTACK_RADIUS[1]
        return isAttackingUnit && isWithinRange
    },

    absCache: new Map(),
    getManhattanDistance: function (x1, y1, x2, y2) {
        const dx = x2 - x1
        const dy = y2 - y1
        if (!this.absCache.has(dx))
            this.absCache.set(dx, Math.abs(dx))
        if (!this.absCache.has(dy))
            this.absCache.set(dy, Math.abs(dy))
        return this.absCache.get(dx) + this.absCache.get(dy)
    },

    squaredCache: new Map(),
    getSquaredDistance: function (x1, y1, x2, y2) {
        const dx = x2 - x1
        const dy = y2 - y1
        if (!this.squaredCache.has(dx))
            this.squaredCache.set(dx, dx * dx)
        if (!this.squaredCache.has(dy))
            this.squaredCache.set(dy, dy * dy)
        return this.squaredCache.get(dx) + this.squaredCache.get(dy)
    },

    generateMatrix: function (width, height) {
        const matrix = []
        for (let y = 0; y < height; y++) {
            matrix[y] = []
            for (let x = 0; x < width; x++) { 
                matrix[y][x] = null
            }    
        }
        return matrix
    }

}   