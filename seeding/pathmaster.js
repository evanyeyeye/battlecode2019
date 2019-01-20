import {SPECS} from 'battlecode'
import {PathField} from './pathfield.js'
import utils from './utils.js'


class BFSLocation {

    constructor(x, y, dir, dist) {
        this.x = x
        this.y = y
        this.direction = dir
        this.dist = dist
    }


    add(nextDir) {
        let dx = nextDir[0]
        let dy = nextDir[1]
        return new BFSLocation(this.x + dx, this.y + dy, utils.reverseDirection(nextDir), this.dist + utils.getDirectionCost(nextDir))
    }

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
                    pf.updatePoint(cur.x, cur.y, cur.direction, cur.dist)
                }
            } else {
                pf.setPoint(cur.x, cur.y, cur.direction, cur.dist)  // set this as a point
                for (let dir of utils.directionsWithDiagonalPriority) {  // search out
                    let poss = cur.add(dir)
                    if (pf.isPointValid(poss.x, poss.y)) {
                        if (this.isPassable(poss.x, poss.y, includeCastle)) {
                            if (!pf.isPointSet(poss.x, poss.y) || pf.getPoint(poss.x, poss.y).dist > poss.dist)
                                queue.push(poss)
                        } else if (dir.includes(0)) {  // try double step
                            poss = cur.add(utils.doubleDirection(dir))
                            if (pf.isPointValid(poss.x, poss.y) && 
                                this.isPassable(poss.x, poss.y, includeCastle) && 
                                (!pf.isPointSet(poss.x, poss.y) || pf.getPoint(poss.x, poss.y).dist > poss.dist))
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
        if (!this.pathFieldCache[y][x]) {
            this.pathFieldCache[y][x] = this.generatePathField(target, includeCastle)
        }
        return this.pathFieldCache[y][x]
    }

    isPassable(x, y, includeCastle=false) {  // include castle/church lets them be counted as valid
        if (includeCastle || !this.map[y][x])
            return this.map[y][x]
        let robot = this.r.getRobot(this.r.getVisibleRobotMap()[y][x])
        return (robot == null || (robot.unit != SPECS.CASTLE && robot.unit != SPECS.CHURCH))  // no castle or church there
    }
}