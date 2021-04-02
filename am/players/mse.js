/* 51:62 */
define(['underscore', '../../eventize', '../events', '../states', '../errors', '../logger', './html5', './hls-toolkit', './mse-toolkit'],
    function(_, eventize, Events, States, Errors, Logger, HTML5Audio, HlsToolkit, MseToolkit){
    var self;
    self = function (descriptor, settings) {
        var MediaSource = window.MediaSource || window.WebKitMediaSource;
        return MediaSource ? (
            _.bindAll(this, ["_onPositionChange", "_onPlaylistLoaded", "_onSegmentLoaded", "_onLoadedMetadata",
                "_onHtml5MediaEvent", "_onLoadedData", "_onLoadedMetadata", "_onBuffering",
                "_onMediaSourceAppend", "_onMediaSourceReady", "_onMediaSourceDestroy", "_checkForNextSegmentToLoad"]),
            this._id = descriptor.id,
            this._descriptor = descriptor,
            this._settings = settings,
            this._streamUrlProvider = this._settings.streamUrlProvider || null,
            this._logger = new Logger(this.getType(), this._id, this._settings),
            this._minPreBufferLengthForPlayback = 5e3,
            this._maxBufferLength = 3e4,
            this._startFromPosition = 0,
            this._currentPosition = 0,
            this._isPlaylistLoaded = false,
            this._loadOnInit = false,
            this._segmentsDownloading = [],
            this._lastSegmentRequested = null,
            this._mseToolkit = new MseToolkit(this._logger, "audio/mpeg"),
            this._mseToolkit.on(MseToolkit.Events.SEGMENT_APPENDED, this._onMediaSourceAppend),
            this._mseToolkit.on(MseToolkit.Events.SOURCE_READY, this._onMediaSourceReady),
            this._mseToolkit.on(MseToolkit.Events.SOURCE_DESTROYED, this._onMediaSourceDestroy),
            this._hlsToolkit = new HlsToolkit(this._logger, this._descriptor),
            this._hlsToolkit.on(HlsToolkit.Events.SEGMENT_LOADED, this._onSegmentLoaded),
            this._html5Audio = this._mseToolkit.media(),
            this._toggleEventListeners(true),
            void this._setState(States.INITIALIZE)
        ) : void this._error(Errors.MSE_NOT_SUPPORTED)
    },
    eventize(self.prototype),
    self.prototype._onLoadedData = function () {
        this._logger.log("loadeddata event handler")
    },
    self.prototype._onLoadedMetadata = function () {
        this._logger.log("loadedmetadata event handler")
    },
    self.prototype._onPlaylistLoaded = function () {
        return this._logger.log("playlist loaded handler"),
            this._mseToolkit.sourceIsReady() ? (
                this._isPlaylistLoaded = true,
                this._inspectEncryptionData(),
                this._setDuration(this._hlsToolkit.getDuration()),
                this._logger.log("duration set from playlist info to " + this._duration),
                this.trigger(Events.METADATA, this),
                this._requestSegment(this._hlsToolkit.getSegmentForTime(this._startFromPosition)),
                void this.seek(this._startFromPosition)
            ) : void this._logger.log("we have been disposed while loading the playlist, noop")
    },
    self.prototype._onPositionChange = function (e) {
        this._html5Audio && (this._currentPosition = 1e3 * this._html5Audio.currentTime, this.trigger(Events.POSITION_CHANGE, this._currentPosition, this._loadedPosition, this._duration, this), this._lastSegmentRequested || this._checkForNextSegmentToLoad())
    },
    self.prototype._onBuffering = function () {
        this._logger.log("buffering detection timeout"),
        this.getState() !== States.PAUSED && this._setState(States.LOADING)
    },
    self.prototype._onMediaSourceReady = function () {
        this._descriptor.duration && (
            this._setDuration(this._descriptor.duration),
            this._logger.log("duration set from descriptor metadata to " + this._duration)
        ),
        this._setState(States.IDLE),
        this._descriptor.preload && this._preload(),
        this._loadOnInit && this._loadInitialPlaylist()
    },
    self.prototype._onMediaSourceDestroy = function () {
        this.kill()
    },
    self.prototype._onMediaSourceAppend = function (e) {
        return this._logger.log("Trying to play from " + this._startFromPosition), this._logger.log("State is " + this._state), this._logger.log("Play requested: " + this._playRequested), this._playRequested && (this._logger.log("Triggering playback after appending enough segments"), this._html5Audio.play(this._startFromPosition), this._resetPositionTimer(true)), e.last ? void this._cancelNextCheck() : void this._checkForNextSegmentToLoad()
    },
    self.prototype._onSegmentLoaded = function (e) {
        return this._mseToolkit.sourceIsReady() ? void this._appendSegments() : void this._logger.log("we have been disposed while loading a segment, noop")
    },
    self.prototype._onHtml5MediaEvent = function (e) {
        switch (this._logger.log('HTML5 media event "' + e.type + '"'), this._waitingToPause = false, e.type) {
            case"playing":
                this._playRequested = false, this._setState(States.PLAYING), this._onPositionChange(e);
                break;
            case"pause":
                this._onPositionChange(e), this._setState(States.PAUSED);
                break;
            case"ended":
                this._currentPosition = this._loadedPosition = this._duration, this.trigger(Events.POSITION_CHANGE, this._currentPosition, this._loadedPosition, this._duration, this), this._setState(States.ENDED);
                break;
            case"waiting":
                if (this.getState() === States.SEEKING)break;
                this._setState(States.LOADING);
                break;
            case"seeking":
                this._setState(States.SEEKING);
                break;
            case"seeked":
                this._html5Audio.paused ? this._setState(States.PAUSED) : this._setState(States.PLAYING), this._onPositionChange(e);
                break;
            case"error":
                this._error(this._html5AudioErrorCodeToErrorId(), true)
        }
    },
    self.prototype._toggleEventListeners = function (on) {
        if (this._html5Audio) {
            var addRemove = on ? "addEventListener" : "removeEventListener";
            HTML5Audio.MediaAPIEvents.forEach(function (ev) {
                switch (ev) {
                    case"loadeddata":
                        this._html5Audio[addRemove]("loadeddata", this._onLoadedData);
                        break;
                    case"loadedmetadata":
                        this._html5Audio[addRemove]("loadedmetadata", this._onLoadedMetadata);
                        break;
                    case"timeupdate":
                    default:
                        this._html5Audio[addRemove](ev, this._onHtml5MediaEvent)
                }
            }, this)
        }
    },
    self.prototype._loadInitialPlaylist = function () {
        this._isInOneOfStates(States.LOADING) || (
            this._setState(States.LOADING),
            this._hlsToolkit.once(HlsToolkit.Events.PLAYLIST_LOADED, this._onPlaylistLoaded),
            this._hlsToolkit.updatePlaylist()
        )
    },
    self.prototype._setDuration = function (duration) {
        this._loadedPosition = this._duration = duration;
        try {
            this._mseToolkit.duration(this._duration)
        } catch (e) {
            this._logger.log("MediaSource API error: " + e.message),
            this._error(Errors.MSE_BAD_OBJECT_STATE),
            this.kill()
        }
    },
    self.prototype._resetPositionTimer = function (e) {
        clearInterval(this._positionUpdateTimer), e && (this._positionUpdateTimer = setInterval(this._onPositionChange, this._settings.updateInterval))
    },
    self.prototype._cancelNextCheck = function () {
        clearTimeout(this._nextCheckTimeout)
    },
    self.prototype._appendSegments = function () {
        var flag = true;
        this._segmentsDownloading.slice().forEach(function (seg) {
            seg.data && flag ? (
                this._segmentsDownloading.shift(),
                this._decryptSegment(seg),
                this._mseToolkit.append(seg)
            ) : flag = false
        }, this)
    },
    self.prototype._checkForNextSegmentToLoad = function () {
        var seg, idx, timeout,
            i = Math.min(this._currentPosition + this._maxBufferLength, this._duration);
        if (
            this._logger.log("checking if we can download next segment"),
            !this._lastSegmentRequested || this._lastSegmentRequested.endPosition < i
        ) {
            do {
                if (
                    idx = this._lastSegmentRequested ? this._lastSegmentRequested.index + 1 : 0,
                    seg = this._hlsToolkit.getSegment(idx),
                    !seg
                )
                    break;
                this._logger.log("will try to request segment " + idx),
                this._requestSegment(seg)
            } while (seg.endPosition < i)
        } else
            timeout = this._lastSegmentRequested.duration,
            this._logger.log("not necessary to request more data yet, scheduling next check in " + timeout + " ms"),
            this._cancelNextCheck(),
            this.getState() != States.DEAD && (
                this._nextCheckTimeout = setTimeout(this._checkForNextSegmentToLoad, timeout)
            )
    },
    self.prototype._requestSegment = function (seg) {
        return this._logger.log("requesting segment " + seg.index),
            this._lastSegmentRequested = seg,
            this._segmentsDownloading.push(seg),
            seg.data ? (
                this._logger.log("requested data is already loaded"),
                void this._onSegmentLoaded(seg)
            ) : void this._hlsToolkit.loadSegment(seg.index)
    },
    self.prototype._isTimeBuffered = function (e) {
        var t, n = this._html5Audio ? this._html5Audio.buffered : [];
        for (e /= 1e3, t = 0; t < n.length; t++)if (e < n.end(t) && e >= n.start(t))return true;
        return false
    },
    self.prototype._decryptSegment = function (e) {
        this._hlsToolkit.isAES128Encrypted() && this._hlsToolkit.decryptSegmentAES128(e)
    },
    self.prototype._inspectEncryptionData = function () {
        this._hlsToolkit.isAES128Encrypted() && (
            this._logger.log("got key of byte length " + this._hlsToolkit.getEncryptionKey().byteLength),
            this._hlsToolkit.getEncryptionIv() ?
                this._logger.log("got IV of byte length " + this._hlsToolkit.getEncryptionIv().byteLength) :
                this._logger.log("no IV found in header, will use per-segment-index IV")
        )
    },
    self.prototype._html5AudioErrorCodeToErrorId = function () {
        return {
            1: Errors.HTML5_AUDIO_ABORTED,
            2: Errors.HTML5_AUDIO_NETWORK,
            3: Errors.HTML5_AUDIO_DECODE,
            4: Errors.HTML5_AUDIO_SRC_NOT_SUPPORTED
        }[this._html5Audio.error.code]
    },
    self.prototype._error = function (id, native) {
        var prefix = "error: ";
        native && (prefix = "error (native): "),
        this._errorID = id,
        this._errorMessage = this._getErrorMessage(this._errorID),
        this._logger.log(prefix + this._errorID + " " + this._errorMessage),
        this._setState(States.ERROR),
        this._toggleEventListeners(false)
    },
    self.prototype._getErrorMessage = function (e) {
        var messages = {};
        return messages[Errors.MSE_NOT_SUPPORTED] = "The browsed does not support Media Source Extensions yet",
            messages[Errors.MSE_HLS_NOT_VALID_PLAYLIST] = "Playlist is invalid",
            messages[Errors.MSE_HLS_SEGMENT_NOT_FOUND] = "Failed to load media segment",
            messages[Errors.MSE_HLS_PLAYLIST_NOT_FOUND] = "Failed to load HLS playlist",
            messages[Errors.MSE_MP3_NOT_SUPPORTED] = "Browser does not support MPEG streams in Media Source Extension",
            messages[e] ? messages[e] : "Unknown HTML5 media error: " + e
    },
    self.prototype._setState = function (e) {
        this._state !== e && (this._logger.log('state changed "' + e + '"'), this._logger.log("currentPosition = " + this._currentPosition + ", loadedPosition = " + this._loadedPosition), this._state = e, this.trigger(Events.STATE_CHANGE, e, this))
    },
    self.prototype._isInOneOfStates = function () {
        for (var e in arguments)if (arguments[e] === this._state)return true;
        return false
    },
    self.prototype.setVolume = function (e) {
        this._html5Audio && (this._html5Audio.volume = e)
    },
    self.prototype.getVolume = function () {
        return this._html5Audio ? this._html5Audio.volume : 1
    },
    self.prototype.setMute = function (e) {
        this._html5Audio && (this._html5Audio.muted = e)
    },
    self.prototype.getMute = function () {
        return this._html5Audio ? this._html5Audio.muted : false
    },
    self.prototype.getState = function () {
        return this._state
    },
    self.prototype.getCurrentPosition = function () {
        return this._currentPosition
    },
    self.prototype.getLoadedPosition = function () {
        return this._loadedPosition
    },
    self.prototype.getDuration = function () {
        return this._duration
    },
    self.prototype.getErrorID = function () {
        return this._errorID
    },
    self.prototype.getId = function () {
        return this._id
    },
    self.prototype.getType = function () {
        return "HLS MSE audio"
    },
    self.prototype.play = function (e) {
        if (this._isInOneOfStates(States.PAUSED, States.SEEKING, States.ENDED))
            return void this.resume();
        if (this._isInOneOfStates(States.IDLE, States.INITIALIZE))
            return this._logger.log("play from " + e),
                this._startFromPosition = e || 0,
                this._playRequested = true,
                this._mseToolkit.sourceIsReady() ? void this._loadInitialPlaylist() : void(this._loadOnInit = true)
    },
    self.prototype.pause = function () {
        this._html5Audio && (
            this._playRequested = false,
            this._resetPositionTimer(false),
            this._html5Audio.pause()
        )
    },
    self.prototype.seek = function (e) {
        this._html5Audio.seekable;
        if (!this._isInOneOfStates(States.ERROR, States.DEAD)) {
            if (!this._isPlaylistLoaded)
                return void this.once(Events.METADATA, function () {
                    this.seek(e)
                });
            if (e > this._duration)
                return void this._logger.log("can not seek to position over duration");
            this._logger.log("seek to " + e + " ms"),
            this._setState(States.SEEKING),
            this._requestSegment(this._hlsToolkit.getSegmentForTime(e)),
            this._startFromPosition = this._currentPosition = e,
            this._html5Audio.currentTime = e / 1e3,
            this._checkForNextSegmentToLoad()
        }
    },
    self.prototype.resume = function () {
        this._html5Audio.play(this._html5Audio.currentTime), this._resetPositionTimer(true)
    },
    self.prototype.kill = function () {
        this._state !== States.DEAD && (
            this._resetPositionTimer(false),
            this._cancelNextCheck(),
                this._playRequested = false,
                this._toggleEventListeners(false),
                this._html5Audio.pause(),
                this._setState(States.DEAD)
        )
    }
    return self;
});
