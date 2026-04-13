import Webextension from "./Webextension";

(function webextensionAutoReload({ browser = null, chrome = null }) {
  new Webextension({ extension: browser || chrome }).connect();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
})(window as any);
