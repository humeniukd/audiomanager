/* 40 */
(function() {
    var instance,
        Logger = require('audio/logger'),
        wrapper = null;
    module.exports = function(type, id, title, settings) {
        if (
            !instance && (
                instance = Logger({
                    enabled: !!settings.debug,
                    buffer: false,
                    label: "audiomanager"
                }),
                wrapper
            )
        ) {
            var tmp = instance;
            instance = function() {
                tmp(wrapper(arguments[0] + "%s", Array.prototype.slice.call(arguments, 1)))
            }
        }
        return title = title && title.length ? " [" + title.replace(/\s/g, "").substr(0, 6) + "]" : "",
            {
                log: instance.bind(null, "%s (%s)%s", type, id, title)
            }
    }
}())