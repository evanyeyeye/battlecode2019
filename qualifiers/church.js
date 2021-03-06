import {SPECS} from 'battlecode'
import utils from './utils.js'
import comms from './comms.js'
import forms from './forms.js'

// maps mineID (starting from 1) to
// loc: [x, y] location of mine
// distance: pathfield distance from this castle to mine (ideal)
// activity: heuristic for pilgrims at mine, assigning adds 10, subtract/add 1 per turn based on mining
const mineStatus = new Map()
const sortedMines = []  // sorted array of mineIDs ascending by distance

var churchPathField = null

const latticeLocations = []
const usedLatticeLocations = {}

var numMines = 0  // numMines is number of close mines
var idealNumPilgrims = 0  // number of pilgrims to create

var pilgrimCounter = 0
var prophetCounter = 0
var crusaderCounter = 0
var preacherCounter = 0

var mineToID = {}

var mineRange = 10

var defense_center = null  // place to defend from fast approach by crusaders
var occupiedPositions = new Set()  // later make more intelligent to remove
var offensive = false

var occupied_setup = new Set()  // exclusively for crusaders
var targetCastle = null
var standPos = null
var longest_distance  // squared distance to radio for attack
const crusader_threshold = 7

var producing = true

export function churchTurn(r) {

    if (r.me.turn === 1) {
        findLatticeLocations(r)
        for (const otherRobot of r.getVisibleRobots()) {  // may be bad for optimization?
            if (otherRobot.team === r.me.team && r.isRadioing(otherRobot)) {
                // recieve message

                const decodedMsg = comms.decodeSignal(otherRobot.signal)
                // r.log("Church: recieved message: " + decodedMsg)             
                
                if (decodedMsg[2] == comms.ATTACK)
                {
                    targetCastle = [decodedMsg[0], decodedMsg[1]]
                    offensive = true
                    standPos = forms.findIterate(r, targetCastle)
                    if (standPos === null)
                        standPos = targetCastle  // just send them to the castle i guess
                    // r.log("Church: I am an offensive center" + targetCastle)                    
                   
                }
            }
        }
        r.log("Church: I am a Church")
        // generate pathfield from castle location
        churchPathField = r.pm.getPathField([r.me.x, r.me.y])
        // populate mineStatus and sortedMines
        initializeMines(r)
        // r.log("Church: There are " + mineStatus.size + " mines")
        // calculate number of mines within range
        numMines = calculateNumMines(r, mineRange)  
        // determine number of pilgrims to build
        idealNumPilgrims = calculateNumPilgrims(r) // split map with opponent

        // find the centers for preacher defenders to stand in
        let enemy = utils.reflectLocation(r, [r.me.x, r.me.y])
        let fastMove = r.am.nextMove(enemy, 9, true)
        let slowMove = r.am.nextMove(enemy, 9, false)
        if (fastMove !== null)
            defense_center = forms.findIterate(r, [r.me.x + fastMove[0], r.me.y + fastMove[1]])
        if (defense_center === null && slowMove !== null)
            defense_center = forms.findIterate(r, [r.me.x + slowMove[0], r.me.y + slowMove[1]])
        if (defense_center === null)
            defense_center = forms.naiveFindCenter(r, enemy)
        // r.log("Church: my defense center is " + defense_center)
    }

    let danger = false
    let allyCount = 0
    let enemyCount = 0
    let enemyDistance = {}
    let enemyLocation = {}
    let closestEnemy = -1    
    let minesToIncrement = new Set()  // we want steady numbers
    
    pilgrimCounter = 0
    prophetCounter = 0
    crusaderCounter = 0
    preacherCounter = 0

    let dangerProphet = false
    let dangerCrusader = false
    let dangerPreacher = false

    for (const robot of r.getVisibleRobots()) { 
        if (robot.team === r.me.team && robot.id !== r.me.id) {
            if (robot.unit !== SPECS.PILGRIM) {
                allyCount += 1
                if (robot.unit === SPECS.PREACHER) 
                    preacherCounter++
                if (robot.unit === SPECS.CRUSADER)
                    crusaderCounter++
                if (robot.unit === SPECS.PROPHET)
                    prophetCounter++
            } else {
                pilgrimCounter++
                if (r.fuel_map[robot.y][robot.x] || r.karbonite_map[robot.y][robot.x]) {
                    let cur_id = mineToID[[robot.x, robot.y]]
                    mineStatus.get(cur_id).activity = 10  // update yourself 
                }    
            }
        } else if (robot.team !== r.me.team) {
            if (robot.unit === SPECS.CRUSADER)
                dangerCrusader = true
            else if (robot.unit === SPECS.PROPHET)
                dangerProphet = true
            else if (robot.unit === SPECS.PREACHER)
                dangerPreacher = true
            enemyCount += 1
            enemyDistance[robot.id] = utils.getManhattanDistance(r.me.x, r.me.y, robot.x, robot.y)
            enemyLocation[robot.id] = [r.me.x, r.me.y]
            if (closestEnemy === -1 || enemyDistance[robot.id] < enemyDistance[closestEnemy])
                closestEnemy = robot.id
            if (enemyCount > allyCount)
                danger = true
        }
    }

    // ----- OFFENSIVE CENTER BUILD -----
    // ----- START BUILDING STUFF -----

    // r.log("Church: Pilgrim count: " + pilgrimCounter)
    if (!offensive) {
         //-------------------------DENFENSE BUILD------------------------------------
        if (!danger && (pilgrimCounter < idealNumPilgrims ) && r.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + 2) {  // enough fuel to signal afterwards
            if (r.me.turn < 1 || (r.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE + 50 && r.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + 200)) {  // always save  
                var buildDirection = utils.findBuildDirection(r, r.me.x, r.me.y)
                if (buildDirection) {
                    // see if there is a mine for a pilgrim to go to
                    const mineID = nextMineID(r)
                    if (mineID){
                        // r.log("Church: Built Pilgrim, trying to send it to " + mineID)
                        // mineStatus.get(mineID).activity += 10  // TODO: NOT OPTIMAL, SHOULD CHANGE SO PILGRIM SIGNALS BACK ACKNOWLEDGEMENT, ALL CASTLES KNOW THEN
                        let signalToSend = comms.encodeMine(mineID)
                        r.signal(signalToSend, 2)  // tell the pilgrim which mine to go to, dictionary keys are strings
                        r.castleTalk(comms.encodeCastleTalk(mineID, comms.CASTLETALK_GOING_MINE))  // let other castles know                            
                        return r.buildUnit(SPECS.PILGRIM, buildDirection[0], buildDirection[1])
                    }
                }
            }
        }

        if (!(dangerCrusader && r.me.turn <= 50 && preacherCounter < 2) && 
            (danger || (prophetCounter < r.me.turn / 20 && r.me.turn > 1 && r.karbonite > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL + 2))) {
            if (r.me.turn < 10 || (r.karbonite > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE + 50 && r.fuel > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL + 200)) {
                var buildDirection = utils.findBuildDirection(r, r.me.x, r.me.y)
                if (buildDirection) {
                    // r.log("Church: Built Prophet")
                    const latticeLocation = nextLatticeLocation(r)
                    if (latticeLocation)
                        r.signal(comms.encodeStand(latticeLocation[0], latticeLocation[1]), 2)
                    return r.buildUnit(SPECS.PROPHET, buildDirection[0], buildDirection[1])
                }
            }
        }

        // test build preachers
        if ((dangerCrusader || dangerPreacher) && preacherCounter < 2 && r.karbonite > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_FUEL) {
            var buildDirection = utils.findBuildDirection(r, r.me.x, r.me.y)
            if (buildDirection) {
                // r.signal(parseInt(generateMeme(enemyLocation[closestEnemy])), 2)
                const defensivePos = forms.nextPosition(r, defense_center, occupiedPositions)
                if (defensivePos) {
                    // r.log("Church: Built a Preacher, sending it to: " + defensivePos)  // preacher counter increments when scanning friends
                    // r.signal(comms.encodeStand(defensivePos[0], defensivePos[1]), 2)
                    occupiedPositions.add(defensivePos.toString())
                    return r.buildUnit(SPECS.PREACHER, buildDirection[0], buildDirection[1])
                }
            }
        }
    } else if (producing) {  // ------ OFFENSE BUILD ------
        for (const otherRobot of r.getVisibleRobots()) {  // may be bad for optimization?
            if (otherRobot.team === r.me.team && r.isRadioing(otherRobot)) {
                // recieve message
                const decodedMsg = comms.decodeSignal(otherRobot.signal)
                // r.log("Church: recieved message: " + decodedMsg)             
                if (decodedMsg[2] === comms.KILLED) {
                    if (targetCastle) {
                        if (targetCastle[0] === decodedMsg[0] && targetCastle[1] === decodedMsg[1]) {
                            targetCastle = null
                            // r.log(decodedMsg)
                            producing = false
                            // r.log("Church: I see castle killed" + targetCastle)       
                        } 
                    }            
                }
            }
        }
        if (r.karbonite > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL + 1000) {  // save at least 1000
            var buildDirection = findAttackDirection(r, targetCastle[0], targetCastle[1])
            if (buildDirection !== null) {
                const offensivePos = targetCastle
                if (offensivePos) {
                    // r.log("OFFENSIVE Church: Built a CRUSADER, sending it to: " + offensivePos)  // preacher counter increments when scanning friends
                    r.signal(comms.encodeAttack(offensivePos[0], offensivePos[1]), 2)                    
                    return r.buildUnit(SPECS.CRUSADER, buildDirection[0], buildDirection[1])
                }
            }
        }
    }
    
    return
}

function findAttackDirection (r, x, y) {
    let minDis = 9999
    let minDir = null
    for (const dir of utils.directions) {
        if (utils.isEmpty(r, r.me.x + dir[0], r.me.y + dir[1])) {
            if (utils.getManhattanDistance(r.me.x + dir[0], r.me.y + dir[1], x, y) < minDis) {
                minDis = utils.getManhattanDistance(r.me.x + dir[0], r.me.y + dir[1], x, y)
                minDir = dir                
            }
        }
    }
    return minDir
}

// populate mineStatus: deterministically label mines, store location & distance from castle
// populate sortedMines: sort mineIDs by distance
function initializeMines(r) {  // deterministically label mines, store distances from castle
    let mineID = -1
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i] || r.fuel_map[j][i]) {
                mineStatus.set(++mineID, {
                    loc: [i, j],
                    distance: churchPathField.getDistanceAtPoint(i, j),
                    activity: 0
                })
                sortedMines.push(mineID)
                mineToID[i.toString() +',' + j.toString()] = mineID
            }
        }
    }
    // sort by distance from least to greatest
    sortedMines.sort((a, b) => {
        return mineStatus.get(a).distance - mineStatus.get(b).distance
    })
}

// returns number of mines within a certain range of the castle
function calculateNumMines(r, range) {
    let closeMineCount = 0
    for (const mineID of sortedMines) {
        if (mineStatus.get(mineID).distance < range)
            closeMineCount++
        else break
    }
    return closeMineCount
}

// returns conservative estimate of number of pilgrims we need to have to mine at every mine
// DOES NOT ACCOUNT FOR MINING MULTIPLE RESOURCES WHICH IS A MUCH BETTER IDEA
// Theres usually different ratios of mines i think, but for every 2-mine grouping it would be distance * 2 / 10 + 2 i think
function calculateNumPilgrims(r) {
    let num = 0
    for (const entry of sortedMines)  // take only a portion of the closest mines
        if (mineStatus.get(entry).distance < mineRange)
            num++  // logic is 10 turns to mine to full, pilgrims walk 1 tile per turn back and forth
    r.log("Church: im going to try to make " + num + " pilgrims")
    return num
}

// following the meta
function findLatticeLocations(r) {
    const size = 2 * SPECS.UNITS[SPECS.CHURCH].VISION_RADIUS + 1
    const orientation = (r.me.x + r.me.y) % 2
    let x = r.me.x
    let y = r.me.y
    let direction = 0
    let chain = 1
    for (let i = 1; i < size; i++) {
        for (let j = 0; j < ((i<size-1)?2:3); j++) {
            for (let k = 0; k < chain; k++) {
                if (utils.isEmpty(r, x, y, true) && !r.getFuelMap()[y][x] && !r.getKarboniteMap()[y][x] && (x + y) % 2 === orientation)
                    latticeLocations.push([x, y])
                switch (direction) {
                    case 0: y++; break
                    case 1: x++; break
                    case 2: y--; break
                    case 3: x--; break
                }
            }
            direction = (direction+1) % 4
        }
        chain++
    }
    latticeLocations.sort((a, b) => {
        return utils.getSquaredDistance(a[0], a[1], r.me.x, r.me.y) - utils.getSquaredDistance(b[0], b[1], r.me.x, r.me.y)
    })
}

function nextLatticeLocation(r) {
    for (const index in latticeLocations) {
        const loc = latticeLocations[index]
        if (usedLatticeLocations.hasOwnProperty(loc) && usedLatticeLocations[loc] > 0) {
            usedLatticeLocations[loc]--
            continue
        }
        if (r.getVisibleRobotMap()[loc[1]][loc[0]] === 0) {
            usedLatticeLocations[loc] = churchPathField.getDistanceAtPoint(loc[0], loc[1]) + 4  // 4 is random
            return loc
        }
    }
    return null
}

function nextMineID(r) {  // uses resource-blind ids
    let robomap = r.getVisibleRobotMap()
    // use sortedMines with mineStatus to decide the next mine to send a pilgrim toward
    for (const mineID of sortedMines) {
        const mine = mineStatus.get(mineID)
        if (robomap[mine.loc[1]][mine.loc[0]] == 0) {
            mine.activity = 0
            // r.log("Church: ID of " + id + " has activity of " + mine.activity)
            if (mine.activity === 0 && mine.distance < mineRange)  // no pilgrim activity here yet, temp way to cutoff distance
                return mineID
        }
    }
    return null
}