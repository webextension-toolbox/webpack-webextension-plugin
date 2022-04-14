import Webextension from "./Webextension";

(function webextensionAutoReload({ browser = null, chrome = null }) {
  new Webextension({ extension: browser || chrome }).connect();
})(window);
