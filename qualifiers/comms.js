export default {

    CASTLE_GREETING: 255,

    ATTACK_MINE: "00",  // mine or attack depends on unit
    ZONE_SCOUT: "01",  // basically hanging out around the mine
    CHANGE_ATTACK_MINE: "10",  // change from current action to attack
    CHANGE_ZONE_BUILD: "11",  // change from current action zonescout

    BUILDING_CHURCH: "1111",
    ALL_IN: "1000",
    KILLED: "1001",
    DEFEND: "0010",
    STAND: "0011",
    ENEMY_HERE: "0100",

    MINE: "0000",
    ATTACK: "0001",

    CASTLETALK_ON_MINE: "00",
    CASTLETALK_GOING_MINE: "01",
    CASTLETALK_ENEMY_SPOTTED: "10",
    CASTLETALK_SAVE: "11",

    encodeGeneric: function(x, y, action) {
        return this._encodeSignal(x, y, action)
    },

    encodeCastleKill: function(x, y) {
        return this._encodeSignal(x, y, this.KILLED)
    },

    encodeAttack: function(x, y) {
        return this._encodeSignal(x, y, this.ATTACK)
    },

    encodeDefend: function(x, y) {
        return this._encodeSignal(x, y, this.DEFEND)
    },

    encodeStand: function(x, y) {
        return this._encodeSignal(x, y, this.STAND)
    },

    encodeMine: function(mine1, mine2 = 1) {  // mine 2 cannot be 0
        return this._encodeSignal(mine1, mine2, this.MINE)
    },

    _encodeSignal: function(x, y, four, loc_bits = 6, signal_len = 16) {
        let loc1 = x.toString(2)
        let loc2 = y.toString(2)
        loc1 = "0".repeat(loc_bits - loc1.length) + loc1  // pad to length
        loc2 = "0".repeat(loc_bits - loc2.length) + loc2
        return parseInt(loc1 + loc2 + four, 2)
    },

    encodeCastleTalk: function(x, two, loc_bits = 6, signal_len = 8) {
        let loc1 = x.toString(2)
        loc1 = "0".repeat(loc_bits - loc1.length) + loc1
        return parseInt(loc1 + two, 2)
    },

    decodeCastleTalk: function(message, loc_bits = 6, signal_len = 8) {
        let binary = message.toString(2)
        binary = "0".repeat(signal_len - binary.length) + binary
        const b = binary.substring(0, loc_bits)
        const action = binary.substring(loc_bits)
        const loc = parseInt(b, 2)
        return [loc, action]
    },

    decodeSignal: function (message, loc_bits = 6, signal_len = 16) {
        let binary = message.toString(2)
        binary = "0".repeat(signal_len - binary.length) + binary  // pad the message if necessary
        const b1 = binary.substring(0, loc_bits)
        const b2 = binary.substring(loc_bits, loc_bits + loc_bits)
        const action = binary.substring(loc_bits + loc_bits)
        const loc1 = parseInt(b1, 2)
        const loc2 = parseInt(b2, 2)
        return [loc1, loc2, action]
    },
}