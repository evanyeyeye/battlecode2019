package bc19;

public class Crusader extends MyRobot {

    public static Action turn(BCAbstractRobot r) {
        r.log("" + r.me.id);
        return null;
    }
}