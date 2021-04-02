/* 981 */
define(['./am/am'], function(AudioManager){
  var instance, updateInterval = 1e3 / 60;
  return {
    getInstance: function (debug) {
      return instance || (
        instance = new AudioManager({
          updateInterval: updateInterval,
          debug: false //debug
        }),
          instance.Errors = AudioManager.Errors,
          instance.Events = AudioManager.Events,
          instance.States = AudioManager.States,
          instance.UPDATE_INTERVAL = updateInterval
      ),
      instance
    }
  }
});
