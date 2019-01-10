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
var reverse = {}
reverse[[-1, -1]] = [1, 1]
reverse[[-1, 0]] = [1, 0]
reverse[[-1, 1]] = [1, -1]
reverse[[0, -1]] = [0, 1]
reverse[[0, 0]] = [0, 0]
reverse[[0, 1]] = [0, -1]
reverse[[1, -1]] = [-1, 1]
reverse[[1, 0]] = [-1, 0]
reverse[[1, 1]] = [-1, -1]

export function reverseDirection(dir) {
    return reverse[dir]
}

var directions = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]]

var cost = {}
cost[[-1, -1]] = [1, 1]
cost[[-1, 0]] = [1, 0]
cost[[-1, 1]] = [1, 1]
cost[[0, -1]] = [0, 1]
cost[[0, 0]] = [0, 0]
cost[[0, 1]] = [0, 1]
cost[[1, -1]] =[1, 1]
cost[[1, 0]] = [1, 0]
cost[[1, 1]] = [1, 1]

var squares = {}
for (var i = 0; i < 65; i++) {
    squares[i] = i * i
}

class BFSLocation {

    constructor(x, y, dir, xdist, ydist) {
        this.x = x
        this.y = y
        this.dir = dir
        this.xdist = xdist
        this.ydist = ydist
    }

    add(dir) {
        var dx = dir[1]
        var dy = dir[0]
        return new BFSLocation(this.x + dx, this.y + dy, reverseDirection(dir), this.xdist + cost[dir][1], this.ydist + cost[dir][0])
    }

    dist() {
        return squares[this.xdist] + squares[this.ydist]
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
        var cur = new BFSLocation(target[1], target[0], [0, 0], 0, 0)
        queue.push(cur)

        while (queue.length > 0) {
            cur = queue.shift()
            if (pf.isPointSet(cur.x, cur.y)) {
                if (pf.getPoint(cur.x, cur.y).dist > cur.dist()) {
                    pf.setPoint(cur.x, cur.y, cur.dir, cur.dist())
                } else if (pf.getPoint(cur.x, cur.y).dist == cur.dist()) {
                    pf.addDirection(cur.x, cur.y, cur.dir)
                }
                continue
            } else {
                pf.setPoint(cur.x, cur.y, cur.dir, cur.dist())
            }
            for (let dir of directions) {
                var poss = cur.add(dir)
                if (pf.isPointValid(poss.x, poss.y) && this.isPassable(cur.x, cur.y)) {
                    if (!pf.isPointSet(poss.x, poss.y) || pf.getPoint(poss.x, poss.y).dist >= poss.dist()) {
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