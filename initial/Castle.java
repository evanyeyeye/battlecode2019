package bc19;

public class Castle extends MyRobot {

    public static Action turn(BCAbstractRobot r) {
        r.log("" + r.me.id);
        return null;
    }
}