import utils from './utils.js'

// stores direction to move in, distance to target
class PathPoint {

    constructor(dir, dist) {
        this.direction = dir
        this.dist = dist
        this.optimal = false  // is my distance truly correct (lol probably still wrong after true)
    }
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

    getDirectionAtPoint(x, y) {
        return this.field[y][x].direction
    }

    recurFixDistance(x, y) {
        if (this.target[0] === x && this.target[1] === y)
            return 0
        const dir = this.field[y][x].direction
        this.field[y][x].dist = utils.getDirectionCost(dir) + this.recurFixDistance(x + dir[0], y + dir[1])
        this.field[y][x].optimal = true
        return this.field[y][x].dist
    }

    getDistanceAtPoint(x, y) {
        if (!this.field[y][x].optimal)
            this.field[y][x].dist = this.recurFixDistance(x, y)
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
}