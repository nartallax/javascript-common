pkg("html.tag", () => {

	let isDomElement = x => {
		try {
			return x instanceof HTMLElement;
		} catch(e){
			return typeof(x) === "object" 
				&& x.nodeType === 1 
				&& typeof(obj.style) === "object"
				&& typeof(obj.ownerDocument) === "object";
		}
	}

	let tag = params => {
		params = params || {};
		let el = document.createElement(params.tagName || "div");
		delete params.tagName;
		
		if("class" in params){
			el.className = params.class;
			delete params.class;
		}
		
		if("style" in params){
			el.style.cssText = params.style;
			delete params.style;
		}
		
		if("parent" in params){
			params.parent.appendChild(el);
			delete params.parent;
		}
		
		if("text" in params){
			el.textContent = params.text;
			delete params.text;
		}
		
		if("children" in params){
			params.children.forEach(ch => {
				isDomElement(ch) || (ch = tag(ch));
				el.appendChild(ch);
			});
			delete params.children;
		}
		
		if("value" in params){
			el.value = params.value;
			delete params.value;
		}
		
		for(let k in params){
			if(params.hasOwnProperty(k)){
				if(k.match(/^on/)){
					el[k] = params[k];
				} else {
					el.setAttribute(k, params[k])
				}
			}
		}
			
		return el;
	}
	
	return tag;

});