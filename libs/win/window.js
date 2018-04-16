pkg('win.window', () => {
	
	var winapi = pkg('win.api'),
		ref = pkg.external('ref');

	var Window = function(hwnd, flags){ 
		this.hwnd = hwnd; 
		this.flags = flags || {};
		
		var pidref = ref.alloc('ulong');
		this.tid = winapi.GetWindowThreadProcessId(hwnd, pidref);
		this.pid = pidref.deref();
	};

	Window.hwndsByPID = pid => {
		var hwnd = winapi.GetTopWindow(0),
			result = [];
			
		while(hwnd){
			var pidref = ref.alloc('ulong');
			winapi.GetWindowThreadProcessId(hwnd, pidref);
			(pidref.deref() === pid) && result.push(hwnd);
			hwnd = winapi.GetWindow(hwnd, 2);
		}
		
		return result;
	};
	
	Window.byPID = pid => {
		var hwnds = Window.hwndsByPID(pid);
		return hwnds.length < 1? null: new Window(hwnds[0]);
	};
	
	Window.prototype = {
		getCaption: function(){
			var len = winapi.GetWindowTextLengthA(this.hwnd),
			str = Buffer.allocUnsafe(len + 1);
			winapi.GetWindowTextA(this.hwnd, str, len + 1);
			return ref.readCString(str, 0);
		},
		
		sendChar: function(ch){
			winapi.PostMessageW(this.hwnd, winapi.WM_CHAR, ch.charCodeAt(0), 0);
		},
		
		sendKeyPress: function(vk, isDown){
			winapi.PostMessageA(this.hwnd, isDown? winapi.WM_KEYDOWN: winapi.WM_KEYUP, vk, winapi.scByVk(vk) << 16);
		},
		
		sendKey: function(vk, isDown){
			if(this.flags.sendPreferChars && (winapi.vkReverse[vk] || '').length === 1){
				this.sendChar(winapi.vkReverse[vk]);
			} else {
				if(isDown !== true && isDown !== false){
					this.sendKeyPress(vk, true);
					(this.flags.sendDownOnly || this.sendKeyPress(vk, false));
				} else {
					this.sendKeyPress(vk, isDown);
				}
			}
			
		},
		
		moveCursor: function(offsetX, offsetY){
			var rect = this.getRect();
			winapi.SetCursorPos(rect.left + offsetX, rect.top + offsetY);
		},
		
		colorAt: function(offsetX, offsetY){
			var rect = this.getRect();
			var hdc = winapi.GetDC(0);
            var pixel = winapi.GetPixel(hdc, rect.left + offsetX, rect.top + offsetY);
            winapi.ReleaseDC(0, hdc);
			
			return {
                r: (pixel & 0x0000ff) >> 0,
                g: (pixel & 0x00ff00) >> 8,
                b: (pixel & 0xff0000) >> 16,
                rgb: pixel & 0xffffff
            }
		},
		
		getRect: function(){
			var result = new winapi.rect();
			winapi.GetWindowRect(this.hwnd, result.ref());
			return result;
		},
		
		moveTo: function(x, y){ winapi.SetWindowPos(this.hwnd, 0, x, y, 0, 0, winapi.SWP_NOZORDER | winapi.SWP_NOSIZE); },
		
		sendKeyString: function(str){
			var parts = str.match(/(?:\{[a-z\d\s]+\}|[^{}]+)/g)
			parts.forEach(part => {
				if(part.startsWith('{')){
					var subparts = part.substring(1, part.length - 1).split(' ').filter(x => x)
					this.sendKey(winapi.vk[subparts[0]], subparts[1] === 'down'? true: subparts[1] === 'up'? false: null);
				} else {
					for(var i = 0; i < part.length; i++){
						this.sendChar(part.charAt(i));
					}
				}
			})
		},
		
		postMessage: function(msgId, wparam, lparam){
			winapi.PostMessageA(this.hwnd, winapi[msgId], wparam, lparam);
		},
		
		forceBringToFront: function(){
			var fgTid = winapi.GetWindowThreadProcessId(winapi.GetForegroundWindow(), ref.NULL);
			if(fgTid !== this.tid){
				winapi.AttachThreadInput(fgTid, this.tid, true);
				this.setForeground();
				this.bringToTop();
				winapi.AttachThreadInput(fgTid, this.tid, false);
			} else {
				this.setForeground();
				this.bringToTop();
			}
		},
		
		bringToTop: function(){ winapi.BringWindowToTop(this.hwnd); },
		setForeground: function(){ winapi.SetForegroundWindow(this.hwnd); },
		showWindow: function(type){ winapi.ShowWindow(this.hwnd, winapi[type || 'SW_SHOW']); },
		minimize: function(){ this.showWindow('SW_MINIMIZE'); },
		
		click: function(x, y, isRight, timeSpacing, cb){
			if(typeof(x) === 'number' && typeof(x) === 'number'){
				this.moveCursor(x, y);
			}
			
			setTimeout(() => {
				winapi.mouse_event(isRight? winapi.MOUSEEVENTF_RIGHTDOWN: winapi.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
				setTimeout(() => {
					winapi.mouse_event(isRight? winapi.MOUSEEVENTF_RIGHTUP: winapi.MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
					cb && setTimeout(cb, timeSpacing);
				}, timeSpacing);
			}, timeSpacing);
			
		},
		
		setAffinity: function(cores){ winapi.setAvailableProcessorCoresFor(this.pid, cores); }
	}
	
	return Window;
	
});