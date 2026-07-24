import color from './colors.js';
import {getNumber} from './utils.js';

export default class Button
{
	font = '50px sans-serif';
	textColor = color.on;
	buttonColor = color.off;
	constructor(x,y,content,action)
	{
		this.x = x;
		this.y = y;
		this.content = content;
		this.action = action;
	}

	hitBox()
	{
		return this.hitBox;
	}

	draw(ctx)
	{
		ctx.font = this.font;
		let {
			width,
			actualBoundingBoxAscent,
			actualBoundingBoxDescent
		} = ctx.measureText(this.content);
		let hitBox = {
			x: getNumber(this.x),
			y: getNumber(this.y),
			width: width,
			height: actualBoundingBoxAscent+actualBoundingBoxDescent+2
		};
		ctx.fillStyle = this.buttonColor;
		ctx.fillRect(0,0, hitBox.width,hitBox.height);
		ctx.fillStyle = this.textColor;
		ctx.fillText(this.content, 0,hitBox.height-actualBoundingBoxDescent-1);

		this.hitBox = hitBox;
	}

	click()
	{
		this.action();
	}
}