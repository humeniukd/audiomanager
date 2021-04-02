/* 51:16 */
define([], function () {
    return {
        supportHTML5Audio: function () {
            var a;
            try {
                if (window.HTMLAudioElement && "undefined" != typeof Audio)
                    return a = new Audio,
                        true
            } catch (e) {
                return false
            }
        },
        createAudioElement: function () {
            var a = document.createElement("audio");
            return a.setAttribute("msAudioCategory", "BackgroundCapableMedia"),
                a.mozAudioChannelType = "content",
                a
        },
        supportSourceSwappingWithPreload: function () {
            return /Firefox/i.test(navigator.userAgent)
        },
        isMobile: function (e) {
            var ua = window.navigator.userAgent,
                names = ["mobile", "iPhone", "iPad", "iPod", "Android", "Skyfire"];
            return names.some(function (name) {
                return name = new RegExp(name, "i"),
                    name.test(ua)
            })
        },
        isIE10Mobile: function () {
            return /IEmobile\/10\.0/gi.test(navigator.userAgent)
        },
        canPlayType: function (e) {
            var a = document.createElement("audio");
            return a && a.canPlayType && a.canPlayType(e).match(/maybe|probably/i) ? true : false
        },
        isNativeHlsSupported: function () {
            var test, isSafari, isIOS,
                ua = navigator.userAgent,
                iOS = ["iPhone", "iPad", "iPod"];
            return test = function (regex) {
                return regex.test(ua)
            },
            isSafari = !test(/chrome/i) && !test(/opera/i) && test(/safari/i),
            isIOS = iOS.some(function (name) {
                return test(new RegExp(name, "i"))
            }),
            isIOS || isSafari
        },
        isMSESupported: function () {
            return !(!window.MediaSource && !window.WebKitMediaSource)
        },
        isMSESupportMPEG: function () {
            var mediaSource = window.MediaSource || window.WebKitMediaSource;
            return mediaSource ? mediaSource.isTypeSupported("audio/mpeg") : false
        }
    }
});
