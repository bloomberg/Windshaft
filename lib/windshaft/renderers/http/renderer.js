var request = require('request');
var Timer = require('../../stats/timer');

function Renderer(urlTemplate, subdomains, options) {
    this.urlTemplate = urlTemplate;
    this.subdomains = subdomains;

    this.requestOptions = {
        timeout: options.timeout || 2000,
        proxy: options.proxy
    };

    this.tms = options.tms || false;
}

module.exports = Renderer;


function requestImage(requestOpts, callback) {
    var timer = new Timer();
    timer.start('render');
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    request(requestOpts, function(err, response, buffer) {
        timer.end('render');
        if (err || response.statusCode !== 200) {
            var errorMessage = 'Unable to fetch http tile: ' + requestOpts.url;
            if (response && response.statusCode) {
                errorMessage += ' [' + response.statusCode + ']';
            }
            var httpError = new Error(errorMessage);
            if (err && err.code) {
                httpError.code = err.code;
            }
            return callback(httpError);
        }
        return callback(null, buffer, response.headers, timer.getTimes());
    });
}

module.exports.requestImage = requestImage;


Renderer.prototype.getTile = function(z, x, y, callback) {
    var adjustedY = (this.tms) ? ((1 << z) - y - 1) : y;

    var tileUrl = template(this.urlTemplate, {
        z: z,
        x: x,
        y: adjustedY,
        s: subdomain(x, adjustedY, this.subdomains)
    });

    var requestOpts = {
        url: tileUrl,
        encoding: null,
        followRedirect: true,
        timeout: this.requestOptions.timeout
    };

    if (this.requestOptions.proxy) {
        requestOpts.proxy = this.requestOptions.proxy;
    }

    return requestImage(requestOpts, callback);
};

Renderer.prototype.getMetadata = function(callback) {
    return callback(null, {});
};

// Following functionality has been extracted directly from Leaflet library
// License: https://github.com/Leaflet/Leaflet/blob/v0.7.3/LICENSE

// https://github.com/Leaflet/Leaflet/blob/v0.7.3/src/core/Util.js#L107-L117
var templateRe = /\{ *([\w_]+) *\}/g;

// super-simple templating facility, used for TileLayer URLs
function template(str, data) {
    return str.replace(templateRe, function (str, key) {
        var value = data[key];

        if (value === undefined) {
            throw new Error('No value provided for variable ' + str);

        } else if (typeof value === 'function') {
            value = value(data);
        }
        return value;
    });
}


// https://github.com/Leaflet/Leaflet/blob/v0.7.3/src/layer/tile/TileLayer.js#L495-L498
function subdomain(x, y, subdomains) {
    var index = Math.abs(x + y) % subdomains.length;
    return subdomains[index];
}
