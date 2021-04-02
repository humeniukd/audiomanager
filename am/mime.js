/* 51:61 */
define([], function(){
    return {
        AAC: "audio/aac",
        M3U8: "application/x-mpegURL",
        MP4: "audio/mp4",
        MPEG: "audio/mpeg",
        OGG: "audio/ogg",
        WAV: "audio/wav",
        WEBM: "audio/webm",
        getTypeByExtension: function (ext) {
            var types = {
                mp1: this.MPEG,
                mp2: this.MPEG,
                mp3: this.MPEG,
                mpeg: this.MPEG,
                mpg: this.MPEG,
                aac: this.AAC,
                mp4: this.MP4,
                ogg: this.OGG,
                oga: this.OGG,
                opus: this.OGG,
                webm: this.WEBM,
                wav: this.WAV,
                m3u8: this.M3U8
            };
            return types[ext] || null
        }
    }
});