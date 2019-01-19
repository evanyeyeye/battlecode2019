import {SPECS} from 'battlecode'
import utils from './utils.js'

const KARBONITE =  0
const FUEL = 1
const action_attack_mine="00"  //mine or attack depends on unit
const action_zone_scout="01" //zone or scout depends on the unit
const action_change_attack_mine="10" //change fro mcurrent action to attack
const action_change_zone_scout="11" //change from current action zonescout

// maps mineID (starting from 1) to
// loc: [x, y] location of mine
// manhattan: manhattan distance from this castle to mine
// distance: pathfield distance from this castle to mine (ideal)
// activity: heuristic for pilgrims at mine, assigning adds 10, subtract/add 1 per turn based on mining
var mineStatus = new Map()

var sortedMines = []

var numMines = 0  // numMines is number of close mines
var idealNumPilgrims = 0
var numTeamCastles = 0  // number of castles on our team. For now, split mines and pilgrim production

var pilgrimCounter = 0
var prophetCounter = 0
var crusaderCounter = 0

var recievedMessages = {}
var numFriendlyCastles = 1

var mine_range = 25

export function castleTurn(r) {
    // r.log(typeof utils.utils.isEmpty)
    // r.log(utils.hello)

    if (r.me.turn === 1) {
        r.log("I am a Castle")

        initializeMines(r)  // this calculate total mines, and manhattan distances from each
        // r.log(allMineID)
        updateSortedMines(r)  // update the MineSorted arrays

        numMines = calculateNumMines(r, 25);  // this calculates number of mines within range

        r.log("There are " + mineStatus.size + " mines")

        idealNumPilgrims = calculateNumPilgrims(r) // split map with opponent

        r.castleTalk(255)  // let other castles know you exist

    }

   // mine_range = Math.max(mine_range, r.map.length + r.me.turn / 20)

    // start calculating mine distances, 1 per turn, id of turn
    if (r.me.turn <= mineStatus.size) {  // a lot of this is terrible
        const mineID = r.me.turn
        mineStatus.get(mineID).distance = calculateMineDistance(r, mineID)
    }

    else if (r.me.turn === mineStatus.size + 1) {
        r.log("Finished calculating mine distances")
        updateSortedMines(r)
        idealNumPilgrims = calculateNumPilgrims(r) // update with newly calculated pathfinding distances in sortedMines
    }

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

    let minesToIncrement = new Set()  // we want steady numbers

    for (const robot of r.getVisibleRobots()) {
        const message = robot.castle_talk
        if (message !== 0) {  // actual message
            if (robot.team === r.me.team && robot.id !== r.me.id) {  // other friendly robot
                // r.log("Received a message of " + message + " on turn " + r.me.turn)
                recievedMessages[robot.id] = message  // unused
                if (r.me.turn <= 2 && message === 255) {  // probably another castle telling us it exists
                    numFriendlyCastles += 1
                    r.log("UPDATE friendly castles to " + numFriendlyCastles)
                    idealNumPilgrims = calculateNumPilgrims(r)
                }
                else if (message >= 100) {  // castle is indicating that it sent a pilgrim to this mine
                    mineStatus.get(message - 100).activity += 10
                    // r.log("acknowledged another castle")
                }
                else {  // pilgrim is already there and mining
                    // mineStatus.get(message).activity += 1
                    // r.log("acknowledged a pilgrim")
                    minesToIncrement.add(message)
                }
            }
        } else if (robot.team === r.me.team) {
            allyCount += 1
        } else if (robot.team !== r.me.team) {
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

    // ---------- START BUILDING STUFF ----------

    // build pilgrims
    if (!danger && r.me.turn > 1 && pilgrimCounter < (Math.floor(idealNumPilgrims/1.5)+2) && r.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + 2) {  // enough fuel to signal afterwards
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            // see if there is a mine for a pilgrim to go to
            const mineID = nextMineID(r, (r.me.turn >= mineStatus.size + 1))
            if (mineID !== null){
                r.log("Built Pilgrim, trying to send it to " + mineID)
                // mineStatus.get(mineID).activity += 10  // TODO: NOT OPTIMAL, SHOULD CHANGE SO PILGRIM SIGNALS BACK ACKNOWLEDGEMENT, ALL CASTLES KNOW THEN
                r.signal(parseInt(mineID), 2)  // tell the pilgrim which mine to go to, dictionary keys are strings
                r.castleTalk(parseInt(mineID) + 100)  // let other castles know
                mineStatus.get(parseInt(mineID)).activity += 10  // update yourself
                pilgrimCounter++
                return r.buildUnit(SPECS.PILGRIM, buildDirection[0], buildDirection[1])
            }
        }
    }


    if (!danger && r.karbonite > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL) {
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            r.log("Built Prophet")
          
            return r.buildUnit(SPECS.PROPHET, buildDirection[0], buildDirection[1])
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

//encode message for signaling
//action is a number. 
function encodeSignal(mineID,mineID2,action,signallen){
    let encoded_mine=mineID.toString(2);
    let encoded_mine2=mineID2.toString(2);
    let totalMines=sortedMines.length // decide how many bits to give to mines
    let bitsToGive=Math.ceil(Math.log2(totalMines)) // how many bits to give
    let message=""   
    //fill up the empty spots 
    for (let i=0; i<bitsToGive- encoded_mine.length ;i++){
        message+="0"
    }   
    message+=encoded_mine    
    message+=action
    //fill up the empty spots 
    for (let i=0; i<bitsToGive- encoded_mine2.length ;i++){
        message+="0"
    }  
    message+=encoded_mine2
    let msglen=message.length
    //fill up the empty spots
    for (let i=0; i<signallen -msglen ;i++){
        message+="0"
    }    
    let encoded = parseInt(message, 2);
    return encoded
}

function initializeMines(r) {  // deterministically label mines, build manhattan distances for early use
    let mineID = 0
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i] || r.fuel_map[j][i]) {
                mineStatus.set(++mineID, {
                    loc: [i, j],
                    manhattan: utils.getManhattanDistance(r.me.x, r.me.y, i, j),
                    activity: 0
                })
                sortedMines.push([mineID, mineStatus.get(mineID).manhattan])
            }
        }
    }
    // r.log(sortedMines)
}

// find distance between this castle and mine of a specific id and resource
function calculateMineDistance(r, id) {  // uses resource-specific ids
    // r.log(mineStatus.get(id))
    const mineLoc = mineStatus.get(id).loc
    const pf = r.pm.getPathField(mineLoc, true)
    return pf.getDistanceFromTarget(r.me.x, r.me.y)
}

// returns number of mines within a certain range of the castle
function calculateNumMines(r, range) {
    let closeMineCount = 0
    for (const [mineID, mine] of mineStatus.entries()) {
        if (mine.hasOwnProperty("distance") && mine.distance < range) {
            closeMineCount++
        }
    }
    return closeMineCount
}

// returns conservative estimate of number of pilgrims we need to have to mine at every mine
// DOES NOT ACCOUNT FOR MINING MULTIPLE RESOURCES WHICH IS A MUCH BETTER IDEA
// Theres usually different ratios of mines i think, but for every 2-mine grouping it would be distance * 2 / 10 + 2 i think
function calculateNumPilgrims(r) {
    let num = 0
    // r.log(sortedMines)
    for (const entry of sortedMines.slice(0, mineStatus.size / numFriendlyCastles / 2)) {  // take only a portion of the closest mines
        if (entry[1] < mine_range) {
            num ++;  // logic is 10 turns to mine to full, pilgrims walk 1 tile per turn back and forth
        }
    }
    r.log("im going to try to make " + num + " pilgrims")
    return num  // why does manhattan give bigger numbers than pathfinding distance, makes no sense
}

function updateSortedMines(r) {
    // updates the sortedMines arrays based on either manhattan or pathfinding distance
    sortedMines.forEach((mine, index) => {
        const mineID = mine[0]
        if (mineStatus.get(mineID).hasOwnProperty("distance"))
            mine[1] = mineStatus.get(mineID).distance
    })
    sortedMines.sort((a, b) => {
        return a[1] - b[1]  // sort least to greatest
    })
    r.log(sortedMines)
}

function nextMineID(r) {  // uses resource-blind ids
    // use sortedMines with mineStatus to decide the next mine to send a pilgrim toward
    for (const entry of sortedMines) {  // entry is id, distance
        const mineID = entry[0]  // idk how to make this neater
        const distance = entry[1]
        // r.log("ID of " + id + " has activity of " + mineStatus.get(id).activity)
        if (mineStatus.get(mineID).activity === 0 && distance < mine_range) // no pilgrim activity here yet, temp way to cutoff distance
            return mineID
    }
    return null
}

function generateMeme(target) {  // super sketchy communication
    let message = ""
    message += target[0]
    message += "9"
    if (target[1] < 10) message += "0"
    message += target[1]
    return message
}
