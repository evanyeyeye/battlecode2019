package bc19;

import java.util.*;

public class Crusader extends MyRobot {

    static Action takeTurn() {
        int sqrtSpeed = (int)(Math.sqrt(0.5 * r.SPECS.UNITS[r.SPECS.CRUSADER].SPEED));  // some sort of scaling value
        TreeMap<Integer, Integer> enemyBotDistance = new TreeMap<Integer, Integer>();
        TreeMap<Integer, Integer> friendlyBotDistance = new TreeMap<Integer, Integer>();

        if(r.me.turn == 1)
            r.log("I am a Crusader");

        // look at nearby bots
        // TEMP?
        Robot closestEnemy = null;
        int minEnemyDistance = 100;

        for(Robot other: r.getVisibleRobots()){
            if(other.team == r.me.team)
                friendlyBotDistance.put(getSquaredDistance(r.me, other), other.id);
            else{
                enemyBotDistance.put(getSquaredDistance(r.me, other), other.id);
                if(getSquaredDistance(r.me, other) < minEnemyDistance){
                    minEnemyDistance = getSquaredDistance(r.me, other);
                    closestEnemy = other;
                }
            }
        }

        // move if no enemies
        if(closestEnemy == null){
            int dx = (int)(Math.random() * (2 * sqrtSpeed + 1) - sqrtSpeed); 
            int dy = (int)(Math.random() * (2 * sqrtSpeed + 1) - sqrtSpeed);
            if(isEmpty(r.me.x + dx, r.me.y + dy))
                return r.move(dx, dy);
            else
                return null;
        }

        // Robot closestEnemy = r.getRobot(enemyBotDistance.get(enemyBotDistance.firstKey()));  // why is this bugged

        // attack enemy
        // if(enemyBotDistance.firstKey() < r.SPECS.UNITS[r.SPECS.CRUSADER].ATTACK_RADIUS[1])
        //     return attackRobot(closestEnemy);
        if(minEnemyDistance < r.SPECS.UNITS[r.SPECS.CRUSADER].ATTACK_RADIUS[1])
            return attackRobot(closestEnemy);

        // get closer to enemy
        return moveToRobot(closestEnemy);

    }

    public static int getSquaredDistance(Robot me, Robot other){
        int dx = me.x - other.x;
        int dy = me.y - other.y;
        return dx*dx + dy*dy;
    }

    public static Action attackRobot(Robot other){
        return r.attack(other.x - r.me.x, other.y - r.me.y);
    }

    public static Action moveToRobot(Robot other){
        int dx = other.x - r.me.x;
        int dy = other.y - r.me.y;
        // idk how to do this don't look too closely
        if(dx > 0)
            dx = 1;
        if(dy > 0)
            dy = 1;
        if(dx < 0)
            dx = -1;
        if(dy < 0)
            dy = -1;
        if(isEmpty(r.me.x + dx, r.me.y + dy))
            return r.move(dx, dy);
        return null;
    }

    static boolean isEmpty(int x, int y) {
        boolean[][] passableMap = r.getPassableMap();
        int[][] visibleRobotMap = r.getVisibleRobotMap();
        return passableMap[y][x] && visibleRobotMap[y][x] == 0;
    }
}
