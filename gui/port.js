import color from './colors.js';
import {default as render, getAbsoluteHitBox, nextClick} from './render.js';
import { getBoxMiddle } from './utils.js';
import Cable from './cable.js';

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
		this.cable = {components:{}};
		render(this.cable);
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

	click()
	{
		delete this.cable.components.cable;
		nextClick(({object})=>{
			if(object.getCableJoinPoint){
				this.cable.components.cable=new Cable(this,object);
			}
			nextClick(null);
		});
	}
}