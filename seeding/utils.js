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
        "0,0": [0, 0]
    },

    reverseDirection: function (dir) {
        return this.directionToReverse[dir]
    },

    // try to move in dir
    // if occupied, try to move in adjacent left and right dirs
    // returns null if movement failed
    tryMoveRotate: function (r, dir) {
        if (dir === [0, 0])
            return null

        const x = r.me.x
        const y = r.me.y
        for (const n of [0, 1, -1]) {
            const tryDir = this.rotateDirection(dir, n) 
            const tryX = x + tryDir[0]
            const tryY = y + tryDir[1]
            if (this.isEmpty(r, tryX, tryY))
                return r.move(tryDir[0], tryDir[1])
        }

        // maybe we will use this later
        // if (dir[0] == 0 || dir[1] == 0)  // can only move r^2 of 4
        //     if (utils.isEmpty(r, x + 2*dir[0], y + 2*dir[1])) {
        //         r.log("gonna double move")
        //         return r.move(2*dir[0], 2*dir[1])
        //     }
        
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