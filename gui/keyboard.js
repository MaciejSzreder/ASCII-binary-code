import color from './colors.js';
import {getNumber} from './utils.js';

export default class Keyboard
{
	font = '20px sans-serif';

	constructor(x,y)
	{
		this.x  = x;
		this.y = y;

		this.pressedKeys = [];
	}

	drag({absoluteMouse})
	{
		this.x = absoluteMouse.x;
		this.y = absoluteMouse.y;
	}

	getCableJoinPoint()
	{
		return this.hitBox;
	}

	getIterator()
	{
		return ()=>this.pressedKeys.pop();	
	}

	onKeyDown({character})
	{
		if(character){
			this.pressedKeys.push(character.codePointAt());
		}
	}

	draw(ctx)
	{
		let hitBox = {
			x: getNumber(this.x),
			y: getNumber(this.y),
			width: 0,
			height: 0,
		};

		ctx.fillStyle = color.off;
		ctx.fillRect(0,0, this.hitBox?.width??0, this.hitBox?.height??0);

		for(let content of [
			'`1234567890-=',
			'qwertyuiop[]\\',
			"asdfghjkl;'",
			'zxcvbnm,./',
		]){
			ctx.font = this.font;
			let {
				width,
				actualBoundingBoxAscent,
				actualBoundingBoxDescent
			} = ctx.measureText(content);
			let lineBox = {
				x: hitBox.x,
				y: hitBox.y+hitBox.height,
				width: width,
				height: actualBoundingBoxAscent+actualBoundingBoxDescent+2
			};
			ctx.fillStyle = color.on;
			ctx.fillText(content, 0, hitBox.height+actualBoundingBoxAscent+actualBoundingBoxDescent+1);
			hitBox.width = Math.max(hitBox.width, lineBox.width);
			hitBox.height += lineBox.height;
		}
		this.hitBox = hitBox;
	}
}