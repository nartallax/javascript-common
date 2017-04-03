pkg('win.kernel32', () => {

	var ffi = pkg.external('ffi'),
		ref = pkg.external('ref'),
		Struct = pkg.external('ref-struct'),
		consts = pkg('win.consts');

	var systemInfo = Struct({
		dwOemId: 'ulong',
		dwPageSize: 'ulong',
		lpMinimumApplicationAddress: ref.refType('void'),
		lpMaximumApplicationAddress: ref.refType('void'),
		//dwActiveProcessorMask: ref.refType('ulong'),
		dwActiveProcessorMask: 'ulong',
		dwNumberOfProcessors: 'ulong',
		dwProcessorType: 'ulong',
		dwAllocationGranularity: 'ulong',
		wProcessorLevel: 'uint',
		wProcessorRevision: 'uint'
	});
		
	var kernel32 = ffi.Library('Kernel32', {
		GetCurrentThreadId: ['uint', []],
		GetLastError: ['ulong', []],
		GetModuleHandleW: ['long', [ref.refType('int8')]],
		GetSystemInfo: ['void', [ref.refType(systemInfo)]],
		SetProcessAffinityMask: ['bool', ['ulong', 'ulong']],
		OpenProcess: ['ulong', ['ulong', 'bool', 'ulong']],
		CloseHandle: ['bool', ['ulong']]
	});
	
	kernel32.systemInfo = systemInfo;
	
	kernel32.getAvailableProcessorCores = () => {
		var sysinfo = new systemInfo();
		kernel32.GetSystemInfo(sysinfo.ref());
		
		var result = [];
		
		var mask = sysinfo.dwActiveProcessorMask,
			i = 0;
		while(mask){
			(mask & 1) && result.push(i);
			i++;
			mask = Math.floor(mask / 2);
		}
		
		return result;
	}
	
	kernel32.setAvailableProcessorCoresFor = (pid, processorIndices) => {
		var mask = 0, map = {}, max = 0;
		
		processorIndices.forEach(i => {
			(i > max) && (max = i);
			map[i] = true;
		})
		
		for(var i = max; i >= 0; i--){
			mask *= 2;
			map[i] && (mask += 1);
		}
		
		var handle = kernel32.OpenProcess(consts.PROCESS_SET_INFORMATION, false, pid);
		if(!handle){
			throw new Error('Failed to acquire handle for setting processor information: error code ' + kernel32.GetLastError());
		}
		
		if(!kernel32.SetProcessAffinityMask(handle, mask)){
			throw new Error('Failed to call SetProcessAffinityMask: error code ' + kernel32.GetLastError());
		}
		
		if(!kernel32.CloseHandle(handle)){
			throw new Error('Failed to close process handle after setting affinity: error code ' + kernel32.GetLastError());
		}
	}
	
	return kernel32;

});