import Webextension from "./Webextension";

interface WebextensionWindow {
  browser?: typeof browser;
  chrome?: typeof chrome;
}

(function webextensionAutoReload({ browser = null, chrome = null }) {
  new Webextension({ extension: browser || chrome }).connect();
})(window as Window & WebextensionWindow);
