import render from './render.js';
import Computer from './computer.js';
import Tape from './tape.js';
import Cable from './cable.js';
import Keyboard from './keyboard.js';
import { HtmlId } from './utils.js';

const tapeGap = Tape.holeGap;
const tapeComputerGap = tapeGap;
const tapeKeyboardGap = tapeGap;

export let serviceTape, inputTape, outputTape, computer, keyboard;

function positionClamp(position, width, max){
	if(position < 0){
		return 0;
	}
	if(position+width <= max){
		return position;
	}
	return max-width;
}

document.addEventListener('DOMContentLoaded', ()=>{
	let view = HtmlId`html`;
	let main = HtmlId`main`;
	main.style.height = main.height = view.clientHeight;
	let width = main.style.width = main.width = view.clientWidth;
	
	render(serviceTape = new Tape(
		" OO O  O\n"+
		" OO OOOO\n"+
		"========",
		0
	));
	render(inputTape = new Tape(
		"       O\n"+
		"      O \n"+
		"      OO\n"+
		"========",
		positionClamp( Tape.width + tapeGap, Tape.width, width)
	));
	render(computer = new Computer(positionClamp(2*Tape.width + 2*tapeGap, Computer.width, width), 0, ()=>image));
	render(outputTape = new Tape("", positionClamp(2*Tape.width + tapeGap + 2*tapeComputerGap + Computer.width, Tape.width, width)));
	render(keyboard = new Keyboard(positionClamp(3*Tape.width + tapeGap + 2*tapeComputerGap + Computer.width + tapeKeyboardGap, Tape.width, width),0));

	computer.connectOutput(outputTape.source);

	computer.components.servicePort.connect(serviceTape);
	computer.components.port.connect(inputTape);
	render(new Cable(outputTape, computer.components.port));
});