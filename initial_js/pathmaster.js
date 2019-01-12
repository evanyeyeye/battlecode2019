import {PathField} from './pathfield.js'
import {SPECS} from 'battlecode'

function generateMatrix(width, height) {
    let matrix = []
    for (let y = 0; y < height; y++) {
        matrix[y] = []
        for (let x = 0; x < width; x++) { 
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

// var directions = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]]
var directions = [[-1, -1],  [-1, 1], [1, 1], [1, -1], [1, 0], [0, 1], [-1, 0], [0, -1]]

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
for (let i = 0; i < 65; i++) {
    squares[i] = i * i
}

class BFSLocation {

    constructor(x, y, dir, dist) {
        this.x = x
        this.y = y
        this.direction = dir
        this.dist = dist
        // this.xdist = xdist
        // this.ydist = ydist
    }


    add(nextDir) {
        let dx = nextDir[0]
        let dy = nextDir[1]
        // return new BFSLocation(this.x + dx, this.y + dy, reverseDirection(dir), this.xdist + cost[dir][1], this.ydist + cost[dir][0])
        if (!nextDir.includes(0))  // diagonal direction
            return new BFSLocation(this.x + dx, this.y + dy, reverseDirection(nextDir), this.dist + 2)

        return new BFSLocation(this.x + dx, this.y + dy, reverseDirection(nextDir), this.dist + 1)
    }
    /*
    dist() {
        return squares[this.xdist] + squares[this.ydist]
    }
    */
}

export class PathMaster {

    constructor(r, map) {
        this.r = r // for debugging
        this.map = map // this map is getPassableMap()
        this.pathFieldCache = generateMatrix(this.map[0].length, this.map.length)
    }

    generatePathField(target, includeCastle = false) {
        let pf = new PathField(this.r, this.map, target)

        let queue = []
        let cur = new BFSLocation(target[0], target[1], [0, 0], 0)
        queue.push(cur)

        while (queue.length > 0) {
            cur = queue.shift()
            if (pf.isPointSet(cur.x, cur.y)) {  // point already exists
                if (pf.getPoint(cur.x, cur.y).dist > cur.dist) {  // update only if new distance is shorter
                    // pf.addDirection(cur.x, cur.y, cur.direction)
                    pf.updatePoint(cur.x, cur.y, cur.direction, cur.dist)
                }
            } 
            else {
                pf.setPoint(cur.x, cur.y, cur.direction, cur.dist)  // set this as a point
                for (let dir of directions) {  // search out
                    let poss = cur.add(dir)
                    if (pf.isPointValid(poss.x, poss.y) && this.isPassable(poss.x, poss.y, includeCastle)) {  // valid point
                        if (!pf.isPointSet(poss.x, poss.y) || pf.getPoint(poss.x, poss.y).dist > poss.dist) {  // point is either not seen before, or can be reached faster
                            queue.push(poss)
                        }
                    }
                }
            }
        }

        return pf
    }

    getPathField(target, includeCastle = false) {
        let x = target[0]
        let y = target[1]
        if (!this.pathFieldCache[y][x]) {
            // this.r.log("Generating path field")
            this.pathFieldCache[y][x] = this.generatePathField(target, includeCastle)
        }
        return this.pathFieldCache[y][x]
    }

    isPassable(x, y, includeCastle = false) {
        if (includeCastle)
            return this.map[y][x]
        let robot = this.r.getRobot(this.r.getVisibleRobotMap()[y][x])
        if(robot == null || (robot.unit != SPECS.CASTLE && robot.unit != SPECS.CHURCH))  // no castle or church there
            return this.map[y][x]
        return false
    }
}