pkg('net.http.client.node', () => {

	const http = pkg.external('http'),
		https = pkg.external('https'),
		Url = pkg.external('url');
	
	const dataHandlers = {
		gatherBufferArray: (data, x) => ((x || (x = [])).push(data), x)
	}
	
	const postProcessors = {
		toUtf8String: x => Buffer.concat(x || []).toString('utf8'),
		toBuffer: x => Buffer.concat(x || [])
	}
	
	const errorCodeSignallers = {
		not2xx3xx: x => ((x = ~~(x / 100)), x !== 2 && x !== 3)
	}
	
	class Client {
		constructor({ 
			headers = {}, 
			timeout = 180000,
			timeoutJitter = 15000,
			dataHandler = dataHandlers.gatherBufferArray, 
			postProcessor = postProcessors.toUtf8String,
			errorCodeSignaller = errorCodeSignallers.not2xx3xx,
			followRedirects = true,
		} = {}){
			this.timeoutJitter = timeoutJitter;
			this.timeout = timeout;
			this.defaultHeaders = headers;
			this.dataHandler = dataHandler;
			this.postProcessor = postProcessor;
			this.followRedirects = followRedirects;
			this.errorCodeSignaller = errorCodeSignaller;
		}
		
		makeRequest({ 
			url = "", method = "",
			headers = {}, timeout = this.timeout, timeoutJitter = this.timeoutJitter,
			body = null,
			dataHandler = this.dataHandler, postProcessor = this.postProcessor, errorCodeSignaller = this.errorCodeSignaller,
			followRedirects = this.followRedirects
		} = {}){
			return new Promise((ok, _bad) => {
				let finished = false;
				let bad = e => {
					//console.log("http network error", e);
					if(finished) return;
					finished = true;
					clearTimeout(forceBreakTimeout);
					_bad(e);
				}
				const parsedUrl = Url.parse(url),
					protocol = (parsedUrl.protocol || '').toLowerCase().replace(/[^a-z]/g, '')
				
				const externalLib = protocol === 'https'? https: http;
				
				const options = {
					hostname: parsedUrl.host,
					path: parsedUrl.path,
					port: parsedUrl.port || (protocol === 'https'? 443: 80),
					method: method,
					headers: Object.assign(headers, this.defaultHeaders),
					timeout: timeout
				};
				
				let result = undefined;
				const request = externalLib.request(options, resp => {
					const code = resp.statusCode,
						headers = resp.headers;
					
					let onData = buffer => {
							//console.log("http got some data");
							result = dataHandler(buffer, result);
						},
						onEnd = () => {
							if(finished) return; 
							finished = true;
							clearTimeout(forceBreakTimeout);
							ok({ data: postProcessor(result), headers: headers, code: code, url: url})
						};
					
					if(followRedirects && ~~(code / 100) === 3){
						onData = _ => {};
						onEnd = async () => {
							try {
								const arg = arguments[0];
								const loc = headers[Object.keys(headers).find(x => x.toLowerCase() === 'location')];
								loc || fail('Got redirect HTTP code (' + code + '), but no Location header present.');
								arg.url = loc;
								ok(await this.makeRequest.call(this, arg));
							} catch(e){
								bad(e)
							}
						}
					} else if(errorCodeSignaller(code)) {
						return bad(new Error('Bad HTTP response code returned from ' + url + ': ' + code));
					}
					
					resp.on('error', bad);
					resp.on('data', onData);
					resp.on('end', onEnd)
				});
				
				request.on('error', bad);
				
				//console.log("http writing body")
				if(body)
					request.write(body);
				
				//console.log("http request sent.")
				request.end();
				
				let forceBreakTimeout = setTimeout(() => {
					//console.log("Http hanged request detected.");
					bad(new Error("Force timed out: no response from underlying layer. Seems like hang."));
				}, timeout + timeoutJitter);
			});
		}
		
		get(params){ 
			params.method = "GET";
			return this.makeRequest(params);
		}
		
		post(params){
			("body" in params) || fail("Expected POST request to have body.");
			params.method = "POST"
			return this.makeRequest(params);
		}
	}
	
	Client.postProcessors = postProcessors;
	Client.dataHandlers = dataHandlers;
	Client.errorCodeSignallers = errorCodeSignallers;
	
	return Client;

});