package bc19;

public class MyRobot extends BCAbstractRobot {

    public int turn;

    public Action turn() {

        turn++;
        switch (me.unit) {
            case 0:
                return Castle.turn(this);
            case 1:
                return Church.turn(this);
            case 2:
                return Pilgrim.turn(this);
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
