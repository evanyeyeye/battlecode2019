import utils from './utils.js'


// stores direction to move in, distance to target
class PathPoint {

    constructor(dir, dist) {
        this.direction = dir
        this.dist = dist
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

    // please always call before using getDirectionAtPoint or getDistanceAtPoint
    // if returns false on a passable square, means terrain is disjointed
    // (not completely accurate because BFS doesn't account for large steps, but will prevent errors)
    isPointSet(x, y) {
        return this.field[y][x] != null
    }

    getDirectionAtPoint(x, y) {
        return this.field[y][x].direction
    }

    getDistanceAtPoint(x, y) {
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