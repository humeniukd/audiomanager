(function() {
    function validate(caps) {
        for (var cap in map)
            if (map.hasOwnProperty(cap) && void 0 === caps[map[cap]])
                throw new Error("Caps lack required field: " + cap);
        if (!(caps[map.PROTOCOLS] instanceof Array))
            throw new Error("Caps protocols must be an array");
        if (!(caps[map.MIMETYPES]instanceof Array))
            throw new Error("Caps mimetypes must be an array");
        return true
    }

    function createDefaults() {
        var defaults = {};
        return defaults[map.MIMETYPES] = [],
            defaults[map.PROTOCOLS] = [],
            defaults[map.AUDIO_ONLY] = true,
            defaults[map.CAN_SEEK_ALWAYS] = true,
            defaults[map.NEEDS_URL_REFRESH] = true,
            defaults
    }

    var map = {
        MIMETYPES: "mimetypes",
        PROTOCOLS: "protocols",
        AUDIO_ONLY: "audioOnly",
        CAN_SEEK_ALWAYS: "canSeekAlways",
        NEEDS_URL_REFRESH: "needsUrlRefresh"
    };
    module.exports = {
        createDefaults: createDefaults,
        names: map,
        validate: validate
    }
}())