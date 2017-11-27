// обертка вокруг виндовой утилиты netsh
pkg('win.netsh', () => {
	
	const cp = pkg.external('child_process');
	
	const Netsh = class {
		constructor(protocol){
			this.protocol = protocol || 'ip';
		}
		
		formCommand(addition){ return 'netsh int ' + this.protocol + ' ' + addition; }
		async executeCommand(addition){ 
			const cmd = this.formCommand(addition);
			const { stdout, stderr } = await cp.exec(cmd);
			stderr && fail('Failed to execute shell command:\n\t' + cmd + '\nGot unexpected non-empty stderr:\n' + stderr);
			return stdout;
		}
		
		
		async getInterfaces(){
			const raw = await this.executeCommand('sh int');
			return raw.split('\n')
				.map(x => x.trim())
				.dropWhile(x => x.charAt(0) !== '-')
				.drop(1)
				.map(x => x.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.*?)$/))
				.filter(x => x)
				.map(x => ({
					'id': parseInt(x[1]),
					'mark': parseInt(x[2]),
					'mtu': parseInt(x[3]),
					'connected': (x[4] = (x[4] || '').toLowerCase()) === 'connected'? true: x[4] === 'disconnected'? false: fail('Unexpected connection status: "' + x[4] + '".'),
					'name': x[5]
				}))
				.map(x => {
					var badKeys = Object.keys(x).filter(k => Number.isNaN(x[k]) || x[k] === null || x[k] === undefined);
					badKeys.length && fail('Failed to parse output of netsh for field(s) ' + badKeys.join(', ') + '.');
					return x;
				});
		}
		
		async getLoopbackInterface(){ 
			const matchingInterfaces = (await this.getInterfaces()).filter(x => x.name.toLowerCase().match(/loopback/));
			matchingInterfaces.length < 1 
				&& fail('Could not find loopback interface: no candidates matched.');
			matchingInterfaces.length > 1 
				&& fail('Could not find loopback interface: more than one candidate matched ("' + matchingInterfaces.map(x => x.name).join('", "') + '").');
			return matchingInterfaces[0];
		}
		
		
		
	}
	
	return Netsh;
	
});