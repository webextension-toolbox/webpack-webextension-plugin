var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
(function webextensionAutoReload(_a) {
    var WebSocket = _a.WebSocket, browser = _a.browser;
    var host = "{{host}}";
    var port = "{{port}}";
    var reconnectTime = parseInt("{{reconnectTime}}", 10);
    var quiet = false;
    var fileRegex = /[^"]*\.[a-zA-Z]+/g;
    /**
     * Simple namespaced logger
     */
    function log(message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!quiet) {
            console.log.apply(console, __spreadArray(["%cwebpack-webextension-plugin: ".concat(message), "color: gray;"], args, false));
        }
    }
    /**
     * Return all files depenencies listed
     * in the manifest.json.
     */
    function getManifestFileDeps() {
        var manifest = browser.runtime.getManifest();
        var manifestStr = JSON.stringify(manifest);
        return manifestStr.match(fileRegex) || [];
    }
    /**
     * We don't like reopening our devtools after a browser.runtime.reload.
     * Since it is not possible to open them programatically, we
     * need to reduce the runtime.reloads.
     * This function prefers softer reloads, by comparing
     * runtime depenencies with the changed files.
     *
     */
    function smartReloadExtension(changedFiles) {
        log("Reloading ...");
        // Full reload if we have no changed files (dump reload!)
        if (!changedFiles) {
            browser.runtime.reload();
            return;
        }
        // Full reload manifest changed
        if (changedFiles.some(function (file) { return file === "manifest.json"; })) {
            browser.runtime.reload();
            return;
        }
        // Full reload if _locales changed
        if (changedFiles.some(function (file) { return /^_locales\//.test(file); })) {
            browser.runtime.reload();
            return;
        }
        // Full reload if manifest deps changed
        if (getManifestFileDeps().some(function (file) { return changedFiles.includes(file); })) {
            browser.runtime.reload();
            return;
        }
        // Reload current tab (smart reload)
        browser.tabs.reload();
        // Reload other extension views
        browser.extension.getViews().map(function (_window) { return _window.location.reload(); });
    }
    /**
     * Handle messages from the server
     */
    function handleServerMessage(_a) {
        var action = _a.action, changedFiles = _a.changedFiles;
        switch (action) {
            case "reload":
                smartReloadExtension(changedFiles);
                break;
            default:
                log("Unknown action: %s", action);
        }
    }
    /**
     * Simple debounce function
     * Delay and throttle the execution
     * of the fs function
     */
    function debounce(fn, timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = 300; }
        var timer;
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(_this, args);
            }, timeout);
        };
    }
    /**
     * Connect to the server
     */
    function connect() {
        var connection = new WebSocket("ws://".concat(host, ":").concat(port));
        connection.onopen = function () {
            log("Connected");
        };
        connection.onmessage = function (event) {
            var payload;
            try {
                payload = JSON.parse(event.data);
            }
            catch (error) {
                log("Could not parse server payload");
            }
            handleServerMessage(payload);
        };
        connection.onerror = function () {
            log("Connection error.");
        };
        connection.onclose = function () {
            log("Connection lost. Reconnecting in %ss'", reconnectTime / 1000);
            debounce(connect, reconnectTime);
        };
    }
    connect();
})(window);
