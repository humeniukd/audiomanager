/* 3381:5 */
(function () {
  function testRegex(e) {
    return e.test(window.navigator.userAgent.toLowerCase())
  }

  function testRegexN(regex, options) {
    try {
      return window.navigator.userAgent.toLowerCase().match(regex)[options]
    } catch (e) {
      return null
    }
  }

  function getChromeVersion() {
    try {
      return parseInt(testRegexN(/chrom(e|ium)\/([0-9]+)\./, 2))
    } catch (e) {
      return 0 / 0
    }
  }

  function isSafari() {
    return !isChrome() && testRegex(/safari/)
  }

  function isSafari71() {
    return isSafari() && testRegex(/version\/7\.1/)
  }

  function isChrome() {
    return testRegex(/chrom(e|ium)/)
  }

  function isFirefox() {
    return testRegex(/firefox/)
  }

  function supportsHTML5Audio() {
    try {
      return window.hasOwnProperty("Audio") && !!(new window.Audio).canPlayType("audio/mpeg")
    } catch (e) {
      return false
    }
  }

  function supportsHLSAudio() {
    try {
      var isSafari5 = isSafari() && testRegex(/version\/5\.0/),
        mpegURL = window.hasOwnProperty("Audio") && (
          !!(new window.Audio).canPlayType('audio/x-mpegURL; codecs="mp3"') ||
          !!(new window.Audio).canPlayType('vnd.apple.mpegURL; codecs="mp3"')
        );
      return !isSafari5 && mpegURL
    } catch (e) {
      return false
    }
  }

  function extractVersion(ver) {
    if (!ver)
      return 0;
    var parts = ver.match(/\d\S+/)[0].replace(/,/g, ".").split(".");
    return parseFloat([parts[0], parts[1]].join(".")) || 0
  }
  module.exports = {
    isSafari: isSafari,
    isSafari71: isSafari71,
    isChrome: isChrome,
    getChromeVersion: getChromeVersion,
    isFirefox: isFirefox,
    supportsHLSAudio: supportsHLSAudio,
    supportsHTML5Audio: supportsHTML5Audio,
  }
}())