package bc19;

public class Preacher extends MyRobot {

    public static Action turn(BCAbstractRobot r) {
        r.log("" + r.me.id);
        return null;
    }
}