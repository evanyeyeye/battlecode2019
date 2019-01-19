import {SPECS} from 'battlecode'
import utils from './utils.js'


const MINE = 0
const SCOUT = 1
const BUILD = 2
const action_attack_mine="00"  //mine or attack depends on unit
const action_zone_scout="01" //zone or scout depends on the unit
const action_change_attack_mine="10" //change fro mcurrent action to attack
const action_change_zone_build="11" //change from current action zonescout
const action_building_church="999"

const KARBONITE = 0
const FUEL = 1

var fuelThreshold =  750 // if over this amount of fuel, free to build churches. Probably should be variable

var unsafeLoc = new Set();  // set to see place is unsafe
var occupiedLoc = new Set(); // set to occupied loc  both take in string verison of location both take in string verison of location
var priorityResource = -1;  // 0 is karbonite 1 is fuel both take in string verison of location
// TODO: DOES NOT ACCOUNT FOR OBSTACLES IN HOW EASY A MINE IS TO REACH
var karboniteMines = {}  // maps mine locations to distance from base castle location
var fuelMines = {}
var baseLocation = null  // castle or church to return resources to
var priorityResource=0;
var allMineID = {}  // maps mine ID to its STRING location
var mineToID = {}  // maps string location to id, convenience
var curAction =null; //curent action
var bestChurchLoc=null

var castleTargetMineID = null // the target mine that the castle gives


export function pilgrimTurn(r) {
    if (r.me.turn == 1) {
        r.log("I am a Pilgrim")
        iDMines(r)
        // find the closest castle, probably built from there
        for (let otherRobot of r.getVisibleRobots()) {  // may be bad for optimization?
            if (otherRobot.team == r.me.team && otherRobot.unit==SPECS.CASTLE && r.isRadioing(otherRobot)) {
                // recieve message
                let decodedMsg=decode(otherRobot.signal,16)
                castleTargetMineID = decodedMsg[0] //first id being encoded
                curAction=decodedMsg[1]
                if (castleTargetMineID >= 900) {
                    continue
                }
                r.log("Pilgrim received a target mine: " + castleTargetMineID)
                // r.castleTalk(castleTargetMineID + 100)  // acknowledge being sent to this mine, castle handles this now
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

    // look around
    for (let otherRobot of r.getVisibleRobots()) {
        const distance = utils.getManhattanDistance(r.me.x, r.me.y, otherRobot.x, otherRobot.y)
        if (otherRobot.team == r.me.team) {
            // set closest friendly castle or church as base
            if ( (otherRobot.unit==SPECS.CASTLE || otherRobot.unit == SPECS.CHURCH) && (baseLocation == null  || distance < (utils.getManhattanDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1])) )) {
                baseLocation = [otherRobot.x, otherRobot.y]
                updateMines(r)  // refresh mines based on distance to base castle location
            }
            friendlyRobots[otherRobot.id] = distance
        }
        else {
            enemyRobots[otherRobot.id] = distance
        }
    }

    // ---------- MOVING BACK TO BASE ----------

    // edit this so that if does make sense go for other resource
    // return to church/castle if full
    if (r.me.karbonite == SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY || r.me.fuel == SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) {
        // r.log("Carrying resources back to " + baseLocation)
        if(utils.getSquaredDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1]) <= 2) {
            // close enough to give the collected resources
            return r.give(baseLocation[0] - r.me.x, baseLocation[1] - r.me.y, r.me.karbonite, r.me.fuel)
        }

        // return to church/castle
        
         let pf = r.pm.getPathField(baseLocation)
         if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
             let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
             return utils.tryMoveRotate(r, test)
         }
        
        // broken a*
        
        let node = r.am.findPath(baseLocation, 4, false)
        if (node === null) {
            r.log("A*: no path found")
            return
        }
        if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
            const test = r.am.nextDirection(node)
            if (utils.isEmpty(r, r.me.x + test[0], r.me.y + test[1]))
                return r.move(test[0], test[1])
            // return utils.tryMoveRotate(r, test)
        }
        
    }

    // ---------- MOVING TO A MINE OR MINING THERE ----------

    // old way to find mines
    

    // look at mines
    // updateMines(r)  // since this only changes with base castle location, moved up to that part of the code
    let targetMine = allMineID[castleTargetMineID].split(",").map((n) => parseInt(n))
    if (targetMine === null)
	   targetMine = closestSafeMine(r)

    let curLocation = r.me.x.toString() + "," + r.me.y.toString()
    // r.log('curloc: ' + curLocation)
    // for (let i of occupiedLoc) { r.log(i); }

    if (targetMine != null && utils.getManhattanDistance(r.me.x, r.me.y, targetMine[0], targetMine[1]) <= 2) {
        r.castleTalk(mineToID[targetMine[0] + ',' + targetMine[1]])  // when close to mine, let castle update activity
    
        
    }


    // check if on top of mine
    if ( (occupiedLoc.has(curLocation) || (targetMine != null && utils.getManhattanDistance(r.me.x, r.me.y, targetMine[0], targetMine[1]) == 0)) && r.fuel >= SPECS.MINE_FUEL_COST) {
        // r.log("i'm actually trying to mine at " + targetMine[0] + ", " + targetMine[1])
        // r.castleTalk(mineToID[targetMine[0] + ',' + targetMine[1]])  // each turn, let castles know you're here mining
        
        let seechurch=false;
        for (let otherRobot of r.getVisibleRobots()) {  
            if (otherRobot.team == r.me.team&&(otherRobot.unit==SPECS.CHURCH||otherRobot.unit==SPECS.CASTLE)&&utils.getSquaredDistance(r.me.x,r.me.y,otherRobot.x,otherRobot.y)<49){
                curAction=action_attack_mine
                seechurch=true
            }            
            }
            //don't see church near me so finding the right place to build mines to minimize movment
              if (seechurch==false){
                let churchDirections=findBuildDirections(r,r.me.x,r.me.y)               
                let nearmines=findNearMine(r,6)
                //find best location
                if (churchDirections.length>0)
                {
                    //r.log(churchDirections)
                    //r.log(nearmines)
                    let cur_best=null
                    let cur_min=9999
                    let temp_min=0
                    for (let posibleDirection of churchDirections)
                    {
                        temp_min=0
                        for (let locations_mine of nearmines){
                            //r.log([r.me.x+posibleDirection[0],r.me.y+posibleDirection[1],locations_mine[0],locations_mine[1]])
                            let temp_distance = utils.getManhattanDistance(r.me.x+posibleDirection[0],r.me.y+posibleDirection[1],parseInt(locations_mine[0],10),parseInt(locations_mine[1],10))
                           // r.log(temp_distance)
                            temp_min+=temp_distance
                        }
                        //r.log(temp_min)
                        if (temp_min<cur_min){
                            cur_min=temp_min
                            cur_best=posibleDirection
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

    // no available mines?
	if (targetMine == null) {
		targetMine = baseLocation
	}

    // path to location
    
	// let pf = r.pm.getPathField(targetMine)
 //    if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
 //        // r.log("I want to move to " + targetMine)
 //        let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
 //        return utils.tryMoveRotate(r, test)
 //    }
    
    // broken a*
    
    let node = r.am.findPath(targetMine, 4, false)
    if (node === null){
        r.log("A*: no path to " + targetMine + " found")
        return
    }
    if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
        const test = r.am.nextDirection(node)
        if (utils.isEmpty(r, r.me.x + test[0], r.me.y + test[1]))
            return r.move(test[0], test[1])
        // return utils.tryMoveRotate(r, test)
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
                allMineID[counter] = i.toString() +',' + j.toString()
                mineToID[i.toString() + ',' + j.toString()] = counter
            }
        }
    }
}
//used to decode mine the 
//returns a list with mine1,mine2,action in order
function decode(message,signallen){
    let binary=message.toString(2);       
    let binarylen= binary.length
    for (let i=0; i<signallen- binarylen;i++){
        binary="0"+binary
    }     
    let totalMines=Object.keys(allMineID).length // decide how many bits to give to mines
    let bitsToGive=Math.ceil(Math.log2(totalMines)) // how many bits to give
    let firstMine=binary.substring(0,bitsToGive)    
    let action=binary.substring(bitsToGive,bitsToGive+2)  
    let mineID = parseInt(firstMine, 2);
    let mineID2=parseInt(binary.substring(bitsToGive+2,bitsToGive+2+bitsToGive),2);   
    return [mineID,mineID2,action]
}

// update mine locations based on distance from 
function updateMines(r) {
    for (let j = 0; j<r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i]) {
                karboniteMines[[i, j]] = utils.getManhattanDistance(i, j, baseLocation[0], baseLocation[1])  // confirm this ordering, idk
            }
            if (r.fuel_map[j][i]) {
                fuelMines[[i, j]] = utils.getManhattanDistance(i, j, baseLocation[0], baseLocation[1])
            }
        }
    }
}

// check all mines that are dangerous according to units in vision
// later check if you can safely mine
function checkMine(r) {
    let merged = Object.assign({},karboniteMines, fuelMines);
    let visible = r.getVisibleRobots()
    for (let curMine in merged) {
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
            for (let robot in visible){
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
    let mineList=[]
    let merged = Object.assign({},karboniteMines, fuelMines);
    for (const [location, distance] of Object.entries(merged)) {
        if (distance < min_dis) {
           mineList.push(location)
            
        }
    }
    return mineList


}
function findBuildDirections(r, x, y) {
    let buildingDirections=[]
    for (const dir of utils.directions) {
        if (utils.isEmpty(r, x + dir[0], y + dir[1])) {
            buildingDirections.push(dir)
        }
    }
    return buildingDirections
}

