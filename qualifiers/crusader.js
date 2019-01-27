import {SPECS} from 'battlecode'
import utils from './utils.js'
import comms from './comms.js'

const LEFT_SIDE = 0
const RIGHT_SIDE = 1

var churchLocation = null
var target = null
var fast = false  // fast movement

var my_side = Math.floor(Math.random()*2)  // pick random side of line
var multiplier = 1  // monotonically increase position in line
var targetCastle =null

export function crusaderTurn(r) {
    if (r.me.turn === 1) {
        r.log("I am a Crusader")
        for (const otherRobot of r.getVisibleRobots()) {  // may be bad for optimization?
            if (otherRobot.team === r.me.team && r.isRadioing(otherRobot)) {
                // recieve message

                const decodedMsg = comms.decodeSignal(otherRobot.signal)
                r.log("crusader: attack attack recieved message: " + decodedMsg)                
                let castleTargetMineID = decodedMsg[0] // first id being encoded
                if (decodedMsg[2] == comms.ATTACK)
                {
                    targetCastle = [decodedMsg[0], decodedMsg[1]]
                    r.log(decodedMsg)
                    r.log("Pilgrim: I hear to attack castle" + targetCastle)                    
                   
                }
               
            }
        }
        
        
    }
    let enemyRobotsCount =0
    for (let otherRobot of r.getVisibleRobots()) {      

        let distance = utils.getManhattanDistance(r.me.x, r.me.y, otherRobot.x, otherRobot.y)
        if (otherRobot.team != r.me.team) {
            enemyRobotsCount ++
        }
            
        
    }

    if (enemyRobotsCount > 0)
    {
        let attackTarget = findAttack(r);
        if (attackTarget != null)
        {
            r.log("CRUSADER: found to attack! Enemy is " + attackTarget.unit + " at " + attackTarget.x + "," + attackTarget.y)
            return r.attack(attackTarget.x - r.me.x, attackTarget.y - r.me.y)
        }
    }
    const test = r.am.nextMove(targetCastle)
    if (test === null)
        return
    else
        return r.move(test[0], test[1])

    
    return
}



function findAttack(r){
    const visible = r.getVisibleRobots()
   
    let attackable = visible.filter((function(enemy){  // filter the visible robots by what is attackable and is an enemy
        if (! r.isVisible(enemy)){
            return false
        }
        const dist = utils.getSquaredDistance(r.me.x, r.me.y, enemy.x, enemy.y)
        if (enemy.team !== r.me.team
            && SPECS.UNITS[SPECS.CRUSADER].ATTACK_RADIUS[0] <= dist
            && dist <= SPECS.UNITS[SPECS.CRUSADER].ATTACK_RADIUS[1] ){
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