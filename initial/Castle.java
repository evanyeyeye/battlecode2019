package bc19;

public class Castle extends MyRobot {

    static int pilgrimCounter = 0;
    static int crusaderCounter = 0;

    static Action takeTurn() {
        r.log("" + r.me.id + ": Castle Turn");
        if (pilgrimCounter * 10 < r.me.turn) {
            Direction buildDirection = findBuildDirection(r.me.x, r.me.y);
            if (buildDirection != null) {
                r.log("built");
                return r.buildUnit(3, buildDirection.x, buildDirection.y); // CRUSADER
            }
            pilgrimCounter++;
        }
        return null;
    }

    // must check in visible range
    static boolean isEmpty(int x, int y) {
        boolean[][] passableMap = r.getPassableMap();
        int[][] visibleRobotMap = r.getVisibleRobotMap();
        return passableMap[y][x] && visibleRobotMap[y][x] == 0;
    }

    static Direction findBuildDirection(int x, int y) {
        for (Direction d: directionList) {
            if (isEmpty(x + d.x, y + d.y)) {
                return d;
            }
        }
        return null;
    }

    static Direction[] directionList = new Direction[] {new Direction(-1, -1), new Direction(0, -1), new Direction(1, -1), new Direction(-1, 0), new Direction(1, 0), new Direction(-1, 1), new Direction(0, 1), new Direction(1, 1)};

    static class Direction { 
        public int x; 
        public int y; 
        public Direction(int x, int y) { 
            this.x = x; 
            this.y = y; 
        } 
    } 
}