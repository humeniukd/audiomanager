(function () {
  var callbacksProperty = "__eventCallbacks__";
  var isArray = function (array) {
    return array instanceof Array
  };
  var trigger = function (event) {
    if (!this.hasOwnProperty(callbacksProperty)) {
      return
    }
    var callbacks = this[callbacksProperty][event];
    if (!isArray(callbacks)) {
      return
    }
    var args = [].slice.call(arguments, 1);
    for (var i = 0; i < callbacks.length; i++) {
      if (typeof callbacks[i] === "function") {
        callbacks[i].apply(this, args)
      }
    }
  };
  var on = function (event, callback) {
    if (!this.hasOwnProperty(callbacksProperty)) {
      return
    }
    var callbacks = this[callbacksProperty][event];
    if (!isArray(callbacks)) {
      callbacks = this[callbacksProperty][event] = []
    }
    callbacks.push(callback)
  };
  var off = function (event, callback) {
    if (!this.hasOwnProperty(callbacksProperty)) {
      return
    }
    var callbacks = this[callbacksProperty][event];
    if (!isArray(callbacks)) {
      return
    }
    for (var i = callbacks.length; i-- > 0;) {
      if (callbacks[i] === callback) {
        callbacks.splice(i, 1)
      }
    }
  };
  module.exports = function (obj) {
    obj[callbacksProperty] = {};
    obj.trigger = trigger;
    obj.on = on;
    obj.off = off
  }
})();
