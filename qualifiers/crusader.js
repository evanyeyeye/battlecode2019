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
