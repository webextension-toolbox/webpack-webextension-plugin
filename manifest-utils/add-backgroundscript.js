module.exports = function addBackgroundscript(manifest, path) {
	var target;
	if (manifest.app) {
		target = manifest.app;
	} else {
		target = manifest;
	}

	if (!target.background) {
		target.background = {};
	}

	if (!target.background.scripts) {
		target.background.scripts = []
	}

	target.background.scripts = [
		path,
		...target.background.scripts
	]

	return manifest
}

