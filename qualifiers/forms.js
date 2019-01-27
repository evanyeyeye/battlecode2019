import {SPECS} from 'battlecode'
import utils from './utils.js'

export default {
    LEFT = 0
    RIGHT = 1

    // returns an incremental location to move toward the target parallely relative to center
    moveParallel: function(r, center, target) {
        const [cx, cy] = center
        const [tx, ty] = target
        const dx = tx - cx
        const dy = ty - cy
        return [r.me.x + dx, r.me.y + dy]
    }

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
            if (side === LEFT)
                dx = -py
            else
                dx = py
        }
        else if (py === 0) {  // tangent is either straight up or straight down
            if (side === LEFT)
                dy = -px
            else
                dy = px
        }
        else if (px * py >= 0) {  // positive slope
            if (side === LEFT) {
                dx = py
                dy = -px
            }
            else {  // the robot has a steeper slope than the center relative to the target
                dx = -py
                dy = px
            }
        }
        else {  // negative slope
            if (side === LEFT) {
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
}