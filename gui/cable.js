import color from './colors.js';

export default class Cable
{
	static width = 20;
	static color = color.light;
	
	constructor(source, destination)
	{
		this.source = source;
		this.destination = destination;
	}

	draw(ctx)
	{
		let sourceHitBoxMiddle = this.source.getCableJoinPoint?.();
		let destinationHitBoxMiddle = this.destination.getCableJoinPoint?.();
		ctx.strokeStyle = Cable.color;
		ctx.lineWidth = Cable.width;
		ctx.beginPath();
		ctx.moveTo(
			sourceHitBoxMiddle.x,
			sourceHitBoxMiddle.y,
		);
		ctx.lineTo(
			destinationHitBoxMiddle.x,
			destinationHitBoxMiddle.y,
		);
		ctx.stroke();
	}
}