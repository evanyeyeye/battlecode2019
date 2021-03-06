export default {

    CASTLE_GREETING: 255,

    MINE: "0000",
    ATTACK: "0001",
    DEFEND: "0010",
    KILLED: "0011",
    STAND: "0100",
    ALL_IN: "0101",
    ENEMY_HERE: "0110",
    ALL_IN: "0111",
    BUILDING_CHURCH: "1000",
    ATTACK_CHURCH: "1001",


    CASTLETALK_ON_MINE: "00",
    CASTLETALK_GOING_MINE: "01",
    CASTLETALK_ENEMY_SPOTTED: "10",
    CASTLETALK_SAVE: "11",

    encodeSignal: function(x, y, action) {
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

    _encodeSignal: function(x, y, four, locBits=6, signalLen=16) {
        let loc1 = x.toString(2)
        let loc2 = y.toString(2)
        loc1 = "0".repeat(locBits - loc1.length) + loc1  // pad to length
        loc2 = "0".repeat(locBits - loc2.length) + loc2
        return parseInt(loc1 + loc2 + four, 2)
    },

    encodeCastleTalk: function(x, two, locBits=6, signalLen=8) {
        let loc = x.toString(2)
        loc = "0".repeat(locBits - loc.length) + loc
        return parseInt(loc + two, 2)
    },

    decodeCastleTalk: function(message, locBits=6, signalLen=8) {
        let binary = message.toString(2)
        binary = "0".repeat(signalLen - binary.length) + binary
        const b = binary.substring(0, locBits)
        const action = binary.substring(locBits)
        const loc = parseInt(b, 2)
        return [loc, action]
    },

    decodeSignal: function (message, locBits=6, signalLen=16) {
        let binary = message.toString(2)
        binary = "0".repeat(signalLen - binary.length) + binary  // pad the message if necessary
        const b1 = binary.substring(0, locBits)
        const b2 = binary.substring(locBits, locBits + locBits)
        const action = binary.substring(locBits + locBits)
        const loc1 = parseInt(b1, 2)
        const loc2 = parseInt(b2, 2)
        return [loc1, loc2, action]
    }
}