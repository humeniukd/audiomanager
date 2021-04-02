/* 51:44 */
define(['underscore', './html5-hls', './html5-single', '../states'], function(_, HTML5HLS, HTML5Single, States){
    var self;
    self = function (e, t) {
        HTML5Single.apply(this, arguments)
    },
    _.assign(self.prototype, HTML5Single.prototype),
    _.assign(self.prototype, _.pick(HTML5HLS.prototype, "_seekPosition", "getCurrentPosition", "_onStateChange")),
    self.prototype.seek = function (e) {
        HTML5Single.prototype.seek.apply(this, arguments),
        this._isInOneOfStates(States.LOADING, States.SEEKING) && (this._seekPosition = e)
    },
    self.prototype.getType = function () {
        return "HTML5 HLS single audio"
    };
    return self;
});