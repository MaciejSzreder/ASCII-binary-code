import color from './colors.js';

import {getAbsoluteHitBox} from './render.js';
import Screen from './screen.js';
import Button from './button.js';
import Port from './port.js';

import Machine from '../logic/machine.js';
import { tapeIterator, tapeEncode } from '../logic/tape.js';
import {getNumber} from './utils.js';

export default class Computer
{
	static screenEdgeGap = 10;
	static buttonEdgeGap = Computer.screenEdgeGap;
	static buttonScreenGap = Computer.buttonEdgeGap;
	static buttonGap = Computer.buttonEdgeGap;
	static portGap = Computer.buttonGap;
	static portEdgeGap = Computer.portGap;
	static width = (new Machine).image().length + 2*Computer.screenEdgeGap;

	constructor(x,y)
	{
		this.x = x;
		this.y = y;
		this.machine = new Machine();
		this.image = this.machine.image();

		this.components={
			screen: new Screen(Computer.screenEdgeGap,Computer.screenEdgeGap, ()=>this.image),
			start: new Button(
				Computer.buttonEdgeGap,
				this.image[0].length + Computer.buttonScreenGap + Computer.screenEdgeGap,
				'▶',
				()=>this.start()
			),
			stop: new Button(
				()=>getNumber(this.components.start.hitBox.x)
					+ getNumber(this.components.start.hitBox.width)
					+ Computer.buttonGap,
				this.image[0].length + Computer.buttonScreenGap + Computer.screenEdgeGap,
				'⏹',
				()=>this.stop()
			),
			servicePort: new Port(
				(Computer.width-Port.width) / 2,
				0,
				(object)=>this.connectServiceInput(object.source),
			),
			port: new Port(
				Computer.portEdgeGap,
				()=> getNumber(this.components.start.hitBox.y)
					+ getNumber(this.components.start.hitBox.height)
					+ Computer.portGap,
				(object)=>this.connectInput(object.source),
			),
		};
	}

	draw(ctx)
	{
		this.hitBox = {
			x: this.x,
			y: this.y,
			width: Computer.width,
			height: getNumber(this.components.port.hitBox.y) + getNumber(this.components.port.hitBox.height) + Computer.portEdgeGap
		}
		ctx.strokeStyle = color.off;
		ctx.strokeRect(0.5, 0.5, this.hitBox.width, this.hitBox.height);
	
	}

	drag({absoluteMouse})
	{
		this.x = absoluteMouse.x;
		this.y = absoluteMouse.y;
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

	stop()
	{
		this.machine.stop();
	}
}