(function() {
    var Self,
        VolumeAutomator,
        Events = require('./events'),
        _ = require('underscore'),
        extend = _.extend,
        setImmediate = require('./worker').setImmediate,
    Algos = {
        Linear: 0,
        EaseIn: 1,
        EaseOut: 2,
        EaseInOut: 3
    };
    module.exports = Self = {},
    Self.VolumeAutomator = VolumeAutomator = function(e) {
        if (this.scAudio = e,
            this.fadeOutAlgo = this.options().fadeOutAlgo,
            this.fadeOutActive = false,
            this.initialVolume = void 0,
            VolumeAutomator.isSupported()
        ) {
            var options = this.options();
            [
                "fadeOutDurationOnPause",
                "fadeOutDurationOnFinish",
                "fadeOutDurationOnConcurrentStreaming"
            ].forEach(function(e) {
                "number" != typeof options[e] && (options[e] = 0)
            }),
            this.scAudio.registerHook("pause", this.hookPause.bind(this)),
            this.scAudio.on(Events.TIME, this.onTime, this),
            this.scAudio.on(Events.PLAY_RESUME, this.onPlay, this)
        }
    },
    Self.VolumeAutomator.isSupported = function() {
        var audio = new window.Audio,
            volume = audio.volume,
            newVolume = 0 === volume ? 1 : volume / 2;
        return audio.volume = newVolume,
            audio.volume === newVolume
    },
    Self.VolumeAutomator.Algos = Algos,
    extend(VolumeAutomator.prototype, {
        options: function() {
            return this.scAudio.options
        },
        doFadeOut: function(e, t, n, i) {
            this.fadeOutActive = true;
            var now = Date.now() - (n || 0),
            fade = function() {
                if (this.fadeOutActive) {
                    var k,
                        ms = (Date.now() - now) / t;
                    if (ms >= 1)
                        e && (
                            this.scAudio.trigger(Events.PAUSE, i),
                            this.scAudio.callPauseOnController()
                        ),
                        this.cancelFadeout();
                    else {
                        switch (this.fadeOutAlgo) {
                            case Algos.Linear:
                                k = 1 - ms;
                                break;
                            case Algos.EaseIn:
                                k = 1 - ms * ms;
                                break;
                            case Algos.EaseOut:
                                k = 1 / (10 * (ms + .1)) - .05;
                                break;
                            case Algos.EaseInOut:
                            default:
                                k = Math.cos(ms * Math.PI) / 2 + .5
                        }
                        this.scAudio.setVolume(this.initialVolume * k),
                        setImmediate(fade)
                    }
                }
            }.bind(this);
            this.initialVolume = this.scAudio.getVolume(),
            fade()
        },
        cancelFadeout: function() {
            this.fadeOutActive && (
                this.fadeOutActive = false,
                this.scAudio.setVolume(this.initialVolume),
                this.initialVolume = void 0
            )
        },
        isFadeOutEnabled: function() {
            return this.options().fadeOutDurationOnConcurrentStreaming ||
                this.options().fadeOutDurationOnPause ||
                this.options().fadeOutDurationOnFinish
        },
        hookPause: function(e) {
            return this.options().fadeOutDurationOnConcurrentStreaming && "concurrent_streaming" === e.pause_reason ?
                (
                    this.doFadeOut(true, this.options().fadeOutDurationOnConcurrentStreaming, 0, e),
                    false
                ) :
                this.options().fadeOutDurationOnPause ? (
                    this.doFadeOut(true, this.options().fadeOutDurationOnPause, 0, e),
                    false
                ) :
            true
        },
        onPlay: function() {
            this.isFadeOutEnabled() && this.cancelFadeout()
        },
        onTime: function() {
            if (this.options().fadeOutDurationOnFinish) {
                var pos = this.scAudio.currentTime(),
                    duration = this.scAudio.duration(),
                    fadeOutDurationOnFinish = this.options().fadeOutDurationOnFinish;
                !this.fadeOutActive && pos + fadeOutDurationOnFinish >= duration &&
                this.doFadeOut(false, fadeOutDurationOnFinish, pos + fadeOutDurationOnFinish - duration, {})
            }
        }
    })
}())
