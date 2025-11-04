var elem = document.body;
var two = new Two({fullscreen: true}).appendTo(elem)

var circle = two.makeCircle(200,200,50);
circle.fill = '#FF8000';
// And accepts all valid CSS color:
circle.stroke = 'orangered';
circle.linewidth = 5;

two.update()