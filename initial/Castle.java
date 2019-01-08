package bc19;

public class Castle extends MyRobot {

    static int pilgrimCounter = 0;
    static int crusaderCounter = 0;

    static Action takeTurn() {
        r.log("Castle Turn");
        if (r.karbonite > Crusader.KARBONITE_COST && r.fuel > Crusader.FUEL_COST && 
            crusaderCounter * 300 < r.me.turn) {
            Direction buildDirection = findBuildDirection(r.me.x, r.me.y);
            if (buildDirection != null) {
                r.log("    Built Crusader");
                return r.buildUnit(Crusader.TYPE, buildDirection.x, buildDirection.y);
            }
            crusaderCounter++;
        }
        return null;
    }

    // must check in visible range
    static boolean isEmpty(int x, int y) {
        boolean[][] passableMap = r.map;
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