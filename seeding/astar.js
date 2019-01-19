import {PathField} from './pathfield.js'
import utils from './utils.js'
import {SPECS} from 'battlecode'

// taken from stack overflow, https://stackoverflow.com/questions/42919469/efficient-way-to-implement-priority-queue-in-javascript
const top = 0
const parent = i => ((i + 1) >>> 1) - 1  // i think to get the parent index of an index i
const left = i => (i << 1) + 1  // get left index
const right = i => (i + 1) << 1  // get right index


class PriorityQueue {
    constructor(comparator = (a, b) => a > b) {  // default is greatest to least
        this._heap = []
        this._comparator = comparator
    }
    size() {
        return this._heap.length
    }
    isEmpty() {
        return this.size() == 0
    }
    peek() {
        return this._heap[top]
    }
    push(...values) {  // "..." basically means indefinite arguments
        values.forEach(value => {
            this._heap.push(value);
            this._siftUp()
        })
        return this.size()
    }
    pop() {
        const poppedValue = this.peek()
        const bottom = this.size() - 1
        if (bottom > top) {
            this._swap(top, bottom)
        }
        this._heap.pop()
        this._siftDown()
        return poppedValue
    }
    replace(value) {
        const replacedValue = this.peek()
        this._heap[top] = value
        this._siftDown()
        return replacedValue
    }
    _greater(i, j) {
        return this._comparator(this._heap[i], this._heap[j])
    }
    _swap(i, j) {
        [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]]
    }
    _siftUp() {
        let node = this.size() - 1
        while (node > top && this._greater(node, parent(node))) {  // not sorted as heap
            this._swap(node, parent(node))
            node = parent(node)  // move up
        }
    }
    _siftDown() {
        let node = top
        while (
            (left(node) < this.size() && this._greater(left(node), node)) ||  // not sorted as a heap
            (right(node) < this.size() && this._greater(right(node), node))
        )   {
            let maxChild = (right(node) < this.size() && this._greater(right(node), left(node))) ? right(node): left(node)  // find the node to move up
            this._swap(node, maxChild)
            node = maxChild  // move down
        }
    }
}


const four = [[2, 0], [-2, 0], [0, 2], [0, -2]]
const five = [[1, 2], [-1, 2], [1, -2], [-1, -2], [2, 1], [-2, 1], [2, -1], [-2, -1]]
const eight = [[2, 2], [-2, 2], [2, -2], [-2, -2]]
const nine = [[3, 0], [-3, 0], [0, 3], [0, -3]]

// taken from last year python a*
class Node {
	constructor(x, y, parent, g, h) {
		this.x = x
		this.y = y
        this.parent = parent
		this.f = g + h  // cost to minimize
        this.g = g
        this.h = h
	}

    lessThan(other) {
        return this.f < other.f
    }
}


export class AStar {
	constructor(r, map) {
		this.r = r
		this.map = map
        this.heatMap = utils.generateMatrix(this.map[0].length, this.map.length)  // activity is back! null if nothing, else is [robotid, activity of that id]

        // future:
        // caching
        // fix edge case where u see a robot on other side of thin wall, move away, come back, etc. light caching of robot positions outside vision range
        // support for fast moving to castle?
        // edge case double move to castle across wall
	}

    findPath(target, radius = SPECS.UNITS[this.r.unit].SPEED, fast = false) {  // array targets, returns a node object. Radius = max squared movement radius. Fast = ignore squared cost
        const nodeMap = utils.generateMatrix(this.map[0].length, this.map.length)  // holds null or nodes, for updating cost/parent of nodes

        const fringe = new PriorityQueue((a,b) => a.lessThan(b))
        const source = new Node(this.r.me.x, this.r.me.y, null, 0, utils.getManhattanDistance(this.r.me.x, this.r.me.y, target[0], target[1]))
        fringe.push(source)

        nodeMap[source.y][source.x] = source
        while (fringe.size() > 0) {
            const v = fringe.pop()
            if (nodeMap[v.y][v.x] && nodeMap[v.y][v.x].f > v.f)  // already have a lower cost way to get here
                continue
            if (v.x == target[0] && v.y == target[1]) {  // we found the target
                return v
            }
            for (const [dx, dy] of this.getDirections(v, radius, fast)) {
                const x = v.x + dx
                const y = v.y + dy
                if (this.probablyIsEmpty(x, y) || (x == target[0] && y == target[1] && this.isPassable(x, y))) {  // either empty, or passable and is target
                    let dg = 1  // additional cost to move to the next tile
                    if (fast)
                        dg = Math.abs(dx) + Math.abs(dy)  // bad
                    else
                        dg = dx*dx + dy*dy  // even worse!
                    const h = utils.getManhattanDistance(x, y, target[0], target[1])  // distance from target
                    if (nodeMap[y][x] === null) {  // node has not been visited
                        const a = new Node(x, y, v, v.g + dg, h)
                        nodeMap[y][x] = a
                        fringe.push(a)
                    }
                    else {
                        if (nodeMap[y][x].f > (v.g + dg + h)) {  // we have a cheaper way
                            const a = nodeMap[y][x]
                            a.parent = v
                            a.g = v.g + dg
                            a.h = h
                            a.f = a.g + a.h
                            fringe.push(a)
                        }
                    }
                }
            }

        }
        return null
    }

    // get directions depending on radius, ordered with radius and fast. returns array of arrays
    getDirections(node, radius, fast) {
        let directions = utils.directionsWithDiagonalPriority
        if (fast) {
            if (radius >= 4)
                directions = four.concat(directions)
            if (radius >= 5)
                directions = five.concat(directions)
            if (radius >= 8)
                directions = eight.concat(directions)
            if (radius >= 9)
                directions = nine.concat(directions)
        }
        else {
            if (radius >= 4)
                directions = directions.concat(four)
            if (radius >= 5)
                directions = directions.concat(five)
            if (radius >= 8)
                directions = directions.concat(eight)
            if (radius >= 9)
                directions = directions.concat(nine)
        }
        return directions
    }

    // return array of dx, dy to advance. Should implement some basic caching + recalculating or something
    nextDirection(node) {
        // this.r.log("I am at " + this.r.me.x + "," + this.r.me.y)
        while (node.parent != null && (node.parent.x !== this.r.me.x || node.parent.y !== this.r.me.y)) {
            node = node.parent
        }
        const dx = node.x - this.r.me.x
        const dy = node.y - this.r.me.y
        return [dx, dy]
    }

    isPassable(x, y) {
        if (x < 0 || x >= this.map[0].length || y < 0 || y >= this.map.length)
            return false
        return this.map[y][x]
    }

    // really messy! uses heatmap to estimate about robots out of range
    probablyIsEmpty(x, y) {
        if (x < 0 || x >= this.map[0].length || y < 0 || y >= this.map.length)  // out of bounds
            return false
        const robotID = this.r.getVisibleRobotMap()[y][x]
        if (robotID === 0) {  // there is no robot here
            this.heatMap[y][x] = null
            return this.map[y][x]
        }
        else if (robotID === -1) {  // we can't see here
            if (this.heatMap[y][x] !== null && 0 < this.heatMap[y][x][1] < 100) {  // we saw before a unit that could move
                this.heatMap[y][x] --  // decrement activity
                return false
            }
            else {
                this.heatMap[y][x] = null  // reset the location
                return this.map[y][x]
            }
        }

        else {  // we can see a robot here
            if (this.r.getRobot(robotID).unit == SPECS.CASTLE || this.r.getRobot(robotID).unit == SPECS.CHURCH) {  // normally avoid castles
                this.heatMap[y][x] = [robotID, 100]  // permanently avoid 100
                return false
            }

            if (this.heatMap[y][x] !== null && robotID === this.heatMap[y][x][0]) {  // we saw the same robot here before
                // this.r.log("I'm seeing the same robot at " + x + "," + y + ". id is: " + robotID)
                if (this.heatMap[y][x][1] < 100)
                    this.heatMap[y][x][1] += 10  // lets not move back for a while
                return false
            }

            // there is a robot here, and we haven't seen it before
            // this.r.log("there is a new robot here, before: " + this.heatMap[y][x] + " new: " + robotID)
            this.heatMap[y][x] = [robotID, 1]
            return this.map[y][x]  // even if we can see it, its our first time. lets try to move there anyway
        }
    }
}