/* 46 */
(function(){
    function Self(descriptor, settings, type) {
        this._duration = 0,
        this._currentPosition = 0,
        this._loadedPosition = 0,
        Base.prototype.constructor.call(this, type || "HTML5AudioPlayer", descriptor, settings),
        this._isLoaded = false,
        this._prevCurrentPosition = 0,
        this._prevCheckTime = 0,
        this._positionUpdateTimer = 0,
        this._playRequested = false,
        this._startFromPosition = 0,
        this.getDescriptor().duration && (
            this._duration = this.getDescriptor().duration
        ),
        this._bindHandlers(),
        this._initMediaElement(),
        this.updateState(States.IDLE)
    }
    var _ = require('underscore'),
        bindAll = _.bindAll,
        States = require('../states'), //n(38),
        Events = require('../events'), //n(39),
        Errors = require('../errors'), //n(43),
        Base = require('./base'), //n(35),
        Utils = require('../utils'); //n(16);
    module.exports = Self,
    _.assign(Self.prototype, Base.prototype),
    Self.MediaAPIEvents = [
        "ended", "play", "playing", "pause", "seeking", "waiting", "seeked", "error", "loadeddata", "loadedmetadata"
    ],
    Self.prototype.play = function(pos) {
        return this._isInOneOfStates(States.ERROR, States.DEAD) ?
            void this._logger.log("play called but state is ERROR or DEAD") : (
            this._logger.log("play from " + pos),
                this._startFromPosition = pos || 0,
            this._playRequested = true,
            this._isInOneOfStates(States.PAUSED, States.ENDED) ? void this.resume() : (
                this.updateState(States.LOADING),
                this._html5Audio.readyState > 0 && this._onLoadedMetadata(),
                this._html5Audio.readyState > 1 && this._onLoaded(),
                void(
                    this._isLoaded ? this._playAfterLoaded() : this.once(Events.DATA, this._playAfterLoaded)
                )
            )
        )
    },
    Self.prototype.pause = function() {
        this._isInOneOfStates(States.ERROR, States.DEAD) || (
            this._logger.log("pause"),
            this._playRequested = false,
            this._html5Audio && this._html5Audio.pause()
        )
    },
    Self.prototype.seek = function(pos) {
        var i,
            flag = false,
            sec = pos / 1e3,
            seekable = this._html5Audio.seekable;
        if (!this._isInOneOfStates(States.ERROR, States.DEAD)) {
            if (!this._isLoaded)
                return this.once(Events.DATA, function() {
                    this.seek(pos)
                }),
                void this._logger.log("postponing seek for when loaded");
            if (Utils.isIE10Mobile)
                flag = true;
            else 
                for (i = 0; i < seekable.length; i++)
                    if (sec <= seekable.end(i) && sec >= seekable.start(i)) {
                        flag = true;
                        break
                    }
            if (!flag)
                return void this._logger.log("can not seek");
            this._logger.log("seek"),
            this.updateState(States.SEEKING),
            this._html5Audio.currentTime = sec,
            this._currentPosition = pos,
            this._lastMediaClockCheck = null
        }
    },
    Self.prototype.resume = function() {
        return this._isInOneOfStates(States.ERROR, States.DEAD) ?
            void this._logger.log("resume called but state is ERROR or DEAD") : (
            this._logger.log("resume"),
            void(
                this.getState() === States.PAUSED ? (
                    this.updateState(States.PLAYING),
                    this._html5Audio.play(this._html5Audio.currentTime)
                ) : this.getState() === States.ENDED && this._html5Audio.play(0)
            )
        )
    },
    Self.prototype.setVolume = function(vol) {
        this._html5Audio && (
            this._html5Audio.volume = vol
        )
    },
    Self.prototype.getVolume = function() {
        return this._html5Audio ? this._html5Audio.volume : 1
    },
    Self.prototype.setMute = function(flag) {
        this._html5Audio && (
            this._html5Audio.muted = flag
        )
    },
    Self.prototype.getMute = function() {
        return this._html5Audio ? this._html5Audio.muted : false
    },
    Self.prototype.kill = function() {
        this._state !== States.DEAD && (
            this._logger.log("killing ..."),
            this._resetPositionInterval(false),
            this._playRequested = false,
            this._toggleEventListeners(false),
            this.pause(),
            delete this._html5Audio,
            this.updateState(States.DEAD),
            this._logger.log("dead")
        )
    },
    Self.prototype.getErrorMessage = function() {
        return this._errorMessage
    },
    Self.prototype.getErrorID = function() {
        return this._errorID
    },
    Self.prototype._bindHandlers = function() {
        bindAll(this, "_onPositionChange", "_onHtml5MediaEvent", "_onLoaded", "_onLoadedMetadata")
    },
    Self.prototype._initMediaElement = function() {
        this._html5Audio = Utils.createAudioElement(),
        this._html5Audio.id = this.getSettings().audioObjectID + "_" + this.getId(),
        this._html5Audio.preload = "auto",
        this._html5Audio.type = this.getDescriptor().mimeType,
        this._html5Audio.src = this.getDescriptor().src,
        this._html5Audio.load(),
        this._toggleEventListeners(true)
    },
    Self.prototype._playAfterLoaded = function() {
        this._playRequested && (
            this._trySeekToStartPosition(),
            this._html5Audio.play()
        )
    },
    Self.prototype._isInOneOfStates = function() {
        for (var arg in arguments)
            if (arguments[arg] === this._state)
                return true;
        return false
    },
    Self.prototype._toggleEventListeners = function(flag) {
        if (this._html5Audio) {
            var method = flag ? "on": "off";
            Self.MediaAPIEvents.forEach(function(e) {
                switch (e) {
                    case "loadeddata":
                        this._html5Audio[method]("loadeddata", this._onLoaded);
                        break;
                    case "loadedmetadata":
                        this._html5Audio[method]("loadedmetadata", this._onLoadedMetadata);
                        break;
                    default:
                        this._html5Audio[method](e, this._onHtml5MediaEvent)
                }
            }, this)
        }
    },
    Self.prototype._trySeekToStartPosition = function() {
        var sec;
        return this._startFromPosition <= 0 ? true : (
            this._logger.log("seek to start position: " + this._startFromPosition),
            sec = this._startFromPosition / 1e3,
            this._html5Audio.currentTime = sec,
            this._html5Audio.currentTime === sec ? (
                this._lastMediaClockCheck = null,
                this._currentPosition = this._startFromPosition,
                this._startFromPosition = 0,
                true
            ) : false
        )
    },
    Self.prototype._onLoaded = function() {
        this._logger.log("HTML5 media loadeddata event"),
        this.trigger(Events.DATA, this)
    },
    Self.prototype._onLoadedMetadata = function() {
        this._logger.log("HTML5 media loadedmetadata event"),
        (void 0 === this._duration || 0 === this._duration) && (
            this._duration = 1e3 * this._html5Audio.duration
        ),
        this._loadedPosition = this._duration,
        this._isLoaded = true,
        this.trigger(Events.METADATA, this)
    },
    Self.prototype._resetPositionInterval = function(flag) {
        window.clearInterval(this._positionUpdateTimer),
        flag && (
            this._positionUpdateTimer = window.setInterval(this._onPositionChange, this.getSettings().updateInterval)
        )
    },
    Self.prototype._onPositionChange = function() {
        if (!this._isInOneOfStates(States.DEAD)) {
            var e;
            if (
                this._currentPosition = 1e3 * this._html5Audio.currentTime,
                this.trigger(
                    Events.POSITION_CHANGE,
                    this.getCurrentPosition(),
                    this._loadedPosition,
                    this._duration,
                    this
                ),
                !this._isInOneOfStates(States.PLAYING, States.LOADING)
            )
                return void(
                    this._state === States.SEEKING && e > 0 && this.updateState(States.PLAYING)
                );
            if (
                0 !== this._duration && (
                    this._currentPosition > this._duration ||
                    this._currentPosition > this._loadedPosition && !Utils.isIE10Mobile
                )
            )
                return void this._onHtml5MediaEvent({
                    type: "ended"
                });
            var hasProgressed = this._mediaHasProgressed();
            return this.getState() !== States.PLAYING || hasProgressed ? void(
                this.getState() === States.LOADING && hasProgressed && this.updateState(States.PLAYING)
            ) : (
                this._logger.log("media clock check failed, playhead is not advancing anymore"),
                void this.updateState(States.LOADING)
            )
        }
    },
    Self.prototype._onHtml5MediaEvent = function(e) {
        switch (
            this._logger.log("HTML5 media event: " + e.type),
            e.type
        ) {
            case "playing":
                if (!this._trySeekToStartPosition())
                    break;
                this._onPositionChange(),
                this._resetPositionInterval(true),
                this.updateState(States.PLAYING);
                break;
            case "pause":
                this._onPositionChange(),
                this._resetPositionInterval(false),
                this.updateState(States.PAUSED);
                break;
            case "ended":
                this._currentPosition = this._loadedPosition = this._duration,
                this._resetPositionInterval(false),
                this.updateState(States.ENDED);
                break;
            case "waiting":
                if (this.getState() === States.SEEKING)
                    break;
                this.updateState(States.LOADING);
                break;
            case "seeking":
                this.updateState(States.SEEKING);
                break;
            case "seeked":
                this._startFromPosition = 0,
                this._html5Audio.paused ? this.updateState(States.PAUSED) : this.updateState(States.PLAYING),
                this._onPositionChange(e);
                break;
            case "error":
                this._error(this._html5AudioErrorCodeToErrorId(), true)
        }
    },
    Self.prototype._html5AudioErrorCodeToErrorId = function() {
        return {
            1: Errors.HTML5_AUDIO_ABORTED,
            2: Errors.HTML5_AUDIO_NETWORK,
            3: Errors.HTML5_AUDIO_DECODE,
            4: Errors.HTML5_AUDIO_SRC_NOT_SUPPORTED
        }
        [this._html5Audio.error.code]
    },
    Self.prototype._error = function(errorId, isNative) {
        var prefix = "error: ";
        isNative && (prefix = "error (native): "),
        this._errorID = errorId,
        this._errorMessage = this._getErrorMessage(this._errorID),
        this._logger.log(prefix + this._errorID + " " + this._errorMessage),
        this.updateState(States.ERROR),
        this._toggleEventListeners(false)
    },
    Self.prototype._getErrorMessage = function(e) {
        var errors = {};
        return errors[Errors.HTML5_AUDIO_ABORTED] = "The fetching process for the media resource was aborted by the user agent at the user's request.",
            errors[Errors.HTML5_AUDIO_NETWORK] = "A network error of some description caused the user agent to stop fetching the media resource, after the resource was established to be usable.",
            errors[Errors.HTML5_AUDIO_DECODE] = "An error of some description occurred while decoding the media resource, after the resource was established to be usable.",
            errors[Errors.HTML5_AUDIO_SRC_NOT_SUPPORTED] = "The media resource indicated by the src attribute was not suitable.",
            errors[e]
    }
}())
