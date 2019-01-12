package bc19;

public class CrusaderBug extends MyRobot {

	static Location start = null;	
	static Location dest = null;
	static Direction directDirection = null;	
	static int directDistance = Integer.MAX_VALUE;

	static Location wallLocation = null;	
	static boolean buggingRight = true; 

	static smoothCount = 0;
	static int closestDistance = Integer.MAX_VALUE;

	static boolean[][] visitedLocations = null;	
	static int height = r.map.length;
	static int width = r.map[0].length;

	static boolean isTracing = false;	

	static void bugMove(Location d) {
		start = new Location(r.me.x, r.me.y);
		if (start.equals(dest)) {
			return;
		}
		if (dest != null && !dest.equals(dest)) {			
			isTracing = false;
		}

		dest = d;
		directDirection = start.directionTo(dest);
		directDistance = (int)start.distanceSquaredTo(dest);

		if (isTracing) {
			if (directDistance < closestDistance && Utils.trySmallMoveRotate(gc, id, directDirection)) {
				isTracing = false;
				return;
			}
			traceMove();
		} else if (!Utils.trySmallMoveRotate(gc, id, directDirection)) {
			smoothCount = Integer.MAX_VALUE;
			closestDistance = directDistance;
			visitedLocations = new boolean[height][width];
			isTracing = true;		
			
			Direction leftDirection = bc.bcDirectionRotateLeft(directDirection);
			int leftDistance = Integer.MAX_VALUE;
			for (int i = 0; i < 3; i++) {
				leftDirection = bc.bcDirectionRotateLeft(leftDirection);
				if (gc.canMove(id, leftDirection)) {
					leftDistance = (int)start.add(leftDirection).distanceSquaredTo(dest);
					break;
				}
			}
			Direction rightDirection = bc.bcDirectionRotateRight(directDirection);
			int rightDistance = Integer.MAX_VALUE;
			for (int i = 0; i < 2; i++) {		
				rightDirection = bc.bcDirectionRotateRight(rightDirection);
				if (gc.canMove(id, rightDirection)) {
					rightDistance = (int)start.add(rightDirection).distanceSquaredTo(dest);
					break;
				}
			}

			if (rightDistance < leftDistance) {
				buggingRight = true;
				wallLocation = start.add(bc.bcDirectionRotateLeft(rightDirection));
			} else {
				buggingRight = false;
				wallLocation = start.add(bc.bcDirectionRotateRight(leftDirection));
			}

			traceMove();
		}
	}

	static void traceMove() {
		traceMove(false);
		if (smoothCount >= 2) {
			isTracing = false;
		}
	}
	
	static void traceMove(boolean reversed) {
		Direction tryDirection = start.directionTo(wallLocation);
		visitedLocations[start.getX() % height][start.getY() % width] = true;
		if (gc.canMove(id, tryDirection)) {
			smoothCount += 1;
		} else {
			smoothCount = 0;
		}
		for (int i = 0; i < 8; i++) {
			if (buggingRight) {
				tryDirection = bc.bcDirectionRotateRight(tryDirection);
			} else {
				tryDirection = bc.bcDirectionRotateLeft(tryDirection);
			}
			Location tryLocation = start.add(tryDirection);
			if (gc.hasUnitAtLocation(tryLocation) && !reversed) {
				buggingRight = !buggingRight;
				traceMove(true);
				return;				
			}
			if (!map.onMap(tryLocation) && !reversed) {
				buggingRight = !buggingRight;
				traceMove(true);
				return;
			}
			if (gc.canMove(id, tryDirection)) {
				gc.moveRobot(id, tryDirection);				
				if (visitedLocations[tryLocation.getX() % height][tryLocation.getY() % width]) {
					isTracing = false;
				}
				return;
			}
			wallLocation = tryLocation;			
		}
	}	
}