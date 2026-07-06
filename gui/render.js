import { HtmlId } from './utils.js';

let objects = [];
let draggedObject = null;
let start;

document.addEventListener('DOMContentLoaded', ()=>{
	let canvas = HtmlId`main`;
	let ctx = canvas.getContext`2d`;

	let mouse = {};

	canvas.addEventListener('mousemove', (event)=>{
		const rect = canvas.getBoundingClientRect();
		mouse = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};

	});

	requestAnimationFrame(function drawObjects(){
		ctx.clearRect(0,0, canvas.width,canvas.height);
		for(let object of objects){
			ctx.translate(object?.hitBox?.x??0, object?.hitBox?.y??0);
			let localMouse = {
				x: mouse.x - (object?.hitBox?.x??0),
				y: mouse.y - (object?.hitBox?.y??0),
				isOver: inRectangle(mouse, object.hitBox)
			}
			object.draw?.(ctx, {mouse: localMouse});
			ctx.resetTransform();
		}
		requestAnimationFrame(drawObjects);
	});

	canvas.addEventListener('click', (event)=>{
		const rect = canvas.getBoundingClientRect();
		const mouse = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};

		for(let object of objects){
			if(object.click && object.hitBox && inRectangle(mouse, object.hitBox)){
				let localMouse = {
					x: mouse.x - object.hitBox.x,
					y: mouse.y - object.hitBox.y
				};
				if(start.x === mouse.x && start.y === mouse.y){
					object.click(localMouse);
				}
				draggedObject = null;
				start = null;
			}
		}
	});

	canvas.addEventListener('mousemove', (event)=>{
		const rect = canvas.getBoundingClientRect();
		const mouse = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};
		
		if(start?.x !== mouse.x && start?.y !== mouse.y){
			draggedObject?.drag?.({absoluteMouse: mouse});
		}
	});

	canvas.addEventListener('mousedown', (event)=>{
		const rect = canvas.getBoundingClientRect();
		const mouse = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};
		start = mouse;
		
		for(let object of objects){
			if(inRectangle(mouse, object.hitBox)){
				draggedObject = object;
			}
		}
	});
});

export default function render(object)
{
	objects.push(object);
}

function inRectangle(point, rectangle)
{
	return rectangle
		&& rectangle.x <= point.x
		&& point.x <= rectangle.x + rectangle.width
		&& rectangle.y <= point.y
		&& point.y <= rectangle.y + rectangle.height;
}