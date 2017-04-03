pkg('win.gdi32', () => {

		var ffi = pkg.external('ffi');

		return ffi.Library('gdi32', {
			GetPixel: ['uint32', ['uint32', 'int32', 'int32']]
        })

});