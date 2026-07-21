export function HtmlId(id)
{
	return document.getElementById(id)
};

export function getBoxMiddle(box)
{
	return {
		x: box.x + normalizeNumber(box.width)/2,
		y: box.y + normalizeNumber(box.height)/2
	};
}

export function normalizeNumber(number)
{
	return isFinite(number) ? number : 0;
}