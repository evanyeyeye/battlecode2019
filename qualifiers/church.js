import {SPECS} from 'battlecode'
import utils from './utils.js'
import comms from './comms.js'

const KARBONITE =  0
const FUEL = 1

// maps mineID (starting from 1) to
// loc: [x, y] location of mine
// distance: pathfield distance from this castle to mine (ideal)
// activity: heuristic for pilgrims at mine, assigning adds 10, subtract/add 1 per turn based on mining
const mineStatus = new Map()
const sortedMines = []  // sorted array of mineIDs ascending by distance

var churchPathField = null

var numMines = 0  // numMines is number of close mines
var idealNumPilgrims = 0
var numTeamCastles = 0  // number of castles on our team. For now, split mines and pilgrim production

var pilgrimCounter = 0
var prophetCounter = 0
var crusaderCounter = 0
var preacherCounter = 0
var mineToID = {}
var sent = false

var recievedMessages = {}
var numFriendlyCastles = 1

var mine_range = 10

export function churchTurn(r) {

    if (r.me.turn === 1) {
        r.log("I am a Church")
        // generate pathfield from castle location
        churchPathField = r.pm.getPathField([r.me.x, r.me.y])
        // populate mineStatus and sortedMines
        initializeMines(r)
        r.log("Church: There are " + mineStatus.size + " mines")
        // calculate number of mines within range
        numMines = calculateNumMines(r, mine_range)  
        // determine number of pilgrims to build
        idealNumPilgrims = calculateNumPilgrims(r) // split map with opponent
    }

    let danger = false
    let allyCount = 0
    let enemyCount = 0
    let enemyDistance = {}
    let enemyLocation = {}
    let closestEnemy = -1    
    let minesToIncrement = new Set()  // we want steady numbers
    pilgrimCounter = 0


    for (const robot of r.getVisibleRobots()) { 
        if (robot.team === r.me.team&& robot.id !== r.me.id) {
            if (robot.unit!=SPECS.PILGRIM)
            {
                allyCount += 1
            }
            else{
                pilgrimCounter++;

                if (r.fuel_map[robot.y][robot.x]||r.karbonite_map[robot.y][robot.x]){
                    let cur_id = mineToID[robot.x.toString() +',' + robot.y.toString()]
                    mineStatus.get(cur_id).activity =10  // update yourself 
                }   
                
            }
        }
         else if (robot.team !== r.me.team) {
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

    
    // ---------- START BUILDING STUFF ----------
    

    // r.log("I'm church there are this many pilgrims count: "+pilgrimCounter)

    if (r.me.turn > 1 && (pilgrimCounter < idealNumPilgrims ) && r.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + 2) {  // enough fuel to signal afterwards
        if (r.me.turn < 5 || (r.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE + 50 && r.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + 200)){       
            var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
            if (buildDirection != null) {
                // see if there is a mine for a pilgrim to go to
                const mineID = nextMineID(r)
                if (mineID !== null){
                    r.log("Church: Built Pilgrim, trying to send it to " + mineID)
                    // mineStatus.get(mineID).activity += 10  // TODO: NOT OPTIMAL, SHOULD CHANGE SO PILGRIM SIGNALS BACK ACKNOWLEDGEMENT, ALL CASTLES KNOW THEN
                    let signalToSend = comms.encodeSignal(mineID, 0, mineStatus.size, comms.ATTACK_MINE, 16)
                    r.signal(signalToSend,2)  // tell the pilgrim which mine to go to, dictionary keys are strings
                    r.castleTalk(comms.encodeCastleTalk(mineID,comms.CASTLETALK_GOING_MINE))  // let other castles know                            
                    return r.buildUnit(SPECS.PILGRIM, buildDirection[0], buildDirection[1])
                }
            }
        }
    }

    
    // build prophets
    if ( r.me.turn > 1 && r.karbonite > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL + 2) {
        if (r.me.turn < 10 || (r.karbonite > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE + 50 && r.fuel > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL + 200)){
            var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
            if (buildDirection != null) {
            r.log("Church: Built Prophet")
            return r.buildUnit(SPECS.PROPHET, buildDirection[0], buildDirection[1])
            }
        }
    }
    

    /*
    // test build crusaders
    // if (r.karbonite > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL) {
    if (r.karbonite > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.CRUSADER].CONSTRUCTION_FUEL) {
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            r.log("Church: Built Crusader")
            // r.signal(parseInt(generateMeme(enemyLocation[closestEnemy])), 2)
            crusaderCounter++
            return r.buildUnit(SPECS.CRUSADER, buildDirection[1], buildDirection[0])
        }
    }
    */

    /*
    // test build preachers
    if (r.karbonite > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_FUEL) {
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            r.log("Church: Built a Preacher")
            // r.signal(parseInt(generateMeme(enemyLocation[closestEnemy])), 2)
            preacherCounter++
            return r.buildUnit(SPECS.PREACHER, buildDirection[1], buildDirection[0])
        }
    }
    */
    return
}

// TODO: specifically tune for troops
function findBuildDirection(r, x, y) {
    for (const dir of utils.directions) {
        if (utils.isEmpty(r, x + dir[0], y + dir[1])) {
            return dir
        }
    }
    return null
}

// populate mineStatus: deterministically label mines, store location & distance from castle
// populate sortedMines: sort mineIDs by distance
function initializeMines(r) {  // deterministically label mines, store distances from castle
    let mineID = 0
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
    for (const entry of sortedMines) {  // take only a portion of the closest mines
        if (mineStatus.get(entry).distance < mine_range) {
            num++;  // logic is 10 turns to mine to full, pilgrims walk 1 tile per turn back and forth
        }
    }
    r.log("Church: im going to try to make " + num + " pilgrims")
    return num
}

function nextMineID(r) {  // uses resource-blind ids
    let robomap=r.getVisibleRobotMap()
    // use sortedMines with mineStatus to decide the next mine to send a pilgrim toward
    for (const mineID of sortedMines) {


        const mine = mineStatus.get(mineID)
        if (robomap[mine.loc[1]][mine.loc[0]] == 0)
        {
            mine.activity = 0
        // r.log("Church: ID of " + id + " has activity of " + mine.activity)
        if (mine.activity === 0 && mine.distance < mine_range) // no pilgrim activity here yet, temp way to cutoff distance
            return mineID
        }
    }
    return null

}