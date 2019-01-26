import {SPECS} from 'battlecode'
import utils from './utils.js'
import comms from './comms.js'

const MINE = 0
const SCOUT = 1
const BUILD = 2

const KARBONITE = 0
const FUEL = 1

var fuelThreshold =  750 // if over this amount of fuel, free to build churches. Probably should be variable

var unsafeLoc = new Set();  // set to see place is unsafe
var occupiedLoc = new Set(); // set to occupied loc  both take in string verison of location both take in string verison of location
var priorityResource = 0;  // 0 is karbonite 1 is fuel both take in string verison of location
// TODO: DOES NOT ACCOUNT FOR OBSTACLES IN HOW EASY A MINE IS TO REACH
var karboniteMines = {}  // maps mine locations to distance from base castle location
var fuelMines = {}
var baseLocation = null  // castle or church to return resources to
var priorityResource = 0;
var allMineID = {}  // maps mine ID to its STRING location
var mineToID = {}  // maps string location to id, convenience
var curAction = null; //curent action
var bestChurchLoc = null

var castleTargetMineID = null // the target mine that the castle gives


export function pilgrimTurn(r) {
    if (r.me.turn == 1) {
        r.log("I am a Pilgrim")
        iDMines(r)
        // find the closest castle, probably built from there
        for (const otherRobot of r.getVisibleRobots()) {  // may be bad for optimization?
            if (otherRobot.team == r.me.team && otherRobot.unit == SPECS.CASTLE || otherRobot.unit == SPECS.CHURCH && r.isRadioing(otherRobot)) {
                // recieve message
                const decodedMsg = comms.decodeSignal(otherRobot.signal, Object.keys(allMineID).length, 16)
                r.log(decodedMsg)
                castleTargetMineID = decodedMsg[0] //first id being encoded
                curAction = decodedMsg[1]
                if (castleTargetMineID >= 900) {
                    continue
                }
                r.log("Pilgrim received a target mine: " + castleTargetMineID)
                let toCastleTalk = comms.encodeCastleTalk(castleTargetMineID,comms.CASTLETALK_GOING_MINE)
                r.log(toCastleTalk)
                r.castleTalk(toCastleTalk)  // acknowledge being sent to this mine, castle handles this now
                r.log("Pilgrim received building a target mine near: "+castleTargetMineID)
            }
        }
    }

    


    let state = MINE  // idk if this is going to be useful
    if (priorityResource == -1)
        priorityResource = Math.floor(Math.random() * 2)

    // no reason to float karbonite?
  

    // ok now find the best move
    let friendlyRobots = {}
    let enemyRobots = {}
    let senseDanger = false
    let enemyRobotList = []

    // look around
    for (const otherRobot of r.getVisibleRobots()) {
        const sqdis = utils.getSquaredDistance(r.me.x, r.me.y, otherRobot.x, otherRobot.y)
        const distance = utils.getManhattanDistance(r.me.x, r.me.y, otherRobot.x, otherRobot.y)
        if (otherRobot.team == r.me.team) {
            // set closest friendly castle or church as base
            if ( (otherRobot.unit == SPECS.CASTLE || otherRobot.unit == SPECS.CHURCH) && (baseLocation == null  || distance < (utils.getManhattanDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1])) )) {
                baseLocation = [otherRobot.x, otherRobot.y]
                updateMines(r)  // refresh mines based on distance to base castle location
            }
            friendlyRobots[otherRobot.id] = distance
        }
        else {
            if (otherRobot.unit == SPECS.PROPHET || otherRobot.unit == SPECS.CASTLE){
                if (sqdis <= 64){
                    senseDanger = true
                }
            }
            if (otherRobot.unit == SPECS.CRUSADER || otherRobot.unit == SPECS.PREACHER){
                if (sqdis <= 49){
                    senseDanger = true
                }
            }
            enemyRobots[otherRobot.id] = distance
            enemyRobotList.push(otherRobot)
        }
    }
    //change rheat map can be optimized
    setHeatMap(r,enemyRobotList)
    

    // ---------- MOVING BACK TO BASE ----------

    // edit this so that if does make sense go for other resource
    // return to church/castle if full
    if (r.me.karbonite == SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY || r.me.fuel == SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) {
        // r.log("Carrying resources back to " + baseLocation)
        if(utils.getSquaredDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1]) <= 2) {
            // close enough to give the collected resources
            return r.give(baseLocation[0] - r.me.x, baseLocation[1] - r.me.y, r.me.karbonite, r.me.fuel)
        }
        //fix edge case of trying to go base with robot in middle
        if(utils.getManhattanDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1]) == 2) {
            let directions = utils.directions
            let robotMap = r.getVisibleRobotMap()
            for (let tempDirection of directions){
                let tempLocation = [r.me.x+tempDirection[0],r.me.y+tempDirection[1]]
                // close enough to give the collected resources and it's on a different resource mine
                if (utils.isOccupied(r,tempLocation[0],tempLocation[1]) ){
                    // try to give to opposite mine so dont lose things in void
                    if (!(r.fuel_map[tempLocation[1]][tempLocation[0]] && r.me.fuel > 80))
                    {                    
                        return r.give(tempDirection[0], tempDirection[1], r.me.karbonite, r.me.fuel)
                    }
                    if (!(r.karbonite_map[tempLocation[1]][tempLocation[0]] && r.me.karbonite > 18)){
                        return r.give(tempDirection[0], tempDirection[1], r.me.karbonite, r.me.fuel)
                    }
                    
                }

            }
            
        }


        // return to church/castle
        
         // let pf = r.pm.getPathField(baseLocation)
         // if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE && pf.isPointSet(r.me.x, r.me.y)) {
         //     let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
         //     return utils.tryMoveRotate(r, test)
         // }
        
        // broken a*
        
        let node = r.am.findPath(baseLocation)
        if (node === null) {
            r.log("A*: no path found")
            return
        }
        if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
            const test = r.am.nextDirection(node)
            if (utils.isEmpty(r, r.me.x + test[0], r.me.y + test[1]))
                return r.move(test[0], test[1])
            const temp = utils.tryMoveRotate(r, test)
            if (temp)
                return temp
        }
        
    }

    //// ---------- KITE IF SENSE DANGER ----------
   

    let kiteAction = null
    if (senseDanger){
        r.log("calculating kite")
        kiteAction = kite(r)
        if (kiteAction != null){
            r.log("pilgrim sense danger, moving back")
            r.log(kiteAction)
            return r.move(kiteAction[0],kiteAction[1])
            //return kiteAction
        }
    }
    


    // ---------- MOVING TO A MINE OR MINING THERE ----------

    // old way to find mines
    

    // look at mines
    // updateMines(r)  // since this only changes with base castle location, moved up to that part of the code
    // r.log(allMineID)
    // r.log(castleTargetMineID)
    let targetMine = allMineID[castleTargetMineID].split(",").map((n) => parseInt(n))

    if (targetMine === null)
	   targetMine = closestSafeMine(r)

    const curLocation = r.me.x.toString() + "," + r.me.y.toString()
    // r.log('curloc: ' + curLocation)
    // for (let i of occupiedLoc) { r.log(i); }

    if (targetMine != null && utils.getManhattanDistance(r.me.x, r.me.y, targetMine[0], targetMine[1]) <= 2) {
        r.log(mineToID[targetMine[0].toString() + ',' + targetMine[1].toString()])
        r.castleTalk(comms.encodeCastleTalk(mineToID[targetMine[0].toString() + ',' + targetMine[1].toString()],comms.CASTLETALK_ON_MINE))  // when close to mine, let castle update activity
    }


    // check if on top of mine
    if ( (occupiedLoc.has(curLocation) || (targetMine != null && utils.getManhattanDistance(r.me.x, r.me.y, targetMine[0], targetMine[1]) == 0)) && r.fuel >= SPECS.MINE_FUEL_COST) {
        // r.log("i'm actually trying to mine at " + targetMine[0] + ", " + targetMine[1])
        // r.castleTalk(mineToID[targetMine[0] + ',' + targetMine[1]])  // each turn, let castles know you're here mining
        
        let seeChurch=false;
        let seeEnemy= false
        for (const otherRobot of r.getVisibleRobots()) { 

            if (otherRobot.team == r.me.team && (otherRobot.unit == SPECS.CHURCH || otherRobot.unit == SPECS.CASTLE) && utils.getSquaredDistance(r.me.x,r.me.y,otherRobot.x,otherRobot.y) < 49){
                curAction = comms.ATTACK_MINE
                seeChurch = true
            }
            if (otherRobot.team != r.me.team && otherRobot.unit != SPECS.PILGRIM){
                seeEnemy = true
            }
        }
        //don't see church near me so finding the right place to build mines to minimize movment
        if (seeChurch == false && seeEnemy == false){
            updateMines(r)
            let churchDirections = findBuildDirections(r,r.me.x,r.me.y)               
            let nearmines = findNearMine(r,10)
            //find best location
            if (churchDirections.length > 0)
            {
                //r.log(churchDirections)
                //r.log(nearmines)
                let cur_best = null
                let cur_min = 9999
                let temp_min = 0
                for (const possibleDirection of churchDirections)
                {
                    temp_min = 0
                    for (let locations_mine of nearmines){
                        const tempLocation = locations_mine.split(",")
                       // r.log([r.me.x + possibleDirection[0], r.me.y + possibleDirection[1], tempLocation[0], tempLocation[1]])
                        let temp_distance = utils.getManhattanDistance(r.me.x + possibleDirection[0],r.me.y + possibleDirection[1], parseInt(tempLocation[0], 10), parseInt(tempLocation[1], 10))
                        // r.log(temp_distance)
                        if (temp_distance == 0)
                        {
                            temp_min += 1000
                        }
                        temp_min += temp_distance
                    }
                    //r.log(temp_min)
                    if (temp_min <= cur_min){
                        cur_min = temp_min
                        cur_best = possibleDirection
                    }
                }
                r.log(cur_best)
                if (r.karbonite > SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_KARBONITE && r.fuel > SPECS.UNITS[SPECS.CHURCH].CONSTRUCTION_FUEL + 2)
                {
                    r.log("church is built !!!!!! nice job")
                    return r.buildUnit(SPECS.CHURCH, cur_best[0], cur_best[1])
                }
            }
        }
        return r.mine()
    }
  
	if (targetMine == null) {
		targetMine = baseLocation
	}

    // path to location
    /*
	 let pf = r.pm.getPathField(targetMine)
     if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE && pf.isPointSet(r.me.x, r.me.y)) {
         // r.log("I want to move to " + targetMine)
         let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
         return utils.tryMoveRotate(r, test)
     }
    */
    // broken a*
    
    let node = r.am.findPath(targetMine, 4, false)
    if (node === null){
        r.log("A*: no path to " + targetMine + " found")
        return
    }
    if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
        const test = r.am.nextDirection(node)
        r.log("astar move is " + test)
        if (utils.isEmpty(r, r.me.x + test[0], r.me.y + test[1]))
            return r.move(test[0], test[1])

        const temp = utils.tryMoveRotate(r, test)
        r.log("rotate move is " + temp)
        if (temp)
            return temp
    }
    
    return
}

function iDMines(r) {  // deterministically label mines
    let counter = 0
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i] || r.fuel_map[j][i]){
                // r.log("Pilgrim: Mine at " + [i, j] + " is " + counter)
                counter++
                allMineID[counter] = i.toString() + ',' + j.toString()
                mineToID[i.toString() + ',' + j.toString()] = counter
            }
        }
    }
}

// update mine locations based on distance from 
function updateMines(r) {
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i]) {
                karboniteMines[[i, j]] = utils.getManhattanDistance(i, j,r.me.x,r.me.y)  // confirm this ordering, idk
            }
            if (r.fuel_map[j][i]) {
                fuelMines[[i, j]] = utils.getManhattanDistance(i, j, r.me.x, r.me.y)
            }
        }
    }
}

// check all mines that are dangerous according to units in vision
// later check if you can safely mine
function checkMine(r) {
    const merged = Object.assign({},karboniteMines, fuelMines);
    const visible = r.getVisibleRobots()
    for (const curMine in merged) {
        let tempMine = curMine.split(",").map((n) => parseInt(n))
        if (utils.isOccupied(r, tempMine[0], tempMine[1])) {
            if (!occupiedLoc.has(tempMine.toString())){
                occupiedLoc.add(tempMine.toString());
            }      
        }
      
        if (utils.isEmpty(r, tempMine[0], tempMine[1])) {
            if (occupiedLoc.has(tempMine.toString())) {
                // r.log('the mine at ' + curMine + ' is no longer occupied')
                occupiedLoc.delete(tempMine.toString());
            }
        }
        // || unsafeLoc.has(curMine) not sure if you check unsafe loc or not
        // only do it if something can possibly be attacked by things in vision
        if (utils.getSquaredDistance(r.me.x,r.me.y,tempMine[0], tempMine[1]) ** 0.5 < 18){
            for (const robot in visible){
                if (robot.team != r.me.team && utils.isEnemyInRange(r, robot, tempMine)){
                    unsafeLoc.add(tempMine.toString());
                    break;
                }
            }
        }
    }
}



// check where the closest safe mine is 
function closestSafeMine(r) {
	checkMine(r)  // update the status of mines
    let mines = karboniteMines

    if (priorityResource === FUEL)
        mines = fuelMines

    let target = null
    let minDistance = 2 * 64 * 64
 
    for (const [location, distance] of Object.entries(mines)) {
        if (distance < minDistance) {
            if (!occupiedLoc.has(location)) {
                minDistance = distance
                target = location
            }
            else {
                // r.log('mine at ' + location + ' is occupied')
            }
        }
    }
    if (target == null) {
        return null
    }

    return target.split(",").map((n) => parseInt(n))
}
function findNearMine(r,min_dis){
    let mineList = []
    const merged = Object.assign({},karboniteMines, fuelMines);
    for (const [location, distance] of Object.entries(merged)) {
        if (distance < min_dis) {
           mineList.push(location)
            
        }
    }
    return mineList


}
function findBuildDirections(r, x, y) {
    let buildingDirections = []
    for (const dir of utils.directions) {
        if (utils.isEmpty(r, x + dir[0], y + dir[1])) {
            buildingDirections.push(dir)
        }
    }
    return buildingDirections
}
// decide which direction to go when kiting, or it can just not kite. Returns the move
function kite(r){
    const visibleRobotMap = r.getVisibleRobots();
    let enemyCount = 0;
    let friendlyCount = 0;
    let enemyVector = [0, 0];  // total dx, dy
    let enemyList = []
    for (const bot of visibleRobotMap){
        // r.log(bot)
        if (bot.team !== r.me.team) {
            if (utils.getSquaredDistance(bot.x,bot.y,r.me.x,r.me.y) <= 64)
            {
                if (bot.unit != SPECS.UNITS[SPECS.CHURCH] && bot.unit != SPECS.UNITS[SPECS.PILGRIM])
                {
                    enemyList.push(bot)
                }
              
            }
           
          
        }
    }
    let cur_dir = null
    let bestTotalInRange = 99999999
    let bestTotalDistance = 0
    

    for (const dir of utils.directions) {
        r.log(cur_dir)
        let tempLocation = [r.me.x + dir[0],r.me.y + dir[1]]
        if (utils.isEmpty(r,tempLocation[0],tempLocation[1])) {
            let curResult = findInRangeTotalDistance(tempLocation,enemyList)
            //curresult [0] is the total in range curresult [1] is total distanceto enemy            
            if (curResult[0] < bestTotalInRange){
                cur_dir = dir
                bestTotalInRange = curResult[0]
                bestTotalDistance = curResult[1]               

            }
            if (curResult[0] == bestTotalInRange){
                if (curResult[1] > bestTotalDistance){
                    cur_dir = dir
                    bestTotalInRange = curResult[0]
                    bestTotalDistance = curResult[1]
                }
            }

        }
    }     
    r.log(cur_dir)
    return cur_dir
}
//return array like this [total within attack range, total distance]
//find the total distance for comparing kiting options
function findInRangeTotalDistance(tempLocation,enemyList){
    let totalInRange = 0
    let totalDistance = 0
    for (let enemy of enemyList){
        let tempDistance = utils.getSquaredDistance(tempLocation[0],tempLocation[1],enemy.x,enemy.y) 
        if (enemy.unit == SPECS.PROPHET){
            if (tempDistance <= 64){
                totalInRange++
            }
        }
        if (enemy.unit == SPECS.CRUSADER || enemy.unit == SPECS.PREACHER){
            if (tempDistance <= 49){
                totalInRange++
            }
        }
        totalDistance += tempDistance**0.25
    }
    return [totalInRange,totalDistance]
}
//can be optimized later
function setHeatMap(r,enemyRobotSq){
    for (let enemy of enemyRobotSq){
        let heatRadius = (SPECS.UNITS[enemy.unit].ATTACK_RADIUS[1]**0.5 + 1)**2
        for (let j = 0; j < SPECS.UNITS[enemy.unit].ATTACK_RADIUS[1]**0.5; j++) {
            for (let i = 0; i < SPECS.UNITS[enemy.unit].ATTACK_RADIUS[1]**0.5; i++) {                
                if ((i*i+j*j) < (heatRadius)){
                    r.am.setEnemyHeat(i,j,5)
                }                                
                 
            }
        }        
    }
}
