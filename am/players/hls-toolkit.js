/* 51:79 */
define(['underscore', '../../eventize', '../errors'],
    function(_, eventize, Errors) {
    var self,
    encryption = null,
    Statuses = {
        NEW: 0,
        REQUESTED: 1,
        COMPLETE: 2,
        FAILED: 400
    },
    m3uStr = {
        FIRST: "#EXTM3U",
        PLAYLIST: "#EXT-X-STREAM-INF:",
        SEGMENT: "#EXTINF:",
        END_TAG: "#EXT-X-ENDLIST",
        ENCRYPTION: "#EXT-X-KEY:"
    };
    self = function (logger, descriptor) {
        var url;
        this._descriptor = descriptor,
        this._logger = logger,
        url = descriptor.src,
        url.indexOf("?") > -1 && (
            url = url.substr(0, url.indexOf("?"))
        ),
        this._baseURI = url.substr(0, url.lastIndexOf("/") + 1)
    },
    self.Events = {
        PLAYLIST_LOADED: "playlist-loaded",
        PLAYLIST_FAILED: "playlist-failed",
        SEGMENT_LOADED: "segment-loaded",
        SEGMENT_FAILED: "segment-failed"
    },
    eventize(self.prototype),
    self.Segment = function (uri, startPos, duration, index) {
        _.assign(this, {
            uri: uri,
            startPosition: startPos,
            endPosition: startPos + duration,
            duration: duration,
            index: index,
            data: null,
            status: Statuses.NEW,
            last: false
        })
    },
    self.Segment.prototype.containsTime = function (e) {
        return e >= this.startPosition && e <= this.endPosition
    },
    self.prototype.updatePlaylist = function () {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", this._descriptor.src, true),
        xhr.responseType = "text",
        xhr.send(),
        this._logger.log("Downloading playlist"),
        xhr.onload = _.bind(function (t) {
            return 200 !== xhr.status ?
                void this.trigger(self.Events.PLAYLIST_FAILED, Errors.MSE_HLS_PLAYLIST_NOT_FOUND)
            : (
                this._segments = [],
                this._parsePlaylist(xhr.responseText),
                void(
                    this._segments.length > 0 ? (
                        this._logger.log("Playlist download complete"),
                        this._retrieveEncryptionKey(function () {
                            this.trigger(self.Events.PLAYLIST_LOADED, this._segments)
                        })
                    ) : this.trigger(self.Events.PLAYLIST_FAILED, Errors.MSE_HLS_NOT_VALID_PLAYLIST)
                )
            )
        }, this),
        xhr.onerror = _.bind(function (e) {
            this.trigger(self.Events.PLAYLIST_FAILED, Errors.MSE_HLS_PLAYLIST_NOT_FOUND)
        }, this)
    },
    self.prototype._parsePlaylist = function (e) {
        var line, url, duration,
            strings = e.split("\n"),
            i = 0,
            idx = 0;
        for (this._duration = 0; i < strings.length;)
            line = strings[i++],
            0 === line.indexOf(m3uStr.SEGMENT) ? (
                duration = 1e3 * Number(line.substr(8, line.indexOf(",") - 8)),
                url = this._createSegmentURL(strings[i]),
                this._appendSegment(new self.Segment(url, this._duration, duration, idx++)),
                i++
            ) : 0 === line.indexOf(m3uStr.ENCRYPTION) && this._parsePlaylistEncryptionHeader(line);
        this.getSegment(this.getNumSegments() - 1).last = true
    },
    self.prototype._appendSegment = function (seg) {
        this._segments.push(seg),
        this._duration += seg.duration
    },
    self.prototype._parsePlaylistEncryptionHeader = function (line) {
        var uri, method, iv,
            str = line.substr(m3uStr.ENCRYPTION.length).split(",");
        if (
            str.replace(/.*/, function (line) {
                line.indexOf("METHOD") >= 0 ?
                    method = line.split("=")[1] :
                    line.indexOf("URI") >= 0 ? uri = line.split("=")[1] :
                        line.indexOf("IV") >= 0 && (iv = line.split("=")[1])
            }),
            !(method && uri && method.length && uri.length)
        )
            throw new Error("Failed to parse M3U8 encryption header");
        method = method.trim(),
        uri = uri.trim().replace(/"/g, ""),
        this._encryptionMethod = method,
        this._encryptionKeyUri = uri,
        iv && iv.length ? (
            this._encryptionIvHexString = iv.trim(),
            this._parseEncryptionIvHexString()
        ) : this._encryptionIv = null
    },
    self.prototype._parseEncryptionIvHexString = function () {
        var d,
            ivHex = this._encryptionIvHexString.replace("0x", ""),
            encryptionIv = new Uint16Array(8),
            i = 0;
        if (ivHex.length % 4 !== 0)
            throw new Error("Failed to parse M3U8 encryption IV (length is not multiple of 4)");
        for (; i < ivHex.length; i += 4) {
            if (
                d = parseInt(ivHex.substr(i, 4), 16),
                isNaN(d)
            )
                throw new Error("Failed to parse hex number in IV string");
            encryptionIv[i / 4] = d
        }
        this._encryptionIv = encryptionIv
    },
    self.prototype._encryptionIvForSegment = function (seg) {
        var dv = new DataView(new ArrayBuffer(16));
        return dv.setUint32(0, seg.index, true),
            dv.buffer
    },
    self.prototype._retrieveEncryptionKey = function (e) {
        if (e) {
            if (!this._encryptionKeyUri)
                return void e.call(this);
            var encryptionKeyUri = this._encryptionKeyUri,
                xhr = new XMLHttpRequest;
            xhr.open("GET", encryptionKeyUri, true),
            xhr.responseType = "arraybuffer",
            xhr.onload = _.bind(function (i) {
                200 === xhr.status ?
                    this._encryptionKey = new Uint8Array(xhr.response) :
                    this._logger.log("Failed to retrieve encryption key from " + encryptionKeyUri + ", returned status " + xhr.status),
                    e.call(this)
            }, this),
            xhr.send(),
            this._logger.log("Downloading encryption key from " + encryptionKeyUri)
        }
    },
    self.prototype._removeEncryptionPaddingBytes = function (e) {
        var t = e.data[e.data.byteLength - 1];
        t ? (
            this._logger.log("Detected PKCS7 padding length of " + t + " bytes, slicing segment."),
            e.data = e.data.subarray(0, e.data.byteLength - t)
        ) : this._logger.log("No padding detected (last byte is zero)")
    },
    self.prototype.decryptSegmentAES128 = function (e) {
        if (this._logger.log("Decrypting AES-128 cyphered segment ..."), !encryption)
            throw new Error("AES decryption not built-in");
        var t,
            n = encryption.cipher.createDecipher("AES-CBC", encryption.util.createBuffer(this._encryptionKey)),
            i = 0,
            o = e.data.byteLength;
        for (
            t = this._encryptionIv ? this._encryptionIv : this._encryptionIvForSegment(e),
            this._logger.log("Using IV ->"),
            n.start({iv: encryption.util.createBuffer(t)}),
            n.update(encryption.util.createBuffer(e.data)),
            n.finish(),
            e.data = new Uint8Array(o);
            o > i;
            i++
        )
            e.data[i] = n.output.getByte();
        this._removeEncryptionPaddingBytes(e)
    },
    self.prototype.isAES128Encrypted = function () {
        return "AES-128" === this._encryptionMethod
    },
    self.prototype.getEncryptionKeyUri = function () {
        return this._encryptionKeyUri
    },
    self.prototype.getEncryptionIv = function () {
        return this._encryptionIv
    },
    self.prototype.getEncryptionKey = function () {
        return this._encryptionKey
    },
    self.prototype.getSegmentIndexForTime = function (t) {
        var i, seg;
        if (t > this._duration || 0 > t || !this._segments || 0 === this._segments.length)
            return -1;
        for (
            i = Math.floor(this._segments.length * (t / this._duration)),
            seg = this._segments[i]; !(seg.startPosition <= t && seg.startPosition + seg.duration > t);
        )
            seg.startPosition + seg.duration >= t ? i-- : i++,
            seg = this._segments[i];
        return i
    },
    self.prototype.getSegmentForTime = function (t) {
        var i = this.getSegmentIndexForTime(t);
        return i >= 0 ? this._segments[i] : null
    },
    self.prototype._createSegmentURL = function (e) {
        return "http://" === e.substr(0, 7) ||
            "https://" === e.substr(0, 8) || "/" === e.substr(0, 1) ?
            e : this._baseURI + e
    },
    self.prototype.loadSegment = function (e) {
        var xhr = new XMLHttpRequest,
            seg = this._segments[e],
            uri = seg.uri;
        seg.status !== Statuses.REQUESTED && seg.status !== Statuses.COMPLETE && (
            xhr.open("GET", uri, true),
            xhr.responseType = "arraybuffer",
            xhr.onload = _.bind(function (o) {
                return 200 !== xhr.status ? (
                    this.trigger(self.Events.SEGMENT_FAILED, Errors.MSE_HLS_SEGMENT_NOT_FOUND),
                    void(seg.status = Statuses.FAILED)
                ) : (
                    this._logger.log("Download of segment " + e + " complete"),
                    seg.data = new Uint8Array(xhr.response),
                    seg.downloadTime = Date.now() - seg.downloadStartTime,
                    seg.status = Statuses.COMPLETE,
                    void this.trigger(self.Events.SEGMENT_LOADED, seg)
                )
            }, this),
            xhr.onerror = _.bind(function (e) {
                seg.status = Statuses.FAILED,
                this.trigger(self.Events.SEGMENT_FAILED, Errors.MSE_HLS_SEGMENT_NOT_FOUND)
            }, this),
            this._logger.log("Downloading segment " + e + " from " + uri),
            seg.downloadStartTime = Date.now(),
            seg.status = Statuses.REQUESTED,
            xhr.send()
        )
    },
    self.prototype.getSegment = function (e) {
        return this._segments && this._segments[e] ? this._segments[e] : null
    },
    self.prototype.getDuration = function () {
        return this._duration ? this._duration : 0
    },
    self.prototype.getNumSegments = function () {
        return this._segments.length}
    return self;
});
