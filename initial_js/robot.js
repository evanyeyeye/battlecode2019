import {BCAbstractRobot, SPECS} from 'battlecode'
import {castleTurn} from './castle.js'
import {churchTurn} from './church.js'
import {pilgrimTurn} from './pilgrim.js'
import {crusaderTurn} from './crusader.js'
import {prophetTurn} from './prophet.js'
import {preacherTurn} from './preacher.js'

var step = 0

class MyRobot extends BCAbstractRobot {
    turn() {
        step++
        var wisdom = 3
        this.wisdom = 8
        switch (this.me.unit) {
            case SPECS.CASTLE:
                return castleTurn(this)
            case SPECS.CHURCH:
                return churchTurn(this)
            case SPECS.PILGRIM:
                return pilgrimTurn(this)
            case SPECS.CRUSADER:
                return crusaderTurn(this)
            case SPECS.PROPHET:
                return prophetTurn(this)
            case SPECS.PREACHER:
                return preacherTurn(this)
        }
        return
    }
}

var robot = new MyRobot()
