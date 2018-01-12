pkg("net.http.client.browser", () => {
	
	let listen = (obj, eventName, handler) => typeof(obj.addEventListener) === "function"
		? obj.addEventListener(eventName, handler)
		: obj.attachEvent(eventName, handler);
	
	class Client {
		constructor(){
		}
		
		makeRequest({url, method, headers, body, okCallback, errCallback}){
			let result;
			if(!okCallback)
				result = new Promise((ok, bad) => {
					okCallback = ok;
					errCallback = bad;
				});
				
			setTimeout(() => {
				try {
					let done = false;
					let req = new XMLHttpRequest();
					
					listen(req, "load", x => okCallback({data: req.responseText}));
					listen(req, "error", x => errCallback(x));
					req.open(method, url, true);
					req.setRequestHeader("Content-type", "application/json");
					Object.keys(headers || {}).forEach(hname => req.setRequestHeader(hname, headers[hname]));
					
					body? req.send(body): req.send();
				} catch(e){ errCallback(e) }
			}, 1);
			
			return result;
		}
	}
	
	return Client;
	
});