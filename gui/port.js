import color from './colors.js';
import { getAbsoluteHitBox } from './render.js';
import { getBoxMiddle } from './utils.js';

export default class Port
{
	static width = 20;
	static height = 10;
	static color = color.light;

	constructor(x,y)
	{
		this.hitBox={
			x,
			y,
			width: Port.width,
			height: Port.height
		}
	}

	draw(ctx)
	{
		ctx.fillStyle = Port.color;
		ctx.fillRect(0, 0, this.hitBox.width, this.hitBox.height);
	}

	getCableJoinPoint()
	{
		return getBoxMiddle(getAbsoluteHitBox(this));
	}
}