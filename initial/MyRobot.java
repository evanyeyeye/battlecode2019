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
}
