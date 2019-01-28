import {SPECS} from 'battlecode'
import comms from './comms.js'
import utils from './utils.js'
import forms from './forms.js'

var baseLocation = null  // location of the castle/church we are protecting
var settled = false  // we are in position
var standLocation = null
var communicatedEnemyLocations = new Set()  // probably has to remake every turn
var mineID = {}  // maps location of mine to its ID
var idToMine = {}
var prevHealth = 60  // hard coded bad
var enemyLocation = null  // will path there maybe
var fast

export function preacherTurn(r) {
    if (r.me.turn === 1) {
        r.log("Preacher: I am a preacher")
        iDMines(r)

        // find the closest castle, probably built from there
        for (const other of r.getVisibleRobots()) {  // find a nearby castle/church to defend. Ideally would sort by distance
            if (other.team === r.me.team && (other.unit === SPECS.CASTLE || other.unit === SPECS.CHURCH) && r.isRadioing(other)) {
                const message = other.signal
                const[x, y, action] = comms.decodeSignal(message)
                if (action === comms.STAND) {
                    r.log("Preacher: Received message from base. Moving to: " + [x,y])
                    baseLocation = [other.x, other.y]
                    standLocation = [x, y]
                    break
                }
            }
        }
    }

    if (25 < r.me.turn < 300)
        fast = true
    // receive enemy locations here!
    communicatedEnemyLocations = new Set()

    // priority is to attack
    let attack_candidates = []
    for (const other of r.getVisibleRobots()) {  // if its visible, its attackable. How convenient
        if (other.team === r.me.team) {  // look for communications
            if (r.isRadioing(other) && (other.unit === SPECS.CASTLE || other.unit === SPECS.CHURCH)) {
                const message = other.signal
                const [x, y, action] = comms.decodeSignal(message)
                if (action === comms.ATTACK) {
                    r.log("Preacher: moving to attack: " + [x,y])
                    enemyLocation = [x, y]
                    const test = r.am.nextMove([x, y], 4, fast)
                    if (test !== null)
                        return r.move(test[0], test[1])
                    communicatedEnemyLocations.add([x, y].toString())
                }
            }
        }
        else {  // there is an enemy!
            enemyLocation = [other.x, other.y]
            attack_candidates.push([other.x, other.y])
            for (const dir of utils.directions) {
                attack_candidates.push([other.x + dir[0], other.y + dir[1]])
            }
        }
    }

    // simple iteration through attack candidates to find best location to attack
    if (attack_candidates.length > 0) {
        let bestval = -100
        let bestloc = [r.me.x + 2, r.me.y + 2]
        for (const [x, y] of attack_candidates) {
            const val = numAdjacentWeighted(r, x, y)
            if (val > bestval) {
                bestval = val
                bestloc = [x, y]
            }
        }
        if (bestval > 0 && r.fuel > SPECS.UNITS[r.me.unit].ATTACK_FUEL_COST)
            return r.attack(bestloc[0] - r.me.x, bestloc[1] - r.me.y)
        else
            return  // doing nothing is probably better than moving
    }

    if (enemyLocation !== null && r.me.x === enemyLocation[0] && r.me.y === enemyLocation[1])  // theres nothing here
        enemyLocation = null

    if (r.me.health < prevHealth || enemyLocation !== null) {  // did i just get attacked?!
        prevHealth = r.me.health
        if (enemyLocation === null)
            enemyLocation = forms.moveParallel(r, baseLocation, standLocation)  // move further out from base
        const test = r.am.nextMove(enemyLocation, 4, fast)
        if (test !== null)
            return r.move(test[0], test[1])
    }

    // otherwise move to a stationary position
    if (standLocation !== null && (r.me.x !== standLocation[0] || r.me.y !== standLocation[1]) ) {  // we are not where we should be
        const test = r.am.nextMove(standLocation)
        if (test !== null)
            return r.move(test[0], test[1])
    }

    return
}

function findStandable(r, base) {
    const opposite = utils.reflectLocation(r, base)   // want to angle to face here
    // r.log("Preacher: opposite is at: " + opposite + " base is at: " + base)
    // let target = null
    let adjacent_base = numAdjacentStrict(r, base[0], base[1])  // number of open tiles next to base. leave at least 1 open
    // r.log("Preacher: number of open tiles next to base: " + adjacent_base)

    let node = r.am.findPath(opposite, 9)  // i guess the easiest way is to find a location on the fastest path to the enemy. RADIUS 9 TO ACCOUNT FOR CRUSADER JUMPING
    if (node !== null) {
        // ADDED CHILD SUPPORT TO A*
        while (node.parent != null)
            node = node.parent
        // node is now the original node
        while (node.child != null) {
            node = node.child
            const adjusted = findIterate(r, [node.x, node.y], true)
            if (adjusted !== null) {
                return adjusted
            }
        }
    }
    return findIterate(r, opposite, true) // absolutely horrible but idk
}

function findIterate(r, target, strict = false) {  // slowly crawl from current position to target, looking for empty squares. if strict, empty square needs to have at least 1 empty adjacent square
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
        if (utils.isStandable(r, midx, midy, true)) {
            // if (!strict || (strict && numAdjacentStrict(r, midx, midy) < 3))  // valid square
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
    // r.log("Preacher: RETURNING ORIGINAL TARGET")
    // return target
    return null
}

// unused, remove later
function badAdjacent(r, x, y) {  // true if next to castle, church, or other preacher
    let visibles = r.getVisibleRobotMap()
    for (const dir of utils.directions) {
        const tx = x + dir[0]
        const ty = y + dir[1]
        const robotID = visibles[ty][tx]
        if (robotID > 0) {  // there is a robot there
            const type = r.getRobot(robotID).unit
            if (type === SPECS.CHURCH || type === SPECS.CASTLE || type === SPECS.PREACHER)
                return true
        }
    }
    return false
}

function numAdjacentStrict(r, x, y) {  // returns the number of adjacent things at a location, be they robot, mine, or wall
    let num = 0
    for (const dir of utils.directions) {
        const tx = x + dir[0]
        const ty = y + dir[1]
        if (!utils.isStandable(r, tx, ty))  // is passable, no robots there, no mines
            num++
    }
    r.log("Preacher: adjacent: " + num)
    return num
}

// return number of visible robots adjacent to this x, y. + for enemy, - for friendly
function numAdjacentWeighted(r, x, y) {  // ideally could receive targeting info from other robots for shooting beyond visual range
    let num = 0
    for (let dx = -1; dx <= 1; dx ++) {  // iterate through adjacent squares. unlike utils this includes the square itself i guess
        for (let dy = -1; dy <= 1; dy ++) {
            if (x + dx < 0 || x + dx >= r.map[0].length || y + dy < 0 || y + dy >= r.map.length)
                continue
            const robotID = r.getVisibleRobotMap()[y + dy][x + dx]
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

function iDMines(r) {  // deterministically label mines
    let counter = 0
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i] || r.fuel_map[j][i]){
                // r.log("Pilgrim: Mine at " + [i, j] + " is " + counter)
                mineID[[i, j]] = counter
                idToMine[counter] = [i,j]
                counter++
            }
        }
    }
}