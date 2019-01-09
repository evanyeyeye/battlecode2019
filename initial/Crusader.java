package bc19;

import java.util.*;

public class Crusader extends MyRobot {
    // initial position
    static int initialX = 0;
    static int initialY = 0;

    static Action takeTurn() {
        int sqrtSpeed = (int)(Math.sqrt(0.5 * r.SPECS.UNITS[r.SPECS.CRUSADER].SPEED));  // some sort of scaling value
        TreeMap<Integer, Integer> enemyBotDistance = new TreeMap<Integer, Integer>();
        TreeMap<Integer, Integer> friendlyBotDistance = new TreeMap<Integer, Integer>();

        int lengthX = r.map.length;
        int lengthY = r.map[0].length;

        if(r.me.turn == 1){
            r.log("I am a Crusader");
            initialX = r.me.x;
            initialY = r.me.y;
        }

        // look at nearby bots
        // TEMP?
        Robot closestEnemy = null;
        int minEnemyDistance = 100;

        for(Robot other: r.getVisibleRobots()){
            if(other.team == r.me.team)
                friendlyBotDistance.put(getSquaredDistance(other), other.id);
            else{
                enemyBotDistance.put(getSquaredDistance(other), other.id);
                if(getSquaredDistance(other) < minEnemyDistance){
                    minEnemyDistance = getSquaredDistance(other);
                    closestEnemy = other;
                }
            }
        }

        // move if no enemies
        if(closestEnemy == null){
            /*
            int dx = (int)(Math.random() * (2 * sqrtSpeed + 1) - sqrtSpeed); 
            int dy = (int)(Math.random() * (2 * sqrtSpeed + 1) - sqrtSpeed);
            if(isEmpty(r.me.x + dx, r.me.y + dy))
                return r.move(dx, dy);
            else
                return null;
            */
            // try to move to opposite location of starting point
            return moveToXY(lengthX - 1 - initialX, lengthY - 1 - initialY);
            
        }

        // Robot closestEnemy = r.getRobot(enemyBotDistance.get(enemyBotDistance.firstKey()));  // why is this bugged

        // attack enemy
        // if(enemyBotDistance.firstKey() < r.SPECS.UNITS[r.SPECS.CRUSADER].ATTACK_RADIUS[1])
        //     return attackRobot(closestEnemy);
        if(minEnemyDistance < r.SPECS.UNITS[r.SPECS.CRUSADER].ATTACK_RADIUS[1]){
            r.log("attacking enemy");  // this is compile error somehow
            return attackRobot(closestEnemy);
        }

        // get closer to enemy
        return moveToXY(closestEnemy.x, closestEnemy.y);

    }

    public static int getSquaredDistance(Robot other){
        int dx = r.me.x - other.x;
        int dy = r.me.y - other.y;
        return dx*dx + dy*dy;
    }

    public static Action attackRobot(Robot other){
        return r.attack(other.x - r.me.x, other.y - r.me.y);
    }

    public static Action moveToXY(int x, int y){
        int dx = x - r.me.x;
        int dy = y - r.me.y;
        // idk how to do this don't look too closely
        if(dx > 0)
            dx = 1;
        if(dy > 0)
            dy = 1;
        if(dx < 0)
            dx = -1;
        if(dy < 0)
            dy = -1;
        if(isEmpty(r.me.x + dx, r.me.y + dy)){
            r.log("I want to move in the direction of " + dx + ", " + dy);
            return r.move(dx, dy);
        }
        return null;
    }

    static boolean isEmpty(int x, int y) {
        boolean[][] passableMap = r.getPassableMap();
        int[][] visibleRobotMap = r.getVisibleRobotMap();
        return passableMap[y][x] && visibleRobotMap[y][x] == 0;
    }
}
