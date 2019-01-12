package bc19;

public class MyRobot extends BCAbstractRobot {

    static BCAbstractRobot r;
    
    public int turn;
    
    public Action turn() {

        r = this;

        turn++;
        
        switch (me.unit) {
            case 0:
                return Castle.takeTurn();
            case 1:
                return Church.takeTurn();
            case 2:
                return Pilgrim.takeTurn();
            case 3:
                return Crusader.takeTurn();
            case 4:
                return Prophet.takeTurn();
            case 5:
                return Preacher.takeTurn();
        }
        return null;
    }

    static Direction[] directionList = new Direction[] {new Direction(-1, -1), new Direction(0, -1), new Direction(1, -1), new Direction(-1, 0), new Direction(1, 0), new Direction(-1, 1), new Direction(0, 1), new Direction(1, 1)};

    static class Direction { 
        public int dx; 
        public int dy; 
        public Direction(int dx, int dy) { 
            this.dx = dx; 
            this.dy = dy; 
        } 
    } 

    static class Location {
        public int x;
        public int y;
        public Location(int x, int y) { 
            this.x = x; 
            this.y = y; 
        }
        public boolean equals(Object o) {
            return this.x == o.x && this.y == o.y;
        }
    }
}
