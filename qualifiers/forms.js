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

    // return the next position for a defensive unit
    nextPosition: function(r, defense_center, occupied) {
        if (defense_center !== null) {
            const positions = this.listPerpendicular(r, defense_center, [r.me.x, r.me.y])
            for (const pos of positions) {
                if (!occupied.has(pos)) {
                    return utils.stringToCoord(pos)
                }
            }
        }
        return this.naiveFindCenter(r, defense_center)
    },

    // very bad function
    // returns some location that might work as the defensive center
    naiveFindCenter: function(r, enemyLoc) {
        let i_min = 0
        let i_max = 0
        let j_min = 0
        let j_max = 0
        if (enemyLoc[0] - r.me.x > 0)  // horrible
            i_max = 3
        else if (enemyLoc[0] - r.me.x < 0)
            i_min = -3
        else {
            i_max = 3
            i_min = -3
        }
        if (enemyLoc[1] - r.me.y > 0)
            j_max = 3
        else if (enemyLoc[1] - r.me.y < 0)
            j_min = -3
        else {
            j_max = 3
            j_min = -3
        }
        // r.log("Church: finding center with i_max: " + i_max + " i_min: " + i_min + " j_max: " + j_max + " j_min: " + j_min)
        for (let i = i_min; i <= i_max; i++) {
            for (let j = j_min; j <= j_max; j++) {
                const cx = r.me.x + i
                const cy = r.me.y + j
                if (utils.isStandable(r, cx, cy))
                    return [cx, cy]
            }
        }
        return null  // im assuming this never happens
    },

    // returns list of STRING locations
    listPerpendicular: function(r, center, target) {
        let positions = []
        let left_multiplier = 0
        let right_multiplier = 0
        let side = this.LEFT
        const [cx, cy] = center
        const [tx, ty] = target
        const px = tx - cx  // parallel change
        const py = ty - cy

        let ldx = 0  // proportional amounts to move in y and x direction
        let ldy = 0
        let rdx = 0
        let rdy = 0

        if (px === 0) {  // tangent is either straight left or straight right
            ldx = -py
            rdx = py
        }
        else if (py === 0) {  // tangent is either straight up or straight down
            ldy = -px
            rdy = px
        }
        else if (px * py >= 0) {  // positive slope
            ldx = py
            ldy = -px
            rdx = -py
            rdy = px
        }
        else {  // negative slope
            ldx = -py
            ldy = px
            rdx = py
            rdy = -px
        }
        const d = Math.sqrt(ldx * ldx + ldy * ldy)  // used for scaling dx/dy into sx/sy
        const lsx = ldx / d  // unit vector
        const lsy = ldy / d
        const rsx = rdx / d
        const rsy = rdy / d

        let nextX = cx
        let nextY = cy

        let change_side = false
        while (nextX >= 0 && nextX < r.map[0].length && nextY >= 0 && nextY < r.map.length) {  // have not searched to the correct position
            if (side === this.LEFT) {
                nextX = Math.floor(cx + lsx*left_multiplier)  // this is so bad, please change so 1 dynamic multiplier does stuff
                nextY = Math.floor(cy + lsy*left_multiplier)
            }
            else {
                nextX = Math.floor(cx + rsx*right_multiplier)
                nextY = Math.floor(cy + rsy*right_multiplier)
            }
            if (utils.isStandable(r, nextX, nextY)) {  // this may not be deterministic, watch out! Hopefully close enough
                positions.push([nextX, nextY].toString())  // only standable positions count
                if (change_side) {
                    side = this.otherSide(side)
                    change_side = false
                }
                else {
                    if (side === this.LEFT)
                        left_multiplier += 1
                    else
                        right_multiplier += 1
                    change_side = true
                }
            }
            else {
                if (side === this.LEFT)
                    left_multiplier += 1
                else
                    right_multiplier += 1
            }
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