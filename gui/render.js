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

	requestAnimationFrame(function redrawObjects(){
		ctx.resetTransform();
		ctx.clearRect(0,0, canvas.width,canvas.height);
		function drawObjects(objects)
		{
			for(let [name, object] of Object.entries(objects)){
				let backup = ctx.getTransform();
				ctx.translate(object?.hitBox?.x??0, object?.hitBox?.y??0);
				let localMouse = {
					x: mouse.x - (object?.hitBox?.x??0),
					y: mouse.y - (object?.hitBox?.y??0),
					isOver: inRectangle(mouse, object.hitBox)
				}
				ctx.lineWidth = 1;
				object.draw?.(ctx, {mouse: localMouse});
				drawObjects(object.components??[]);
				ctx.setTransform(backup);
			}
		}
		drawObjects(objects);
		requestAnimationFrame(redrawObjects);
	});

	canvas.addEventListener('click', (event)=>{
		const rect = canvas.getBoundingClientRect();
		const mouse = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};

		function clickObject(objects, mouse)
		{
			for(let [name, object] of Object.entries(objects)){
				if(object.hitBox && inRectangle(mouse, object.hitBox)){
					let localMouse = {
						x: mouse.x - object.hitBox.x,
						y: mouse.y - object.hitBox.y
					};
					object.click?.(localMouse);
					clickObject(object.components??[], localMouse);
				}
			}
		}
		if(start.x === mouse.x && start.y === mouse.y){
			clickObject(objects, mouse);
		}
		draggedObject = null;
		start = null;
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

	canvas.addEventListener('touchstart', (event)=>{
		const rect = canvas.getBoundingClientRect();
		const mouse = {
			x: event.touches[0].clientX - rect.left,
			y: event.touches[0].clientY - rect.top
		};
		start = mouse;
		
		for(let object of objects){
			if(inRectangle(mouse, object.hitBox)){
				draggedObject = object;
			}
		}
	});
	

	canvas.addEventListener('touchmove', (event)=>{
		const rect = canvas.getBoundingClientRect();
		const mouse = {
			x: event.touches[0].clientX - rect.left,
			y: event.touches[0].clientY - rect.top
		};
		
		if(start?.x !== mouse.x && start?.y !== mouse.y){
			if(draggedObject?.drag){
				event.preventDefault();
				draggedObject?.drag?.({absoluteMouse: mouse});
			}
		}
	});
	
	canvas.addEventListener('touchend', (event)=>{
		draggedObject = null;
		start = null;
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