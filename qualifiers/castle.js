import {SPECS} from 'battlecode'
import utils from './utils.js'
import comms from './comms.js'


// maps mineID (starting from 1) to
// loc: [x, y] location of mine
// distance: pathfield distance from this castle to mine
// activity: heuristic for pilgrims at mine, assigning adds 10, subtract/add 1 per turn based on mining
const mineStatus = new Map()
const sortedMines = []  // sorted array of mineIDs ascending by distance
var mineToGoOrder = [] //sorted array of mineID order, it's different because it build church
var mineToID = {}  // maps string location to id, convenience

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

var mine_range = 10
var enemyCastleLocSent = false


export function castleTurn(r) {

   
    if (r.me.turn > 800 && enemyCastleLocSent == false && r.fuel>2000) {
        let visibleRobotMap= r.getVisibleRobotMap()
        r.log("trying to send my symmetrical location")
        if (r.fuel>Math.ceil(visibleRobotMap[0].length*1.415))
        {
            let curEnemyCastle=utils.reflectLocation(r,[r.me.x,r.me.y])
            r.log('sent '+curEnemyCastle)
            r.signal(comms.encodeAttack(curEnemyCastle[0],curEnemyCastle[1],16),(visibleRobotMap[0].length-1)*(visibleRobotMap[0].length-1)*2)
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
            //mine.activity -= 1
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
    let dangerProphet = false
    let dangerCrusader =false
    let allyPreacherCount = 0

    let minesToIncrement = new Set()  // we want steady numbers

    // look at nearby robots
    for (const robot of r.getVisibleRobots()) {
        const message = robot.castle_talk
        if (message !== 0 && !processedCastleTalk.has(robot.id)) {  // actual unused message
            if (robot.team === r.me.team && robot.id !== r.me.id) {  // other friendly robot
                // r.log("Received a message of " + message + " on turn " + r.me.turn)
                recievedMessages[robot.id] = message  // unused
                if (message < 255) {  // castle is indicating that it sent a pilgrim to this mine                   
                    let decoded = comms.decodeCastleTalk(message)
                    //array 0 is id, 1 is 2 bit action in string

                    r.log(decoded)
                    let messageMineID = decoded[0]
                    let receivedMine =  mineStatus.get(messageMineID)
                    receivedMine.activity += 10                   
                    if (receivedMine.distance > mine_range){
                        let near = nearMines(r,messageMineID)
                        for (let tempMineID of near){
                            r.log(tempMineID)
                            let tempMineStatus = mineStatus.get(tempMineID) 
                            tempMineStatus.activity += 10               
                        }                      
                    }

                    // r.log("acknowledged another castle")
                }
                else if (!(r.me.turn <= 3 && castleLocationBuilder.has(robot.id))) {  // pilgrim is already there and mining
                    // mineStatus.get(message).activity += 1
                    // r.log("acknowledged a pilgrim")
                    minesToIncrement.add(message)
                } 
            }
        } 
        if (robot.team === r.me.team) {
            if (utils.attackingUnits.has(robot.unit))
                allyCount += 1
            if (robot.unit === SPECS.PREACER)
                allyPreacherCount++ 
        }
        else if (robot.team !== r.me.team) {
            if (robot.unit == SPECS.CRUSADER)
                dangerCrusader = true
            else if (robot.unit == SPECS.PROPHET)
                dangerProphet = true
            enemyCount += 1
            enemyDistance[robot.id] = utils.getManhattanDistance(r.me.x, r.me.y, robot.x, robot.y)
            enemyLocation[robot.id] = [r.me.x, r.me.y]
            if (closestEnemy === -1 || enemyDistance[robot.id] < enemyDistance[closestEnemy])
                closestEnemy = robot.id
            if (enemyCount > allyCount)
                danger = true
        }
    }

    for (const m of minesToIncrement)  // only want to increment once per recieved message. This way, always have 1 pilgrim near mine
        mineStatus.get(m).activity += 1

    if (r.me.turn % 50 === 0) {
        r.log("activity numbers, total: " + totalActivity)
        // r.log(mineStatus)
    }

    // ---------- BUILD PILGRIMS ----------

    if (!danger) {  // enough fuel to signal afterwards
        if ( (1 < r.me.turn < 10 && r.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + 2) || (r.karbonite > (SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE+50) && r.fuel > (SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + 100) ))
        { 
            var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
            if (buildDirection != null) {
                // see if there is a mine for a pilgrim to go to
                const mineID = nextMineID(r)
                r.log(mineID)
                if (mineID !== null){

                    r.log("Built Pilgrim, trying to send it to " + mineID)
                    // mineStatus.get(mineID).activity += 10  // TODO: NOT OPTIMAL, SHOULD CHANGE SO PILGRIM SIGNALS BACK ACKNOWLEDGEMENT, ALL CASTLES KNOW THEN

                    let signalToSend = comms.encodeSignal(mineID, 1, 64 , comms.ATTACK_MINE, 16)
                               
                    r.log(signalToSend)
                    r.signal(signalToSend,2)  // tell the pilgrim which mine to go to, dictionary keys are strings
                    
                    if (r.me.turn <= 4)                        
                        initialActivityQueue.push(comms.encodeCastleTalk(mineID,comms.CASTLETALK_GOING_MINE))

                    else r.castleTalk(comms.encodeCastleTalk(mineID,comms.CASTLETALK_GOING_MINE))  // let other castles know

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

    if (dangerProphet || (!danger && r.me.turn > 1 && r.karbonite > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL + 2)) {
        if (r.me.turn <3||(r.karbonite > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE+50&&r.fuel > SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL + 200)){
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

    // build preachers if panicking
    if (danger && allyPreacherCount < 2 && r.karbonite > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.PREACHER].CONSTRUCTION_FUEL) {
        var buildDirection = findBuildDirection(r, r.me.x, r.me.y)
        if (buildDirection != null) {
            r.log("Built Preacher")
            // r.signal(parseInt(generateMeme(enemyLocation[closestEnemy])), 2)
            // crusaderCounter++
            return r.buildUnit(SPECS.PREACHER, buildDirection[1], buildDirection[0])
        }
    }

    // ---------- LAST RESORT: ATTACK THE ENEMY ----------
    
    let attackClosestLocation = null
    let attackClosestDistance = 999
    for (const robot of r.getVisibleRobots()) {
        if (r.me.team !== robot.team) {
            const tempDistance = utils.getSquaredDistance(r.me.x, r.me.y, robot.x, robot.y)
            if (tempDistance > 64)
                continue
            if (!attackClosestLocation || tempDistance < attackClosestDistance) {
                attackClosestLocation = [robot.x, robot.y]
                attackClosestDistance = tempDistance
            }
        }
    }
    if (attackClosestLocation)
        return r.attack(attackClosestLocation[0] - r.me.x, attackClosestLocation[1] - r.me.y)
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
                    //find if on my side of symmetry or not
                    let side = 0 //side 0 is my side, 1 is enemy side decide if it's on my side or not
                    let maplen = r.karbonite_map.length
                    //x ok y change after reflection horizontal
                    if (r.mapSymmetry){
                        side = 0
                        //different side of the map
                        if (Math.floor(j/maplen*2) != (Math.floor(r.me.y/maplen*2))){
                            side = 1
                        }
                    }
                    //x change y ok after reflection vertical
                    else{
                        side = 0
                        //different side of the map
                        if (Math.floor(i/maplen*2) != (Math.floor(r.me.x/maplen*2))){
                            side = 1
                        }
                    }
                    // calculate the order based on distance
                    let tempDistance = castlePathField.getDistanceAtPoint(i, j)
                    // on my side
                    if (side == 0){
                        let near = lengthNearMinesWithXY (r,i,j)
                        // if it's resource dense on my side, prioritize
                        if (near >= 8){
                            //if more near better
                            tempDistance = mine_range + 1 - near/64
                        }
                    }
                    //on enemy side
                    else{
                        tempDistance = 9999 - tempDistance
                    }
                    //prefer karbonite sincei t's better early
                    if (r.karbonite_map[j][i]){
                        tempDistance -= 5

                    }
                    mineStatus.set(++mineID, {
                        loc: [i, j],
                        distance: tempDistance,
                        activity: 0
                    })
                    sortedMines.push(mineID)
                    mineToID[arrayToString([i,j])] = mineID                    
                }
                totalMines += 1
            }
        }
    }
    // sort mines by distance from least to greatest
    sortedMines.sort((a, b) => {

        return mineStatus.get(a).distance - mineStatus.get(b).distance
    })
    r.log(sortedMines)
    r.log("mine status is")
    r.log(mineStatus)
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
        // /r.log("ID of " + mineID + " has activity of " + mine.activity)
        if (mine.activity === 0) // no pilgrim activity here yet, temp way to cutoff distance
        {            
            // if close to castle no need to descrease activity
            return mineID
            if (mine.distance > mine_range){
                let near = nearMines(r,mineID)
                for (let tempMineID of near){
                    let tempMineStatus = mineStatus.get(tempMineID) 
                    //increase nearby activity
                    tempMineStatus.activity += 10               
                }
                
            }
        }
    }
    return null
}

//shuffle a random direction to check
function shuffledDirection() {
    let directions = utils.directions
    let index = null
    let x = null
    for (let i = 0; i <= (directions.length - 1); i++) {
        index = Math.floor(Math.random() * (i + 1))
        //swapping
        x = directions[i]
        directions[i] = directions[index]
        directions[index] = x
    }
    return directions
}


//returns a strinified version of an array
//used to find location string using array
//takes array of two index [x,y] and convert to string
function arrayToString(array){
    return array[0].toString() + "," + array[1].toString()

}


//returns a list of nearby mine ids
//used to find all near mine id so you can increase activity level wehn pilgirm sent
//we want to not send pilgrim from castle unelss for exploration
//find the id of all nearby mines so you can increase activity level 
function nearMines(r,mineID){
    let toRet = []
    let mapsize = r.map.length
    r.log('near mine of')
   // r.log(mineID)    
    let curMine=mineStatus.get(mineID)
    let mineLoc = curMine.loc //location array
    for (let i = -mine_range; i < mine_range; i++){        
        for (let j = -mine_range; j < mine_range; j++){
            if (Math.abs(i) + Math.abs(j) < mine_range){
                let curX = mineLoc[0] + i
                let curY = mineLoc[1] + j
                // no need to check in range or not since it's already part of the key it's in                
                let curLoc = arrayToString([curX,curY])
                if (curLoc in mineToID){
                    toRet.push(mineToID[curLoc])
                }               

            }

        }
    }
    return toRet

}

//returns length of near by mine for distance
//used to find all near mine id so you can increase activity level wehn pilgirm sent
//we want to not send pilgrim from castle unelss for exploration
//find the id of all nearby mines so you can increase activity level 
function lengthNearMinesWithXY(r,x, y){
    let toRet = 0
    let mapsize = r.map.length    
    let mineLoc = [x,y]


    for (let i = -mine_range; i < mine_range; i++){        
        for (let j = -mine_range; j < mine_range; j++){
            if (Math.abs(i) + Math.abs(j) < mine_range){
                let curX = mineLoc[0] + i
                let curY = mineLoc[1] + j
                // check in range or not               
                if (!(curX < 0 || curX >= r.map[0].length || curY < 0 || curY >= r.map.length)){
                    if (r.karbonite_map[curY][curX] || r.fuel_map[curY][curX]){
                        toRet++;
                    }
                }
            }               

        }

    }
    return toRet
}
    

