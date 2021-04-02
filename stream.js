/* 3381:7 */
define(['underscore', './protocols'], function (_, protocols) {
    function streamValidForPlayingFrom(e, position) {
        if (!e)
            return false;
        var endsAt = e.issuedAt + getIssuedFor(e.protocol, e.duration);
        return isHttpOrHls(e.protocol) ?
            Date.now() + e.duration - (position || 0) < endsAt :
            Date.now() < endsAt
    }

    function getIssuedFor(protocol, duration) {
        var withDuration = isHttpOrHls(protocol);
        return twoMinutes + (withDuration ? _.result(duration) : 0)
    }

    function isHttpOrHls(e) {
        return e === protocols.HTTP || e === protocols.HLS
    }

    function choosePreferredStream(streams, options) {
        function byBitrate(rateA, rateB) {
            return Math.abs(rateB - maxBitrate) - Math.abs(rateA - maxBitrate)
        }

        function invert(e) {
            return -1 * e
        }

        var rates, isInfinite, isNegativeInfinite, protocol, i, l, extension, j, len, config = {},
            maxBitrate = options.maxBitrate,
            protocols = options.protocols,
            extensions = options.extensions;
        for (_.each(streams, function (val, key) {
            var parts = key.split("_"),
                protocol = parts[0],
                extension = parts[1],
                bitrate = parts[2];
            config[protocol] = config[protocol] || {},
            config[protocol][extension] = config[protocol][extension] || {},
            config[protocol][extension][bitrate] = val
        }),
        i = 0, l = protocols.length; l > i; ++i)
            for (protocol = protocols[i], j = 0, len = extensions.length; len > j; ++j)
                if (extension = extensions[j], config[protocol] && config[protocol][extension])
                    return rates = Object.keys(config[protocol][extension]).map(Number).sort(invert),
                        isInfinite = 1 / 0 === maxBitrate,
                        isNegativeInfinite = maxBitrate === -1 / 0,
                        maxBitrate = isInfinite || isNegativeInfinite ?
                            rates[isInfinite ? "pop" : "shift"]() : rates.sort(byBitrate).pop(),
                    {
                        url: config[protocol][extension][maxBitrate],
                        bitrate: maxBitrate,
                        protocol: protocol,
                        extension: extension,
                        issuedAt: Date.now(),
                        duration: _.result(options.duration)
                    };
        return null
    }

    var c = .9,
        twoMinutes = Math.floor(12e4 * c);
    return {
        choosePreferredStream: choosePreferredStream,
        streamValidForPlayingFrom: streamValidForPlayingFrom
    };
});
