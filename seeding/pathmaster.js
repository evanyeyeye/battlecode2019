import {SPECS} from 'battlecode'
import {PathField} from './pathfield.js'
import utils from './utils.js'


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
        // return new BFSLocation(this.x + dx, this.y + dy, utils.reverseDirection(dir), this.xdist + cost[dir][1], this.ydist + cost[dir][0])
        if (!nextDir.includes(0))  // diagonal direction
            return new BFSLocation(this.x + dx, this.y + dy, utils.reverseDirection(nextDir), this.dist + 2)

        return new BFSLocation(this.x + dx, this.y + dy, utils.reverseDirection(nextDir), this.dist + 1)
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
        this.pathFieldCache = utils.generateMatrix(this.map[0].length, this.map.length)
    }

    generatePathField(target, includeCastle=false) {
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
                for (let dir of utils.directionsWithDiagonalPriority) {  // search out
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

    getPathField(target, includeCastle=false) {
        let x = target[0]
        let y = target[1]
        // /*  // TEMP
        if (!this.pathFieldCache[y][x]) {
            // this.r.log("Generating path field")
            this.pathFieldCache[y][x] = this.generatePathField(target, includeCastle)
        }
        return this.pathFieldCache[y][x]
        // /  // TEMP
        // return this.generatePathField(target, includeCastle)  // TEMP
    }

    isPassable(x, y, includeCastle=false) {  // include castle/church lets them be counted as valid
        if (includeCastle)
            return this.map[y][x]
        let robot = this.r.getRobot(this.r.getVisibleRobotMap()[y][x])
        if(robot == null || (robot.unit != SPECS.CASTLE && robot.unit != SPECS.CHURCH))  // no castle or church there
        // if(robot === null || this.r.me.id === robot.id)  // TEMP
            return this.map[y][x]
        return false
    }
}