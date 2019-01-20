import {BCAbstractRobot, SPECS} from 'battlecode'
import {castleTurn} from './castle.js'
import {churchTurn} from './church.js'
import {pilgrimTurn} from './pilgrim.js'
import {crusaderTurn} from './crusader.js'
import {prophetTurn} from './prophet.js'
import {preacherTurn} from './preacher.js'
import {PathMaster} from './pathmaster.js'
import {AStar} from './astar.js'
import utils from './utils.js'

class MyRobot extends BCAbstractRobot {

    constructor() {
        super()
        this.step = 0
    }

    turn() {
        var self = this
        self.step++
        if (self.step == 1) {
            self.pm = new PathMaster(self, self.map)
            self.am = new AStar(self, self.map)
            self.enemyTeam = self.team ^ 1
            self.mapSymmetry = utils.findSymmetry(self)
        }
        switch (self.me.unit) {
            case SPECS.CASTLE:
                return castleTurn(self)
            case SPECS.CHURCH:
                return churchTurn(self)
            case SPECS.PILGRIM:
                return pilgrimTurn(self)
            case SPECS.CRUSADER:
                return crusaderTurn(self)
            case SPECS.PROPHET:
                return prophetTurn(self)
            case SPECS.PREACHER:
                return preacherTurn(self)
        }
        return
    }
}

var robot = new MyRobot()
