/* 3381:9 */
define(['./events'], function (events) {
    function onSeek(e) {
        this.listenTime += e.from - this.currentTime,
        this.currentTime = e.to
    }

    function onPause(e) {
        this.listenTime += e.position - this.currentTime,
        this.currentTime = e.position
    }

    function onPlayStart(e) {
        this.currentTime = e.position
    }

    var self = function (scAudio) {
        this.scAudio = scAudio,
        this.listenTime = 0,
        this.currentTime = 0,
        this.scAudio
            .on(events.SEEK, onSeek, this)
            .on(events.PLAY_START, onPlayStart, this)
            .on(events.PAUSE, onPause, this)
    };
    self.prototype = {
        constructor: self,
        getListenTime: function () {
            return this.listenTime + this.scAudio.currentTime() - this.currentTime
        }
    };
    return self
});
