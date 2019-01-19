export default {

    CASTLE_GREETING: 255,

    ATTACK_MINE: "00",  // mine or attack depends on unit
    ZONE_SCOUT: "01",  // basically hanging out around the mine
    CHANGE_ATTACK_MINE: "10",  // change from current action to attack
    CHANGE_ZONE_BUILD: "11",  // change from current action zonescout

    BUILDING_CHURCH: "999",

    // encode message for signaling
    // action is a number
    encodeSignal: function (mineID, mineID2, totalMines, action, signallen) {
        let encoded_mine=mineID.toString(2);
        let encoded_mine2=mineID2.toString(2);
        let bitsToGive=Math.ceil(Math.log2(totalMines)) // how many bits to give
        let message=""   
        //fill up the empty spots 
        for (let i=0; i<bitsToGive- encoded_mine.length ;i++){
            message+="0"
        }   
        message+=encoded_mine    
        message+=action
        //fill up the empty spots 
        for (let i=0; i<bitsToGive- encoded_mine2.length ;i++){
            message+="0"
        }  
        message+=encoded_mine2
        let msglen=message.length
        //fill up the empty spots
        for (let i=0; i<signallen -msglen ;i++){
            message+="0"
        }    
        let encoded = parseInt(message, 2);
        return encoded
    },

    // used to decode mine the 
    // returns a list with mine1,mine2,action in order
    decodeSignal: function (message, totalMines, signallen) {
        let binary=message.toString(2);       
        let binarylen= binary.length
        for (let i=0; i<signallen- binarylen;i++){
            binary="0"+binary
        }     
        let bitsToGive=Math.ceil(Math.log2(totalMines)) // how many bits to give
        let firstMine=binary.substring(0,bitsToGive)    
        let action=binary.substring(bitsToGive,bitsToGive+2)  
        let mineID = parseInt(firstMine, 2);
        let mineID2=parseInt(binary.substring(bitsToGive+2,bitsToGive+2+bitsToGive),2);   
        return [mineID,mineID2,action]
    },

}