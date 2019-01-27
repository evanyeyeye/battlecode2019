import {SPECS} from 'battlecode'
import utils from './utils.js'

export default {
    LEFT: 0,
    RIGHT: 1,

    // returns an incremental location to move toward the target parallely relative to center
    moveParallel: function(r, center, target) {
        const [cx, cy] = center
        const [tx, ty] = target
        const dx = tx - cx
        const dy = ty - cy
        return [r.me.x + dx, r.me.y + dy]
    },

    // returns list of STRING locations
    listPerpendicular: function(r, center, target) {
        let positions = []
        let multiplier = 0
        let side = this.LEFT
        const [cx, cy] = center
        const [tx, ty] = target
        const px = tx - cx  // parallel change
        const py = ty - cy

        let dx = 0  // proportional amounts to move in y and x direction
        let dy = 0

        if (px === 0) {  // tangent is either straight left or straight right
            if (side === this.LEFT)
                dx = -py
            else
                dx = py
        }
        else if (py === 0) {  // tangent is either straight up or straight down
            if (side === this.LEFT)
                dy = -px
            else
                dy = px
        }
        else if (px * py >= 0) {  // positive slope
            if (side === this.LEFT) {
                dx = py
                dy = -px
            }
            else {  // the robot has a steeper slope than the center relative to the target
                dx = -py
                dy = px
            }
        }
        else {  // negative slope
            if (side === this.LEFT) {
                dx = -py
                dy = px
            }
            else {
                dx = py
                dy = -px
            }
        }
        const d = Math.sqrt(dx * dx + dy * dy)  // used for scaling dx/dy into sx/sy
        const sx = dx / d  // unit vector
        const sy = dy / d

        let nextX = cx
        let nextY = cy

        let change_side = false
        while (nextX >= 0 && nextX < r.map[0].length && nextY >= 0 && nextY < r.map.length) {  // have not searched to the correct position
            nextX = Math.floor(cx + sx*multiplier)
            nextY = Math.floor(cy + sy*multiplier)
            if (utils.isStandable(r, nextX, nextY)) {  // this may not be deterministic, watch out! Hopefully close enough
                positions.push([nextX, nextY].toString())  // only standable positions count
                if (change_side) {
                    side = this.otherSide(side)
                    change_side = false
                }
                else {
                    multiplier += 1
                    change_side = true
                }
            }
            else
                multiplier += 1
        }
        return positions
    },
    // given a center to build off, target to face, side to go into, and approximate position on that side with multiplier,
    // return a location to move to and build a line
    formPerpendicular: function(r, center, target, side, multiplier) {
        const [cx, cy] = center
        const [tx, ty] = target
        const px = tx - cx  // parallel change
        const py = ty - cy

        let dx = 0  // proportional amounts to move in y and x direction
        let dy = 0

        if (px === 0) {  // tangent is either straight left or straight right
            if (side === this.LEFT)
                dx = -py
            else
                dx = py
        }
        else if (py === 0) {  // tangent is either straight up or straight down
            if (side === this.LEFT)
                dy = -px
            else
                dy = px
        }
        else if (px * py >= 0) {  // positive slope
            if (side === this.LEFT) {
                dx = py
                dy = -px
            }
            else {  // the robot has a steeper slope than the center relative to the target
                dx = -py
                dy = px
            }
        }
        else {  // negative slope
            if (side === this.LEFT) {
                dx = -py
                dy = px
            }
            else {
                dx = py
                dy = -px
            }
        }
        const d = Math.sqrt(dx * dx + dy * dy)  // used for scaling dx/dy into sx/sy
        const sx = dx / d  // unit vector
        const sy = dy / d

        let nextX = cx
        let nextY = cy
        let counter = 0
        while (counter !== multiplier) {  // have not searched to the correct position
            // r.log("Formations: cx: " + cx + " cy: " + cy + " nextX: " + nextX + " nextY: " + nextY)
            nextX = Math.floor(cx + sx*multiplier)
            nextY = Math.floor(cy + sy*multiplier)
            if (utils.isStandable(r, nextX, nextY))  // this may not be deterministic, watch out! Hopefully close enough
                counter += 1  // only standable positions count
            if (nextX < 0 || nextX >= r.map[0].length || nextY < 0 || nextY >= r.map.length) {
                // r.log("Formations: no way to form perpendicular formation")
                return null
            }
        }
        return [nextX, nextY]
    },

    // crawling toward target. Return a location somewhere in between
    findIterate: function(r, target, spread = false) {
        const changex = target[0] - r.me.x  // terrible names, but what can i do
        const changey = target[1] - r.me.y
        let dx = 0
        let dy = 0
        if (changex > 0)  // lol
            dx = 1
        else if (changex < 0)
            dx = -1
        if (changey > 0)
            dy = 1
        else if (changey < 0)
            dy = -1
        // r.log("I want to iterate to: " + target + " dx: " + dx + " dy: " + dy)
        while ( (r.me.x + dx !== target[0]) || (r.me.y + dy !== target[1]) ) {
            const midx = r.me.x + dx
            const midy = r.me.y + dy
            // r.log("Preacher: Looking at " + midx + "," + midy)
            if (utils.isStandable(r, midx, midy, spread)) {
                return [midx, midy]
            }
            if (midx < target[0])  // increment, terribly
                dx++
            else if (midx > target[0])
                dx--
            if (midy < target[1])
                dy++
            else if (midy > target[1])
                dy--
        }
        return target  // nothing else, just pathfind here please
    },

    otherSide: function(side) {
        if (side === this.LEFT)
            return this.RIGHT
        return this.LEFT
    },
}