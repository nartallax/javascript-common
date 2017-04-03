pkg('win.api', () => {
	
	var result = {};
	
	[
		pkg('win.kernel32'),
		pkg('win.user32'),
		pkg('win.gdi32'),
		pkg('win.consts')
	].forEach(lib => Object.keys(lib).forEach(k => result[k] = lib[k]));
	
	return result;
	
});