import java.util.*;

package bc19;

public class Crusader extends MyRobot {

    public static Action turn(BCAbstractRobot r) {
        TreeMap<Integer, Integer> enemyBotDistance = new TreeMap<Integer, Integer>();
        TreeMap<Integer, Integer> friendlyBotDistance = new TreeMap<Integer, Integer>();

        boolean[][] currentMap = r.me.getPassableMap();

        if(r.me.turn == 1)
            r.log("i was made" + r.me.id);

        // look at nearby bots
        for(Robot other: r.me.getVisibleRobots()){
            if(other.team == r.me.team)
                friendlyBotDistance.put(getSquaredDistance(r.me, other), other.id);
            else
                enemyBotDistance.put(getSquaredDistance(r.me, other), other.id);
        }

        // move if no enemies
        if(enemyBotDistance.size() <= 0){
            int dx = (int)(Math.random() * 2 * r.me.unit.SPEED - r.me.unit.SPEED + 1);
            int dy = (int)(Math.random() * 2 * r.me.unit.SPEED - r.me.unit.SPEED + 1);
            if(isEmpty(r, r.me.x + dx, r.me.y + dy))
                return r.me.move(dx, dy);
            else
                return null;
        }

        Robot closestEnemy = r.getRobot(enemyBotDistance.firstEntry().getValue());

        // attack enemy
        if(enemyBotDistance.firstKey() < r.me.unit.ATTACK_RADIUS)
            return attackRobot(r.me, closestEnemy);

        // get closer to enemy
        return r.me.move(dx, dy);

    }

    public static int getSquaredDistance(Robot me, Robot other){
        int dx = me.x - other.x;
        int dy = me.y - other.y;
        return dx*dx + dy*dy;
    }

    public static Action attackRobot(Robot me, Robot other){
        return me.attack(other.x - me.x, other.y - me.y);
    }

    public static Action moveToRobot(BCAbstractRobot r, Robot me, Robot other){
        int dx = other.x - me.x;
        int dy = other.y - me.y;
        // idk how to do this
        if(dx != 0)
            dx = 1;
        if(dy != 0)
            dy = 1;
        if(isEmpty(r, me.x + dx, me.y + dy))
            return me.move(dx, dy);
        return null
    }

    static boolean isEmpty(BCAbstractBot r, int x, int y) {
        boolean[][] passableMap = r.getPassableMap();
        int[][] visibleRobotMap = r.getVisibleRobotMap();
        return passableMap[y][x] && visibleRobotMap[y][x] == 0;
    }
}