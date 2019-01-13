import {BCAbstractRobot, SPECS} from 'battlecode';
import nav from './nav.js';

let step = -1;

// eslint-disable-next-line no-unused-vars
class MyRobot extends BCAbstractRobot {
    constructor() {
        super();
        this.pendingRecievedMessages = {};
        this.enemyCastles = [];
    }

    turn() {
        step++;

        if (this.me.unit === SPECS.CRUSADER) {
            this.log('START TURN ' + step);
            this.log('Crusader health: ' + this.me.health);

            var visible = this.getVisibleRobots();
            
            // this sucks I'm sorry...
            // This is actually fine. Or use .bind()
            var self = this; // 'this' fails to properly identify MyRobot when used inside of anonymous function below :(

            // get attackable robots
            var attackable = visible.filter((r) => {
                if (! self.isVisible(r)){
                    return false;
                }
                const dist = (r.x-self.me.x)**2 + (r.y-self.me.y)**2;
                if (r.team !== self.me.team
                    && SPECS.UNITS[SPECS.CRUSADER].ATTACK_RADIUS[0] <= dist
                    && dist <= SPECS.UNITS[SPECS.CRUSADER].ATTACK_RADIUS[1] ){
                    return true;
                }
                return false;
            });

            if(!this.pendingMessage) {
                for(let i = 0; i < visible.length; i++ ) {
                    const robot = visible[i];
                    if (robot.team !== this.me.team && robot.unit === SPECS.CASTLE && this.enemyCastles.indexOf(robot.x * 64 + robot.y) < 0) {
                        this.log('ENEMY CASTLE FOUND!');
                        this.pendingMessage = robot.y;
                        this.castleTalk(robot.x);
                        this.enemyCastles.push(robot.x * 64 + robot.y);
                    }
                }
            } else {
                this.castleTalk(this.pendingMessage);
                this.pendingMessage = null;
            }

            this.log(attackable);

            if (attackable.length>0){
                // attack first robot
                var r = attackable[0];
                this.log('' +r);
                this.log('attacking! ' + r + ' at loc ' + (r.x - this.me.x, r.y - this.me.y));
                return this.attack(r.x - this.me.x, r.y - this.me.y);
            }
            const { x, y } = this.me;
            // this.log("Crusader health: " + this.me.health);'
            if (!this.destination) {
                this.destination = nav.reflect({x,y}, this.getPassableMap(), this.me.id % 2 === 0);
            }

            const choice = nav.goto({x,y}, this.destination, this.map, this.getPassableMap(), this.getVisibleRobotMap());
            return this.move(choice.x, choice.y);
        }

        else if (this.me.unit === SPECS.CASTLE) {
            if (step % 10 === 0) {
                this.log('Building a crusader at ' + (this.me.x+1) + ',' + (this.me.y+1));
                return this.buildUnit(SPECS.CRUSADER, 1, 1);
            } 

            const visible = this.getVisibleRobots();
            const messagingRobots = visible.filter(robot => {
                return robot.castle_talk;
            });

            for (let i = 0; i < messagingRobots.length; i++) {
                const robot = messagingRobots[i];
                if (!this.pendingRecievedMessages[robot.id]) {
                    this.pendingRecievedMessages[robot.id] = robot.castle_talk;
                } else {
                    this.enemyCastles.push({
                        x: this.pendingRecievedMessages[robot.id],
                        y: robot.castle_talk,
                    });
                    this.pendingRecievedMessages[robot.id] = null;
                }
            }

            if (step % 100) {
                this.log('KNOWN ENEMY CASTLES: ');
                for(let i = 0; i < this.enemyCastles.length; i++) {
                    const {x,y} = this.enemyCastles[i];
                    this.log(x + ',' + y);
                }
            }

        }

    }
}