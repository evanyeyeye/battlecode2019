import {SPECS} from 'battlecode'
import utils from './utils.js'

const LEFT_SIDE = 0
const RIGHT_SIDE = 1

var churchLocation = null
var target = null
var fast = false  // fast movement

var my_side = Math.floor(Math.random()*2)  // pick random side of line
var multiplier = 1  // monotonically increase position in line

export function crusaderTurn(r) {
    if (r.me.turn === 1) {
        r.log("I am a Crusader")
        // for (const otherRobot of r.getVisibleRobots()) {  // may be bad for optimization?
        //     if (otherRobot.team == r.me.team && otherRobot.unit == SPECS.CASTLE && r.isRadioing(otherRobot)) {
        //         // recieve message
        //         const message = "" + otherRobot.signal

        //         if (message.length >= 4) {
        //             if (message.length == 4) {
        //                 target = [parseInt(message.substring(0, 1)), parseInt(message.substring(2, 4))]
        //             } else if (message.length == 5) {
        //                 target = [parseInt(message.substring(0, 2)), parseInt(message.substring(3, 5))]
        //             }
        //             break
        //         }
        //         // r.log("Pilgrim received a target mine: " + castleTargetMineID)
        //         // r.castleTalk(castleTargetMineID + 100)  // acknowledge being sent to this mine, castle handles this now
        //     }
        // }

        // temp
        let enemy_x = Math.floor(r.map[0].length / 2)
        let enemy_y = Math.floor(r.map.length / 2)
        target = [enemy_x, enemy_y]
    }

    for (const robot of r.getVisibleRobots()) {
        if (robot.team !== r.me.team && utils.getSquaredDistance(r.me.x, r.me.y, robot.x, robot.y) <= SPECS.UNITS[r.me.unit].ATTACK_RADIUS && r.fuel > SPECS.UNITS[r.me.unit].ATTACK_FUEL_COST) {
            return r.attack(robot.x - r.me.x, robot.y - r.me.y)
        }
        else if (robot.team === r.me.team && robot.unit === SPECS.CHURCH) {
            churchLocation = [robot.x, robot.y]
        }
    }

    if (churchLocation !== null) {
        const move = formPerpendicular(r, churchLocation[0], churchLocation[1], target[0], target[1], my_side)
        if (move != null) {
            const test = r.am.nextMove(move)
            if (node === null)
                return
            return r.move(test[0], test[1])
        }
    }

    return
}

function moveParallel(r, cx, cy, tx, ty) {
    const dx = tx - cx
    const dy = ty - cy
    return [r.me.x + dx, r.me.y + dy]

}

function incrementParallel(r, x, y, px, py) {  // i was going to compartmentalize this, but theres so many arguments to pass
    const pd = Math.sqrt(px * px + py * py)
    return null
}

// the robot will lose vision of center, and think it can start building from there.
function formPerpendicular(r, cx, cy, tx, ty, side, multiplier) {  // returns a location to move to, continuing the formation of a line
    const px = tx - cx  // parallel change
    const py = ty - cy
    let dx = 0
    let dy = 0

    if (px === 0) {  // tangent is either left or right
        if (side === LEFT_SIDE)  // super dumb, but this is the correct one i think?
            dx = -py
        else
            dx = py
    }
    else if (py === 0) {  // tangent is either up or down
        if (side === LEFT_SIDE)
            dy = -px
        else
            dy = px
    }
    else if (px * py >= 0) {  // positive slope
        if (side === LEFT_SIDE) {
            dx = py
            dy = -px
        }
        else {  // the robot has a steeper slope than the center relative to the target
            dx = -py
            dy = px
        }
    }
    else {  // negative slope
        if (side === LEFT_SIDE) {
            dx = -py
            dy = px
        }
        else {
            dx = py
            dy = -px
        }
    }
    const d = Math.sqrt(dx * dx + dy * dy)  // used for scaling dx/dy
    const sx = dx / d  // scaled dx/dy
    const sy = dy / d

    let nextX = cx
    let nextY = cy
    while (!utils.isStandable(r, nextX, nextY) || r.getVisibleRobotMap()[nextY][nextX] === -1) {  // not open or cant see
        r.log("Crusader: cx: " + cx + " cy: " + cy + " nextX: " + nextX + " nextY: " + nextY)
        nextX = Math.floor(cx + sx*multiplier)
        nextY = Math.floor(cy + sy*multiplier)
        multiplier += 1
        if (nextX < 0 || nextX >= r.map[0].length || nextY < 0 || nextY >= r.map.length) {
            r.log("Crusader: no way to form perpendicular formation")
            return null
    	}
        if (nextX == r.me.x && nextY == r.me.y) {
            return null  // we are already here!
        }
    }
    return [nextX, nextY]
}

function movePerpendicular(r, cx, cy, tx, ty, side = LEFT_SIDE, scale = 5) {  // this is kinda like a beta function. Probably not useful
    const px = tx - cx  // parallel change
    const py = ty - cy

    const mx = tx - r.me.x
    const my = ty - r.me.y

    const bx = cx - r.me.x  // offset from base
    const by = cy - r.me.y
    // const dist = utils.getManhattanDistance(cx, cy, tx, ty)
    let dx = 0
    let dy = 0
    // why is this so complicated, why am i so stupid

    if (px === 0) {  // tangent is either left or right
        // if (bx <= 0)
        if (side === LEFT_SIDE)  // super dumb, but this is the correct one i think?
            dx = -py
        else
            dx = py
    }
    else if (py === 0) {  // tangent is either up or down
        // if (by <= 0)
        if (side === LEFT_SIDE)
            dy = -px
        else
            dy = px
    }
    else if (px * py >= 0) {  // positive slope
        // if (mx !== 0 && Math.abs(my / mx) < Math.abs(py / px)) {  // flatter slope compared to center
        if (side === LEFT_SIDE) {
            dx = py
            dy = -px
        }
        else {  // the robot has a steeper slope than the center relative to the target
            dx = -py
            dy = px
        }
    }
    else {  // negative slope
        // if (Math.abs(my / mx) < Math.abs(py / px)) {
        if (side === LEFT_SIDE) {
            dx = -py
            dy = px
        }
        else {
            dx = py
            dy = -px
        }
    }
    r.log("cx: " + cx + " cy: " + cy + " tx: " + tx + " ty: " + ty + " dx: " + dx + " dy: " + dy)
    const d = Math.sqrt(dx * dx + dy * dy)
    let nextX = r.me.x + Math.floor(dx / d * scale)
    let nextY = r.me.y + Math.floor(dy / d * scale)
    if (nextX < 0)
        nextX = 0
    if (nextY < 0)
        nextY = 0
    if (nextX >= r.map[0].length)
        nextX = r.map[0].length - 1
    if (nextY >= r.map.length)
        nextY = r.map.length - 1
    return [nextX, nextY]
}