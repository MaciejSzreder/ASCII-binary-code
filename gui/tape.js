import color from './colors.js';

import { tapeDecode, tapeEncode } from "../logic/tape.js";

export default class Tape
{
	static holeRadius = 10;
	static holeGap = 10;
	static holeMargin = Tape.holeGap;
	static holeCenterDistance = 2*Tape.holeRadius + Tape.holeGap;
	static holeCenterEdgeDistance = Tape.holeRadius + Tape.holeMargin;
	static width = 8*2*Tape.holeRadius + 7*Tape.holeGap + 2*Tape.holeMargin;

	holeColor = color.off;
	potentialHoleColor = color.pointed;
	glueColor = color.off; 
	potentialGlueColor = color.pointed;


	constructor(source, x)
	{
		this.source = source;
		this.x = x;
		this.hitBox = {
			x: this.x,
			y: 0,
			width: Tape.width,
			height: Infinity
		};
	}

	draw(ctx, {mouse})
	{
		let [data, loop] = tapeDecode(this.source.value);
		this.punchTape(ctx, data.reverse(), loop, 0);

		if(mouse.isOver){
			const cell = {
				column: Math.max(0,Math.min(Math.round((mouse.x-Tape.holeCenterEdgeDistance)/Tape.holeCenterDistance), 7)),
				row: Math.floor(mouse.y / Tape.holeCenterDistance)
			};
			const hole = {
				x: cell.column*Tape.holeCenterDistance + Tape.holeCenterEdgeDistance,
				y: cell.row*Tape.holeCenterDistance + Tape.holeCenterEdgeDistance
			}
			const rowY = mouse.y % Tape.holeCenterDistance;

			if(rowY <= Tape.holeGap){
				this.glueCovering(ctx, 0,mouse.y-rowY, true);
			}else{
				this.punchHole(ctx, hole.x, hole.y, true);
			}
		}
	}

	click(mouse)
	{
		const cell = {
			column: Math.max(0,Math.min(Math.round((mouse.x-Tape.holeCenterEdgeDistance)/Tape.holeCenterDistance), 7)),
			row: Math.floor(mouse.y / Tape.holeCenterDistance)
		};
		
		let [decoded, loop] = tapeDecode(this.source.value);
		const rowY = mouse.y % Tape.holeCenterDistance;
		if(rowY <= Tape.holeGap){
			// set loop if there was no glue or did not clicked on glue
			loop = !loop || (decoded.length!==cell.row && cell.row!==0);
			if(cell.row!==0){
				decoded.length = cell.row;
			}
		}else{
			decoded[cell.row] ^= 1 << (7-cell.column);
		}
		this.source.value = tapeEncode([decoded], loop);
	}

	drag({absoluteMouse})
	{
		this.hitBox.x = absoluteMouse.x;
		this.hitBox.y = absoluteMouse.y;
	}

	punchTape(canvas, values, loop, x)
	{
		const ctx = canvas.getContext?canvas.getContext`2d`:canvas;
		ctx.clearRect(x,0, Tape.width,ctx.canvas.height);
		ctx.strokeStyle = color.off;
		ctx.strokeRect(x+0.5,0.5, Tape.width-1,ctx.canvas.height-1);
		if(loop){
			this.glueCovering(ctx, x,0);
		}
		for(const [index,value] of values.entries()){
			let y = Tape.holeCenterEdgeDistance + (values.length - index - 1)*Tape.holeCenterDistance;
			this.punchValue(ctx, value, x,y);
		}
		if(loop){
			let y = Tape.holeCenterEdgeDistance + (values.length - 1)*Tape.holeCenterDistance + Tape.holeRadius;
			this.glueCovering(ctx, x,y);
		}
	}
	
	punchValue(ctx, value, x,y)
	{
		for(let idx=0; value>0; value>>=1, ++idx){
			if(value&1){
				this.punchHole(ctx, x + Tape.holeCenterEdgeDistance + Tape.holeCenterDistance*(7-idx), y);
			}
		}
	}
	
	punchHole(ctx, x, y, potential = false)
	{
		ctx.beginPath();
		ctx.arc(x, y, Tape.holeRadius, 0, Math.PI * 2);
		ctx.fillStyle = potential ? this.potentialGlueColor : this.glueColor;
		ctx.fill();
	}
	
	glueCovering(ctx, x,y, potential)
	{
		ctx.fillStyle = potential ? this.potentialGlueColor : this.glueColor;
		ctx.fillRect(x, y, Tape.width, Tape.holeCenterEdgeDistance-Tape.holeRadius);
	}
}