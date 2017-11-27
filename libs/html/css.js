pkg('html.css', () => {

	var rulesOf = x => typeof(x) !== 'object' || !x
			? ('' + (x || '')).replace(/\n/g, '\n\t')
			: Object.pairs(x).map(kv => kv[0] + ': ' + kv[1]).join(';\n\t') + ';',
		classesOf = x => {
			if(Array.isArray(x))
				x = x.map(rulesOf).join('\n\n');
			
			if(typeof(x) === 'object')
				x = Object.pairs(x).map(kv => kv[0] + ' {\n\t' + rulesOf(kv[1]) + '\n}').join('\n\n');
			
			return (x || '') + '';
		};
		
	var css = {
		create: cssCode => {
			cssCode = classesOf(cssCode);
			
			var child = document.createElement('style');
			child.setAttribute('type', 'text/css');
			if (child.styleSheet){
				child.styleSheet.cssText = cssCode;
			} else {
				child.appendChild(document.createTextNode(cssCode));
			}			
			document.head.appendChild(child)
		},
		
		createOnce: cssCode => cb => (cssCode && (css.create(cssCode), (cssCode = null)), cb && cb())
	};
	
	return css;

}); 