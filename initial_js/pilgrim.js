import {SPECS} from 'battlecode'
var targetLoc=[-1,-1]; //position to go if no safe mine seen. Go according to caslte's direction
var unsafeLoc=[]; //from castle to see 
var prioResoruce=-1; //0 is karbonite 1 is fuel
var karboniteMine=[] //list containing all of the karbonite only fill in if it's empty
var fuelMine=[] //list containing all of the fuel only fill in if it's empty
export function pilgrimTurn(r) {
    return
}
//find the best move
function findMove(r){

	var target=null;
	var targetMine=ClosestSafeMine()
	if (targetMine==null){
		target=targetLoc
	}	
	var pf = r.pm.getPathField([targetLoc]) //going to the location
    if (r.fuel > SPECS.UNITS[SPECS.PILGRIM].FUEL_PER_MOVE) {
        var test = pf.getDirectionAtPoint(r.me.x, r.me.y)
        return r.move(test[1], test[0])
    }


}
//return a set of all the places that have the potential to get attacked. 
//Check currentt location and mines to see
function checkDanger(r){



}
//check where the closest safe mine is 
function ClosestSafeMine(r){
	var dangerSet=checkDanger(r);
	for 

}
//just straight up distance
function filter(mine,r){
	myx=r.me.x;
	myy=r.me.y;
}