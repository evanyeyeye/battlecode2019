export default {

    CASTLE_GREETING: 255,

    ATTACK_MINE: "00",  // mine or attack depends on unit
    ZONE_SCOUT: "01",  // basically hanging out around the mine
    CHANGE_ATTACK_MINE: "10",  // change from current action to attack
    CHANGE_ZONE_BUILD: "11",  // change from current action zonescout

    BUILDING_CHURCH: "999",
    ALL_IN: "1000",
    KILLED: "1001",
    DEFEND: "0010",
    STAND: "0011",
    ENEMY_SPOTTED: "0100",

    MINE: "0000",
    ATTACK: "0001",

    CASTLETALK_ON_MINE: "00",
    CASTLETALK_GOING_MINE: "01",
    CASTLETALK_SEND_TROOP: "10",
    CASTLETALK_SAVE: "11",

    // encode message for signaling
    // action is a number
    encodeSignal: function (mineID, mineID2, totalMines, action, signallen) {

        let encoded_mine = (mineID).toString(2);
        let encoded_mine2 = (mineID2).toString(2);
        let bitsToGive = Math.ceil(Math.log2(totalMines)) // how many bits to give
        let message = ""   
        //fill up the empty spots 
        for (let i = 0; i < bitsToGive - encoded_mine.length ;i++){
            message += "0"
        }   
        message += encoded_mine    
        message += action
        //fill up the empty spots 
        for (let i = 0; i < bitsToGive - encoded_mine2.length ;i++){
            message += "0"
        }  
        message += encoded_mine2
        let msglen = message.length
        //fill up the empty spots
        for (let i = 0; i < signallen - msglen ;i++){
            message += "0"
        }    
        let encoded = parseInt(message, 2);
        
        return encoded
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
    
    // encode castle talk message
    encodeCastleTalk: function(mineID, action){
        let encoded_mine=(mineID).toString(2);
        let bitsToGive = 6
        let message=""   
        //fill up the empty spots 
        for (let i=0; i<bitsToGive - encoded_mine.length ;i++){
            message+="0"
        }   
        message += encoded_mine    
        message += action
        let encoded = parseInt(message, 2);
        return encoded

    },

    //decode castle talk message
    decodeCastleTalk: function (msg) {
        let binary = msg.toString(2)     
        let binarylen = binary.length
        for (let i = 0; i < 8 - binarylen; i++){
            binary = "0" + binary
        }     
        let bitsToGive = 6 // how many bits to give
        let firstMine = parseInt(binary.substring(0,bitsToGive),2)    
        let action = binary.substring(bitsToGive,bitsToGive+2) 
        return [firstMine ,action] 
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