pkg('net.http.server.node', () => {

	const http = pkg.external('http'),
		Event = pkg('util.event');

	return class Server {
		
		constructor(host, port){
			this.port = port || null;
			this.host = host || null;
			this.onRequest = new Event();
		}
		
		async start(){
			this.server = http.createServer((req, resp) => this.onRequest.fire({request: req, response: resp}));
			return new Promise((ok, bad) => {
				this.server.listen(this.port, this.host, err => err? bad(err): ok());
			});
		}
		
		async stop(){
			this.server || fail('Could not stop: server not started.');
			return new Promise((ok, bad) => {
				this.server.close(err => err? bad(err): ok());
			});
		}
		
	};

});