import Webextension from "./Webextension";

new Webextension({
  extension: typeof browser !== "undefined" ? browser : chrome,
}).connect();
