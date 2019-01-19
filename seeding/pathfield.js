import utils from './utils.js'


// stores direction to move in, distance to target?
class PathPoint {

    constructor(dir, dist) {
        this.direction = dir
        this.dist = dist
        this.sorted = false
    }

    // addDirection(dir) {
    //     this.direction.push(dir)
    // }
}

// matrix holding PathPoints that point to the target
export class PathField {

    constructor(r, map, target) {
        this.r = r  // for debugging
        this.map = map  // this map is getPassableMap()
        this.target = target
        this.field = utils.generateMatrix(this.map[0].length, this.map.length)
    }

    isPointValid(x, y) {
        return x >= 0 && x < this.map[0].length && y >= 0 && y < this.map.length
    }

    isPointSet(x, y) {
        return this.field[y][x] != null
    }

    // return optimal direction to move from (x, y) to target
    findOptimalDirection(x, y, target) {
        let dx = target[0] - x
        let dy = target[1] - y
        if (Math.abs(dx) >= 2.414 * Math.abs(dy)) {
            if (dx > 0) {
                return [0, 1]
            } else {
                return [0, -1]
            }
        } else if (Math.abs(dy) >= 2.414 * Math.abs(dx)) {
            if (dy > 0) {
                return [-1, 0]
            } else {
                return [1, 0]
            }
        } else {
            if (dy > 0) {
                if (dx > 0) {
                    return [-1, 1]
                } else {
                    return [-1, -1]
                }
            } else {
                if (dx > 0) {
                    return [1, 1]
                } else {
                    return [1, -1]
                }
            }
        }
    }

    // idk what this does, not changed for x,y
    getDirectionAffinity(a, b) {
        let adx = a[1]
        let ady = a[0]
        let bdx = b[1]
        let bdy = b[0]
        if (adx == 0 || ady == 0) {
            adx *= 2
            ady *= 2
        }
        if (bdx == 0 || bdy == 0) {
            bdx *= 2
            bdy *= 2
        }
        return (adx * bdx) + (ady * bdy)
    }

    // sortDirectionsAtPoint(x, y) {
    //     this.field[y][x].sorted = true
    //     var optimalDirection = this.findOptimalDirection(x, y, this.target)
    //     var self = this
    //     this.field[y][x].direction.sort(function(a, b) {
    //         return self.getDirectionAffinity(b, optimalDirection) - self.getDirectionAffinity(a, optimalDirection)
    //     })
    // }

    getDirectionAtPoint(x, y) {
        // this.r.log(this.field)
        // if (!this.field[y][x].sorted) {
        //     this.sortDirectionsAtPoint(x, y)
        // }
        // var first = this.field[y][x].direction[0]
        // var second = this.getDirectionAtPoint(y + first[0], x + first[1])
        // var third = this.getDirectionAtPoint(y + first[0] + second[0], x + first[1] + second[1])
        // return [first, second, third]
        return this.field[y][x].direction
    }

    getDistanceAtPoint(x, y) {
        return this.field[y][x].dist
    }

    getPoint(x, y) {
        return this.field[y][x]
    }

    setPoint(x, y, dir, dist) {
        this.field[y][x] = new PathPoint(dir, dist)
    }

    updatePoint(x, y, dir, dist) {
        this.field[y][x].direction = dir
        this.field[y][x].dist = dist
    }
    // addDirection(x, y, dir) {
    //     this.field[y][x].addDirection(dir)
    // }
}