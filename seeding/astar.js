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
	}

    findPath(target, radius = 2, fast = false) {  // array targets, returns a node object. Radius = max squared movement radius. Fast = ignore squared cost
        const nodeMap = utils.generateMatrix(this.map[0].length, this.map.length)  // holds null or nodes, for updating cost/parent of nodes

        const fringe = new PriorityQueue((a,b) => a.lessThan(b))
        // const closed = new Set()
        const source = new Node(this.r.me.x, this.r.me.y, null, 0, utils.getManhattanDistance(this.r.me.x, this.r.me.y, target[0], target[1]))
        fringe.push(source)

        nodeMap[source.y][source.x] = source
        while (fringe.size() > 0) {
            const v = fringe.pop()

            // const strLoc = [v.x, v.y].toString()
            // if (closed.has(strLoc))
            //     continue
            // closed.add(strLoc)
            // if (v.x == target[0] && v.y == target[1]) {  // we found the target
            //     // this.r.log("size of searched nodes is around " + closed.size + fringe.size())
            //     return v
            // }
            // for (const nextLoc of this.getChildren(v, target, radius)) {  // need to add node saving for variable radius to actually work
            //     if (!closed.has(nextLoc.toString())) {
            //         const dx = nextLoc[0] - v.x  // terrible, optimize later
            //         const dy = nextLoc[1] - v.y
            //         let dg = 1
            //         if (fast)
            //             dg = dx*dx + dy*dy  // even worse!
            //         else
            //             dg = dx + dy
            //         const a  = new Node(nextLoc[0], nextLoc[1], v, v.g + dg, utils.getManhattanDistance(nextLoc[0], nextLoc[1], target[0], target[1]))  // need to modify g if moving with radius > 2
            //         fringe.push(a)
            //     }
            // }
            
            if (nodeMap[v.y][v.x] && nodeMap[v.y][v.x].f > v.f)  // already have a lower cost way to get here
                continue
            // nodeMap[v.y][v.x] = v
            if (v.x == target[0] && v.y == target[1]) {  // we found the target
                return v
            }
            for (const nextLoc of this.getChildren(v, target, radius)) {
                const dx = nextLoc[0] - v.x  // terrible, optimize later
                const dy = nextLoc[1] - v.y
                let dg = 1
                if (fast)
                    dg = dx*dx + dy*dy  // even worse!
                else
                    dg = Math.abs(dx) + Math.abs(dy)
                const d = utils.getManhattanDistance(nextLoc[0], nextLoc[1], target[0], target[1])
                if (nodeMap[nextLoc[1]][nextLoc[0]] === null) {  // node has not been visited
                    // this.r.log("making a new node")
                    // this.r.log(nodeMap)
                    const a = new Node(nextLoc[0], nextLoc[1], v, v.g + dg, d)
                    // this.r.log("v.g " + v.g + " a.f: " + a.f + " d: " + d + " dg: " + dg + " dx: " + dx + " v.x " + v.x + " nextLoc: " + nextLoc)
                    nodeMap[nextLoc[1]][nextLoc[0]] = a
                    fringe.push(a)
                }
                else {
                    // this.r.log("THERE IS A NODE THERE, f of: " + nodeMap[nextLoc[1]][nextLoc[0]].f)
                    if (nodeMap[nextLoc[1]][nextLoc[0]].f > (v.g + dg + d)) {  // node has not been visited or we have a cheaper way
                        // this.r.log("ACTUALLY REPLACING A NODE")
                        const a = nodeMap[nextLoc[1]][nextLoc[0]]
                        a.parent = v
                        a.g = v.g + dg
                        a.h = d
                        a.f = a.g + a.h
                        fringe.push(a)
                    }
                }
            }

        }
        return null
    }

    // find squares you can move to from a node, return array of arrays
    getChildren(node, target, radius = 2) {  // i don't think radius like this works with a*
        let directions = utils.directionsWithDiagonalPriority
        if (radius >= 4) {
            directions = directions.concat(four)
        }
        if (radius >= 9) {
            directions = directions.concat(five)
            directions = directions.concat(eight)
            directions = directions.concat(nine)
        }
        let children = []
        for (const dir of directions) {
            const x = node.x + dir[0]
            const y = node.y + dir[1]
            if (x == target[0] && y == target[1]) {  // ignore robots on target so we dont stop
                if (this.isPassable(x, y)) {
                    children.push([x, y])
                }
            }
            else {
                if (utils.isEmpty(this.r, x, y)) {  // this takes into account robots
                    children.push([x, y])
                }
            }
        }
        return children
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
        return this.r.map[y][x]
    }
}