import {SPECS} from 'battlecode'
import utils from './utils.js'
import comms from './comms.js'


// maps mineID (starting from 1) to
// loc: [x, y] location of mine
// distance: pathfield distance from this castle to mine
// activity: heuristic for pilgrims at mine, assigning adds 10, subtract/add 1 per turn based on mining
const mineStatus = new Map()
const sortedMines = []  // sorted array of mineIDs ascending by distance

// team: array of 1-3 objects with castle info
// loc: [x, y] location of castle
// distance: pathfield distance from this castle to the other castle
const castleStatus = {0: [], 1: []}
const castleLocationBuilder = new Map()
const initialActivityQueue = []

var castlePathField = null

var processedCastleTalk = new Set()

var idealNumPilgrims = 0
var numTeamCastles = 0  // number of castles on our team. For now, split mines and pilgrim production

var pilgrimCounter = 0
var prophetCounter = 0
var crusaderCounter = 0

var recievedMessages = {}

var mine_range = 20
var enemyCastleLocSent = false

export function castleTurn(r) {

    if (r.me.turn > 60 && enemyCastleLocSent ==false) {
        let visibleRobotMap= r.getVisibleRobotMap()
        r.log("trying to send my symmetrical location")
        if (r.fuel>Math.ceil(visibleRobotMap[0].length*1.415))
        {
            let curEnemyCastle=utils.reflectLocation(r,[r.me.x,r.me.y])
            r.log('sent '+curEnemyCastle)
            r.signal(comms.encodeAttack(curEnemyCastle[0],curEnemyCastle[1],16),Math.ceil(visibleRobotMap[0].length*visibleRobotMap[0].length*2))
            enemyCastleLocSent =true
        } 
    }

    processedCastleTalk = new Set()

    if (r.me.turn === 1) {
        r.log("I am a Castle")
        initializeCastle(r)    
        receiveCastleLocations(r)  // receive (first iteration)
        r.castleTalk(comms.CASTLE_GREETING)  // send greetings to other castles 
    }

    if (r.me.turn === 2) {
        receiveCastleLocations(r)  // receive (second iteration)
        r.castleTalk(r.me.x)  // send x coordinates to other castles
    }

    if (r.me.turn === 3) {
        receiveCastleLocations(r)  // receive (third iteration)
        r.castleTalk(r.me.y)  // send y coordinates to other castles
    }

    if (r.me.turn === 4) {
        receiveCastleLocations(r)  // receive (fourth iteration)
        findCastleLocations(r)  // populates castleStatus
        r.log("CASTLE LOCATIONS: ")
        r.log(castleStatus)
    }

    // mine_range = Math.max(mine_range, r.map.length + r.me.turn / 20)

    // ---------- REGULAR BOOKKEEPING AND COMMUNICATIONS ----------
    let totalActivity = 0
    for (let [mineID, mine] of mineStatus.entries()) {  // regularly subtract "heat" value of number of pilgrims at a mine
        if (mine.activity > 0) {
            // r.log(mine.activity)
            mine.activity -= 1
            // TEMP REMOVAL?
            totalActivity += mine.activity
        }
    }

    let danger = false
    let allyCount = 0
    let enemyCount = 0
    let enemyDistance = {}
    let enemyLocation = {}
    let closestEnemy = -1
    let danger_prophet = false
    let danger_crusader =false
    let preacher_count=0

    let minesToIncrement = new Set()  // we want steady numbers

    for (const robot of r.getVisibleRobots()) {
        const message = robot.castle_talk
        if (message !== 0 && !processedCastleTalk.has(robot.id)) {  // actual unused message
            if (robot.team === r.me.team && robot.id !== r.me.id) {  // other friendly robot
                // r.log("Received a message of " + message + " on turn " + r.me.turn)
                recievedMessages[robot.id] = message  // unused
                if (message != comms.CASTLE_GREETING && message >= 100) {  // castle is indicating that it sent a pilgrim to this mine
                    mineStatus.get(message - 100).activity += 10
                    // r.log("acknowledged another castle")
                }
                else if (!(r.me.turn <= 3 && castleLocationBuilder.has(robot.id))) {  // pilgrim is already there and mining
                    // mineStatus.get(message).activity += 1
                    // r.log("acknowledged a pilgrim")
                    minesToIncrement.add(message)
                } 
            }
        } 
         if (robot.team === r.me.team &&robot.unit != SPECS.CHURCH && robot.unit != SPECS.CASTLE) {
            allyCount += 1
        } else if (robot.team !== r.me.team) {
            if (robot.unit == SPECS.CRUSADER)
            {
                danger_crusader = true

            }
            else if (robot.unit == SPECS.PROPHET)
            {
                danger_prophet = true
            }
            enemyCount += 1
            enemyDistance[robot.id] = utils.getManhattanDistance(r.me.x, r.me.y, robot.x, robot.y)
            enemyLocation[robot.id] = [r.me.x, r.me.y]
            if (closestEnemy === -1 || enemyDistance[robot.id] < enemyDistance[closestEnemy]) {
                closestEnemy = robot.id
            }
            if (enemyCount > allyCount) {
                danger = true
            }
        }
    }

    for (const m of minesToIncrement)  // only want to increment once per recieved message. This way, always have 1 pilgrim near mine
        mineStatus.get(m).activity += 1

    if (r.me.turn % 50 === 0) {
        r.log("activity numbers, total: " + totalActivity)
        // r.log(mineStatus)
    }

    // ---------- BUILD PILGRIMS ----------

    if (!danger && r.me.turn > 1 && pilgrimCounter < (idealNumPilgrims+1) && r.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + 2) {  // enough fuel to signal afterwards
        if (r.me.turn <10||(r.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE+50&&r.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + 200))
        { 
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            // see if there is a mine for a pilgrim to go to
            const mineID = nextMineID(r)
            r.log(mineID)
            if (mineID !== null){

                r.log("Built Pilgrim, trying to send it to " + mineID)
                // mineStatus.get(mineID).activity += 10  // TODO: NOT OPTIMAL, SHOULD CHANGE SO PILGRIM SIGNALS BACK ACKNOWLEDGEMENT, ALL CASTLES KNOW THEN

                let signalToSend = comms.encodeSignal(mineID, 0, mineStatus.size, comms.ATTACK_MINE, 16)
                           
                r.log(signalToSend)
                r.signal(signalToSend,2)  // tell the pilgrim which mine to go to, dictionary keys are strings
                
                if (r.me.turn <= 3)
                    initialActivityQueue.push(parseInt(mineID) + 100)
                else r.castleTalk(parseInt(mineID) + 100)  // let other castles know

                mineStatus.get(parseInt(mineID)).activity += 10  // update yourself
                pilgrimCounter++
                return r.buildUnit(SPECS.PILGRIM, buildDirection[0], buildDirection[1])
            }
        }
    }
    }

    // if castle_talk space is free, start sending out stuff that was queued
    if (r.me.turn >= 4 && !r.getRobot(r.id).castle_talk && initialActivityQueue.length > 0) {
        r.castleTalk(initialActivityQueue.shift())
    }

    // ---------- BUILD ATTACKING TROOPS ----------

    if (danger_prophet || (!danger && r.me.turn > 1 && r.karbonite > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL + 2)) {
        if (r.me.turn <10||(r.karbonite > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE+50&&r.fuel > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL + 200)){
            var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
            if (buildDirection != null) {
                r.log("Built Prophet")
                return r.buildUnit(SPECS.PROPHET, buildDirection[0], buildDirection[1])
            }
        }
    }
   
    
   
    /*
    // build crusaders
    if (danger && r.karbonite > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL) {
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            r.log("Built Crusader")
            r.signal(parseInt(generateMeme(enemyLocation[closestEnemy])), 2)
            crusaderCounter++
            return r.buildUnit(SPECS.CRUSADER, buildDirection[1], buildDirection[0])
        }
    }
    */

    // ---------- LAST RESORT: ATTACK THE ENEMY ----------
    
    


    return
}

// TODO: specifically tune for troops
function findBuildDirection(r, x, y) {
    for (const dir of shuffledDirection()) {
        if (utils.isEmpty(r, x + dir[0], y + dir[1])) {
            return dir
        }
    }
    return null
}

function initializeCastle(r) {
    // generate pathfield from castle location
    castlePathField = r.pm.getPathField([r.me.x, r.me.y])
    // populate mineStatus and sortedMines
    var totalMines = initializeMines(r)
    r.log("There are " + mineStatus.size + " reachable mines (" + totalMines + " total)")
    // determine number of pilgrims to build
    idealNumPilgrims = calculateNumPilgrims(r) // split map with opponent
}

// populate mineStatus: deterministically label mines, store location & distance from castle
// populate sortedMines: sort mineIDs by distance
function initializeMines(r) {
    let totalMines = 0
    let mineID = 0
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i] || r.fuel_map[j][i]) {
                if (castlePathField.isPointSet(i, j)) {  // if unreachable, completely ignore mine existence
                    mineStatus.set(++mineID, {
                        loc: [i, j],
                        distance: castlePathField.getDistanceAtPoint(i, j),
                        activity: 0
                    })
                    sortedMines.push(mineID)                    
                }
                totalMines += 1
            }
        }
    }
    // sort mines by distance from least to greatest
    sortedMines.sort((a, b) => {
        return mineStatus.get(a).distance - mineStatus.get(b).distance
    })
    return totalMines
}

// receive castle greeting on turn 2
// receive x coordinates on turn 3
// receive y coordinates on turn 4
function receiveCastleLocations(r) {
    for (const robot of r.getVisibleRobots()) {
        const message = robot.castle_talk
        if (message === comms.CASTLE_GREETING) {
            castleLocationBuilder.set(robot.id, [])
            processedCastleTalk.add(robot.id)
        }
        else if (castleLocationBuilder.has(robot.id) && castleLocationBuilder.get(robot.id).length < 2) {
            castleLocationBuilder.get(robot.id).push(message)
            processedCastleTalk.add(robot.id)
        }
    }
}

// finds other allied castles, then uses symmetry to find enemy castles
// if distance = null, the castle is unreachable
function findCastleLocations(r) {
    for (const [castleID, castleLoc] of castleLocationBuilder.entries()) {
        castleStatus[r.me.team].push({
            loc: [castleLoc[0], castleLoc[1]],
            distance: castlePathField.isPointSet(castleLoc[0], castleLoc[1]) ? castlePathField.getDistanceAtPoint(castleLoc[0], castleLoc[1]) : null
        })
        const enemyCastleLoc = utils.reflectLocation(r, [castleLoc[0], castleLoc[1]])
        castleStatus[r.enemyTeam].push({
            loc: [enemyCastleLoc[0], enemyCastleLoc[1]],
            distance: castlePathField.isPointSet(enemyCastleLoc[0], enemyCastleLoc[1]) ? castlePathField.getDistanceAtPoint(enemyCastleLoc[0], enemyCastleLoc[1]) : null
        })
    }
}

// returns conservative estimate of number of pilgrims we need to have to mine at every mine
// DOES NOT ACCOUNT FOR MINING MULTIPLE RESOURCES WHICH IS A MUCH BETTER IDEA
// Theres usually different ratios of mines i think, but for every 2-mine grouping it would be distance * 2 / 10 + 2 i think
function calculateNumPilgrims(r) {
    let num = 0
  //  r.log("sortedmines"+sortedMines)
    for (const mineID of sortedMines) {  // take only a portion of the closest mines
        const mine = mineStatus.get(mineID)
        if (mine.distance < mine_range) {
           // r.log("distance is "+mine.distance)
            num ++;  // logic is 10 turns to mine to full, pilgrims walk 1 tile per turn back and forth
        }
    }
    r.log("im going to try to make " + num + " pilgrims")
    return num
}

function nextMineID(r) {  // uses resource-blind ids
    // use sortedMines with mineStatus to decide the next mine to send a pilgrim toward
    for (const mineID of sortedMines) {
        const mine = mineStatus.get(mineID)
        // r.log("ID of " + id + " has activity of " + mine.activity)
        if (mine.activity === 0) // no pilgrim activity here yet, temp way to cutoff distance
            return mineID
    }
    return null
}

//shuffle a random direction to check
function shuffledDirection() {
    let directions=utils.directions
    let index=null
    let x=null
    for (let i =0; i <= (directions.length - 1); i++) {
        index = Math.floor(Math.random() * (i + 1))
        //swapping
        x = directions[i]
        directions[i] = directions[index]
        directions[index] = x
    }
    return directions
}