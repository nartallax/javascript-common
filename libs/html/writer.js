pkg('html.writer', () => {

	const argsToArr = (args, start) => {
		const result = [];
		for(var i = start || 0; i < args.length; i++)
			result.push(args[i]);
		return result;
	}

	class HtmlWriter {
		constructor(){
			this._meta = {};
			this._scripts = [];
			this._css = [];
			this._headerTags = [];
			this._bodyTags = [];
			this.withDoctype('<!doctype html>')
			this.withMetaRaw('<meta charset="utf-8"/>');
		}
		
		withDoctype(fullTag){ this._doctype = fullTag; return this }
		withMeta(k, v){ this._meta[k] = v; return this }
		withMetaRaw(str){ this._metaRaw = str; return this }
		withFaviconPng(b64png){ 
			this._faviconType = 'image/png';
			this._faviconHref = 'data:image/png;base64,' + b64png
			return this 
		}
		withTitle(title){ this._title = title; return this }
		withScript(body, attributes){ this._scripts.push(this.script(attributes || {'type': 'text/javascript'}, body)); return this }
		withCss(attributes, text){ this._css.push(this.style(attributes, text)); return this }
		withStartupScript(code){ this._startupScript = code; return this }
		withHeaderTag(text){ this._headerTags.push(text); return this }
		withBodyTag(text){ this._bodyTags.push(text); return this }
		getHtml(){
			return (this._doctype || '')
				+ this.tag('html', {}, 
				'\n' + this.head({}, 
					'\n\t' + (this._title? this.title(this._title): '')
					+ '\n\t' + (this._metaRaw || '')
					+ '\n\t' + Object.keys(this._meta).map(k => this.meta(k, this._meta[k])).join('\n\t')
					+ (this._faviconType? '\n\t' + this.favicon(this._faviconType, this._faviconHref): '')
					+ (!this._startupScript? '':
						'\n\t' + this.script({
							type: 'text/javascript'}, 
							'window.onload = function(){ delete window.onload; '
							+ this._startupScript
							+ '};'
						)
					)
					+ '\n\t' + this._scripts.join('\n\t')
					+ '\n\t' + this._css.join('\n\t')
					+ '\n\t' + this._headerTags.join('\n\t')
				)
				+ '\n' + this.body({},
					'\n\t' + this._bodyTags.join('\n\t')
				)
			)
			
		}
		
		tag(tagName, attrs, bodyString, noClosingTagNeeded){
			// TODO: control tag names, attribute names and values for consistency
			if(typeof(bodyString) !== 'string' && bodyString && bodyString.length){
				bodyString = argsToArr(bodyString, 1);
			}
			
			if(Array.isArray(bodyString)){
				bodyString = bodyString.join('\n');
			}
			
			if(typeof(attrs) === 'string'){
				bodyString = attrs + '\n' + bodyString;
				attrs = null;
			}
			
			var result = '<' + tagName;
			var attrStr = !attrs? '': Object.keys(attrs).map(k => k + '="' + attrs[k] + '"').join(' ');
			if(attrStr)
				result += ' ' + attrStr;
			if(bodyString){
				if(noClosingTagNeeded){
					fail('Could not write tag ' + tagName + ': if there is a body, there must also be closing tag, but this tag assumes no closing tag.');
				}
				result += '>' + bodyString + '</' + tagName + '>'
			} else {
				if(noClosingTagNeeded)
					result += '>';
				else
					result += '/>';
			}
			return result;
		}
		
		script(attrs){ return this.tag('script', attrs, arguments) }
		style(attrs){ return this.tag('style', attrs, arguments) }
		div(attrs){ return this.tag('div', attrs, arguments) }
		title(text){ return this.tag('title', {}, text) }
		meta(k, v){ return this.tag('meta', {key: k, content: v}, '', true) }
		favicon(type, href){ return this.tag('link', {rel: 'shortcut icon', type: type, href: href}, '', true) }
		head(attrs){ return this.tag('head', attrs, arguments) }
		body(attrs){ return this.tag('body', attrs, arguments) }
		
	}
	
	return HtmlWriter;

});