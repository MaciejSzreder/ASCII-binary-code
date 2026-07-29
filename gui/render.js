import {HtmlId, getNumber} from './utils.js';

let objects = [];
let draggedObject = null;
let start;
let nextClickAction;

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
				let hitBoxX = getNumber(object?.hitBox?.x);
				let hitBoxY = getNumber(object?.hitBox?.y);
				ctx.translate(hitBoxX, hitBoxY);
				let localMouse = {
					x: mouse.x - (hitBoxX),
					y: mouse.y - (hitBoxY),
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
					let hitBoxX = getNumber(object.hitBox.x);
					let hitBoxY = getNumber(object.hitBox.y);
					let localMouse = {
						x: mouse.x - hitBoxX,
						y: mouse.y - hitBoxY,
					};
					if(nextClickAction){
						nextClickAction({object});
					}else{
						object.click?.(localMouse);
					}
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
	buildTree(object);
}

function buildTree(object)
{
	if(object.components){
		for(let [name, component] of Object.entries(object.components)){
			component.container = object;
			buildTree(component);
		}
	}
}

export function getAbsoluteHitBox(object)
{
	let hitBox = {
		x: getNumber(object.hitBox.x),
		y: getNumber(object.hitBox.y),
		width: getNumber(object.hitBox.width),
		height: getNumber(object.hitBox.height),
	};
	while(object.container){
		object = object.container;
		hitBox.x += getNumber(object?.hitBox?.x??0);
		hitBox.y += getNumber(object?.hitBox?.y??0);
	}
	return hitBox;
}

export function nextClick(action)
{
	nextClickAction = action;
}

function inRectangle(point, rectangle)
{
	return rectangle
		&& getNumber(rectangle.x) <= getNumber(point.x)
		&& getNumber(point.x) <= getNumber(rectangle.x) + getNumber(rectangle.width)
		&& getNumber(rectangle.y) <= getNumber(point.y)
		&& getNumber(point.y) <= getNumber(rectangle.y) + getNumber(rectangle.height);
}