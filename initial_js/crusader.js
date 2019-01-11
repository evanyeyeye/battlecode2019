import {SPECS} from 'battlecode'

export function crusaderTurn(r) {
    if (r.me.turn == 1) {
        r.log("I am a Crusader")
    }
    var pf = r.pm.getPathField([10, 10])
    if (r.fuel > SPECS.UNITS[SPECS.CRUSADER].FUEL_PER_MOVE) {
        var test = pf.getDirectionAtPoint(r.me.x, r.me.y)[0]
        // r.log(test)
        return r.move(test[1], test[0])
    }
    return
}