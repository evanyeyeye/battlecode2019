import {PathField} from './pathfield.js'
import utils from './utils.js'
import {SPECS} from 'battlecode'

const HEAT_MAX = 1000

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
        this.child = null
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
        this.heatMap = utils.generateMatrix(this.map[0].length, this.map.length)  // activity is back! null if nothing, else is [in enemy range or not, heat, last turn updated]

        // future:
        // caching
        // fix edge case where u see a robot on other side of thin wall, move away, come back, etc. light caching of robot positions outside vision range
        // support for fast moving to castle?
        // edge case double move to castle across wall
	}

    findPath(target, radius = SPECS.UNITS[this.r.me.unit].SPEED, fast = false) {  // array targets, returns a node object. Radius = max squared movement radius. Fast = ignore squared cost
        if (!utils.isPassable(this.r, target[0], target[1]))
            return null
        const nodeMap = utils.generateMatrix(this.map[0].length, this.map.length)  // holds null or nodes, for updating cost/parent of nodes
        // const tempMap = utils.generateMatrix(this.map[0].length, this.map.length)  // the caching right now happens every time you visit a node, which could be multiple times for 1 pathfinding

        const fringe = new PriorityQueue((a,b) => a.lessThan(b))
        const source = new Node(this.r.me.x, this.r.me.y, null, 0, utils.getManhattanDistance(this.r.me.x, this.r.me.y, target[0], target[1]))
        fringe.push(source)

        nodeMap[source.y][source.x] = source
        while (fringe.size() > 0) {
            const v = fringe.pop()
            if (nodeMap[v.y][v.x] && nodeMap[v.y][v.x].f > v.f)  // already have a lower cost way to get here
                continue
            if (v.x == target[0] && v.y == target[1]) {  // we found the target
                let temp = v
                while (temp.parent !== null) {  // label all the children in the final path
                    const child = temp
                    temp = temp.parent
                    temp.child = child
                }
                return v
            }
            for (const [dx, dy] of this.getDirections(v, radius, fast)) {
                const x = v.x + dx
                const y = v.y + dy
                if (this.probablyIsEmpty(x, y) || (x == target[0] && y == target[1])) {  // either empty, or passable and is target
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

    // returns a move toward the target. Checks for fuel and makes sure move is valid
    nextMove(target, radius = SPECS.UNITS[this.r.me.unit].SPEED, fast = false) {
        const node = this.findPath(target, radius, fast)
        if (node === null)
            this.r.log("Unit " + this.r.me.unit + " : no path to " + target + " found with A*")
        else{ 
            const move = this.nextDirection(node)
            if (this.r.fuel > SPECS.UNITS[this.r.me.unit].FUEL_PER_MOVE * utils.getDirectionCost(move) && utils.isEmpty(this.r, this.r.me.x + move[0], this.r.me.y + move[1]))
                return move
        }
        return null
    }

    // really messy! uses heatmap to estimate about robot location out of range
    probablyIsEmpty(x, y) {
        if (x < 0 || x >= this.map[0].length || y < 0 || y >= this.map.length)  // out of bounds
            return false
        const currentTurn = this.r.me.turn
        const robotID = this.r.getVisibleRobotMap()[y][x]
        if (robotID === 0) {  // there is definitely no robot here
            if (this.heatMap[y][x] !== null) {
                const attackable = this.heatMap[y][x][0]
                const heat = this.heatMap[y][x][1]
                if (attackable || heat > 0) {  // avoid this location anyways cuz we marked it as attackable
                    this.heatMap[y][x][1]--
                    this.heatMap[y][x][2] = currentTurn
                    return false
                }
            }
            //this.heatMap[y][x] = null  // reset the location
            return this.map[y][x]
        }
        else if (robotID === -1) {  // we can't see here
            if (this.heatMap[y][x] !== null) {  // we saw before a unit
                const heat = this.heatMap[y][x][1]  // the heat here
                const lastTurn = this.heatMap[y][x][2]  // the last turn we examined this location
                if (0 < heat < HEAT_MAX && lastTurn < currentTurn)  // decrement if necessary
                    this.heatMap[y][x][1]--
                if (heat > 0)  // still probably not passable
                    return false
                else
                    return this.map[y][x]
            }
            else {  // never seen anything here
                return this.map[y][x]
            }
        }

        else {  // we can definitely see a robot here
            const otherRobot = this.r.getRobot(robotID)
            if (otherRobot.unit === SPECS.CASTLE || otherRobot.unit === SPECS.CHURCH)  // normally avoid castles
                this.heatMap[y][x] = [false, HEAT_MAX, currentTurn]  // permanently avoid locations at HEAT_MAX
            else
                this.heatMap[y][x] = [false, 10, currentTurn]  // decays after 10 turns
                // this.setHeat(x, y, 10, robotID)  // decays after 10 turns
            return false
        }
    }

    // set the heat of a tile
    setEnemyHeat(x, y, heat) {
        this.heatMap[y][x] = [true, heat, this.r.me.turn]
    }
}