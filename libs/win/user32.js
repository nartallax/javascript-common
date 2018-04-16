pkg('win.user32', () => {

	var ffi = pkg.external('ffi'),
		ref = pkg.external('ref'),
		Struct = pkg.external('ref-struct'),
		refArray = pkg.external('ref-array'),
		consts = pkg('win.consts');
		
	var rect = Struct({
        left: 'long',
        top: 'long',
        right: 'long',
        bottom: 'long'
    });
		
	var mouseInput = Struct({
		dx: 'long',
		dy: 'long',
		mouseData: 'ulong',
		dwFlags: 'ulong',
		time: 'ulong',
		dwExtraInfo: ref.refType('ulong')
	});
		
	var input = Struct({
		type: 'ulong',
		mi: mouseInput // in fact, not only mouse, but keyboard and hardware; it's union
	});
	
	var kbDllHookStruct = Struct({
		vkCode: 'ulong',
		scanCode: 'ulong',
		flags: 'ulong',
		time: 'ulong',
		dwExtraInfo: 'ulong'
	});
	
	var point = Struct({
		x: 'long',
		y: 'long'
	});
	
	var msg = Struct({
		hwnd: 'long',
		message: 'uint',
		wparam: 'uint',
		lparam: ref.refType('void'),
		time: 'ulong',
		pt: point
	});
	
	var inputArray = refArray(input);
		
	var user32 = ffi.Library('user32', {
		RegisterHotKey: ['bool', ['uint', 'int', 'uint', 'uint']],
		SetWindowsHookExW: ['long', ['int', ref.refType('void'), 'long', 'ulong']],
		CallNextHookEx: [ref.refType('void'), ['long', 'int', 'uint', ref.refType('void')]],
		GetForegroundWindow: ['long', []],
		GetTopWindow: ['long', ['long']],
		GetWindowTextLengthA: ['int', ['long']],
		GetWindowTextA: ['int', ['long', ref.refType('void'), 'int']],
		GetWindowThreadProcessId: ['ulong', ['long', ref.refType('ulong')]],
		GetWindow: ['long', ['long', 'uint32']],
		PostMessageA: ['bool', ['long', 'uint', 'long', 'long']],
		PostMessageW: ['bool', ['long', 'uint', 'long', 'long']],
		SendMessageA: ['bool', ['long', 'uint', 'long', 'long']],
		MapVirtualKeyA: ['uint', ['uint', 'uint']],
		SetForegroundWindow: ['bool', ['long']],
		GetWindowRect: ['bool', ['long', ref.refType(rect)]],
		SetCursorPos: ['bool', ['int32', 'int32']],
		GetDC: ['uint32', ['uint32']],
		ReleaseDC: ['uint32', ['uint32','uint32']],
		mouse_event: ['void', ['uint32','uint32','uint32','uint32','uint32']],
		ShowWindow: ['bool', ['long', 'int32']],
		BringWindowToTop: ['bool', ['long']],
		AttachThreadInput: ['bool', ['ulong', 'ulong', 'bool']],
		SendInput: ['uint', ['uint', inputArray, 'int']],
		SetWindowPos: ['bool', ['long', 'long', 'int', 'int', 'int', 'int', 'uint']],
		PeekMessageW: ['bool', [ref.refType(msg), 'long', 'uint', 'uint', 'uint']],
		GetKeyboardState: ['bool', ['uint8*']],
		GetKeyState: ['short', ['int']]
	});
	
	user32.rect = rect;
	user32.input = input;
	user32.mouseInput = mouseInput;
	user32.inputArray = inputArray;
	user32.kbDllHookStruct = kbDllHookStruct;
	user32.msg = msg;
	
	user32.scByVk = (() => {
		var cache = {};
		return vk => vk in cache? cache[vk]: (cache[vk] = user32.MapVirtualKeyA(vk, 0));
	})();
	
	return user32;

})