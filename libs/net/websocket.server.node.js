pkg('net.websocket.server.node', () => {

	let ws = pkg.external('ws'),
		Event = pkg('util.event');
		
	// TODO: heartbeat-based disconnect detection
	class WebSocketServer {
		constructor(port){
			this.port = port;
			this.onConnect = new Event();
		}
		
		start(){
			this.server && fail('Could not start websocket server: already running.')
			this.server = new ws.Server({port: this.port});
			this.server.on('connection', (socket, request) => {
				var onMessage = new Event(),
					onDisconnect = new Event();
					
				socket.on('close', () => {
					//socket.close();
					socket.terminate();
					onDisconnect.fire();
					
					onMessage.stop();
					onDisconnect.stop();
				});
				socket.on('message', msg => onMessage.fire(msg));
				
				this.onConnect.fire({ 
					onMessage: onMessage, 
					onDisconnect: onDisconnect,
					write: msg => socket.send(msg),
					ip: request.connection.remoteAddress 
				})
			});
		}
		
		stop(){
			this.server || fail('Could not stop websocket server: not running.')
			this.server.close();
			this.server = null;
		}
	}
	
	return WebSocketServer;

})