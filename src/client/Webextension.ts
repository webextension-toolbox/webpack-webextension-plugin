export interface WebextensionOptions {
  quiet?: boolean;
  extension?: typeof browser | typeof chrome;
}

interface Notification {
  action: string;
  changedFiles: string[];
}

export default class Webextension {
  quiet: boolean;

  browser: typeof browser | typeof chrome;

  host: string;

  port: number;

  reconnectTime: number;

  fileRegex: RegExp;

  constructor({ quiet = false, extension }: WebextensionOptions = {}) {
    this.quiet = quiet;
    this.browser = extension;
    this.host = "{{host}}";
    this.port = parseInt("{{port}}", 10);
    this.reconnectTime = parseInt("{{reconnectTime}}", 10);
    this.fileRegex = /[^"]*\.[a-zA-Z]+/g;
  }

  /**
   * Simple namespaced logger
   */
  log(message: string, ...args: any) {
    if (!this.quiet) {
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
  getManifestFileDeps() {
    const manifest = this.browser.runtime.getManifest();
    const manifestStr = JSON.stringify(manifest);
    return manifestStr.match(this.fileRegex) || [];
  }

  /**
   * Handle messages from the server
   */
  handleServerMessage({ action, changedFiles }: Notification) {
    switch (action) {
      case "reload":
        this.smartReloadExtension(changedFiles);
        break;
      default:
        this.log("Unknown action: %s", action);
    }
  }

  /**
   * We don't like reopening our devtools after a realBrowser.runtime.reload.
   * Since it is not possible to open them programatically, we
   * need to reduce the runtime.reloads.
   * This function prefers softer reloads, by comparing
   * runtime depenencies with the changed files.
   *
   */
  smartReloadExtension(changedFiles: string[]): void {
    this.log("Reloading...");

    // Full reload if we have no changed files (dump reload!)
    if (!changedFiles) {
      this.log("Full Reload (no changed files)");
      this.browser.runtime.reload();
      return;
    }

    // Full reload manifest changed
    if (changedFiles.some((file) => file === "manifest.json")) {
      this.log("Full Reload (manifest.json changed)");
      this.browser.runtime.reload();
      return;
    }

    // Full reload if _locales changed
    if (changedFiles.some((file) => /^_locales\//.test(file))) {
      this.log("Full Reload (locales changed)");
      this.browser.runtime.reload();
      return;
    }

    // Full reload if manifest deps changed
    if (
      this.getManifestFileDeps().some((file) => changedFiles.includes(file))
    ) {
      this.log("Full Reload (manifest deps changed)");
      this.browser.runtime.reload();
      return;
    }

    // Reload current tab (smart reload)
    this.browser.tabs.reload();

    // Reload other extension views
    this.browser.extension
      .getViews()
      .map((_window) => _window.location.reload());
  }

  /**
   * Simple debounce function
   * Delay and throttle the execution
   * of the fs function
   */
  debounce(fn: Function, timeout = 300) {
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
  connect() {
    const connection = new WebSocket(`ws://${this.host}:${this.port}`);
    connection.onopen = () => {
      this.log("Connected");
    };
    connection.onmessage = (event) => {
      let payload: Notification;
      try {
        payload = JSON.parse(event.data);
      } catch (error) {
        this.log("Could not parse server payload");
      }
      this.handleServerMessage(payload);
    };
    connection.onerror = () => {
      this.log("Connection error.");
    };
    connection.onclose = () => {
      this.log(
        "Connection lost. Reconnecting in %ss'",
        this.reconnectTime / 1000
      );
      this.debounce(this.connect, this.reconnectTime);
    };
  }
}
