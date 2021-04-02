(function() {
    function init() {
        function enqueue(e) {
            queue.push(e),
            contentWindow.postMessage(msg, "*")
        }
        function onMessage(e) {
            e.data === msg && (
                e.stopPropagation(),
                queue.length > 0 && queue.shift()()
            )
        }
        var _window = window,
            _document = _window.document;
        if (!_window.postMessage)
            return function(e) {
                _window.setTimeout(e, 0)
            };
        var queue = [],
            msg = "zero-timeout-message-" + Math.random(),
            iframe = _document.createElement("iframe");
        iframe.style.display = "none",
        iframe.src = "",
        _document.documentElement.appendChild(iframe);
        var contentWindow = iframe.contentWindow,
            document = contentWindow.document;
        return document.open(),
            document.write(""),
            document.close(),
            contentWindow.addEventListener("message", onMessage, true),
            enqueue
    }
    module.exports = {
        setImmediate: function() {
            var doJob;
            return function(fn) {
                doJob || (
                    doJob = init()
                ),
                doJob(fn)
            }
        }()
    }
}())