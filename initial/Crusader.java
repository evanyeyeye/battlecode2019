package bc19;

import java.util.*;

public class Crusader extends MyRobot {

    final static int TYPE = 3;
    final static int ATTACK_RADIUS = 4;
    final static int SPEED = 6;
    final static int KARBONITE_COST = 20;
    final static int FUEL_COST = 50;

    public static Action takeTurn() {
        TreeMap<Integer, Integer> enemyBotDistance = new TreeMap<Integer, Integer>();
        TreeMap<Integer, Integer> friendlyBotDistance = new TreeMap<Integer, Integer>();

        if(r.me.turn == 1)
            r.log("I am a Crusader");

        // look at nearby bots
        for(Robot other: r.getVisibleRobots()){
            if(other.team == r.me.team)
                friendlyBotDistance.put(getSquaredDistance(r.me, other), other.id);
            else
                enemyBotDistance.put(getSquaredDistance(r.me, other), other.id);
        }

        // move if no enemies
        if(enemyBotDistance.size() <= 0){
            int dx = (int)(Math.random() * 2 * SPEED - SPEED + 1);
            int dy = (int)(Math.random() * 2 * SPEED - SPEED + 1);  // TODO: Replace constants
            if(isEmpty(r.me.x + dx, r.me.y + dy))
                return r.move(dx, dy);
            else
                return null;
        }

        Robot closestEnemy = r.getRobot(enemyBotDistance.firstEntry().getValue());

        // attack enemy
        if(enemyBotDistance.firstKey() < ATTACK_RADIUS)  // TODO: Replace constants
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
        // idk how to do this
        if(dx != 0)
            dx = 1;
        if(dy != 0)
            dy = 1;
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
