(function(){
    function Self(e, t, n) {
        Html5.prototype.constructor.call(this, e, t, n || "HTML5SingleAudioPlayer")
    }
    var currentId, assign = require('underscore').assign,
        States = require('../states'), //n(38),
        Events = require('../events'), //n(39),
        Html5 = require('./html5'), //n(46),
        Utils = require('../utils'), //n(16);
        cache = {};
    assign(Self.prototype, Html5.prototype);
    Self._onLoaded = function(e) {
        Self._pauseOthersAndForwardEvent("_onLoaded", e)
    },
    Self._onLoadedMetadata = function(e) {
        Self._pauseOthersAndForwardEvent("_onLoadedMetadata", e)
    },
    Self._onHtml5MediaEvent = function(e) {
        Self._pauseOthersAndForwardEvent("_onHtml5MediaEvent", e)
    },
    Self._pauseOthersAndForwardEvent = function(method, data) {
        Object.keys(cache).forEach(function(id) {
            var instance = cache[id];
            id === currentId ? instance[method](data) : instance.pause()
        })
    },
    Self.prototype._initMediaElement = function() {
        Self._html5Audio || (
            Self._html5Audio = Utils.createAudioElement(),
            Self._html5Audio.id = this.getSettings().audioObjectID + "_Single",
            Html5.prototype._toggleEventListeners.call(Self, true)
        ),
        this._toggleEventListeners(true),
        this._html5Audio = Self._html5Audio,
        this._logger.log("initialized player for use with: " + this.getDescriptor().src)
    },
    Self.prototype._toggleEventListeners = function(flag) {
        flag ? cache[this.getId()] = this : delete cache[this.getId()]
    },
    Self.prototype.play = function(pos) {
        this._logger.log("singleton play at: " + pos),
        (0 === this._html5Audio.readyState || this.getDescriptor().src !== this._html5Audio.src) && (
            this._logger.log("setting up audio element for use with: " + this.getDescriptor().src),
            currentId = this.getId(),
            this._isInOneOfStates(States.PAUSED) && (
                this._logger.log("state was paused"),
                pos = this._currentPosition || 0
            ),
            this._toggleEventListeners(true),
            this._html5Audio.preload = "auto",
            this._html5Audio.type = this.getDescriptor().mimeType,
            this._html5Audio.src = this.getDescriptor().src,
            this._html5Audio.load()
        ),
        Html5.prototype.play.call(this, pos)
    },
    Self.prototype.resume = function() {
        return this._isInOneOfStates(States.ERROR, States.DEAD) ?
            void 0 :
            currentId !== this.getId() ?
                void this.play(this._currentPosition) :
                void Html5.prototype.resume.apply(this, arguments)
    },
    Self.prototype.pause = function() {
        this._isInOneOfStates(States.ERROR, States.DEAD) || (
            this._logger.log("singleton pause"),
            currentId === this.getId() ? Html5.prototype.pause.apply(this, arguments) : (
                this._toggleEventListeners(false),
                this._isInOneOfStates(States.PAUSED) || this.updateState(States.PAUSED),
                this._resetPositionInterval(false)
            )
        )
    },
    Self.prototype.seek = function(e) {
        return currentId !== this.getId() ? (
            this._currentPosition = e,
            void this.trigger(Events.POSITION_CHANGE, this._currentPosition, this._loadedPosition, this._duration, this)
        ) : void Html5.prototype.seek.apply(this, arguments)
    }
    module.exports = Self;
}())
