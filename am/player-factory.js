/* 51:15 */
(function() {
    var Self,
        Utils = require('./utils'), //n(16),
        HLSAudioPlayer = require('./players/html5-hls'), //n(45),
        HLSSingleAudioPlayer = require('./players/hls-single'), //n(49),
        HTML5AudioPlayer = require('./players/html5'), //n(46),
        HTML5SingleAudioPlayer = require('./players/html5-single'), //n(48),
        HLSMSEPlayer = require('./players/mse'), //n(50),
        Mime = require('./mime'); //n(118);
    Self = function() {};

    Self.createAudioPlayer = function(descriptor, settings) {
        var protocol;
        if (
            descriptor.mimeType = Self.getMimeType(descriptor),
            descriptor.mimeType === Mime.M3U8
        ) {
            if (Utils.isMSESupportMPEG() || Utils.isMSESupportMP4())
                return new HLSMSEPlayer(descriptor, settings);
            if (Utils.isNativeHlsSupported() && !descriptor.forceCustomHLS)
                return Utils.isMobile() || descriptor.forceSingle ?
                    new HLSSingleAudioPlayer(descriptor, settings) :
                    new HLSAudioPlayer(descriptor, settings)
        } else {
            if (Utils.supportHTML5Audio() && Utils.canPlayType(descriptor.mimeType) || descriptor.forceHTML5)
                return Utils.isMobile() || descriptor.forceSingle ?
                    new HTML5SingleAudioPlayer(descriptor, settings) :
                    new HTML5AudioPlayer(descriptor, settings);
        }
        return null
    },
    Self.getMimeType = function(descr) {
        if (descr.mimeType)
            return descr.mimeType;
        var ext = descr.src.split("?")[0];
        return ext = ext.substring(ext.lastIndexOf(".") + 1, ext.length),
            Mime.getTypeByExtension(ext)
    }
    module.exports = Self;
}())
