pkg('html.parser.node', () => {

	const parse5 = pkg.external('parse5'),
		xmlSerializer = pkg.external('xmlserializer'),
		xmlDom = pkg.external('xmldom').DOMParser,
		xpath = pkg.external('xpath').useNamespaces({"x": "http://www.w3.org/1999/xhtml"});
		
	let configured = false;
		
	return htmlString => {
		typeof(htmlString) === 'string' || fail('Expected HTMLString to be string; it is ' + typeof(htmlString) + ' instead.');
		htmlString.length > 0 || fail('Expected HTMLString to be non-empty.');
		
		const htmlHalfDom = parse5.parse(htmlString);
		const xhtmlString = xmlSerializer.serializeToString(htmlHalfDom);
		const dom = new xmlDom().parseFromString(xhtmlString);
		
		dom.xpath = (path, node) => xpath(path, node || dom);
		
		return dom;
	}

});