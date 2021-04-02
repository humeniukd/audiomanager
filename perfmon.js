/* 3381:11 */
define(['underscore', './eventize', './events', 'helpers/url'], function (_, eventize, Events, URL) {
    function prefix(message) {
        return "AudioPerfMonitor (" + this.scAudio.getId() + ") : " + message
    }

    function onCreated() {
        return this.scAudio.controller ?
            this.controller ? void this.printWarning(prefix.call(this, "Setup was called while it was already initialized (returned with a no-op)")
        ) : (
            this.scAudio.options.debug && window.console.info(
                prefix.call(this, "Initialized for instance %s"),
                this.scAudio.getId()
            ),
            this.controller = this.scAudio.controller,
            this.protocol = this.scAudio.streamInfo.protocol,
            void(this.host = URL.parse(this.scAudio.streamInfo.url).host)
        ) : void this.printWarning("Can´t initialize when controller is null")
    }

    function onReset() {
        return this.controller ? (
            this.scAudio.options.debug && window.console.info(
                prefix.call(this, "Reset for instance %s"),
                this.scAudio.getId()
            ),
            this.controller = null,
            this.protocol = null,
            this.host = null,
            void(this.timeToPlayMeasured = false)
        ) : void this.printWarning(
            prefix.call(this, "Reset was called while it was already de-initialized (returned with a no-op)")
        )
    }

    function onStateChange(state) {
        var states = this.scAudio.getAudioManagerStates();
        state === states.LOADING ? this.timeToPlayMeasured && onBufferingStart.call(this) :
            _.isNull(this.bufferingStartTime) || onBufferingEnd.call(this)
    }

    function onPlayStart() {
        this.metadataLoadStartTime = Date.now()
    }

    function onMetadata() {
        return _.isNull(this.metadataLoadStartTime) ?
            void this.printWarning(
                prefix.call(this, "onMetadataEnd was called without onMetadataStart being called before.")
        ) : (
            this.log({
                type: "metadata",
                latency: Date.now() - this.metadataLoadStartTime
            }),
            void(this.metadataLoadStartTime = null)
        )
    }

    function onPlay() {
        this.playClickTime = Date.now()
    }

    function onPlayResume() {
        if (!this.timeToPlayMeasured) {
            if (_.isNull(this.playClickTime))
                return void this.printWarning(prefix.call(this, "onPlayResume was called without onPlayStart being called before."));
            this.log({
                type: "play",
                latency: Date.now() - this.playClickTime
            }),
            this.playClickTime = null,
            this.timeToPlayMeasured = true
        }
    }

    function onSeek() {
        this.scAudio.isPaused() || (this.seekStartTime = Date.now())
    }

    function onSeeked() {
        if (!this.scAudio.isPaused()) {
            if (_.isNull(this.seekStartTime))
                return void this.printWarning(prefix.call(this, "onSeekEnd was called without onSeekStart being called before."));
            this.log({
                type: "seek",
                latency: Date.now() - this.seekStartTime
            }),
            this.seekStartTime = null
        }
    }

    function onBufferingStart() {
        this.bufferingStartTime || (this.bufferingStartTime = Date.now())
    }

    function onBufferingEnd() {
        return _.isNull(this.bufferingStartTime) ? void this.printWarning(
            prefix.call(this, "onBufferingEnd was called without onBufferingStart being called before.")
        ) : (
            setBufferingTimeAccumulated.call(this),
            void(this.bufferingStartTime = null)
        )
    }

    function setBufferingTimeAccumulated() {
        _.isNull(this.bufferingStartTime) || (
            _.isNull(this.bufferingTimeAccumulated) && (this.bufferingTimeAccumulated = 0),
            this.bufferingTimeAccumulated += Date.now() - this.bufferingStartTime
        )
    }

    function onPause() {
        setBufferingTimeAccumulated.call(this),
        _.isNull(this.bufferingTimeAccumulated) || (
            this.log({
                type: "buffer",
                latency: this.bufferingTimeAccumulated
            }),
            this.bufferingStartTime = this.bufferingTimeAccumulated = null
        )
    }

    var self = function (scAudio, logFn) {
        this.scAudio = scAudio,
        this.logFn = logFn,
        this.controller = null,
        this.reset(),
        scAudio.on(Events.CREATED, onCreated, this)
            .on(Events.RESET, onReset, this)
            .on(Events.DESTROYED, onReset, this)
            .on(Events.SEEK, onSeek, this)
            .on(Events.SEEKED, onSeeked, this)
            .on(Events.PLAY, onPlay, this)
            .on(Events.PLAY_START, onPlayStart, this)
            .on(Events.PLAY_RESUME, onPlayResume, this)
            .on(Events.PAUSE, onPause, this)
            .on(Events.FINISH, onPause, this)
            .on(Events.STATE_CHANGE, onStateChange, this)
            .on(Events.METADATA, onMetadata, this)
    };
    eventize(self.prototype),
    _.extend(self.prototype, {
        constructor: self,
        log: function (e) {
            return this.controller ? (
                _.extend(e, {
                    protocol: this.protocol,
                    host: this.host,
                    playertype: this.controller.getType()
                }),
                this.scAudio.options.debug && window.console.info(
                    prefix.call(this, "%s latency: %d protocol: %s host: %s playertype: %s"),
                    e.type, e.latency, e.protocol, e.host, e.playertype
                ),
                void this.logFn(e)
            ) : void this.printWarning(prefix.call(this, "Monitor log was called while controller is null (returned with a no-op)"))
        },
        reset: function () {
            this.bufferingStartTime = this.bufferingTimeAccumulated = this.playClickTime = this.seekStartTime = this.metadataLoadStartTime = null,
            this.timeToPlayMeasured = false
        },
        printWarning: function (e) {
            this.scAudio.options.debug && window.console.warn(e)
        }
    });
    return self
});
