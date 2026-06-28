let d

function dev()
{
	if(d)
		return d;

	import('./tools.js').then(dev=>{
		d=dev;
	});
}