/* 426 */
define(['underscore', 'jquery', 'audio', 'audio/am-provider', 'helpers/ua', 'broadcast', 'lib/event-gw'],
    function(_, Audio, AudioManager, UA, PubSub, EventGw) {
    function onAll(sound, event, additionalData) {
        var type = eventTypes[event];
        if (type) {
            var data = _.defaults({
                sound: sound,
                model: sound,
                type: type,
                controller: this.controller
            }, additionalData);
            PubSub.trigger("audio:" + type, data),
            sound.trigger(type, data)
        } else
            switch (event) {
                case Events.STREAMS:
                case Events.NO_STREAMS:
                    sound.set("playable", !!this.streamInfo),
                    this.streamInfo || PubSub.trigger("error:audio_no_streams");
                    break;
                case Events.REGISTERED:
                    sound.set("playback_count", sound.get("playback_count") + 1);
                    break;
                case Events.DESTROYED:
                    this.unregisterModelEventListener(sound);
                    break;
                case Events.NO_PROTOCOL:
                    PubSub.trigger("error:audio_support");
                    break;
                case Events.AUDIO_ERROR:
                    PubSub.trigger("error:audio_error")
            }
    }
    var Events = Audio.Events,
        eventTypes = _.object([
            [Events.PLAY, "play"],
            [Events.PLAY_START, "playStart"],
            [Events.PAUSE, "pause"],
            [Events.FINISH, "finish"],
            [Events.SEEKED, "seeked"],
            [Events.TIME, "time"],
            [Events.BUFFERRING_START, "buffering:start"],
            [Events.BUFFERRING_END, "buffering:end"],
            [Events.GEO_BLOCKED, "geoBlocked"]
        ]);
    return {
        createSCAudioInstance: function (sound) {
            Audio.setAudioManagerOnce(AudioManager.getInstance(false));
            var audio = new Audio({
                soundId: sound.id,
                resourceId: sound.resource_id,
                duration: sound.duration.bind(sound),
                streamUrlsEndpoint: sound.streamsUrl.bind(sound),
                asyncFetch: !UA.isMobile,
                mediaSourceEnabled: true,
                debug: false,
                eventLogger: EventGw,
                logErrors: true,
            });
            return audio.registerModelEventListener(sound, onAll),
                audio
        }
    }
})
