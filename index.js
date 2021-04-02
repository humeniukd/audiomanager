(function() {
  function processHooksPause(e) {
    return this._hooksPause.every(function(item) {
      return item(e)
    })
  }
  function getIdentifier(model) {
    var id = model.resource_id || model.id || model.cid;
    if (!id)
      throw new Error('Your model should have a unique `id`, `cid` or `resource_id` property');
    return id
  }
  function setAudioManager(AM) {
    audioManager = AM,
    AM && (Self.AudioManagerStates = AM.States)
  }
  function createAudioPlayer(e) {
    var _options,
      options = this.options;
    return _options = {
        id: this.getId(),
        src: e.url,
        duration: _.result(options, 'duration'),
        title: this.options.title,
        mimeType: e.mimeType,
        forceSingle: options.useSinglePlayer
      },
    audioManager.createAudioPlayer(_options)
  }
  function toggleEventHandlers(obj, flag) {
    var AMEvents = audioManager.Events,
      method = flag ? 'on': 'off';
    obj[method](AMEvents.STATE_CHANGE, onStateChange, this)
      [method](AMEvents.POSITION_CHANGE, onPositionChange, this)
      [method](AMEvents.METADATA, onMetadata, this)
  }
  function onMetadata() {
    this.trigger(events.METADATA)
  }
  function onPositionChange() {
    this._prevPosition !== this.currentTime() && (
      this.trigger(events.TIME),
      this._prevPosition = this.currentTime()
    )
  }
  function rejectInitAudioDefer() {
    this._initAudioDefer && (
      this._initAudioDefer.reject(),
      this._initAudioDefer = null,
      this.streamInfo = null
    )
  }
  function reset() {
    rejectInitAudioDefer.call(this),
    this.controller && (
      this._storedPosition = this.currentTime(),
      this.controller.kill(),
      this.controller = null,
      this.trigger(events.RESET)
    )
  }
  function onEnd() {
    this._registerPlays = true,
    this.pause(),
    this.trigger(events.FINISH)
  }
  function getPreferredStream(e) {
    return ''
  }
  function onRequestFailure(xhr) {
    xhr.status >= 400 && xhr.status < 500 && this.trigger(events.REQUEST_FAILURE)
  }
  function onGeoBlocked(xhr) {
    var flag = xhr.status >= 400 && xhr.status < 500 &&
      -1 !== (xhr.responseText || '').indexOf('geo_blocked');
    flag && this.trigger(events.GEO_BLOCKED)
  }
  function onNoConnection(xhr) {
    0 === xhr.status && this.trigger(events.NO_CONNECTION)
  }
  function onApiFailure(xhr) {
    xhr.status >= 500 && this.trigger(events.API_FAILURE)
  }
  function needsUrlRefresh() {
    return this.controller && this.controller.getCapabilities && this.controller.getCapabilities() ?
      this.controller.getCapabilities().needsUrlRefresh : true
  }
  function isValid(pos) {
    if (!needsUrlRefresh.call(this))
      return true;
    var dfdState = this._initAudioDefer && this._initAudioDefer.state(),
      isValid = Stream.streamValidForPlayingFrom(this.streamInfo, pos);
    return this.controller && this.controller.hasStreamUrlProvider && this.controller.hasStreamUrlProvider() ?
      true :
      dfdState && ('pending' === dfdState || 'resolved' === dfdState && isValid)
  }
  function buffering(flag) {
    flag && !this._bufferingTimeout ?
      this._bufferingTimeout = window.setTimeout(function() {
        this._isBuffering = true,
        this.trigger(events.BUFFERRING_START)
      }.bind(this), bufferDelay)
      :
      flag || (
        this._bufferingTimeout && (
          window.clearTimeout(this._bufferingTimeout),
          this._bufferingTimeout = null
        ),
        this._isBuffering && (
          this._isBuffering = false,
          this.trigger(events.BUFFERRING_END)
        )
      )
  }
  function onSeek() {
    this.off(events.TIME, this.seekTimeEventHandler),
    this.trigger(events.SEEKED),
    this.seekTimeEventHandler = null
  }
  function resetErrorRecovery() {
    this._errorRecoveryFlagsResetTimeout = window.setTimeout(function() {
      this._errorRecoveryTime = null,
      this._errorRecoveryCounts = 0
    }.bind(this), recoveryResetTimeout)
  }
  function clearErrorRecoveryFlagsResetTimeout() {
    this._errorRecoveryFlagsResetTimeout && window.clearTimeout(this._errorRecoveryFlagsResetTimeout)
  }
  function errorRecovery() {
    var e = this.isPlaying(),
      now = Date.now();
    return clearErrorRecoveryFlagsResetTimeout.call(this),
      this._errorRecoveryTime && this._errorRecoveryTime + recoveryTimeout > now && this._errorRecoveryCounts > maxRecoveryTries ?
      void this.trigger(events.AUDIO_ERROR, this) : (
        this._errorRecoveryTime = Date.now(),
        this._errorRecoveryCounts++,
        reset.call(this),
        void(e && this.play({
          seek: this.currentTime(),
          userInitiated: false
        }))
      )
  }
  function logAudioError(e) {
    this.logAudioError({
      error_code: e,
      protocol: this.streamInfo ? this.streamInfo.protocol: void 0,
      player_type: this.controller ? this.controller.getType(): void 0,
      host: this.streamInfo ? URL.getUrlHost(this.streamInfo.url): void 0,
      url: this.streamInfo ? this.streamInfo.url: void 0
    })
  }
  function onErr() {
    var err,
      AMErrors = audioManager.Errors;
    if (!this.controller)
      return logger.error('(%s) Controller is null, aborting error handler.', this.getId(), this),
        logAudioError.call(this, null),
        void errorRecovery.call(this);
    switch (
      err = this.controller && this.controller.getErrorID(),
      logger.error(
        '(%s) %s',
        this.getId(),
        this.controller.getErrorMessage ? this.controller.getErrorMessage() :
          'Controller does not provide getErrorMessage()'
      ),
      isOneOf(err, 'MSE', 'GENERIC',
        'HTML5_AUDIO_DECODE',
        'HTML5_AUDIO_SRC_NOT_SUPPORTED'
      ) && logAudioError.call(this, err),
      err
    ) {
      case AMErrors.HTML5_AUDIO_NETWORK:
      case AMErrors.HTML5_AUDIO_ABORTED:
      case AMErrors.HTML5_AUDIO_DECODE:
      case AMErrors.HTML5_AUDIO_SRC_NOT_SUPPORTED:
      case AMErrors.GENERIC_AUDIO_ENDED_EARLY:
      case AMErrors.MSE_BAD_OBJECT_STATE:
      case AMErrors.MSE_NOT_SUPPORTED:
      case AMErrors.MSE_MP3_NOT_SUPPORTED:
      case AMErrors.MSE_HLS_NOT_VALID_PLAYLIST:
      case AMErrors.MSE_HLS_PLAYLIST_NOT_FOUND:
      case AMErrors.MSE_HLS_SEGMENT_NOT_FOUND:
        errorRecovery.call(this);
        break;
      case AMErrors.GENERIC_AUDIO_OVERRUN:
        onEnd.call(this);
        break;
      default:
        logger.error('(%s) Unhandled audio error code: %s', this.getId(), err, this)
    }
  }
  function onAll(e, options) {
    switch (
      this.options.debug && debug.call(this, e, options),
      e
    ) {
      case events.PAUSE:
        this._isPlaying = false,
        this._isPlayActionQueued = false;
        break;
      case events.PLAY:
        var _options = options;
        this.toggleMute(settings.muted),
        this.setVolume(settings.volume),
        this._isPlaying = false,
        this._isPlayActionQueued = true,
        this._userInitiatedPlay = void 0 !== _options.userInitiated ? !!_options.userInitiated : true,
        listenOnline.call(this);
        break;
      case events.PLAY_START:
        this._isPlaying = true,
        this._isPlayActionQueued = false,
        this._registerPlays && this.registerPlay();
        break;
      case events.BUFFERRING_START:
      case events.SEEK:
        this._isPlaying && (
          this._isPlaying = false,
          this._isPlayActionQueued = true
        );
        break;
      case events.BUFFERRING_END:
      case events.SEEKED:
        this._isPlayActionQueued && (
          this._isPlaying = true,
          this._isPlayActionQueued = false
        );
        break;
      case events.NO_CONNECTION:
        this.pause(),
        this._hasNoConnection = true,
        this._noConnectionSince = Date.now();
        break;
      case events.API_FAILURE:
        this.pause();
        break;
      case events.REQUEST_FAILURE:
        this._isPlaying = false,
        this._isPlayActionQueued = false;
        break;
      case events.GEO_BLOCKED:
        this._isGeoBlocked = true;
        break;
      case events.NO_STREAMS:
        buffering.call(this, false),
        rejectInitAudioDefer.call(this),
        onNoStreams.call(this);
        break;
      case events.STREAMS:
        this._isGeoBlocked = false,
        this._noConnectionSince = null,
        this._hasNoConnection = false;
        break;
      case events.ONLINE:
        onOnlineErr.call(this);
        break;
      case events.OFFLINE:
    }
  }
  function onStateChange(state) {
    var AMStates = audioManager.States,
      AMErrors = audioManager.Errors;
    switch (state) {
      case AMStates.IDLE:
        resolveInitAudioDefer.call(this)
        break;
      case AMStates.PAUSED:
        resolveInitAudioDefer.call(this),
        buffering.call(this, false),
        this.seekTimeEventHandler && this.isPaused() && onSeek.call(this),
        this.isPlaying() && this.trigger(events.PAUSE, {
          position: this.currentTime()
        });
        break;
      case AMStates.PLAYING:
        resolveInitAudioDefer.call(this),
        buffering.call(this, false),
        resetErrorRecovery.call(this),
        this.trigger(events.PLAY_RESUME);
        break;
      case AMStates.LOADING:
      case AMStates.SEEKING:
        resolveInitAudioDefer.call(this),
        buffering.call(this, true);
        break;
      case AMStates.ENDED:
        resolveInitAudioDefer.call(this),
        onEnd.call(this);
        break;
      case AMStates.ERROR:
        buffering.call(this, false),
        onErr.call(this)
    }
    this.trigger(events.STATE_CHANGE, state)
  }
  function debug(e, t) {
    var title = this.options.title;
    title = title && title.length ? ' [' + title.replace(/\s/g, '').substr(0, 6) + ']' : '',
    e === events.STATE_CHANGE ?
      logger('(%s)%s Event: %s (%s)',this.getId(), title, e, t) :
      e !== events.TIME || this._loggedTime ?
        e !== events.TIME && logger('(%s)%s Event: %s', this.getId(), title, e) :
        logger('(%s)%s Event: %s %dms', this.getId(), title, e, this.currentTime()),
        this._loggedTime = e === events.TIME
  }
  function resolveInitAudioDefer() {
    this._initAudioDefer && this._initAudioDefer.resolve()
  }
  function isOneOf(e) {
    return void 0 === audioManager.Errors[e] ? false :
      Array.prototype.slice.call(arguments, 1).some(function(item) {
        return 0 === e.indexOf(item)
      })
  }
  function listenOnline() {
    function onOnline() {
      var onLine = window.navigator.onLine;
      logger('Navigator `onLine` status is now: ' + onLine),
      window.setTimeout(function() {
        window.navigator.onLine === onLine && this.trigger(onLine ? events.ONLINE : events.OFFLINE)
      }.bind(this), 500)
    }
    this._onlineEventsRegistered || (
      this._onlineEventsRegistered = true,
      window.addEventListener('online', onOnline.bind(this)),
      window.addEventListener('offline', onOnline.bind(this))
    )
  }
  function onOnlineErr() {
    if (this.hasNoConnection() && this._isPlayRetryQueued) {
      var offMs = Date.now() - this._noConnectionSince;
      this._isPlayRetryQueued = true,
      offMs < this.options.retryAfterNoConnectionEventTimeout && this.play({
        userInitiated: false
      })
    }
  }
  function onNoStreams() {
    this.hasNoConnection() && !this._userInitiatedPlay && (
      this._isPlayRetryQueued = true
    )
  }
  var Self,
    audioManager,
    logger,
    AudioLogger = require('audio/audio-logger'),
    PerfMonitor = require('audio/perfmon'),
    Logger = require('audio/logger'),
    events = require('audio/events'),
    Extensions = require('audio/extensions'),
    eventize = require('./eventize'),
    protos = require('audio/protos'),
    Protocols = require('audio/protocols'),
    Stream = require('audio/stream'),
    URL = require('helpers/url'),
    _ = require('underscore'),
    Volume = require('audio/volume'),
  settings = {
    muted: false,
    volume: 1
  },
  registeredIds = [],
  notInitialised = {},
  defaults = {
    soundId: notInitialised,
    duration: notInitialised,
    title: null,
    registerEndpoint: null,
    streamUrlsEndpoint: notInitialised,
    resourceId: false,
    debug: true,
    asyncFetch: true,
    useSinglePlayer: true,
    protocols: [protos.HLS, protos.RTMP, protos.HTTP],
    extensions: [Extensions.MP3],
    maxBitrate: 1 / 0,
    mediaSourceEnabled: false,
    mseFirefox: false,
    mseSafari: false,
    eventLogger: null,
    logErrors: true,
    logPerformance: true,
    retryAfterNoConnectionEventTimeout: 6e4,
    fadeOutDurationOnPause: 0,
    fadeOutDurationOnConcurrentStreaming: 0,
    fadeOutDurationOnFinish: 0,
    fadeOutAlgo: Volume.VolumeAutomator.Algos.EaseInOut,
    previewOnly: false
  },
  syncTimeout = 6e3,
  asyncTimeout = 6e3,
  bufferDelay = 400,
  playRegTimeout = 6e4,
  recoveryTimeout = 6e3,
  maxRecoveryTries = 3,
  recoveryResetTimeout = 3e4;
  Self = module.exports = function(e, options) {
    if (
      1 === arguments.length ? options = e : Self.setAudioManager(e),
      !audioManager
    ) throw new Error('SCAudio: AudioManager instance must be set with `SCAudio.setAudioManager()` or passed via the constructor');

    this.options = _.extend({}, defaults, options);

    var missingOptions = Object.keys(this.options).filter(function(e) {
      return this.options[e] === notInitialised
    }, this);

    if (missingOptions.length)
      throw new Error('SCAudio: pass into constructor the following options: ' + missingOptions.join(', '));
    Protocols.prioritizeAndFilter(this.options),
    this.controller = null,
    this.streamInfo = null,
    this._userInitiatedPlay = this._registerPlays = true,
    this._registerCounts = this._errorRecoveryCounts = 0,
    this._isPlayActionQueued = this._onlineEventsRegistered = this._usedPrefetchUrls = this._isPlaying 
      = this._isBuffering = this._hasNoConnection
      = false,
    this._initAudioDefer = this._expirationTimeout = this._bufferingTimeout = this._errorRecoveryTime
      = this._errorRecoveryFlagsResetTimeout = this._storedPosition = this._prevPosition
      = this._noConnectionSince
      = null,
    this.options.debug && (this._loggedTime = false),
    this._modelListeners = {},
    this._hooksPause = [],
    this.audioPerfMonitor = new PerfMonitor(this, this.logAudioPerformance.bind(this)),
    this.audioLogger = new AudioLogger(this),
    this.volumeAutomator = new Volume.VolumeAutomator(this),
    logger = logger || Logger({
      enabled: this.options.debug,
      buffer: false,
      label: 'scaudio'
    })
  },
  eventize(Self.prototype),
  _.extend(Self.prototype, {
    constructor: Self,
    initAudio: function() {
          var flag = true;
          this.streamInfo && (flag = false),
          this.streamInfo = getPreferredStream(),
          flag && this.trigger(events.STREAMS),
          this.controller = createAudioPlayer.call(this, e),
          toggleEventHandlers.call(this, this.controller, true),
          onStateChange.call(this, this.controller.getState())
          this.trigger(events.CREATED)
          //this.trigger(events.NO_STREAMS)
    },
    updateOptions: function(options) {
      _.extend(this.options, options)
    },
    registerPlay: function() {},
    toggle: function() {
      this[this.isPaused() ? 'play': 'pause']()
    },
    play: function(options) {
      var pos;
      if (options && null != options.seek)
        pos = options.seek;
      else {
        if (this.isPlaying())
          return;
        pos = this.currentTime()
      }
      options = _.extend({}, options, {
        position: pos
      }),
      this.trigger(events.PLAY, options),
      isValid.call(this, pos) || (
        reset.call(this),
        this._isPlayActionQueued = true
      ),
      this.initAudio()
      this._isPlayActionQueued && (
        this._storedPosition = null,
        this.trigger(events.PLAY_START, options),
        this.controller && this.controller.play(pos)
      )
      buffering.call(this, true)
    },
    pause: function(options) {
      this.isPaused() || (
        options = _.extend({}, options, {
          position: this.currentTime()
        }),
        processHooksPause.call(this, options) && (
          this.trigger(events.PAUSE, options),
          this.callPauseOnController()
        )
      )
    },
    callPauseOnController: function() {
      this.controller && this.controller.pause()
    },
    registerHook: function(e, t) {
      switch (e) {
      case'pause':
        this._hooksPause.push(t);
        break;
      default:
        throw new Error('can`t register hook for ' + e)
      }
    },
    getListenTime: function() {
      return this.audioLogger ? this.audioLogger.getListenTime() : 0
    },
    dispose: function() {
      this.audioLogger = null,
      this.audioPerfMonitor = null,
      _.without(registeredIds, this.options.soundId),
      window.clearTimeout(this._bufferingTimeout),
      rejectInitAudioDefer.call(this),
      this.controller && (
        this.controller.kill(),
        this.controller = null
      ),
      delete this.controller,
      this.trigger(events.DESTROYED),
      this.off();
    },
    seek: function(e) {
      return this.controller ? e >= _.result(this.options, 'duration') ? void onEnd.call(this) : (
        this.seekTimeEventHandler && this.off(events.TIME, this.seekTimeEventHandler),
        this.seekTimeEventHandler = _.after(2, function() {
          onSeek.call(this)
        }.bind(this)),
        this.on(events.TIME, this.seekTimeEventHandler), this.trigger(events.SEEK, {
          from: this.currentTime(),
          to: e
        }),
        this.isPlaying()&&!isValid.call(this, e) ? (
          reset.call(this),
          void this.play({
            seek : e
          })
        ) : void this.controller.seek(e)
      ) : void 0
    },
    seekRelative: function(e) {
      this.controller && this.seek(this.currentTime() + e)
    },
    currentTime: function() {
      return this._storedPosition ? this._storedPosition : this.controller ? this.controller.getCurrentPosition() : 0
    },
    loadProgress: function() {
      var prog = 0;
      return this.controller && (
        prog = this.controller.getLoadedPosition() / this.controller.getDuration(),
        prog = prog >= .99 ? 1 : prog
      ),
      prog
    },
    duration: function() {
      return this.controller && this.controller.getDuration() || 0
    },
    buffered: function() {
      return this.controller && this.controller.getLoadedPosition() || 0
    },
    isPaused: function() {
      return !this.isPlaying()
    },
    isBuffering: function() {
      return this._isBuffering
    },
    isPlaying: function() {
      return this._isPlayActionQueued || this._isPlaying
    },
    isLoading: function() {
      return !(!this.controller || this.controller.getState() !== audioManager.States.LOADING)
    },
    hasNoConnection: function() {
      return !!this._hasNoConnection
    },
    hasStreamInfo: function() {
      return !!this.streamInfo
    },
    isGeoBlocked: function() {
      return !!this._isGeoBlocked
    },
    toggleMute: function(e) {
      Self.toggleMute(e)
    },
    isMuted: function() {
      return Self.isMuted()
    },
    setVolume: function(e) {
      Self.setVolume(e)
    },
    getVolume: function() {
      return Self.getVolume()
    },
    getAudioManagerStates: function() {
      return audioManager.States
    },
    getId: function() {
      return this.options.resourceId || this.options.soundId
    },
    registerModelEventListener: function(model, cb) {
      var id = getIdentifier(model);
      if (this._modelListeners[id])
        throw new Error('Data model is already registered (forgot to unregister it or registering twice?)');
      this._modelListeners[id] = cb = cb.bind(this, model),
      this.on('all', cb)
    },
    unregisterModelEventListener: function(e) {
      var id = getIdentifier(e);
      this._modelListeners[id] && (
        this.off('all', this._modelListeners[id]),
        delete this._modelListeners[id]
      )
    },
    trigger: function(e, t) {
      onAll.call(this, e, t),
      Events.trigger.call(this, e, t)
    }
  }),
  _.extend(Self, {
    getSettings: function() {
      return settings
    },
    setSettings: function(e) {
      _.extend(settings, e)
    },
    setAudioManager: setAudioManager,
    setAudioManagerOnce: _.once(setAudioManager),
    toggleMute: function(e) {
      settings.muted = void 0 === e ? !settings.muted : !!e,
      audioManager && audioManager.setVolume(settings.muted ? 0 : 1)
    },
    isMuted: function() {
      return settings.muted
    },
    setVolume: function(e) {
      settings.volume = void 0 === e ? 1 : e,
      audioManager && audioManager.setVolume(settings.volume)
    },
    getVolume: function() {
      return settings.volume
    },
    Extensions: Extensions,
    Protocols: protos,
    Events: events,
    FadeOutAlgos: Volume.VolumeAutomator.Algos,
    BUFFER_DELAY: bufferDelay,
    PLAY_REGISTRATION_TIMEOUT: playRegTimeout
  })
}())
