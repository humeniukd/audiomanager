/* 3381:15 */
define(['./browser-utility', './protos'], function (BrowserUtility, protos) {
  function isHlsSupported(options) {
    return BrowserUtility.isChrome() && BrowserUtility.getChromeVersion() >= 35 && options.mediaSourceEnabled ||
      BrowserUtility.isSafari() && BrowserUtility.supportsHLSAudio()
  }

  function isSupported(options) {
    return function (protocol) {
      var supported = false;
      switch (protocol) {
        case protos.HTTP:
          supported = BrowserUtility.supportsHTML5Audio();
          break;
        case protos.HLS:
          supported = isHlsSupported(options)
      }
      return supported
    }
  }

  function getProtocols(protocols) {
    return (BrowserUtility.isSafari71() || BrowserUtility.isFirefox()) && (
      protocols = [protos.HTTP, protos.HLS, protos.RTMP]
    ),
    protocols
  }

  function prioritizeAndFilter(options) {
    options.protocols = getProtocols(options.protocols).filter(isSupported(options))
  }

  return {
    prioritizeAndFilter: prioritizeAndFilter
  };
});