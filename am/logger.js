/* 51:41 */
define([], function () {
    var self;
    self = function (type, id, options) {
        this.enabled = options.debug,
        this.type = type,
        this.id = id
    },
    self.prototype.log = function (message) {
        this.enabled && window.console.log((new Date).toString() + " | " + this.type + " (" + this.id + "): " + message)
    };
    return self;
});