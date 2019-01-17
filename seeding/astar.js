import {PathField} from './pathfield.js'
import utils from './utils.js'
import {SPECS} from 'battlecode'

// copied from last year python a*
class Node {
	constructor(x, y, parent, g, h, multiple = 1) {
		this.x = x
		this.y = y
		this.parent = null
		this.f = g + h
		this.multiple = multiple  // idk what this is for
		if (parent !== null) {  // why is this like this
			this.parent = parent
		}
	}
}


export class AStar {
	constructor(r, map) {
		this.r = r
		this.map = map
	}
}