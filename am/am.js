(function() {
    var Self,
        _ = require('underscore'), //n(1),
        PlayerFactory = require('./player-factory'), //n(14),
        States = require('./states'), //n(38),
        Errors = require('./errors'), //n(43),
        Events = require('./events'), //n(39),
        Utils = require('./utils'), //n(16),
        Capabilities = require('./capabilities'), //n(42),
        Protocols = require('../protos'), //n(117),
        Mime = require('./mime'); //n(118);
    Self = function(options) {
        options = options || {};
            this._players = {};
            this._volume = 1;
            this._mute = false;
            this.States = States;
            this.Errors = Errors;
            this._settings = _.defaults({}, options, Self.defaults)
    },
    Self.MimeTypes = Mime,
    Self.Protocols = Protocols,
    Self.Events = Events,
    Self.States = States,
    Self.Errors = Errors,
    Self.BrowserUtils = Utils,
    Self.defaults = {
        audioObjectID: "html5AudioObject",
        updateInterval: 50,
        bufferTime: 8e3,
        maxBufferTime: 9e4,
        bufferingDelay: 500,
        streamUrlProvider: null,
        debug: false
    },
    Self.capabilities = Capabilities.names,
    Self.createDefaultMediaDescriptor = function(id, src, duration) {
        if (!id ||!src ||!src.length)
            throw new Error("invalid input to create media descriptor");
        return duration || (duration = 0), {
            id: id,
            src: src,
            duration: duration,
            forceSingle: false,
            forceHTML5: false,
            forceCustomHLS: false,
            mimeType: void 0
        }
    },
    Self.prototype.getAudioPlayer = function(playerId) {
        return this._players[playerId]
    },
    Self.prototype.hasAudioPlayer = function(playerId) {
        return void 0 !== this._players[playerId]
    },
    Self.prototype.removeAudioPlayer = function(playerId) {
        this.hasAudioPlayer(playerId) && delete this._players[playerId]
    },
    Self.prototype.setVolume = function(vol) {
        vol = Math.min(1, vol),
            this._volume = Math.max(0, vol);
        for (var playerId in this._players)
            this._players.hasOwnProperty(playerId) && this._players[playerId].setVolume(this._volume)
    },
    Self.prototype.getVolume = function() {
        return this._volume
    },
    Self.prototype.setMute = function(flag) {
        this._muted = flag;
        for (var playerId in this._players)
            this._players.hasOwnProperty(playerId) && this._players[playerId].setMute(this._muted)
    },
    Self.prototype.getMute = function() {
        return this._muted
    },
    Self.prototype.createAudioPlayer = function(descriptor, settings) {
        var player,
            _settings = _.assign({}, this._settings, settings);
        if (!descriptor)
            throw "AudioManager: No media descriptor object passed, can`t build any player";
        if (
            descriptor.id || (
                descriptor.id = Math.floor(1e10 * Math.random()).toString() + (new Date).getTime().toString()
            ),
            !descriptor.src
        )
            throw new Error("AudioManager: You need to pass a valid media source URL");
        if (!this._players[descriptor.id]) {
            if (
                player = PlayerFactory.createAudioPlayer(descriptor, _settings),
                !player
            )
                throw new Error("AudioManager: No player could be created from the given descriptor");
            this._players[descriptor.id] = player
        }
        return this._players[descriptor.id].setVolume(this._volume),
            this._players[descriptor.id].setMute(this._muted),
            this._players[descriptor.id].on(Events.STATE_CHANGE, this._onStateChange, this),
            this._players[descriptor.id]
    },
    Self.prototype._onStateChange = function(e, player) {
        player.getState() === States.DEAD && this.removeAudioPlayer(player.getId())
    }
    module.exports = Self
}())
