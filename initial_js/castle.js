import {SPECS} from 'battlecode'

const KARBONITE =  0
const FUEL = 1

const directions = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]]

function isEmpty(r, x, y) {
    if (x >= 0 && x < r.map[0].length && y >= 0 && y < r.map.length) {
        const passableMap = r.map;
        const visibleRobotMap = r.getVisibleRobotMap();
        return passableMap[y][x] && visibleRobotMap[y][x] == 0;
    }
}

function getManhattanDistance(x1, y1, x2, y2) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1)
}

function findBuildDirection(r, x, y) {
    for (const dir of directions) {
        if (isEmpty(r, x + dir[0], y + dir[1])) {
            return dir
        }
    }
    return null
}

function iDMines(r) {  // deterministically label mines, build manhattan distances for early use
    let allCounter = 0
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i] || r.fuel_map[j][i]) {
                allCounter++
                allMineID[allCounter] = i.toString()+','+ j.toString()
                allMinePilgrim[allCounter] = 0
                allMineManhattan[allCounter] = getManhattanDistance(r.me.x, r.me.y, i, j)
            }
        }
    }
    return allCounter  // counter end at id+1
}

// find distance between this castle and mine of a specific id and resource
function calculateMineDistance(r, id) {  // uses resource-specific ids
    let mineLoc = allMineID[id].split(",").map((n) => parseInt(n))
    let pf = r.pm.getPathField(mineLoc, true)
    return pf.getDistanceFromTarget(r.me.x, r.me.y)
}

// returns number of mines within a certain distance of the castle
function calculateNumMines(r, distance_threshhold){
    let closeMineCount = 0;
    for (const [id, distance] of Object.entries(allMineDistance)) {
        // r.log(distance)
        if (distance < distance_threshhold) {
            closeMineCount++;
        }
    }
    return closeMineCount;
}

// returns conservative estimate of number of pilgrims we need to have to mine at every mine
// DOES NOT ACCOUNT FOR MINING MULTIPLE RESOURCES WHICH IS A MUCH BETTER IDEA
// Theres usually different ratios of mines i think, but for every 2-mine grouping it would be distance * 2 / 10 + 2 i think
function calculateNumPilgrims(r) {
    let num = 0
    for (const entry of allMineSorted.slice(0, totalMines / numFriendlyCastles / 2)) {  // take only a portion of the closest mines
        if (entry[1] < mine_range) {
            num += Math.floor(entry[1] * 2 / 10 + 1)  // logic is 10 turns to mine to full, pilgrims walk 1 tile per turn back and forth
        }
    }
    r.log("im going to try to make " + num + " pilgrims")
    return num  // why does manhattan give bigger numbers than pathfinding distance, makes no sense
}

function updateSortedMines(r, pathfinding = false) {
    // updates the mineSorted arrays based on either manhattan or pathfinding distance
    if (pathfinding) {
        allMineSorted = Object.keys(allMineDistance).map(function(key) {  // pulled from stack overflow, create an array with entries that are [key, value]
            return [key, allMineDistance[key]];
        });
    }
    else {
        allMineSorted = Object.keys(allMineManhattan).map(function(key) {  // pulled from stack overflow, create an array with entries that are [key, value]
            return [key, allMineManhattan[key]];
        });
    }
    allMineSorted.sort(function(first, second) { 
        return first[1] - second[1]  // sort least to greatest
    })
    r.log(allMineSorted)
}

function nextMineID(r, pathfinding = false) {  // uses resource-blind ids
    // use allMineSorted with allMinePilgrim to decide the next mine to send a pilgrim toward
    for (const entry of allMineSorted) {  // entry is id, distance
        const id = entry[0]  // idk how to make this neater
        const distance = entry[1]
        // r.log("ID of " + id + " has activity of " + allMinePilgrim[id])
        if (allMinePilgrim[id] === 0  && distance < mine_range ) // no pilgrim activity here yet, temp way to cutoff distance
            return id
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

var allMineID = {}  // using this instead now, avoid complication of fuel v karbonite. maps id to location

var allMineManhattan = {}  // maps mine ids to manhattan distance from this castle

var allMineDistance = {}  // maps mine ids to pathfinding distance from this castle

var allMineSorted = []  // allMineDistance but sorted

var allMinePilgrim = {}  // maps mine ids to number pilgrims mining there, assigning adds 10, subtract/add 1 per turn based on mining

var totalMines = 0  // total number of mines

var numMines = 0  // numMines is number of close mines
var idealNumPilgrims = 0
var numTeamCastles = 0  // number of castles on our team. For now, split mines and pilgrim production

var pilgrimCounter = 0
var prophetCounter = 0
var crusaderCounter = 0

var recievedMessages = {}
var numFriendlyCastles = 1

var mine_range = 30

export function castleTurn(r) {
    if (r.me.turn === 1) {
        r.log("I am a Castle")

        totalMines = iDMines(r)  // this calculate total mines, and manhattan distances from each
        r.log(allMineID)
        updateSortedMines(r, false)  // update the MineSorted arrays

        numMines = calculateNumMines(r,20);  // this calculates number of mines within range

        r.log("There are " + totalMines + " mines")

        idealNumPilgrims = calculateNumPilgrims(r) // split map with opponent

        r.castleTalk(255)  // let other castles know you exist

    }

    mine_range = Math.max(mine_range, r.map.length + r.me.turn / 20)

    // start calculating mine distances, 1 per turn, id of turn
    if (r.me.turn <= totalMines) {  // a lot of this is terrible
        let id = r.me.turn
        allMineDistance[id] = calculateMineDistance(r, id)
    }

    else if (r.me.turn === totalMines + 1) {
        r.log("Finished calculating mine distances")
        updateSortedMines(r, true)
        idealNumPilgrims = calculateNumPilgrims(r) // update with newly calculated pathfinding distances in sortedMines
    }

    // ---------- REGULAR BOOKKEEPING AND COMMUNICATIONS ----------
    let totalActivity = 0
    for (let [id, value] of Object.entries(allMinePilgrim)) {  // regularly subtract "heat" value of number of pilgrims at a mine
        if (value > 0) {
            // r.log(value)
            allMinePilgrim[id] -= 1
            // TEMP REMOVAL?
            totalActivity += allMinePilgrim[id]
        }
    }

    // r.log(allMinePilgrim)
    if (r.me.turn % 50 === 0) {
        r.log("activity numbers, total: " + totalActivity)
        r.log(allMinePilgrim)
    }

    let danger = false
    let allyCount = 0
    let enemyCount = 0
    let enemyDistance = {}
    let enemyLocation = {}
    let closestEnemy = -1

    for (const robot of r.getVisibleRobots()) {
        const message = robot.castle_talk
        if (message !== 0) {  // actual message
            if (robot.team === r.me.team && robot.id !== r.me.id) {  // other robot
                // r.log("Received a message of " + message + " on turn " + r.me.turn)
                recievedMessages[robot.id] = message  // unused
                if (r.me.turn <= 2 && message === 255) {  // probably another castle telling us it exists
                    numFriendlyCastles += 1
                    r.log("UPDATE friendly castles to " + numFriendlyCastles)
                    idealNumPilgrims = calculateNumPilgrims(r)
                }
                else if (message >= 100) {  // castle is indicating that it sent a pilgrim to this mine
                    allMinePilgrim[message - 100] += 10
                    // r.log("acknowledged another castle")
                }
                else {  // pilgrim is already there and mining
                    allMinePilgrim[message] += 1
                    // r.log("acknowledged a pilgrim")
                }
            }
        } else if (robot.team === r.me.team) {
            allyCount += 1
        } else if (robot.team !== r.me.team) {
            enemyCount += 1
            enemyDistance[robot.id] = getManhattanDistance(r.me.x, r.me.y, robot.x, robot.y)
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

    // build pilgrims
    if (!danger && r.me.turn > 1 && pilgrimCounter < idealNumPilgrims && r.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + 2) {  // enough fuel to signal afterwards
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            // see if there is a mine for a pilgrim to go to
            const mineID = nextMineID(r, (r.me.turn >= totalMines + 1))
            if (mineID !== null){
                r.log("Built Pilgrim, trying to send it to " + mineID)
                // allMinePilgrim[mineID] += 10  // TODO: NOT OPTIMAL, SHOULD CHANGE SO PILGRIM SIGNALS BACK ACKNOWLEDGEMENT, ALL CASTLES KNOW THEN
                r.signal(parseInt(mineID), 2)  // tell the pilgrim which mine to go to, dictionary keys are strings
                r.castleTalk(parseInt(mineID) + 100)  // let other castles know
                allMinePilgrim[parseInt(mineID)] += 10  // update yourself
                pilgrimCounter++
                return r.buildUnit(SPECS.PILGRIM, buildDirection[0], buildDirection[1])
            }
        }
    }

  
    if (r.karbonite > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL) {
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            r.log("Built Prophet")
          
            return r.buildUnit(SPECS.PROPHET, buildDirection[0], buildDirection[1])
        }
    }
   

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

    return
}