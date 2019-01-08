package bc19;

public class Prophet extends MyRobot {

    public static Action turn(BCAbstractRobot r) {
        r.log("" + r.me.id);
        return null;
    }
}