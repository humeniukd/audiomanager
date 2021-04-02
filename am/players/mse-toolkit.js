/* 51:79 */
define(['underscore', '../../eventize', '../errors', '../utils'],
    function(_, eventize, Errors, BrowserUtils) {
    var self;
    self = function (logger, mimeType) {
        _.bindAll(this, ["_onMSEInit", "_onMSEDispose", "_onSourceBufferUpdate", "_onSourceBufferUpdateLastSegment"]),
            this.mimeType = mimeType,
            this._logger = logger,
            this._isBufferPrepared = false,
            this._sourceBufferPtsOffset = 0,
            this._segmentsAwaitingAppendance = [],
            this._isNotReady = true,
            this._sourceBuffer = null,
            this._mediaSource = new MediaSource,
            this._mediaSource.addEventListener("sourceopen", this._onMSEInit, false),
            this._mediaSource.addEventListener("sourceclose", this._onMSEDispose, false),
            this._mediaElem = BrowserUtils.createAudioElement(),
            this._mediaElem.src = window.URL.createObjectURL(this._mediaSource)
    },
    self.Events = {
        SOURCE_READY: "source_ready",
        SOURCE_DESTROYED: "source_destroy",
        SEGMENT_APPENDED: "segment_appended"
    },
    eventize(self.prototype),
    _.assign(self.prototype, {
        _onMSEInit: function () {
            this._logger.log("source open handler"),
            this._isNotReady = false,
            this._mediaSource.removeEventListener("sourceopen", this._onMSEInit, false),
            this._sourceBuffer = this._mediaSource.addSourceBuffer(this.mimeType),
            this._sourceBuffer.addEventListener("update", this._onSourceBufferUpdate),
            this.trigger(self.Events.SOURCE_READY)
        },
        _onMSEDispose: function () {
            this._isNotReady = true,
            this._logger.log("source dispose handler"),
            this._mediaSource.removeEventListener("sourceclose", this._onMSEDispose, false)
        },
        _appendNextSegment: function (seg) {
            return this._logger.log("Trying to append ..."),
                this._tryAppendNextSegment(seg) ? (
                    seg.last && (
                        this._logger.log("Appended the very last segment"),
                        this._sourceBuffer.addEventListener("update", this._onSourceBufferUpdateLastSegment)
                    ),
                    void this.trigger(self.Events.SEGMENT_APPENDED, seg)
                ) : (
                    this._error(Errors.MSE_BAD_OBJECT_STATE), void this.kill()
                )
        },
        _tryAppendNextSegment: function (seg) {
            try {
                return this._sourceBuffer.updating ? (
                    this._logger.log("Source buffer is busy updating already, enqueuing data for later appending"),
                    this._segmentsAwaitingAppendance.unshift(seg),
                    true
                ) : (
                    this._logger.log("Source buffer is ready to take data, lets append now"),
                    seg.index > 0 && !this._isBufferPrepared && seg.containsTime(this._startFromPosition) ?
                        (this._prepareBuffer(seg), true)
                    : (
                        this._logger.log("Appending data now"),
                        this._sourceBuffer.timestampOffset = seg.startPosition / 1e3,
                        this._sourceBuffer.appendBuffer(seg.data),
                        true
                    )
                )
            } catch (t) {
                return this._logger.log("Was trying to append but seems like SourceBuffer is not in valid state anymore, dropping segment data (error: " + t.message + ")"),
                    false
            }
            this._logger.log("Appended segment " + seg.index)
        },
        _onSourceBufferUpdateLastSegment: function () {
            return this._sourceBuffer.updating ? void this._logger.log("SourceBuffer still updating") : (
                this._sourceBuffer.removeEventListener("update", this._onSourceBufferUpdateLastSegment),
                void this._mediaSource.endOfStream()
            )
        },
        _onSourceBufferUpdate: function () {
            this.trigger("loadeddata", this),
            this._segmentsAwaitingAppendance.length &&
                this._appendNextSegment(this._segmentsAwaitingAppendance.pop())
        },
        _prepareBufferUpdate: function (seg) {
            try {
                if (this._sourceBuffer.updating)
                    return void this._logger.log("SourceBuffer still updating");
                if (this._sourceBuffer.timestampOffset < seg.startPosition / 1e3)
                    return this._sourceBuffer.timestampOffset = this._prepareBufferUpdatePts / 1e3,
                        this._sourceBuffer.appendBuffer(seg.data),
                        this._prepareBufferUpdatePts += seg.duration,
                        void this._logger.log("Appended dummy fill data to buffer in media-interval: " + 1e3 * this._sourceBuffer.timestampOffset + " - " + this._prepareBufferUpdatePts);
                if (this._isBufferPrepared)
                    return;
                this._isBufferPrepared = true,
                this._sourceBuffer.removeEventListener("update", this._prepareBufferUpdateFn, false),
                this._logger.log("Will append initial segment " + seg.index + " now"),
                this._appendNextSegment(seg)
            } catch (e) {
                this._logger.log("SourceBuffer might be in invalid state (could not prepare it correctly). Error: " + t.message)
            }
        },
        _prepareBuffer: function (seg) {
            this._logger.log("Preparing buffer for non-zero timestamp offset ..."),
            this._prepareBufferUpdatePts = 0,
            this._prepareBufferUpdateFn = this._prepareBufferUpdate.bind(this, seg),
            this._sourceBuffer.addEventListener("update", this._prepareBufferUpdateFn, false),
            this._prepareBufferUpdate(seg)
        },
        append: function (seg) {
            this._appendNextSegment(seg)
        },
        media: function () {
            return this._mediaElem
        },
        sourceIsReady: function () {
            return !this._isNotReady
        },
        duration: function (ms) {
            return this._mediaSource.duration = ms / 1e3,
                1e3 * this._mediaSource.duration
        }
    });
    return self;
});
