'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaultConfig = {
    host: '',
    port: 8888,
    protocol: 'http'
};

var ecc = require('eosjs-ecc');
var signHash = ecc.signHash,
    verifyHash = ecc.verifyHash;

var AbiCache = require('./abi-cache');
var AssetCache = require('./asset-cache');

/**
 * APICaller for everiToken
*/

var APICaller = function () {
    /**
     * Creates a new APICaller.
     * @param {*} config 
     */
    function APICaller(config) {
        _classCallCheck(this, APICaller);

        this.config = defaultConfig;
        this.config = Object.assign(this.config, config);

        if (!this.config.signProvider) {
            this.config.signProvider = defaultSignProvider(this, this.config);
        }

        /*const Network = 
          const network = Network(Object.assign({}, {
            apiLog: consoleObjCallbackLog(this.config.verbose)},
            config: this.config
          ));*/

        this.config.assetCache = AssetCache(null);
        this.config.abiCache = AbiCache(null, this.config);

        var buffer = new Buffer(32).fill(0, 0, 32);
        this.config.signProvider({ sign: signHash, buf: buffer, transaction: {} });
    }

    /**
     * Call everiToken APIs directly, not suggested to use by user
     * @param {*} request 
     */


    _createClass(APICaller, [{
        key: 'callAPI',
        value: function callAPI(request) {
            var url, res;
            return regeneratorRuntime.async(function callAPI$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            url = this.config.protocol + "://" + this.config.host + ":" + this.config.port + request.url;
                            _context.next = 3;
                            return regeneratorRuntime.awrap(fetch(url, {
                                method: request.method,
                                body: JSON.stringify(request.body || "") || undefined,
                                headers: new Headers({
                                    'Content-Type': 'application/json'
                                })
                            }));

                        case 3:
                            res = _context.sent;
                            _context.next = 6;
                            return regeneratorRuntime.awrap(res.json());

                        case 6:
                            return _context.abrupt('return', _context.sent);

                        case 7:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, null, this);
        }
    }, {
        key: 'chainGetInfo',
        value: function chainGetInfo() {
            return this.callAPI({
                url: "/v1/chain/get_info",
                method: "GET"
            });
        }
    }, {
        key: 'chainAbiJsonToBin',
        value: function chainAbiJsonToBin(abi) {
            return this.callAPI({
                url: "/v1/chain/abi_json_to_bin",
                method: "POST",
                body: abi
            });
        }
    }, {
        key: 'signTransaction',
        value: function signTransaction(buf, transaction) {
            return this.config.signProvider({ signHash: signHash, buf: buf, transaction: transaction });
        }
    }, {
        key: 'getDigestToSign',
        value: function getDigestToSign(transaction) {
            return this.callAPI({
                url: "/v1/chain/trx_json_to_digest",
                method: "POST",
                body: transaction
            });
        }
    }, {
        key: 'chainPushTransaction',
        value: function chainPushTransaction(tr) {
            return this.callAPI({
                url: "/v1/chain/push_transaction",
                method: "POST",
                body: tr
            });
        }
    }, {
        key: 'chainGetRequiredKeys',
        value: function chainGetRequiredKeys(tr) {
            return this.callAPI({
                url: "/v1/chain/get_required_keys",
                method: "POST",
                body: tr
            });
        }
    }]);

    return APICaller;
}();

/**
  The default sign provider is designed to interact with the available public
  keys (maybe just one), the transaction, and the blockchain to figure out
  the minimum set of signing keys.

  If only one key is available, the blockchain API calls are skipped and that
  key is used to sign the transaction.
*/


var defaultSignProvider = function defaultSignProvider(apiCaller, config) {
    return function _callee(_ref) {
        var sign = _ref.sign,
            buf = _ref.buf,
            transaction = _ref.transaction;

        var keyProvider, keys, pvt, ret, keyMap, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, key, isPrivate, isPublic, pubkeys, pvts, missingKeys, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, requiredKey, wif, sigs, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, _pvt;

        return regeneratorRuntime.async(function _callee$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        keyProvider = config.keyProvider;

                        if (keyProvider) {
                            _context2.next = 3;
                            break;
                        }

                        throw new TypeError('This transaction requires a config.keyProvider for signing');

                    case 3:
                        keys = keyProvider;

                        if (typeof keyProvider === 'function') {
                            keys = keyProvider({ transaction: transaction });
                        }

                        // keyProvider may return keys or Promise<keys>
                        _context2.next = 7;
                        return regeneratorRuntime.awrap(Promise.resolve(keys));

                    case 7:
                        keys = _context2.sent;


                        if (!Array.isArray(keys)) {
                            keys = [keys];
                        }

                        keys = keys.map(function (key) {
                            try {
                                // normalize format (WIF => PVT_K1_base58privateKey)
                                return { private: ecc.PrivateKey(key).toString() };
                            } catch (e) {
                                // normalize format (EOSKey => PUB_K1_base58publicKey)
                                return { public: ecc.PublicKey(key).toString() };
                            }
                            assert(false, 'expecting public or private keys from keyProvider');
                        });

                        if (keys.length) {
                            _context2.next = 12;
                            break;
                        }

                        throw new Error('missing key, check your keyProvider');

                    case 12:
                        if (!(keys.length === 1 && keys[0].private)) {
                            _context2.next = 18;
                            break;
                        }

                        pvt = keys[0].private;
                        ret = signHash(buf, pvt);


                        console.log("sign result:" + ret);

                        console.log("verify: ===============================" + verifyHash(ret, buf, ecc.privateToPublic(pvt)));
                        return _context2.abrupt('return', ret);

                    case 18:
                        keyMap = new Map();

                        // keys are either public or private keys

                        _iteratorNormalCompletion = true;
                        _didIteratorError = false;
                        _iteratorError = undefined;
                        _context2.prev = 22;
                        for (_iterator = keys[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                            key = _step.value;
                            isPrivate = key.private != null;
                            isPublic = key.public != null;


                            if (isPrivate) {
                                keyMap.set(ecc.privateToPublic(key.private), key.private);
                            } else {
                                keyMap.set(key.public, null);
                            }
                        }

                        _context2.next = 30;
                        break;

                    case 26:
                        _context2.prev = 26;
                        _context2.t0 = _context2['catch'](22);
                        _didIteratorError = true;
                        _iteratorError = _context2.t0;

                    case 30:
                        _context2.prev = 30;
                        _context2.prev = 31;

                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }

                    case 33:
                        _context2.prev = 33;

                        if (!_didIteratorError) {
                            _context2.next = 36;
                            break;
                        }

                        throw _iteratorError;

                    case 36:
                        return _context2.finish(33);

                    case 37:
                        return _context2.finish(30);

                    case 38:
                        pubkeys = Array.from(keyMap.keys());

                        // TODO: add multiple signature support

                        /*return eos.getRequiredKeys(transaction, pubkeys).then(({ required_keys }) => {
                            if (!required_keys.length) {
                                throw new Error('missing required keys for ' + JSON.stringify(transaction))
                            }*/

                        pvts = [], missingKeys = [];


                        required_keys = pubkeys[0]; // assume that we need only the first key, will be changed in the future TODO

                        _iteratorNormalCompletion2 = true;
                        _didIteratorError2 = false;
                        _iteratorError2 = undefined;
                        _context2.prev = 44;
                        for (_iterator2 = required_keys[Symbol.iterator](); !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                            requiredKey = _step2.value;

                            // normalize (EOSKey.. => PUB_K1_Key..)
                            requiredKey = ecc.PublicKey(requiredKey).toString();

                            wif = keyMap.get(requiredKey);

                            if (wif) {
                                pvts.push(wif);
                            } else {
                                missingKeys.push(requiredKey);
                            }
                        }

                        _context2.next = 52;
                        break;

                    case 48:
                        _context2.prev = 48;
                        _context2.t1 = _context2['catch'](44);
                        _didIteratorError2 = true;
                        _iteratorError2 = _context2.t1;

                    case 52:
                        _context2.prev = 52;
                        _context2.prev = 53;

                        if (!_iteratorNormalCompletion2 && _iterator2.return) {
                            _iterator2.return();
                        }

                    case 55:
                        _context2.prev = 55;

                        if (!_didIteratorError2) {
                            _context2.next = 58;
                            break;
                        }

                        throw _iteratorError2;

                    case 58:
                        return _context2.finish(55);

                    case 59:
                        return _context2.finish(52);

                    case 60:
                        if (missingKeys.length !== 0) {
                            assert(typeof keyProvider === 'function', 'keyProvider function is needed for private key lookup');

                            // const pubkeys = missingKeys.map(key => ecc.PublicKey(key).toStringLegacy())
                            keyProvider({ pubkeys: missingKeys }).forEach(function (pvt) {
                                pvts.push(pvt);
                            });
                        }

                        sigs = [];
                        _iteratorNormalCompletion3 = true;
                        _didIteratorError3 = false;
                        _iteratorError3 = undefined;
                        _context2.prev = 65;

                        for (_iterator3 = pvts[Symbol.iterator](); !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                            _pvt = _step3.value;

                            sigs.push(signHash(buf, _pvt));
                        }

                        _context2.next = 73;
                        break;

                    case 69:
                        _context2.prev = 69;
                        _context2.t2 = _context2['catch'](65);
                        _didIteratorError3 = true;
                        _iteratorError3 = _context2.t2;

                    case 73:
                        _context2.prev = 73;
                        _context2.prev = 74;

                        if (!_iteratorNormalCompletion3 && _iterator3.return) {
                            _iterator3.return();
                        }

                    case 76:
                        _context2.prev = 76;

                        if (!_didIteratorError3) {
                            _context2.next = 79;
                            break;
                        }

                        throw _iteratorError3;

                    case 79:
                        return _context2.finish(76);

                    case 80:
                        return _context2.finish(73);

                    case 81:
                        return _context2.abrupt('return', sigs);

                    case 82:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, null, this, [[22, 26, 30, 38], [31,, 33, 37], [44, 48, 52, 60], [53,, 55, 59], [65, 69, 73, 81], [74,, 76, 80]]);
    };
};

module.exports = { APICaller: APICaller };