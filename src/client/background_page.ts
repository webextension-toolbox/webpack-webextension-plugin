interface Notification {
  action: string;
  changedFiles: string[];
}

(function webextensionAutoReload({ WebSocket, browser = null, chrome = null }) {
  const realBrowser = browser || chrome;
  const host = "{{host}}";
  const port = "{{port}}";
  const reconnectTime = parseInt("{{reconnectTime}}", 10);
  const quiet = false;
  const fileRegex = /[^"]*\.[a-zA-Z]+/g;

  /**
   * Simple namespaced logger
   */
  function log(message: string, ...args: any) {
    if (!quiet) {
      console.log(
        `%cwebpack-webextension-plugin: ${message}`,
        "color: gray;",
        ...args
      );
    }
  }

  /**
   * Return all files depenencies listed
   * in the manifest.json.
   */
  function getManifestFileDeps() {
    const manifest = realBrowser.runtime.getManifest();
    const manifestStr = JSON.stringify(manifest);
    return manifestStr.match(fileRegex) || [];
  }

  /**
   * We don't like reopening our devtools after a realBrowser.runtime.reload.
   * Since it is not possible to open them programatically, we
   * need to reduce the runtime.reloads.
   * This function prefers softer reloads, by comparing
   * runtime depenencies with the changed files.
   *
   */
  function smartReloadExtension(changedFiles: string[]): void {
    log("Reloading...");

    // Full reload if we have no changed files (dump reload!)
    if (!changedFiles) {
      log("Full Reload (no changed files)");
      realBrowser.runtime.reload();
      return;
    }

    // Full reload manifest changed
    if (changedFiles.some((file) => file === "manifest.json")) {
      log("Full Reload (manifest.json changed)");
      realBrowser.runtime.reload();
      return;
    }

    // Full reload if _locales changed
    if (changedFiles.some((file) => /^_locales\//.test(file))) {
      log("Full Reload (locales changed)");
      realBrowser.runtime.reload();
      return;
    }

    // Full reload if manifest deps changed
    if (getManifestFileDeps().some((file) => changedFiles.includes(file))) {
      log("Full Reload (manifest deps changed)");
      realBrowser.runtime.reload();
      return;
    }

    // Reload current tab (smart reload)
    realBrowser.tabs.reload();

    // Reload other extension views
    realBrowser.extension
      .getViews()
      .map((_window) => _window.location.reload());
  }

  /**
   * Handle messages from the server
   */
  function handleServerMessage({ action, changedFiles }: Notification) {
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
  function debounce(fn: Function, timeout = 300) {
    let timer: NodeJS.Timeout;
    return (...args: any) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, timeout);
    };
  }

  /**
   * Connect to the server
   */
  function connect() {
    const connection = new WebSocket(`ws://${host}:${port}`);
    connection.onopen = () => {
      log("Connected");
    };
    connection.onmessage = (event) => {
      let payload: Notification;
      try {
        payload = JSON.parse(event.data);
      } catch (error) {
        log("Could not parse server payload");
      }
      handleServerMessage(payload);
    };
    connection.onerror = () => {
      log("Connection error.");
    };
    connection.onclose = () => {
      log("Connection lost. Reconnecting in %ss'", reconnectTime / 1000);
      debounce(connect, reconnectTime);
    };
  }

  connect();
})(window);
