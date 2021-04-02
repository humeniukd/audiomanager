(function() {
    "use strict";
    function getPrinter() {
        function getLevel(level, arg) {
            if (_enabled) {
                for (
                    var len = arguments.length,
                        args = new Array(len > 2 ? len - 2 : 0),
                        i = 2; len > i; i++
                )
                args[i - 2] = arguments[i];
                if ("string" == typeof arg)
                    arg = " " + arg
                else {
                    args.unshift(arg)
                    arg = ""
                }
                var logArgs = [time() + " | " + Label + (isEnabled ? "%c" : "") + arg].concat(Colors, args);
                _buf ? buffer.push({
                    level: level,
                    logArgs: logArgs
                }) > _bufferSize && buffer.shift() : cons[level].apply(cons, logArgs)
            }
        }
        function time() {
            var now = new Date,
                diff = null === lastTs ? 0 : now - lastTs,
                prefix = isEnabled ? "%c" : "";
            return lastTs =+ now,
                prefix + formatDate(now) + (prefix + " (" + prefix) + pad("+" + diff + "ms", " ", 8) + (prefix + ")")
        }
        function applyBuffer(e) {
            return e.enable = function() {
                    _enabled=true
                },
                e.disable = function() {
                    _enabled=false
                },
                e.bufferOn = function() {
                    _buf=true
                },
                e.bufferOff = function() {
                    _buf=false,
                    buffer.length = 0
                },
                e.flush = isReady() ? function() {
                    buffer.forEach(function(item) {
                        var level = item.level,
                            logArgs = item.logArgs;
                        cons[level].apply(cons, logArgs)
                    }),
                    buffer.length = 0
                } : function() {},
                e
        }
        var args = getArgs.apply(void 0, arguments),
            enabled = args.enabled,
            _enabled = void 0 === enabled ? true : enabled,
            buf = args.buffer,
            _buf = void 0 === buf ? false : buf,
            label = args.label,
            _label = void 0 === label ? "" : label,
            plainOutput = args.plainOutput,
            _plainOutput = void 0 === plainOutput ? false : plainOutput,
            bufferSize = args.bufferSize,
            _bufferSize = void 0 === bufferSize ? 1e3 : bufferSize;
        if (!isReady())
            return applyBuffer(
                levels.reduce(function(res, item) {
                        return res[item] = res
                    },
                    function() {}
                )
            );
        cons.CL || (cons.CL = {
            _cssCounter: 0
        });
        var isEnabled = !_plainOutput && isSupported(),
            lastTs = null,
            buffer = [],
            Label = format(_label, isEnabled),
            Colors = isEnabled ? ["color: green", "color: grey", "color: blue", "color: grey", f(_label), ""] : [],
            printer = cons.CL[_label] = applyBuffer(
                levels.reduce(function(res, item) {
                    return res[item] = getLevel.bind(null, item),
                        res
                    },
                    getLevel.bind(null, "log")
                )
            );
        return printer
    }
    function formatDate(date) {
        return zeroPad(date.getHours()) + ":" + zeroPad(date.getMinutes()) + ":" + zeroPad(date.getSeconds()) + "." + pad(date.getMilliseconds(), "0", 3)
    }
    function pad(str, padWith, n) {
        return repeat(padWith, n - ("" + str).length) + str
    }
    function zeroPad(str) {
        return pad(str, "0", 2)
    }
    function repeat(str, n) {
        return n > 0 ? new Array(n + 1).join(str) : ""
    }
    function format(msg, flag) {
        return (flag ? "%c" : "") + (msg ? msg : "")
    }
    function isSupported() {
        if ("undefined" == typeof navigator)
            return false;
        var ua = navigator.userAgent;
        return /chrome|firefox|opr/i.test(ua) && !/msie|edge/i.test(ua)
    }
    function isReady() {
        return cons && levels.every(function(level) {
            return "function" == typeof cons[level]
        })
    }
    function getArgs() {
        var options = arguments.length <= 0 || void 0 === arguments[0] ? true : arguments[0],
            label = arguments.length <= 1 || void 0 === arguments[1] ? "" : arguments[1];
        return "object" == typeof options && options || {
            enabled: true,
            label: label
        }
    }
    module.exports = getPrinter;
    var levels = ["log", "info", "warn", "error"],
        cons = "undefined" != typeof console ? console : null,
        css = ["color:#fff", "border-radius:3px", "padding:2px 4px", "font-family:sans-serif", "text-transform:uppercase", "font-size:9px"].join(";") + ";",
        f = function() {
            var colors = ["#51613C", "#447848", "#486E5F", "#787444", "#6E664E"];
            return function(flag) {
                return flag ? "background:" + colors[cons.CL._cssCounter++ % colors.length] + ";" + css : ""
            }
        }()
}())
