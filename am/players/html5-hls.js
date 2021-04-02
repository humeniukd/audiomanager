/* 51:44 */
define(['underscore', './html5', '../errors', '../states', '../events'],
    function(_, HTML5Player, Errors, States, Events){
    var self,
        l = 1;
    self = function (e, t) {
        HTML5Player.apply(this, arguments),
        this._seekPosition = 0
    },
    _.assign(self.prototype, HTML5Player.prototype),
    self.prototype.getType = function () {
        return "HTML5 HLS audio"
    },
    self.prototype.seek = function (e) {
        HTML5Player.prototype.seek.apply(this, arguments),
        this._isInOneOfStates(States.LOADING, States.SEEKING) && (this._seekPosition = e)
    },
    self.prototype.getCurrentPosition = function () {
        if (this._isInOneOfStates(States.LOADING) && this._seekPosition > 0)
            return this._seekPosition;
        if (this._isInOneOfStates(States.PLAYING, States.SEEKING)) {
            if (this._seekPosition >= this._currentPosition)
                return this._seekPosition;
            this._seekPosition = 0
        }
        return HTML5Player.prototype.getCurrentPosition.apply(this, arguments)
    },
    self.prototype._onStateChange = function (e) {
        switch (
            this._logger.log('hls html5 audio event "' + e.type + '"'),
            clearTimeout(this._bufferingTimeout),
                e.type
            ) {
            case"playing":
                if (this._trySeekToStartPosition())
                    return;
                this.updatePositions(),
                this._setState(States.PLAYING);
                break;
            case"pause":
                this._setState(States.PAUSED);
                break;
            case"ended":
                if (this._currentPosition + l < this._duration) {
                    this._errorID = Errors.HTML5_AUDIO_ENDED_EARLY,
                    this._errorMessage = this._getErrorMessage(this._errorID),
                    this._logger.log("hls html5 audio error: " + this._errorID + " " + this._errorMessage),
                    this._setState(States.ERROR),
                    this.toggleEventListeners(false);
                    break
                }
                this._currentPosition = this._loadedPosition = this._duration,
                this.trigger(Events.POSITION_CHANGE, this._currentPosition, this._loadedPosition, this._duration, this),
                this._setState(States.ENDED),
                clearInterval(this._positionUpdateTimer);
                break;
            case"waiting":
                if (this.getState() === States.SEEKING)
                    break;
                this._setState(States.LOADING);
                break;
            case"seeking":
                this._setState(States.SEEKING);
                break;
            case"seeked":
                this.updatePositions(),
                this._html5Audio.paused && this._setState(States.PAUSED);
                break;
            case"error":
                this._errorID = {
                    1: Errors.HTML5_AUDIO_ABORTED,
                    2: Errors.HTML5_AUDIO_NETWORK,
                    3: Errors.HTML5_AUDIO_DECODE,
                    4: Errors.HTML5_AUDIO_SRC_NOT_SUPPORTED
                }[this._html5Audio.error.code],
                this._errorMessage = this._getErrorMessage(this._errorID),
                this._logger.log("hls html5 audio error: " + this._errorID + " " + this._errorMessage),
                this._setState(States.ERROR),
                this.toggleEventListeners(false)
        }
    }
    return self;
});