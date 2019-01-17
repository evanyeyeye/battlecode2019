import {SPECS} from 'battlecode'
import utils from './utils.js'


const KARBONITE =  0
const FUEL = 1

var karboniteMines = {}  // maps mine locations to distance from base castle location
var fuelMines = {}
var mineID = {}  // maps location of mine to its ID
var fuelMines = {}
var curMine=null
var checkedMine={}
var idToMine={};
var baseLocation=null;
var targetMine = null
var friendlyRobots = {}
var enemyRobots = {}
var robotXForLambda=null;
var robotYForLambda=null;


export function prophetTurn(r) {
    if (r.me.turn == 1) {

        r.log("I am a Prophet")
        iDMines(r)

        // find the closest castle, probably built from there
        for (let otherRobot of r.getVisibleRobots()) {  // may be bad for optimization?
            if (otherRobot.team == r.me.team && otherRobot.unit==SPECS.CASTLE && r.isRadioing(otherRobot)) {
                // recieve message
                let message = otherRobot.signal()
            }
        }
    }

    // ok now find the best move
    friendlyRobots = {}
    enemyRobots = {}

    // look around
    for (let otherRobot of r.getVisibleRobots()) {   	

        let distance = utils.getManhattanDistance(r.me.x, r.me.y, otherRobot.x, otherRobot.y)
        if (otherRobot.team == r.me.team) {
            // set closest friendly castle or church as base 
            //|| otherRobot.unit == SPECS.CHURCH
            if ((otherRobot.unit==SPECS.CASTLE)) {
                baseLocation = [otherRobot.x, otherRobot.y]
                //r.log("based location is "+baseLocation)
            }	
            friendlyRobots[otherRobot.id] = distance
            r.log('base location is '+baseLocation)
           // updateMines(r)  // refresh mines based on distance to base castle location
        }
        else {
            enemyRobots[otherRobot.id] = distance
        }
    }

    // edit this so that if does make sense go for other resource
    // return to church/castle if full
    if (r.me.karbonite == SPECS.UNITS[SPECS.PROPHET].KARBONITE_CAPACITY || r.me.fuel == SPECS.UNITS[SPECS.PROPHET].FUEL_CAPACITY) {
        // r.log("Carrying resources back to " + baseLocation)

        if(utils.getSquaredDistance(r.me.x, r.me.y, baseLocation[0], baseLocation[1]) <= 2) {
            // close enough to give the collected resources
            return r.give(baseLocation[0] - r.me.x, baseLocation[1] - r.me.y, r.me.karbonite, r.me.fuel)
        }

        // return to church/castle
        let pf = r.pm.getPathField(baseLocation)
        if (r.fuel > SPECS.UNITS[SPECS.PROPHET].FUEL_PER_MOVE) {

            let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
         
            return utils.tryMoveRotate(r, test)
       
        }
    }


    /*
    **************************************
    this portion is for attacking strategy
	**************************************

    */
    let kiteAction=null
    // let kiteAction=kite(r)
    
    if (kiteAction!=null){
    r.log("kites did something??????????????????????? "+ kiteAction)

    }


    if (Object.keys(enemyRobots).length>0)
    {
    let attackTarget=findAttack(r);
    if (attackTarget!=null)
    {
        r.log("found to attack!!!!!!!!!!!!!!!!!!!!!!!! "+ attackTarget)
        return r.attack(attackTarget.x - r.me.x, attackTarget.y - r.me.y)
    
}
}
    
    if(targetMine==null)
    {
	targetMine = idToMine[Math.floor(Math.random() * Object.keys(idToMine).length)]; //fix this later this is going to random
  // targetMine = idToMine[0];
    }
   if ((Math.abs(targetMine[0]-r.me.x)+Math.abs(targetMine[1]-r.me.y))<15){
    targetMine = idToMine[Math.floor(Math.random() * Object.keys(idToMine).length)]; //fix this later this is going to random
  // targetMine = idToMine[0];
   }
    let curLocation = r.me.x.toString() + "," + r.me.y.toString()
    // r.log('curloc: ' + curLocation)
    // for (let i of occupiedLoc) { r.log(i); }

   	
    // path to location
    r.log("path to target ")
    r.log(targetMine)
	let pf = r.pm.getPathField(targetMine)  // this keeps the reversal
    if (r.fuel > SPECS.UNITS[SPECS.PROPHET].FUEL_PER_MOVE) {
        // r.log("I want to move to " + targetMine)
        let test = pf.getDirectionAtPoint(r.me.x, r.me.y)  // uses pathfinding
        r.log([r.me.x,r.me.y])
        if (test!=null)
        {
        return utils.tryMoveRotate(r, test)
    }
    }

    return
}

//decide which direction to go when kiting, or it can just not kite
function kite(r){
	let visibleRobotMap = r.getVisibleRobots();
    let enemyCount=0;
    let friendCount=0;
    let enemyVector=[0,0]; //first dx second dy
    for (let bot of visibleRobotMap){
        // r.log(bot)
        if (bot.team != r.me.team) {
            if (bot.unit==SPECS.UNITS[SPECS.PROPHET])
            {
                enemyVector[0]+=(r.me.x-bot.x)
                enemyVector[1]+=(r.me.y-bot.y)
                enemyCount++;
            }
            if (bot.unit==SPECS.UNITS[SPECS.PREACHER])
            {
                enemyVector[0]+=(r.me.x-bot.x)
                enemyVector[1]+=(r.me.y-bot.y)
                enemyCount+=2;
            }
             if (bot.unit==SPECS.UNITS[SPECS.CRUSADER])
            {
                enemyVector[0]+=(r.me.x-bot.x)
                enemyVector[1]+=(r.me.y-bot.y)
                enemyCount+=1;
            }
           
          
        }
        else {
            if (bot.unit==SPECS.UNITS[SPECS.PROPHET])
            {
                friendCount++;
            }
            if (bot.unit==SPECS.UNITS[SPECS.PREACHER])
            {
                friendCount+=2;
            }
             if (bot.unit==SPECS.UNITS[SPECS.CRUSADER])
            {
                friendCount+=1;
            }
           
        }
        if (friendCount>=enemyCount+1){
            return null;
        }
        else{
            let toGoX=enemyVector[0]/Math.abs(enemyVector[0]);
            let toGoY=enemyVector[1]/Math.abs(enemyVector[1]);
           //not optimized to kite just some somewhere
            if (utils.isEmpty(r, r.me.x+toGoX, r.me.y+toGoY))
            {
                return r.move(toGoX, toGoY) 
            }
            if (utils.isEmpty(r, r.me.x+toGoX, r.me.y+toGoY))
            {
                return r.move(toGoX, toGoY) 
            }
            if (Math.abs(enemyVector[0])>Math.abs(enemyVector[1]))
            {
                if (utils.isEmpty(r, r.me.x+toGoX, r.me.y))
            {
                return r.move(toGoX, 0) 
            }
            }
            else{
                if (utils.isEmpty(r, r.me.x, r.me.y+toGoY))
            {
               return  r.move(0, toGoY) 
            }
            }
        }
    }
    return null
}

//figure out which target to attack
function findAttack(r){
    var visible = r.getVisibleRobots()
   
    let attackable=visible.filter((function(enemy){
                if (! r.isVisible(enemy)){
                    return false
                }
                var dist = (enemy.x-r.me.x)**2 + (enemy.y-r.me.y)**2
                if (enemy.team !== r.me.team
                    && SPECS.UNITS[SPECS.PROPHET].ATTACK_RADIUS[0] <= dist
                    && dist <= SPECS.UNITS[SPECS.PROPHET].ATTACK_RADIUS[1] ){
                return true
                }
                return false
            })
            )
    robotXForLambda=r.me.x;
    robotYForLambda=r.me.y;
    if (Object.keys(attackable).length==0){
        return null
    }
    let attackTarget=attackable.reduce(function(a,b){ 
    if (a.health==null){
        return b
    }
    if (a.health<b.health)
    {
    return a
    }
    if (a.health==b.health)
    {
        if (((a.karbonite*5+a.fuel)-(b.karbonite*5+b.fuel))>99)
        {
            return a
        }
        if (((a.karbonite*5+a.fuel)-(b.karbonite*5+b.fuel))<-99)
        {
            return b
        }
        if (SPECS.UNITS[a.unit].CONSTRUCTION_KARBONITE>SPECS.UNITS[b.unit].CONSTRUCTION_KARBONITE)
        {
            return a
        }
        if (SPECS.UNITS[a.unit].CONSTRUCTION_KARBONITE==SPECS.UNITS[b.unit].CONSTRUCTION_KARBONITE)
        {
            if (utils.getManhattanDistance(a.x,a.y,robotXForLambda,robotYForLambda)<utils.getManhattanDistance(robotXForLambda,robotYForLambda,b,x,b.y))
            {
                return a;
            }
            else{
                return b;
            }
        }
        else{
            return b
        }

    }
    return b
    });

    return attackTarget


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

function iDMines(r) {  // deterministically label mines
    let counter = 0
    for (let j = 0; j < r.karbonite_map.length; j++) {
        for (let i = 0; i < r.karbonite_map[0].length; i++) {
            if (r.karbonite_map[j][i] || r.fuel_map[j][i]){
                // r.log("Pilgrim: Mine at " + [i, j] + " is " + counter)
                mineID[[i, j]] = counter
                idToMine[counter]=[i,j];
          
                counter++
            }
        }
    }
}
