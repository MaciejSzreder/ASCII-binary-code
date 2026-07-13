import color from './colors.js';

import render from './render.js';
import Screen from './screen.js';
import Button from './button.js';

import Machine from '../logic/machine.js';
import { tapeIterator, tapeEncode } from '../logic/tape.js';

export default class Computer
{
	static screenEdgeGap = 10;
	static buttonEdgeGap = Computer.screenEdgeGap;
	static buttonScreenGap = Computer.buttonEdgeGap;
	static width = (new Machine).image().length + 2*Computer.screenEdgeGap;

	constructor(x,y)
	{
		this.x = x;
		this.y = y;
		this.machine = new Machine();
		this.image = this.machine.image();

		this.components={
			screen: new Screen(Computer.screenEdgeGap,Computer.screenEdgeGap, ()=>this.image),
			button: new Button(
				Computer.buttonEdgeGap,
				this.image[0].length + Computer.buttonScreenGap + Computer.screenEdgeGap,
				'▶',
				()=>this.start()
			)
		};
	}

	draw(ctx)
	{
		this.hitBox = {
			x: this.x,
			y: this.y,
			width: Computer.width,
			height: this.components.button.hitBox.y + this.components.button.hitBox.height + Computer.buttonEdgeGap
		}
		ctx.strokeStyle = color.off;
		ctx.strokeRect(0.5, 0.5, this.hitBox.width, this.hitBox.height);
	
	}

	connectServiceInput(source)
	{
		this.serviceCode = source;
	}

	connectInput(source)
	{
		this.input = source;
	}

	connectOutput(destination)
	{
		this.output = destination;
	}

	start()
	{
		let serviceCode = tapeIterator(this.serviceCode.value);
		let input = tapeIterator(this.input.value);
		
		this.machine.inputs(Machine.makePortIterator((port)=>port==0?input():null));

		this.machine.serviceMode();
		this.machine.serviceInput(Machine.makeTapeIterator(serviceCode));

		this.machine.outputs((port,value)=>{
			if(port==0){
				this.output.value = tapeEncode([[value]]) + '\n' + this.output.value;
			}
			console.log(`${port}: ${value}`);
		});
		
		this.machine.restart();

		this.image = this.machine.image();
	}
}