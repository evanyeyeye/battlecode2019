import {SPECS} from 'battlecode'
import utils from './utils.js'
import comms from './comms.js'

var occupiedLoc = new Set(); // set to occupied loc  both take in string verison of location both take in string verison of location
var baseLocation = null  // castle or church to return resources to
var idToMine = {}  // maps mine ID to its STRING location
var mineToID = {}  // maps string location to id, convenience
var mineToDistance = {}  // maps string location of a mine to distance

var castleTargetMineID = null // the target mine that the castle gives

var targetCastle = null  // place to put church
var targetMine = null
var builtChurch = false


export function pilgrimTurn(r) {
    if (r.me.turn == 1) {
        r.log("Pilgrim: I am a Pilgrim")
        iDMines(r)
        // find the closest castle, probably built from there
        for (const otherRobot of r.getVisibleRobots()) {  // may be bad for optimization?
            if (otherRobot.team === r.me.team && (otherRobot.unit === SPECS.CASTLE || otherRobot.unit === SPECS.CHURCH) && r.isRadioing(otherRobot)) {
                // recieve message
                const [id1, id2, action] = comms.decodeSignal(otherRobot.signal)
                // r.log("Pilgrim: recieved message: " + decodedMsg)                
                if (action == comms.ATTACK_CHURCH) {
                    targetCastle = [id1, id2]
                }
                else if (action === comms.MINE) {         
                    castleTargetMineID = id1 // first id being encoded
                    const toCastleTalk = comms.encodeCastleTalk(castleTargetMineID, comms.CASTLETALK_GOING_MINE)
                    r.castleTalk(toCastleTalk)  // acknowledge being sent to this mine, castle handles this now
                }
            }
        }
    }

    let enemyRobotList = []  // enemies in vision range, mark off attack range from pathfinding
    let enemyRobotDanger = []  // within attack range!

    // look around to evaluate enemies
    for (const otherRobot of r.getVisibleRobots()) {
        const sqDis = utils.getSquaredDistance(r.me.x, r.me.y, otherRobot.x, otherRobot.y)
        const distance = utils.getManhattanDistance(r.me.x, r.me.y, otherRobot.x, otherRobot.y)
        if (otherRobot.team === r.me.team) {

            // set closest friendly castle or church as base
            if ( (otherRobot.unit === SPECS.CASTLE || otherRobot.unit === SPECS.CHURCH) && (baseLocation === null  || distance < (utils.getManhattanDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1])) )) {
                baseLocation = [otherRobot.x, otherRobot.y]
                updateMines(r, baseLocation)  // refresh mines based on distance to base castle location
            }
        }
        else {
            if (otherRobot.unit !== SPECS.PILGRIM && otherRobot.unit !== SPECS.CHURCH) {
                if (sqDis <= SPECS.UNITS[otherRobot.unit].ATTACK_RADIUS[1])
                    enemyRobotDanger.push(otherRobot)
                enemyRobotList.push(otherRobot)
            }
            if (otherRobot.unit !== SPECS.PILGRIM )  // potential threats
            {
                // castle talk about enemy position
                if (r.mapSymmetry) {  // x coordinate
                    r.castleTalk(comms.encodeCastleTalk(otherRobot.y, comms.CASTLETALK_ENEMY_SPOTTED))
                }
                else {  // y coordinate
                    r.castleTalk(comms.encodeCastleTalk(otherRobot.x, comms.CASTLETALK_ENEMY_SPOTTED))
                }
            }
        }
    }

    // change heat map can be optimized
    setHeatMap(r, enemyRobotList)  // marks off squares based on attack range of enemy robots

    //// ---------- KITE IF SENSE DANGER ----------
   
    if (enemyRobotDanger.length > 0){
        r.log("Pilgrim: calculating kite")
        const kiteAction = kite(r, enemyRobotDanger)
        if (kiteAction !== null){
            return r.move(kiteAction[0], kiteAction[1])
        }
    }   
    
    // ---------- MOVING BACK TO BASE ----------

    // edit this so that if does make sense go for other resource
    // return to church/castle if full
    if (r.me.karbonite === SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY || r.me.fuel === SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) {
        if( utils.getSquaredDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1]) <= 2) {
            // close enough to give the collected resources
            return r.give(baseLocation[0] - r.me.x, baseLocation[1] - r.me.y, r.me.karbonite, r.me.fuel)
        }

        // fix edge case of trying to go base with robot in middle
        if (utils.getSquaredDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1]) === 4) {
            const robotMap = r.getVisibleRobotMap()
            for (const tempDirection of utils.directions){
                const tempLocation = [r.me.x + tempDirection[0], r.me.y + tempDirection[1]]
                // close enough to give the collected resources and it's on a different resource mine
                r.log("Pilgrim: I'm actually giving??")
                if (utils.isOccupied(r,tempLocation[0], tempLocation[1]) ) {
                    // try to give to opposite mine so dont lose things in void
                    if (!(r.fuel_map[tempLocation[1]][tempLocation[0]] && r.me.fuel > 80)) {
                        return r.give(tempDirection[0], tempDirection[1], r.me.karbonite, r.me.fuel)
                    }
                    if (!(r.karbonite_map[tempLocation[1]][tempLocation[0]] && r.me.karbonite > 16)) {
                        return r.give(tempDirection[0], tempDirection[1], r.me.karbonite, r.me.fuel)
                    }
                }
            }
        }

        // return to church/castle if not too far away
        if (!utils.getManhattanDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1]) > 30) {
            let test = r.am.nextMove(baseLocation)
            if (test === null) {
                return
            }
            return r.move(test[0], test[1])
        }
    }

    //-----------------MOVE TO TARGET MINE TO TRY BUILD CHURCH ---------------
    
    // ---------- MOVING TO A MINE OR MINING THERE ----------

    // old way to find mines
    //r.log(targetCastle)
    if (targetCastle != null){
        targetMine = targetCastle
    }
    else{    
        targetMine = idToMine[castleTargetMineID].split(",").map((n) => parseInt(n))
    }

    if (targetMine === null)
       targetMine = closestSafeMine(r)  // picks the closest mine to the base

    // almost useless
    if (targetMine !== null && targetCastle === null && utils.getManhattanDistance(r.me.x, r.me.y, targetMine[0], targetMine[1]) <= 2) {
        r.castleTalk(comms.encodeCastleTalk(mineToID[targetMine[0].toString() + ',' + targetMine[1].toString()], comms.CASTLETALK_ON_MINE))  // when close to mine, let castle update activity
    }
    

    // check if on top of mine
    if (!(r.me.karbonite === SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY || r.me.fuel === SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) && (targetMine !== null && utils.getManhattanDistance(r.me.x, r.me.y, targetMine[0], targetMine[1]) === 0) && r.fuel >= SPECS.MINE_FUEL_COST) {
        let seeChurch = false;
        let seeEnemy = false
        for (const otherRobot of r.getVisibleRobots()) { 
            if (otherRobot.team === r.me.team && (otherRobot.unit === SPECS.CHURCH || otherRobot.unit === SPECS.CASTLE) && utils.getSquaredDistance(r.me.x, r.me.y, otherRobot.x, otherRobot.y) < 49){
                seeChurch = true
            }
            if (otherRobot.team !== r.me.team && otherRobot.unit !== SPECS.PILGRIM) {
                seeEnemy = true
            }
        }
        // don't see church near me so finding the right place to build churches to minimize movment
        if (seeChurch === false && seeEnemy === false){
            updateMines(r, [r.me.x, r.me.x])
            let churchDirections = findBuildDirections(r, r.me.x, r.me.y)          

            // find best location to build a church
            if (churchDirections.length > 0)
            {
                let cur_best = null  // best direction to build in
                let cur_min = 9999
                let temp_min = 0
                for (const possibleDirection of churchDirections)
                {
                    updateMines(r, [r.me.x + possibleDirection[0], r.me.y + possibleDirection[1]])  // update mine distances as being from the new location
                    const nearbyMines = findNearMines(r, 49)
                    temp_min = 0
                    for (const locations_mine of nearbyMines){
                        const tempLocation = locations_mine.split(",")
                        const temp_distance = utils.getSquaredDistance(r.me.x + possibleDirection[0], r.me.y + possibleDirection[1], parseInt(tempLocation[0]), parseInt(tempLocation[1]))
                        temp_min += temp_distance
                    }
                    if (temp_min <= cur_min){
                        cur_min = temp_min
                        cur_best = possibleDirection
                    }
                }
                if (cur_best !== null && r.karbonite >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE && r.fuel >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL + 2)
                {
                    r.log("Pilgrim: church is built !!!!!! nice job")
                    return r.buildUnit(SPECS.CHURCH, cur_best[0], cur_best[1])
                }
            }
        }
        return r.mine()
    }

    if (targetMine === null) {
        targetMine = baseLocation
    }

    // path to mine
    const test = r.am.nextMove(targetMine)    
    if (test === null)
    {
        // reached a place where you can't get to castle
        if (targetCastle !== null){
            r.log("can have offensive church here")
            //-------------------------------FOR ATTACKING CHURHC---------------------------
            if (r.karbonite >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE && r.fuel >= SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL + 2)
            {
                let buildingDirections = []                
                for (const dir of utils.directions) {
                    if (utils.isEmpty(r, r.me.x + dir[0], r.me.y + dir[1])) {  // this will also avoid building next to other buildings. maybe remove later
                        if (r.am.heatMap[r.me.y + dir[1]][r.me.x + dir[0]] != null) {
                            //if there is no heat
                            if (r.am.heatMap[r.me.y + dir[1]][r.me.x + dir[0]] == 0) {
                                buildingDirections.push(dir)
                            }
                        
                        }
                        //if there is no heat
                        else {
                            buildingDirections.push(dir)
                        }
                    }
                }
                r.log("offensive church directions")
                r.log(buildingDirections)  
                // find furthest place to put it
                let maxDis = 0
                let minDir = null
                for (let dir of buildingDirections){
                    if (utils.getManhattanDistance(r.me.x + dir[0], r.me.y + dir[1],targetCastle[0], targetCastle[1]) > maxDis) {
                        maxDis = utils.getManhattanDistance(r.me.x + dir[0], r.me.y + dir[1],targetCastle[0], targetCastle[1])
                        minDir = dir
                        r.log("max dis is " + maxDis)
                        r.log("church direction "+ dir)
                    }                        

                    if (minDir != null) {
                        if (builtChurch == false) {
                            r.log("Pilgrim: offensive church is built !!!!!! yeahhh")
                            builtChurch = true
                            r.log('Pilgirm: sent to offensive church'+ targetCastle)
                            r.log(comms.encodeAttack(targetCastle[0],targetCastle[1]))
                            r.signal(comms.encodeAttack(targetCastle[0],targetCastle[1]),2)
                            return r.buildUnit(SPECS.CHURCH, buildingDirections[0][0], buildingDirections[0][1])
                        }
                        else {
                            return
                        }
                    }
                }
            }
        }
        targetMine = baseLocation  // idk
        return
    }
    return r.move(test[0], test[1])
}

function iDMines(r) {  // deterministically label mines
    let counter = -1
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i] || r.fuel_map[j][i]){
                counter++
                idToMine[counter] = i.toString() + ',' + j.toString()
                mineToID[i.toString() + ',' + j.toString()] = counter
            }
        }
    }
}

// update mine locations based on distance from the pilgrim itself?
function updateMines(r, base) {
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            mineToDistance[[i, j].toString()] = utils.getSquaredDistance(i, j, base[0], base[1])
        }
    }
}

// update which mines are occupied
function checkMine(r) {
    for (const [curMine, id] of Object.entries(mineToID)) {
        let tempMine = curMine.split(",").map((n) => parseInt(n))
        if (utils.isOccupied(r, tempMine[0], tempMine[1])) {
            if (!occupiedLoc.has(tempMine.toString())){
                occupiedLoc.add(tempMine.toString());
            }      
        }
        if (utils.isEmpty(r, tempMine[0], tempMine[1], true)) {  // strict means this only removes mines in vision range
            if (occupiedLoc.has(tempMine.toString())) {
                // r.log('the mine at ' + curMine + ' is no longer occupied')
                occupiedLoc.delete(tempMine.toString());
            }
        }
    }
}

// check where the closest safe mine is 
function closestSafeMine(r) {
    checkMine(r)
    let target = null
    let minDistance = 2 * 64 * 64
    for (const [location, distance] of Object.entries(mineToDistance)) {
        if (distance < minDistance && !occupiedLoc.has(location)) {
            minDistance = distance
            target = location
        }
    }
    if (target === null) {
        return null
    }
    return target.split(",").map((n) => parseInt(n))
}

// mines within a distance threshold
function findNearMines(r, min_dis){
    let mineList = []
    for (const [location, distance] of Object.entries(mineToDistance)) {
        if (distance < min_dis) {
           mineList.push(location)
        }
    }
    return mineList
}

// returns a list of directions valid for building in
function findBuildDirections(r, x, y) {
    let buildingDirections = []
    for (const dir of utils.directions) {
        if (utils.isStandable(r, x + dir[0], y + dir[1])) {  // this will also avoid building next to other buildings. maybe remove later
            buildingDirections.push(dir)
        }
    }
    return buildingDirections
}

// decide which direction to go when kiting, or it can just not kite. Returns the move
function kite(r, enemyList){  // needs a list of close enemies
    let cur_dir = null  // direction to move in
    let minEnemiesInRange = 99999999  
    let maxTotalDistance = 0    
    for (const dir of utils.directions) {
        const tempLocation = [r.me.x + dir[0], r.me.y + dir[1]]  // candidate direction to move in
        if (utils.isEmpty(r,tempLocation[0],tempLocation[1])) {
            const [curEnemies, curDist] = findInRangeTotalDistance(tempLocation, enemyList)
            if (curEnemies < minEnemiesInRange) {  // try to move in direction of less enemy
                cur_dir = dir
                minEnemiesInRange = curEnemies
                maxTotalDistance = curDist        
            }
            else if (curEnemies === minEnemiesInRange) {  // try to move in direction of more distance from enemy
                if (curDist > maxTotalDistance) {
                    cur_dir = dir
                    minEnemiesInRange = curEnemies
                    maxTotalDistance = curDist
                }
            }
        }
    }     
    return cur_dir
}

// return array like this [total within attack range, total distance]
// find the total distance for comparing kiting options
function findInRangeTotalDistance(tempLocation, enemyList){
    let totalInRange = 0
    let totalDistance = 0
    for (const enemy of enemyList){
        const tempDistance = utils.getSquaredDistance(tempLocation[0], tempLocation[1], enemy.x, enemy.y) 
        if (enemy.unit === SPECS.PROPHET){
            if (tempDistance <= 64) {
                totalInRange++
            }
        }
        if (enemy.unit === SPECS.CRUSADER || enemy.unit === SPECS.PREACHER){
            if (tempDistance <= 16) {
                totalInRange++
            }
        }
        totalDistance += tempDistance
    }
    return [totalInRange, totalDistance]
}

// can be optimized later
function setHeatMap(r,enemyRobotSq) {
    const map_len = r.map[0].length
    for (const enemy of enemyRobotSq){
        if (enemy.unit != null){
            const enemyRadius = SPECS.UNITS[enemy.unit].ATTACK_RADIUS
            if (enemyRadius !== null && enemyRadius !== 0) {
                const radius = utils.squareRootRadius(enemyRadius[1])
                for (let j = -radius; j <= radius; j++) {
                    for (let i = -radius; i <= radius; i++) {                
                        if ((i*i + j*j) <= (enemyRadius[1])) {
                            if (!(enemy.x + i < 0 || enemy.x + i >= map_len || enemy.y + j < 0 || enemy.y + j >= map_len)) {
                                r.am.setEnemyHeat(enemy.x + i, enemy.y + j, 50)
                            }
                        }                                
                    }
                }                

            } 
        }   
    }
}