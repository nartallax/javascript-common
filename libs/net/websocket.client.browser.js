pkg('net.websocket.client.browser', () => {

	var Event = pkg('util.event');

	class WebSocketClient {
		constructor(url){
			this.url = url;
			this.onMessage = new Event();
			this.onClose = new Event();
		}
		
		start(){
			return new Promise((ok, bad) => {
				this.socket && fail('Could not start socket connection: already connected.');
				this.socket = new WebSocket(this.url);
				this.socket.onerror = bad;
				this.socket.onopen = ok;
				this.socket.onmessage = msg => this.onMessage.fire(msg.data);
				this.socket.onclose = () => this.onClose.fire();
			});
		}
		
		stop(){
			this.socket || fail('Could not disconnect from socket: not connected.');
			this.socket.stop();
			this.socket = null;
		}
		
		write(msg){
			this.socket || fail('Could not write into socket: not connected.');
			this.socket.send(msg);
		}
	}
	
	return WebSocketClient;

});