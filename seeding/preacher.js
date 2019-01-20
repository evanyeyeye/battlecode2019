import {SPECS} from 'battlecode'
import utils from './utils.js'

var baseLocation = null  // location of the castle/church we are protecting
var settled = false  // we are in position

export function preacherTurn(r) {
    if (r.me.turn === 1) {
        r.log("I am a preacher")
    }

    if (baseLocation === null) {  // have to find a base location first
        for (const other of r.getVisibleRobots()) {  // find a nearby castle/church to defend. Ideally would sort by distance
            if (other.team === r.me.team && (other.unit === SPECS.CASTLE || other.unit === SPECS.CHURCH) ) {
                baseLocation = [other.x, other.y]
                break
            }
        }
    }

    if (baseLocation !== null && !settled) {  // need to move into position

    }


    return
}

function findStandable(r, base) {
    let target = null
    let can_be_adjacent = false
    for (const dir of utils.directions) {
        const tx = base[0] + dir[0]
        const ty = base[1] + dir[1]
    }
}

// return number of visible robots adjacent to this x, y. + for enemy, - for friendly
function numAdjacent(r, x, y) {  // ideally could receive targeting info from other robots for shooting beyond visual range
    let num = 0
    for (let dx = -1; dx <= 1; dx ++) {  // iterate through adjacent squares. unlike utils this includes the square itself i guess
        for (let dy = -1; dy <= 1; dy ++) {
            const robotID = r.getVisibleRobotMap[y + dy][x + dx]
            if (robotID > 0) {
                const other = r.getRobot(robotID)
                if (other.team === r.me.team)
                    num--  // negative weight
                else
                    num++  // positive weight
            }
        }
    }
    return num
}