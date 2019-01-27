import {SPECS} from 'battlecode'
import utils from './utils.js'
import comms from './comms.js'


const KARBONITE =  0
const FUEL = 1

var karboniteMines = {}  // maps mine locations to distance from base castle location
var fuelMines = {}
var mineID = {}  // maps location of mine to its ID
var fuelMines = {}
var curMine = null
var checkedMine = {}
var idToMine = {}
var baseLocation = null
var targetMine = null
var friendlyRobots = {}
var enemyRobots = {}
var prevmove = null
var state = null  // the current plan ocne receive all in from castle go all in
var targetCastle=[]

var settled = false  // temp way to check if i should move or not
var latticeLocation = null

export function prophetTurn(r) {

    if (r.me.turn == 1) {
        r.log("Prophet: I am a Prophet")
        iDMines(r)

        // find the closest castle, probably built from there
        for (const robot of r.getVisibleRobots()) {
            if (robot.team === r.me.team && robot.unit === SPECS.CASTLE && r.isRadioing(robot)) {
                // recieve message
                const message = robot.signal
                const decoded = comms.decodeSignal(message, 64, 16)
                r.log("TESTING")
                r.log(decoded[2])
                r.log(latticeLocation)
                r.log(!latticeLocation)
                if (decoded[2] === comms.STAND && !latticeLocation) {
                    latticeLocation = [decoded[0], decoded[1]]
                    r.log(latticeLocation)
                }
                else if (decoded[2] === comms.ATTACK)
                    targetCastle.push([decoded[0], decoded[1]])
            }
        }
    }

    //this part of the code looks for target castle and remove things
    else {
        for (const robot of r.getVisibleRobots()) {
            const message = robot.signal  // get any messages
            if (robot.team === r.me.team && robot.unit === SPECS.CASTLE && r.isRadioing(robot)) {  // castle sending message
                // recieve message               
                const decoded = comms.decodeSignal(message,64,16)
                if (decoded[2] === comms.ALL_IN)
                {
                    /* disable all in
                    r.log(message)
                    r.log("Prophet: I hear " + targetCastle)
                    targetCastle.push([decoded[0], decoded[1]])
                    */
                }
            }
            else if (robot.team === r.me.team && robot.unit === SPECS.PROPHET && r.isRadioing(robot)){
                const decoded = comms.decodeSignal(message,64,16)
                if (decoded[2] === comms.KILLED)
                {
                    let killed = null
                    for (let i = 0; i < targetCastle.length; i++)
                    {
                        if (targetCastle[i][0] === decoded[0] && targetCastle[i][1] === decoded[1])
                        {
                            killed = i
                        }
                    }
                    targetCastle.splice(killed, 1);
                }
            }
        }

    }

    // ok now find the best move
    friendlyRobots = {}
    enemyRobots = {}

    // look around
    for (let robot of r.getVisibleRobots()) {   	

        let distance = utils.getManhattanDistance(r.me.x, r.me.y, robot.x, robot.y)
        if (robot.team === r.me.team) {
            // set closest friendly castle or church as base 
            if (robot.unit === SPECS.CASTLE || robot.unit === SPECS.CHURCH) {
                baseLocation = [robot.x, robot.y]
            }	
            friendlyRobots[robot.id] = distance
        }
        else {
            enemyRobots[robot.id] = distance
        }
    }

    // edit this so that if does make sense go for other resource
    // return to church/castle if full
    if (baseLocation !== null && (r.me.karbonite === SPECS.UNITS[SPECS.PROPHET].KARBONITE_CAPACITY || r.me.fuel === SPECS.UNITS[SPECS.PROPHET].FUEL_CAPACITY)) {
        // r.log("Prophet: Carrying resources back to " + baseLocation)
        if (utils.getSquaredDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1]) <= 2) {
            // close enough to give the collected resources
            return r.give(baseLocation[0] - r.me.x, baseLocation[1] - r.me.y, r.me.karbonite, r.me.fuel)
        }

        const test = r.am.nextMove(baseLocation)
        if (test === null)
            return
        else
            return r.move(test[0], test[1])
    }


    /*
    **************************************
    this portion is for attacking strategy
	**************************************
    */

    // kiting away from enemies
    const kiteMove = kite(r)
    if (kiteMove !== null) {  // will be null if there is no need
        r.log("Prophet: kite did something! " + kiteMove)
        return r.move(kiteMove)
    }

    if (Object.keys(enemyRobots).length > 0)
    {
        let attackTarget = findAttack(r);
        if (attackTarget != null)
        {
            r.log("Prophet: found to attack! Enemy is " + attackTarget.unit + " at " + attackTarget.x + "," + attackTarget.y)
            return r.attack(attackTarget.x - r.me.x, attackTarget.y - r.me.y)
        }
    }

    if (latticeLocation) {
        const moveDirection = r.am.nextMove(latticeLocation)
        if (moveDirection)
            return r.move(moveDirection[0], moveDirection[1])
        return null
    }
    // found target location to go all in

    if (targetCastle.length > 0) {
        r.log("Prophet: I see castle as target at " + targetCastle[0])
        const visibleRobotMap = r.getVisibleRobotMap()  
        if (visibleRobotMap[targetCastle[0][1]][targetCastle[0][0]] === 0){  // that castle is dead lol
            r.log("Prophet castle is destroyed!!!!!")
            targetCastle.shift()  // remove it from the list
            if (targetCastle.length > 0 && r.fuel > Math.ceil(visibleRobotMap[0].length*1.415))
                r.signal(comms.encodeCastleKill(targetCastle[0][0],targetCastle[0][1], 16),(visibleRobotMap[0].length - 1)*(visibleRobotMap[0].length - 1)*2)
        } 
        if (targetCastle.length > 0) {  // lol idk, error checking
            const test = r.am.nextMove(targetCastle[0])
            if (test === null)
                return
            else
                return r.move(test[0], test[1])
        }
        
    }

    /* geng geng geng geng geng geng geng geng geng geng geng geng
    */
    if (!settled) {
        if (utils.isStandable(r, r.me.x, r.me.y)) {  // a futile attempt to save fuel
            r.log("Prophet: settling at " + r.me.x + "," + r.me.y)
            settled = true
        }
        else {
            const move = gang(r)
            if (move !== null)
            {
                return r.move(move[0], move[1]) 
            }
            return
        }
    }

    // wandering around
    if(targetMine === null)  // move to random mine. also error checking
    {
        targetMine = idToMine[Math.floor(Math.random() * Object.keys(idToMine).length)]; // fix this later this is going to random
        // targetMine = idToMine[0];
        r.log("Prophet, picking mine at " + targetMine)
    }
    if ((Math.abs(targetMine[0] - r.me.x) + Math.abs(targetMine[1] - r.me.y)) < 15){
        targetMine = idToMine[Math.floor(Math.random() * Object.keys(idToMine).length)]; // fix this later this is going to random
        // targetMine = idToMine[0];
    }
    let curLocation = r.me.x.toString() + "," + r.me.y.toString()

    // path to location
    const test = r.am.nextMove(targetMine)
        if (test === null)
            return
        else
            return r.move(test[0], test[1])

    return
}

// decide which direction to go when kiting, or it can just not kite. Returns the move
function kite(r){
	const visibleRobotMap = r.getVisibleRobots();
    let enemyCount = 0;
    let friendlyCount = 0;
    let enemyVector = [0, 0];  // total dx, dy
    for (const bot of visibleRobotMap){
        // r.log(bot)
        if (bot.team !== r.me.team) {
            if (bot.unit === SPECS.UNITS[SPECS.PROPHET])
            {
                enemyVector[0] += (bot.x - r.me.x)
                enemyVector[1] += (bot.y - r.me.y)
                enemyCount++;
            }
            if (bot.unit === SPECS.UNITS[SPECS.PREACHER]) // enemy preacher counts as double
            {
                enemyVector[0] += (bot.x - r.me.x)
                enemyVector[1] += (bot.y - r.me.y)
                enemyCount += 2;
            }
             if (bot.unit === SPECS.UNITS[SPECS.CRUSADER])
            {
                enemyVector[0] += (bot.x - r.me.x)
                enemyVector[1] += (bot.y - r.me.y)
                enemyCount += 1;
            }
           
          
        }
        else {
            if (bot.unit === SPECS.UNITS[SPECS.PROPHET])
            {
                friendlyCount++;
            }
            if (bot.unit === SPECS.UNITS[SPECS.PREACHER])  // friendly preacher counts as double? changed to 1 lol
            {
                friendlyCount += 1;
            }
             if (bot.unit === SPECS.UNITS[SPECS.CRUSADER])
            {
                friendlyCount += 1;
            }
           
        }
        if (friendlyCount > enemyCount){  // so many friends, doesn't matter
            return null;
        }
        else {
            let toGoX = 0
            let toGoY = 0
            if (enemyVector[0] !== 0)
                toGoX = -1*enemyVector[0]/Math.abs(enemyVector[0])  // unit vector in the opposite direction of the average enemy dx,dy
            if (enemyVector[1] !== 0)
                toGoY = -1*enemyVector[1]/Math.abs(enemyVector[1])
            // not optimized to move randomly
            if (utils.isEmpty(r, r.me.x + toGoX, r.me.y + toGoY))
            {
                return [toGoX, toGoY]
            }
            if (Math.abs(enemyVector[0]) > Math.abs(enemyVector[1]))  // more enemies in x direction, guess ill see if i can move there
            {
                if (utils.isEmpty(r, r.me.x + toGoX, r.me.y))
                {
                    [toGoX, 0]
                }
            }
            else{
                if (utils.isEmpty(r, r.me.x, r.me.y + toGoY))
                {
                   return  [0, toGoY]
                }
            }
        }
    }
    return null
}

// move away if one side 3 blocks around are not empty
function gang(r) {
    // all in x y coordinate order
    let north = [[-1,-1], [0,-1], [1,-1]]
    let south = [[-1,1], [0,1], [1,1]]
    let west = [[-1,-1], [-1,0], [-1,1]]
    let east = [[1,-1], [1,0], [1,1]]
    let sides = [north, south, east, west]
    let blocked = []
    let twothird = 0
    for (const side of sides){
        let totalCount = 0
        let nonEmptyCount = 0        
        for (const direction of side){
            const coordx = r.me.x + direction[0]
            const coordy = r.me.y + direction[1]
            // when not empty
            if (utils.isPassable(r, coordx, coordy)) {  // count number of valid squares
                totalCount++
                if (!utils.isStandable(r, coordx, coordy))  // count number of squares you shouldn't move to
                    nonEmptyCount++
            }
        }
        // check if the whole side is blocked
        if (totalCount === nonEmptyCount) {  // all valid squares are blocked on this side
            blocked.push(side)
        }
        else if (nonEmptyCount*2 > totalCount){  // over half of valid squares are blocked on this side
            twothird++
        }
    }
    if (blocked.length >= 2 || ((blocked.length === 1 && twothird >= 2))) {  // try to move if a lot of sides are blocked     
        for (const dir of shuffledDirections().concat([[2, 0], [-2, 0], [0, 2], [0, -2]])) {
            if (utils.isStandable(r, r.me.x + dir[0], r.me.y + dir[1])) {
                prevmove = dir
                return dir
            }
        }
    }
    return null
}

// figure out which target to attack
// would be nice to expand this to coordinate attacks with friendly units
// returns a robot
function findAttack(r){
    const visible = r.getVisibleRobots()
   
    let attackable = visible.filter((function(enemy){  // filter the visible robots by what is attackable and is an enemy
        if (! r.isVisible(enemy)){
            return false
        }
        const dist = utils.getSquaredDistance(r.me.x, r.me.y, enemy.x, enemy.y)
        if (enemy.team !== r.me.team
            && SPECS.UNITS[SPECS.PROPHET].ATTACK_RADIUS[0] <= dist
            && dist <= SPECS.UNITS[SPECS.PROPHET].ATTACK_RADIUS[1] ){
            return true
        }
        return false
    }))
    const myX = r.me.x;  // for use with lambda function
    const myY = r.me.y;
    if (Object.keys(attackable).length == 0){  // nothing to attack!
        return null
    }

    let attackTarget = attackable.reduce(function(a, b) {  // reduce the array to 1 item, which would be b. compare b with each item, a
        if (SPECS.UNITS[a.unit].CONSTRUCTION_KARBONITE > SPECS.UNITS[b.unit].CONSTRUCTION_KARBONITE)  // attack the more valuable unit
        {
            return a
        }
        if (SPECS.UNITS[a.unit].CONSTRUCTION_KARBONITE === SPECS.UNITS[b.unit].CONSTRUCTION_KARBONITE)
        {
            if (utils.getManhattanDistance(a.x, a.y, r.me.x, r.me.y) < utils.getManhattanDistance(b.x, b.y, r.me.x, r.me.y))  // attack the closer unit
            {
                return a;
            }
            else {
                return b;
            }
        }
        return b
    });

    return attackTarget


}

function iDMines(r) {  // deterministically label mines
    let counter = -1
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

// randomize utils.directions
function shuffledDirections() {
    let directions = utils.directions
    let index = null
    let x = null
    for (let i = 0; i < directions.length; i++) {
        index = Math.floor(Math.random() * (i + 1))
        //swapping
        x = directions[i]
        directions[i] = directions[index]
        directions[index] = x
    }
    return directions
}