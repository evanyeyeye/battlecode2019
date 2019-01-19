import {SPECS} from 'battlecode'

var target = null
var fast = false

export function crusaderTurn(r) {
    if (r.me.turn == 1) {
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
        let enemy_x = r.map[0].length - r.me.x
        let enemy_y = r.map.length - r.me.y
        target = [enemy_x, enemy_y]
    }


    // var pf = r.pm.getPathField(target)
    // if (r.fuel > SPECS.UNITS[SPECS.CRUSADER].FUEL_PER_MOVE) {
    //     var test = pf.getDirectionAtPoint(r.me.x, r.me.y)
    //     // r.log(test)
    //     return r.move(test[0], test[1])
    // }

    // for (const robot of r.getVisibleRobots()) {
    //     if (robot.team !== r.me.team) {
    //         return r.attack(robot.x - r.me.x, robot.y - r.me.y)
    //     }
    // }
    return
}

function moveParallel(r, cx, cy, tx, ty) {
    const dx = tx - cx
    const dy = ty - cy
    return [r.me.x + dx, r.me.y + dy]

}

function movePerpendicular(r, cx, cy, tx, ty) {
    const dy = tx - cx
    const dx = ty - cy
    const bx = cx - r.me.x
    const by = cy - r.me.y
}