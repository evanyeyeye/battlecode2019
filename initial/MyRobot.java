package bc19;

public class MyRobot extends BCAbstractRobot {

    public static BCAbstractRobot r;
    public int turn;
    
    public Action turn() {

        r = this;

        turn++;

        switch (me.unit) {
            case 0:
                return Castle.takeTurn();
            case 1:
                return Church.turn(this);
            case 2:
                return Pilgrim.takeTurn();
            case 3:
                return Crusader.turn(this);
            case 4:
                return Prophet.turn(this);
            case 5:
                return Preacher.turn(this);
        }
        return null;
    }
}
