/* 35 */
(function() {
    function Self(type, descriptor, settings, caps) {
        this._type = type,
        this._id = descriptor.id,
        this._descriptor = descriptor,
        this._settings = settings,
        this._currentPosition = this._loadedPosition = this._duration = 0,
        this._capabilities = assign({}, Capabilities.createDefaults(), caps),
        this._logger = new Logger(this.getType(), this.getId(), descriptor.title, settings);
        try {
            Capabilities.validate(this.getCapabilities())
        } catch (e) {
            return this.getLogger().log("Bad caps: " + e),
                void this.updateState(States.ERROR)
        }
        this.updateState(States.INITIALIZE)
    }
    var assign = require('underscore').assign,
        States = require('../states'), //n(38),
        events = require('../events'), //n(39),
        Logger = require('./logger'), //n(40),
        eventize = require('./eventize'), //n(40),
        Capabilities = require('../capabilities'); //n(42);
    module.exports = Self,
    eventize(Self.prototype),
    Self.prototype.canPlay = function() {
        return false
    },
    Self.prototype.getCapabilities = function() {
        return this._capabilities
    },
    Self.prototype.getLogger = function() {
        return this._logger
    },
    Self.prototype.getSettings = function() {
        return this._settings
    },
    Self.prototype.getDescriptor = function() {
        return this._descriptor
    },
    Self.prototype.getType = function() {
        return this._type
    },
    Self.prototype.getId = function() {
        return this._id + ""
    },
    Self.prototype.beforeStateChange = function(e, t) {
        return true
    },
    Self.prototype.notifyStateChange = function(e, t) {
        return true
    },
    Self.prototype.afterStateChange = function(e, t) {},
    Self.prototype.updateState = function(state) {
        var _state = this._state;
        _state !== state && _state !== States.DEAD && this.beforeStateChange(_state, state) && (
            this._state = state,
            this._logger.log(
                'state changed \'' + this.getState() + '\', position: ' +
                this.getCurrentPosition() + ", duration: " + this.getDuration()
            ),
            this.notifyStateChange(_state, state) && this.trigger(events.STATE_CHANGE, state, this),
            this.afterStateChange(_state, state)
        )
    },
    Self.prototype.getState = function() {
        return this._state
    },
    Self.prototype._isInOneOfStates = function() {
        for (var arg in arguments)
            if (arguments[arg] === this.getState())
                return true;
        return false
    },
    Self.prototype.getCurrentPosition = function() {
        return this._currentPosition
    },
    Self.prototype.getLoadedPosition = function() {
        return this._loadedPosition
    },
    Self.prototype.getDuration = function() {
        return this._duration
    },
    Self.prototype._mediaHasProgressed = function() {
        var flag = false,
            now = Date.now();
        if (this._lastMediaClockCheck) {
            var timeDiff = now - this._lastMediaClockCheck,
                posDiff = this._currentPosition - this._lastMediaClockValue;
            if (.1 * timeDiff > posDiff) {
                if (this.getState() === States.PLAYING && 0 === posDiff && timeDiff < this._settings.bufferingDelay)
                    return true;
                flag = true
            }
        }
        return this._lastMediaClockValue = this._currentPosition,
            this._lastMediaClockCheck = now,
            !flag
    }
}())
