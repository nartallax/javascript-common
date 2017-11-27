pkg('html.tag', () => {

	return (name, attrs, children) => {
		attrs = attrs || {};
		var result = document.createElement(name);
		
		if('class' in attrs) {
			result.className = attrs['class'];
			delete attrs['class'];
		}
		
		if('style' in attrs) {
			result.style.cssText = attrs['style'];
			delete attrs['style'];
		}
		
		if('text' in attrs){
			result.textContent = attrs.text;
			delete attrs.text;
		}
		
		for(var i in attrs) {
			if(i.startsWith('on')){
				result[i] = attrs[i] // directly assigned event listeners
			} else {
				result.setAttribute(i, attrs[i]);
			}
		}
		
		children && children.each(x => result.appendChild(x));
		
		return result;
	}

});