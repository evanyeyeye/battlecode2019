function generateMatrix(height, width) {
    var matrix = []
    for (var y = 0; y < height; y++) {
        matrix[y] = []
        for (var x = 0; x < width; x++) { 
            matrix[y][x] = null
        }    
    }
    return matrix
}

class PathPoint {

    constructor(dirs, dist) {
        this.dirs = dirs
        this.dist = dist
        this.sorted = false
    }

    addDirection(dir) {
        this.dirs.push(dir)
    }
}

export class PathField {

    constructor(r, map, target) {
        this.r = r // for debugging
        this.map = map // this map is getPassableMap()
        this.target = target
        this.field = generateMatrix(this.map.length, this.map[0].length)
    }

    isPointValid(x, y) {
        return x >= 0 && x < this.map[0].length && y >= 0 && y < this.map.length
    }

    isPointSet(x, y) {
        return this.field[y][x] != null
    }

    findOptimalDirection(x, y, target) {
        var dx = target[1] - x
        var dy = target[0] - y
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

    getDirectionAffinity(a, b) {
        var adx = a[1]
        var ady = a[0]
        var bdx = b[1]
        var bdy = b[0]
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

    sortDirectionsAtPoint(x, y) {
        this.sorted = true
        var optimalDirection = this.findOptimalDirection(x, y, this.target)
        var self = this
        this.field[y][x].dirs.sort(function(a, b) {
            return self.getDirectionAffinity(b, optimalDirection) - self.getDirectionAffinity(a, optimalDirection)
        })
    }

    getDirectionAtPoint(x, y) {
        if (!this.field[y][x].sorted) {
            this.sortDirectionsAtPoint(x, y)
        }
        return this.field[y][x].dirs[0]
    }

    getPoint(x, y) {
        return this.field[y][x]
    }

    setPoint(x, y, dir, dist) {
        this.field[y][x] = new PathPoint([dir], dist)
    }

    addDirection(x, y, dir) {
        this.field[y][x].addDirection(dir)
    }
}