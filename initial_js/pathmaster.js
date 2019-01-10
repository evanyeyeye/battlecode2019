import {PathField} from './pathfield.js'

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

// dictionary keys automatically becoming strings
var mapping = {}
mapping[[-1, -1]] = [1, 1]
mapping[[-1, 0]] = [1, 0]
mapping[[-1, 1]] = [1, -1]
mapping[[0, -1]] = [0, 1]
mapping[[0, 0]] = [0, 0]
mapping[[0, 1]] = [0, -1]
mapping[[1, -1]] = [-1, 1]
mapping[[1, 0]] = [-1, 0]
mapping[[1, 1]] = [-1, -1]

export function reverseDirection(dir) {
    return mapping[dir]
}

var directions = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]]

export class PathLocation {

    constructor(x, y, dir, dist) {
        this.x = x
        this.y = y
        this.dir = dir
        this.dist = dist
    }

    add(dir) {
        var dx = dir[1]
        var dy = dir[0]
        return new PathLocation(this.x + dx, this.y + dy, reverseDirection(dir), this.dist + 1)
    }
}

export class PathMaster {

    constructor(r, map) {
        this.r = r // for debugging
        this.map = map // this map is getPassableMap()
        this.pathFieldCache = generateMatrix(this.map.length, this.map[0].length)
    }

    generatePathField(target) {
        var pf = new PathField(this.r, this.map, target)

        var queue = []
        var cur = new PathLocation(target[1], target[0], [0, 0], 0)
        queue.push(cur)

        while (queue.length > 0) {
            cur = queue.shift()
            if (pf.isPointSet(cur.x, cur.y)) {
                if (pf.getPoint(cur.x, cur.y).dist == cur.dist) {
                    pf.addDirection(cur.x, cur.y, cur.dir)
                }
                continue
            } else {
                pf.setPoint(cur.x, cur.y, cur.dir, cur.dist)
            }
            for (let dir of directions) {
                var poss = cur.add(dir)
                if (pf.isPointValid(poss.x, poss.y) && this.isPassable(cur.x, cur.y)) {
                    if (!pf.isPointSet(poss.x, poss.y) || pf.getPoint(poss.x, poss.y).dist == poss.dist) {
                        queue.push(poss)
                    }
                }
            }
        }

        return pf
    }

    getPathField(target) {
        var x = target[1]
        var y = target[0]
        if (this.pathFieldCache[y][x] == null) {
            this.pathFieldCache[y][x] = this.generatePathField(target)
        }
        return this.pathFieldCache[y][x]
    }

    isPassable(x, y) {
        return this.map[y][x]
    }
}