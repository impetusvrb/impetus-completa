var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all3) => {
  for (var name in all3)
    __defProp(target, name, { get: all3[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../ExecutivePortal.module.css
var require_ExecutivePortal = __commonJS({
  "../ExecutivePortal.module.css"(exports2, module2) {
    module2.exports = new Proxy({}, { get: (_, k) => String(k) });
  }
});

// cockpit-stub:executive-cockpit-page-stub
var require_executive_cockpit_page_stub = __commonJS({
  "cockpit-stub:executive-cockpit-page-stub"(exports2, module2) {
    var React9 = require("react");
    function ExecutiveCockpitPage2() {
      return React9.createElement("div", { "data-testid": "executive-cockpit-page-stub" }, "Cockpit");
    }
    module2.exports = { default: ExecutiveCockpitPage2, ExecutiveCockpitPage: ExecutiveCockpitPage2 };
  }
});

// ../../decision-visualization/styles/DecisionVisualization.module.css
var require_DecisionVisualization = __commonJS({
  "../../decision-visualization/styles/DecisionVisualization.module.css"(exports2, module2) {
    module2.exports = new Proxy({}, { get: (_, k) => String(k) });
  }
});

// ../../../../../node_modules/axios/lib/helpers/bind.js
function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}
var init_bind = __esm({
  "../../../../../node_modules/axios/lib/helpers/bind.js"() {
    "use strict";
  }
});

// ../../../../../node_modules/axios/lib/utils.js
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}
function getGlobal() {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof self !== "undefined") return self;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  return {};
}
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  if (obj === null || typeof obj === "undefined") {
    return;
  }
  let i;
  let l;
  if (typeof obj !== "object") {
    obj = [obj];
  }
  if (isArray(obj)) {
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    if (isBuffer(obj)) {
      return;
    }
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;
    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
function findKey(obj, key) {
  if (isBuffer(obj)) {
    return null;
  }
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}
function merge() {
  const { caseless, skipUndefined } = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return;
    }
    const targetKey = caseless && findKey(result, key) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
      result[targetKey] = merge(result[targetKey], val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else if (!skipUndefined || !isUndefined(val)) {
      result[targetKey] = val;
    }
  };
  for (let i = 0, l = arguments.length; i < l; i++) {
    arguments[i] && forEach(arguments[i], assignValue);
  }
  return result;
}
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
}
var toString, getPrototypeOf, iterator, toStringTag, kindOf, kindOfTest, typeOfTest, isArray, isUndefined, isArrayBuffer, isString, isFunction, isNumber, isObject, isBoolean, isPlainObject, isEmptyObject, isDate, isFile, isReactNativeBlob, isReactNative, isBlob, isFileList, isStream, G, FormDataCtor, isFormData, isURLSearchParams, isReadableStream, isRequest, isResponse, isHeaders, trim, _global, isContextDefined, extend, stripBOM, inherits, toFlatObject, endsWith, toArray, isTypedArray, forEachEntry, matchAll, isHTMLForm, toCamelCase, hasOwnProperty, isRegExp, reduceDescriptors, freezeMethods, toObjectSet, noop, toFiniteNumber, toJSONObject, isAsyncFn, isThenable, _setImmediate, asap, isIterable, utils_default;
var init_utils = __esm({
  "../../../../../node_modules/axios/lib/utils.js"() {
    "use strict";
    init_bind();
    ({ toString } = Object.prototype);
    ({ getPrototypeOf } = Object);
    ({ iterator, toStringTag } = Symbol);
    kindOf = /* @__PURE__ */ ((cache) => (thing) => {
      const str = toString.call(thing);
      return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
    })(/* @__PURE__ */ Object.create(null));
    kindOfTest = (type) => {
      type = type.toLowerCase();
      return (thing) => kindOf(thing) === type;
    };
    typeOfTest = (type) => (thing) => typeof thing === type;
    ({ isArray } = Array);
    isUndefined = typeOfTest("undefined");
    isArrayBuffer = kindOfTest("ArrayBuffer");
    isString = typeOfTest("string");
    isFunction = typeOfTest("function");
    isNumber = typeOfTest("number");
    isObject = (thing) => thing !== null && typeof thing === "object";
    isBoolean = (thing) => thing === true || thing === false;
    isPlainObject = (val) => {
      if (kindOf(val) !== "object") {
        return false;
      }
      const prototype2 = getPrototypeOf(val);
      return (prototype2 === null || prototype2 === Object.prototype || Object.getPrototypeOf(prototype2) === null) && !(toStringTag in val) && !(iterator in val);
    };
    isEmptyObject = (val) => {
      if (!isObject(val) || isBuffer(val)) {
        return false;
      }
      try {
        return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
      } catch (e) {
        return false;
      }
    };
    isDate = kindOfTest("Date");
    isFile = kindOfTest("File");
    isReactNativeBlob = (value) => {
      return !!(value && typeof value.uri !== "undefined");
    };
    isReactNative = (formData) => formData && typeof formData.getParts !== "undefined";
    isBlob = kindOfTest("Blob");
    isFileList = kindOfTest("FileList");
    isStream = (val) => isObject(val) && isFunction(val.pipe);
    G = getGlobal();
    FormDataCtor = typeof G.FormData !== "undefined" ? G.FormData : void 0;
    isFormData = (thing) => {
      if (!thing) return false;
      if (FormDataCtor && thing instanceof FormDataCtor) return true;
      const proto = getPrototypeOf(thing);
      if (!proto || proto === Object.prototype) return false;
      if (!isFunction(thing.append)) return false;
      const kind = kindOf(thing);
      return kind === "formdata" || // detect form-data instance
      kind === "object" && isFunction(thing.toString) && thing.toString() === "[object FormData]";
    };
    isURLSearchParams = kindOfTest("URLSearchParams");
    [isReadableStream, isRequest, isResponse, isHeaders] = [
      "ReadableStream",
      "Request",
      "Response",
      "Headers"
    ].map(kindOfTest);
    trim = (str) => {
      return str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
    };
    _global = (() => {
      if (typeof globalThis !== "undefined") return globalThis;
      return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
    })();
    isContextDefined = (context) => !isUndefined(context) && context !== _global;
    extend = (a, b, thisArg, { allOwnKeys } = {}) => {
      forEach(
        b,
        (val, key) => {
          if (thisArg && isFunction(val)) {
            Object.defineProperty(a, key, {
              value: bind(val, thisArg),
              writable: true,
              enumerable: true,
              configurable: true
            });
          } else {
            Object.defineProperty(a, key, {
              value: val,
              writable: true,
              enumerable: true,
              configurable: true
            });
          }
        },
        { allOwnKeys }
      );
      return a;
    };
    stripBOM = (content) => {
      if (content.charCodeAt(0) === 65279) {
        content = content.slice(1);
      }
      return content;
    };
    inherits = (constructor, superConstructor, props, descriptors) => {
      constructor.prototype = Object.create(superConstructor.prototype, descriptors);
      Object.defineProperty(constructor.prototype, "constructor", {
        value: constructor,
        writable: true,
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(constructor, "super", {
        value: superConstructor.prototype
      });
      props && Object.assign(constructor.prototype, props);
    };
    toFlatObject = (sourceObj, destObj, filter2, propFilter) => {
      let props;
      let i;
      let prop;
      const merged = {};
      destObj = destObj || {};
      if (sourceObj == null) return destObj;
      do {
        props = Object.getOwnPropertyNames(sourceObj);
        i = props.length;
        while (i-- > 0) {
          prop = props[i];
          if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
            destObj[prop] = sourceObj[prop];
            merged[prop] = true;
          }
        }
        sourceObj = filter2 !== false && getPrototypeOf(sourceObj);
      } while (sourceObj && (!filter2 || filter2(sourceObj, destObj)) && sourceObj !== Object.prototype);
      return destObj;
    };
    endsWith = (str, searchString, position) => {
      str = String(str);
      if (position === void 0 || position > str.length) {
        position = str.length;
      }
      position -= searchString.length;
      const lastIndex = str.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
    };
    toArray = (thing) => {
      if (!thing) return null;
      if (isArray(thing)) return thing;
      let i = thing.length;
      if (!isNumber(i)) return null;
      const arr = new Array(i);
      while (i-- > 0) {
        arr[i] = thing[i];
      }
      return arr;
    };
    isTypedArray = /* @__PURE__ */ ((TypedArray) => {
      return (thing) => {
        return TypedArray && thing instanceof TypedArray;
      };
    })(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
    forEachEntry = (obj, fn) => {
      const generator = obj && obj[iterator];
      const _iterator = generator.call(obj);
      let result;
      while ((result = _iterator.next()) && !result.done) {
        const pair = result.value;
        fn.call(obj, pair[0], pair[1]);
      }
    };
    matchAll = (regExp, str) => {
      let matches;
      const arr = [];
      while ((matches = regExp.exec(str)) !== null) {
        arr.push(matches);
      }
      return arr;
    };
    isHTMLForm = kindOfTest("HTMLFormElement");
    toCamelCase = (str) => {
      return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
        return p1.toUpperCase() + p2;
      });
    };
    hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
    isRegExp = kindOfTest("RegExp");
    reduceDescriptors = (obj, reducer) => {
      const descriptors = Object.getOwnPropertyDescriptors(obj);
      const reducedDescriptors = {};
      forEach(descriptors, (descriptor, name) => {
        let ret;
        if ((ret = reducer(descriptor, name, obj)) !== false) {
          reducedDescriptors[name] = ret || descriptor;
        }
      });
      Object.defineProperties(obj, reducedDescriptors);
    };
    freezeMethods = (obj) => {
      reduceDescriptors(obj, (descriptor, name) => {
        if (isFunction(obj) && ["arguments", "caller", "callee"].indexOf(name) !== -1) {
          return false;
        }
        const value = obj[name];
        if (!isFunction(value)) return;
        descriptor.enumerable = false;
        if ("writable" in descriptor) {
          descriptor.writable = false;
          return;
        }
        if (!descriptor.set) {
          descriptor.set = () => {
            throw Error("Can not rewrite read-only method '" + name + "'");
          };
        }
      });
    };
    toObjectSet = (arrayOrString, delimiter) => {
      const obj = {};
      const define = (arr) => {
        arr.forEach((value) => {
          obj[value] = true;
        });
      };
      isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
      return obj;
    };
    noop = () => {
    };
    toFiniteNumber = (value, defaultValue) => {
      return value != null && Number.isFinite(value = +value) ? value : defaultValue;
    };
    toJSONObject = (obj) => {
      const stack = new Array(10);
      const visit = (source, i) => {
        if (isObject(source)) {
          if (stack.indexOf(source) >= 0) {
            return;
          }
          if (isBuffer(source)) {
            return source;
          }
          if (!("toJSON" in source)) {
            stack[i] = source;
            const target = isArray(source) ? [] : {};
            forEach(source, (value, key) => {
              const reducedValue = visit(value, i + 1);
              !isUndefined(reducedValue) && (target[key] = reducedValue);
            });
            stack[i] = void 0;
            return target;
          }
        }
        return source;
      };
      return visit(obj, 0);
    };
    isAsyncFn = kindOfTest("AsyncFunction");
    isThenable = (thing) => thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);
    _setImmediate = ((setImmediateSupported, postMessageSupported) => {
      if (setImmediateSupported) {
        return setImmediate;
      }
      return postMessageSupported ? ((token, callbacks) => {
        _global.addEventListener(
          "message",
          ({ source, data }) => {
            if (source === _global && data === token) {
              callbacks.length && callbacks.shift()();
            }
          },
          false
        );
        return (cb) => {
          callbacks.push(cb);
          _global.postMessage(token, "*");
        };
      })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
    })(typeof setImmediate === "function", isFunction(_global.postMessage));
    asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
    isIterable = (thing) => thing != null && isFunction(thing[iterator]);
    utils_default = {
      isArray,
      isArrayBuffer,
      isBuffer,
      isFormData,
      isArrayBufferView,
      isString,
      isNumber,
      isBoolean,
      isObject,
      isPlainObject,
      isEmptyObject,
      isReadableStream,
      isRequest,
      isResponse,
      isHeaders,
      isUndefined,
      isDate,
      isFile,
      isReactNativeBlob,
      isReactNative,
      isBlob,
      isRegExp,
      isFunction,
      isStream,
      isURLSearchParams,
      isTypedArray,
      isFileList,
      forEach,
      merge,
      extend,
      trim,
      stripBOM,
      inherits,
      toFlatObject,
      kindOf,
      kindOfTest,
      endsWith,
      toArray,
      forEachEntry,
      matchAll,
      isHTMLForm,
      hasOwnProperty,
      hasOwnProp: hasOwnProperty,
      // an alias to avoid ESLint no-prototype-builtins detection
      reduceDescriptors,
      freezeMethods,
      toObjectSet,
      toCamelCase,
      noop,
      toFiniteNumber,
      findKey,
      global: _global,
      isContextDefined,
      isSpecCompliantForm,
      toJSONObject,
      isAsyncFn,
      isThenable,
      setImmediate: _setImmediate,
      asap,
      isIterable
    };
  }
});

// ../../../../../node_modules/axios/lib/core/AxiosError.js
var AxiosError, AxiosError_default;
var init_AxiosError = __esm({
  "../../../../../node_modules/axios/lib/core/AxiosError.js"() {
    "use strict";
    init_utils();
    AxiosError = class _AxiosError extends Error {
      static from(error, code, config, request, response, customProps) {
        const axiosError = new _AxiosError(error.message, code || error.code, config, request, response);
        axiosError.cause = error;
        axiosError.name = error.name;
        if (error.status != null && axiosError.status == null) {
          axiosError.status = error.status;
        }
        customProps && Object.assign(axiosError, customProps);
        return axiosError;
      }
      /**
       * Create an Error with the specified message, config, error code, request and response.
       *
       * @param {string} message The error message.
       * @param {string} [code] The error code (for example, 'ECONNABORTED').
       * @param {Object} [config] The config.
       * @param {Object} [request] The request.
       * @param {Object} [response] The response.
       *
       * @returns {Error} The created error.
       */
      constructor(message, code, config, request, response) {
        super(message);
        Object.defineProperty(this, "message", {
          value: message,
          enumerable: true,
          writable: true,
          configurable: true
        });
        this.name = "AxiosError";
        this.isAxiosError = true;
        code && (this.code = code);
        config && (this.config = config);
        request && (this.request = request);
        if (response) {
          this.response = response;
          this.status = response.status;
        }
      }
      toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: utils_default.toJSONObject(this.config),
          code: this.code,
          status: this.status
        };
      }
    };
    AxiosError.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
    AxiosError.ERR_BAD_OPTION = "ERR_BAD_OPTION";
    AxiosError.ECONNABORTED = "ECONNABORTED";
    AxiosError.ETIMEDOUT = "ETIMEDOUT";
    AxiosError.ERR_NETWORK = "ERR_NETWORK";
    AxiosError.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
    AxiosError.ERR_DEPRECATED = "ERR_DEPRECATED";
    AxiosError.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
    AxiosError.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
    AxiosError.ERR_CANCELED = "ERR_CANCELED";
    AxiosError.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
    AxiosError.ERR_INVALID_URL = "ERR_INVALID_URL";
    AxiosError.ERR_FORM_DATA_DEPTH_EXCEEDED = "ERR_FORM_DATA_DEPTH_EXCEEDED";
    AxiosError_default = AxiosError;
  }
});

// ../../../../../node_modules/delayed-stream/lib/delayed_stream.js
var require_delayed_stream = __commonJS({
  "../../../../../node_modules/delayed-stream/lib/delayed_stream.js"(exports2, module2) {
    var Stream = require("stream").Stream;
    var util3 = require("util");
    module2.exports = DelayedStream;
    function DelayedStream() {
      this.source = null;
      this.dataSize = 0;
      this.maxDataSize = 1024 * 1024;
      this.pauseStream = true;
      this._maxDataSizeExceeded = false;
      this._released = false;
      this._bufferedEvents = [];
    }
    util3.inherits(DelayedStream, Stream);
    DelayedStream.create = function(source, options) {
      var delayedStream = new this();
      options = options || {};
      for (var option in options) {
        delayedStream[option] = options[option];
      }
      delayedStream.source = source;
      var realEmit = source.emit;
      source.emit = function() {
        delayedStream._handleEmit(arguments);
        return realEmit.apply(source, arguments);
      };
      source.on("error", function() {
      });
      if (delayedStream.pauseStream) {
        source.pause();
      }
      return delayedStream;
    };
    Object.defineProperty(DelayedStream.prototype, "readable", {
      configurable: true,
      enumerable: true,
      get: function() {
        return this.source.readable;
      }
    });
    DelayedStream.prototype.setEncoding = function() {
      return this.source.setEncoding.apply(this.source, arguments);
    };
    DelayedStream.prototype.resume = function() {
      if (!this._released) {
        this.release();
      }
      this.source.resume();
    };
    DelayedStream.prototype.pause = function() {
      this.source.pause();
    };
    DelayedStream.prototype.release = function() {
      this._released = true;
      this._bufferedEvents.forEach(function(args) {
        this.emit.apply(this, args);
      }.bind(this));
      this._bufferedEvents = [];
    };
    DelayedStream.prototype.pipe = function() {
      var r = Stream.prototype.pipe.apply(this, arguments);
      this.resume();
      return r;
    };
    DelayedStream.prototype._handleEmit = function(args) {
      if (this._released) {
        this.emit.apply(this, args);
        return;
      }
      if (args[0] === "data") {
        this.dataSize += args[1].length;
        this._checkIfMaxDataSizeExceeded();
      }
      this._bufferedEvents.push(args);
    };
    DelayedStream.prototype._checkIfMaxDataSizeExceeded = function() {
      if (this._maxDataSizeExceeded) {
        return;
      }
      if (this.dataSize <= this.maxDataSize) {
        return;
      }
      this._maxDataSizeExceeded = true;
      var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
      this.emit("error", new Error(message));
    };
  }
});

// ../../../../../node_modules/combined-stream/lib/combined_stream.js
var require_combined_stream = __commonJS({
  "../../../../../node_modules/combined-stream/lib/combined_stream.js"(exports2, module2) {
    var util3 = require("util");
    var Stream = require("stream").Stream;
    var DelayedStream = require_delayed_stream();
    module2.exports = CombinedStream;
    function CombinedStream() {
      this.writable = false;
      this.readable = true;
      this.dataSize = 0;
      this.maxDataSize = 2 * 1024 * 1024;
      this.pauseStreams = true;
      this._released = false;
      this._streams = [];
      this._currentStream = null;
      this._insideLoop = false;
      this._pendingNext = false;
    }
    util3.inherits(CombinedStream, Stream);
    CombinedStream.create = function(options) {
      var combinedStream = new this();
      options = options || {};
      for (var option in options) {
        combinedStream[option] = options[option];
      }
      return combinedStream;
    };
    CombinedStream.isStreamLike = function(stream4) {
      return typeof stream4 !== "function" && typeof stream4 !== "string" && typeof stream4 !== "boolean" && typeof stream4 !== "number" && !Buffer.isBuffer(stream4);
    };
    CombinedStream.prototype.append = function(stream4) {
      var isStreamLike = CombinedStream.isStreamLike(stream4);
      if (isStreamLike) {
        if (!(stream4 instanceof DelayedStream)) {
          var newStream = DelayedStream.create(stream4, {
            maxDataSize: Infinity,
            pauseStream: this.pauseStreams
          });
          stream4.on("data", this._checkDataSize.bind(this));
          stream4 = newStream;
        }
        this._handleErrors(stream4);
        if (this.pauseStreams) {
          stream4.pause();
        }
      }
      this._streams.push(stream4);
      return this;
    };
    CombinedStream.prototype.pipe = function(dest, options) {
      Stream.prototype.pipe.call(this, dest, options);
      this.resume();
      return dest;
    };
    CombinedStream.prototype._getNext = function() {
      this._currentStream = null;
      if (this._insideLoop) {
        this._pendingNext = true;
        return;
      }
      this._insideLoop = true;
      try {
        do {
          this._pendingNext = false;
          this._realGetNext();
        } while (this._pendingNext);
      } finally {
        this._insideLoop = false;
      }
    };
    CombinedStream.prototype._realGetNext = function() {
      var stream4 = this._streams.shift();
      if (typeof stream4 == "undefined") {
        this.end();
        return;
      }
      if (typeof stream4 !== "function") {
        this._pipeNext(stream4);
        return;
      }
      var getStream = stream4;
      getStream(function(stream5) {
        var isStreamLike = CombinedStream.isStreamLike(stream5);
        if (isStreamLike) {
          stream5.on("data", this._checkDataSize.bind(this));
          this._handleErrors(stream5);
        }
        this._pipeNext(stream5);
      }.bind(this));
    };
    CombinedStream.prototype._pipeNext = function(stream4) {
      this._currentStream = stream4;
      var isStreamLike = CombinedStream.isStreamLike(stream4);
      if (isStreamLike) {
        stream4.on("end", this._getNext.bind(this));
        stream4.pipe(this, { end: false });
        return;
      }
      var value = stream4;
      this.write(value);
      this._getNext();
    };
    CombinedStream.prototype._handleErrors = function(stream4) {
      var self2 = this;
      stream4.on("error", function(err) {
        self2._emitError(err);
      });
    };
    CombinedStream.prototype.write = function(data) {
      this.emit("data", data);
    };
    CombinedStream.prototype.pause = function() {
      if (!this.pauseStreams) {
        return;
      }
      if (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function") this._currentStream.pause();
      this.emit("pause");
    };
    CombinedStream.prototype.resume = function() {
      if (!this._released) {
        this._released = true;
        this.writable = true;
        this._getNext();
      }
      if (this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function") this._currentStream.resume();
      this.emit("resume");
    };
    CombinedStream.prototype.end = function() {
      this._reset();
      this.emit("end");
    };
    CombinedStream.prototype.destroy = function() {
      this._reset();
      this.emit("close");
    };
    CombinedStream.prototype._reset = function() {
      this.writable = false;
      this._streams = [];
      this._currentStream = null;
    };
    CombinedStream.prototype._checkDataSize = function() {
      this._updateDataSize();
      if (this.dataSize <= this.maxDataSize) {
        return;
      }
      var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
      this._emitError(new Error(message));
    };
    CombinedStream.prototype._updateDataSize = function() {
      this.dataSize = 0;
      var self2 = this;
      this._streams.forEach(function(stream4) {
        if (!stream4.dataSize) {
          return;
        }
        self2.dataSize += stream4.dataSize;
      });
      if (this._currentStream && this._currentStream.dataSize) {
        this.dataSize += this._currentStream.dataSize;
      }
    };
    CombinedStream.prototype._emitError = function(err) {
      this._reset();
      this.emit("error", err);
    };
  }
});

// ../../../../../node_modules/mime-db/db.json
var require_db = __commonJS({
  "../../../../../node_modules/mime-db/db.json"(exports2, module2) {
    module2.exports = {
      "application/1d-interleaved-parityfec": {
        source: "iana"
      },
      "application/3gpdash-qoe-report+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/3gpp-ims+xml": {
        source: "iana",
        compressible: true
      },
      "application/3gpphal+json": {
        source: "iana",
        compressible: true
      },
      "application/3gpphalforms+json": {
        source: "iana",
        compressible: true
      },
      "application/a2l": {
        source: "iana"
      },
      "application/ace+cbor": {
        source: "iana"
      },
      "application/activemessage": {
        source: "iana"
      },
      "application/activity+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-costmap+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-costmapfilter+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-directory+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointcost+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointcostparams+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointprop+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointpropparams+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-error+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-networkmap+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-networkmapfilter+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-updatestreamcontrol+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-updatestreamparams+json": {
        source: "iana",
        compressible: true
      },
      "application/aml": {
        source: "iana"
      },
      "application/andrew-inset": {
        source: "iana",
        extensions: ["ez"]
      },
      "application/applefile": {
        source: "iana"
      },
      "application/applixware": {
        source: "apache",
        extensions: ["aw"]
      },
      "application/at+jwt": {
        source: "iana"
      },
      "application/atf": {
        source: "iana"
      },
      "application/atfx": {
        source: "iana"
      },
      "application/atom+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atom"]
      },
      "application/atomcat+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomcat"]
      },
      "application/atomdeleted+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomdeleted"]
      },
      "application/atomicmail": {
        source: "iana"
      },
      "application/atomsvc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomsvc"]
      },
      "application/atsc-dwd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dwd"]
      },
      "application/atsc-dynamic-event-message": {
        source: "iana"
      },
      "application/atsc-held+xml": {
        source: "iana",
        compressible: true,
        extensions: ["held"]
      },
      "application/atsc-rdt+json": {
        source: "iana",
        compressible: true
      },
      "application/atsc-rsat+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rsat"]
      },
      "application/atxml": {
        source: "iana"
      },
      "application/auth-policy+xml": {
        source: "iana",
        compressible: true
      },
      "application/bacnet-xdd+zip": {
        source: "iana",
        compressible: false
      },
      "application/batch-smtp": {
        source: "iana"
      },
      "application/bdoc": {
        compressible: false,
        extensions: ["bdoc"]
      },
      "application/beep+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/calendar+json": {
        source: "iana",
        compressible: true
      },
      "application/calendar+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xcs"]
      },
      "application/call-completion": {
        source: "iana"
      },
      "application/cals-1840": {
        source: "iana"
      },
      "application/captive+json": {
        source: "iana",
        compressible: true
      },
      "application/cbor": {
        source: "iana"
      },
      "application/cbor-seq": {
        source: "iana"
      },
      "application/cccex": {
        source: "iana"
      },
      "application/ccmp+xml": {
        source: "iana",
        compressible: true
      },
      "application/ccxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ccxml"]
      },
      "application/cdfx+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cdfx"]
      },
      "application/cdmi-capability": {
        source: "iana",
        extensions: ["cdmia"]
      },
      "application/cdmi-container": {
        source: "iana",
        extensions: ["cdmic"]
      },
      "application/cdmi-domain": {
        source: "iana",
        extensions: ["cdmid"]
      },
      "application/cdmi-object": {
        source: "iana",
        extensions: ["cdmio"]
      },
      "application/cdmi-queue": {
        source: "iana",
        extensions: ["cdmiq"]
      },
      "application/cdni": {
        source: "iana"
      },
      "application/cea": {
        source: "iana"
      },
      "application/cea-2018+xml": {
        source: "iana",
        compressible: true
      },
      "application/cellml+xml": {
        source: "iana",
        compressible: true
      },
      "application/cfw": {
        source: "iana"
      },
      "application/city+json": {
        source: "iana",
        compressible: true
      },
      "application/clr": {
        source: "iana"
      },
      "application/clue+xml": {
        source: "iana",
        compressible: true
      },
      "application/clue_info+xml": {
        source: "iana",
        compressible: true
      },
      "application/cms": {
        source: "iana"
      },
      "application/cnrp+xml": {
        source: "iana",
        compressible: true
      },
      "application/coap-group+json": {
        source: "iana",
        compressible: true
      },
      "application/coap-payload": {
        source: "iana"
      },
      "application/commonground": {
        source: "iana"
      },
      "application/conference-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/cose": {
        source: "iana"
      },
      "application/cose-key": {
        source: "iana"
      },
      "application/cose-key-set": {
        source: "iana"
      },
      "application/cpl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cpl"]
      },
      "application/csrattrs": {
        source: "iana"
      },
      "application/csta+xml": {
        source: "iana",
        compressible: true
      },
      "application/cstadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/csvm+json": {
        source: "iana",
        compressible: true
      },
      "application/cu-seeme": {
        source: "apache",
        extensions: ["cu"]
      },
      "application/cwt": {
        source: "iana"
      },
      "application/cybercash": {
        source: "iana"
      },
      "application/dart": {
        compressible: true
      },
      "application/dash+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpd"]
      },
      "application/dash-patch+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpp"]
      },
      "application/dashdelta": {
        source: "iana"
      },
      "application/davmount+xml": {
        source: "iana",
        compressible: true,
        extensions: ["davmount"]
      },
      "application/dca-rft": {
        source: "iana"
      },
      "application/dcd": {
        source: "iana"
      },
      "application/dec-dx": {
        source: "iana"
      },
      "application/dialog-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/dicom": {
        source: "iana"
      },
      "application/dicom+json": {
        source: "iana",
        compressible: true
      },
      "application/dicom+xml": {
        source: "iana",
        compressible: true
      },
      "application/dii": {
        source: "iana"
      },
      "application/dit": {
        source: "iana"
      },
      "application/dns": {
        source: "iana"
      },
      "application/dns+json": {
        source: "iana",
        compressible: true
      },
      "application/dns-message": {
        source: "iana"
      },
      "application/docbook+xml": {
        source: "apache",
        compressible: true,
        extensions: ["dbk"]
      },
      "application/dots+cbor": {
        source: "iana"
      },
      "application/dskpp+xml": {
        source: "iana",
        compressible: true
      },
      "application/dssc+der": {
        source: "iana",
        extensions: ["dssc"]
      },
      "application/dssc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdssc"]
      },
      "application/dvcs": {
        source: "iana"
      },
      "application/ecmascript": {
        source: "iana",
        compressible: true,
        extensions: ["es", "ecma"]
      },
      "application/edi-consent": {
        source: "iana"
      },
      "application/edi-x12": {
        source: "iana",
        compressible: false
      },
      "application/edifact": {
        source: "iana",
        compressible: false
      },
      "application/efi": {
        source: "iana"
      },
      "application/elm+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/elm+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.cap+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/emergencycalldata.comment+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.control+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.deviceinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.ecall.msd": {
        source: "iana"
      },
      "application/emergencycalldata.providerinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.serviceinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.subscriberinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.veds+xml": {
        source: "iana",
        compressible: true
      },
      "application/emma+xml": {
        source: "iana",
        compressible: true,
        extensions: ["emma"]
      },
      "application/emotionml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["emotionml"]
      },
      "application/encaprtp": {
        source: "iana"
      },
      "application/epp+xml": {
        source: "iana",
        compressible: true
      },
      "application/epub+zip": {
        source: "iana",
        compressible: false,
        extensions: ["epub"]
      },
      "application/eshop": {
        source: "iana"
      },
      "application/exi": {
        source: "iana",
        extensions: ["exi"]
      },
      "application/expect-ct-report+json": {
        source: "iana",
        compressible: true
      },
      "application/express": {
        source: "iana",
        extensions: ["exp"]
      },
      "application/fastinfoset": {
        source: "iana"
      },
      "application/fastsoap": {
        source: "iana"
      },
      "application/fdt+xml": {
        source: "iana",
        compressible: true,
        extensions: ["fdt"]
      },
      "application/fhir+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/fhir+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/fido.trusted-apps+json": {
        compressible: true
      },
      "application/fits": {
        source: "iana"
      },
      "application/flexfec": {
        source: "iana"
      },
      "application/font-sfnt": {
        source: "iana"
      },
      "application/font-tdpfr": {
        source: "iana",
        extensions: ["pfr"]
      },
      "application/font-woff": {
        source: "iana",
        compressible: false
      },
      "application/framework-attributes+xml": {
        source: "iana",
        compressible: true
      },
      "application/geo+json": {
        source: "iana",
        compressible: true,
        extensions: ["geojson"]
      },
      "application/geo+json-seq": {
        source: "iana"
      },
      "application/geopackage+sqlite3": {
        source: "iana"
      },
      "application/geoxacml+xml": {
        source: "iana",
        compressible: true
      },
      "application/gltf-buffer": {
        source: "iana"
      },
      "application/gml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["gml"]
      },
      "application/gpx+xml": {
        source: "apache",
        compressible: true,
        extensions: ["gpx"]
      },
      "application/gxf": {
        source: "apache",
        extensions: ["gxf"]
      },
      "application/gzip": {
        source: "iana",
        compressible: false,
        extensions: ["gz"]
      },
      "application/h224": {
        source: "iana"
      },
      "application/held+xml": {
        source: "iana",
        compressible: true
      },
      "application/hjson": {
        extensions: ["hjson"]
      },
      "application/http": {
        source: "iana"
      },
      "application/hyperstudio": {
        source: "iana",
        extensions: ["stk"]
      },
      "application/ibe-key-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/ibe-pkg-reply+xml": {
        source: "iana",
        compressible: true
      },
      "application/ibe-pp-data": {
        source: "iana"
      },
      "application/iges": {
        source: "iana"
      },
      "application/im-iscomposing+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/index": {
        source: "iana"
      },
      "application/index.cmd": {
        source: "iana"
      },
      "application/index.obj": {
        source: "iana"
      },
      "application/index.response": {
        source: "iana"
      },
      "application/index.vnd": {
        source: "iana"
      },
      "application/inkml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ink", "inkml"]
      },
      "application/iotp": {
        source: "iana"
      },
      "application/ipfix": {
        source: "iana",
        extensions: ["ipfix"]
      },
      "application/ipp": {
        source: "iana"
      },
      "application/isup": {
        source: "iana"
      },
      "application/its+xml": {
        source: "iana",
        compressible: true,
        extensions: ["its"]
      },
      "application/java-archive": {
        source: "apache",
        compressible: false,
        extensions: ["jar", "war", "ear"]
      },
      "application/java-serialized-object": {
        source: "apache",
        compressible: false,
        extensions: ["ser"]
      },
      "application/java-vm": {
        source: "apache",
        compressible: false,
        extensions: ["class"]
      },
      "application/javascript": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["js", "mjs"]
      },
      "application/jf2feed+json": {
        source: "iana",
        compressible: true
      },
      "application/jose": {
        source: "iana"
      },
      "application/jose+json": {
        source: "iana",
        compressible: true
      },
      "application/jrd+json": {
        source: "iana",
        compressible: true
      },
      "application/jscalendar+json": {
        source: "iana",
        compressible: true
      },
      "application/json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["json", "map"]
      },
      "application/json-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/json-seq": {
        source: "iana"
      },
      "application/json5": {
        extensions: ["json5"]
      },
      "application/jsonml+json": {
        source: "apache",
        compressible: true,
        extensions: ["jsonml"]
      },
      "application/jwk+json": {
        source: "iana",
        compressible: true
      },
      "application/jwk-set+json": {
        source: "iana",
        compressible: true
      },
      "application/jwt": {
        source: "iana"
      },
      "application/kpml-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/kpml-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/ld+json": {
        source: "iana",
        compressible: true,
        extensions: ["jsonld"]
      },
      "application/lgr+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lgr"]
      },
      "application/link-format": {
        source: "iana"
      },
      "application/load-control+xml": {
        source: "iana",
        compressible: true
      },
      "application/lost+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lostxml"]
      },
      "application/lostsync+xml": {
        source: "iana",
        compressible: true
      },
      "application/lpf+zip": {
        source: "iana",
        compressible: false
      },
      "application/lxf": {
        source: "iana"
      },
      "application/mac-binhex40": {
        source: "iana",
        extensions: ["hqx"]
      },
      "application/mac-compactpro": {
        source: "apache",
        extensions: ["cpt"]
      },
      "application/macwriteii": {
        source: "iana"
      },
      "application/mads+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mads"]
      },
      "application/manifest+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["webmanifest"]
      },
      "application/marc": {
        source: "iana",
        extensions: ["mrc"]
      },
      "application/marcxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mrcx"]
      },
      "application/mathematica": {
        source: "iana",
        extensions: ["ma", "nb", "mb"]
      },
      "application/mathml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mathml"]
      },
      "application/mathml-content+xml": {
        source: "iana",
        compressible: true
      },
      "application/mathml-presentation+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-associated-procedure-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-deregister+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-envelope+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-msk+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-msk-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-protection-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-reception-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-register+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-register-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-schedule+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-user-service-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbox": {
        source: "iana",
        extensions: ["mbox"]
      },
      "application/media-policy-dataset+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpf"]
      },
      "application/media_control+xml": {
        source: "iana",
        compressible: true
      },
      "application/mediaservercontrol+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mscml"]
      },
      "application/merge-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/metalink+xml": {
        source: "apache",
        compressible: true,
        extensions: ["metalink"]
      },
      "application/metalink4+xml": {
        source: "iana",
        compressible: true,
        extensions: ["meta4"]
      },
      "application/mets+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mets"]
      },
      "application/mf4": {
        source: "iana"
      },
      "application/mikey": {
        source: "iana"
      },
      "application/mipc": {
        source: "iana"
      },
      "application/missing-blocks+cbor-seq": {
        source: "iana"
      },
      "application/mmt-aei+xml": {
        source: "iana",
        compressible: true,
        extensions: ["maei"]
      },
      "application/mmt-usd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["musd"]
      },
      "application/mods+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mods"]
      },
      "application/moss-keys": {
        source: "iana"
      },
      "application/moss-signature": {
        source: "iana"
      },
      "application/mosskey-data": {
        source: "iana"
      },
      "application/mosskey-request": {
        source: "iana"
      },
      "application/mp21": {
        source: "iana",
        extensions: ["m21", "mp21"]
      },
      "application/mp4": {
        source: "iana",
        extensions: ["mp4s", "m4p"]
      },
      "application/mpeg4-generic": {
        source: "iana"
      },
      "application/mpeg4-iod": {
        source: "iana"
      },
      "application/mpeg4-iod-xmt": {
        source: "iana"
      },
      "application/mrb-consumer+xml": {
        source: "iana",
        compressible: true
      },
      "application/mrb-publish+xml": {
        source: "iana",
        compressible: true
      },
      "application/msc-ivr+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/msc-mixer+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/msword": {
        source: "iana",
        compressible: false,
        extensions: ["doc", "dot"]
      },
      "application/mud+json": {
        source: "iana",
        compressible: true
      },
      "application/multipart-core": {
        source: "iana"
      },
      "application/mxf": {
        source: "iana",
        extensions: ["mxf"]
      },
      "application/n-quads": {
        source: "iana",
        extensions: ["nq"]
      },
      "application/n-triples": {
        source: "iana",
        extensions: ["nt"]
      },
      "application/nasdata": {
        source: "iana"
      },
      "application/news-checkgroups": {
        source: "iana",
        charset: "US-ASCII"
      },
      "application/news-groupinfo": {
        source: "iana",
        charset: "US-ASCII"
      },
      "application/news-transmission": {
        source: "iana"
      },
      "application/nlsml+xml": {
        source: "iana",
        compressible: true
      },
      "application/node": {
        source: "iana",
        extensions: ["cjs"]
      },
      "application/nss": {
        source: "iana"
      },
      "application/oauth-authz-req+jwt": {
        source: "iana"
      },
      "application/oblivious-dns-message": {
        source: "iana"
      },
      "application/ocsp-request": {
        source: "iana"
      },
      "application/ocsp-response": {
        source: "iana"
      },
      "application/octet-stream": {
        source: "iana",
        compressible: false,
        extensions: ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"]
      },
      "application/oda": {
        source: "iana",
        extensions: ["oda"]
      },
      "application/odm+xml": {
        source: "iana",
        compressible: true
      },
      "application/odx": {
        source: "iana"
      },
      "application/oebps-package+xml": {
        source: "iana",
        compressible: true,
        extensions: ["opf"]
      },
      "application/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["ogx"]
      },
      "application/omdoc+xml": {
        source: "apache",
        compressible: true,
        extensions: ["omdoc"]
      },
      "application/onenote": {
        source: "apache",
        extensions: ["onetoc", "onetoc2", "onetmp", "onepkg"]
      },
      "application/opc-nodeset+xml": {
        source: "iana",
        compressible: true
      },
      "application/oscore": {
        source: "iana"
      },
      "application/oxps": {
        source: "iana",
        extensions: ["oxps"]
      },
      "application/p21": {
        source: "iana"
      },
      "application/p21+zip": {
        source: "iana",
        compressible: false
      },
      "application/p2p-overlay+xml": {
        source: "iana",
        compressible: true,
        extensions: ["relo"]
      },
      "application/parityfec": {
        source: "iana"
      },
      "application/passport": {
        source: "iana"
      },
      "application/patch-ops-error+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xer"]
      },
      "application/pdf": {
        source: "iana",
        compressible: false,
        extensions: ["pdf"]
      },
      "application/pdx": {
        source: "iana"
      },
      "application/pem-certificate-chain": {
        source: "iana"
      },
      "application/pgp-encrypted": {
        source: "iana",
        compressible: false,
        extensions: ["pgp"]
      },
      "application/pgp-keys": {
        source: "iana",
        extensions: ["asc"]
      },
      "application/pgp-signature": {
        source: "iana",
        extensions: ["asc", "sig"]
      },
      "application/pics-rules": {
        source: "apache",
        extensions: ["prf"]
      },
      "application/pidf+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/pidf-diff+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/pkcs10": {
        source: "iana",
        extensions: ["p10"]
      },
      "application/pkcs12": {
        source: "iana"
      },
      "application/pkcs7-mime": {
        source: "iana",
        extensions: ["p7m", "p7c"]
      },
      "application/pkcs7-signature": {
        source: "iana",
        extensions: ["p7s"]
      },
      "application/pkcs8": {
        source: "iana",
        extensions: ["p8"]
      },
      "application/pkcs8-encrypted": {
        source: "iana"
      },
      "application/pkix-attr-cert": {
        source: "iana",
        extensions: ["ac"]
      },
      "application/pkix-cert": {
        source: "iana",
        extensions: ["cer"]
      },
      "application/pkix-crl": {
        source: "iana",
        extensions: ["crl"]
      },
      "application/pkix-pkipath": {
        source: "iana",
        extensions: ["pkipath"]
      },
      "application/pkixcmp": {
        source: "iana",
        extensions: ["pki"]
      },
      "application/pls+xml": {
        source: "iana",
        compressible: true,
        extensions: ["pls"]
      },
      "application/poc-settings+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/postscript": {
        source: "iana",
        compressible: true,
        extensions: ["ai", "eps", "ps"]
      },
      "application/ppsp-tracker+json": {
        source: "iana",
        compressible: true
      },
      "application/problem+json": {
        source: "iana",
        compressible: true
      },
      "application/problem+xml": {
        source: "iana",
        compressible: true
      },
      "application/provenance+xml": {
        source: "iana",
        compressible: true,
        extensions: ["provx"]
      },
      "application/prs.alvestrand.titrax-sheet": {
        source: "iana"
      },
      "application/prs.cww": {
        source: "iana",
        extensions: ["cww"]
      },
      "application/prs.cyn": {
        source: "iana",
        charset: "7-BIT"
      },
      "application/prs.hpub+zip": {
        source: "iana",
        compressible: false
      },
      "application/prs.nprend": {
        source: "iana"
      },
      "application/prs.plucker": {
        source: "iana"
      },
      "application/prs.rdf-xml-crypt": {
        source: "iana"
      },
      "application/prs.xsf+xml": {
        source: "iana",
        compressible: true
      },
      "application/pskc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["pskcxml"]
      },
      "application/pvd+json": {
        source: "iana",
        compressible: true
      },
      "application/qsig": {
        source: "iana"
      },
      "application/raml+yaml": {
        compressible: true,
        extensions: ["raml"]
      },
      "application/raptorfec": {
        source: "iana"
      },
      "application/rdap+json": {
        source: "iana",
        compressible: true
      },
      "application/rdf+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rdf", "owl"]
      },
      "application/reginfo+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rif"]
      },
      "application/relax-ng-compact-syntax": {
        source: "iana",
        extensions: ["rnc"]
      },
      "application/remote-printing": {
        source: "iana"
      },
      "application/reputon+json": {
        source: "iana",
        compressible: true
      },
      "application/resource-lists+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rl"]
      },
      "application/resource-lists-diff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rld"]
      },
      "application/rfc+xml": {
        source: "iana",
        compressible: true
      },
      "application/riscos": {
        source: "iana"
      },
      "application/rlmi+xml": {
        source: "iana",
        compressible: true
      },
      "application/rls-services+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rs"]
      },
      "application/route-apd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rapd"]
      },
      "application/route-s-tsid+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sls"]
      },
      "application/route-usd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rusd"]
      },
      "application/rpki-ghostbusters": {
        source: "iana",
        extensions: ["gbr"]
      },
      "application/rpki-manifest": {
        source: "iana",
        extensions: ["mft"]
      },
      "application/rpki-publication": {
        source: "iana"
      },
      "application/rpki-roa": {
        source: "iana",
        extensions: ["roa"]
      },
      "application/rpki-updown": {
        source: "iana"
      },
      "application/rsd+xml": {
        source: "apache",
        compressible: true,
        extensions: ["rsd"]
      },
      "application/rss+xml": {
        source: "apache",
        compressible: true,
        extensions: ["rss"]
      },
      "application/rtf": {
        source: "iana",
        compressible: true,
        extensions: ["rtf"]
      },
      "application/rtploopback": {
        source: "iana"
      },
      "application/rtx": {
        source: "iana"
      },
      "application/samlassertion+xml": {
        source: "iana",
        compressible: true
      },
      "application/samlmetadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/sarif+json": {
        source: "iana",
        compressible: true
      },
      "application/sarif-external-properties+json": {
        source: "iana",
        compressible: true
      },
      "application/sbe": {
        source: "iana"
      },
      "application/sbml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sbml"]
      },
      "application/scaip+xml": {
        source: "iana",
        compressible: true
      },
      "application/scim+json": {
        source: "iana",
        compressible: true
      },
      "application/scvp-cv-request": {
        source: "iana",
        extensions: ["scq"]
      },
      "application/scvp-cv-response": {
        source: "iana",
        extensions: ["scs"]
      },
      "application/scvp-vp-request": {
        source: "iana",
        extensions: ["spq"]
      },
      "application/scvp-vp-response": {
        source: "iana",
        extensions: ["spp"]
      },
      "application/sdp": {
        source: "iana",
        extensions: ["sdp"]
      },
      "application/secevent+jwt": {
        source: "iana"
      },
      "application/senml+cbor": {
        source: "iana"
      },
      "application/senml+json": {
        source: "iana",
        compressible: true
      },
      "application/senml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["senmlx"]
      },
      "application/senml-etch+cbor": {
        source: "iana"
      },
      "application/senml-etch+json": {
        source: "iana",
        compressible: true
      },
      "application/senml-exi": {
        source: "iana"
      },
      "application/sensml+cbor": {
        source: "iana"
      },
      "application/sensml+json": {
        source: "iana",
        compressible: true
      },
      "application/sensml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sensmlx"]
      },
      "application/sensml-exi": {
        source: "iana"
      },
      "application/sep+xml": {
        source: "iana",
        compressible: true
      },
      "application/sep-exi": {
        source: "iana"
      },
      "application/session-info": {
        source: "iana"
      },
      "application/set-payment": {
        source: "iana"
      },
      "application/set-payment-initiation": {
        source: "iana",
        extensions: ["setpay"]
      },
      "application/set-registration": {
        source: "iana"
      },
      "application/set-registration-initiation": {
        source: "iana",
        extensions: ["setreg"]
      },
      "application/sgml": {
        source: "iana"
      },
      "application/sgml-open-catalog": {
        source: "iana"
      },
      "application/shf+xml": {
        source: "iana",
        compressible: true,
        extensions: ["shf"]
      },
      "application/sieve": {
        source: "iana",
        extensions: ["siv", "sieve"]
      },
      "application/simple-filter+xml": {
        source: "iana",
        compressible: true
      },
      "application/simple-message-summary": {
        source: "iana"
      },
      "application/simplesymbolcontainer": {
        source: "iana"
      },
      "application/sipc": {
        source: "iana"
      },
      "application/slate": {
        source: "iana"
      },
      "application/smil": {
        source: "iana"
      },
      "application/smil+xml": {
        source: "iana",
        compressible: true,
        extensions: ["smi", "smil"]
      },
      "application/smpte336m": {
        source: "iana"
      },
      "application/soap+fastinfoset": {
        source: "iana"
      },
      "application/soap+xml": {
        source: "iana",
        compressible: true
      },
      "application/sparql-query": {
        source: "iana",
        extensions: ["rq"]
      },
      "application/sparql-results+xml": {
        source: "iana",
        compressible: true,
        extensions: ["srx"]
      },
      "application/spdx+json": {
        source: "iana",
        compressible: true
      },
      "application/spirits-event+xml": {
        source: "iana",
        compressible: true
      },
      "application/sql": {
        source: "iana"
      },
      "application/srgs": {
        source: "iana",
        extensions: ["gram"]
      },
      "application/srgs+xml": {
        source: "iana",
        compressible: true,
        extensions: ["grxml"]
      },
      "application/sru+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sru"]
      },
      "application/ssdl+xml": {
        source: "apache",
        compressible: true,
        extensions: ["ssdl"]
      },
      "application/ssml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ssml"]
      },
      "application/stix+json": {
        source: "iana",
        compressible: true
      },
      "application/swid+xml": {
        source: "iana",
        compressible: true,
        extensions: ["swidtag"]
      },
      "application/tamp-apex-update": {
        source: "iana"
      },
      "application/tamp-apex-update-confirm": {
        source: "iana"
      },
      "application/tamp-community-update": {
        source: "iana"
      },
      "application/tamp-community-update-confirm": {
        source: "iana"
      },
      "application/tamp-error": {
        source: "iana"
      },
      "application/tamp-sequence-adjust": {
        source: "iana"
      },
      "application/tamp-sequence-adjust-confirm": {
        source: "iana"
      },
      "application/tamp-status-query": {
        source: "iana"
      },
      "application/tamp-status-response": {
        source: "iana"
      },
      "application/tamp-update": {
        source: "iana"
      },
      "application/tamp-update-confirm": {
        source: "iana"
      },
      "application/tar": {
        compressible: true
      },
      "application/taxii+json": {
        source: "iana",
        compressible: true
      },
      "application/td+json": {
        source: "iana",
        compressible: true
      },
      "application/tei+xml": {
        source: "iana",
        compressible: true,
        extensions: ["tei", "teicorpus"]
      },
      "application/tetra_isi": {
        source: "iana"
      },
      "application/thraud+xml": {
        source: "iana",
        compressible: true,
        extensions: ["tfi"]
      },
      "application/timestamp-query": {
        source: "iana"
      },
      "application/timestamp-reply": {
        source: "iana"
      },
      "application/timestamped-data": {
        source: "iana",
        extensions: ["tsd"]
      },
      "application/tlsrpt+gzip": {
        source: "iana"
      },
      "application/tlsrpt+json": {
        source: "iana",
        compressible: true
      },
      "application/tnauthlist": {
        source: "iana"
      },
      "application/token-introspection+jwt": {
        source: "iana"
      },
      "application/toml": {
        compressible: true,
        extensions: ["toml"]
      },
      "application/trickle-ice-sdpfrag": {
        source: "iana"
      },
      "application/trig": {
        source: "iana",
        extensions: ["trig"]
      },
      "application/ttml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ttml"]
      },
      "application/tve-trigger": {
        source: "iana"
      },
      "application/tzif": {
        source: "iana"
      },
      "application/tzif-leap": {
        source: "iana"
      },
      "application/ubjson": {
        compressible: false,
        extensions: ["ubj"]
      },
      "application/ulpfec": {
        source: "iana"
      },
      "application/urc-grpsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/urc-ressheet+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rsheet"]
      },
      "application/urc-targetdesc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["td"]
      },
      "application/urc-uisocketdesc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vcard+json": {
        source: "iana",
        compressible: true
      },
      "application/vcard+xml": {
        source: "iana",
        compressible: true
      },
      "application/vemmi": {
        source: "iana"
      },
      "application/vividence.scriptfile": {
        source: "apache"
      },
      "application/vnd.1000minds.decision-model+xml": {
        source: "iana",
        compressible: true,
        extensions: ["1km"]
      },
      "application/vnd.3gpp-prose+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp-prose-pc3ch+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp-v2x-local-service-information": {
        source: "iana"
      },
      "application/vnd.3gpp.5gnas": {
        source: "iana"
      },
      "application/vnd.3gpp.access-transfer-events+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.bsf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.gmop+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.gtpc": {
        source: "iana"
      },
      "application/vnd.3gpp.interworking-data": {
        source: "iana"
      },
      "application/vnd.3gpp.lpp": {
        source: "iana"
      },
      "application/vnd.3gpp.mc-signalling-ear": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-payload": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-signalling": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-floor-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-location-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-mbms-usage-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-signed+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-ue-init-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-affiliation-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-location-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-transmission-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mid-call+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.ngap": {
        source: "iana"
      },
      "application/vnd.3gpp.pfcp": {
        source: "iana"
      },
      "application/vnd.3gpp.pic-bw-large": {
        source: "iana",
        extensions: ["plb"]
      },
      "application/vnd.3gpp.pic-bw-small": {
        source: "iana",
        extensions: ["psb"]
      },
      "application/vnd.3gpp.pic-bw-var": {
        source: "iana",
        extensions: ["pvb"]
      },
      "application/vnd.3gpp.s1ap": {
        source: "iana"
      },
      "application/vnd.3gpp.sms": {
        source: "iana"
      },
      "application/vnd.3gpp.sms+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.srvcc-ext+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.srvcc-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.state-and-event-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.ussd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp2.bcmcsinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp2.sms": {
        source: "iana"
      },
      "application/vnd.3gpp2.tcap": {
        source: "iana",
        extensions: ["tcap"]
      },
      "application/vnd.3lightssoftware.imagescal": {
        source: "iana"
      },
      "application/vnd.3m.post-it-notes": {
        source: "iana",
        extensions: ["pwn"]
      },
      "application/vnd.accpac.simply.aso": {
        source: "iana",
        extensions: ["aso"]
      },
      "application/vnd.accpac.simply.imp": {
        source: "iana",
        extensions: ["imp"]
      },
      "application/vnd.acucobol": {
        source: "iana",
        extensions: ["acu"]
      },
      "application/vnd.acucorp": {
        source: "iana",
        extensions: ["atc", "acutc"]
      },
      "application/vnd.adobe.air-application-installer-package+zip": {
        source: "apache",
        compressible: false,
        extensions: ["air"]
      },
      "application/vnd.adobe.flash.movie": {
        source: "iana"
      },
      "application/vnd.adobe.formscentral.fcdt": {
        source: "iana",
        extensions: ["fcdt"]
      },
      "application/vnd.adobe.fxp": {
        source: "iana",
        extensions: ["fxp", "fxpl"]
      },
      "application/vnd.adobe.partial-upload": {
        source: "iana"
      },
      "application/vnd.adobe.xdp+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdp"]
      },
      "application/vnd.adobe.xfdf": {
        source: "iana",
        extensions: ["xfdf"]
      },
      "application/vnd.aether.imp": {
        source: "iana"
      },
      "application/vnd.afpc.afplinedata": {
        source: "iana"
      },
      "application/vnd.afpc.afplinedata-pagedef": {
        source: "iana"
      },
      "application/vnd.afpc.cmoca-cmresource": {
        source: "iana"
      },
      "application/vnd.afpc.foca-charset": {
        source: "iana"
      },
      "application/vnd.afpc.foca-codedfont": {
        source: "iana"
      },
      "application/vnd.afpc.foca-codepage": {
        source: "iana"
      },
      "application/vnd.afpc.modca": {
        source: "iana"
      },
      "application/vnd.afpc.modca-cmtable": {
        source: "iana"
      },
      "application/vnd.afpc.modca-formdef": {
        source: "iana"
      },
      "application/vnd.afpc.modca-mediummap": {
        source: "iana"
      },
      "application/vnd.afpc.modca-objectcontainer": {
        source: "iana"
      },
      "application/vnd.afpc.modca-overlay": {
        source: "iana"
      },
      "application/vnd.afpc.modca-pagesegment": {
        source: "iana"
      },
      "application/vnd.age": {
        source: "iana",
        extensions: ["age"]
      },
      "application/vnd.ah-barcode": {
        source: "iana"
      },
      "application/vnd.ahead.space": {
        source: "iana",
        extensions: ["ahead"]
      },
      "application/vnd.airzip.filesecure.azf": {
        source: "iana",
        extensions: ["azf"]
      },
      "application/vnd.airzip.filesecure.azs": {
        source: "iana",
        extensions: ["azs"]
      },
      "application/vnd.amadeus+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.amazon.ebook": {
        source: "apache",
        extensions: ["azw"]
      },
      "application/vnd.amazon.mobi8-ebook": {
        source: "iana"
      },
      "application/vnd.americandynamics.acc": {
        source: "iana",
        extensions: ["acc"]
      },
      "application/vnd.amiga.ami": {
        source: "iana",
        extensions: ["ami"]
      },
      "application/vnd.amundsen.maze+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.android.ota": {
        source: "iana"
      },
      "application/vnd.android.package-archive": {
        source: "apache",
        compressible: false,
        extensions: ["apk"]
      },
      "application/vnd.anki": {
        source: "iana"
      },
      "application/vnd.anser-web-certificate-issue-initiation": {
        source: "iana",
        extensions: ["cii"]
      },
      "application/vnd.anser-web-funds-transfer-initiation": {
        source: "apache",
        extensions: ["fti"]
      },
      "application/vnd.antix.game-component": {
        source: "iana",
        extensions: ["atx"]
      },
      "application/vnd.apache.arrow.file": {
        source: "iana"
      },
      "application/vnd.apache.arrow.stream": {
        source: "iana"
      },
      "application/vnd.apache.thrift.binary": {
        source: "iana"
      },
      "application/vnd.apache.thrift.compact": {
        source: "iana"
      },
      "application/vnd.apache.thrift.json": {
        source: "iana"
      },
      "application/vnd.api+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.aplextor.warrp+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.apothekende.reservation+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.apple.installer+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpkg"]
      },
      "application/vnd.apple.keynote": {
        source: "iana",
        extensions: ["key"]
      },
      "application/vnd.apple.mpegurl": {
        source: "iana",
        extensions: ["m3u8"]
      },
      "application/vnd.apple.numbers": {
        source: "iana",
        extensions: ["numbers"]
      },
      "application/vnd.apple.pages": {
        source: "iana",
        extensions: ["pages"]
      },
      "application/vnd.apple.pkpass": {
        compressible: false,
        extensions: ["pkpass"]
      },
      "application/vnd.arastra.swi": {
        source: "iana"
      },
      "application/vnd.aristanetworks.swi": {
        source: "iana",
        extensions: ["swi"]
      },
      "application/vnd.artisan+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.artsquare": {
        source: "iana"
      },
      "application/vnd.astraea-software.iota": {
        source: "iana",
        extensions: ["iota"]
      },
      "application/vnd.audiograph": {
        source: "iana",
        extensions: ["aep"]
      },
      "application/vnd.autopackage": {
        source: "iana"
      },
      "application/vnd.avalon+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.avistar+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.balsamiq.bmml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["bmml"]
      },
      "application/vnd.balsamiq.bmpr": {
        source: "iana"
      },
      "application/vnd.banana-accounting": {
        source: "iana"
      },
      "application/vnd.bbf.usp.error": {
        source: "iana"
      },
      "application/vnd.bbf.usp.msg": {
        source: "iana"
      },
      "application/vnd.bbf.usp.msg+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.bekitzur-stech+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.bint.med-content": {
        source: "iana"
      },
      "application/vnd.biopax.rdf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.blink-idb-value-wrapper": {
        source: "iana"
      },
      "application/vnd.blueice.multipass": {
        source: "iana",
        extensions: ["mpm"]
      },
      "application/vnd.bluetooth.ep.oob": {
        source: "iana"
      },
      "application/vnd.bluetooth.le.oob": {
        source: "iana"
      },
      "application/vnd.bmi": {
        source: "iana",
        extensions: ["bmi"]
      },
      "application/vnd.bpf": {
        source: "iana"
      },
      "application/vnd.bpf3": {
        source: "iana"
      },
      "application/vnd.businessobjects": {
        source: "iana",
        extensions: ["rep"]
      },
      "application/vnd.byu.uapi+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cab-jscript": {
        source: "iana"
      },
      "application/vnd.canon-cpdl": {
        source: "iana"
      },
      "application/vnd.canon-lips": {
        source: "iana"
      },
      "application/vnd.capasystems-pg+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cendio.thinlinc.clientconf": {
        source: "iana"
      },
      "application/vnd.century-systems.tcp_stream": {
        source: "iana"
      },
      "application/vnd.chemdraw+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cdxml"]
      },
      "application/vnd.chess-pgn": {
        source: "iana"
      },
      "application/vnd.chipnuts.karaoke-mmd": {
        source: "iana",
        extensions: ["mmd"]
      },
      "application/vnd.ciedi": {
        source: "iana"
      },
      "application/vnd.cinderella": {
        source: "iana",
        extensions: ["cdy"]
      },
      "application/vnd.cirpack.isdn-ext": {
        source: "iana"
      },
      "application/vnd.citationstyles.style+xml": {
        source: "iana",
        compressible: true,
        extensions: ["csl"]
      },
      "application/vnd.claymore": {
        source: "iana",
        extensions: ["cla"]
      },
      "application/vnd.cloanto.rp9": {
        source: "iana",
        extensions: ["rp9"]
      },
      "application/vnd.clonk.c4group": {
        source: "iana",
        extensions: ["c4g", "c4d", "c4f", "c4p", "c4u"]
      },
      "application/vnd.cluetrust.cartomobile-config": {
        source: "iana",
        extensions: ["c11amc"]
      },
      "application/vnd.cluetrust.cartomobile-config-pkg": {
        source: "iana",
        extensions: ["c11amz"]
      },
      "application/vnd.coffeescript": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.document": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.document-template": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.presentation": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.presentation-template": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.spreadsheet": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.spreadsheet-template": {
        source: "iana"
      },
      "application/vnd.collection+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.collection.doc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.collection.next+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.comicbook+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.comicbook-rar": {
        source: "iana"
      },
      "application/vnd.commerce-battelle": {
        source: "iana"
      },
      "application/vnd.commonspace": {
        source: "iana",
        extensions: ["csp"]
      },
      "application/vnd.contact.cmsg": {
        source: "iana",
        extensions: ["cdbcmsg"]
      },
      "application/vnd.coreos.ignition+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cosmocaller": {
        source: "iana",
        extensions: ["cmc"]
      },
      "application/vnd.crick.clicker": {
        source: "iana",
        extensions: ["clkx"]
      },
      "application/vnd.crick.clicker.keyboard": {
        source: "iana",
        extensions: ["clkk"]
      },
      "application/vnd.crick.clicker.palette": {
        source: "iana",
        extensions: ["clkp"]
      },
      "application/vnd.crick.clicker.template": {
        source: "iana",
        extensions: ["clkt"]
      },
      "application/vnd.crick.clicker.wordbank": {
        source: "iana",
        extensions: ["clkw"]
      },
      "application/vnd.criticaltools.wbs+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wbs"]
      },
      "application/vnd.cryptii.pipe+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.crypto-shade-file": {
        source: "iana"
      },
      "application/vnd.cryptomator.encrypted": {
        source: "iana"
      },
      "application/vnd.cryptomator.vault": {
        source: "iana"
      },
      "application/vnd.ctc-posml": {
        source: "iana",
        extensions: ["pml"]
      },
      "application/vnd.ctct.ws+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cups-pdf": {
        source: "iana"
      },
      "application/vnd.cups-postscript": {
        source: "iana"
      },
      "application/vnd.cups-ppd": {
        source: "iana",
        extensions: ["ppd"]
      },
      "application/vnd.cups-raster": {
        source: "iana"
      },
      "application/vnd.cups-raw": {
        source: "iana"
      },
      "application/vnd.curl": {
        source: "iana"
      },
      "application/vnd.curl.car": {
        source: "apache",
        extensions: ["car"]
      },
      "application/vnd.curl.pcurl": {
        source: "apache",
        extensions: ["pcurl"]
      },
      "application/vnd.cyan.dean.root+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cybank": {
        source: "iana"
      },
      "application/vnd.cyclonedx+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cyclonedx+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.d2l.coursepackage1p0+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.d3m-dataset": {
        source: "iana"
      },
      "application/vnd.d3m-problem": {
        source: "iana"
      },
      "application/vnd.dart": {
        source: "iana",
        compressible: true,
        extensions: ["dart"]
      },
      "application/vnd.data-vision.rdz": {
        source: "iana",
        extensions: ["rdz"]
      },
      "application/vnd.datapackage+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dataresource+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dbf": {
        source: "iana",
        extensions: ["dbf"]
      },
      "application/vnd.debian.binary-package": {
        source: "iana"
      },
      "application/vnd.dece.data": {
        source: "iana",
        extensions: ["uvf", "uvvf", "uvd", "uvvd"]
      },
      "application/vnd.dece.ttml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["uvt", "uvvt"]
      },
      "application/vnd.dece.unspecified": {
        source: "iana",
        extensions: ["uvx", "uvvx"]
      },
      "application/vnd.dece.zip": {
        source: "iana",
        extensions: ["uvz", "uvvz"]
      },
      "application/vnd.denovo.fcselayout-link": {
        source: "iana",
        extensions: ["fe_launch"]
      },
      "application/vnd.desmume.movie": {
        source: "iana"
      },
      "application/vnd.dir-bi.plate-dl-nosuffix": {
        source: "iana"
      },
      "application/vnd.dm.delegation+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dna": {
        source: "iana",
        extensions: ["dna"]
      },
      "application/vnd.document+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dolby.mlp": {
        source: "apache",
        extensions: ["mlp"]
      },
      "application/vnd.dolby.mobile.1": {
        source: "iana"
      },
      "application/vnd.dolby.mobile.2": {
        source: "iana"
      },
      "application/vnd.doremir.scorecloud-binary-document": {
        source: "iana"
      },
      "application/vnd.dpgraph": {
        source: "iana",
        extensions: ["dpg"]
      },
      "application/vnd.dreamfactory": {
        source: "iana",
        extensions: ["dfac"]
      },
      "application/vnd.drive+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ds-keypoint": {
        source: "apache",
        extensions: ["kpxx"]
      },
      "application/vnd.dtg.local": {
        source: "iana"
      },
      "application/vnd.dtg.local.flash": {
        source: "iana"
      },
      "application/vnd.dtg.local.html": {
        source: "iana"
      },
      "application/vnd.dvb.ait": {
        source: "iana",
        extensions: ["ait"]
      },
      "application/vnd.dvb.dvbisl+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.dvbj": {
        source: "iana"
      },
      "application/vnd.dvb.esgcontainer": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcdftnotifaccess": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgaccess": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgaccess2": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgpdd": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcroaming": {
        source: "iana"
      },
      "application/vnd.dvb.iptv.alfec-base": {
        source: "iana"
      },
      "application/vnd.dvb.iptv.alfec-enhancement": {
        source: "iana"
      },
      "application/vnd.dvb.notif-aggregate-root+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-container+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-generic+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-msglist+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-registration-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-registration-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-init+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.pfr": {
        source: "iana"
      },
      "application/vnd.dvb.service": {
        source: "iana",
        extensions: ["svc"]
      },
      "application/vnd.dxr": {
        source: "iana"
      },
      "application/vnd.dynageo": {
        source: "iana",
        extensions: ["geo"]
      },
      "application/vnd.dzr": {
        source: "iana"
      },
      "application/vnd.easykaraoke.cdgdownload": {
        source: "iana"
      },
      "application/vnd.ecdis-update": {
        source: "iana"
      },
      "application/vnd.ecip.rlp": {
        source: "iana"
      },
      "application/vnd.eclipse.ditto+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ecowin.chart": {
        source: "iana",
        extensions: ["mag"]
      },
      "application/vnd.ecowin.filerequest": {
        source: "iana"
      },
      "application/vnd.ecowin.fileupdate": {
        source: "iana"
      },
      "application/vnd.ecowin.series": {
        source: "iana"
      },
      "application/vnd.ecowin.seriesrequest": {
        source: "iana"
      },
      "application/vnd.ecowin.seriesupdate": {
        source: "iana"
      },
      "application/vnd.efi.img": {
        source: "iana"
      },
      "application/vnd.efi.iso": {
        source: "iana"
      },
      "application/vnd.emclient.accessrequest+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.enliven": {
        source: "iana",
        extensions: ["nml"]
      },
      "application/vnd.enphase.envoy": {
        source: "iana"
      },
      "application/vnd.eprints.data+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.epson.esf": {
        source: "iana",
        extensions: ["esf"]
      },
      "application/vnd.epson.msf": {
        source: "iana",
        extensions: ["msf"]
      },
      "application/vnd.epson.quickanime": {
        source: "iana",
        extensions: ["qam"]
      },
      "application/vnd.epson.salt": {
        source: "iana",
        extensions: ["slt"]
      },
      "application/vnd.epson.ssf": {
        source: "iana",
        extensions: ["ssf"]
      },
      "application/vnd.ericsson.quickcall": {
        source: "iana"
      },
      "application/vnd.espass-espass+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.eszigno3+xml": {
        source: "iana",
        compressible: true,
        extensions: ["es3", "et3"]
      },
      "application/vnd.etsi.aoc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.asic-e+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.etsi.asic-s+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.etsi.cug+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvcommand+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvdiscovery+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-bc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-cod+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-npvr+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvservice+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsync+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvueprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.mcid+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.mheg5": {
        source: "iana"
      },
      "application/vnd.etsi.overload-control-policy-dataset+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.pstn+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.sci+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.simservs+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.timestamp-token": {
        source: "iana"
      },
      "application/vnd.etsi.tsl+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.tsl.der": {
        source: "iana"
      },
      "application/vnd.eu.kasparian.car+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.eudora.data": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.profile": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.settings": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.theme": {
        source: "iana"
      },
      "application/vnd.exstream-empower+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.exstream-package": {
        source: "iana"
      },
      "application/vnd.ezpix-album": {
        source: "iana",
        extensions: ["ez2"]
      },
      "application/vnd.ezpix-package": {
        source: "iana",
        extensions: ["ez3"]
      },
      "application/vnd.f-secure.mobile": {
        source: "iana"
      },
      "application/vnd.familysearch.gedcom+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.fastcopy-disk-image": {
        source: "iana"
      },
      "application/vnd.fdf": {
        source: "iana",
        extensions: ["fdf"]
      },
      "application/vnd.fdsn.mseed": {
        source: "iana",
        extensions: ["mseed"]
      },
      "application/vnd.fdsn.seed": {
        source: "iana",
        extensions: ["seed", "dataless"]
      },
      "application/vnd.ffsns": {
        source: "iana"
      },
      "application/vnd.ficlab.flb+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.filmit.zfc": {
        source: "iana"
      },
      "application/vnd.fints": {
        source: "iana"
      },
      "application/vnd.firemonkeys.cloudcell": {
        source: "iana"
      },
      "application/vnd.flographit": {
        source: "iana",
        extensions: ["gph"]
      },
      "application/vnd.fluxtime.clip": {
        source: "iana",
        extensions: ["ftc"]
      },
      "application/vnd.font-fontforge-sfd": {
        source: "iana"
      },
      "application/vnd.framemaker": {
        source: "iana",
        extensions: ["fm", "frame", "maker", "book"]
      },
      "application/vnd.frogans.fnc": {
        source: "iana",
        extensions: ["fnc"]
      },
      "application/vnd.frogans.ltf": {
        source: "iana",
        extensions: ["ltf"]
      },
      "application/vnd.fsc.weblaunch": {
        source: "iana",
        extensions: ["fsc"]
      },
      "application/vnd.fujifilm.fb.docuworks": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.docuworks.binder": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.docuworks.container": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.jfi+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.fujitsu.oasys": {
        source: "iana",
        extensions: ["oas"]
      },
      "application/vnd.fujitsu.oasys2": {
        source: "iana",
        extensions: ["oa2"]
      },
      "application/vnd.fujitsu.oasys3": {
        source: "iana",
        extensions: ["oa3"]
      },
      "application/vnd.fujitsu.oasysgp": {
        source: "iana",
        extensions: ["fg5"]
      },
      "application/vnd.fujitsu.oasysprs": {
        source: "iana",
        extensions: ["bh2"]
      },
      "application/vnd.fujixerox.art-ex": {
        source: "iana"
      },
      "application/vnd.fujixerox.art4": {
        source: "iana"
      },
      "application/vnd.fujixerox.ddd": {
        source: "iana",
        extensions: ["ddd"]
      },
      "application/vnd.fujixerox.docuworks": {
        source: "iana",
        extensions: ["xdw"]
      },
      "application/vnd.fujixerox.docuworks.binder": {
        source: "iana",
        extensions: ["xbd"]
      },
      "application/vnd.fujixerox.docuworks.container": {
        source: "iana"
      },
      "application/vnd.fujixerox.hbpl": {
        source: "iana"
      },
      "application/vnd.fut-misnet": {
        source: "iana"
      },
      "application/vnd.futoin+cbor": {
        source: "iana"
      },
      "application/vnd.futoin+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.fuzzysheet": {
        source: "iana",
        extensions: ["fzs"]
      },
      "application/vnd.genomatix.tuxedo": {
        source: "iana",
        extensions: ["txd"]
      },
      "application/vnd.gentics.grd+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.geo+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.geocube+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.geogebra.file": {
        source: "iana",
        extensions: ["ggb"]
      },
      "application/vnd.geogebra.slides": {
        source: "iana"
      },
      "application/vnd.geogebra.tool": {
        source: "iana",
        extensions: ["ggt"]
      },
      "application/vnd.geometry-explorer": {
        source: "iana",
        extensions: ["gex", "gre"]
      },
      "application/vnd.geonext": {
        source: "iana",
        extensions: ["gxt"]
      },
      "application/vnd.geoplan": {
        source: "iana",
        extensions: ["g2w"]
      },
      "application/vnd.geospace": {
        source: "iana",
        extensions: ["g3w"]
      },
      "application/vnd.gerber": {
        source: "iana"
      },
      "application/vnd.globalplatform.card-content-mgt": {
        source: "iana"
      },
      "application/vnd.globalplatform.card-content-mgt-response": {
        source: "iana"
      },
      "application/vnd.gmx": {
        source: "iana",
        extensions: ["gmx"]
      },
      "application/vnd.google-apps.document": {
        compressible: false,
        extensions: ["gdoc"]
      },
      "application/vnd.google-apps.presentation": {
        compressible: false,
        extensions: ["gslides"]
      },
      "application/vnd.google-apps.spreadsheet": {
        compressible: false,
        extensions: ["gsheet"]
      },
      "application/vnd.google-earth.kml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["kml"]
      },
      "application/vnd.google-earth.kmz": {
        source: "iana",
        compressible: false,
        extensions: ["kmz"]
      },
      "application/vnd.gov.sk.e-form+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.gov.sk.e-form+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.gov.sk.xmldatacontainer+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.grafeq": {
        source: "iana",
        extensions: ["gqf", "gqs"]
      },
      "application/vnd.gridmp": {
        source: "iana"
      },
      "application/vnd.groove-account": {
        source: "iana",
        extensions: ["gac"]
      },
      "application/vnd.groove-help": {
        source: "iana",
        extensions: ["ghf"]
      },
      "application/vnd.groove-identity-message": {
        source: "iana",
        extensions: ["gim"]
      },
      "application/vnd.groove-injector": {
        source: "iana",
        extensions: ["grv"]
      },
      "application/vnd.groove-tool-message": {
        source: "iana",
        extensions: ["gtm"]
      },
      "application/vnd.groove-tool-template": {
        source: "iana",
        extensions: ["tpl"]
      },
      "application/vnd.groove-vcard": {
        source: "iana",
        extensions: ["vcg"]
      },
      "application/vnd.hal+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hal+xml": {
        source: "iana",
        compressible: true,
        extensions: ["hal"]
      },
      "application/vnd.handheld-entertainment+xml": {
        source: "iana",
        compressible: true,
        extensions: ["zmm"]
      },
      "application/vnd.hbci": {
        source: "iana",
        extensions: ["hbci"]
      },
      "application/vnd.hc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hcl-bireports": {
        source: "iana"
      },
      "application/vnd.hdt": {
        source: "iana"
      },
      "application/vnd.heroku+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hhe.lesson-player": {
        source: "iana",
        extensions: ["les"]
      },
      "application/vnd.hl7cda+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.hl7v2+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.hp-hpgl": {
        source: "iana",
        extensions: ["hpgl"]
      },
      "application/vnd.hp-hpid": {
        source: "iana",
        extensions: ["hpid"]
      },
      "application/vnd.hp-hps": {
        source: "iana",
        extensions: ["hps"]
      },
      "application/vnd.hp-jlyt": {
        source: "iana",
        extensions: ["jlt"]
      },
      "application/vnd.hp-pcl": {
        source: "iana",
        extensions: ["pcl"]
      },
      "application/vnd.hp-pclxl": {
        source: "iana",
        extensions: ["pclxl"]
      },
      "application/vnd.httphone": {
        source: "iana"
      },
      "application/vnd.hydrostatix.sof-data": {
        source: "iana",
        extensions: ["sfd-hdstx"]
      },
      "application/vnd.hyper+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hyper-item+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hyperdrive+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hzn-3d-crossword": {
        source: "iana"
      },
      "application/vnd.ibm.afplinedata": {
        source: "iana"
      },
      "application/vnd.ibm.electronic-media": {
        source: "iana"
      },
      "application/vnd.ibm.minipay": {
        source: "iana",
        extensions: ["mpy"]
      },
      "application/vnd.ibm.modcap": {
        source: "iana",
        extensions: ["afp", "listafp", "list3820"]
      },
      "application/vnd.ibm.rights-management": {
        source: "iana",
        extensions: ["irm"]
      },
      "application/vnd.ibm.secure-container": {
        source: "iana",
        extensions: ["sc"]
      },
      "application/vnd.iccprofile": {
        source: "iana",
        extensions: ["icc", "icm"]
      },
      "application/vnd.ieee.1905": {
        source: "iana"
      },
      "application/vnd.igloader": {
        source: "iana",
        extensions: ["igl"]
      },
      "application/vnd.imagemeter.folder+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.imagemeter.image+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.immervision-ivp": {
        source: "iana",
        extensions: ["ivp"]
      },
      "application/vnd.immervision-ivu": {
        source: "iana",
        extensions: ["ivu"]
      },
      "application/vnd.ims.imsccv1p1": {
        source: "iana"
      },
      "application/vnd.ims.imsccv1p2": {
        source: "iana"
      },
      "application/vnd.ims.imsccv1p3": {
        source: "iana"
      },
      "application/vnd.ims.lis.v2.result+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolproxy+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolproxy.id+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolsettings+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolsettings.simple+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.informedcontrol.rms+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.informix-visionary": {
        source: "iana"
      },
      "application/vnd.infotech.project": {
        source: "iana"
      },
      "application/vnd.infotech.project+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.innopath.wamp.notification": {
        source: "iana"
      },
      "application/vnd.insors.igm": {
        source: "iana",
        extensions: ["igm"]
      },
      "application/vnd.intercon.formnet": {
        source: "iana",
        extensions: ["xpw", "xpx"]
      },
      "application/vnd.intergeo": {
        source: "iana",
        extensions: ["i2g"]
      },
      "application/vnd.intertrust.digibox": {
        source: "iana"
      },
      "application/vnd.intertrust.nncp": {
        source: "iana"
      },
      "application/vnd.intu.qbo": {
        source: "iana",
        extensions: ["qbo"]
      },
      "application/vnd.intu.qfx": {
        source: "iana",
        extensions: ["qfx"]
      },
      "application/vnd.iptc.g2.catalogitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.conceptitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.knowledgeitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.newsitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.newsmessage+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.packageitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.planningitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ipunplugged.rcprofile": {
        source: "iana",
        extensions: ["rcprofile"]
      },
      "application/vnd.irepository.package+xml": {
        source: "iana",
        compressible: true,
        extensions: ["irp"]
      },
      "application/vnd.is-xpr": {
        source: "iana",
        extensions: ["xpr"]
      },
      "application/vnd.isac.fcs": {
        source: "iana",
        extensions: ["fcs"]
      },
      "application/vnd.iso11783-10+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.jam": {
        source: "iana",
        extensions: ["jam"]
      },
      "application/vnd.japannet-directory-service": {
        source: "iana"
      },
      "application/vnd.japannet-jpnstore-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-payment-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-registration": {
        source: "iana"
      },
      "application/vnd.japannet-registration-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-setstore-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-verification": {
        source: "iana"
      },
      "application/vnd.japannet-verification-wakeup": {
        source: "iana"
      },
      "application/vnd.jcp.javame.midlet-rms": {
        source: "iana",
        extensions: ["rms"]
      },
      "application/vnd.jisp": {
        source: "iana",
        extensions: ["jisp"]
      },
      "application/vnd.joost.joda-archive": {
        source: "iana",
        extensions: ["joda"]
      },
      "application/vnd.jsk.isdn-ngn": {
        source: "iana"
      },
      "application/vnd.kahootz": {
        source: "iana",
        extensions: ["ktz", "ktr"]
      },
      "application/vnd.kde.karbon": {
        source: "iana",
        extensions: ["karbon"]
      },
      "application/vnd.kde.kchart": {
        source: "iana",
        extensions: ["chrt"]
      },
      "application/vnd.kde.kformula": {
        source: "iana",
        extensions: ["kfo"]
      },
      "application/vnd.kde.kivio": {
        source: "iana",
        extensions: ["flw"]
      },
      "application/vnd.kde.kontour": {
        source: "iana",
        extensions: ["kon"]
      },
      "application/vnd.kde.kpresenter": {
        source: "iana",
        extensions: ["kpr", "kpt"]
      },
      "application/vnd.kde.kspread": {
        source: "iana",
        extensions: ["ksp"]
      },
      "application/vnd.kde.kword": {
        source: "iana",
        extensions: ["kwd", "kwt"]
      },
      "application/vnd.kenameaapp": {
        source: "iana",
        extensions: ["htke"]
      },
      "application/vnd.kidspiration": {
        source: "iana",
        extensions: ["kia"]
      },
      "application/vnd.kinar": {
        source: "iana",
        extensions: ["kne", "knp"]
      },
      "application/vnd.koan": {
        source: "iana",
        extensions: ["skp", "skd", "skt", "skm"]
      },
      "application/vnd.kodak-descriptor": {
        source: "iana",
        extensions: ["sse"]
      },
      "application/vnd.las": {
        source: "iana"
      },
      "application/vnd.las.las+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.las.las+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lasxml"]
      },
      "application/vnd.laszip": {
        source: "iana"
      },
      "application/vnd.leap+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.liberty-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.llamagraphics.life-balance.desktop": {
        source: "iana",
        extensions: ["lbd"]
      },
      "application/vnd.llamagraphics.life-balance.exchange+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lbe"]
      },
      "application/vnd.logipipe.circuit+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.loom": {
        source: "iana"
      },
      "application/vnd.lotus-1-2-3": {
        source: "iana",
        extensions: ["123"]
      },
      "application/vnd.lotus-approach": {
        source: "iana",
        extensions: ["apr"]
      },
      "application/vnd.lotus-freelance": {
        source: "iana",
        extensions: ["pre"]
      },
      "application/vnd.lotus-notes": {
        source: "iana",
        extensions: ["nsf"]
      },
      "application/vnd.lotus-organizer": {
        source: "iana",
        extensions: ["org"]
      },
      "application/vnd.lotus-screencam": {
        source: "iana",
        extensions: ["scm"]
      },
      "application/vnd.lotus-wordpro": {
        source: "iana",
        extensions: ["lwp"]
      },
      "application/vnd.macports.portpkg": {
        source: "iana",
        extensions: ["portpkg"]
      },
      "application/vnd.mapbox-vector-tile": {
        source: "iana",
        extensions: ["mvt"]
      },
      "application/vnd.marlin.drm.actiontoken+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.conftoken+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.license+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.mdcf": {
        source: "iana"
      },
      "application/vnd.mason+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.maxar.archive.3tz+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.maxmind.maxmind-db": {
        source: "iana"
      },
      "application/vnd.mcd": {
        source: "iana",
        extensions: ["mcd"]
      },
      "application/vnd.medcalcdata": {
        source: "iana",
        extensions: ["mc1"]
      },
      "application/vnd.mediastation.cdkey": {
        source: "iana",
        extensions: ["cdkey"]
      },
      "application/vnd.meridian-slingshot": {
        source: "iana"
      },
      "application/vnd.mfer": {
        source: "iana",
        extensions: ["mwf"]
      },
      "application/vnd.mfmp": {
        source: "iana",
        extensions: ["mfm"]
      },
      "application/vnd.micro+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.micrografx.flo": {
        source: "iana",
        extensions: ["flo"]
      },
      "application/vnd.micrografx.igx": {
        source: "iana",
        extensions: ["igx"]
      },
      "application/vnd.microsoft.portable-executable": {
        source: "iana"
      },
      "application/vnd.microsoft.windows.thumbnail-cache": {
        source: "iana"
      },
      "application/vnd.miele+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.mif": {
        source: "iana",
        extensions: ["mif"]
      },
      "application/vnd.minisoft-hp3000-save": {
        source: "iana"
      },
      "application/vnd.mitsubishi.misty-guard.trustweb": {
        source: "iana"
      },
      "application/vnd.mobius.daf": {
        source: "iana",
        extensions: ["daf"]
      },
      "application/vnd.mobius.dis": {
        source: "iana",
        extensions: ["dis"]
      },
      "application/vnd.mobius.mbk": {
        source: "iana",
        extensions: ["mbk"]
      },
      "application/vnd.mobius.mqy": {
        source: "iana",
        extensions: ["mqy"]
      },
      "application/vnd.mobius.msl": {
        source: "iana",
        extensions: ["msl"]
      },
      "application/vnd.mobius.plc": {
        source: "iana",
        extensions: ["plc"]
      },
      "application/vnd.mobius.txf": {
        source: "iana",
        extensions: ["txf"]
      },
      "application/vnd.mophun.application": {
        source: "iana",
        extensions: ["mpn"]
      },
      "application/vnd.mophun.certificate": {
        source: "iana",
        extensions: ["mpc"]
      },
      "application/vnd.motorola.flexsuite": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.adsi": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.fis": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.gotap": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.kmr": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.ttc": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.wem": {
        source: "iana"
      },
      "application/vnd.motorola.iprm": {
        source: "iana"
      },
      "application/vnd.mozilla.xul+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xul"]
      },
      "application/vnd.ms-3mfdocument": {
        source: "iana"
      },
      "application/vnd.ms-artgalry": {
        source: "iana",
        extensions: ["cil"]
      },
      "application/vnd.ms-asf": {
        source: "iana"
      },
      "application/vnd.ms-cab-compressed": {
        source: "iana",
        extensions: ["cab"]
      },
      "application/vnd.ms-color.iccprofile": {
        source: "apache"
      },
      "application/vnd.ms-excel": {
        source: "iana",
        compressible: false,
        extensions: ["xls", "xlm", "xla", "xlc", "xlt", "xlw"]
      },
      "application/vnd.ms-excel.addin.macroenabled.12": {
        source: "iana",
        extensions: ["xlam"]
      },
      "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
        source: "iana",
        extensions: ["xlsb"]
      },
      "application/vnd.ms-excel.sheet.macroenabled.12": {
        source: "iana",
        extensions: ["xlsm"]
      },
      "application/vnd.ms-excel.template.macroenabled.12": {
        source: "iana",
        extensions: ["xltm"]
      },
      "application/vnd.ms-fontobject": {
        source: "iana",
        compressible: true,
        extensions: ["eot"]
      },
      "application/vnd.ms-htmlhelp": {
        source: "iana",
        extensions: ["chm"]
      },
      "application/vnd.ms-ims": {
        source: "iana",
        extensions: ["ims"]
      },
      "application/vnd.ms-lrm": {
        source: "iana",
        extensions: ["lrm"]
      },
      "application/vnd.ms-office.activex+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-officetheme": {
        source: "iana",
        extensions: ["thmx"]
      },
      "application/vnd.ms-opentype": {
        source: "apache",
        compressible: true
      },
      "application/vnd.ms-outlook": {
        compressible: false,
        extensions: ["msg"]
      },
      "application/vnd.ms-package.obfuscated-opentype": {
        source: "apache"
      },
      "application/vnd.ms-pki.seccat": {
        source: "apache",
        extensions: ["cat"]
      },
      "application/vnd.ms-pki.stl": {
        source: "apache",
        extensions: ["stl"]
      },
      "application/vnd.ms-playready.initiator+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-powerpoint": {
        source: "iana",
        compressible: false,
        extensions: ["ppt", "pps", "pot"]
      },
      "application/vnd.ms-powerpoint.addin.macroenabled.12": {
        source: "iana",
        extensions: ["ppam"]
      },
      "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
        source: "iana",
        extensions: ["pptm"]
      },
      "application/vnd.ms-powerpoint.slide.macroenabled.12": {
        source: "iana",
        extensions: ["sldm"]
      },
      "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
        source: "iana",
        extensions: ["ppsm"]
      },
      "application/vnd.ms-powerpoint.template.macroenabled.12": {
        source: "iana",
        extensions: ["potm"]
      },
      "application/vnd.ms-printdevicecapabilities+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-printing.printticket+xml": {
        source: "apache",
        compressible: true
      },
      "application/vnd.ms-printschematicket+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-project": {
        source: "iana",
        extensions: ["mpp", "mpt"]
      },
      "application/vnd.ms-tnef": {
        source: "iana"
      },
      "application/vnd.ms-windows.devicepairing": {
        source: "iana"
      },
      "application/vnd.ms-windows.nwprinting.oob": {
        source: "iana"
      },
      "application/vnd.ms-windows.printerpairing": {
        source: "iana"
      },
      "application/vnd.ms-windows.wsd.oob": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.lic-chlg-req": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.lic-resp": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.meter-chlg-req": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.meter-resp": {
        source: "iana"
      },
      "application/vnd.ms-word.document.macroenabled.12": {
        source: "iana",
        extensions: ["docm"]
      },
      "application/vnd.ms-word.template.macroenabled.12": {
        source: "iana",
        extensions: ["dotm"]
      },
      "application/vnd.ms-works": {
        source: "iana",
        extensions: ["wps", "wks", "wcm", "wdb"]
      },
      "application/vnd.ms-wpl": {
        source: "iana",
        extensions: ["wpl"]
      },
      "application/vnd.ms-xpsdocument": {
        source: "iana",
        compressible: false,
        extensions: ["xps"]
      },
      "application/vnd.msa-disk-image": {
        source: "iana"
      },
      "application/vnd.mseq": {
        source: "iana",
        extensions: ["mseq"]
      },
      "application/vnd.msign": {
        source: "iana"
      },
      "application/vnd.multiad.creator": {
        source: "iana"
      },
      "application/vnd.multiad.creator.cif": {
        source: "iana"
      },
      "application/vnd.music-niff": {
        source: "iana"
      },
      "application/vnd.musician": {
        source: "iana",
        extensions: ["mus"]
      },
      "application/vnd.muvee.style": {
        source: "iana",
        extensions: ["msty"]
      },
      "application/vnd.mynfc": {
        source: "iana",
        extensions: ["taglet"]
      },
      "application/vnd.nacamar.ybrid+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ncd.control": {
        source: "iana"
      },
      "application/vnd.ncd.reference": {
        source: "iana"
      },
      "application/vnd.nearst.inv+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nebumind.line": {
        source: "iana"
      },
      "application/vnd.nervana": {
        source: "iana"
      },
      "application/vnd.netfpx": {
        source: "iana"
      },
      "application/vnd.neurolanguage.nlu": {
        source: "iana",
        extensions: ["nlu"]
      },
      "application/vnd.nimn": {
        source: "iana"
      },
      "application/vnd.nintendo.nitro.rom": {
        source: "iana"
      },
      "application/vnd.nintendo.snes.rom": {
        source: "iana"
      },
      "application/vnd.nitf": {
        source: "iana",
        extensions: ["ntf", "nitf"]
      },
      "application/vnd.noblenet-directory": {
        source: "iana",
        extensions: ["nnd"]
      },
      "application/vnd.noblenet-sealer": {
        source: "iana",
        extensions: ["nns"]
      },
      "application/vnd.noblenet-web": {
        source: "iana",
        extensions: ["nnw"]
      },
      "application/vnd.nokia.catalogs": {
        source: "iana"
      },
      "application/vnd.nokia.conml+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.conml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.iptv.config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.isds-radio-presets": {
        source: "iana"
      },
      "application/vnd.nokia.landmark+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.landmark+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.landmarkcollection+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.n-gage.ac+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ac"]
      },
      "application/vnd.nokia.n-gage.data": {
        source: "iana",
        extensions: ["ngdat"]
      },
      "application/vnd.nokia.n-gage.symbian.install": {
        source: "iana",
        extensions: ["n-gage"]
      },
      "application/vnd.nokia.ncd": {
        source: "iana"
      },
      "application/vnd.nokia.pcd+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.pcd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.radio-preset": {
        source: "iana",
        extensions: ["rpst"]
      },
      "application/vnd.nokia.radio-presets": {
        source: "iana",
        extensions: ["rpss"]
      },
      "application/vnd.novadigm.edm": {
        source: "iana",
        extensions: ["edm"]
      },
      "application/vnd.novadigm.edx": {
        source: "iana",
        extensions: ["edx"]
      },
      "application/vnd.novadigm.ext": {
        source: "iana",
        extensions: ["ext"]
      },
      "application/vnd.ntt-local.content-share": {
        source: "iana"
      },
      "application/vnd.ntt-local.file-transfer": {
        source: "iana"
      },
      "application/vnd.ntt-local.ogw_remote-access": {
        source: "iana"
      },
      "application/vnd.ntt-local.sip-ta_remote": {
        source: "iana"
      },
      "application/vnd.ntt-local.sip-ta_tcp_stream": {
        source: "iana"
      },
      "application/vnd.oasis.opendocument.chart": {
        source: "iana",
        extensions: ["odc"]
      },
      "application/vnd.oasis.opendocument.chart-template": {
        source: "iana",
        extensions: ["otc"]
      },
      "application/vnd.oasis.opendocument.database": {
        source: "iana",
        extensions: ["odb"]
      },
      "application/vnd.oasis.opendocument.formula": {
        source: "iana",
        extensions: ["odf"]
      },
      "application/vnd.oasis.opendocument.formula-template": {
        source: "iana",
        extensions: ["odft"]
      },
      "application/vnd.oasis.opendocument.graphics": {
        source: "iana",
        compressible: false,
        extensions: ["odg"]
      },
      "application/vnd.oasis.opendocument.graphics-template": {
        source: "iana",
        extensions: ["otg"]
      },
      "application/vnd.oasis.opendocument.image": {
        source: "iana",
        extensions: ["odi"]
      },
      "application/vnd.oasis.opendocument.image-template": {
        source: "iana",
        extensions: ["oti"]
      },
      "application/vnd.oasis.opendocument.presentation": {
        source: "iana",
        compressible: false,
        extensions: ["odp"]
      },
      "application/vnd.oasis.opendocument.presentation-template": {
        source: "iana",
        extensions: ["otp"]
      },
      "application/vnd.oasis.opendocument.spreadsheet": {
        source: "iana",
        compressible: false,
        extensions: ["ods"]
      },
      "application/vnd.oasis.opendocument.spreadsheet-template": {
        source: "iana",
        extensions: ["ots"]
      },
      "application/vnd.oasis.opendocument.text": {
        source: "iana",
        compressible: false,
        extensions: ["odt"]
      },
      "application/vnd.oasis.opendocument.text-master": {
        source: "iana",
        extensions: ["odm"]
      },
      "application/vnd.oasis.opendocument.text-template": {
        source: "iana",
        extensions: ["ott"]
      },
      "application/vnd.oasis.opendocument.text-web": {
        source: "iana",
        extensions: ["oth"]
      },
      "application/vnd.obn": {
        source: "iana"
      },
      "application/vnd.ocf+cbor": {
        source: "iana"
      },
      "application/vnd.oci.image.manifest.v1+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oftn.l10n+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.contentaccessdownload+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.contentaccessstreaming+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.cspg-hexbinary": {
        source: "iana"
      },
      "application/vnd.oipf.dae.svg+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.dae.xhtml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.mippvcontrolmessage+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.pae.gem": {
        source: "iana"
      },
      "application/vnd.oipf.spdiscovery+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.spdlist+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.ueprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.userprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.olpc-sugar": {
        source: "iana",
        extensions: ["xo"]
      },
      "application/vnd.oma-scws-config": {
        source: "iana"
      },
      "application/vnd.oma-scws-http-request": {
        source: "iana"
      },
      "application/vnd.oma-scws-http-response": {
        source: "iana"
      },
      "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.drm-trigger+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.imd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.ltkm": {
        source: "iana"
      },
      "application/vnd.oma.bcast.notification+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.provisioningtrigger": {
        source: "iana"
      },
      "application/vnd.oma.bcast.sgboot": {
        source: "iana"
      },
      "application/vnd.oma.bcast.sgdd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.sgdu": {
        source: "iana"
      },
      "application/vnd.oma.bcast.simple-symbol-container": {
        source: "iana"
      },
      "application/vnd.oma.bcast.smartcard-trigger+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.sprov+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.stkm": {
        source: "iana"
      },
      "application/vnd.oma.cab-address-book+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-feature-handler+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-pcc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-subs-invite+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-user-prefs+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.dcd": {
        source: "iana"
      },
      "application/vnd.oma.dcdc": {
        source: "iana"
      },
      "application/vnd.oma.dd2+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dd2"]
      },
      "application/vnd.oma.drm.risd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.group-usage-list+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.lwm2m+cbor": {
        source: "iana"
      },
      "application/vnd.oma.lwm2m+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.lwm2m+tlv": {
        source: "iana"
      },
      "application/vnd.oma.pal+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.detailed-progress-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.final-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.groups+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.invocation-descriptor+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.optimized-progress-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.push": {
        source: "iana"
      },
      "application/vnd.oma.scidm.messages+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.xcap-directory+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.omads-email+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omads-file+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omads-folder+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omaloc-supl-init": {
        source: "iana"
      },
      "application/vnd.onepager": {
        source: "iana"
      },
      "application/vnd.onepagertamp": {
        source: "iana"
      },
      "application/vnd.onepagertamx": {
        source: "iana"
      },
      "application/vnd.onepagertat": {
        source: "iana"
      },
      "application/vnd.onepagertatp": {
        source: "iana"
      },
      "application/vnd.onepagertatx": {
        source: "iana"
      },
      "application/vnd.openblox.game+xml": {
        source: "iana",
        compressible: true,
        extensions: ["obgx"]
      },
      "application/vnd.openblox.game-binary": {
        source: "iana"
      },
      "application/vnd.openeye.oeb": {
        source: "iana"
      },
      "application/vnd.openofficeorg.extension": {
        source: "apache",
        extensions: ["oxt"]
      },
      "application/vnd.openstreetmap.data+xml": {
        source: "iana",
        compressible: true,
        extensions: ["osm"]
      },
      "application/vnd.opentimestamps.ots": {
        source: "iana"
      },
      "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawing+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
        source: "iana",
        compressible: false,
        extensions: ["pptx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slide": {
        source: "iana",
        extensions: ["sldx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
        source: "iana",
        extensions: ["ppsx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.template": {
        source: "iana",
        extensions: ["potx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        source: "iana",
        compressible: false,
        extensions: ["xlsx"]
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
        source: "iana",
        extensions: ["xltx"]
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.theme+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.vmldrawing": {
        source: "iana"
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        source: "iana",
        compressible: false,
        extensions: ["docx"]
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
        source: "iana",
        extensions: ["dotx"]
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.core-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.relationships+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oracle.resource+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.orange.indata": {
        source: "iana"
      },
      "application/vnd.osa.netdeploy": {
        source: "iana"
      },
      "application/vnd.osgeo.mapguide.package": {
        source: "iana",
        extensions: ["mgp"]
      },
      "application/vnd.osgi.bundle": {
        source: "iana"
      },
      "application/vnd.osgi.dp": {
        source: "iana",
        extensions: ["dp"]
      },
      "application/vnd.osgi.subsystem": {
        source: "iana",
        extensions: ["esa"]
      },
      "application/vnd.otps.ct-kip+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oxli.countgraph": {
        source: "iana"
      },
      "application/vnd.pagerduty+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.palm": {
        source: "iana",
        extensions: ["pdb", "pqa", "oprc"]
      },
      "application/vnd.panoply": {
        source: "iana"
      },
      "application/vnd.paos.xml": {
        source: "iana"
      },
      "application/vnd.patentdive": {
        source: "iana"
      },
      "application/vnd.patientecommsdoc": {
        source: "iana"
      },
      "application/vnd.pawaafile": {
        source: "iana",
        extensions: ["paw"]
      },
      "application/vnd.pcos": {
        source: "iana"
      },
      "application/vnd.pg.format": {
        source: "iana",
        extensions: ["str"]
      },
      "application/vnd.pg.osasli": {
        source: "iana",
        extensions: ["ei6"]
      },
      "application/vnd.piaccess.application-licence": {
        source: "iana"
      },
      "application/vnd.picsel": {
        source: "iana",
        extensions: ["efif"]
      },
      "application/vnd.pmi.widget": {
        source: "iana",
        extensions: ["wg"]
      },
      "application/vnd.poc.group-advertisement+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.pocketlearn": {
        source: "iana",
        extensions: ["plf"]
      },
      "application/vnd.powerbuilder6": {
        source: "iana",
        extensions: ["pbd"]
      },
      "application/vnd.powerbuilder6-s": {
        source: "iana"
      },
      "application/vnd.powerbuilder7": {
        source: "iana"
      },
      "application/vnd.powerbuilder7-s": {
        source: "iana"
      },
      "application/vnd.powerbuilder75": {
        source: "iana"
      },
      "application/vnd.powerbuilder75-s": {
        source: "iana"
      },
      "application/vnd.preminet": {
        source: "iana"
      },
      "application/vnd.previewsystems.box": {
        source: "iana",
        extensions: ["box"]
      },
      "application/vnd.proteus.magazine": {
        source: "iana",
        extensions: ["mgz"]
      },
      "application/vnd.psfs": {
        source: "iana"
      },
      "application/vnd.publishare-delta-tree": {
        source: "iana",
        extensions: ["qps"]
      },
      "application/vnd.pvi.ptid1": {
        source: "iana",
        extensions: ["ptid"]
      },
      "application/vnd.pwg-multiplexed": {
        source: "iana"
      },
      "application/vnd.pwg-xhtml-print+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.qualcomm.brew-app-res": {
        source: "iana"
      },
      "application/vnd.quarantainenet": {
        source: "iana"
      },
      "application/vnd.quark.quarkxpress": {
        source: "iana",
        extensions: ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"]
      },
      "application/vnd.quobject-quoxdocument": {
        source: "iana"
      },
      "application/vnd.radisys.moml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-conf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-conn+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-dialog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-stream+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-conf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-base+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-fax-detect+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-group+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-speech+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-transform+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.rainstor.data": {
        source: "iana"
      },
      "application/vnd.rapid": {
        source: "iana"
      },
      "application/vnd.rar": {
        source: "iana",
        extensions: ["rar"]
      },
      "application/vnd.realvnc.bed": {
        source: "iana",
        extensions: ["bed"]
      },
      "application/vnd.recordare.musicxml": {
        source: "iana",
        extensions: ["mxl"]
      },
      "application/vnd.recordare.musicxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["musicxml"]
      },
      "application/vnd.renlearn.rlprint": {
        source: "iana"
      },
      "application/vnd.resilient.logic": {
        source: "iana"
      },
      "application/vnd.restful+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.rig.cryptonote": {
        source: "iana",
        extensions: ["cryptonote"]
      },
      "application/vnd.rim.cod": {
        source: "apache",
        extensions: ["cod"]
      },
      "application/vnd.rn-realmedia": {
        source: "apache",
        extensions: ["rm"]
      },
      "application/vnd.rn-realmedia-vbr": {
        source: "apache",
        extensions: ["rmvb"]
      },
      "application/vnd.route66.link66+xml": {
        source: "iana",
        compressible: true,
        extensions: ["link66"]
      },
      "application/vnd.rs-274x": {
        source: "iana"
      },
      "application/vnd.ruckus.download": {
        source: "iana"
      },
      "application/vnd.s3sms": {
        source: "iana"
      },
      "application/vnd.sailingtracker.track": {
        source: "iana",
        extensions: ["st"]
      },
      "application/vnd.sar": {
        source: "iana"
      },
      "application/vnd.sbm.cid": {
        source: "iana"
      },
      "application/vnd.sbm.mid2": {
        source: "iana"
      },
      "application/vnd.scribus": {
        source: "iana"
      },
      "application/vnd.sealed.3df": {
        source: "iana"
      },
      "application/vnd.sealed.csf": {
        source: "iana"
      },
      "application/vnd.sealed.doc": {
        source: "iana"
      },
      "application/vnd.sealed.eml": {
        source: "iana"
      },
      "application/vnd.sealed.mht": {
        source: "iana"
      },
      "application/vnd.sealed.net": {
        source: "iana"
      },
      "application/vnd.sealed.ppt": {
        source: "iana"
      },
      "application/vnd.sealed.tiff": {
        source: "iana"
      },
      "application/vnd.sealed.xls": {
        source: "iana"
      },
      "application/vnd.sealedmedia.softseal.html": {
        source: "iana"
      },
      "application/vnd.sealedmedia.softseal.pdf": {
        source: "iana"
      },
      "application/vnd.seemail": {
        source: "iana",
        extensions: ["see"]
      },
      "application/vnd.seis+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.sema": {
        source: "iana",
        extensions: ["sema"]
      },
      "application/vnd.semd": {
        source: "iana",
        extensions: ["semd"]
      },
      "application/vnd.semf": {
        source: "iana",
        extensions: ["semf"]
      },
      "application/vnd.shade-save-file": {
        source: "iana"
      },
      "application/vnd.shana.informed.formdata": {
        source: "iana",
        extensions: ["ifm"]
      },
      "application/vnd.shana.informed.formtemplate": {
        source: "iana",
        extensions: ["itp"]
      },
      "application/vnd.shana.informed.interchange": {
        source: "iana",
        extensions: ["iif"]
      },
      "application/vnd.shana.informed.package": {
        source: "iana",
        extensions: ["ipk"]
      },
      "application/vnd.shootproof+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.shopkick+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.shp": {
        source: "iana"
      },
      "application/vnd.shx": {
        source: "iana"
      },
      "application/vnd.sigrok.session": {
        source: "iana"
      },
      "application/vnd.simtech-mindmapper": {
        source: "iana",
        extensions: ["twd", "twds"]
      },
      "application/vnd.siren+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.smaf": {
        source: "iana",
        extensions: ["mmf"]
      },
      "application/vnd.smart.notebook": {
        source: "iana"
      },
      "application/vnd.smart.teacher": {
        source: "iana",
        extensions: ["teacher"]
      },
      "application/vnd.snesdev-page-table": {
        source: "iana"
      },
      "application/vnd.software602.filler.form+xml": {
        source: "iana",
        compressible: true,
        extensions: ["fo"]
      },
      "application/vnd.software602.filler.form-xml-zip": {
        source: "iana"
      },
      "application/vnd.solent.sdkm+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sdkm", "sdkd"]
      },
      "application/vnd.spotfire.dxp": {
        source: "iana",
        extensions: ["dxp"]
      },
      "application/vnd.spotfire.sfs": {
        source: "iana",
        extensions: ["sfs"]
      },
      "application/vnd.sqlite3": {
        source: "iana"
      },
      "application/vnd.sss-cod": {
        source: "iana"
      },
      "application/vnd.sss-dtf": {
        source: "iana"
      },
      "application/vnd.sss-ntf": {
        source: "iana"
      },
      "application/vnd.stardivision.calc": {
        source: "apache",
        extensions: ["sdc"]
      },
      "application/vnd.stardivision.draw": {
        source: "apache",
        extensions: ["sda"]
      },
      "application/vnd.stardivision.impress": {
        source: "apache",
        extensions: ["sdd"]
      },
      "application/vnd.stardivision.math": {
        source: "apache",
        extensions: ["smf"]
      },
      "application/vnd.stardivision.writer": {
        source: "apache",
        extensions: ["sdw", "vor"]
      },
      "application/vnd.stardivision.writer-global": {
        source: "apache",
        extensions: ["sgl"]
      },
      "application/vnd.stepmania.package": {
        source: "iana",
        extensions: ["smzip"]
      },
      "application/vnd.stepmania.stepchart": {
        source: "iana",
        extensions: ["sm"]
      },
      "application/vnd.street-stream": {
        source: "iana"
      },
      "application/vnd.sun.wadl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wadl"]
      },
      "application/vnd.sun.xml.calc": {
        source: "apache",
        extensions: ["sxc"]
      },
      "application/vnd.sun.xml.calc.template": {
        source: "apache",
        extensions: ["stc"]
      },
      "application/vnd.sun.xml.draw": {
        source: "apache",
        extensions: ["sxd"]
      },
      "application/vnd.sun.xml.draw.template": {
        source: "apache",
        extensions: ["std"]
      },
      "application/vnd.sun.xml.impress": {
        source: "apache",
        extensions: ["sxi"]
      },
      "application/vnd.sun.xml.impress.template": {
        source: "apache",
        extensions: ["sti"]
      },
      "application/vnd.sun.xml.math": {
        source: "apache",
        extensions: ["sxm"]
      },
      "application/vnd.sun.xml.writer": {
        source: "apache",
        extensions: ["sxw"]
      },
      "application/vnd.sun.xml.writer.global": {
        source: "apache",
        extensions: ["sxg"]
      },
      "application/vnd.sun.xml.writer.template": {
        source: "apache",
        extensions: ["stw"]
      },
      "application/vnd.sus-calendar": {
        source: "iana",
        extensions: ["sus", "susp"]
      },
      "application/vnd.svd": {
        source: "iana",
        extensions: ["svd"]
      },
      "application/vnd.swiftview-ics": {
        source: "iana"
      },
      "application/vnd.sycle+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.syft+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.symbian.install": {
        source: "apache",
        extensions: ["sis", "sisx"]
      },
      "application/vnd.syncml+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["xsm"]
      },
      "application/vnd.syncml.dm+wbxml": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["bdm"]
      },
      "application/vnd.syncml.dm+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["xdm"]
      },
      "application/vnd.syncml.dm.notification": {
        source: "iana"
      },
      "application/vnd.syncml.dmddf+wbxml": {
        source: "iana"
      },
      "application/vnd.syncml.dmddf+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["ddf"]
      },
      "application/vnd.syncml.dmtnds+wbxml": {
        source: "iana"
      },
      "application/vnd.syncml.dmtnds+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.syncml.ds.notification": {
        source: "iana"
      },
      "application/vnd.tableschema+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tao.intent-module-archive": {
        source: "iana",
        extensions: ["tao"]
      },
      "application/vnd.tcpdump.pcap": {
        source: "iana",
        extensions: ["pcap", "cap", "dmp"]
      },
      "application/vnd.think-cell.ppttc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tmd.mediaflex.api+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tml": {
        source: "iana"
      },
      "application/vnd.tmobile-livetv": {
        source: "iana",
        extensions: ["tmo"]
      },
      "application/vnd.tri.onesource": {
        source: "iana"
      },
      "application/vnd.trid.tpt": {
        source: "iana",
        extensions: ["tpt"]
      },
      "application/vnd.triscape.mxs": {
        source: "iana",
        extensions: ["mxs"]
      },
      "application/vnd.trueapp": {
        source: "iana",
        extensions: ["tra"]
      },
      "application/vnd.truedoc": {
        source: "iana"
      },
      "application/vnd.ubisoft.webplayer": {
        source: "iana"
      },
      "application/vnd.ufdl": {
        source: "iana",
        extensions: ["ufd", "ufdl"]
      },
      "application/vnd.uiq.theme": {
        source: "iana",
        extensions: ["utz"]
      },
      "application/vnd.umajin": {
        source: "iana",
        extensions: ["umj"]
      },
      "application/vnd.unity": {
        source: "iana",
        extensions: ["unityweb"]
      },
      "application/vnd.uoml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["uoml"]
      },
      "application/vnd.uplanet.alert": {
        source: "iana"
      },
      "application/vnd.uplanet.alert-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.bearer-choice": {
        source: "iana"
      },
      "application/vnd.uplanet.bearer-choice-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.cacheop": {
        source: "iana"
      },
      "application/vnd.uplanet.cacheop-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.channel": {
        source: "iana"
      },
      "application/vnd.uplanet.channel-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.list": {
        source: "iana"
      },
      "application/vnd.uplanet.list-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.listcmd": {
        source: "iana"
      },
      "application/vnd.uplanet.listcmd-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.signal": {
        source: "iana"
      },
      "application/vnd.uri-map": {
        source: "iana"
      },
      "application/vnd.valve.source.material": {
        source: "iana"
      },
      "application/vnd.vcx": {
        source: "iana",
        extensions: ["vcx"]
      },
      "application/vnd.vd-study": {
        source: "iana"
      },
      "application/vnd.vectorworks": {
        source: "iana"
      },
      "application/vnd.vel+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.verimatrix.vcas": {
        source: "iana"
      },
      "application/vnd.veritone.aion+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.veryant.thin": {
        source: "iana"
      },
      "application/vnd.ves.encrypted": {
        source: "iana"
      },
      "application/vnd.vidsoft.vidconference": {
        source: "iana"
      },
      "application/vnd.visio": {
        source: "iana",
        extensions: ["vsd", "vst", "vss", "vsw"]
      },
      "application/vnd.visionary": {
        source: "iana",
        extensions: ["vis"]
      },
      "application/vnd.vividence.scriptfile": {
        source: "iana"
      },
      "application/vnd.vsf": {
        source: "iana",
        extensions: ["vsf"]
      },
      "application/vnd.wap.sic": {
        source: "iana"
      },
      "application/vnd.wap.slc": {
        source: "iana"
      },
      "application/vnd.wap.wbxml": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["wbxml"]
      },
      "application/vnd.wap.wmlc": {
        source: "iana",
        extensions: ["wmlc"]
      },
      "application/vnd.wap.wmlscriptc": {
        source: "iana",
        extensions: ["wmlsc"]
      },
      "application/vnd.webturbo": {
        source: "iana",
        extensions: ["wtb"]
      },
      "application/vnd.wfa.dpp": {
        source: "iana"
      },
      "application/vnd.wfa.p2p": {
        source: "iana"
      },
      "application/vnd.wfa.wsc": {
        source: "iana"
      },
      "application/vnd.windows.devicepairing": {
        source: "iana"
      },
      "application/vnd.wmc": {
        source: "iana"
      },
      "application/vnd.wmf.bootstrap": {
        source: "iana"
      },
      "application/vnd.wolfram.mathematica": {
        source: "iana"
      },
      "application/vnd.wolfram.mathematica.package": {
        source: "iana"
      },
      "application/vnd.wolfram.player": {
        source: "iana",
        extensions: ["nbp"]
      },
      "application/vnd.wordperfect": {
        source: "iana",
        extensions: ["wpd"]
      },
      "application/vnd.wqd": {
        source: "iana",
        extensions: ["wqd"]
      },
      "application/vnd.wrq-hp3000-labelled": {
        source: "iana"
      },
      "application/vnd.wt.stf": {
        source: "iana",
        extensions: ["stf"]
      },
      "application/vnd.wv.csp+wbxml": {
        source: "iana"
      },
      "application/vnd.wv.csp+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.wv.ssp+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xacml+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xara": {
        source: "iana",
        extensions: ["xar"]
      },
      "application/vnd.xfdl": {
        source: "iana",
        extensions: ["xfdl"]
      },
      "application/vnd.xfdl.webform": {
        source: "iana"
      },
      "application/vnd.xmi+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xmpie.cpkg": {
        source: "iana"
      },
      "application/vnd.xmpie.dpkg": {
        source: "iana"
      },
      "application/vnd.xmpie.plan": {
        source: "iana"
      },
      "application/vnd.xmpie.ppkg": {
        source: "iana"
      },
      "application/vnd.xmpie.xlim": {
        source: "iana"
      },
      "application/vnd.yamaha.hv-dic": {
        source: "iana",
        extensions: ["hvd"]
      },
      "application/vnd.yamaha.hv-script": {
        source: "iana",
        extensions: ["hvs"]
      },
      "application/vnd.yamaha.hv-voice": {
        source: "iana",
        extensions: ["hvp"]
      },
      "application/vnd.yamaha.openscoreformat": {
        source: "iana",
        extensions: ["osf"]
      },
      "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
        source: "iana",
        compressible: true,
        extensions: ["osfpvg"]
      },
      "application/vnd.yamaha.remote-setup": {
        source: "iana"
      },
      "application/vnd.yamaha.smaf-audio": {
        source: "iana",
        extensions: ["saf"]
      },
      "application/vnd.yamaha.smaf-phrase": {
        source: "iana",
        extensions: ["spf"]
      },
      "application/vnd.yamaha.through-ngn": {
        source: "iana"
      },
      "application/vnd.yamaha.tunnel-udpencap": {
        source: "iana"
      },
      "application/vnd.yaoweme": {
        source: "iana"
      },
      "application/vnd.yellowriver-custom-menu": {
        source: "iana",
        extensions: ["cmp"]
      },
      "application/vnd.youtube.yt": {
        source: "iana"
      },
      "application/vnd.zul": {
        source: "iana",
        extensions: ["zir", "zirz"]
      },
      "application/vnd.zzazz.deck+xml": {
        source: "iana",
        compressible: true,
        extensions: ["zaz"]
      },
      "application/voicexml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["vxml"]
      },
      "application/voucher-cms+json": {
        source: "iana",
        compressible: true
      },
      "application/vq-rtcpxr": {
        source: "iana"
      },
      "application/wasm": {
        source: "iana",
        compressible: true,
        extensions: ["wasm"]
      },
      "application/watcherinfo+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wif"]
      },
      "application/webpush-options+json": {
        source: "iana",
        compressible: true
      },
      "application/whoispp-query": {
        source: "iana"
      },
      "application/whoispp-response": {
        source: "iana"
      },
      "application/widget": {
        source: "iana",
        extensions: ["wgt"]
      },
      "application/winhlp": {
        source: "apache",
        extensions: ["hlp"]
      },
      "application/wita": {
        source: "iana"
      },
      "application/wordperfect5.1": {
        source: "iana"
      },
      "application/wsdl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wsdl"]
      },
      "application/wspolicy+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wspolicy"]
      },
      "application/x-7z-compressed": {
        source: "apache",
        compressible: false,
        extensions: ["7z"]
      },
      "application/x-abiword": {
        source: "apache",
        extensions: ["abw"]
      },
      "application/x-ace-compressed": {
        source: "apache",
        extensions: ["ace"]
      },
      "application/x-amf": {
        source: "apache"
      },
      "application/x-apple-diskimage": {
        source: "apache",
        extensions: ["dmg"]
      },
      "application/x-arj": {
        compressible: false,
        extensions: ["arj"]
      },
      "application/x-authorware-bin": {
        source: "apache",
        extensions: ["aab", "x32", "u32", "vox"]
      },
      "application/x-authorware-map": {
        source: "apache",
        extensions: ["aam"]
      },
      "application/x-authorware-seg": {
        source: "apache",
        extensions: ["aas"]
      },
      "application/x-bcpio": {
        source: "apache",
        extensions: ["bcpio"]
      },
      "application/x-bdoc": {
        compressible: false,
        extensions: ["bdoc"]
      },
      "application/x-bittorrent": {
        source: "apache",
        extensions: ["torrent"]
      },
      "application/x-blorb": {
        source: "apache",
        extensions: ["blb", "blorb"]
      },
      "application/x-bzip": {
        source: "apache",
        compressible: false,
        extensions: ["bz"]
      },
      "application/x-bzip2": {
        source: "apache",
        compressible: false,
        extensions: ["bz2", "boz"]
      },
      "application/x-cbr": {
        source: "apache",
        extensions: ["cbr", "cba", "cbt", "cbz", "cb7"]
      },
      "application/x-cdlink": {
        source: "apache",
        extensions: ["vcd"]
      },
      "application/x-cfs-compressed": {
        source: "apache",
        extensions: ["cfs"]
      },
      "application/x-chat": {
        source: "apache",
        extensions: ["chat"]
      },
      "application/x-chess-pgn": {
        source: "apache",
        extensions: ["pgn"]
      },
      "application/x-chrome-extension": {
        extensions: ["crx"]
      },
      "application/x-cocoa": {
        source: "nginx",
        extensions: ["cco"]
      },
      "application/x-compress": {
        source: "apache"
      },
      "application/x-conference": {
        source: "apache",
        extensions: ["nsc"]
      },
      "application/x-cpio": {
        source: "apache",
        extensions: ["cpio"]
      },
      "application/x-csh": {
        source: "apache",
        extensions: ["csh"]
      },
      "application/x-deb": {
        compressible: false
      },
      "application/x-debian-package": {
        source: "apache",
        extensions: ["deb", "udeb"]
      },
      "application/x-dgc-compressed": {
        source: "apache",
        extensions: ["dgc"]
      },
      "application/x-director": {
        source: "apache",
        extensions: ["dir", "dcr", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"]
      },
      "application/x-doom": {
        source: "apache",
        extensions: ["wad"]
      },
      "application/x-dtbncx+xml": {
        source: "apache",
        compressible: true,
        extensions: ["ncx"]
      },
      "application/x-dtbook+xml": {
        source: "apache",
        compressible: true,
        extensions: ["dtb"]
      },
      "application/x-dtbresource+xml": {
        source: "apache",
        compressible: true,
        extensions: ["res"]
      },
      "application/x-dvi": {
        source: "apache",
        compressible: false,
        extensions: ["dvi"]
      },
      "application/x-envoy": {
        source: "apache",
        extensions: ["evy"]
      },
      "application/x-eva": {
        source: "apache",
        extensions: ["eva"]
      },
      "application/x-font-bdf": {
        source: "apache",
        extensions: ["bdf"]
      },
      "application/x-font-dos": {
        source: "apache"
      },
      "application/x-font-framemaker": {
        source: "apache"
      },
      "application/x-font-ghostscript": {
        source: "apache",
        extensions: ["gsf"]
      },
      "application/x-font-libgrx": {
        source: "apache"
      },
      "application/x-font-linux-psf": {
        source: "apache",
        extensions: ["psf"]
      },
      "application/x-font-pcf": {
        source: "apache",
        extensions: ["pcf"]
      },
      "application/x-font-snf": {
        source: "apache",
        extensions: ["snf"]
      },
      "application/x-font-speedo": {
        source: "apache"
      },
      "application/x-font-sunos-news": {
        source: "apache"
      },
      "application/x-font-type1": {
        source: "apache",
        extensions: ["pfa", "pfb", "pfm", "afm"]
      },
      "application/x-font-vfont": {
        source: "apache"
      },
      "application/x-freearc": {
        source: "apache",
        extensions: ["arc"]
      },
      "application/x-futuresplash": {
        source: "apache",
        extensions: ["spl"]
      },
      "application/x-gca-compressed": {
        source: "apache",
        extensions: ["gca"]
      },
      "application/x-glulx": {
        source: "apache",
        extensions: ["ulx"]
      },
      "application/x-gnumeric": {
        source: "apache",
        extensions: ["gnumeric"]
      },
      "application/x-gramps-xml": {
        source: "apache",
        extensions: ["gramps"]
      },
      "application/x-gtar": {
        source: "apache",
        extensions: ["gtar"]
      },
      "application/x-gzip": {
        source: "apache"
      },
      "application/x-hdf": {
        source: "apache",
        extensions: ["hdf"]
      },
      "application/x-httpd-php": {
        compressible: true,
        extensions: ["php"]
      },
      "application/x-install-instructions": {
        source: "apache",
        extensions: ["install"]
      },
      "application/x-iso9660-image": {
        source: "apache",
        extensions: ["iso"]
      },
      "application/x-iwork-keynote-sffkey": {
        extensions: ["key"]
      },
      "application/x-iwork-numbers-sffnumbers": {
        extensions: ["numbers"]
      },
      "application/x-iwork-pages-sffpages": {
        extensions: ["pages"]
      },
      "application/x-java-archive-diff": {
        source: "nginx",
        extensions: ["jardiff"]
      },
      "application/x-java-jnlp-file": {
        source: "apache",
        compressible: false,
        extensions: ["jnlp"]
      },
      "application/x-javascript": {
        compressible: true
      },
      "application/x-keepass2": {
        extensions: ["kdbx"]
      },
      "application/x-latex": {
        source: "apache",
        compressible: false,
        extensions: ["latex"]
      },
      "application/x-lua-bytecode": {
        extensions: ["luac"]
      },
      "application/x-lzh-compressed": {
        source: "apache",
        extensions: ["lzh", "lha"]
      },
      "application/x-makeself": {
        source: "nginx",
        extensions: ["run"]
      },
      "application/x-mie": {
        source: "apache",
        extensions: ["mie"]
      },
      "application/x-mobipocket-ebook": {
        source: "apache",
        extensions: ["prc", "mobi"]
      },
      "application/x-mpegurl": {
        compressible: false
      },
      "application/x-ms-application": {
        source: "apache",
        extensions: ["application"]
      },
      "application/x-ms-shortcut": {
        source: "apache",
        extensions: ["lnk"]
      },
      "application/x-ms-wmd": {
        source: "apache",
        extensions: ["wmd"]
      },
      "application/x-ms-wmz": {
        source: "apache",
        extensions: ["wmz"]
      },
      "application/x-ms-xbap": {
        source: "apache",
        extensions: ["xbap"]
      },
      "application/x-msaccess": {
        source: "apache",
        extensions: ["mdb"]
      },
      "application/x-msbinder": {
        source: "apache",
        extensions: ["obd"]
      },
      "application/x-mscardfile": {
        source: "apache",
        extensions: ["crd"]
      },
      "application/x-msclip": {
        source: "apache",
        extensions: ["clp"]
      },
      "application/x-msdos-program": {
        extensions: ["exe"]
      },
      "application/x-msdownload": {
        source: "apache",
        extensions: ["exe", "dll", "com", "bat", "msi"]
      },
      "application/x-msmediaview": {
        source: "apache",
        extensions: ["mvb", "m13", "m14"]
      },
      "application/x-msmetafile": {
        source: "apache",
        extensions: ["wmf", "wmz", "emf", "emz"]
      },
      "application/x-msmoney": {
        source: "apache",
        extensions: ["mny"]
      },
      "application/x-mspublisher": {
        source: "apache",
        extensions: ["pub"]
      },
      "application/x-msschedule": {
        source: "apache",
        extensions: ["scd"]
      },
      "application/x-msterminal": {
        source: "apache",
        extensions: ["trm"]
      },
      "application/x-mswrite": {
        source: "apache",
        extensions: ["wri"]
      },
      "application/x-netcdf": {
        source: "apache",
        extensions: ["nc", "cdf"]
      },
      "application/x-ns-proxy-autoconfig": {
        compressible: true,
        extensions: ["pac"]
      },
      "application/x-nzb": {
        source: "apache",
        extensions: ["nzb"]
      },
      "application/x-perl": {
        source: "nginx",
        extensions: ["pl", "pm"]
      },
      "application/x-pilot": {
        source: "nginx",
        extensions: ["prc", "pdb"]
      },
      "application/x-pkcs12": {
        source: "apache",
        compressible: false,
        extensions: ["p12", "pfx"]
      },
      "application/x-pkcs7-certificates": {
        source: "apache",
        extensions: ["p7b", "spc"]
      },
      "application/x-pkcs7-certreqresp": {
        source: "apache",
        extensions: ["p7r"]
      },
      "application/x-pki-message": {
        source: "iana"
      },
      "application/x-rar-compressed": {
        source: "apache",
        compressible: false,
        extensions: ["rar"]
      },
      "application/x-redhat-package-manager": {
        source: "nginx",
        extensions: ["rpm"]
      },
      "application/x-research-info-systems": {
        source: "apache",
        extensions: ["ris"]
      },
      "application/x-sea": {
        source: "nginx",
        extensions: ["sea"]
      },
      "application/x-sh": {
        source: "apache",
        compressible: true,
        extensions: ["sh"]
      },
      "application/x-shar": {
        source: "apache",
        extensions: ["shar"]
      },
      "application/x-shockwave-flash": {
        source: "apache",
        compressible: false,
        extensions: ["swf"]
      },
      "application/x-silverlight-app": {
        source: "apache",
        extensions: ["xap"]
      },
      "application/x-sql": {
        source: "apache",
        extensions: ["sql"]
      },
      "application/x-stuffit": {
        source: "apache",
        compressible: false,
        extensions: ["sit"]
      },
      "application/x-stuffitx": {
        source: "apache",
        extensions: ["sitx"]
      },
      "application/x-subrip": {
        source: "apache",
        extensions: ["srt"]
      },
      "application/x-sv4cpio": {
        source: "apache",
        extensions: ["sv4cpio"]
      },
      "application/x-sv4crc": {
        source: "apache",
        extensions: ["sv4crc"]
      },
      "application/x-t3vm-image": {
        source: "apache",
        extensions: ["t3"]
      },
      "application/x-tads": {
        source: "apache",
        extensions: ["gam"]
      },
      "application/x-tar": {
        source: "apache",
        compressible: true,
        extensions: ["tar"]
      },
      "application/x-tcl": {
        source: "apache",
        extensions: ["tcl", "tk"]
      },
      "application/x-tex": {
        source: "apache",
        extensions: ["tex"]
      },
      "application/x-tex-tfm": {
        source: "apache",
        extensions: ["tfm"]
      },
      "application/x-texinfo": {
        source: "apache",
        extensions: ["texinfo", "texi"]
      },
      "application/x-tgif": {
        source: "apache",
        extensions: ["obj"]
      },
      "application/x-ustar": {
        source: "apache",
        extensions: ["ustar"]
      },
      "application/x-virtualbox-hdd": {
        compressible: true,
        extensions: ["hdd"]
      },
      "application/x-virtualbox-ova": {
        compressible: true,
        extensions: ["ova"]
      },
      "application/x-virtualbox-ovf": {
        compressible: true,
        extensions: ["ovf"]
      },
      "application/x-virtualbox-vbox": {
        compressible: true,
        extensions: ["vbox"]
      },
      "application/x-virtualbox-vbox-extpack": {
        compressible: false,
        extensions: ["vbox-extpack"]
      },
      "application/x-virtualbox-vdi": {
        compressible: true,
        extensions: ["vdi"]
      },
      "application/x-virtualbox-vhd": {
        compressible: true,
        extensions: ["vhd"]
      },
      "application/x-virtualbox-vmdk": {
        compressible: true,
        extensions: ["vmdk"]
      },
      "application/x-wais-source": {
        source: "apache",
        extensions: ["src"]
      },
      "application/x-web-app-manifest+json": {
        compressible: true,
        extensions: ["webapp"]
      },
      "application/x-www-form-urlencoded": {
        source: "iana",
        compressible: true
      },
      "application/x-x509-ca-cert": {
        source: "iana",
        extensions: ["der", "crt", "pem"]
      },
      "application/x-x509-ca-ra-cert": {
        source: "iana"
      },
      "application/x-x509-next-ca-cert": {
        source: "iana"
      },
      "application/x-xfig": {
        source: "apache",
        extensions: ["fig"]
      },
      "application/x-xliff+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xlf"]
      },
      "application/x-xpinstall": {
        source: "apache",
        compressible: false,
        extensions: ["xpi"]
      },
      "application/x-xz": {
        source: "apache",
        extensions: ["xz"]
      },
      "application/x-zmachine": {
        source: "apache",
        extensions: ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"]
      },
      "application/x400-bp": {
        source: "iana"
      },
      "application/xacml+xml": {
        source: "iana",
        compressible: true
      },
      "application/xaml+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xaml"]
      },
      "application/xcap-att+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xav"]
      },
      "application/xcap-caps+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xca"]
      },
      "application/xcap-diff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdf"]
      },
      "application/xcap-el+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xel"]
      },
      "application/xcap-error+xml": {
        source: "iana",
        compressible: true
      },
      "application/xcap-ns+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xns"]
      },
      "application/xcon-conference-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/xcon-conference-info-diff+xml": {
        source: "iana",
        compressible: true
      },
      "application/xenc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xenc"]
      },
      "application/xhtml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xhtml", "xht"]
      },
      "application/xhtml-voice+xml": {
        source: "apache",
        compressible: true
      },
      "application/xliff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xlf"]
      },
      "application/xml": {
        source: "iana",
        compressible: true,
        extensions: ["xml", "xsl", "xsd", "rng"]
      },
      "application/xml-dtd": {
        source: "iana",
        compressible: true,
        extensions: ["dtd"]
      },
      "application/xml-external-parsed-entity": {
        source: "iana"
      },
      "application/xml-patch+xml": {
        source: "iana",
        compressible: true
      },
      "application/xmpp+xml": {
        source: "iana",
        compressible: true
      },
      "application/xop+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xop"]
      },
      "application/xproc+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xpl"]
      },
      "application/xslt+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xsl", "xslt"]
      },
      "application/xspf+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xspf"]
      },
      "application/xv+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mxml", "xhvml", "xvml", "xvm"]
      },
      "application/yang": {
        source: "iana",
        extensions: ["yang"]
      },
      "application/yang-data+json": {
        source: "iana",
        compressible: true
      },
      "application/yang-data+xml": {
        source: "iana",
        compressible: true
      },
      "application/yang-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/yang-patch+xml": {
        source: "iana",
        compressible: true
      },
      "application/yin+xml": {
        source: "iana",
        compressible: true,
        extensions: ["yin"]
      },
      "application/zip": {
        source: "iana",
        compressible: false,
        extensions: ["zip"]
      },
      "application/zlib": {
        source: "iana"
      },
      "application/zstd": {
        source: "iana"
      },
      "audio/1d-interleaved-parityfec": {
        source: "iana"
      },
      "audio/32kadpcm": {
        source: "iana"
      },
      "audio/3gpp": {
        source: "iana",
        compressible: false,
        extensions: ["3gpp"]
      },
      "audio/3gpp2": {
        source: "iana"
      },
      "audio/aac": {
        source: "iana"
      },
      "audio/ac3": {
        source: "iana"
      },
      "audio/adpcm": {
        source: "apache",
        extensions: ["adp"]
      },
      "audio/amr": {
        source: "iana",
        extensions: ["amr"]
      },
      "audio/amr-wb": {
        source: "iana"
      },
      "audio/amr-wb+": {
        source: "iana"
      },
      "audio/aptx": {
        source: "iana"
      },
      "audio/asc": {
        source: "iana"
      },
      "audio/atrac-advanced-lossless": {
        source: "iana"
      },
      "audio/atrac-x": {
        source: "iana"
      },
      "audio/atrac3": {
        source: "iana"
      },
      "audio/basic": {
        source: "iana",
        compressible: false,
        extensions: ["au", "snd"]
      },
      "audio/bv16": {
        source: "iana"
      },
      "audio/bv32": {
        source: "iana"
      },
      "audio/clearmode": {
        source: "iana"
      },
      "audio/cn": {
        source: "iana"
      },
      "audio/dat12": {
        source: "iana"
      },
      "audio/dls": {
        source: "iana"
      },
      "audio/dsr-es201108": {
        source: "iana"
      },
      "audio/dsr-es202050": {
        source: "iana"
      },
      "audio/dsr-es202211": {
        source: "iana"
      },
      "audio/dsr-es202212": {
        source: "iana"
      },
      "audio/dv": {
        source: "iana"
      },
      "audio/dvi4": {
        source: "iana"
      },
      "audio/eac3": {
        source: "iana"
      },
      "audio/encaprtp": {
        source: "iana"
      },
      "audio/evrc": {
        source: "iana"
      },
      "audio/evrc-qcp": {
        source: "iana"
      },
      "audio/evrc0": {
        source: "iana"
      },
      "audio/evrc1": {
        source: "iana"
      },
      "audio/evrcb": {
        source: "iana"
      },
      "audio/evrcb0": {
        source: "iana"
      },
      "audio/evrcb1": {
        source: "iana"
      },
      "audio/evrcnw": {
        source: "iana"
      },
      "audio/evrcnw0": {
        source: "iana"
      },
      "audio/evrcnw1": {
        source: "iana"
      },
      "audio/evrcwb": {
        source: "iana"
      },
      "audio/evrcwb0": {
        source: "iana"
      },
      "audio/evrcwb1": {
        source: "iana"
      },
      "audio/evs": {
        source: "iana"
      },
      "audio/flexfec": {
        source: "iana"
      },
      "audio/fwdred": {
        source: "iana"
      },
      "audio/g711-0": {
        source: "iana"
      },
      "audio/g719": {
        source: "iana"
      },
      "audio/g722": {
        source: "iana"
      },
      "audio/g7221": {
        source: "iana"
      },
      "audio/g723": {
        source: "iana"
      },
      "audio/g726-16": {
        source: "iana"
      },
      "audio/g726-24": {
        source: "iana"
      },
      "audio/g726-32": {
        source: "iana"
      },
      "audio/g726-40": {
        source: "iana"
      },
      "audio/g728": {
        source: "iana"
      },
      "audio/g729": {
        source: "iana"
      },
      "audio/g7291": {
        source: "iana"
      },
      "audio/g729d": {
        source: "iana"
      },
      "audio/g729e": {
        source: "iana"
      },
      "audio/gsm": {
        source: "iana"
      },
      "audio/gsm-efr": {
        source: "iana"
      },
      "audio/gsm-hr-08": {
        source: "iana"
      },
      "audio/ilbc": {
        source: "iana"
      },
      "audio/ip-mr_v2.5": {
        source: "iana"
      },
      "audio/isac": {
        source: "apache"
      },
      "audio/l16": {
        source: "iana"
      },
      "audio/l20": {
        source: "iana"
      },
      "audio/l24": {
        source: "iana",
        compressible: false
      },
      "audio/l8": {
        source: "iana"
      },
      "audio/lpc": {
        source: "iana"
      },
      "audio/melp": {
        source: "iana"
      },
      "audio/melp1200": {
        source: "iana"
      },
      "audio/melp2400": {
        source: "iana"
      },
      "audio/melp600": {
        source: "iana"
      },
      "audio/mhas": {
        source: "iana"
      },
      "audio/midi": {
        source: "apache",
        extensions: ["mid", "midi", "kar", "rmi"]
      },
      "audio/mobile-xmf": {
        source: "iana",
        extensions: ["mxmf"]
      },
      "audio/mp3": {
        compressible: false,
        extensions: ["mp3"]
      },
      "audio/mp4": {
        source: "iana",
        compressible: false,
        extensions: ["m4a", "mp4a"]
      },
      "audio/mp4a-latm": {
        source: "iana"
      },
      "audio/mpa": {
        source: "iana"
      },
      "audio/mpa-robust": {
        source: "iana"
      },
      "audio/mpeg": {
        source: "iana",
        compressible: false,
        extensions: ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"]
      },
      "audio/mpeg4-generic": {
        source: "iana"
      },
      "audio/musepack": {
        source: "apache"
      },
      "audio/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["oga", "ogg", "spx", "opus"]
      },
      "audio/opus": {
        source: "iana"
      },
      "audio/parityfec": {
        source: "iana"
      },
      "audio/pcma": {
        source: "iana"
      },
      "audio/pcma-wb": {
        source: "iana"
      },
      "audio/pcmu": {
        source: "iana"
      },
      "audio/pcmu-wb": {
        source: "iana"
      },
      "audio/prs.sid": {
        source: "iana"
      },
      "audio/qcelp": {
        source: "iana"
      },
      "audio/raptorfec": {
        source: "iana"
      },
      "audio/red": {
        source: "iana"
      },
      "audio/rtp-enc-aescm128": {
        source: "iana"
      },
      "audio/rtp-midi": {
        source: "iana"
      },
      "audio/rtploopback": {
        source: "iana"
      },
      "audio/rtx": {
        source: "iana"
      },
      "audio/s3m": {
        source: "apache",
        extensions: ["s3m"]
      },
      "audio/scip": {
        source: "iana"
      },
      "audio/silk": {
        source: "apache",
        extensions: ["sil"]
      },
      "audio/smv": {
        source: "iana"
      },
      "audio/smv-qcp": {
        source: "iana"
      },
      "audio/smv0": {
        source: "iana"
      },
      "audio/sofa": {
        source: "iana"
      },
      "audio/sp-midi": {
        source: "iana"
      },
      "audio/speex": {
        source: "iana"
      },
      "audio/t140c": {
        source: "iana"
      },
      "audio/t38": {
        source: "iana"
      },
      "audio/telephone-event": {
        source: "iana"
      },
      "audio/tetra_acelp": {
        source: "iana"
      },
      "audio/tetra_acelp_bb": {
        source: "iana"
      },
      "audio/tone": {
        source: "iana"
      },
      "audio/tsvcis": {
        source: "iana"
      },
      "audio/uemclip": {
        source: "iana"
      },
      "audio/ulpfec": {
        source: "iana"
      },
      "audio/usac": {
        source: "iana"
      },
      "audio/vdvi": {
        source: "iana"
      },
      "audio/vmr-wb": {
        source: "iana"
      },
      "audio/vnd.3gpp.iufp": {
        source: "iana"
      },
      "audio/vnd.4sb": {
        source: "iana"
      },
      "audio/vnd.audiokoz": {
        source: "iana"
      },
      "audio/vnd.celp": {
        source: "iana"
      },
      "audio/vnd.cisco.nse": {
        source: "iana"
      },
      "audio/vnd.cmles.radio-events": {
        source: "iana"
      },
      "audio/vnd.cns.anp1": {
        source: "iana"
      },
      "audio/vnd.cns.inf1": {
        source: "iana"
      },
      "audio/vnd.dece.audio": {
        source: "iana",
        extensions: ["uva", "uvva"]
      },
      "audio/vnd.digital-winds": {
        source: "iana",
        extensions: ["eol"]
      },
      "audio/vnd.dlna.adts": {
        source: "iana"
      },
      "audio/vnd.dolby.heaac.1": {
        source: "iana"
      },
      "audio/vnd.dolby.heaac.2": {
        source: "iana"
      },
      "audio/vnd.dolby.mlp": {
        source: "iana"
      },
      "audio/vnd.dolby.mps": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2x": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2z": {
        source: "iana"
      },
      "audio/vnd.dolby.pulse.1": {
        source: "iana"
      },
      "audio/vnd.dra": {
        source: "iana",
        extensions: ["dra"]
      },
      "audio/vnd.dts": {
        source: "iana",
        extensions: ["dts"]
      },
      "audio/vnd.dts.hd": {
        source: "iana",
        extensions: ["dtshd"]
      },
      "audio/vnd.dts.uhd": {
        source: "iana"
      },
      "audio/vnd.dvb.file": {
        source: "iana"
      },
      "audio/vnd.everad.plj": {
        source: "iana"
      },
      "audio/vnd.hns.audio": {
        source: "iana"
      },
      "audio/vnd.lucent.voice": {
        source: "iana",
        extensions: ["lvp"]
      },
      "audio/vnd.ms-playready.media.pya": {
        source: "iana",
        extensions: ["pya"]
      },
      "audio/vnd.nokia.mobile-xmf": {
        source: "iana"
      },
      "audio/vnd.nortel.vbk": {
        source: "iana"
      },
      "audio/vnd.nuera.ecelp4800": {
        source: "iana",
        extensions: ["ecelp4800"]
      },
      "audio/vnd.nuera.ecelp7470": {
        source: "iana",
        extensions: ["ecelp7470"]
      },
      "audio/vnd.nuera.ecelp9600": {
        source: "iana",
        extensions: ["ecelp9600"]
      },
      "audio/vnd.octel.sbc": {
        source: "iana"
      },
      "audio/vnd.presonus.multitrack": {
        source: "iana"
      },
      "audio/vnd.qcelp": {
        source: "iana"
      },
      "audio/vnd.rhetorex.32kadpcm": {
        source: "iana"
      },
      "audio/vnd.rip": {
        source: "iana",
        extensions: ["rip"]
      },
      "audio/vnd.rn-realaudio": {
        compressible: false
      },
      "audio/vnd.sealedmedia.softseal.mpeg": {
        source: "iana"
      },
      "audio/vnd.vmx.cvsd": {
        source: "iana"
      },
      "audio/vnd.wave": {
        compressible: false
      },
      "audio/vorbis": {
        source: "iana",
        compressible: false
      },
      "audio/vorbis-config": {
        source: "iana"
      },
      "audio/wav": {
        compressible: false,
        extensions: ["wav"]
      },
      "audio/wave": {
        compressible: false,
        extensions: ["wav"]
      },
      "audio/webm": {
        source: "apache",
        compressible: false,
        extensions: ["weba"]
      },
      "audio/x-aac": {
        source: "apache",
        compressible: false,
        extensions: ["aac"]
      },
      "audio/x-aiff": {
        source: "apache",
        extensions: ["aif", "aiff", "aifc"]
      },
      "audio/x-caf": {
        source: "apache",
        compressible: false,
        extensions: ["caf"]
      },
      "audio/x-flac": {
        source: "apache",
        extensions: ["flac"]
      },
      "audio/x-m4a": {
        source: "nginx",
        extensions: ["m4a"]
      },
      "audio/x-matroska": {
        source: "apache",
        extensions: ["mka"]
      },
      "audio/x-mpegurl": {
        source: "apache",
        extensions: ["m3u"]
      },
      "audio/x-ms-wax": {
        source: "apache",
        extensions: ["wax"]
      },
      "audio/x-ms-wma": {
        source: "apache",
        extensions: ["wma"]
      },
      "audio/x-pn-realaudio": {
        source: "apache",
        extensions: ["ram", "ra"]
      },
      "audio/x-pn-realaudio-plugin": {
        source: "apache",
        extensions: ["rmp"]
      },
      "audio/x-realaudio": {
        source: "nginx",
        extensions: ["ra"]
      },
      "audio/x-tta": {
        source: "apache"
      },
      "audio/x-wav": {
        source: "apache",
        extensions: ["wav"]
      },
      "audio/xm": {
        source: "apache",
        extensions: ["xm"]
      },
      "chemical/x-cdx": {
        source: "apache",
        extensions: ["cdx"]
      },
      "chemical/x-cif": {
        source: "apache",
        extensions: ["cif"]
      },
      "chemical/x-cmdf": {
        source: "apache",
        extensions: ["cmdf"]
      },
      "chemical/x-cml": {
        source: "apache",
        extensions: ["cml"]
      },
      "chemical/x-csml": {
        source: "apache",
        extensions: ["csml"]
      },
      "chemical/x-pdb": {
        source: "apache"
      },
      "chemical/x-xyz": {
        source: "apache",
        extensions: ["xyz"]
      },
      "font/collection": {
        source: "iana",
        extensions: ["ttc"]
      },
      "font/otf": {
        source: "iana",
        compressible: true,
        extensions: ["otf"]
      },
      "font/sfnt": {
        source: "iana"
      },
      "font/ttf": {
        source: "iana",
        compressible: true,
        extensions: ["ttf"]
      },
      "font/woff": {
        source: "iana",
        extensions: ["woff"]
      },
      "font/woff2": {
        source: "iana",
        extensions: ["woff2"]
      },
      "image/aces": {
        source: "iana",
        extensions: ["exr"]
      },
      "image/apng": {
        compressible: false,
        extensions: ["apng"]
      },
      "image/avci": {
        source: "iana",
        extensions: ["avci"]
      },
      "image/avcs": {
        source: "iana",
        extensions: ["avcs"]
      },
      "image/avif": {
        source: "iana",
        compressible: false,
        extensions: ["avif"]
      },
      "image/bmp": {
        source: "iana",
        compressible: true,
        extensions: ["bmp"]
      },
      "image/cgm": {
        source: "iana",
        extensions: ["cgm"]
      },
      "image/dicom-rle": {
        source: "iana",
        extensions: ["drle"]
      },
      "image/emf": {
        source: "iana",
        extensions: ["emf"]
      },
      "image/fits": {
        source: "iana",
        extensions: ["fits"]
      },
      "image/g3fax": {
        source: "iana",
        extensions: ["g3"]
      },
      "image/gif": {
        source: "iana",
        compressible: false,
        extensions: ["gif"]
      },
      "image/heic": {
        source: "iana",
        extensions: ["heic"]
      },
      "image/heic-sequence": {
        source: "iana",
        extensions: ["heics"]
      },
      "image/heif": {
        source: "iana",
        extensions: ["heif"]
      },
      "image/heif-sequence": {
        source: "iana",
        extensions: ["heifs"]
      },
      "image/hej2k": {
        source: "iana",
        extensions: ["hej2"]
      },
      "image/hsj2": {
        source: "iana",
        extensions: ["hsj2"]
      },
      "image/ief": {
        source: "iana",
        extensions: ["ief"]
      },
      "image/jls": {
        source: "iana",
        extensions: ["jls"]
      },
      "image/jp2": {
        source: "iana",
        compressible: false,
        extensions: ["jp2", "jpg2"]
      },
      "image/jpeg": {
        source: "iana",
        compressible: false,
        extensions: ["jpeg", "jpg", "jpe"]
      },
      "image/jph": {
        source: "iana",
        extensions: ["jph"]
      },
      "image/jphc": {
        source: "iana",
        extensions: ["jhc"]
      },
      "image/jpm": {
        source: "iana",
        compressible: false,
        extensions: ["jpm"]
      },
      "image/jpx": {
        source: "iana",
        compressible: false,
        extensions: ["jpx", "jpf"]
      },
      "image/jxr": {
        source: "iana",
        extensions: ["jxr"]
      },
      "image/jxra": {
        source: "iana",
        extensions: ["jxra"]
      },
      "image/jxrs": {
        source: "iana",
        extensions: ["jxrs"]
      },
      "image/jxs": {
        source: "iana",
        extensions: ["jxs"]
      },
      "image/jxsc": {
        source: "iana",
        extensions: ["jxsc"]
      },
      "image/jxsi": {
        source: "iana",
        extensions: ["jxsi"]
      },
      "image/jxss": {
        source: "iana",
        extensions: ["jxss"]
      },
      "image/ktx": {
        source: "iana",
        extensions: ["ktx"]
      },
      "image/ktx2": {
        source: "iana",
        extensions: ["ktx2"]
      },
      "image/naplps": {
        source: "iana"
      },
      "image/pjpeg": {
        compressible: false
      },
      "image/png": {
        source: "iana",
        compressible: false,
        extensions: ["png"]
      },
      "image/prs.btif": {
        source: "iana",
        extensions: ["btif"]
      },
      "image/prs.pti": {
        source: "iana",
        extensions: ["pti"]
      },
      "image/pwg-raster": {
        source: "iana"
      },
      "image/sgi": {
        source: "apache",
        extensions: ["sgi"]
      },
      "image/svg+xml": {
        source: "iana",
        compressible: true,
        extensions: ["svg", "svgz"]
      },
      "image/t38": {
        source: "iana",
        extensions: ["t38"]
      },
      "image/tiff": {
        source: "iana",
        compressible: false,
        extensions: ["tif", "tiff"]
      },
      "image/tiff-fx": {
        source: "iana",
        extensions: ["tfx"]
      },
      "image/vnd.adobe.photoshop": {
        source: "iana",
        compressible: true,
        extensions: ["psd"]
      },
      "image/vnd.airzip.accelerator.azv": {
        source: "iana",
        extensions: ["azv"]
      },
      "image/vnd.cns.inf2": {
        source: "iana"
      },
      "image/vnd.dece.graphic": {
        source: "iana",
        extensions: ["uvi", "uvvi", "uvg", "uvvg"]
      },
      "image/vnd.djvu": {
        source: "iana",
        extensions: ["djvu", "djv"]
      },
      "image/vnd.dvb.subtitle": {
        source: "iana",
        extensions: ["sub"]
      },
      "image/vnd.dwg": {
        source: "iana",
        extensions: ["dwg"]
      },
      "image/vnd.dxf": {
        source: "iana",
        extensions: ["dxf"]
      },
      "image/vnd.fastbidsheet": {
        source: "iana",
        extensions: ["fbs"]
      },
      "image/vnd.fpx": {
        source: "iana",
        extensions: ["fpx"]
      },
      "image/vnd.fst": {
        source: "iana",
        extensions: ["fst"]
      },
      "image/vnd.fujixerox.edmics-mmr": {
        source: "iana",
        extensions: ["mmr"]
      },
      "image/vnd.fujixerox.edmics-rlc": {
        source: "iana",
        extensions: ["rlc"]
      },
      "image/vnd.globalgraphics.pgb": {
        source: "iana"
      },
      "image/vnd.microsoft.icon": {
        source: "iana",
        compressible: true,
        extensions: ["ico"]
      },
      "image/vnd.mix": {
        source: "iana"
      },
      "image/vnd.mozilla.apng": {
        source: "iana"
      },
      "image/vnd.ms-dds": {
        compressible: true,
        extensions: ["dds"]
      },
      "image/vnd.ms-modi": {
        source: "iana",
        extensions: ["mdi"]
      },
      "image/vnd.ms-photo": {
        source: "apache",
        extensions: ["wdp"]
      },
      "image/vnd.net-fpx": {
        source: "iana",
        extensions: ["npx"]
      },
      "image/vnd.pco.b16": {
        source: "iana",
        extensions: ["b16"]
      },
      "image/vnd.radiance": {
        source: "iana"
      },
      "image/vnd.sealed.png": {
        source: "iana"
      },
      "image/vnd.sealedmedia.softseal.gif": {
        source: "iana"
      },
      "image/vnd.sealedmedia.softseal.jpg": {
        source: "iana"
      },
      "image/vnd.svf": {
        source: "iana"
      },
      "image/vnd.tencent.tap": {
        source: "iana",
        extensions: ["tap"]
      },
      "image/vnd.valve.source.texture": {
        source: "iana",
        extensions: ["vtf"]
      },
      "image/vnd.wap.wbmp": {
        source: "iana",
        extensions: ["wbmp"]
      },
      "image/vnd.xiff": {
        source: "iana",
        extensions: ["xif"]
      },
      "image/vnd.zbrush.pcx": {
        source: "iana",
        extensions: ["pcx"]
      },
      "image/webp": {
        source: "apache",
        extensions: ["webp"]
      },
      "image/wmf": {
        source: "iana",
        extensions: ["wmf"]
      },
      "image/x-3ds": {
        source: "apache",
        extensions: ["3ds"]
      },
      "image/x-cmu-raster": {
        source: "apache",
        extensions: ["ras"]
      },
      "image/x-cmx": {
        source: "apache",
        extensions: ["cmx"]
      },
      "image/x-freehand": {
        source: "apache",
        extensions: ["fh", "fhc", "fh4", "fh5", "fh7"]
      },
      "image/x-icon": {
        source: "apache",
        compressible: true,
        extensions: ["ico"]
      },
      "image/x-jng": {
        source: "nginx",
        extensions: ["jng"]
      },
      "image/x-mrsid-image": {
        source: "apache",
        extensions: ["sid"]
      },
      "image/x-ms-bmp": {
        source: "nginx",
        compressible: true,
        extensions: ["bmp"]
      },
      "image/x-pcx": {
        source: "apache",
        extensions: ["pcx"]
      },
      "image/x-pict": {
        source: "apache",
        extensions: ["pic", "pct"]
      },
      "image/x-portable-anymap": {
        source: "apache",
        extensions: ["pnm"]
      },
      "image/x-portable-bitmap": {
        source: "apache",
        extensions: ["pbm"]
      },
      "image/x-portable-graymap": {
        source: "apache",
        extensions: ["pgm"]
      },
      "image/x-portable-pixmap": {
        source: "apache",
        extensions: ["ppm"]
      },
      "image/x-rgb": {
        source: "apache",
        extensions: ["rgb"]
      },
      "image/x-tga": {
        source: "apache",
        extensions: ["tga"]
      },
      "image/x-xbitmap": {
        source: "apache",
        extensions: ["xbm"]
      },
      "image/x-xcf": {
        compressible: false
      },
      "image/x-xpixmap": {
        source: "apache",
        extensions: ["xpm"]
      },
      "image/x-xwindowdump": {
        source: "apache",
        extensions: ["xwd"]
      },
      "message/cpim": {
        source: "iana"
      },
      "message/delivery-status": {
        source: "iana"
      },
      "message/disposition-notification": {
        source: "iana",
        extensions: [
          "disposition-notification"
        ]
      },
      "message/external-body": {
        source: "iana"
      },
      "message/feedback-report": {
        source: "iana"
      },
      "message/global": {
        source: "iana",
        extensions: ["u8msg"]
      },
      "message/global-delivery-status": {
        source: "iana",
        extensions: ["u8dsn"]
      },
      "message/global-disposition-notification": {
        source: "iana",
        extensions: ["u8mdn"]
      },
      "message/global-headers": {
        source: "iana",
        extensions: ["u8hdr"]
      },
      "message/http": {
        source: "iana",
        compressible: false
      },
      "message/imdn+xml": {
        source: "iana",
        compressible: true
      },
      "message/news": {
        source: "iana"
      },
      "message/partial": {
        source: "iana",
        compressible: false
      },
      "message/rfc822": {
        source: "iana",
        compressible: true,
        extensions: ["eml", "mime"]
      },
      "message/s-http": {
        source: "iana"
      },
      "message/sip": {
        source: "iana"
      },
      "message/sipfrag": {
        source: "iana"
      },
      "message/tracking-status": {
        source: "iana"
      },
      "message/vnd.si.simp": {
        source: "iana"
      },
      "message/vnd.wfa.wsc": {
        source: "iana",
        extensions: ["wsc"]
      },
      "model/3mf": {
        source: "iana",
        extensions: ["3mf"]
      },
      "model/e57": {
        source: "iana"
      },
      "model/gltf+json": {
        source: "iana",
        compressible: true,
        extensions: ["gltf"]
      },
      "model/gltf-binary": {
        source: "iana",
        compressible: true,
        extensions: ["glb"]
      },
      "model/iges": {
        source: "iana",
        compressible: false,
        extensions: ["igs", "iges"]
      },
      "model/mesh": {
        source: "iana",
        compressible: false,
        extensions: ["msh", "mesh", "silo"]
      },
      "model/mtl": {
        source: "iana",
        extensions: ["mtl"]
      },
      "model/obj": {
        source: "iana",
        extensions: ["obj"]
      },
      "model/step": {
        source: "iana"
      },
      "model/step+xml": {
        source: "iana",
        compressible: true,
        extensions: ["stpx"]
      },
      "model/step+zip": {
        source: "iana",
        compressible: false,
        extensions: ["stpz"]
      },
      "model/step-xml+zip": {
        source: "iana",
        compressible: false,
        extensions: ["stpxz"]
      },
      "model/stl": {
        source: "iana",
        extensions: ["stl"]
      },
      "model/vnd.collada+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dae"]
      },
      "model/vnd.dwf": {
        source: "iana",
        extensions: ["dwf"]
      },
      "model/vnd.flatland.3dml": {
        source: "iana"
      },
      "model/vnd.gdl": {
        source: "iana",
        extensions: ["gdl"]
      },
      "model/vnd.gs-gdl": {
        source: "apache"
      },
      "model/vnd.gs.gdl": {
        source: "iana"
      },
      "model/vnd.gtw": {
        source: "iana",
        extensions: ["gtw"]
      },
      "model/vnd.moml+xml": {
        source: "iana",
        compressible: true
      },
      "model/vnd.mts": {
        source: "iana",
        extensions: ["mts"]
      },
      "model/vnd.opengex": {
        source: "iana",
        extensions: ["ogex"]
      },
      "model/vnd.parasolid.transmit.binary": {
        source: "iana",
        extensions: ["x_b"]
      },
      "model/vnd.parasolid.transmit.text": {
        source: "iana",
        extensions: ["x_t"]
      },
      "model/vnd.pytha.pyox": {
        source: "iana"
      },
      "model/vnd.rosette.annotated-data-model": {
        source: "iana"
      },
      "model/vnd.sap.vds": {
        source: "iana",
        extensions: ["vds"]
      },
      "model/vnd.usdz+zip": {
        source: "iana",
        compressible: false,
        extensions: ["usdz"]
      },
      "model/vnd.valve.source.compiled-map": {
        source: "iana",
        extensions: ["bsp"]
      },
      "model/vnd.vtu": {
        source: "iana",
        extensions: ["vtu"]
      },
      "model/vrml": {
        source: "iana",
        compressible: false,
        extensions: ["wrl", "vrml"]
      },
      "model/x3d+binary": {
        source: "apache",
        compressible: false,
        extensions: ["x3db", "x3dbz"]
      },
      "model/x3d+fastinfoset": {
        source: "iana",
        extensions: ["x3db"]
      },
      "model/x3d+vrml": {
        source: "apache",
        compressible: false,
        extensions: ["x3dv", "x3dvz"]
      },
      "model/x3d+xml": {
        source: "iana",
        compressible: true,
        extensions: ["x3d", "x3dz"]
      },
      "model/x3d-vrml": {
        source: "iana",
        extensions: ["x3dv"]
      },
      "multipart/alternative": {
        source: "iana",
        compressible: false
      },
      "multipart/appledouble": {
        source: "iana"
      },
      "multipart/byteranges": {
        source: "iana"
      },
      "multipart/digest": {
        source: "iana"
      },
      "multipart/encrypted": {
        source: "iana",
        compressible: false
      },
      "multipart/form-data": {
        source: "iana",
        compressible: false
      },
      "multipart/header-set": {
        source: "iana"
      },
      "multipart/mixed": {
        source: "iana"
      },
      "multipart/multilingual": {
        source: "iana"
      },
      "multipart/parallel": {
        source: "iana"
      },
      "multipart/related": {
        source: "iana",
        compressible: false
      },
      "multipart/report": {
        source: "iana"
      },
      "multipart/signed": {
        source: "iana",
        compressible: false
      },
      "multipart/vnd.bint.med-plus": {
        source: "iana"
      },
      "multipart/voice-message": {
        source: "iana"
      },
      "multipart/x-mixed-replace": {
        source: "iana"
      },
      "text/1d-interleaved-parityfec": {
        source: "iana"
      },
      "text/cache-manifest": {
        source: "iana",
        compressible: true,
        extensions: ["appcache", "manifest"]
      },
      "text/calendar": {
        source: "iana",
        extensions: ["ics", "ifb"]
      },
      "text/calender": {
        compressible: true
      },
      "text/cmd": {
        compressible: true
      },
      "text/coffeescript": {
        extensions: ["coffee", "litcoffee"]
      },
      "text/cql": {
        source: "iana"
      },
      "text/cql-expression": {
        source: "iana"
      },
      "text/cql-identifier": {
        source: "iana"
      },
      "text/css": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["css"]
      },
      "text/csv": {
        source: "iana",
        compressible: true,
        extensions: ["csv"]
      },
      "text/csv-schema": {
        source: "iana"
      },
      "text/directory": {
        source: "iana"
      },
      "text/dns": {
        source: "iana"
      },
      "text/ecmascript": {
        source: "iana"
      },
      "text/encaprtp": {
        source: "iana"
      },
      "text/enriched": {
        source: "iana"
      },
      "text/fhirpath": {
        source: "iana"
      },
      "text/flexfec": {
        source: "iana"
      },
      "text/fwdred": {
        source: "iana"
      },
      "text/gff3": {
        source: "iana"
      },
      "text/grammar-ref-list": {
        source: "iana"
      },
      "text/html": {
        source: "iana",
        compressible: true,
        extensions: ["html", "htm", "shtml"]
      },
      "text/jade": {
        extensions: ["jade"]
      },
      "text/javascript": {
        source: "iana",
        compressible: true
      },
      "text/jcr-cnd": {
        source: "iana"
      },
      "text/jsx": {
        compressible: true,
        extensions: ["jsx"]
      },
      "text/less": {
        compressible: true,
        extensions: ["less"]
      },
      "text/markdown": {
        source: "iana",
        compressible: true,
        extensions: ["markdown", "md"]
      },
      "text/mathml": {
        source: "nginx",
        extensions: ["mml"]
      },
      "text/mdx": {
        compressible: true,
        extensions: ["mdx"]
      },
      "text/mizar": {
        source: "iana"
      },
      "text/n3": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["n3"]
      },
      "text/parameters": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/parityfec": {
        source: "iana"
      },
      "text/plain": {
        source: "iana",
        compressible: true,
        extensions: ["txt", "text", "conf", "def", "list", "log", "in", "ini"]
      },
      "text/provenance-notation": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/prs.fallenstein.rst": {
        source: "iana"
      },
      "text/prs.lines.tag": {
        source: "iana",
        extensions: ["dsc"]
      },
      "text/prs.prop.logic": {
        source: "iana"
      },
      "text/raptorfec": {
        source: "iana"
      },
      "text/red": {
        source: "iana"
      },
      "text/rfc822-headers": {
        source: "iana"
      },
      "text/richtext": {
        source: "iana",
        compressible: true,
        extensions: ["rtx"]
      },
      "text/rtf": {
        source: "iana",
        compressible: true,
        extensions: ["rtf"]
      },
      "text/rtp-enc-aescm128": {
        source: "iana"
      },
      "text/rtploopback": {
        source: "iana"
      },
      "text/rtx": {
        source: "iana"
      },
      "text/sgml": {
        source: "iana",
        extensions: ["sgml", "sgm"]
      },
      "text/shaclc": {
        source: "iana"
      },
      "text/shex": {
        source: "iana",
        extensions: ["shex"]
      },
      "text/slim": {
        extensions: ["slim", "slm"]
      },
      "text/spdx": {
        source: "iana",
        extensions: ["spdx"]
      },
      "text/strings": {
        source: "iana"
      },
      "text/stylus": {
        extensions: ["stylus", "styl"]
      },
      "text/t140": {
        source: "iana"
      },
      "text/tab-separated-values": {
        source: "iana",
        compressible: true,
        extensions: ["tsv"]
      },
      "text/troff": {
        source: "iana",
        extensions: ["t", "tr", "roff", "man", "me", "ms"]
      },
      "text/turtle": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["ttl"]
      },
      "text/ulpfec": {
        source: "iana"
      },
      "text/uri-list": {
        source: "iana",
        compressible: true,
        extensions: ["uri", "uris", "urls"]
      },
      "text/vcard": {
        source: "iana",
        compressible: true,
        extensions: ["vcard"]
      },
      "text/vnd.a": {
        source: "iana"
      },
      "text/vnd.abc": {
        source: "iana"
      },
      "text/vnd.ascii-art": {
        source: "iana"
      },
      "text/vnd.curl": {
        source: "iana",
        extensions: ["curl"]
      },
      "text/vnd.curl.dcurl": {
        source: "apache",
        extensions: ["dcurl"]
      },
      "text/vnd.curl.mcurl": {
        source: "apache",
        extensions: ["mcurl"]
      },
      "text/vnd.curl.scurl": {
        source: "apache",
        extensions: ["scurl"]
      },
      "text/vnd.debian.copyright": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.dmclientscript": {
        source: "iana"
      },
      "text/vnd.dvb.subtitle": {
        source: "iana",
        extensions: ["sub"]
      },
      "text/vnd.esmertec.theme-descriptor": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.familysearch.gedcom": {
        source: "iana",
        extensions: ["ged"]
      },
      "text/vnd.ficlab.flt": {
        source: "iana"
      },
      "text/vnd.fly": {
        source: "iana",
        extensions: ["fly"]
      },
      "text/vnd.fmi.flexstor": {
        source: "iana",
        extensions: ["flx"]
      },
      "text/vnd.gml": {
        source: "iana"
      },
      "text/vnd.graphviz": {
        source: "iana",
        extensions: ["gv"]
      },
      "text/vnd.hans": {
        source: "iana"
      },
      "text/vnd.hgl": {
        source: "iana"
      },
      "text/vnd.in3d.3dml": {
        source: "iana",
        extensions: ["3dml"]
      },
      "text/vnd.in3d.spot": {
        source: "iana",
        extensions: ["spot"]
      },
      "text/vnd.iptc.newsml": {
        source: "iana"
      },
      "text/vnd.iptc.nitf": {
        source: "iana"
      },
      "text/vnd.latex-z": {
        source: "iana"
      },
      "text/vnd.motorola.reflex": {
        source: "iana"
      },
      "text/vnd.ms-mediapackage": {
        source: "iana"
      },
      "text/vnd.net2phone.commcenter.command": {
        source: "iana"
      },
      "text/vnd.radisys.msml-basic-layout": {
        source: "iana"
      },
      "text/vnd.senx.warpscript": {
        source: "iana"
      },
      "text/vnd.si.uricatalogue": {
        source: "iana"
      },
      "text/vnd.sosi": {
        source: "iana"
      },
      "text/vnd.sun.j2me.app-descriptor": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["jad"]
      },
      "text/vnd.trolltech.linguist": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.wap.si": {
        source: "iana"
      },
      "text/vnd.wap.sl": {
        source: "iana"
      },
      "text/vnd.wap.wml": {
        source: "iana",
        extensions: ["wml"]
      },
      "text/vnd.wap.wmlscript": {
        source: "iana",
        extensions: ["wmls"]
      },
      "text/vtt": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["vtt"]
      },
      "text/x-asm": {
        source: "apache",
        extensions: ["s", "asm"]
      },
      "text/x-c": {
        source: "apache",
        extensions: ["c", "cc", "cxx", "cpp", "h", "hh", "dic"]
      },
      "text/x-component": {
        source: "nginx",
        extensions: ["htc"]
      },
      "text/x-fortran": {
        source: "apache",
        extensions: ["f", "for", "f77", "f90"]
      },
      "text/x-gwt-rpc": {
        compressible: true
      },
      "text/x-handlebars-template": {
        extensions: ["hbs"]
      },
      "text/x-java-source": {
        source: "apache",
        extensions: ["java"]
      },
      "text/x-jquery-tmpl": {
        compressible: true
      },
      "text/x-lua": {
        extensions: ["lua"]
      },
      "text/x-markdown": {
        compressible: true,
        extensions: ["mkd"]
      },
      "text/x-nfo": {
        source: "apache",
        extensions: ["nfo"]
      },
      "text/x-opml": {
        source: "apache",
        extensions: ["opml"]
      },
      "text/x-org": {
        compressible: true,
        extensions: ["org"]
      },
      "text/x-pascal": {
        source: "apache",
        extensions: ["p", "pas"]
      },
      "text/x-processing": {
        compressible: true,
        extensions: ["pde"]
      },
      "text/x-sass": {
        extensions: ["sass"]
      },
      "text/x-scss": {
        extensions: ["scss"]
      },
      "text/x-setext": {
        source: "apache",
        extensions: ["etx"]
      },
      "text/x-sfv": {
        source: "apache",
        extensions: ["sfv"]
      },
      "text/x-suse-ymp": {
        compressible: true,
        extensions: ["ymp"]
      },
      "text/x-uuencode": {
        source: "apache",
        extensions: ["uu"]
      },
      "text/x-vcalendar": {
        source: "apache",
        extensions: ["vcs"]
      },
      "text/x-vcard": {
        source: "apache",
        extensions: ["vcf"]
      },
      "text/xml": {
        source: "iana",
        compressible: true,
        extensions: ["xml"]
      },
      "text/xml-external-parsed-entity": {
        source: "iana"
      },
      "text/yaml": {
        compressible: true,
        extensions: ["yaml", "yml"]
      },
      "video/1d-interleaved-parityfec": {
        source: "iana"
      },
      "video/3gpp": {
        source: "iana",
        extensions: ["3gp", "3gpp"]
      },
      "video/3gpp-tt": {
        source: "iana"
      },
      "video/3gpp2": {
        source: "iana",
        extensions: ["3g2"]
      },
      "video/av1": {
        source: "iana"
      },
      "video/bmpeg": {
        source: "iana"
      },
      "video/bt656": {
        source: "iana"
      },
      "video/celb": {
        source: "iana"
      },
      "video/dv": {
        source: "iana"
      },
      "video/encaprtp": {
        source: "iana"
      },
      "video/ffv1": {
        source: "iana"
      },
      "video/flexfec": {
        source: "iana"
      },
      "video/h261": {
        source: "iana",
        extensions: ["h261"]
      },
      "video/h263": {
        source: "iana",
        extensions: ["h263"]
      },
      "video/h263-1998": {
        source: "iana"
      },
      "video/h263-2000": {
        source: "iana"
      },
      "video/h264": {
        source: "iana",
        extensions: ["h264"]
      },
      "video/h264-rcdo": {
        source: "iana"
      },
      "video/h264-svc": {
        source: "iana"
      },
      "video/h265": {
        source: "iana"
      },
      "video/iso.segment": {
        source: "iana",
        extensions: ["m4s"]
      },
      "video/jpeg": {
        source: "iana",
        extensions: ["jpgv"]
      },
      "video/jpeg2000": {
        source: "iana"
      },
      "video/jpm": {
        source: "apache",
        extensions: ["jpm", "jpgm"]
      },
      "video/jxsv": {
        source: "iana"
      },
      "video/mj2": {
        source: "iana",
        extensions: ["mj2", "mjp2"]
      },
      "video/mp1s": {
        source: "iana"
      },
      "video/mp2p": {
        source: "iana"
      },
      "video/mp2t": {
        source: "iana",
        extensions: ["ts"]
      },
      "video/mp4": {
        source: "iana",
        compressible: false,
        extensions: ["mp4", "mp4v", "mpg4"]
      },
      "video/mp4v-es": {
        source: "iana"
      },
      "video/mpeg": {
        source: "iana",
        compressible: false,
        extensions: ["mpeg", "mpg", "mpe", "m1v", "m2v"]
      },
      "video/mpeg4-generic": {
        source: "iana"
      },
      "video/mpv": {
        source: "iana"
      },
      "video/nv": {
        source: "iana"
      },
      "video/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["ogv"]
      },
      "video/parityfec": {
        source: "iana"
      },
      "video/pointer": {
        source: "iana"
      },
      "video/quicktime": {
        source: "iana",
        compressible: false,
        extensions: ["qt", "mov"]
      },
      "video/raptorfec": {
        source: "iana"
      },
      "video/raw": {
        source: "iana"
      },
      "video/rtp-enc-aescm128": {
        source: "iana"
      },
      "video/rtploopback": {
        source: "iana"
      },
      "video/rtx": {
        source: "iana"
      },
      "video/scip": {
        source: "iana"
      },
      "video/smpte291": {
        source: "iana"
      },
      "video/smpte292m": {
        source: "iana"
      },
      "video/ulpfec": {
        source: "iana"
      },
      "video/vc1": {
        source: "iana"
      },
      "video/vc2": {
        source: "iana"
      },
      "video/vnd.cctv": {
        source: "iana"
      },
      "video/vnd.dece.hd": {
        source: "iana",
        extensions: ["uvh", "uvvh"]
      },
      "video/vnd.dece.mobile": {
        source: "iana",
        extensions: ["uvm", "uvvm"]
      },
      "video/vnd.dece.mp4": {
        source: "iana"
      },
      "video/vnd.dece.pd": {
        source: "iana",
        extensions: ["uvp", "uvvp"]
      },
      "video/vnd.dece.sd": {
        source: "iana",
        extensions: ["uvs", "uvvs"]
      },
      "video/vnd.dece.video": {
        source: "iana",
        extensions: ["uvv", "uvvv"]
      },
      "video/vnd.directv.mpeg": {
        source: "iana"
      },
      "video/vnd.directv.mpeg-tts": {
        source: "iana"
      },
      "video/vnd.dlna.mpeg-tts": {
        source: "iana"
      },
      "video/vnd.dvb.file": {
        source: "iana",
        extensions: ["dvb"]
      },
      "video/vnd.fvt": {
        source: "iana",
        extensions: ["fvt"]
      },
      "video/vnd.hns.video": {
        source: "iana"
      },
      "video/vnd.iptvforum.1dparityfec-1010": {
        source: "iana"
      },
      "video/vnd.iptvforum.1dparityfec-2005": {
        source: "iana"
      },
      "video/vnd.iptvforum.2dparityfec-1010": {
        source: "iana"
      },
      "video/vnd.iptvforum.2dparityfec-2005": {
        source: "iana"
      },
      "video/vnd.iptvforum.ttsavc": {
        source: "iana"
      },
      "video/vnd.iptvforum.ttsmpeg2": {
        source: "iana"
      },
      "video/vnd.motorola.video": {
        source: "iana"
      },
      "video/vnd.motorola.videop": {
        source: "iana"
      },
      "video/vnd.mpegurl": {
        source: "iana",
        extensions: ["mxu", "m4u"]
      },
      "video/vnd.ms-playready.media.pyv": {
        source: "iana",
        extensions: ["pyv"]
      },
      "video/vnd.nokia.interleaved-multimedia": {
        source: "iana"
      },
      "video/vnd.nokia.mp4vr": {
        source: "iana"
      },
      "video/vnd.nokia.videovoip": {
        source: "iana"
      },
      "video/vnd.objectvideo": {
        source: "iana"
      },
      "video/vnd.radgamettools.bink": {
        source: "iana"
      },
      "video/vnd.radgamettools.smacker": {
        source: "iana"
      },
      "video/vnd.sealed.mpeg1": {
        source: "iana"
      },
      "video/vnd.sealed.mpeg4": {
        source: "iana"
      },
      "video/vnd.sealed.swf": {
        source: "iana"
      },
      "video/vnd.sealedmedia.softseal.mov": {
        source: "iana"
      },
      "video/vnd.uvvu.mp4": {
        source: "iana",
        extensions: ["uvu", "uvvu"]
      },
      "video/vnd.vivo": {
        source: "iana",
        extensions: ["viv"]
      },
      "video/vnd.youtube.yt": {
        source: "iana"
      },
      "video/vp8": {
        source: "iana"
      },
      "video/vp9": {
        source: "iana"
      },
      "video/webm": {
        source: "apache",
        compressible: false,
        extensions: ["webm"]
      },
      "video/x-f4v": {
        source: "apache",
        extensions: ["f4v"]
      },
      "video/x-fli": {
        source: "apache",
        extensions: ["fli"]
      },
      "video/x-flv": {
        source: "apache",
        compressible: false,
        extensions: ["flv"]
      },
      "video/x-m4v": {
        source: "apache",
        extensions: ["m4v"]
      },
      "video/x-matroska": {
        source: "apache",
        compressible: false,
        extensions: ["mkv", "mk3d", "mks"]
      },
      "video/x-mng": {
        source: "apache",
        extensions: ["mng"]
      },
      "video/x-ms-asf": {
        source: "apache",
        extensions: ["asf", "asx"]
      },
      "video/x-ms-vob": {
        source: "apache",
        extensions: ["vob"]
      },
      "video/x-ms-wm": {
        source: "apache",
        extensions: ["wm"]
      },
      "video/x-ms-wmv": {
        source: "apache",
        compressible: false,
        extensions: ["wmv"]
      },
      "video/x-ms-wmx": {
        source: "apache",
        extensions: ["wmx"]
      },
      "video/x-ms-wvx": {
        source: "apache",
        extensions: ["wvx"]
      },
      "video/x-msvideo": {
        source: "apache",
        extensions: ["avi"]
      },
      "video/x-sgi-movie": {
        source: "apache",
        extensions: ["movie"]
      },
      "video/x-smv": {
        source: "apache",
        extensions: ["smv"]
      },
      "x-conference/x-cooltalk": {
        source: "apache",
        extensions: ["ice"]
      },
      "x-shader/x-fragment": {
        compressible: true
      },
      "x-shader/x-vertex": {
        compressible: true
      }
    };
  }
});

// ../../../../../node_modules/mime-db/index.js
var require_mime_db = __commonJS({
  "../../../../../node_modules/mime-db/index.js"(exports2, module2) {
    module2.exports = require_db();
  }
});

// ../../../../../node_modules/mime-types/index.js
var require_mime_types = __commonJS({
  "../../../../../node_modules/mime-types/index.js"(exports2) {
    "use strict";
    var db = require_mime_db();
    var extname = require("path").extname;
    var EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
    var TEXT_TYPE_REGEXP = /^text\//i;
    exports2.charset = charset;
    exports2.charsets = { lookup: charset };
    exports2.contentType = contentType;
    exports2.extension = extension;
    exports2.extensions = /* @__PURE__ */ Object.create(null);
    exports2.lookup = lookup;
    exports2.types = /* @__PURE__ */ Object.create(null);
    populateMaps(exports2.extensions, exports2.types);
    function charset(type) {
      if (!type || typeof type !== "string") {
        return false;
      }
      var match = EXTRACT_TYPE_REGEXP.exec(type);
      var mime = match && db[match[1].toLowerCase()];
      if (mime && mime.charset) {
        return mime.charset;
      }
      if (match && TEXT_TYPE_REGEXP.test(match[1])) {
        return "UTF-8";
      }
      return false;
    }
    function contentType(str) {
      if (!str || typeof str !== "string") {
        return false;
      }
      var mime = str.indexOf("/") === -1 ? exports2.lookup(str) : str;
      if (!mime) {
        return false;
      }
      if (mime.indexOf("charset") === -1) {
        var charset2 = exports2.charset(mime);
        if (charset2) mime += "; charset=" + charset2.toLowerCase();
      }
      return mime;
    }
    function extension(type) {
      if (!type || typeof type !== "string") {
        return false;
      }
      var match = EXTRACT_TYPE_REGEXP.exec(type);
      var exts = match && exports2.extensions[match[1].toLowerCase()];
      if (!exts || !exts.length) {
        return false;
      }
      return exts[0];
    }
    function lookup(path) {
      if (!path || typeof path !== "string") {
        return false;
      }
      var extension2 = extname("x." + path).toLowerCase().substr(1);
      if (!extension2) {
        return false;
      }
      return exports2.types[extension2] || false;
    }
    function populateMaps(extensions, types) {
      var preference = ["nginx", "apache", void 0, "iana"];
      Object.keys(db).forEach(function forEachMimeType(type) {
        var mime = db[type];
        var exts = mime.extensions;
        if (!exts || !exts.length) {
          return;
        }
        extensions[type] = exts;
        for (var i = 0; i < exts.length; i++) {
          var extension2 = exts[i];
          if (types[extension2]) {
            var from = preference.indexOf(db[types[extension2]].source);
            var to = preference.indexOf(mime.source);
            if (types[extension2] !== "application/octet-stream" && (from > to || from === to && types[extension2].substr(0, 12) === "application/")) {
              continue;
            }
          }
          types[extension2] = type;
        }
      });
    }
  }
});

// ../../../../../node_modules/asynckit/lib/defer.js
var require_defer = __commonJS({
  "../../../../../node_modules/asynckit/lib/defer.js"(exports2, module2) {
    module2.exports = defer;
    function defer(fn) {
      var nextTick = typeof setImmediate == "function" ? setImmediate : typeof process == "object" && typeof process.nextTick == "function" ? process.nextTick : null;
      if (nextTick) {
        nextTick(fn);
      } else {
        setTimeout(fn, 0);
      }
    }
  }
});

// ../../../../../node_modules/asynckit/lib/async.js
var require_async = __commonJS({
  "../../../../../node_modules/asynckit/lib/async.js"(exports2, module2) {
    var defer = require_defer();
    module2.exports = async;
    function async(callback) {
      var isAsync = false;
      defer(function() {
        isAsync = true;
      });
      return function async_callback(err, result) {
        if (isAsync) {
          callback(err, result);
        } else {
          defer(function nextTick_callback() {
            callback(err, result);
          });
        }
      };
    }
  }
});

// ../../../../../node_modules/asynckit/lib/abort.js
var require_abort = __commonJS({
  "../../../../../node_modules/asynckit/lib/abort.js"(exports2, module2) {
    module2.exports = abort;
    function abort(state) {
      Object.keys(state.jobs).forEach(clean.bind(state));
      state.jobs = {};
    }
    function clean(key) {
      if (typeof this.jobs[key] == "function") {
        this.jobs[key]();
      }
    }
  }
});

// ../../../../../node_modules/asynckit/lib/iterate.js
var require_iterate = __commonJS({
  "../../../../../node_modules/asynckit/lib/iterate.js"(exports2, module2) {
    var async = require_async();
    var abort = require_abort();
    module2.exports = iterate;
    function iterate(list, iterator2, state, callback) {
      var key = state["keyedList"] ? state["keyedList"][state.index] : state.index;
      state.jobs[key] = runJob(iterator2, key, list[key], function(error, output) {
        if (!(key in state.jobs)) {
          return;
        }
        delete state.jobs[key];
        if (error) {
          abort(state);
        } else {
          state.results[key] = output;
        }
        callback(error, state.results);
      });
    }
    function runJob(iterator2, key, item, callback) {
      var aborter;
      if (iterator2.length == 2) {
        aborter = iterator2(item, async(callback));
      } else {
        aborter = iterator2(item, key, async(callback));
      }
      return aborter;
    }
  }
});

// ../../../../../node_modules/asynckit/lib/state.js
var require_state = __commonJS({
  "../../../../../node_modules/asynckit/lib/state.js"(exports2, module2) {
    module2.exports = state;
    function state(list, sortMethod) {
      var isNamedList = !Array.isArray(list), initState = {
        index: 0,
        keyedList: isNamedList || sortMethod ? Object.keys(list) : null,
        jobs: {},
        results: isNamedList ? {} : [],
        size: isNamedList ? Object.keys(list).length : list.length
      };
      if (sortMethod) {
        initState.keyedList.sort(isNamedList ? sortMethod : function(a, b) {
          return sortMethod(list[a], list[b]);
        });
      }
      return initState;
    }
  }
});

// ../../../../../node_modules/asynckit/lib/terminator.js
var require_terminator = __commonJS({
  "../../../../../node_modules/asynckit/lib/terminator.js"(exports2, module2) {
    var abort = require_abort();
    var async = require_async();
    module2.exports = terminator;
    function terminator(callback) {
      if (!Object.keys(this.jobs).length) {
        return;
      }
      this.index = this.size;
      abort(this);
      async(callback)(null, this.results);
    }
  }
});

// ../../../../../node_modules/asynckit/parallel.js
var require_parallel = __commonJS({
  "../../../../../node_modules/asynckit/parallel.js"(exports2, module2) {
    var iterate = require_iterate();
    var initState = require_state();
    var terminator = require_terminator();
    module2.exports = parallel;
    function parallel(list, iterator2, callback) {
      var state = initState(list);
      while (state.index < (state["keyedList"] || list).length) {
        iterate(list, iterator2, state, function(error, result) {
          if (error) {
            callback(error, result);
            return;
          }
          if (Object.keys(state.jobs).length === 0) {
            callback(null, state.results);
            return;
          }
        });
        state.index++;
      }
      return terminator.bind(state, callback);
    }
  }
});

// ../../../../../node_modules/asynckit/serialOrdered.js
var require_serialOrdered = __commonJS({
  "../../../../../node_modules/asynckit/serialOrdered.js"(exports2, module2) {
    var iterate = require_iterate();
    var initState = require_state();
    var terminator = require_terminator();
    module2.exports = serialOrdered;
    module2.exports.ascending = ascending;
    module2.exports.descending = descending;
    function serialOrdered(list, iterator2, sortMethod, callback) {
      var state = initState(list, sortMethod);
      iterate(list, iterator2, state, function iteratorHandler(error, result) {
        if (error) {
          callback(error, result);
          return;
        }
        state.index++;
        if (state.index < (state["keyedList"] || list).length) {
          iterate(list, iterator2, state, iteratorHandler);
          return;
        }
        callback(null, state.results);
      });
      return terminator.bind(state, callback);
    }
    function ascending(a, b) {
      return a < b ? -1 : a > b ? 1 : 0;
    }
    function descending(a, b) {
      return -1 * ascending(a, b);
    }
  }
});

// ../../../../../node_modules/asynckit/serial.js
var require_serial = __commonJS({
  "../../../../../node_modules/asynckit/serial.js"(exports2, module2) {
    var serialOrdered = require_serialOrdered();
    module2.exports = serial;
    function serial(list, iterator2, callback) {
      return serialOrdered(list, iterator2, null, callback);
    }
  }
});

// ../../../../../node_modules/asynckit/index.js
var require_asynckit = __commonJS({
  "../../../../../node_modules/asynckit/index.js"(exports2, module2) {
    module2.exports = {
      parallel: require_parallel(),
      serial: require_serial(),
      serialOrdered: require_serialOrdered()
    };
  }
});

// ../../../../../node_modules/es-object-atoms/index.js
var require_es_object_atoms = __commonJS({
  "../../../../../node_modules/es-object-atoms/index.js"(exports2, module2) {
    "use strict";
    module2.exports = Object;
  }
});

// ../../../../../node_modules/es-errors/index.js
var require_es_errors = __commonJS({
  "../../../../../node_modules/es-errors/index.js"(exports2, module2) {
    "use strict";
    module2.exports = Error;
  }
});

// ../../../../../node_modules/es-errors/eval.js
var require_eval = __commonJS({
  "../../../../../node_modules/es-errors/eval.js"(exports2, module2) {
    "use strict";
    module2.exports = EvalError;
  }
});

// ../../../../../node_modules/es-errors/range.js
var require_range = __commonJS({
  "../../../../../node_modules/es-errors/range.js"(exports2, module2) {
    "use strict";
    module2.exports = RangeError;
  }
});

// ../../../../../node_modules/es-errors/ref.js
var require_ref = __commonJS({
  "../../../../../node_modules/es-errors/ref.js"(exports2, module2) {
    "use strict";
    module2.exports = ReferenceError;
  }
});

// ../../../../../node_modules/es-errors/syntax.js
var require_syntax = __commonJS({
  "../../../../../node_modules/es-errors/syntax.js"(exports2, module2) {
    "use strict";
    module2.exports = SyntaxError;
  }
});

// ../../../../../node_modules/es-errors/type.js
var require_type = __commonJS({
  "../../../../../node_modules/es-errors/type.js"(exports2, module2) {
    "use strict";
    module2.exports = TypeError;
  }
});

// ../../../../../node_modules/es-errors/uri.js
var require_uri = __commonJS({
  "../../../../../node_modules/es-errors/uri.js"(exports2, module2) {
    "use strict";
    module2.exports = URIError;
  }
});

// ../../../../../node_modules/math-intrinsics/abs.js
var require_abs = __commonJS({
  "../../../../../node_modules/math-intrinsics/abs.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.abs;
  }
});

// ../../../../../node_modules/math-intrinsics/floor.js
var require_floor = __commonJS({
  "../../../../../node_modules/math-intrinsics/floor.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.floor;
  }
});

// ../../../../../node_modules/math-intrinsics/max.js
var require_max = __commonJS({
  "../../../../../node_modules/math-intrinsics/max.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.max;
  }
});

// ../../../../../node_modules/math-intrinsics/min.js
var require_min = __commonJS({
  "../../../../../node_modules/math-intrinsics/min.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.min;
  }
});

// ../../../../../node_modules/math-intrinsics/pow.js
var require_pow = __commonJS({
  "../../../../../node_modules/math-intrinsics/pow.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.pow;
  }
});

// ../../../../../node_modules/math-intrinsics/round.js
var require_round = __commonJS({
  "../../../../../node_modules/math-intrinsics/round.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.round;
  }
});

// ../../../../../node_modules/math-intrinsics/isNaN.js
var require_isNaN = __commonJS({
  "../../../../../node_modules/math-intrinsics/isNaN.js"(exports2, module2) {
    "use strict";
    module2.exports = Number.isNaN || function isNaN2(a) {
      return a !== a;
    };
  }
});

// ../../../../../node_modules/math-intrinsics/sign.js
var require_sign = __commonJS({
  "../../../../../node_modules/math-intrinsics/sign.js"(exports2, module2) {
    "use strict";
    var $isNaN = require_isNaN();
    module2.exports = function sign(number) {
      if ($isNaN(number) || number === 0) {
        return number;
      }
      return number < 0 ? -1 : 1;
    };
  }
});

// ../../../../../node_modules/gopd/gOPD.js
var require_gOPD = __commonJS({
  "../../../../../node_modules/gopd/gOPD.js"(exports2, module2) {
    "use strict";
    module2.exports = Object.getOwnPropertyDescriptor;
  }
});

// ../../../../../node_modules/gopd/index.js
var require_gopd = __commonJS({
  "../../../../../node_modules/gopd/index.js"(exports2, module2) {
    "use strict";
    var $gOPD = require_gOPD();
    if ($gOPD) {
      try {
        $gOPD([], "length");
      } catch (e) {
        $gOPD = null;
      }
    }
    module2.exports = $gOPD;
  }
});

// ../../../../../node_modules/es-define-property/index.js
var require_es_define_property = __commonJS({
  "../../../../../node_modules/es-define-property/index.js"(exports2, module2) {
    "use strict";
    var $defineProperty = Object.defineProperty || false;
    if ($defineProperty) {
      try {
        $defineProperty({}, "a", { value: 1 });
      } catch (e) {
        $defineProperty = false;
      }
    }
    module2.exports = $defineProperty;
  }
});

// ../../../../../node_modules/has-symbols/shams.js
var require_shams = __commonJS({
  "../../../../../node_modules/has-symbols/shams.js"(exports2, module2) {
    "use strict";
    module2.exports = function hasSymbols() {
      if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
        return false;
      }
      if (typeof Symbol.iterator === "symbol") {
        return true;
      }
      var obj = {};
      var sym = Symbol("test");
      var symObj = Object(sym);
      if (typeof sym === "string") {
        return false;
      }
      if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
        return false;
      }
      if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
        return false;
      }
      var symVal = 42;
      obj[sym] = symVal;
      for (var _ in obj) {
        return false;
      }
      if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
        return false;
      }
      if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
        return false;
      }
      var syms = Object.getOwnPropertySymbols(obj);
      if (syms.length !== 1 || syms[0] !== sym) {
        return false;
      }
      if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
        return false;
      }
      if (typeof Object.getOwnPropertyDescriptor === "function") {
        var descriptor = (
          /** @type {PropertyDescriptor} */
          Object.getOwnPropertyDescriptor(obj, sym)
        );
        if (descriptor.value !== symVal || descriptor.enumerable !== true) {
          return false;
        }
      }
      return true;
    };
  }
});

// ../../../../../node_modules/has-symbols/index.js
var require_has_symbols = __commonJS({
  "../../../../../node_modules/has-symbols/index.js"(exports2, module2) {
    "use strict";
    var origSymbol = typeof Symbol !== "undefined" && Symbol;
    var hasSymbolSham = require_shams();
    module2.exports = function hasNativeSymbols() {
      if (typeof origSymbol !== "function") {
        return false;
      }
      if (typeof Symbol !== "function") {
        return false;
      }
      if (typeof origSymbol("foo") !== "symbol") {
        return false;
      }
      if (typeof Symbol("bar") !== "symbol") {
        return false;
      }
      return hasSymbolSham();
    };
  }
});

// ../../../../../node_modules/get-proto/Reflect.getPrototypeOf.js
var require_Reflect_getPrototypeOf = __commonJS({
  "../../../../../node_modules/get-proto/Reflect.getPrototypeOf.js"(exports2, module2) {
    "use strict";
    module2.exports = typeof Reflect !== "undefined" && Reflect.getPrototypeOf || null;
  }
});

// ../../../../../node_modules/get-proto/Object.getPrototypeOf.js
var require_Object_getPrototypeOf = __commonJS({
  "../../../../../node_modules/get-proto/Object.getPrototypeOf.js"(exports2, module2) {
    "use strict";
    var $Object = require_es_object_atoms();
    module2.exports = $Object.getPrototypeOf || null;
  }
});

// ../../../../../node_modules/function-bind/implementation.js
var require_implementation = __commonJS({
  "../../../../../node_modules/function-bind/implementation.js"(exports2, module2) {
    "use strict";
    var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
    var toStr = Object.prototype.toString;
    var max = Math.max;
    var funcType = "[object Function]";
    var concatty = function concatty2(a, b) {
      var arr = [];
      for (var i = 0; i < a.length; i += 1) {
        arr[i] = a[i];
      }
      for (var j = 0; j < b.length; j += 1) {
        arr[j + a.length] = b[j];
      }
      return arr;
    };
    var slicy = function slicy2(arrLike, offset) {
      var arr = [];
      for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) {
        arr[j] = arrLike[i];
      }
      return arr;
    };
    var joiny = function(arr, joiner) {
      var str = "";
      for (var i = 0; i < arr.length; i += 1) {
        str += arr[i];
        if (i + 1 < arr.length) {
          str += joiner;
        }
      }
      return str;
    };
    module2.exports = function bind2(that) {
      var target = this;
      if (typeof target !== "function" || toStr.apply(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
      }
      var args = slicy(arguments, 1);
      var bound;
      var binder = function() {
        if (this instanceof bound) {
          var result = target.apply(
            this,
            concatty(args, arguments)
          );
          if (Object(result) === result) {
            return result;
          }
          return this;
        }
        return target.apply(
          that,
          concatty(args, arguments)
        );
      };
      var boundLength = max(0, target.length - args.length);
      var boundArgs = [];
      for (var i = 0; i < boundLength; i++) {
        boundArgs[i] = "$" + i;
      }
      bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
      if (target.prototype) {
        var Empty = function Empty2() {
        };
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
      }
      return bound;
    };
  }
});

// ../../../../../node_modules/function-bind/index.js
var require_function_bind = __commonJS({
  "../../../../../node_modules/function-bind/index.js"(exports2, module2) {
    "use strict";
    var implementation = require_implementation();
    module2.exports = Function.prototype.bind || implementation;
  }
});

// ../../../../../node_modules/call-bind-apply-helpers/functionCall.js
var require_functionCall = __commonJS({
  "../../../../../node_modules/call-bind-apply-helpers/functionCall.js"(exports2, module2) {
    "use strict";
    module2.exports = Function.prototype.call;
  }
});

// ../../../../../node_modules/call-bind-apply-helpers/functionApply.js
var require_functionApply = __commonJS({
  "../../../../../node_modules/call-bind-apply-helpers/functionApply.js"(exports2, module2) {
    "use strict";
    module2.exports = Function.prototype.apply;
  }
});

// ../../../../../node_modules/call-bind-apply-helpers/reflectApply.js
var require_reflectApply = __commonJS({
  "../../../../../node_modules/call-bind-apply-helpers/reflectApply.js"(exports2, module2) {
    "use strict";
    module2.exports = typeof Reflect !== "undefined" && Reflect && Reflect.apply;
  }
});

// ../../../../../node_modules/call-bind-apply-helpers/actualApply.js
var require_actualApply = __commonJS({
  "../../../../../node_modules/call-bind-apply-helpers/actualApply.js"(exports2, module2) {
    "use strict";
    var bind2 = require_function_bind();
    var $apply = require_functionApply();
    var $call = require_functionCall();
    var $reflectApply = require_reflectApply();
    module2.exports = $reflectApply || bind2.call($call, $apply);
  }
});

// ../../../../../node_modules/call-bind-apply-helpers/index.js
var require_call_bind_apply_helpers = __commonJS({
  "../../../../../node_modules/call-bind-apply-helpers/index.js"(exports2, module2) {
    "use strict";
    var bind2 = require_function_bind();
    var $TypeError = require_type();
    var $call = require_functionCall();
    var $actualApply = require_actualApply();
    module2.exports = function callBindBasic(args) {
      if (args.length < 1 || typeof args[0] !== "function") {
        throw new $TypeError("a function is required");
      }
      return $actualApply(bind2, $call, args);
    };
  }
});

// ../../../../../node_modules/dunder-proto/get.js
var require_get = __commonJS({
  "../../../../../node_modules/dunder-proto/get.js"(exports2, module2) {
    "use strict";
    var callBind = require_call_bind_apply_helpers();
    var gOPD = require_gopd();
    var hasProtoAccessor;
    try {
      hasProtoAccessor = /** @type {{ __proto__?: typeof Array.prototype }} */
      [].__proto__ === Array.prototype;
    } catch (e) {
      if (!e || typeof e !== "object" || !("code" in e) || e.code !== "ERR_PROTO_ACCESS") {
        throw e;
      }
    }
    var desc = !!hasProtoAccessor && gOPD && gOPD(
      Object.prototype,
      /** @type {keyof typeof Object.prototype} */
      "__proto__"
    );
    var $Object = Object;
    var $getPrototypeOf = $Object.getPrototypeOf;
    module2.exports = desc && typeof desc.get === "function" ? callBind([desc.get]) : typeof $getPrototypeOf === "function" ? (
      /** @type {import('./get')} */
      function getDunder(value) {
        return $getPrototypeOf(value == null ? value : $Object(value));
      }
    ) : false;
  }
});

// ../../../../../node_modules/get-proto/index.js
var require_get_proto = __commonJS({
  "../../../../../node_modules/get-proto/index.js"(exports2, module2) {
    "use strict";
    var reflectGetProto = require_Reflect_getPrototypeOf();
    var originalGetProto = require_Object_getPrototypeOf();
    var getDunderProto = require_get();
    module2.exports = reflectGetProto ? function getProto(O) {
      return reflectGetProto(O);
    } : originalGetProto ? function getProto(O) {
      if (!O || typeof O !== "object" && typeof O !== "function") {
        throw new TypeError("getProto: not an object");
      }
      return originalGetProto(O);
    } : getDunderProto ? function getProto(O) {
      return getDunderProto(O);
    } : null;
  }
});

// ../../../../../node_modules/hasown/index.js
var require_hasown = __commonJS({
  "../../../../../node_modules/hasown/index.js"(exports2, module2) {
    "use strict";
    var call = Function.prototype.call;
    var $hasOwn = Object.prototype.hasOwnProperty;
    var bind2 = require_function_bind();
    module2.exports = bind2.call(call, $hasOwn);
  }
});

// ../../../../../node_modules/get-intrinsic/index.js
var require_get_intrinsic = __commonJS({
  "../../../../../node_modules/get-intrinsic/index.js"(exports2, module2) {
    "use strict";
    var undefined2;
    var $Object = require_es_object_atoms();
    var $Error = require_es_errors();
    var $EvalError = require_eval();
    var $RangeError = require_range();
    var $ReferenceError = require_ref();
    var $SyntaxError = require_syntax();
    var $TypeError = require_type();
    var $URIError = require_uri();
    var abs = require_abs();
    var floor = require_floor();
    var max = require_max();
    var min = require_min();
    var pow = require_pow();
    var round = require_round();
    var sign = require_sign();
    var $Function = Function;
    var getEvalledConstructor = function(expressionSyntax) {
      try {
        return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
      } catch (e) {
      }
    };
    var $gOPD = require_gopd();
    var $defineProperty = require_es_define_property();
    var throwTypeError = function() {
      throw new $TypeError();
    };
    var ThrowTypeError = $gOPD ? function() {
      try {
        arguments.callee;
        return throwTypeError;
      } catch (calleeThrows) {
        try {
          return $gOPD(arguments, "callee").get;
        } catch (gOPDthrows) {
          return throwTypeError;
        }
      }
    }() : throwTypeError;
    var hasSymbols = require_has_symbols()();
    var getProto = require_get_proto();
    var $ObjectGPO = require_Object_getPrototypeOf();
    var $ReflectGPO = require_Reflect_getPrototypeOf();
    var $apply = require_functionApply();
    var $call = require_functionCall();
    var needsEval = {};
    var TypedArray = typeof Uint8Array === "undefined" || !getProto ? undefined2 : getProto(Uint8Array);
    var INTRINSICS = {
      __proto__: null,
      "%AggregateError%": typeof AggregateError === "undefined" ? undefined2 : AggregateError,
      "%Array%": Array,
      "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined2 : ArrayBuffer,
      "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined2,
      "%AsyncFromSyncIteratorPrototype%": undefined2,
      "%AsyncFunction%": needsEval,
      "%AsyncGenerator%": needsEval,
      "%AsyncGeneratorFunction%": needsEval,
      "%AsyncIteratorPrototype%": needsEval,
      "%Atomics%": typeof Atomics === "undefined" ? undefined2 : Atomics,
      "%BigInt%": typeof BigInt === "undefined" ? undefined2 : BigInt,
      "%BigInt64Array%": typeof BigInt64Array === "undefined" ? undefined2 : BigInt64Array,
      "%BigUint64Array%": typeof BigUint64Array === "undefined" ? undefined2 : BigUint64Array,
      "%Boolean%": Boolean,
      "%DataView%": typeof DataView === "undefined" ? undefined2 : DataView,
      "%Date%": Date,
      "%decodeURI%": decodeURI,
      "%decodeURIComponent%": decodeURIComponent,
      "%encodeURI%": encodeURI,
      "%encodeURIComponent%": encodeURIComponent,
      "%Error%": $Error,
      "%eval%": eval,
      // eslint-disable-line no-eval
      "%EvalError%": $EvalError,
      "%Float16Array%": typeof Float16Array === "undefined" ? undefined2 : Float16Array,
      "%Float32Array%": typeof Float32Array === "undefined" ? undefined2 : Float32Array,
      "%Float64Array%": typeof Float64Array === "undefined" ? undefined2 : Float64Array,
      "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? undefined2 : FinalizationRegistry,
      "%Function%": $Function,
      "%GeneratorFunction%": needsEval,
      "%Int8Array%": typeof Int8Array === "undefined" ? undefined2 : Int8Array,
      "%Int16Array%": typeof Int16Array === "undefined" ? undefined2 : Int16Array,
      "%Int32Array%": typeof Int32Array === "undefined" ? undefined2 : Int32Array,
      "%isFinite%": isFinite,
      "%isNaN%": isNaN,
      "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined2,
      "%JSON%": typeof JSON === "object" ? JSON : undefined2,
      "%Map%": typeof Map === "undefined" ? undefined2 : Map,
      "%MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Map())[Symbol.iterator]()),
      "%Math%": Math,
      "%Number%": Number,
      "%Object%": $Object,
      "%Object.getOwnPropertyDescriptor%": $gOPD,
      "%parseFloat%": parseFloat,
      "%parseInt%": parseInt,
      "%Promise%": typeof Promise === "undefined" ? undefined2 : Promise,
      "%Proxy%": typeof Proxy === "undefined" ? undefined2 : Proxy,
      "%RangeError%": $RangeError,
      "%ReferenceError%": $ReferenceError,
      "%Reflect%": typeof Reflect === "undefined" ? undefined2 : Reflect,
      "%RegExp%": RegExp,
      "%Set%": typeof Set === "undefined" ? undefined2 : Set,
      "%SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Set())[Symbol.iterator]()),
      "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined2 : SharedArrayBuffer,
      "%String%": String,
      "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined2,
      "%Symbol%": hasSymbols ? Symbol : undefined2,
      "%SyntaxError%": $SyntaxError,
      "%ThrowTypeError%": ThrowTypeError,
      "%TypedArray%": TypedArray,
      "%TypeError%": $TypeError,
      "%Uint8Array%": typeof Uint8Array === "undefined" ? undefined2 : Uint8Array,
      "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined2 : Uint8ClampedArray,
      "%Uint16Array%": typeof Uint16Array === "undefined" ? undefined2 : Uint16Array,
      "%Uint32Array%": typeof Uint32Array === "undefined" ? undefined2 : Uint32Array,
      "%URIError%": $URIError,
      "%WeakMap%": typeof WeakMap === "undefined" ? undefined2 : WeakMap,
      "%WeakRef%": typeof WeakRef === "undefined" ? undefined2 : WeakRef,
      "%WeakSet%": typeof WeakSet === "undefined" ? undefined2 : WeakSet,
      "%Function.prototype.call%": $call,
      "%Function.prototype.apply%": $apply,
      "%Object.defineProperty%": $defineProperty,
      "%Object.getPrototypeOf%": $ObjectGPO,
      "%Math.abs%": abs,
      "%Math.floor%": floor,
      "%Math.max%": max,
      "%Math.min%": min,
      "%Math.pow%": pow,
      "%Math.round%": round,
      "%Math.sign%": sign,
      "%Reflect.getPrototypeOf%": $ReflectGPO
    };
    if (getProto) {
      try {
        null.error;
      } catch (e) {
        errorProto = getProto(getProto(e));
        INTRINSICS["%Error.prototype%"] = errorProto;
      }
    }
    var errorProto;
    var doEval = function doEval2(name) {
      var value;
      if (name === "%AsyncFunction%") {
        value = getEvalledConstructor("async function () {}");
      } else if (name === "%GeneratorFunction%") {
        value = getEvalledConstructor("function* () {}");
      } else if (name === "%AsyncGeneratorFunction%") {
        value = getEvalledConstructor("async function* () {}");
      } else if (name === "%AsyncGenerator%") {
        var fn = doEval2("%AsyncGeneratorFunction%");
        if (fn) {
          value = fn.prototype;
        }
      } else if (name === "%AsyncIteratorPrototype%") {
        var gen = doEval2("%AsyncGenerator%");
        if (gen && getProto) {
          value = getProto(gen.prototype);
        }
      }
      INTRINSICS[name] = value;
      return value;
    };
    var LEGACY_ALIASES = {
      __proto__: null,
      "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
      "%ArrayPrototype%": ["Array", "prototype"],
      "%ArrayProto_entries%": ["Array", "prototype", "entries"],
      "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
      "%ArrayProto_keys%": ["Array", "prototype", "keys"],
      "%ArrayProto_values%": ["Array", "prototype", "values"],
      "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
      "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
      "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
      "%BooleanPrototype%": ["Boolean", "prototype"],
      "%DataViewPrototype%": ["DataView", "prototype"],
      "%DatePrototype%": ["Date", "prototype"],
      "%ErrorPrototype%": ["Error", "prototype"],
      "%EvalErrorPrototype%": ["EvalError", "prototype"],
      "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
      "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
      "%FunctionPrototype%": ["Function", "prototype"],
      "%Generator%": ["GeneratorFunction", "prototype"],
      "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
      "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
      "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
      "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
      "%JSONParse%": ["JSON", "parse"],
      "%JSONStringify%": ["JSON", "stringify"],
      "%MapPrototype%": ["Map", "prototype"],
      "%NumberPrototype%": ["Number", "prototype"],
      "%ObjectPrototype%": ["Object", "prototype"],
      "%ObjProto_toString%": ["Object", "prototype", "toString"],
      "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
      "%PromisePrototype%": ["Promise", "prototype"],
      "%PromiseProto_then%": ["Promise", "prototype", "then"],
      "%Promise_all%": ["Promise", "all"],
      "%Promise_reject%": ["Promise", "reject"],
      "%Promise_resolve%": ["Promise", "resolve"],
      "%RangeErrorPrototype%": ["RangeError", "prototype"],
      "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
      "%RegExpPrototype%": ["RegExp", "prototype"],
      "%SetPrototype%": ["Set", "prototype"],
      "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
      "%StringPrototype%": ["String", "prototype"],
      "%SymbolPrototype%": ["Symbol", "prototype"],
      "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
      "%TypedArrayPrototype%": ["TypedArray", "prototype"],
      "%TypeErrorPrototype%": ["TypeError", "prototype"],
      "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
      "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
      "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
      "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
      "%URIErrorPrototype%": ["URIError", "prototype"],
      "%WeakMapPrototype%": ["WeakMap", "prototype"],
      "%WeakSetPrototype%": ["WeakSet", "prototype"]
    };
    var bind2 = require_function_bind();
    var hasOwn = require_hasown();
    var $concat = bind2.call($call, Array.prototype.concat);
    var $spliceApply = bind2.call($apply, Array.prototype.splice);
    var $replace = bind2.call($call, String.prototype.replace);
    var $strSlice = bind2.call($call, String.prototype.slice);
    var $exec = bind2.call($call, RegExp.prototype.exec);
    var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
    var reEscapeChar = /\\(\\)?/g;
    var stringToPath = function stringToPath2(string) {
      var first = $strSlice(string, 0, 1);
      var last = $strSlice(string, -1);
      if (first === "%" && last !== "%") {
        throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
      } else if (last === "%" && first !== "%") {
        throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
      }
      var result = [];
      $replace(string, rePropName, function(match, number, quote, subString) {
        result[result.length] = quote ? $replace(subString, reEscapeChar, "$1") : number || match;
      });
      return result;
    };
    var getBaseIntrinsic = function getBaseIntrinsic2(name, allowMissing) {
      var intrinsicName = name;
      var alias;
      if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
        alias = LEGACY_ALIASES[intrinsicName];
        intrinsicName = "%" + alias[0] + "%";
      }
      if (hasOwn(INTRINSICS, intrinsicName)) {
        var value = INTRINSICS[intrinsicName];
        if (value === needsEval) {
          value = doEval(intrinsicName);
        }
        if (typeof value === "undefined" && !allowMissing) {
          throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
        }
        return {
          alias,
          name: intrinsicName,
          value
        };
      }
      throw new $SyntaxError("intrinsic " + name + " does not exist!");
    };
    module2.exports = function GetIntrinsic(name, allowMissing) {
      if (typeof name !== "string" || name.length === 0) {
        throw new $TypeError("intrinsic name must be a non-empty string");
      }
      if (arguments.length > 1 && typeof allowMissing !== "boolean") {
        throw new $TypeError('"allowMissing" argument must be a boolean');
      }
      if ($exec(/^%?[^%]*%?$/, name) === null) {
        throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
      }
      var parts = stringToPath(name);
      var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
      var intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
      var intrinsicRealName = intrinsic.name;
      var value = intrinsic.value;
      var skipFurtherCaching = false;
      var alias = intrinsic.alias;
      if (alias) {
        intrinsicBaseName = alias[0];
        $spliceApply(parts, $concat([0, 1], alias));
      }
      for (var i = 1, isOwn = true; i < parts.length; i += 1) {
        var part = parts[i];
        var first = $strSlice(part, 0, 1);
        var last = $strSlice(part, -1);
        if ((first === '"' || first === "'" || first === "`" || (last === '"' || last === "'" || last === "`")) && first !== last) {
          throw new $SyntaxError("property names with quotes must have matching quotes");
        }
        if (part === "constructor" || !isOwn) {
          skipFurtherCaching = true;
        }
        intrinsicBaseName += "." + part;
        intrinsicRealName = "%" + intrinsicBaseName + "%";
        if (hasOwn(INTRINSICS, intrinsicRealName)) {
          value = INTRINSICS[intrinsicRealName];
        } else if (value != null) {
          if (!(part in value)) {
            if (!allowMissing) {
              throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
            }
            return void 0;
          }
          if ($gOPD && i + 1 >= parts.length) {
            var desc = $gOPD(value, part);
            isOwn = !!desc;
            if (isOwn && "get" in desc && !("originalValue" in desc.get)) {
              value = desc.get;
            } else {
              value = value[part];
            }
          } else {
            isOwn = hasOwn(value, part);
            value = value[part];
          }
          if (isOwn && !skipFurtherCaching) {
            INTRINSICS[intrinsicRealName] = value;
          }
        }
      }
      return value;
    };
  }
});

// ../../../../../node_modules/has-tostringtag/shams.js
var require_shams2 = __commonJS({
  "../../../../../node_modules/has-tostringtag/shams.js"(exports2, module2) {
    "use strict";
    var hasSymbols = require_shams();
    module2.exports = function hasToStringTagShams() {
      return hasSymbols() && !!Symbol.toStringTag;
    };
  }
});

// ../../../../../node_modules/es-set-tostringtag/index.js
var require_es_set_tostringtag = __commonJS({
  "../../../../../node_modules/es-set-tostringtag/index.js"(exports2, module2) {
    "use strict";
    var GetIntrinsic = require_get_intrinsic();
    var $defineProperty = GetIntrinsic("%Object.defineProperty%", true);
    var hasToStringTag = require_shams2()();
    var hasOwn = require_hasown();
    var $TypeError = require_type();
    var toStringTag2 = hasToStringTag ? Symbol.toStringTag : null;
    module2.exports = function setToStringTag(object, value) {
      var overrideIfSet = arguments.length > 2 && !!arguments[2] && arguments[2].force;
      var nonConfigurable = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
      if (typeof overrideIfSet !== "undefined" && typeof overrideIfSet !== "boolean" || typeof nonConfigurable !== "undefined" && typeof nonConfigurable !== "boolean") {
        throw new $TypeError("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
      }
      if (toStringTag2 && (overrideIfSet || !hasOwn(object, toStringTag2))) {
        if ($defineProperty) {
          $defineProperty(object, toStringTag2, {
            configurable: !nonConfigurable,
            enumerable: false,
            value,
            writable: false
          });
        } else {
          object[toStringTag2] = value;
        }
      }
    };
  }
});

// ../../../../../node_modules/form-data/lib/populate.js
var require_populate = __commonJS({
  "../../../../../node_modules/form-data/lib/populate.js"(exports2, module2) {
    "use strict";
    module2.exports = function(dst, src) {
      Object.keys(src).forEach(function(prop) {
        dst[prop] = dst[prop] || src[prop];
      });
      return dst;
    };
  }
});

// ../../../../../node_modules/form-data/lib/form_data.js
var require_form_data = __commonJS({
  "../../../../../node_modules/form-data/lib/form_data.js"(exports2, module2) {
    "use strict";
    var CombinedStream = require_combined_stream();
    var util3 = require("util");
    var path = require("path");
    var http3 = require("http");
    var https2 = require("https");
    var parseUrl2 = require("url").parse;
    var fs = require("fs");
    var Stream = require("stream").Stream;
    var crypto3 = require("crypto");
    var mime = require_mime_types();
    var asynckit = require_asynckit();
    var setToStringTag = require_es_set_tostringtag();
    var hasOwn = require_hasown();
    var populate = require_populate();
    function FormData3(options) {
      if (!(this instanceof FormData3)) {
        return new FormData3(options);
      }
      this._overheadLength = 0;
      this._valueLength = 0;
      this._valuesToMeasure = [];
      CombinedStream.call(this);
      options = options || {};
      for (var option in options) {
        this[option] = options[option];
      }
    }
    util3.inherits(FormData3, CombinedStream);
    FormData3.LINE_BREAK = "\r\n";
    FormData3.DEFAULT_CONTENT_TYPE = "application/octet-stream";
    FormData3.prototype.append = function(field, value, options) {
      options = options || {};
      if (typeof options === "string") {
        options = { filename: options };
      }
      var append2 = CombinedStream.prototype.append.bind(this);
      if (typeof value === "number" || value == null) {
        value = String(value);
      }
      if (Array.isArray(value)) {
        this._error(new Error("Arrays are not supported."));
        return;
      }
      var header = this._multiPartHeader(field, value, options);
      var footer = this._multiPartFooter();
      append2(header);
      append2(value);
      append2(footer);
      this._trackLength(header, value, options);
    };
    FormData3.prototype._trackLength = function(header, value, options) {
      var valueLength = 0;
      if (options.knownLength != null) {
        valueLength += Number(options.knownLength);
      } else if (Buffer.isBuffer(value)) {
        valueLength = value.length;
      } else if (typeof value === "string") {
        valueLength = Buffer.byteLength(value);
      }
      this._valueLength += valueLength;
      this._overheadLength += Buffer.byteLength(header) + FormData3.LINE_BREAK.length;
      if (!value || !value.path && !(value.readable && hasOwn(value, "httpVersion")) && !(value instanceof Stream)) {
        return;
      }
      if (!options.knownLength) {
        this._valuesToMeasure.push(value);
      }
    };
    FormData3.prototype._lengthRetriever = function(value, callback) {
      if (hasOwn(value, "fd")) {
        if (value.end != void 0 && value.end != Infinity && value.start != void 0) {
          callback(null, value.end + 1 - (value.start ? value.start : 0));
        } else {
          fs.stat(value.path, function(err, stat) {
            if (err) {
              callback(err);
              return;
            }
            var fileSize = stat.size - (value.start ? value.start : 0);
            callback(null, fileSize);
          });
        }
      } else if (hasOwn(value, "httpVersion")) {
        callback(null, Number(value.headers["content-length"]));
      } else if (hasOwn(value, "httpModule")) {
        value.on("response", function(response) {
          value.pause();
          callback(null, Number(response.headers["content-length"]));
        });
        value.resume();
      } else {
        callback("Unknown stream");
      }
    };
    FormData3.prototype._multiPartHeader = function(field, value, options) {
      if (typeof options.header === "string") {
        return options.header;
      }
      var contentDisposition = this._getContentDisposition(value, options);
      var contentType = this._getContentType(value, options);
      var contents = "";
      var headers = {
        // add custom disposition as third element or keep it two elements if not
        "Content-Disposition": ["form-data", 'name="' + field + '"'].concat(contentDisposition || []),
        // if no content type. allow it to be empty array
        "Content-Type": [].concat(contentType || [])
      };
      if (typeof options.header === "object") {
        populate(headers, options.header);
      }
      var header;
      for (var prop in headers) {
        if (hasOwn(headers, prop)) {
          header = headers[prop];
          if (header == null) {
            continue;
          }
          if (!Array.isArray(header)) {
            header = [header];
          }
          if (header.length) {
            contents += prop + ": " + header.join("; ") + FormData3.LINE_BREAK;
          }
        }
      }
      return "--" + this.getBoundary() + FormData3.LINE_BREAK + contents + FormData3.LINE_BREAK;
    };
    FormData3.prototype._getContentDisposition = function(value, options) {
      var filename;
      if (typeof options.filepath === "string") {
        filename = path.normalize(options.filepath).replace(/\\/g, "/");
      } else if (options.filename || value && (value.name || value.path)) {
        filename = path.basename(options.filename || value && (value.name || value.path));
      } else if (value && value.readable && hasOwn(value, "httpVersion")) {
        filename = path.basename(value.client._httpMessage.path || "");
      }
      if (filename) {
        return 'filename="' + filename + '"';
      }
    };
    FormData3.prototype._getContentType = function(value, options) {
      var contentType = options.contentType;
      if (!contentType && value && value.name) {
        contentType = mime.lookup(value.name);
      }
      if (!contentType && value && value.path) {
        contentType = mime.lookup(value.path);
      }
      if (!contentType && value && value.readable && hasOwn(value, "httpVersion")) {
        contentType = value.headers["content-type"];
      }
      if (!contentType && (options.filepath || options.filename)) {
        contentType = mime.lookup(options.filepath || options.filename);
      }
      if (!contentType && value && typeof value === "object") {
        contentType = FormData3.DEFAULT_CONTENT_TYPE;
      }
      return contentType;
    };
    FormData3.prototype._multiPartFooter = function() {
      return function(next) {
        var footer = FormData3.LINE_BREAK;
        var lastPart = this._streams.length === 0;
        if (lastPart) {
          footer += this._lastBoundary();
        }
        next(footer);
      }.bind(this);
    };
    FormData3.prototype._lastBoundary = function() {
      return "--" + this.getBoundary() + "--" + FormData3.LINE_BREAK;
    };
    FormData3.prototype.getHeaders = function(userHeaders) {
      var header;
      var formHeaders = {
        "content-type": "multipart/form-data; boundary=" + this.getBoundary()
      };
      for (header in userHeaders) {
        if (hasOwn(userHeaders, header)) {
          formHeaders[header.toLowerCase()] = userHeaders[header];
        }
      }
      return formHeaders;
    };
    FormData3.prototype.setBoundary = function(boundary) {
      if (typeof boundary !== "string") {
        throw new TypeError("FormData boundary must be a string");
      }
      this._boundary = boundary;
    };
    FormData3.prototype.getBoundary = function() {
      if (!this._boundary) {
        this._generateBoundary();
      }
      return this._boundary;
    };
    FormData3.prototype.getBuffer = function() {
      var dataBuffer = new Buffer.alloc(0);
      var boundary = this.getBoundary();
      for (var i = 0, len = this._streams.length; i < len; i++) {
        if (typeof this._streams[i] !== "function") {
          if (Buffer.isBuffer(this._streams[i])) {
            dataBuffer = Buffer.concat([dataBuffer, this._streams[i]]);
          } else {
            dataBuffer = Buffer.concat([dataBuffer, Buffer.from(this._streams[i])]);
          }
          if (typeof this._streams[i] !== "string" || this._streams[i].substring(2, boundary.length + 2) !== boundary) {
            dataBuffer = Buffer.concat([dataBuffer, Buffer.from(FormData3.LINE_BREAK)]);
          }
        }
      }
      return Buffer.concat([dataBuffer, Buffer.from(this._lastBoundary())]);
    };
    FormData3.prototype._generateBoundary = function() {
      this._boundary = "--------------------------" + crypto3.randomBytes(12).toString("hex");
    };
    FormData3.prototype.getLengthSync = function() {
      var knownLength = this._overheadLength + this._valueLength;
      if (this._streams.length) {
        knownLength += this._lastBoundary().length;
      }
      if (!this.hasKnownLength()) {
        this._error(new Error("Cannot calculate proper length in synchronous way."));
      }
      return knownLength;
    };
    FormData3.prototype.hasKnownLength = function() {
      var hasKnownLength = true;
      if (this._valuesToMeasure.length) {
        hasKnownLength = false;
      }
      return hasKnownLength;
    };
    FormData3.prototype.getLength = function(cb) {
      var knownLength = this._overheadLength + this._valueLength;
      if (this._streams.length) {
        knownLength += this._lastBoundary().length;
      }
      if (!this._valuesToMeasure.length) {
        process.nextTick(cb.bind(this, null, knownLength));
        return;
      }
      asynckit.parallel(this._valuesToMeasure, this._lengthRetriever, function(err, values) {
        if (err) {
          cb(err);
          return;
        }
        values.forEach(function(length) {
          knownLength += length;
        });
        cb(null, knownLength);
      });
    };
    FormData3.prototype.submit = function(params, cb) {
      var request;
      var options;
      var defaults2 = { method: "post" };
      if (typeof params === "string") {
        params = parseUrl2(params);
        options = populate({
          port: params.port,
          path: params.pathname,
          host: params.hostname,
          protocol: params.protocol
        }, defaults2);
      } else {
        options = populate(params, defaults2);
        if (!options.port) {
          options.port = options.protocol === "https:" ? 443 : 80;
        }
      }
      options.headers = this.getHeaders(params.headers);
      if (options.protocol === "https:") {
        request = https2.request(options);
      } else {
        request = http3.request(options);
      }
      this.getLength(function(err, length) {
        if (err && err !== "Unknown stream") {
          this._error(err);
          return;
        }
        if (length) {
          request.setHeader("Content-Length", length);
        }
        this.pipe(request);
        if (cb) {
          var onResponse;
          var callback = function(error, responce) {
            request.removeListener("error", callback);
            request.removeListener("response", onResponse);
            return cb.call(this, error, responce);
          };
          onResponse = callback.bind(this, null);
          request.on("error", callback);
          request.on("response", onResponse);
        }
      }.bind(this));
      return request;
    };
    FormData3.prototype._error = function(err) {
      if (!this.error) {
        this.error = err;
        this.pause();
        this.emit("error", err);
      }
    };
    FormData3.prototype.toString = function() {
      return "[object FormData]";
    };
    setToStringTag(FormData3.prototype, "FormData");
    module2.exports = FormData3;
  }
});

// ../../../../../node_modules/axios/lib/platform/node/classes/FormData.js
var import_form_data, FormData_default;
var init_FormData = __esm({
  "../../../../../node_modules/axios/lib/platform/node/classes/FormData.js"() {
    import_form_data = __toESM(require_form_data(), 1);
    FormData_default = import_form_data.default;
  }
});

// ../../../../../node_modules/axios/lib/helpers/toFormData.js
function isVisitable(thing) {
  return utils_default.isPlainObject(thing) || utils_default.isArray(thing);
}
function removeBrackets(key) {
  return utils_default.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
function renderKey(path, key, dots) {
  if (!path) return key;
  return path.concat(key).map(function each(token, i) {
    token = removeBrackets(token);
    return !dots && i ? "[" + token + "]" : token;
  }).join(dots ? "." : "");
}
function isFlatArray(arr) {
  return utils_default.isArray(arr) && !arr.some(isVisitable);
}
function toFormData(obj, formData, options) {
  if (!utils_default.isObject(obj)) {
    throw new TypeError("target must be an object");
  }
  formData = formData || new (FormData_default || FormData)();
  options = utils_default.toFlatObject(
    options,
    {
      metaTokens: true,
      dots: false,
      indexes: false
    },
    false,
    function defined(option, source) {
      return !utils_default.isUndefined(source[option]);
    }
  );
  const metaTokens = options.metaTokens;
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
  const maxDepth = options.maxDepth === void 0 ? 100 : options.maxDepth;
  const useBlob = _Blob && utils_default.isSpecCompliantForm(formData);
  if (!utils_default.isFunction(visitor)) {
    throw new TypeError("visitor must be a function");
  }
  function convertValue(value) {
    if (value === null) return "";
    if (utils_default.isDate(value)) {
      return value.toISOString();
    }
    if (utils_default.isBoolean(value)) {
      return value.toString();
    }
    if (!useBlob && utils_default.isBlob(value)) {
      throw new AxiosError_default("Blob is not supported. Use a Buffer instead.");
    }
    if (utils_default.isArrayBuffer(value) || utils_default.isTypedArray(value)) {
      return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
    }
    return value;
  }
  function defaultVisitor(value, key, path) {
    let arr = value;
    if (utils_default.isReactNative(formData) && utils_default.isReactNativeBlob(value)) {
      formData.append(renderKey(path, key, dots), convertValue(value));
      return false;
    }
    if (value && !path && typeof value === "object") {
      if (utils_default.endsWith(key, "{}")) {
        key = metaTokens ? key : key.slice(0, -2);
        value = JSON.stringify(value);
      } else if (utils_default.isArray(value) && isFlatArray(value) || (utils_default.isFileList(value) || utils_default.endsWith(key, "[]")) && (arr = utils_default.toArray(value))) {
        key = removeBrackets(key);
        arr.forEach(function each(el, index) {
          !(utils_default.isUndefined(el) || el === null) && formData.append(
            // eslint-disable-next-line no-nested-ternary
            indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
            convertValue(el)
          );
        });
        return false;
      }
    }
    if (isVisitable(value)) {
      return true;
    }
    formData.append(renderKey(path, key, dots), convertValue(value));
    return false;
  }
  const stack = [];
  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });
  function build(value, path, depth = 0) {
    if (utils_default.isUndefined(value)) return;
    if (depth > maxDepth) {
      throw new AxiosError_default(
        "Object is too deeply nested (" + depth + " levels). Max depth: " + maxDepth,
        AxiosError_default.ERR_FORM_DATA_DEPTH_EXCEEDED
      );
    }
    if (stack.indexOf(value) !== -1) {
      throw Error("Circular reference detected in " + path.join("."));
    }
    stack.push(value);
    utils_default.forEach(value, function each(el, key) {
      const result = !(utils_default.isUndefined(el) || el === null) && visitor.call(formData, el, utils_default.isString(key) ? key.trim() : key, path, exposedHelpers);
      if (result === true) {
        build(el, path ? path.concat(key) : [key], depth + 1);
      }
    });
    stack.pop();
  }
  if (!utils_default.isObject(obj)) {
    throw new TypeError("data must be an object");
  }
  build(obj);
  return formData;
}
var predicates, toFormData_default;
var init_toFormData = __esm({
  "../../../../../node_modules/axios/lib/helpers/toFormData.js"() {
    "use strict";
    init_utils();
    init_AxiosError();
    init_FormData();
    predicates = utils_default.toFlatObject(utils_default, {}, null, function filter(prop) {
      return /^is[A-Z]/.test(prop);
    });
    toFormData_default = toFormData;
  }
});

// ../../../../../node_modules/axios/lib/helpers/AxiosURLSearchParams.js
function encode(str) {
  const charMap = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+"
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20/g, function replacer(match) {
    return charMap[match];
  });
}
function AxiosURLSearchParams(params, options) {
  this._pairs = [];
  params && toFormData_default(params, this, options);
}
var prototype, AxiosURLSearchParams_default;
var init_AxiosURLSearchParams = __esm({
  "../../../../../node_modules/axios/lib/helpers/AxiosURLSearchParams.js"() {
    "use strict";
    init_toFormData();
    prototype = AxiosURLSearchParams.prototype;
    prototype.append = function append(name, value) {
      this._pairs.push([name, value]);
    };
    prototype.toString = function toString2(encoder) {
      const _encode = encoder ? function(value) {
        return encoder.call(this, value, encode);
      } : encode;
      return this._pairs.map(function each(pair) {
        return _encode(pair[0]) + "=" + _encode(pair[1]);
      }, "").join("&");
    };
    AxiosURLSearchParams_default = AxiosURLSearchParams;
  }
});

// ../../../../../node_modules/axios/lib/helpers/buildURL.js
function encode2(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
function buildURL(url2, params, options) {
  if (!params) {
    return url2;
  }
  const _encode = options && options.encode || encode2;
  const _options = utils_default.isFunction(options) ? {
    serialize: options
  } : options;
  const serializeFn = _options && _options.serialize;
  let serializedParams;
  if (serializeFn) {
    serializedParams = serializeFn(params, _options);
  } else {
    serializedParams = utils_default.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams_default(params, _options).toString(_encode);
  }
  if (serializedParams) {
    const hashmarkIndex = url2.indexOf("#");
    if (hashmarkIndex !== -1) {
      url2 = url2.slice(0, hashmarkIndex);
    }
    url2 += (url2.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url2;
}
var init_buildURL = __esm({
  "../../../../../node_modules/axios/lib/helpers/buildURL.js"() {
    "use strict";
    init_utils();
    init_AxiosURLSearchParams();
  }
});

// ../../../../../node_modules/axios/lib/core/InterceptorManager.js
var InterceptorManager, InterceptorManager_default;
var init_InterceptorManager = __esm({
  "../../../../../node_modules/axios/lib/core/InterceptorManager.js"() {
    "use strict";
    init_utils();
    InterceptorManager = class {
      constructor() {
        this.handlers = [];
      }
      /**
       * Add a new interceptor to the stack
       *
       * @param {Function} fulfilled The function to handle `then` for a `Promise`
       * @param {Function} rejected The function to handle `reject` for a `Promise`
       * @param {Object} options The options for the interceptor, synchronous and runWhen
       *
       * @return {Number} An ID used to remove interceptor later
       */
      use(fulfilled, rejected, options) {
        this.handlers.push({
          fulfilled,
          rejected,
          synchronous: options ? options.synchronous : false,
          runWhen: options ? options.runWhen : null
        });
        return this.handlers.length - 1;
      }
      /**
       * Remove an interceptor from the stack
       *
       * @param {Number} id The ID that was returned by `use`
       *
       * @returns {void}
       */
      eject(id) {
        if (this.handlers[id]) {
          this.handlers[id] = null;
        }
      }
      /**
       * Clear all interceptors from the stack
       *
       * @returns {void}
       */
      clear() {
        if (this.handlers) {
          this.handlers = [];
        }
      }
      /**
       * Iterate over all the registered interceptors
       *
       * This method is particularly useful for skipping over any
       * interceptors that may have become `null` calling `eject`.
       *
       * @param {Function} fn The function to call for each interceptor
       *
       * @returns {void}
       */
      forEach(fn) {
        utils_default.forEach(this.handlers, function forEachHandler(h) {
          if (h !== null) {
            fn(h);
          }
        });
      }
    };
    InterceptorManager_default = InterceptorManager;
  }
});

// ../../../../../node_modules/axios/lib/defaults/transitional.js
var transitional_default;
var init_transitional = __esm({
  "../../../../../node_modules/axios/lib/defaults/transitional.js"() {
    "use strict";
    transitional_default = {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false,
      legacyInterceptorReqResOrdering: true
    };
  }
});

// ../../../../../node_modules/axios/lib/platform/node/classes/URLSearchParams.js
var import_url, URLSearchParams_default;
var init_URLSearchParams = __esm({
  "../../../../../node_modules/axios/lib/platform/node/classes/URLSearchParams.js"() {
    "use strict";
    import_url = __toESM(require("url"), 1);
    URLSearchParams_default = import_url.default.URLSearchParams;
  }
});

// ../../../../../node_modules/axios/lib/platform/node/index.js
var import_crypto, ALPHA, DIGIT, ALPHABET, generateString, node_default;
var init_node = __esm({
  "../../../../../node_modules/axios/lib/platform/node/index.js"() {
    import_crypto = __toESM(require("crypto"), 1);
    init_URLSearchParams();
    init_FormData();
    ALPHA = "abcdefghijklmnopqrstuvwxyz";
    DIGIT = "0123456789";
    ALPHABET = {
      DIGIT,
      ALPHA,
      ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
    };
    generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
      let str = "";
      const { length } = alphabet;
      const randomValues = new Uint32Array(size);
      import_crypto.default.randomFillSync(randomValues);
      for (let i = 0; i < size; i++) {
        str += alphabet[randomValues[i] % length];
      }
      return str;
    };
    node_default = {
      isNode: true,
      classes: {
        URLSearchParams: URLSearchParams_default,
        FormData: FormData_default,
        Blob: typeof Blob !== "undefined" && Blob || null
      },
      ALPHABET,
      generateString,
      protocols: ["http", "https", "file", "data"]
    };
  }
});

// ../../../../../node_modules/axios/lib/platform/common/utils.js
var utils_exports = {};
__export(utils_exports, {
  hasBrowserEnv: () => hasBrowserEnv,
  hasStandardBrowserEnv: () => hasStandardBrowserEnv,
  hasStandardBrowserWebWorkerEnv: () => hasStandardBrowserWebWorkerEnv,
  navigator: () => _navigator,
  origin: () => origin
});
var hasBrowserEnv, _navigator, hasStandardBrowserEnv, hasStandardBrowserWebWorkerEnv, origin;
var init_utils2 = __esm({
  "../../../../../node_modules/axios/lib/platform/common/utils.js"() {
    hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
    _navigator = typeof navigator === "object" && navigator || void 0;
    hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
    hasStandardBrowserWebWorkerEnv = (() => {
      return typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
      self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
    })();
    origin = hasBrowserEnv && window.location.href || "http://localhost";
  }
});

// ../../../../../node_modules/axios/lib/platform/index.js
var platform_default;
var init_platform = __esm({
  "../../../../../node_modules/axios/lib/platform/index.js"() {
    init_node();
    init_utils2();
    platform_default = {
      ...utils_exports,
      ...node_default
    };
  }
});

// ../../../../../node_modules/axios/lib/helpers/toURLEncodedForm.js
function toURLEncodedForm(data, options) {
  return toFormData_default(data, new platform_default.classes.URLSearchParams(), {
    visitor: function(value, key, path, helpers) {
      if (platform_default.isNode && utils_default.isBuffer(value)) {
        this.append(key, value.toString("base64"));
        return false;
      }
      return helpers.defaultVisitor.apply(this, arguments);
    },
    ...options
  });
}
var init_toURLEncodedForm = __esm({
  "../../../../../node_modules/axios/lib/helpers/toURLEncodedForm.js"() {
    "use strict";
    init_utils();
    init_toFormData();
    init_platform();
  }
});

// ../../../../../node_modules/axios/lib/helpers/formDataToJSON.js
function parsePropPath(name) {
  return utils_default.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
    return match[0] === "[]" ? "" : match[1] || match[0];
  });
}
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];
    if (name === "__proto__") return true;
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && utils_default.isArray(target) ? target.length : name;
    if (isLast) {
      if (utils_default.hasOwnProp(target, name)) {
        target[name] = utils_default.isArray(target[name]) ? target[name].concat(value) : [target[name], value];
      } else {
        target[name] = value;
      }
      return !isNumericKey;
    }
    if (!target[name] || !utils_default.isObject(target[name])) {
      target[name] = [];
    }
    const result = buildPath(path, value, target[name], index);
    if (result && utils_default.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }
    return !isNumericKey;
  }
  if (utils_default.isFormData(formData) && utils_default.isFunction(formData.entries)) {
    const obj = {};
    utils_default.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
var formDataToJSON_default;
var init_formDataToJSON = __esm({
  "../../../../../node_modules/axios/lib/helpers/formDataToJSON.js"() {
    "use strict";
    init_utils();
    formDataToJSON_default = formDataToJSON;
  }
});

// ../../../../../node_modules/axios/lib/defaults/index.js
function stringifySafely(rawValue, parser, encoder) {
  if (utils_default.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils_default.trim(rawValue);
    } catch (e) {
      if (e.name !== "SyntaxError") {
        throw e;
      }
    }
  }
  return (encoder || JSON.stringify)(rawValue);
}
var own, defaults, defaults_default;
var init_defaults = __esm({
  "../../../../../node_modules/axios/lib/defaults/index.js"() {
    "use strict";
    init_utils();
    init_AxiosError();
    init_transitional();
    init_toFormData();
    init_toURLEncodedForm();
    init_platform();
    init_formDataToJSON();
    own = (obj, key) => obj != null && utils_default.hasOwnProp(obj, key) ? obj[key] : void 0;
    defaults = {
      transitional: transitional_default,
      adapter: ["xhr", "http", "fetch"],
      transformRequest: [
        function transformRequest(data, headers) {
          const contentType = headers.getContentType() || "";
          const hasJSONContentType = contentType.indexOf("application/json") > -1;
          const isObjectPayload = utils_default.isObject(data);
          if (isObjectPayload && utils_default.isHTMLForm(data)) {
            data = new FormData(data);
          }
          const isFormData2 = utils_default.isFormData(data);
          if (isFormData2) {
            return hasJSONContentType ? JSON.stringify(formDataToJSON_default(data)) : data;
          }
          if (utils_default.isArrayBuffer(data) || utils_default.isBuffer(data) || utils_default.isStream(data) || utils_default.isFile(data) || utils_default.isBlob(data) || utils_default.isReadableStream(data)) {
            return data;
          }
          if (utils_default.isArrayBufferView(data)) {
            return data.buffer;
          }
          if (utils_default.isURLSearchParams(data)) {
            headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
            return data.toString();
          }
          let isFileList2;
          if (isObjectPayload) {
            const formSerializer = own(this, "formSerializer");
            if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
              return toURLEncodedForm(data, formSerializer).toString();
            }
            if ((isFileList2 = utils_default.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
              const env = own(this, "env");
              const _FormData = env && env.FormData;
              return toFormData_default(
                isFileList2 ? { "files[]": data } : data,
                _FormData && new _FormData(),
                formSerializer
              );
            }
          }
          if (isObjectPayload || hasJSONContentType) {
            headers.setContentType("application/json", false);
            return stringifySafely(data);
          }
          return data;
        }
      ],
      transformResponse: [
        function transformResponse(data) {
          const transitional2 = own(this, "transitional") || defaults.transitional;
          const forcedJSONParsing = transitional2 && transitional2.forcedJSONParsing;
          const responseType = own(this, "responseType");
          const JSONRequested = responseType === "json";
          if (utils_default.isResponse(data) || utils_default.isReadableStream(data)) {
            return data;
          }
          if (data && utils_default.isString(data) && (forcedJSONParsing && !responseType || JSONRequested)) {
            const silentJSONParsing = transitional2 && transitional2.silentJSONParsing;
            const strictJSONParsing = !silentJSONParsing && JSONRequested;
            try {
              return JSON.parse(data, own(this, "parseReviver"));
            } catch (e) {
              if (strictJSONParsing) {
                if (e.name === "SyntaxError") {
                  throw AxiosError_default.from(e, AxiosError_default.ERR_BAD_RESPONSE, this, null, own(this, "response"));
                }
                throw e;
              }
            }
          }
          return data;
        }
      ],
      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
      maxContentLength: -1,
      maxBodyLength: -1,
      env: {
        FormData: platform_default.classes.FormData,
        Blob: platform_default.classes.Blob
      },
      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      },
      headers: {
        common: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": void 0
        }
      }
    };
    utils_default.forEach(["delete", "get", "head", "post", "put", "patch"], (method) => {
      defaults.headers[method] = {};
    });
    defaults_default = defaults;
  }
});

// ../../../../../node_modules/axios/lib/helpers/parseHeaders.js
var ignoreDuplicateOf, parseHeaders_default;
var init_parseHeaders = __esm({
  "../../../../../node_modules/axios/lib/helpers/parseHeaders.js"() {
    "use strict";
    init_utils();
    ignoreDuplicateOf = utils_default.toObjectSet([
      "age",
      "authorization",
      "content-length",
      "content-type",
      "etag",
      "expires",
      "from",
      "host",
      "if-modified-since",
      "if-unmodified-since",
      "last-modified",
      "location",
      "max-forwards",
      "proxy-authorization",
      "referer",
      "retry-after",
      "user-agent"
    ]);
    parseHeaders_default = (rawHeaders) => {
      const parsed = {};
      let key;
      let val;
      let i;
      rawHeaders && rawHeaders.split("\n").forEach(function parser(line) {
        i = line.indexOf(":");
        key = line.substring(0, i).trim().toLowerCase();
        val = line.substring(i + 1).trim();
        if (!key || parsed[key] && ignoreDuplicateOf[key]) {
          return;
        }
        if (key === "set-cookie") {
          if (parsed[key]) {
            parsed[key].push(val);
          } else {
            parsed[key] = [val];
          }
        } else {
          parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
        }
      });
      return parsed;
    };
  }
});

// ../../../../../node_modules/axios/lib/core/AxiosHeaders.js
function trimSPorHTAB(str) {
  let start = 0;
  let end = str.length;
  while (start < end) {
    const code = str.charCodeAt(start);
    if (code !== 9 && code !== 32) {
      break;
    }
    start += 1;
  }
  while (end > start) {
    const code = str.charCodeAt(end - 1);
    if (code !== 9 && code !== 32) {
      break;
    }
    end -= 1;
  }
  return start === 0 && end === str.length ? str : str.slice(start, end);
}
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
function sanitizeHeaderValue(str) {
  return trimSPorHTAB(str.replace(INVALID_HEADER_VALUE_CHARS_RE, ""));
}
function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }
  return utils_default.isArray(value) ? value.map(normalizeValue) : sanitizeHeaderValue(String(value));
}
function parseTokens(str) {
  const tokens = /* @__PURE__ */ Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while (match = tokensRE.exec(str)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}
function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
  if (utils_default.isFunction(filter2)) {
    return filter2.call(this, value, header);
  }
  if (isHeaderNameFilter) {
    value = header;
  }
  if (!utils_default.isString(value)) return;
  if (utils_default.isString(filter2)) {
    return value.indexOf(filter2) !== -1;
  }
  if (utils_default.isRegExp(filter2)) {
    return filter2.test(value);
  }
}
function formatHeader(header) {
  return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
    return char.toUpperCase() + str;
  });
}
function buildAccessors(obj, header) {
  const accessorName = utils_default.toCamelCase(" " + header);
  ["get", "set", "has"].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}
var $internals, INVALID_HEADER_VALUE_CHARS_RE, isValidHeaderName, AxiosHeaders, AxiosHeaders_default;
var init_AxiosHeaders = __esm({
  "../../../../../node_modules/axios/lib/core/AxiosHeaders.js"() {
    "use strict";
    init_utils();
    init_parseHeaders();
    $internals = Symbol("internals");
    INVALID_HEADER_VALUE_CHARS_RE = /[^\x09\x20-\x7E\x80-\xFF]/g;
    isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
    AxiosHeaders = class {
      constructor(headers) {
        headers && this.set(headers);
      }
      set(header, valueOrRewrite, rewrite) {
        const self2 = this;
        function setHeader(_value, _header, _rewrite) {
          const lHeader = normalizeHeader(_header);
          if (!lHeader) {
            throw new Error("header name must be a non-empty string");
          }
          const key = utils_default.findKey(self2, lHeader);
          if (!key || self2[key] === void 0 || _rewrite === true || _rewrite === void 0 && self2[key] !== false) {
            self2[key || _header] = normalizeValue(_value);
          }
        }
        const setHeaders = (headers, _rewrite) => utils_default.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
        if (utils_default.isPlainObject(header) || header instanceof this.constructor) {
          setHeaders(header, valueOrRewrite);
        } else if (utils_default.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
          setHeaders(parseHeaders_default(header), valueOrRewrite);
        } else if (utils_default.isObject(header) && utils_default.isIterable(header)) {
          let obj = {}, dest, key;
          for (const entry of header) {
            if (!utils_default.isArray(entry)) {
              throw TypeError("Object iterator must return a key-value pair");
            }
            obj[key = entry[0]] = (dest = obj[key]) ? utils_default.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]] : entry[1];
          }
          setHeaders(obj, valueOrRewrite);
        } else {
          header != null && setHeader(valueOrRewrite, header, rewrite);
        }
        return this;
      }
      get(header, parser) {
        header = normalizeHeader(header);
        if (header) {
          const key = utils_default.findKey(this, header);
          if (key) {
            const value = this[key];
            if (!parser) {
              return value;
            }
            if (parser === true) {
              return parseTokens(value);
            }
            if (utils_default.isFunction(parser)) {
              return parser.call(this, value, key);
            }
            if (utils_default.isRegExp(parser)) {
              return parser.exec(value);
            }
            throw new TypeError("parser must be boolean|regexp|function");
          }
        }
      }
      has(header, matcher) {
        header = normalizeHeader(header);
        if (header) {
          const key = utils_default.findKey(this, header);
          return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
        }
        return false;
      }
      delete(header, matcher) {
        const self2 = this;
        let deleted = false;
        function deleteHeader(_header) {
          _header = normalizeHeader(_header);
          if (_header) {
            const key = utils_default.findKey(self2, _header);
            if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
              delete self2[key];
              deleted = true;
            }
          }
        }
        if (utils_default.isArray(header)) {
          header.forEach(deleteHeader);
        } else {
          deleteHeader(header);
        }
        return deleted;
      }
      clear(matcher) {
        const keys = Object.keys(this);
        let i = keys.length;
        let deleted = false;
        while (i--) {
          const key = keys[i];
          if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
            delete this[key];
            deleted = true;
          }
        }
        return deleted;
      }
      normalize(format) {
        const self2 = this;
        const headers = {};
        utils_default.forEach(this, (value, header) => {
          const key = utils_default.findKey(headers, header);
          if (key) {
            self2[key] = normalizeValue(value);
            delete self2[header];
            return;
          }
          const normalized = format ? formatHeader(header) : String(header).trim();
          if (normalized !== header) {
            delete self2[header];
          }
          self2[normalized] = normalizeValue(value);
          headers[normalized] = true;
        });
        return this;
      }
      concat(...targets) {
        return this.constructor.concat(this, ...targets);
      }
      toJSON(asStrings) {
        const obj = /* @__PURE__ */ Object.create(null);
        utils_default.forEach(this, (value, header) => {
          value != null && value !== false && (obj[header] = asStrings && utils_default.isArray(value) ? value.join(", ") : value);
        });
        return obj;
      }
      [Symbol.iterator]() {
        return Object.entries(this.toJSON())[Symbol.iterator]();
      }
      toString() {
        return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
      }
      getSetCookie() {
        return this.get("set-cookie") || [];
      }
      get [Symbol.toStringTag]() {
        return "AxiosHeaders";
      }
      static from(thing) {
        return thing instanceof this ? thing : new this(thing);
      }
      static concat(first, ...targets) {
        const computed = new this(first);
        targets.forEach((target) => computed.set(target));
        return computed;
      }
      static accessor(header) {
        const internals = this[$internals] = this[$internals] = {
          accessors: {}
        };
        const accessors = internals.accessors;
        const prototype2 = this.prototype;
        function defineAccessor(_header) {
          const lHeader = normalizeHeader(_header);
          if (!accessors[lHeader]) {
            buildAccessors(prototype2, _header);
            accessors[lHeader] = true;
          }
        }
        utils_default.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
        return this;
      }
    };
    AxiosHeaders.accessor([
      "Content-Type",
      "Content-Length",
      "Accept",
      "Accept-Encoding",
      "User-Agent",
      "Authorization"
    ]);
    utils_default.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
      let mapped = key[0].toUpperCase() + key.slice(1);
      return {
        get: () => value,
        set(headerValue) {
          this[mapped] = headerValue;
        }
      };
    });
    utils_default.freezeMethods(AxiosHeaders);
    AxiosHeaders_default = AxiosHeaders;
  }
});

// ../../../../../node_modules/axios/lib/core/transformData.js
function transformData(fns, response) {
  const config = this || defaults_default;
  const context = response || config;
  const headers = AxiosHeaders_default.from(context.headers);
  let data = context.data;
  utils_default.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
  });
  headers.normalize();
  return data;
}
var init_transformData = __esm({
  "../../../../../node_modules/axios/lib/core/transformData.js"() {
    "use strict";
    init_utils();
    init_defaults();
    init_AxiosHeaders();
  }
});

// ../../../../../node_modules/axios/lib/cancel/isCancel.js
function isCancel(value) {
  return !!(value && value.__CANCEL__);
}
var init_isCancel = __esm({
  "../../../../../node_modules/axios/lib/cancel/isCancel.js"() {
    "use strict";
  }
});

// ../../../../../node_modules/axios/lib/cancel/CanceledError.js
var CanceledError, CanceledError_default;
var init_CanceledError = __esm({
  "../../../../../node_modules/axios/lib/cancel/CanceledError.js"() {
    "use strict";
    init_AxiosError();
    CanceledError = class extends AxiosError_default {
      /**
       * A `CanceledError` is an object that is thrown when an operation is canceled.
       *
       * @param {string=} message The message.
       * @param {Object=} config The config.
       * @param {Object=} request The request.
       *
       * @returns {CanceledError} The created error.
       */
      constructor(message, config, request) {
        super(message == null ? "canceled" : message, AxiosError_default.ERR_CANCELED, config, request);
        this.name = "CanceledError";
        this.__CANCEL__ = true;
      }
    };
    CanceledError_default = CanceledError;
  }
});

// ../../../../../node_modules/axios/lib/core/settle.js
function settle(resolve, reject, response) {
  const validateStatus2 = response.config.validateStatus;
  if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
    resolve(response);
  } else {
    reject(
      new AxiosError_default(
        "Request failed with status code " + response.status,
        [AxiosError_default.ERR_BAD_REQUEST, AxiosError_default.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
        response.config,
        response.request,
        response
      )
    );
  }
}
var init_settle = __esm({
  "../../../../../node_modules/axios/lib/core/settle.js"() {
    "use strict";
    init_AxiosError();
  }
});

// ../../../../../node_modules/axios/lib/helpers/isAbsoluteURL.js
function isAbsoluteURL(url2) {
  if (typeof url2 !== "string") {
    return false;
  }
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url2);
}
var init_isAbsoluteURL = __esm({
  "../../../../../node_modules/axios/lib/helpers/isAbsoluteURL.js"() {
    "use strict";
  }
});

// ../../../../../node_modules/axios/lib/helpers/combineURLs.js
function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
}
var init_combineURLs = __esm({
  "../../../../../node_modules/axios/lib/helpers/combineURLs.js"() {
    "use strict";
  }
});

// ../../../../../node_modules/axios/lib/core/buildFullPath.js
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls === false)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}
var init_buildFullPath = __esm({
  "../../../../../node_modules/axios/lib/core/buildFullPath.js"() {
    "use strict";
    init_isAbsoluteURL();
    init_combineURLs();
  }
});

// ../../../../../node_modules/proxy-from-env/index.js
function parseUrl(urlString) {
  try {
    return new URL(urlString);
  } catch {
    return null;
  }
}
function getProxyForUrl(url2) {
  var parsedUrl = (typeof url2 === "string" ? parseUrl(url2) : url2) || {};
  var proto = parsedUrl.protocol;
  var hostname = parsedUrl.host;
  var port = parsedUrl.port;
  if (typeof hostname !== "string" || !hostname || typeof proto !== "string") {
    return "";
  }
  proto = proto.split(":", 1)[0];
  hostname = hostname.replace(/:\d*$/, "");
  port = parseInt(port) || DEFAULT_PORTS[proto] || 0;
  if (!shouldProxy(hostname, port)) {
    return "";
  }
  var proxy = getEnv(proto + "_proxy") || getEnv("all_proxy");
  if (proxy && proxy.indexOf("://") === -1) {
    proxy = proto + "://" + proxy;
  }
  return proxy;
}
function shouldProxy(hostname, port) {
  var NO_PROXY = getEnv("no_proxy").toLowerCase();
  if (!NO_PROXY) {
    return true;
  }
  if (NO_PROXY === "*") {
    return false;
  }
  return NO_PROXY.split(/[,\s]/).every(function(proxy) {
    if (!proxy) {
      return true;
    }
    var parsedProxy = proxy.match(/^(.+):(\d+)$/);
    var parsedProxyHostname = parsedProxy ? parsedProxy[1] : proxy;
    var parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2]) : 0;
    if (parsedProxyPort && parsedProxyPort !== port) {
      return true;
    }
    if (!/^[.*]/.test(parsedProxyHostname)) {
      return hostname !== parsedProxyHostname;
    }
    if (parsedProxyHostname.charAt(0) === "*") {
      parsedProxyHostname = parsedProxyHostname.slice(1);
    }
    return !hostname.endsWith(parsedProxyHostname);
  });
}
function getEnv(key) {
  return process.env[key.toLowerCase()] || process.env[key.toUpperCase()] || "";
}
var DEFAULT_PORTS;
var init_proxy_from_env = __esm({
  "../../../../../node_modules/proxy-from-env/index.js"() {
    "use strict";
    DEFAULT_PORTS = {
      ftp: 21,
      gopher: 70,
      http: 80,
      https: 443,
      ws: 80,
      wss: 443
    };
  }
});

// ../../../../../node_modules/ms/index.js
var require_ms = __commonJS({
  "../../../../../node_modules/ms/index.js"(exports2, module2) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module2.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// ../../../../../node_modules/debug/src/common.js
var require_common = __commonJS({
  "../../../../../node_modules/debug/src/common.js"(exports2, module2) {
    function setup(env) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug(...args) {
          if (!debug.enabled) {
            return;
          }
          const self2 = debug;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self2.diff = ms;
          self2.prev = prevTime;
          self2.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self2, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self2, args);
          const logFn = self2.log || createDebug.log;
          logFn.apply(self2, args);
        }
        debug.namespace = namespace;
        debug.useColors = createDebug.useColors();
        debug.color = createDebug.selectColor(namespace);
        debug.extend = extend2;
        debug.destroy = createDebug.destroy;
        Object.defineProperty(debug, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug);
        }
        return debug;
      }
      function extend2(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
        for (const ns of split) {
          if (ns[0] === "-") {
            createDebug.skips.push(ns.slice(1));
          } else {
            createDebug.names.push(ns);
          }
        }
      }
      function matchesTemplate(search, template) {
        let searchIndex = 0;
        let templateIndex = 0;
        let starIndex = -1;
        let matchIndex = 0;
        while (searchIndex < search.length) {
          if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
            if (template[templateIndex] === "*") {
              starIndex = templateIndex;
              matchIndex = searchIndex;
              templateIndex++;
            } else {
              searchIndex++;
              templateIndex++;
            }
          } else if (starIndex !== -1) {
            templateIndex = starIndex + 1;
            matchIndex++;
            searchIndex = matchIndex;
          } else {
            return false;
          }
        }
        while (templateIndex < template.length && template[templateIndex] === "*") {
          templateIndex++;
        }
        return templateIndex === template.length;
      }
      function disable() {
        const namespaces = [
          ...createDebug.names,
          ...createDebug.skips.map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        for (const skip of createDebug.skips) {
          if (matchesTemplate(name, skip)) {
            return false;
          }
        }
        for (const ns of createDebug.names) {
          if (matchesTemplate(name, ns)) {
            return true;
          }
        }
        return false;
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module2.exports = setup;
  }
});

// ../../../../../node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "../../../../../node_modules/debug/src/browser.js"(exports2, module2) {
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.storage = localstorage();
    exports2.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports2.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports2.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports2.storage.setItem("debug", namespaces);
        } else {
          exports2.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports2.storage.getItem("debug") || exports2.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// ../../../../../node_modules/debug/src/node.js
var require_node = __commonJS({
  "../../../../../node_modules/debug/src/node.js"(exports2, module2) {
    var tty = require("tty");
    var util3 = require("util");
    exports2.init = init;
    exports2.log = log;
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.destroy = util3.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports2.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = require("supports-color");
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports2.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports2.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports2.inspectOpts ? Boolean(exports2.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports2.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util3.formatWithOptions(exports2.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports2.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports2.inspectOpts[keys[i]];
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util3.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util3.inspect(v, this.inspectOpts);
    };
  }
});

// ../../../../../node_modules/debug/src/index.js
var require_src = __commonJS({
  "../../../../../node_modules/debug/src/index.js"(exports2, module2) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module2.exports = require_browser();
    } else {
      module2.exports = require_node();
    }
  }
});

// ../../../../../node_modules/follow-redirects/debug.js
var require_debug = __commonJS({
  "../../../../../node_modules/follow-redirects/debug.js"(exports2, module2) {
    var debug;
    module2.exports = function() {
      if (!debug) {
        try {
          debug = require_src()("follow-redirects");
        } catch (error) {
        }
        if (typeof debug !== "function") {
          debug = function() {
          };
        }
      }
      debug.apply(null, arguments);
    };
  }
});

// ../../../../../node_modules/follow-redirects/index.js
var require_follow_redirects = __commonJS({
  "../../../../../node_modules/follow-redirects/index.js"(exports2, module2) {
    var url2 = require("url");
    var URL2 = url2.URL;
    var http3 = require("http");
    var https2 = require("https");
    var Writable = require("stream").Writable;
    var assert = require("assert");
    var debug = require_debug();
    (function detectUnsupportedEnvironment() {
      var looksLikeNode = typeof process !== "undefined";
      var looksLikeBrowser = typeof window !== "undefined" && typeof document !== "undefined";
      var looksLikeV8 = isFunction3(Error.captureStackTrace);
      if (!looksLikeNode && (looksLikeBrowser || !looksLikeV8)) {
        console.warn("The follow-redirects package should be excluded from browser builds.");
      }
    })();
    var useNativeURL = false;
    try {
      assert(new URL2(""));
    } catch (error) {
      useNativeURL = error.code === "ERR_INVALID_URL";
    }
    var sensitiveHeaders = [
      "Authorization",
      "Proxy-Authorization",
      "Cookie"
    ];
    var preservedUrlFields = [
      "auth",
      "host",
      "hostname",
      "href",
      "path",
      "pathname",
      "port",
      "protocol",
      "query",
      "search",
      "hash"
    ];
    var events = ["abort", "aborted", "connect", "error", "socket", "timeout"];
    var eventHandlers = /* @__PURE__ */ Object.create(null);
    events.forEach(function(event) {
      eventHandlers[event] = function(arg1, arg2, arg3) {
        this._redirectable.emit(event, arg1, arg2, arg3);
      };
    });
    var InvalidUrlError = createErrorType(
      "ERR_INVALID_URL",
      "Invalid URL",
      TypeError
    );
    var RedirectionError = createErrorType(
      "ERR_FR_REDIRECTION_FAILURE",
      "Redirected request failed"
    );
    var TooManyRedirectsError = createErrorType(
      "ERR_FR_TOO_MANY_REDIRECTS",
      "Maximum number of redirects exceeded",
      RedirectionError
    );
    var MaxBodyLengthExceededError = createErrorType(
      "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
      "Request body larger than maxBodyLength limit"
    );
    var WriteAfterEndError = createErrorType(
      "ERR_STREAM_WRITE_AFTER_END",
      "write after end"
    );
    var destroy = Writable.prototype.destroy || noop2;
    function RedirectableRequest(options, responseCallback) {
      Writable.call(this);
      this._sanitizeOptions(options);
      this._options = options;
      this._ended = false;
      this._ending = false;
      this._redirectCount = 0;
      this._redirects = [];
      this._requestBodyLength = 0;
      this._requestBodyBuffers = [];
      if (responseCallback) {
        this.on("response", responseCallback);
      }
      var self2 = this;
      this._onNativeResponse = function(response) {
        try {
          self2._processResponse(response);
        } catch (cause) {
          self2.emit("error", cause instanceof RedirectionError ? cause : new RedirectionError({ cause }));
        }
      };
      this._headerFilter = new RegExp("^(?:" + sensitiveHeaders.concat(options.sensitiveHeaders).map(escapeRegex).join("|") + ")$", "i");
      this._performRequest();
    }
    RedirectableRequest.prototype = Object.create(Writable.prototype);
    RedirectableRequest.prototype.abort = function() {
      destroyRequest(this._currentRequest);
      this._currentRequest.abort();
      this.emit("abort");
    };
    RedirectableRequest.prototype.destroy = function(error) {
      destroyRequest(this._currentRequest, error);
      destroy.call(this, error);
      return this;
    };
    RedirectableRequest.prototype.write = function(data, encoding, callback) {
      if (this._ending) {
        throw new WriteAfterEndError();
      }
      if (!isString2(data) && !isBuffer2(data)) {
        throw new TypeError("data should be a string, Buffer or Uint8Array");
      }
      if (isFunction3(encoding)) {
        callback = encoding;
        encoding = null;
      }
      if (data.length === 0) {
        if (callback) {
          callback();
        }
        return;
      }
      if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
        this._requestBodyLength += data.length;
        this._requestBodyBuffers.push({ data, encoding });
        this._currentRequest.write(data, encoding, callback);
      } else {
        this.emit("error", new MaxBodyLengthExceededError());
        this.abort();
      }
    };
    RedirectableRequest.prototype.end = function(data, encoding, callback) {
      if (isFunction3(data)) {
        callback = data;
        data = encoding = null;
      } else if (isFunction3(encoding)) {
        callback = encoding;
        encoding = null;
      }
      if (!data) {
        this._ended = this._ending = true;
        this._currentRequest.end(null, null, callback);
      } else {
        var self2 = this;
        var currentRequest = this._currentRequest;
        this.write(data, encoding, function() {
          self2._ended = true;
          currentRequest.end(null, null, callback);
        });
        this._ending = true;
      }
    };
    RedirectableRequest.prototype.setHeader = function(name, value) {
      this._options.headers[name] = value;
      this._currentRequest.setHeader(name, value);
    };
    RedirectableRequest.prototype.removeHeader = function(name) {
      delete this._options.headers[name];
      this._currentRequest.removeHeader(name);
    };
    RedirectableRequest.prototype.setTimeout = function(msecs, callback) {
      var self2 = this;
      function destroyOnTimeout(socket) {
        socket.setTimeout(msecs);
        socket.removeListener("timeout", socket.destroy);
        socket.addListener("timeout", socket.destroy);
      }
      function startTimer(socket) {
        if (self2._timeout) {
          clearTimeout(self2._timeout);
        }
        self2._timeout = setTimeout(function() {
          self2.emit("timeout");
          clearTimer();
        }, msecs);
        destroyOnTimeout(socket);
      }
      function clearTimer() {
        if (self2._timeout) {
          clearTimeout(self2._timeout);
          self2._timeout = null;
        }
        self2.removeListener("abort", clearTimer);
        self2.removeListener("error", clearTimer);
        self2.removeListener("response", clearTimer);
        self2.removeListener("close", clearTimer);
        if (callback) {
          self2.removeListener("timeout", callback);
        }
        if (!self2.socket) {
          self2._currentRequest.removeListener("socket", startTimer);
        }
      }
      if (callback) {
        this.on("timeout", callback);
      }
      if (this.socket) {
        startTimer(this.socket);
      } else {
        this._currentRequest.once("socket", startTimer);
      }
      this.on("socket", destroyOnTimeout);
      this.on("abort", clearTimer);
      this.on("error", clearTimer);
      this.on("response", clearTimer);
      this.on("close", clearTimer);
      return this;
    };
    [
      "flushHeaders",
      "getHeader",
      "setNoDelay",
      "setSocketKeepAlive"
    ].forEach(function(method) {
      RedirectableRequest.prototype[method] = function(a, b) {
        return this._currentRequest[method](a, b);
      };
    });
    ["aborted", "connection", "socket"].forEach(function(property) {
      Object.defineProperty(RedirectableRequest.prototype, property, {
        get: function() {
          return this._currentRequest[property];
        }
      });
    });
    RedirectableRequest.prototype._sanitizeOptions = function(options) {
      if (!options.headers) {
        options.headers = {};
      }
      if (!isArray2(options.sensitiveHeaders)) {
        options.sensitiveHeaders = [];
      }
      if (options.host) {
        if (!options.hostname) {
          options.hostname = options.host;
        }
        delete options.host;
      }
      if (!options.pathname && options.path) {
        var searchPos = options.path.indexOf("?");
        if (searchPos < 0) {
          options.pathname = options.path;
        } else {
          options.pathname = options.path.substring(0, searchPos);
          options.search = options.path.substring(searchPos);
        }
      }
    };
    RedirectableRequest.prototype._performRequest = function() {
      var protocol = this._options.protocol;
      var nativeProtocol = this._options.nativeProtocols[protocol];
      if (!nativeProtocol) {
        throw new TypeError("Unsupported protocol " + protocol);
      }
      if (this._options.agents) {
        var scheme = protocol.slice(0, -1);
        this._options.agent = this._options.agents[scheme];
      }
      var request = this._currentRequest = nativeProtocol.request(this._options, this._onNativeResponse);
      request._redirectable = this;
      for (var event of events) {
        request.on(event, eventHandlers[event]);
      }
      this._currentUrl = /^\//.test(this._options.path) ? url2.format(this._options) : (
        // When making a request to a proxy, […]
        // a client MUST send the target URI in absolute-form […].
        this._options.path
      );
      if (this._isRedirect) {
        var i = 0;
        var self2 = this;
        var buffers = this._requestBodyBuffers;
        (function writeNext(error) {
          if (request === self2._currentRequest) {
            if (error) {
              self2.emit("error", error);
            } else if (i < buffers.length) {
              var buffer = buffers[i++];
              if (!request.finished) {
                request.write(buffer.data, buffer.encoding, writeNext);
              }
            } else if (self2._ended) {
              request.end();
            }
          }
        })();
      }
    };
    RedirectableRequest.prototype._processResponse = function(response) {
      var statusCode = response.statusCode;
      if (this._options.trackRedirects) {
        this._redirects.push({
          url: this._currentUrl,
          headers: response.headers,
          statusCode
        });
      }
      var location = response.headers.location;
      if (!location || this._options.followRedirects === false || statusCode < 300 || statusCode >= 400) {
        response.responseUrl = this._currentUrl;
        response.redirects = this._redirects;
        this.emit("response", response);
        this._requestBodyBuffers = [];
        return;
      }
      destroyRequest(this._currentRequest);
      response.destroy();
      if (++this._redirectCount > this._options.maxRedirects) {
        throw new TooManyRedirectsError();
      }
      var requestHeaders;
      var beforeRedirect = this._options.beforeRedirect;
      if (beforeRedirect) {
        requestHeaders = Object.assign({
          // The Host header was set by nativeProtocol.request
          Host: response.req.getHeader("host")
        }, this._options.headers);
      }
      var method = this._options.method;
      if ((statusCode === 301 || statusCode === 302) && this._options.method === "POST" || // RFC7231§6.4.4: The 303 (See Other) status code indicates that
      // the server is redirecting the user agent to a different resource […]
      // A user agent can perform a retrieval request targeting that URI
      // (a GET or HEAD request if using HTTP) […]
      statusCode === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) {
        this._options.method = "GET";
        this._requestBodyBuffers = [];
        removeMatchingHeaders(/^content-/i, this._options.headers);
      }
      var currentHostHeader = removeMatchingHeaders(/^host$/i, this._options.headers);
      var currentUrlParts = parseUrl2(this._currentUrl);
      var currentHost = currentHostHeader || currentUrlParts.host;
      var currentUrl = /^\w+:/.test(location) ? this._currentUrl : url2.format(Object.assign(currentUrlParts, { host: currentHost }));
      var redirectUrl = resolveUrl(location, currentUrl);
      debug("redirecting to", redirectUrl.href);
      this._isRedirect = true;
      spreadUrlObject(redirectUrl, this._options);
      if (redirectUrl.protocol !== currentUrlParts.protocol && redirectUrl.protocol !== "https:" || redirectUrl.host !== currentHost && !isSubdomain(redirectUrl.host, currentHost)) {
        removeMatchingHeaders(this._headerFilter, this._options.headers);
      }
      if (isFunction3(beforeRedirect)) {
        var responseDetails = {
          headers: response.headers,
          statusCode
        };
        var requestDetails = {
          url: currentUrl,
          method,
          headers: requestHeaders
        };
        beforeRedirect(this._options, responseDetails, requestDetails);
        this._sanitizeOptions(this._options);
      }
      this._performRequest();
    };
    function wrap(protocols) {
      var exports3 = {
        maxRedirects: 21,
        maxBodyLength: 10 * 1024 * 1024
      };
      var nativeProtocols = {};
      Object.keys(protocols).forEach(function(scheme) {
        var protocol = scheme + ":";
        var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
        var wrappedProtocol = exports3[scheme] = Object.create(nativeProtocol);
        function request(input, options, callback) {
          if (isURL(input)) {
            input = spreadUrlObject(input);
          } else if (isString2(input)) {
            input = spreadUrlObject(parseUrl2(input));
          } else {
            callback = options;
            options = validateUrl(input);
            input = { protocol };
          }
          if (isFunction3(options)) {
            callback = options;
            options = null;
          }
          options = Object.assign({
            maxRedirects: exports3.maxRedirects,
            maxBodyLength: exports3.maxBodyLength
          }, input, options);
          options.nativeProtocols = nativeProtocols;
          if (!isString2(options.host) && !isString2(options.hostname)) {
            options.hostname = "::1";
          }
          assert.equal(options.protocol, protocol, "protocol mismatch");
          debug("options", options);
          return new RedirectableRequest(options, callback);
        }
        function get(input, options, callback) {
          var wrappedRequest = wrappedProtocol.request(input, options, callback);
          wrappedRequest.end();
          return wrappedRequest;
        }
        Object.defineProperties(wrappedProtocol, {
          request: { value: request, configurable: true, enumerable: true, writable: true },
          get: { value: get, configurable: true, enumerable: true, writable: true }
        });
      });
      return exports3;
    }
    function noop2() {
    }
    function parseUrl2(input) {
      var parsed;
      if (useNativeURL) {
        parsed = new URL2(input);
      } else {
        parsed = validateUrl(url2.parse(input));
        if (!isString2(parsed.protocol)) {
          throw new InvalidUrlError({ input });
        }
      }
      return parsed;
    }
    function resolveUrl(relative, base) {
      return useNativeURL ? new URL2(relative, base) : parseUrl2(url2.resolve(base, relative));
    }
    function validateUrl(input) {
      if (/^\[/.test(input.hostname) && !/^\[[:0-9a-f]+\]$/i.test(input.hostname)) {
        throw new InvalidUrlError({ input: input.href || input });
      }
      if (/^\[/.test(input.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(input.host)) {
        throw new InvalidUrlError({ input: input.href || input });
      }
      return input;
    }
    function spreadUrlObject(urlObject, target) {
      var spread3 = target || {};
      for (var key of preservedUrlFields) {
        spread3[key] = urlObject[key];
      }
      if (spread3.hostname.startsWith("[")) {
        spread3.hostname = spread3.hostname.slice(1, -1);
      }
      if (spread3.port !== "") {
        spread3.port = Number(spread3.port);
      }
      spread3.path = spread3.search ? spread3.pathname + spread3.search : spread3.pathname;
      return spread3;
    }
    function removeMatchingHeaders(regex, headers) {
      var lastValue;
      for (var header in headers) {
        if (regex.test(header)) {
          lastValue = headers[header];
          delete headers[header];
        }
      }
      return lastValue === null || typeof lastValue === "undefined" ? void 0 : String(lastValue).trim();
    }
    function createErrorType(code, message, baseClass) {
      function CustomError(properties) {
        if (isFunction3(Error.captureStackTrace)) {
          Error.captureStackTrace(this, this.constructor);
        }
        Object.assign(this, properties || {});
        this.code = code;
        this.message = this.cause ? message + ": " + this.cause.message : message;
      }
      CustomError.prototype = new (baseClass || Error)();
      Object.defineProperties(CustomError.prototype, {
        constructor: {
          value: CustomError,
          enumerable: false
        },
        name: {
          value: "Error [" + code + "]",
          enumerable: false
        }
      });
      return CustomError;
    }
    function destroyRequest(request, error) {
      for (var event of events) {
        request.removeListener(event, eventHandlers[event]);
      }
      request.on("error", noop2);
      request.destroy(error);
    }
    function isSubdomain(subdomain, domain) {
      assert(isString2(subdomain) && isString2(domain));
      var dot = subdomain.length - domain.length - 1;
      return dot > 0 && subdomain[dot] === "." && subdomain.endsWith(domain);
    }
    function isArray2(value) {
      return value instanceof Array;
    }
    function isString2(value) {
      return typeof value === "string" || value instanceof String;
    }
    function isFunction3(value) {
      return typeof value === "function";
    }
    function isBuffer2(value) {
      return typeof value === "object" && "length" in value;
    }
    function isURL(value) {
      return URL2 && value instanceof URL2;
    }
    function escapeRegex(regex) {
      return regex.replace(/[\]\\/()*+?.$]/g, "\\$&");
    }
    module2.exports = wrap({ http: http3, https: https2 });
    module2.exports.wrap = wrap;
  }
});

// ../../../../../node_modules/axios/lib/env/data.js
var VERSION;
var init_data = __esm({
  "../../../../../node_modules/axios/lib/env/data.js"() {
    VERSION = "1.15.2";
  }
});

// ../../../../../node_modules/axios/lib/helpers/parseProtocol.js
function parseProtocol(url2) {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url2);
  return match && match[1] || "";
}
var init_parseProtocol = __esm({
  "../../../../../node_modules/axios/lib/helpers/parseProtocol.js"() {
    "use strict";
  }
});

// ../../../../../node_modules/axios/lib/helpers/fromDataURI.js
function fromDataURI(uri, asBlob, options) {
  const _Blob = options && options.Blob || platform_default.classes.Blob;
  const protocol = parseProtocol(uri);
  if (asBlob === void 0 && _Blob) {
    asBlob = true;
  }
  if (protocol === "data") {
    uri = protocol.length ? uri.slice(protocol.length + 1) : uri;
    const match = DATA_URL_PATTERN.exec(uri);
    if (!match) {
      throw new AxiosError_default("Invalid URL", AxiosError_default.ERR_INVALID_URL);
    }
    const mime = match[1];
    const isBase64 = match[2];
    const body = match[3];
    const buffer = Buffer.from(decodeURIComponent(body), isBase64 ? "base64" : "utf8");
    if (asBlob) {
      if (!_Blob) {
        throw new AxiosError_default("Blob is not supported", AxiosError_default.ERR_NOT_SUPPORT);
      }
      return new _Blob([buffer], { type: mime });
    }
    return buffer;
  }
  throw new AxiosError_default("Unsupported protocol " + protocol, AxiosError_default.ERR_NOT_SUPPORT);
}
var DATA_URL_PATTERN;
var init_fromDataURI = __esm({
  "../../../../../node_modules/axios/lib/helpers/fromDataURI.js"() {
    "use strict";
    init_AxiosError();
    init_parseProtocol();
    init_platform();
    DATA_URL_PATTERN = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
  }
});

// ../../../../../node_modules/axios/lib/helpers/AxiosTransformStream.js
var import_stream, kInternals, AxiosTransformStream, AxiosTransformStream_default;
var init_AxiosTransformStream = __esm({
  "../../../../../node_modules/axios/lib/helpers/AxiosTransformStream.js"() {
    "use strict";
    import_stream = __toESM(require("stream"), 1);
    init_utils();
    kInternals = Symbol("internals");
    AxiosTransformStream = class extends import_stream.default.Transform {
      constructor(options) {
        options = utils_default.toFlatObject(
          options,
          {
            maxRate: 0,
            chunkSize: 64 * 1024,
            minChunkSize: 100,
            timeWindow: 500,
            ticksRate: 2,
            samplesCount: 15
          },
          null,
          (prop, source) => {
            return !utils_default.isUndefined(source[prop]);
          }
        );
        super({
          readableHighWaterMark: options.chunkSize
        });
        const internals = this[kInternals] = {
          timeWindow: options.timeWindow,
          chunkSize: options.chunkSize,
          maxRate: options.maxRate,
          minChunkSize: options.minChunkSize,
          bytesSeen: 0,
          isCaptured: false,
          notifiedBytesLoaded: 0,
          ts: Date.now(),
          bytes: 0,
          onReadCallback: null
        };
        this.on("newListener", (event) => {
          if (event === "progress") {
            if (!internals.isCaptured) {
              internals.isCaptured = true;
            }
          }
        });
      }
      _read(size) {
        const internals = this[kInternals];
        if (internals.onReadCallback) {
          internals.onReadCallback();
        }
        return super._read(size);
      }
      _transform(chunk, encoding, callback) {
        const internals = this[kInternals];
        const maxRate = internals.maxRate;
        const readableHighWaterMark = this.readableHighWaterMark;
        const timeWindow = internals.timeWindow;
        const divider = 1e3 / timeWindow;
        const bytesThreshold = maxRate / divider;
        const minChunkSize = internals.minChunkSize !== false ? Math.max(internals.minChunkSize, bytesThreshold * 0.01) : 0;
        const pushChunk = (_chunk, _callback) => {
          const bytes = Buffer.byteLength(_chunk);
          internals.bytesSeen += bytes;
          internals.bytes += bytes;
          internals.isCaptured && this.emit("progress", internals.bytesSeen);
          if (this.push(_chunk)) {
            process.nextTick(_callback);
          } else {
            internals.onReadCallback = () => {
              internals.onReadCallback = null;
              process.nextTick(_callback);
            };
          }
        };
        const transformChunk = (_chunk, _callback) => {
          const chunkSize = Buffer.byteLength(_chunk);
          let chunkRemainder = null;
          let maxChunkSize = readableHighWaterMark;
          let bytesLeft;
          let passed = 0;
          if (maxRate) {
            const now = Date.now();
            if (!internals.ts || (passed = now - internals.ts) >= timeWindow) {
              internals.ts = now;
              bytesLeft = bytesThreshold - internals.bytes;
              internals.bytes = bytesLeft < 0 ? -bytesLeft : 0;
              passed = 0;
            }
            bytesLeft = bytesThreshold - internals.bytes;
          }
          if (maxRate) {
            if (bytesLeft <= 0) {
              return setTimeout(() => {
                _callback(null, _chunk);
              }, timeWindow - passed);
            }
            if (bytesLeft < maxChunkSize) {
              maxChunkSize = bytesLeft;
            }
          }
          if (maxChunkSize && chunkSize > maxChunkSize && chunkSize - maxChunkSize > minChunkSize) {
            chunkRemainder = _chunk.subarray(maxChunkSize);
            _chunk = _chunk.subarray(0, maxChunkSize);
          }
          pushChunk(
            _chunk,
            chunkRemainder ? () => {
              process.nextTick(_callback, null, chunkRemainder);
            } : _callback
          );
        };
        transformChunk(chunk, function transformNextChunk(err, _chunk) {
          if (err) {
            return callback(err);
          }
          if (_chunk) {
            transformChunk(_chunk, transformNextChunk);
          } else {
            callback(null);
          }
        });
      }
    };
    AxiosTransformStream_default = AxiosTransformStream;
  }
});

// ../../../../../node_modules/axios/lib/helpers/readBlob.js
var asyncIterator, readBlob, readBlob_default;
var init_readBlob = __esm({
  "../../../../../node_modules/axios/lib/helpers/readBlob.js"() {
    ({ asyncIterator } = Symbol);
    readBlob = async function* (blob) {
      if (blob.stream) {
        yield* blob.stream();
      } else if (blob.arrayBuffer) {
        yield await blob.arrayBuffer();
      } else if (blob[asyncIterator]) {
        yield* blob[asyncIterator]();
      } else {
        yield blob;
      }
    };
    readBlob_default = readBlob;
  }
});

// ../../../../../node_modules/axios/lib/helpers/formDataToStream.js
var import_util, import_stream2, BOUNDARY_ALPHABET, textEncoder, CRLF, CRLF_BYTES, CRLF_BYTES_COUNT, FormDataPart, formDataToStream, formDataToStream_default;
var init_formDataToStream = __esm({
  "../../../../../node_modules/axios/lib/helpers/formDataToStream.js"() {
    import_util = __toESM(require("util"), 1);
    import_stream2 = require("stream");
    init_utils();
    init_readBlob();
    init_platform();
    BOUNDARY_ALPHABET = platform_default.ALPHABET.ALPHA_DIGIT + "-_";
    textEncoder = typeof TextEncoder === "function" ? new TextEncoder() : new import_util.default.TextEncoder();
    CRLF = "\r\n";
    CRLF_BYTES = textEncoder.encode(CRLF);
    CRLF_BYTES_COUNT = 2;
    FormDataPart = class {
      constructor(name, value) {
        const { escapeName } = this.constructor;
        const isStringValue = utils_default.isString(value);
        let headers = `Content-Disposition: form-data; name="${escapeName(name)}"${!isStringValue && value.name ? `; filename="${escapeName(value.name)}"` : ""}${CRLF}`;
        if (isStringValue) {
          value = textEncoder.encode(String(value).replace(/\r?\n|\r\n?/g, CRLF));
        } else {
          const safeType = String(value.type || "application/octet-stream").replace(/[\r\n]/g, "");
          headers += `Content-Type: ${safeType}${CRLF}`;
        }
        this.headers = textEncoder.encode(headers + CRLF);
        this.contentLength = isStringValue ? value.byteLength : value.size;
        this.size = this.headers.byteLength + this.contentLength + CRLF_BYTES_COUNT;
        this.name = name;
        this.value = value;
      }
      async *encode() {
        yield this.headers;
        const { value } = this;
        if (utils_default.isTypedArray(value)) {
          yield value;
        } else {
          yield* readBlob_default(value);
        }
        yield CRLF_BYTES;
      }
      static escapeName(name) {
        return String(name).replace(
          /[\r\n"]/g,
          (match) => ({
            "\r": "%0D",
            "\n": "%0A",
            '"': "%22"
          })[match]
        );
      }
    };
    formDataToStream = (form, headersHandler, options) => {
      const {
        tag = "form-data-boundary",
        size = 25,
        boundary = tag + "-" + platform_default.generateString(size, BOUNDARY_ALPHABET)
      } = options || {};
      if (!utils_default.isFormData(form)) {
        throw TypeError("FormData instance required");
      }
      if (boundary.length < 1 || boundary.length > 70) {
        throw Error("boundary must be 10-70 characters long");
      }
      const boundaryBytes = textEncoder.encode("--" + boundary + CRLF);
      const footerBytes = textEncoder.encode("--" + boundary + "--" + CRLF);
      let contentLength = footerBytes.byteLength;
      const parts = Array.from(form.entries()).map(([name, value]) => {
        const part = new FormDataPart(name, value);
        contentLength += part.size;
        return part;
      });
      contentLength += boundaryBytes.byteLength * parts.length;
      contentLength = utils_default.toFiniteNumber(contentLength);
      const computedHeaders = {
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      };
      if (Number.isFinite(contentLength)) {
        computedHeaders["Content-Length"] = contentLength;
      }
      headersHandler && headersHandler(computedHeaders);
      return import_stream2.Readable.from(
        async function* () {
          for (const part of parts) {
            yield boundaryBytes;
            yield* part.encode();
          }
          yield footerBytes;
        }()
      );
    };
    formDataToStream_default = formDataToStream;
  }
});

// ../../../../../node_modules/axios/lib/helpers/ZlibHeaderTransformStream.js
var import_stream3, ZlibHeaderTransformStream, ZlibHeaderTransformStream_default;
var init_ZlibHeaderTransformStream = __esm({
  "../../../../../node_modules/axios/lib/helpers/ZlibHeaderTransformStream.js"() {
    "use strict";
    import_stream3 = __toESM(require("stream"), 1);
    ZlibHeaderTransformStream = class extends import_stream3.default.Transform {
      __transform(chunk, encoding, callback) {
        this.push(chunk);
        callback();
      }
      _transform(chunk, encoding, callback) {
        if (chunk.length !== 0) {
          this._transform = this.__transform;
          if (chunk[0] !== 120) {
            const header = Buffer.alloc(2);
            header[0] = 120;
            header[1] = 156;
            this.push(header, encoding);
          }
        }
        this.__transform(chunk, encoding, callback);
      }
    };
    ZlibHeaderTransformStream_default = ZlibHeaderTransformStream;
  }
});

// ../../../../../node_modules/axios/lib/helpers/callbackify.js
var callbackify, callbackify_default;
var init_callbackify = __esm({
  "../../../../../node_modules/axios/lib/helpers/callbackify.js"() {
    init_utils();
    callbackify = (fn, reducer) => {
      return utils_default.isAsyncFn(fn) ? function(...args) {
        const cb = args.pop();
        fn.apply(this, args).then((value) => {
          try {
            reducer ? cb(null, ...reducer(value)) : cb(null, value);
          } catch (err) {
            cb(err);
          }
        }, cb);
      } : fn;
    };
    callbackify_default = callbackify;
  }
});

// ../../../../../node_modules/axios/lib/helpers/shouldBypassProxy.js
function shouldBypassProxy(location) {
  let parsed;
  try {
    parsed = new URL(location);
  } catch (_err) {
    return false;
  }
  const noProxy = (process.env.no_proxy || process.env.NO_PROXY || "").toLowerCase();
  if (!noProxy) {
    return false;
  }
  if (noProxy === "*") {
    return true;
  }
  const port = Number.parseInt(parsed.port, 10) || DEFAULT_PORTS2[parsed.protocol.split(":", 1)[0]] || 0;
  const hostname = normalizeNoProxyHost(parsed.hostname.toLowerCase());
  return noProxy.split(/[\s,]+/).some((entry) => {
    if (!entry) {
      return false;
    }
    let [entryHost, entryPort] = parseNoProxyEntry(entry);
    entryHost = normalizeNoProxyHost(entryHost);
    if (!entryHost) {
      return false;
    }
    if (entryPort && entryPort !== port) {
      return false;
    }
    if (entryHost.charAt(0) === "*") {
      entryHost = entryHost.slice(1);
    }
    if (entryHost.charAt(0) === ".") {
      return hostname.endsWith(entryHost);
    }
    return hostname === entryHost || isLoopback(hostname) && isLoopback(entryHost);
  });
}
var LOOPBACK_HOSTNAMES, isIPv4Loopback, isIPv6Loopback, isLoopback, DEFAULT_PORTS2, parseNoProxyEntry, normalizeNoProxyHost;
var init_shouldBypassProxy = __esm({
  "../../../../../node_modules/axios/lib/helpers/shouldBypassProxy.js"() {
    LOOPBACK_HOSTNAMES = /* @__PURE__ */ new Set(["localhost"]);
    isIPv4Loopback = (host) => {
      const parts = host.split(".");
      if (parts.length !== 4) return false;
      if (parts[0] !== "127") return false;
      return parts.every((p) => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
    };
    isIPv6Loopback = (host) => {
      if (host === "::1") return true;
      const v4MappedDotted = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
      if (v4MappedDotted) return isIPv4Loopback(v4MappedDotted[1]);
      const v4MappedHex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
      if (v4MappedHex) {
        const high = parseInt(v4MappedHex[1], 16);
        return high >= 32512 && high <= 32767;
      }
      const groups = host.split(":");
      if (groups.length === 8) {
        for (let i = 0; i < 7; i++) {
          if (!/^0+$/.test(groups[i])) return false;
        }
        return /^0*1$/.test(groups[7]);
      }
      return false;
    };
    isLoopback = (host) => {
      if (!host) return false;
      if (LOOPBACK_HOSTNAMES.has(host)) return true;
      if (isIPv4Loopback(host)) return true;
      return isIPv6Loopback(host);
    };
    DEFAULT_PORTS2 = {
      http: 80,
      https: 443,
      ws: 80,
      wss: 443,
      ftp: 21
    };
    parseNoProxyEntry = (entry) => {
      let entryHost = entry;
      let entryPort = 0;
      if (entryHost.charAt(0) === "[") {
        const bracketIndex = entryHost.indexOf("]");
        if (bracketIndex !== -1) {
          const host = entryHost.slice(1, bracketIndex);
          const rest = entryHost.slice(bracketIndex + 1);
          if (rest.charAt(0) === ":" && /^\d+$/.test(rest.slice(1))) {
            entryPort = Number.parseInt(rest.slice(1), 10);
          }
          return [host, entryPort];
        }
      }
      const firstColon = entryHost.indexOf(":");
      const lastColon = entryHost.lastIndexOf(":");
      if (firstColon !== -1 && firstColon === lastColon && /^\d+$/.test(entryHost.slice(lastColon + 1))) {
        entryPort = Number.parseInt(entryHost.slice(lastColon + 1), 10);
        entryHost = entryHost.slice(0, lastColon);
      }
      return [entryHost, entryPort];
    };
    normalizeNoProxyHost = (hostname) => {
      if (!hostname) {
        return hostname;
      }
      if (hostname.charAt(0) === "[" && hostname.charAt(hostname.length - 1) === "]") {
        hostname = hostname.slice(1, -1);
      }
      return hostname.replace(/\.+$/, "");
    };
  }
});

// ../../../../../node_modules/axios/lib/helpers/speedometer.js
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min = min !== void 0 ? min : 1e3;
  return function push(chunkLength) {
    const now = Date.now();
    const startedAt = timestamps[tail];
    if (!firstSampleTS) {
      firstSampleTS = now;
    }
    bytes[head] = chunkLength;
    timestamps[head] = now;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }
    if (now - firstSampleTS < min) {
      return;
    }
    const passed = startedAt && now - startedAt;
    return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
  };
}
var speedometer_default;
var init_speedometer = __esm({
  "../../../../../node_modules/axios/lib/helpers/speedometer.js"() {
    "use strict";
    speedometer_default = speedometer;
  }
});

// ../../../../../node_modules/axios/lib/helpers/throttle.js
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1e3 / freq;
  let lastArgs;
  let timer;
  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(...args);
  };
  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };
  const flush = () => lastArgs && invoke(lastArgs);
  return [throttled, flush];
}
var throttle_default;
var init_throttle = __esm({
  "../../../../../node_modules/axios/lib/helpers/throttle.js"() {
    throttle_default = throttle;
  }
});

// ../../../../../node_modules/axios/lib/helpers/progressEventReducer.js
var progressEventReducer, progressEventDecorator, asyncDecorator;
var init_progressEventReducer = __esm({
  "../../../../../node_modules/axios/lib/helpers/progressEventReducer.js"() {
    init_speedometer();
    init_throttle();
    init_utils();
    progressEventReducer = (listener, isDownloadStream, freq = 3) => {
      let bytesNotified = 0;
      const _speedometer = speedometer_default(50, 250);
      return throttle_default((e) => {
        const rawLoaded = e.loaded;
        const total = e.lengthComputable ? e.total : void 0;
        const loaded = total != null ? Math.min(rawLoaded, total) : rawLoaded;
        const progressBytes = Math.max(0, loaded - bytesNotified);
        const rate = _speedometer(progressBytes);
        bytesNotified = Math.max(bytesNotified, loaded);
        const data = {
          loaded,
          total,
          progress: total ? loaded / total : void 0,
          bytes: progressBytes,
          rate: rate ? rate : void 0,
          estimated: rate && total ? (total - loaded) / rate : void 0,
          event: e,
          lengthComputable: total != null,
          [isDownloadStream ? "download" : "upload"]: true
        };
        listener(data);
      }, freq);
    };
    progressEventDecorator = (total, throttled) => {
      const lengthComputable = total != null;
      return [
        (loaded) => throttled[0]({
          lengthComputable,
          total,
          loaded
        }),
        throttled[1]
      ];
    };
    asyncDecorator = (fn) => (...args) => utils_default.asap(() => fn(...args));
  }
});

// ../../../../../node_modules/axios/lib/helpers/estimateDataURLDecodedBytes.js
function estimateDataURLDecodedBytes(url2) {
  if (!url2 || typeof url2 !== "string") return 0;
  if (!url2.startsWith("data:")) return 0;
  const comma = url2.indexOf(",");
  if (comma < 0) return 0;
  const meta = url2.slice(5, comma);
  const body = url2.slice(comma + 1);
  const isBase64 = /;base64/i.test(meta);
  if (isBase64) {
    let effectiveLen = body.length;
    const len = body.length;
    for (let i = 0; i < len; i++) {
      if (body.charCodeAt(i) === 37 && i + 2 < len) {
        const a = body.charCodeAt(i + 1);
        const b = body.charCodeAt(i + 2);
        const isHex = (a >= 48 && a <= 57 || a >= 65 && a <= 70 || a >= 97 && a <= 102) && (b >= 48 && b <= 57 || b >= 65 && b <= 70 || b >= 97 && b <= 102);
        if (isHex) {
          effectiveLen -= 2;
          i += 2;
        }
      }
    }
    let pad = 0;
    let idx = len - 1;
    const tailIsPct3D = (j) => j >= 2 && body.charCodeAt(j - 2) === 37 && // '%'
    body.charCodeAt(j - 1) === 51 && // '3'
    (body.charCodeAt(j) === 68 || body.charCodeAt(j) === 100);
    if (idx >= 0) {
      if (body.charCodeAt(idx) === 61) {
        pad++;
        idx--;
      } else if (tailIsPct3D(idx)) {
        pad++;
        idx -= 3;
      }
    }
    if (pad === 1 && idx >= 0) {
      if (body.charCodeAt(idx) === 61) {
        pad++;
      } else if (tailIsPct3D(idx)) {
        pad++;
      }
    }
    const groups = Math.floor(effectiveLen / 4);
    const bytes = groups * 3 - (pad || 0);
    return bytes > 0 ? bytes : 0;
  }
  return Buffer.byteLength(body, "utf8");
}
var init_estimateDataURLDecodedBytes = __esm({
  "../../../../../node_modules/axios/lib/helpers/estimateDataURLDecodedBytes.js"() {
  }
});

// ../../../../../node_modules/axios/lib/adapters/http.js
function dispatchBeforeRedirect(options, responseDetails) {
  if (options.beforeRedirects.proxy) {
    options.beforeRedirects.proxy(options);
  }
  if (options.beforeRedirects.config) {
    options.beforeRedirects.config(options, responseDetails);
  }
}
function setProxy(options, configProxy, location) {
  let proxy = configProxy;
  if (!proxy && proxy !== false) {
    const proxyUrl = getProxyForUrl(location);
    if (proxyUrl) {
      if (!shouldBypassProxy(location)) {
        proxy = new URL(proxyUrl);
      }
    }
  }
  if (proxy) {
    if (proxy.username) {
      proxy.auth = (proxy.username || "") + ":" + (proxy.password || "");
    }
    if (proxy.auth) {
      const validProxyAuth = Boolean(proxy.auth.username || proxy.auth.password);
      if (validProxyAuth) {
        proxy.auth = (proxy.auth.username || "") + ":" + (proxy.auth.password || "");
      } else if (typeof proxy.auth === "object") {
        throw new AxiosError_default("Invalid proxy authorization", AxiosError_default.ERR_BAD_OPTION, { proxy });
      }
      const base64 = Buffer.from(proxy.auth, "utf8").toString("base64");
      options.headers["Proxy-Authorization"] = "Basic " + base64;
    }
    options.headers.host = options.hostname + (options.port ? ":" + options.port : "");
    const proxyHost = proxy.hostname || proxy.host;
    options.hostname = proxyHost;
    options.host = proxyHost;
    options.port = proxy.port;
    options.path = location;
    if (proxy.protocol) {
      options.protocol = proxy.protocol.includes(":") ? proxy.protocol : `${proxy.protocol}:`;
    }
  }
  options.beforeRedirects.proxy = function beforeRedirect(redirectOptions) {
    setProxy(redirectOptions, configProxy, redirectOptions.href);
  };
}
var import_http, import_https, import_http2, import_util2, import_path, import_follow_redirects, import_zlib, import_stream4, import_events, zlibOptions, brotliOptions, isBrotliSupported, httpFollow, httpsFollow, isHttps, kAxiosSocketListener, kAxiosCurrentReq, supportedProtocols, flushOnFinish, Http2Sessions, http2Sessions, isHttpAdapterSupported, wrapAsync, resolveFamily, buildAddressEntry, http2Transport, http_default;
var init_http = __esm({
  "../../../../../node_modules/axios/lib/adapters/http.js"() {
    init_utils();
    init_settle();
    init_buildFullPath();
    init_buildURL();
    init_proxy_from_env();
    import_http = __toESM(require("http"), 1);
    import_https = __toESM(require("https"), 1);
    import_http2 = __toESM(require("http2"), 1);
    import_util2 = __toESM(require("util"), 1);
    import_path = require("path");
    import_follow_redirects = __toESM(require_follow_redirects(), 1);
    import_zlib = __toESM(require("zlib"), 1);
    init_data();
    init_transitional();
    init_AxiosError();
    init_CanceledError();
    init_platform();
    init_fromDataURI();
    import_stream4 = __toESM(require("stream"), 1);
    init_AxiosHeaders();
    init_AxiosTransformStream();
    import_events = require("events");
    init_formDataToStream();
    init_readBlob();
    init_ZlibHeaderTransformStream();
    init_callbackify();
    init_shouldBypassProxy();
    init_progressEventReducer();
    init_estimateDataURLDecodedBytes();
    zlibOptions = {
      flush: import_zlib.default.constants.Z_SYNC_FLUSH,
      finishFlush: import_zlib.default.constants.Z_SYNC_FLUSH
    };
    brotliOptions = {
      flush: import_zlib.default.constants.BROTLI_OPERATION_FLUSH,
      finishFlush: import_zlib.default.constants.BROTLI_OPERATION_FLUSH
    };
    isBrotliSupported = utils_default.isFunction(import_zlib.default.createBrotliDecompress);
    ({ http: httpFollow, https: httpsFollow } = import_follow_redirects.default);
    isHttps = /https:?/;
    kAxiosSocketListener = Symbol("axios.http.socketListener");
    kAxiosCurrentReq = Symbol("axios.http.currentReq");
    supportedProtocols = platform_default.protocols.map((protocol) => {
      return protocol + ":";
    });
    flushOnFinish = (stream4, [throttled, flush]) => {
      stream4.on("end", flush).on("error", flush);
      return throttled;
    };
    Http2Sessions = class {
      constructor() {
        this.sessions = /* @__PURE__ */ Object.create(null);
      }
      getSession(authority, options) {
        options = Object.assign(
          {
            sessionTimeout: 1e3
          },
          options
        );
        let authoritySessions = this.sessions[authority];
        if (authoritySessions) {
          let len = authoritySessions.length;
          for (let i = 0; i < len; i++) {
            const [sessionHandle, sessionOptions] = authoritySessions[i];
            if (!sessionHandle.destroyed && !sessionHandle.closed && import_util2.default.isDeepStrictEqual(sessionOptions, options)) {
              return sessionHandle;
            }
          }
        }
        const session = import_http2.default.connect(authority, options);
        let removed;
        const removeSession = () => {
          if (removed) {
            return;
          }
          removed = true;
          let entries = authoritySessions, len = entries.length, i = len;
          while (i--) {
            if (entries[i][0] === session) {
              if (len === 1) {
                delete this.sessions[authority];
              } else {
                entries.splice(i, 1);
              }
              if (!session.closed) {
                session.close();
              }
              return;
            }
          }
        };
        const originalRequestFn = session.request;
        const { sessionTimeout } = options;
        if (sessionTimeout != null) {
          let timer;
          let streamsCount = 0;
          session.request = function() {
            const stream4 = originalRequestFn.apply(this, arguments);
            streamsCount++;
            if (timer) {
              clearTimeout(timer);
              timer = null;
            }
            stream4.once("close", () => {
              if (!--streamsCount) {
                timer = setTimeout(() => {
                  timer = null;
                  removeSession();
                }, sessionTimeout);
              }
            });
            return stream4;
          };
        }
        session.once("close", removeSession);
        let entry = [session, options];
        authoritySessions ? authoritySessions.push(entry) : authoritySessions = this.sessions[authority] = [entry];
        return session;
      }
    };
    http2Sessions = new Http2Sessions();
    isHttpAdapterSupported = typeof process !== "undefined" && utils_default.kindOf(process) === "process";
    wrapAsync = (asyncExecutor) => {
      return new Promise((resolve, reject) => {
        let onDone;
        let isDone;
        const done = (value, isRejected) => {
          if (isDone) return;
          isDone = true;
          onDone && onDone(value, isRejected);
        };
        const _resolve = (value) => {
          done(value);
          resolve(value);
        };
        const _reject = (reason) => {
          done(reason, true);
          reject(reason);
        };
        asyncExecutor(_resolve, _reject, (onDoneHandler) => onDone = onDoneHandler).catch(_reject);
      });
    };
    resolveFamily = ({ address, family }) => {
      if (!utils_default.isString(address)) {
        throw TypeError("address must be a string");
      }
      return {
        address,
        family: family || (address.indexOf(".") < 0 ? 6 : 4)
      };
    };
    buildAddressEntry = (address, family) => resolveFamily(utils_default.isObject(address) ? address : { address, family });
    http2Transport = {
      request(options, cb) {
        const authority = options.protocol + "//" + options.hostname + ":" + (options.port || (options.protocol === "https:" ? 443 : 80));
        const { http2Options, headers } = options;
        const session = http2Sessions.getSession(authority, http2Options);
        const { HTTP2_HEADER_SCHEME, HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH, HTTP2_HEADER_STATUS } = import_http2.default.constants;
        const http2Headers = {
          [HTTP2_HEADER_SCHEME]: options.protocol.replace(":", ""),
          [HTTP2_HEADER_METHOD]: options.method,
          [HTTP2_HEADER_PATH]: options.path
        };
        utils_default.forEach(headers, (header, name) => {
          name.charAt(0) !== ":" && (http2Headers[name] = header);
        });
        const req = session.request(http2Headers);
        req.once("response", (responseHeaders) => {
          const response = req;
          responseHeaders = Object.assign({}, responseHeaders);
          const status = responseHeaders[HTTP2_HEADER_STATUS];
          delete responseHeaders[HTTP2_HEADER_STATUS];
          response.headers = responseHeaders;
          response.statusCode = +status;
          cb(response);
        });
        return req;
      }
    };
    http_default = isHttpAdapterSupported && function httpAdapter(config) {
      return wrapAsync(async function dispatchHttpRequest(resolve, reject, onDone) {
        const own2 = (key) => utils_default.hasOwnProp(config, key) ? config[key] : void 0;
        let data = own2("data");
        let lookup = own2("lookup");
        let family = own2("family");
        let httpVersion = own2("httpVersion");
        if (httpVersion === void 0) httpVersion = 1;
        let http2Options = own2("http2Options");
        const responseType = own2("responseType");
        const responseEncoding = own2("responseEncoding");
        const method = config.method.toUpperCase();
        let isDone;
        let rejected = false;
        let req;
        httpVersion = +httpVersion;
        if (Number.isNaN(httpVersion)) {
          throw TypeError(`Invalid protocol version: '${config.httpVersion}' is not a number`);
        }
        if (httpVersion !== 1 && httpVersion !== 2) {
          throw TypeError(`Unsupported protocol version '${httpVersion}'`);
        }
        const isHttp2 = httpVersion === 2;
        if (lookup) {
          const _lookup = callbackify_default(lookup, (value) => utils_default.isArray(value) ? value : [value]);
          lookup = (hostname, opt, cb) => {
            _lookup(hostname, opt, (err, arg0, arg1) => {
              if (err) {
                return cb(err);
              }
              const addresses = utils_default.isArray(arg0) ? arg0.map((addr) => buildAddressEntry(addr)) : [buildAddressEntry(arg0, arg1)];
              opt.all ? cb(err, addresses) : cb(err, addresses[0].address, addresses[0].family);
            });
          };
        }
        const abortEmitter = new import_events.EventEmitter();
        function abort(reason) {
          try {
            abortEmitter.emit(
              "abort",
              !reason || reason.type ? new CanceledError_default(null, config, req) : reason
            );
          } catch (err) {
            console.warn("emit error", err);
          }
        }
        abortEmitter.once("abort", reject);
        const onFinished = () => {
          if (config.cancelToken) {
            config.cancelToken.unsubscribe(abort);
          }
          if (config.signal) {
            config.signal.removeEventListener("abort", abort);
          }
          abortEmitter.removeAllListeners();
        };
        if (config.cancelToken || config.signal) {
          config.cancelToken && config.cancelToken.subscribe(abort);
          if (config.signal) {
            config.signal.aborted ? abort() : config.signal.addEventListener("abort", abort);
          }
        }
        onDone((response, isRejected) => {
          isDone = true;
          if (isRejected) {
            rejected = true;
            onFinished();
            return;
          }
          const { data: data2 } = response;
          if (data2 instanceof import_stream4.default.Readable || data2 instanceof import_stream4.default.Duplex) {
            const offListeners = import_stream4.default.finished(data2, () => {
              offListeners();
              onFinished();
            });
          } else {
            onFinished();
          }
        });
        const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
        const parsed = new URL(fullPath, platform_default.hasBrowserEnv ? platform_default.origin : void 0);
        const protocol = parsed.protocol || supportedProtocols[0];
        if (protocol === "data:") {
          if (config.maxContentLength > -1) {
            const dataUrl = String(config.url || fullPath || "");
            const estimated = estimateDataURLDecodedBytes(dataUrl);
            if (estimated > config.maxContentLength) {
              return reject(
                new AxiosError_default(
                  "maxContentLength size of " + config.maxContentLength + " exceeded",
                  AxiosError_default.ERR_BAD_RESPONSE,
                  config
                )
              );
            }
          }
          let convertedData;
          if (method !== "GET") {
            return settle(resolve, reject, {
              status: 405,
              statusText: "method not allowed",
              headers: {},
              config
            });
          }
          try {
            convertedData = fromDataURI(config.url, responseType === "blob", {
              Blob: config.env && config.env.Blob
            });
          } catch (err) {
            throw AxiosError_default.from(err, AxiosError_default.ERR_BAD_REQUEST, config);
          }
          if (responseType === "text") {
            convertedData = convertedData.toString(responseEncoding);
            if (!responseEncoding || responseEncoding === "utf8") {
              convertedData = utils_default.stripBOM(convertedData);
            }
          } else if (responseType === "stream") {
            convertedData = import_stream4.default.Readable.from(convertedData);
          }
          return settle(resolve, reject, {
            data: convertedData,
            status: 200,
            statusText: "OK",
            headers: new AxiosHeaders_default(),
            config
          });
        }
        if (supportedProtocols.indexOf(protocol) === -1) {
          return reject(
            new AxiosError_default("Unsupported protocol " + protocol, AxiosError_default.ERR_BAD_REQUEST, config)
          );
        }
        const headers = AxiosHeaders_default.from(config.headers).normalize();
        headers.set("User-Agent", "axios/" + VERSION, false);
        const { onUploadProgress, onDownloadProgress } = config;
        const maxRate = config.maxRate;
        let maxUploadRate = void 0;
        let maxDownloadRate = void 0;
        if (utils_default.isSpecCompliantForm(data)) {
          const userBoundary = headers.getContentType(/boundary=([-_\w\d]{10,70})/i);
          data = formDataToStream_default(
            data,
            (formHeaders) => {
              headers.set(formHeaders);
            },
            {
              tag: `axios-${VERSION}-boundary`,
              boundary: userBoundary && userBoundary[1] || void 0
            }
          );
        } else if (utils_default.isFormData(data) && utils_default.isFunction(data.getHeaders) && data.getHeaders !== Object.prototype.getHeaders) {
          headers.set(data.getHeaders());
          if (!headers.hasContentLength()) {
            try {
              const knownLength = await import_util2.default.promisify(data.getLength).call(data);
              Number.isFinite(knownLength) && knownLength >= 0 && headers.setContentLength(knownLength);
            } catch (e) {
            }
          }
        } else if (utils_default.isBlob(data) || utils_default.isFile(data)) {
          data.size && headers.setContentType(data.type || "application/octet-stream");
          headers.setContentLength(data.size || 0);
          data = import_stream4.default.Readable.from(readBlob_default(data));
        } else if (data && !utils_default.isStream(data)) {
          if (Buffer.isBuffer(data)) {
          } else if (utils_default.isArrayBuffer(data)) {
            data = Buffer.from(new Uint8Array(data));
          } else if (utils_default.isString(data)) {
            data = Buffer.from(data, "utf-8");
          } else {
            return reject(
              new AxiosError_default(
                "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
                AxiosError_default.ERR_BAD_REQUEST,
                config
              )
            );
          }
          headers.setContentLength(data.length, false);
          if (config.maxBodyLength > -1 && data.length > config.maxBodyLength) {
            return reject(
              new AxiosError_default(
                "Request body larger than maxBodyLength limit",
                AxiosError_default.ERR_BAD_REQUEST,
                config
              )
            );
          }
        }
        const contentLength = utils_default.toFiniteNumber(headers.getContentLength());
        if (utils_default.isArray(maxRate)) {
          maxUploadRate = maxRate[0];
          maxDownloadRate = maxRate[1];
        } else {
          maxUploadRate = maxDownloadRate = maxRate;
        }
        if (data && (onUploadProgress || maxUploadRate)) {
          if (!utils_default.isStream(data)) {
            data = import_stream4.default.Readable.from(data, { objectMode: false });
          }
          data = import_stream4.default.pipeline(
            [
              data,
              new AxiosTransformStream_default({
                maxRate: utils_default.toFiniteNumber(maxUploadRate)
              })
            ],
            utils_default.noop
          );
          onUploadProgress && data.on(
            "progress",
            flushOnFinish(
              data,
              progressEventDecorator(
                contentLength,
                progressEventReducer(asyncDecorator(onUploadProgress), false, 3)
              )
            )
          );
        }
        let auth = void 0;
        const configAuth = own2("auth");
        if (configAuth) {
          const username = configAuth.username || "";
          const password = configAuth.password || "";
          auth = username + ":" + password;
        }
        if (!auth && parsed.username) {
          const urlUsername = parsed.username;
          const urlPassword = parsed.password;
          auth = urlUsername + ":" + urlPassword;
        }
        auth && headers.delete("authorization");
        let path;
        try {
          path = buildURL(
            parsed.pathname + parsed.search,
            config.params,
            config.paramsSerializer
          ).replace(/^\?/, "");
        } catch (err) {
          const customErr = new Error(err.message);
          customErr.config = config;
          customErr.url = config.url;
          customErr.exists = true;
          return reject(customErr);
        }
        headers.set(
          "Accept-Encoding",
          "gzip, compress, deflate" + (isBrotliSupported ? ", br" : ""),
          false
        );
        const options = Object.assign(/* @__PURE__ */ Object.create(null), {
          path,
          method,
          headers: headers.toJSON(),
          agents: { http: config.httpAgent, https: config.httpsAgent },
          auth,
          protocol,
          family,
          beforeRedirect: dispatchBeforeRedirect,
          beforeRedirects: /* @__PURE__ */ Object.create(null),
          http2Options
        });
        !utils_default.isUndefined(lookup) && (options.lookup = lookup);
        if (config.socketPath) {
          if (typeof config.socketPath !== "string") {
            return reject(new AxiosError_default(
              "socketPath must be a string",
              AxiosError_default.ERR_BAD_OPTION_VALUE,
              config
            ));
          }
          if (config.allowedSocketPaths != null) {
            const allowed = Array.isArray(config.allowedSocketPaths) ? config.allowedSocketPaths : [config.allowedSocketPaths];
            const resolvedSocket = (0, import_path.resolve)(config.socketPath);
            const isAllowed = allowed.some(
              (entry) => typeof entry === "string" && (0, import_path.resolve)(entry) === resolvedSocket
            );
            if (!isAllowed) {
              return reject(new AxiosError_default(
                `socketPath "${config.socketPath}" is not permitted by allowedSocketPaths`,
                AxiosError_default.ERR_BAD_OPTION_VALUE,
                config
              ));
            }
          }
          options.socketPath = config.socketPath;
        } else {
          options.hostname = parsed.hostname.startsWith("[") ? parsed.hostname.slice(1, -1) : parsed.hostname;
          options.port = parsed.port;
          setProxy(
            options,
            config.proxy,
            protocol + "//" + parsed.hostname + (parsed.port ? ":" + parsed.port : "") + options.path
          );
        }
        let transport;
        const isHttpsRequest = isHttps.test(options.protocol);
        options.agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;
        if (isHttp2) {
          transport = http2Transport;
        } else {
          const configTransport = own2("transport");
          if (configTransport) {
            transport = configTransport;
          } else if (config.maxRedirects === 0) {
            transport = isHttpsRequest ? import_https.default : import_http.default;
          } else {
            if (config.maxRedirects) {
              options.maxRedirects = config.maxRedirects;
            }
            const configBeforeRedirect = own2("beforeRedirect");
            if (configBeforeRedirect) {
              options.beforeRedirects.config = configBeforeRedirect;
            }
            transport = isHttpsRequest ? httpsFollow : httpFollow;
          }
        }
        if (config.maxBodyLength > -1) {
          options.maxBodyLength = config.maxBodyLength;
        } else {
          options.maxBodyLength = Infinity;
        }
        options.insecureHTTPParser = Boolean(own2("insecureHTTPParser"));
        req = transport.request(options, function handleResponse(res) {
          if (req.destroyed) return;
          const streams = [res];
          const responseLength = utils_default.toFiniteNumber(res.headers["content-length"]);
          if (onDownloadProgress || maxDownloadRate) {
            const transformStream = new AxiosTransformStream_default({
              maxRate: utils_default.toFiniteNumber(maxDownloadRate)
            });
            onDownloadProgress && transformStream.on(
              "progress",
              flushOnFinish(
                transformStream,
                progressEventDecorator(
                  responseLength,
                  progressEventReducer(asyncDecorator(onDownloadProgress), true, 3)
                )
              )
            );
            streams.push(transformStream);
          }
          let responseStream = res;
          const lastRequest = res.req || req;
          if (config.decompress !== false && res.headers["content-encoding"]) {
            if (method === "HEAD" || res.statusCode === 204) {
              delete res.headers["content-encoding"];
            }
            switch ((res.headers["content-encoding"] || "").toLowerCase()) {
              case "gzip":
              case "x-gzip":
              case "compress":
              case "x-compress":
                streams.push(import_zlib.default.createUnzip(zlibOptions));
                delete res.headers["content-encoding"];
                break;
              case "deflate":
                streams.push(new ZlibHeaderTransformStream_default());
                streams.push(import_zlib.default.createUnzip(zlibOptions));
                delete res.headers["content-encoding"];
                break;
              case "br":
                if (isBrotliSupported) {
                  streams.push(import_zlib.default.createBrotliDecompress(brotliOptions));
                  delete res.headers["content-encoding"];
                }
            }
          }
          responseStream = streams.length > 1 ? import_stream4.default.pipeline(streams, utils_default.noop) : streams[0];
          const response = {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: new AxiosHeaders_default(res.headers),
            config,
            request: lastRequest
          };
          if (responseType === "stream") {
            if (config.maxContentLength > -1) {
              const limit = config.maxContentLength;
              const source = responseStream;
              async function* enforceMaxContentLength() {
                let totalResponseBytes = 0;
                for await (const chunk of source) {
                  totalResponseBytes += chunk.length;
                  if (totalResponseBytes > limit) {
                    throw new AxiosError_default(
                      "maxContentLength size of " + limit + " exceeded",
                      AxiosError_default.ERR_BAD_RESPONSE,
                      config,
                      lastRequest
                    );
                  }
                  yield chunk;
                }
              }
              responseStream = import_stream4.default.Readable.from(enforceMaxContentLength(), {
                objectMode: false
              });
            }
            response.data = responseStream;
            settle(resolve, reject, response);
          } else {
            const responseBuffer = [];
            let totalResponseBytes = 0;
            responseStream.on("data", function handleStreamData(chunk) {
              responseBuffer.push(chunk);
              totalResponseBytes += chunk.length;
              if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
                rejected = true;
                responseStream.destroy();
                abort(
                  new AxiosError_default(
                    "maxContentLength size of " + config.maxContentLength + " exceeded",
                    AxiosError_default.ERR_BAD_RESPONSE,
                    config,
                    lastRequest
                  )
                );
              }
            });
            responseStream.on("aborted", function handlerStreamAborted() {
              if (rejected) {
                return;
              }
              const err = new AxiosError_default(
                "stream has been aborted",
                AxiosError_default.ERR_BAD_RESPONSE,
                config,
                lastRequest
              );
              responseStream.destroy(err);
              reject(err);
            });
            responseStream.on("error", function handleStreamError(err) {
              if (req.destroyed) return;
              reject(AxiosError_default.from(err, null, config, lastRequest));
            });
            responseStream.on("end", function handleStreamEnd() {
              try {
                let responseData = responseBuffer.length === 1 ? responseBuffer[0] : Buffer.concat(responseBuffer);
                if (responseType !== "arraybuffer") {
                  responseData = responseData.toString(responseEncoding);
                  if (!responseEncoding || responseEncoding === "utf8") {
                    responseData = utils_default.stripBOM(responseData);
                  }
                }
                response.data = responseData;
              } catch (err) {
                return reject(AxiosError_default.from(err, null, config, response.request, response));
              }
              settle(resolve, reject, response);
            });
          }
          abortEmitter.once("abort", (err) => {
            if (!responseStream.destroyed) {
              responseStream.emit("error", err);
              responseStream.destroy();
            }
          });
        });
        abortEmitter.once("abort", (err) => {
          if (req.close) {
            req.close();
          } else {
            req.destroy(err);
          }
        });
        req.on("error", function handleRequestError(err) {
          reject(AxiosError_default.from(err, null, config, req));
        });
        req.on("socket", function handleRequestSocket(socket) {
          socket.setKeepAlive(true, 1e3 * 60);
          if (!socket[kAxiosSocketListener]) {
            socket.on("error", function handleSocketError(err) {
              const current = socket[kAxiosCurrentReq];
              if (current && !current.destroyed) {
                current.destroy(err);
              }
            });
            socket[kAxiosSocketListener] = true;
          }
          socket[kAxiosCurrentReq] = req;
          req.once("close", function clearCurrentReq() {
            if (socket[kAxiosCurrentReq] === req) {
              socket[kAxiosCurrentReq] = null;
            }
          });
        });
        if (config.timeout) {
          const timeout = parseInt(config.timeout, 10);
          if (Number.isNaN(timeout)) {
            abort(
              new AxiosError_default(
                "error trying to parse `config.timeout` to int",
                AxiosError_default.ERR_BAD_OPTION_VALUE,
                config,
                req
              )
            );
            return;
          }
          req.setTimeout(timeout, function handleRequestTimeout() {
            if (isDone) return;
            let timeoutErrorMessage = config.timeout ? "timeout of " + config.timeout + "ms exceeded" : "timeout exceeded";
            const transitional2 = config.transitional || transitional_default;
            if (config.timeoutErrorMessage) {
              timeoutErrorMessage = config.timeoutErrorMessage;
            }
            abort(
              new AxiosError_default(
                timeoutErrorMessage,
                transitional2.clarifyTimeoutError ? AxiosError_default.ETIMEDOUT : AxiosError_default.ECONNABORTED,
                config,
                req
              )
            );
          });
        } else {
          req.setTimeout(0);
        }
        if (utils_default.isStream(data)) {
          let ended = false;
          let errored = false;
          data.on("end", () => {
            ended = true;
          });
          data.once("error", (err) => {
            errored = true;
            req.destroy(err);
          });
          data.on("close", () => {
            if (!ended && !errored) {
              abort(new CanceledError_default("Request stream has been aborted", config, req));
            }
          });
          let uploadStream = data;
          if (config.maxBodyLength > -1 && config.maxRedirects === 0) {
            const limit = config.maxBodyLength;
            let bytesSent = 0;
            uploadStream = import_stream4.default.pipeline(
              [
                data,
                new import_stream4.default.Transform({
                  transform(chunk, _enc, cb) {
                    bytesSent += chunk.length;
                    if (bytesSent > limit) {
                      return cb(
                        new AxiosError_default(
                          "Request body larger than maxBodyLength limit",
                          AxiosError_default.ERR_BAD_REQUEST,
                          config,
                          req
                        )
                      );
                    }
                    cb(null, chunk);
                  }
                })
              ],
              utils_default.noop
            );
            uploadStream.on("error", (err) => {
              if (!req.destroyed) req.destroy(err);
            });
          }
          uploadStream.pipe(req);
        } else {
          data && req.write(data);
          req.end();
        }
      });
    };
  }
});

// ../../../../../node_modules/axios/lib/helpers/isURLSameOrigin.js
var isURLSameOrigin_default;
var init_isURLSameOrigin = __esm({
  "../../../../../node_modules/axios/lib/helpers/isURLSameOrigin.js"() {
    init_platform();
    isURLSameOrigin_default = platform_default.hasStandardBrowserEnv ? /* @__PURE__ */ ((origin2, isMSIE) => (url2) => {
      url2 = new URL(url2, platform_default.origin);
      return origin2.protocol === url2.protocol && origin2.host === url2.host && (isMSIE || origin2.port === url2.port);
    })(
      new URL(platform_default.origin),
      platform_default.navigator && /(msie|trident)/i.test(platform_default.navigator.userAgent)
    ) : () => true;
  }
});

// ../../../../../node_modules/axios/lib/helpers/cookies.js
var cookies_default;
var init_cookies = __esm({
  "../../../../../node_modules/axios/lib/helpers/cookies.js"() {
    init_utils();
    init_platform();
    cookies_default = platform_default.hasStandardBrowserEnv ? (
      // Standard browser envs support document.cookie
      {
        write(name, value, expires, path, domain, secure, sameSite) {
          if (typeof document === "undefined") return;
          const cookie = [`${name}=${encodeURIComponent(value)}`];
          if (utils_default.isNumber(expires)) {
            cookie.push(`expires=${new Date(expires).toUTCString()}`);
          }
          if (utils_default.isString(path)) {
            cookie.push(`path=${path}`);
          }
          if (utils_default.isString(domain)) {
            cookie.push(`domain=${domain}`);
          }
          if (secure === true) {
            cookie.push("secure");
          }
          if (utils_default.isString(sameSite)) {
            cookie.push(`SameSite=${sameSite}`);
          }
          document.cookie = cookie.join("; ");
        },
        read(name) {
          if (typeof document === "undefined") return null;
          const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
          return match ? decodeURIComponent(match[1]) : null;
        },
        remove(name) {
          this.write(name, "", Date.now() - 864e5, "/");
        }
      }
    ) : (
      // Non-standard browser env (web workers, react-native) lack needed support.
      {
        write() {
        },
        read() {
          return null;
        },
        remove() {
        }
      }
    );
  }
});

// ../../../../../node_modules/axios/lib/core/mergeConfig.js
function mergeConfig(config1, config2) {
  config2 = config2 || {};
  const config = /* @__PURE__ */ Object.create(null);
  Object.defineProperty(config, "hasOwnProperty", {
    value: Object.prototype.hasOwnProperty,
    enumerable: false,
    writable: true,
    configurable: true
  });
  function getMergedValue(target, source, prop, caseless) {
    if (utils_default.isPlainObject(target) && utils_default.isPlainObject(source)) {
      return utils_default.merge.call({ caseless }, target, source);
    } else if (utils_default.isPlainObject(source)) {
      return utils_default.merge({}, source);
    } else if (utils_default.isArray(source)) {
      return source.slice();
    }
    return source;
  }
  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(a, b, prop, caseless);
    } else if (!utils_default.isUndefined(a)) {
      return getMergedValue(void 0, a, prop, caseless);
    }
  }
  function valueFromConfig2(a, b) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(void 0, b);
    }
  }
  function defaultToConfig2(a, b) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(void 0, b);
    } else if (!utils_default.isUndefined(a)) {
      return getMergedValue(void 0, a);
    }
  }
  function mergeDirectKeys(a, b, prop) {
    if (utils_default.hasOwnProp(config2, prop)) {
      return getMergedValue(a, b);
    } else if (utils_default.hasOwnProp(config1, prop)) {
      return getMergedValue(void 0, a);
    }
  }
  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    allowedSocketPaths: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
  };
  utils_default.forEach(Object.keys({ ...config1, ...config2 }), function computeConfigValue(prop) {
    if (prop === "__proto__" || prop === "constructor" || prop === "prototype") return;
    const merge2 = utils_default.hasOwnProp(mergeMap, prop) ? mergeMap[prop] : mergeDeepProperties;
    const a = utils_default.hasOwnProp(config1, prop) ? config1[prop] : void 0;
    const b = utils_default.hasOwnProp(config2, prop) ? config2[prop] : void 0;
    const configValue = merge2(a, b, prop);
    utils_default.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
  });
  return config;
}
var headersToObject;
var init_mergeConfig = __esm({
  "../../../../../node_modules/axios/lib/core/mergeConfig.js"() {
    "use strict";
    init_utils();
    init_AxiosHeaders();
    headersToObject = (thing) => thing instanceof AxiosHeaders_default ? { ...thing } : thing;
  }
});

// ../../../../../node_modules/axios/lib/helpers/resolveConfig.js
var resolveConfig_default;
var init_resolveConfig = __esm({
  "../../../../../node_modules/axios/lib/helpers/resolveConfig.js"() {
    init_platform();
    init_utils();
    init_isURLSameOrigin();
    init_cookies();
    init_buildFullPath();
    init_mergeConfig();
    init_AxiosHeaders();
    init_buildURL();
    resolveConfig_default = (config) => {
      const newConfig = mergeConfig({}, config);
      const own2 = (key) => utils_default.hasOwnProp(newConfig, key) ? newConfig[key] : void 0;
      const data = own2("data");
      let withXSRFToken = own2("withXSRFToken");
      const xsrfHeaderName = own2("xsrfHeaderName");
      const xsrfCookieName = own2("xsrfCookieName");
      let headers = own2("headers");
      const auth = own2("auth");
      const baseURL = own2("baseURL");
      const allowAbsoluteUrls = own2("allowAbsoluteUrls");
      const url2 = own2("url");
      newConfig.headers = headers = AxiosHeaders_default.from(headers);
      newConfig.url = buildURL(
        buildFullPath(baseURL, url2, allowAbsoluteUrls),
        config.params,
        config.paramsSerializer
      );
      if (auth) {
        headers.set(
          "Authorization",
          "Basic " + btoa(
            (auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : "")
          )
        );
      }
      if (utils_default.isFormData(data)) {
        if (platform_default.hasStandardBrowserEnv || platform_default.hasStandardBrowserWebWorkerEnv) {
          headers.setContentType(void 0);
        } else if (utils_default.isFunction(data.getHeaders)) {
          const formHeaders = data.getHeaders();
          const allowedHeaders = ["content-type", "content-length"];
          Object.entries(formHeaders).forEach(([key, val]) => {
            if (allowedHeaders.includes(key.toLowerCase())) {
              headers.set(key, val);
            }
          });
        }
      }
      if (platform_default.hasStandardBrowserEnv) {
        if (utils_default.isFunction(withXSRFToken)) {
          withXSRFToken = withXSRFToken(newConfig);
        }
        const shouldSendXSRF = withXSRFToken === true || withXSRFToken == null && isURLSameOrigin_default(newConfig.url);
        if (shouldSendXSRF) {
          const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies_default.read(xsrfCookieName);
          if (xsrfValue) {
            headers.set(xsrfHeaderName, xsrfValue);
          }
        }
      }
      return newConfig;
    };
  }
});

// ../../../../../node_modules/axios/lib/adapters/xhr.js
var isXHRAdapterSupported, xhr_default;
var init_xhr = __esm({
  "../../../../../node_modules/axios/lib/adapters/xhr.js"() {
    init_utils();
    init_settle();
    init_transitional();
    init_AxiosError();
    init_CanceledError();
    init_parseProtocol();
    init_platform();
    init_AxiosHeaders();
    init_progressEventReducer();
    init_resolveConfig();
    isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
    xhr_default = isXHRAdapterSupported && function(config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        const _config = resolveConfig_default(config);
        let requestData = _config.data;
        const requestHeaders = AxiosHeaders_default.from(_config.headers).normalize();
        let { responseType, onUploadProgress, onDownloadProgress } = _config;
        let onCanceled;
        let uploadThrottled, downloadThrottled;
        let flushUpload, flushDownload;
        function done() {
          flushUpload && flushUpload();
          flushDownload && flushDownload();
          _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
          _config.signal && _config.signal.removeEventListener("abort", onCanceled);
        }
        let request = new XMLHttpRequest();
        request.open(_config.method.toUpperCase(), _config.url, true);
        request.timeout = _config.timeout;
        function onloadend() {
          if (!request) {
            return;
          }
          const responseHeaders = AxiosHeaders_default.from(
            "getAllResponseHeaders" in request && request.getAllResponseHeaders()
          );
          const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
          const response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config,
            request
          };
          settle(
            function _resolve(value) {
              resolve(value);
              done();
            },
            function _reject(err) {
              reject(err);
              done();
            },
            response
          );
          request = null;
        }
        if ("onloadend" in request) {
          request.onloadend = onloadend;
        } else {
          request.onreadystatechange = function handleLoad() {
            if (!request || request.readyState !== 4) {
              return;
            }
            if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
              return;
            }
            setTimeout(onloadend);
          };
        }
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }
          reject(new AxiosError_default("Request aborted", AxiosError_default.ECONNABORTED, config, request));
          request = null;
        };
        request.onerror = function handleError(event) {
          const msg = event && event.message ? event.message : "Network Error";
          const err = new AxiosError_default(msg, AxiosError_default.ERR_NETWORK, config, request);
          err.event = event || null;
          reject(err);
          request = null;
        };
        request.ontimeout = function handleTimeout() {
          let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
          const transitional2 = _config.transitional || transitional_default;
          if (_config.timeoutErrorMessage) {
            timeoutErrorMessage = _config.timeoutErrorMessage;
          }
          reject(
            new AxiosError_default(
              timeoutErrorMessage,
              transitional2.clarifyTimeoutError ? AxiosError_default.ETIMEDOUT : AxiosError_default.ECONNABORTED,
              config,
              request
            )
          );
          request = null;
        };
        requestData === void 0 && requestHeaders.setContentType(null);
        if ("setRequestHeader" in request) {
          utils_default.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
            request.setRequestHeader(key, val);
          });
        }
        if (!utils_default.isUndefined(_config.withCredentials)) {
          request.withCredentials = !!_config.withCredentials;
        }
        if (responseType && responseType !== "json") {
          request.responseType = _config.responseType;
        }
        if (onDownloadProgress) {
          [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
          request.addEventListener("progress", downloadThrottled);
        }
        if (onUploadProgress && request.upload) {
          [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
          request.upload.addEventListener("progress", uploadThrottled);
          request.upload.addEventListener("loadend", flushUpload);
        }
        if (_config.cancelToken || _config.signal) {
          onCanceled = (cancel) => {
            if (!request) {
              return;
            }
            reject(!cancel || cancel.type ? new CanceledError_default(null, config, request) : cancel);
            request.abort();
            request = null;
          };
          _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
          if (_config.signal) {
            _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
          }
        }
        const protocol = parseProtocol(_config.url);
        if (protocol && platform_default.protocols.indexOf(protocol) === -1) {
          reject(
            new AxiosError_default(
              "Unsupported protocol " + protocol + ":",
              AxiosError_default.ERR_BAD_REQUEST,
              config
            )
          );
          return;
        }
        request.send(requestData || null);
      });
    };
  }
});

// ../../../../../node_modules/axios/lib/helpers/composeSignals.js
var composeSignals, composeSignals_default;
var init_composeSignals = __esm({
  "../../../../../node_modules/axios/lib/helpers/composeSignals.js"() {
    init_CanceledError();
    init_AxiosError();
    init_utils();
    composeSignals = (signals, timeout) => {
      const { length } = signals = signals ? signals.filter(Boolean) : [];
      if (timeout || length) {
        let controller = new AbortController();
        let aborted;
        const onabort = function(reason) {
          if (!aborted) {
            aborted = true;
            unsubscribe();
            const err = reason instanceof Error ? reason : this.reason;
            controller.abort(
              err instanceof AxiosError_default ? err : new CanceledError_default(err instanceof Error ? err.message : err)
            );
          }
        };
        let timer = timeout && setTimeout(() => {
          timer = null;
          onabort(new AxiosError_default(`timeout of ${timeout}ms exceeded`, AxiosError_default.ETIMEDOUT));
        }, timeout);
        const unsubscribe = () => {
          if (signals) {
            timer && clearTimeout(timer);
            timer = null;
            signals.forEach((signal2) => {
              signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
            });
            signals = null;
          }
        };
        signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
        const { signal } = controller;
        signal.unsubscribe = () => utils_default.asap(unsubscribe);
        return signal;
      }
    };
    composeSignals_default = composeSignals;
  }
});

// ../../../../../node_modules/axios/lib/helpers/trackStream.js
var streamChunk, readBytes, readStream, trackStream;
var init_trackStream = __esm({
  "../../../../../node_modules/axios/lib/helpers/trackStream.js"() {
    streamChunk = function* (chunk, chunkSize) {
      let len = chunk.byteLength;
      if (!chunkSize || len < chunkSize) {
        yield chunk;
        return;
      }
      let pos = 0;
      let end;
      while (pos < len) {
        end = pos + chunkSize;
        yield chunk.slice(pos, end);
        pos = end;
      }
    };
    readBytes = async function* (iterable, chunkSize) {
      for await (const chunk of readStream(iterable)) {
        yield* streamChunk(chunk, chunkSize);
      }
    };
    readStream = async function* (stream4) {
      if (stream4[Symbol.asyncIterator]) {
        yield* stream4;
        return;
      }
      const reader = stream4.getReader();
      try {
        for (; ; ) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          yield value;
        }
      } finally {
        await reader.cancel();
      }
    };
    trackStream = (stream4, chunkSize, onProgress, onFinish) => {
      const iterator2 = readBytes(stream4, chunkSize);
      let bytes = 0;
      let done;
      let _onFinish = (e) => {
        if (!done) {
          done = true;
          onFinish && onFinish(e);
        }
      };
      return new ReadableStream(
        {
          async pull(controller) {
            try {
              const { done: done2, value } = await iterator2.next();
              if (done2) {
                _onFinish();
                controller.close();
                return;
              }
              let len = value.byteLength;
              if (onProgress) {
                let loadedBytes = bytes += len;
                onProgress(loadedBytes);
              }
              controller.enqueue(new Uint8Array(value));
            } catch (err) {
              _onFinish(err);
              throw err;
            }
          },
          cancel(reason) {
            _onFinish(reason);
            return iterator2.return();
          }
        },
        {
          highWaterMark: 2
        }
      );
    };
  }
});

// ../../../../../node_modules/axios/lib/adapters/fetch.js
var DEFAULT_CHUNK_SIZE, isFunction2, globalFetchAPI, ReadableStream2, TextEncoder2, test, factory, seedCache, getFetch, adapter;
var init_fetch = __esm({
  "../../../../../node_modules/axios/lib/adapters/fetch.js"() {
    init_platform();
    init_utils();
    init_AxiosError();
    init_composeSignals();
    init_trackStream();
    init_AxiosHeaders();
    init_progressEventReducer();
    init_resolveConfig();
    init_settle();
    DEFAULT_CHUNK_SIZE = 64 * 1024;
    ({ isFunction: isFunction2 } = utils_default);
    globalFetchAPI = (({ Request, Response }) => ({
      Request,
      Response
    }))(utils_default.global);
    ({ ReadableStream: ReadableStream2, TextEncoder: TextEncoder2 } = utils_default.global);
    test = (fn, ...args) => {
      try {
        return !!fn(...args);
      } catch (e) {
        return false;
      }
    };
    factory = (env) => {
      env = utils_default.merge.call(
        {
          skipUndefined: true
        },
        globalFetchAPI,
        env
      );
      const { fetch: envFetch, Request, Response } = env;
      const isFetchSupported = envFetch ? isFunction2(envFetch) : typeof fetch === "function";
      const isRequestSupported = isFunction2(Request);
      const isResponseSupported = isFunction2(Response);
      if (!isFetchSupported) {
        return false;
      }
      const isReadableStreamSupported = isFetchSupported && isFunction2(ReadableStream2);
      const encodeText = isFetchSupported && (typeof TextEncoder2 === "function" ? /* @__PURE__ */ ((encoder) => (str) => encoder.encode(str))(new TextEncoder2()) : async (str) => new Uint8Array(await new Request(str).arrayBuffer()));
      const supportsRequestStream = isRequestSupported && isReadableStreamSupported && test(() => {
        let duplexAccessed = false;
        const request = new Request(platform_default.origin, {
          body: new ReadableStream2(),
          method: "POST",
          get duplex() {
            duplexAccessed = true;
            return "half";
          }
        });
        const hasContentType = request.headers.has("Content-Type");
        if (request.body != null) {
          request.body.cancel();
        }
        return duplexAccessed && !hasContentType;
      });
      const supportsResponseStream = isResponseSupported && isReadableStreamSupported && test(() => utils_default.isReadableStream(new Response("").body));
      const resolvers = {
        stream: supportsResponseStream && ((res) => res.body)
      };
      isFetchSupported && (() => {
        ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
          !resolvers[type] && (resolvers[type] = (res, config) => {
            let method = res && res[type];
            if (method) {
              return method.call(res);
            }
            throw new AxiosError_default(
              `Response type '${type}' is not supported`,
              AxiosError_default.ERR_NOT_SUPPORT,
              config
            );
          });
        });
      })();
      const getBodyLength = async (body) => {
        if (body == null) {
          return 0;
        }
        if (utils_default.isBlob(body)) {
          return body.size;
        }
        if (utils_default.isSpecCompliantForm(body)) {
          const _request = new Request(platform_default.origin, {
            method: "POST",
            body
          });
          return (await _request.arrayBuffer()).byteLength;
        }
        if (utils_default.isArrayBufferView(body) || utils_default.isArrayBuffer(body)) {
          return body.byteLength;
        }
        if (utils_default.isURLSearchParams(body)) {
          body = body + "";
        }
        if (utils_default.isString(body)) {
          return (await encodeText(body)).byteLength;
        }
      };
      const resolveBodyLength = async (headers, body) => {
        const length = utils_default.toFiniteNumber(headers.getContentLength());
        return length == null ? getBodyLength(body) : length;
      };
      return async (config) => {
        let {
          url: url2,
          method,
          data,
          signal,
          cancelToken,
          timeout,
          onDownloadProgress,
          onUploadProgress,
          responseType,
          headers,
          withCredentials = "same-origin",
          fetchOptions
        } = resolveConfig_default(config);
        let _fetch = envFetch || fetch;
        responseType = responseType ? (responseType + "").toLowerCase() : "text";
        let composedSignal = composeSignals_default(
          [signal, cancelToken && cancelToken.toAbortSignal()],
          timeout
        );
        let request = null;
        const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
          composedSignal.unsubscribe();
        });
        let requestContentLength;
        try {
          if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
            let _request = new Request(url2, {
              method: "POST",
              body: data,
              duplex: "half"
            });
            let contentTypeHeader;
            if (utils_default.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
              headers.setContentType(contentTypeHeader);
            }
            if (_request.body) {
              const [onProgress, flush] = progressEventDecorator(
                requestContentLength,
                progressEventReducer(asyncDecorator(onUploadProgress))
              );
              data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
            }
          }
          if (!utils_default.isString(withCredentials)) {
            withCredentials = withCredentials ? "include" : "omit";
          }
          const isCredentialsSupported = isRequestSupported && "credentials" in Request.prototype;
          if (utils_default.isFormData(data)) {
            const contentType = headers.getContentType();
            if (contentType && /^multipart\/form-data/i.test(contentType) && !/boundary=/i.test(contentType)) {
              headers.delete("content-type");
            }
          }
          const resolvedOptions = {
            ...fetchOptions,
            signal: composedSignal,
            method: method.toUpperCase(),
            headers: headers.normalize().toJSON(),
            body: data,
            duplex: "half",
            credentials: isCredentialsSupported ? withCredentials : void 0
          };
          request = isRequestSupported && new Request(url2, resolvedOptions);
          let response = await (isRequestSupported ? _fetch(request, fetchOptions) : _fetch(url2, resolvedOptions));
          const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
          if (supportsResponseStream && (onDownloadProgress || isStreamResponse && unsubscribe)) {
            const options = {};
            ["status", "statusText", "headers"].forEach((prop) => {
              options[prop] = response[prop];
            });
            const responseContentLength = utils_default.toFiniteNumber(response.headers.get("content-length"));
            const [onProgress, flush] = onDownloadProgress && progressEventDecorator(
              responseContentLength,
              progressEventReducer(asyncDecorator(onDownloadProgress), true)
            ) || [];
            response = new Response(
              trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
                flush && flush();
                unsubscribe && unsubscribe();
              }),
              options
            );
          }
          responseType = responseType || "text";
          let responseData = await resolvers[utils_default.findKey(resolvers, responseType) || "text"](
            response,
            config
          );
          !isStreamResponse && unsubscribe && unsubscribe();
          return await new Promise((resolve, reject) => {
            settle(resolve, reject, {
              data: responseData,
              headers: AxiosHeaders_default.from(response.headers),
              status: response.status,
              statusText: response.statusText,
              config,
              request
            });
          });
        } catch (err) {
          unsubscribe && unsubscribe();
          if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
            throw Object.assign(
              new AxiosError_default(
                "Network Error",
                AxiosError_default.ERR_NETWORK,
                config,
                request,
                err && err.response
              ),
              {
                cause: err.cause || err
              }
            );
          }
          throw AxiosError_default.from(err, err && err.code, config, request, err && err.response);
        }
      };
    };
    seedCache = /* @__PURE__ */ new Map();
    getFetch = (config) => {
      let env = config && config.env || {};
      const { fetch: fetch2, Request, Response } = env;
      const seeds = [Request, Response, fetch2];
      let len = seeds.length, i = len, seed, target, map = seedCache;
      while (i--) {
        seed = seeds[i];
        target = map.get(seed);
        target === void 0 && map.set(seed, target = i ? /* @__PURE__ */ new Map() : factory(env));
        map = target;
      }
      return target;
    };
    adapter = getFetch();
  }
});

// ../../../../../node_modules/axios/lib/adapters/adapters.js
function getAdapter(adapters, config) {
  adapters = utils_default.isArray(adapters) ? adapters : [adapters];
  const { length } = adapters;
  let nameOrAdapter;
  let adapter2;
  const rejectedReasons = {};
  for (let i = 0; i < length; i++) {
    nameOrAdapter = adapters[i];
    let id;
    adapter2 = nameOrAdapter;
    if (!isResolvedHandle(nameOrAdapter)) {
      adapter2 = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
      if (adapter2 === void 0) {
        throw new AxiosError_default(`Unknown adapter '${id}'`);
      }
    }
    if (adapter2 && (utils_default.isFunction(adapter2) || (adapter2 = adapter2.get(config)))) {
      break;
    }
    rejectedReasons[id || "#" + i] = adapter2;
  }
  if (!adapter2) {
    const reasons = Object.entries(rejectedReasons).map(
      ([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build")
    );
    let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
    throw new AxiosError_default(
      `There is no suitable adapter to dispatch the request ` + s,
      "ERR_NOT_SUPPORT"
    );
  }
  return adapter2;
}
var knownAdapters, renderReason, isResolvedHandle, adapters_default;
var init_adapters = __esm({
  "../../../../../node_modules/axios/lib/adapters/adapters.js"() {
    init_utils();
    init_http();
    init_xhr();
    init_fetch();
    init_AxiosError();
    knownAdapters = {
      http: http_default,
      xhr: xhr_default,
      fetch: {
        get: getFetch
      }
    };
    utils_default.forEach(knownAdapters, (fn, value) => {
      if (fn) {
        try {
          Object.defineProperty(fn, "name", { value });
        } catch (e) {
        }
        Object.defineProperty(fn, "adapterName", { value });
      }
    });
    renderReason = (reason) => `- ${reason}`;
    isResolvedHandle = (adapter2) => utils_default.isFunction(adapter2) || adapter2 === null || adapter2 === false;
    adapters_default = {
      /**
       * Resolve an adapter from a list of adapter names or functions.
       * @type {Function}
       */
      getAdapter,
      /**
       * Exposes all known adapters
       * @type {Object<string, Function|Object>}
       */
      adapters: knownAdapters
    };
  }
});

// ../../../../../node_modules/axios/lib/core/dispatchRequest.js
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
  if (config.signal && config.signal.aborted) {
    throw new CanceledError_default(null, config);
  }
}
function dispatchRequest(config) {
  throwIfCancellationRequested(config);
  config.headers = AxiosHeaders_default.from(config.headers);
  config.data = transformData.call(config, config.transformRequest);
  if (["post", "put", "patch"].indexOf(config.method) !== -1) {
    config.headers.setContentType("application/x-www-form-urlencoded", false);
  }
  const adapter2 = adapters_default.getAdapter(config.adapter || defaults_default.adapter, config);
  return adapter2(config).then(
    function onAdapterResolution(response) {
      throwIfCancellationRequested(config);
      response.data = transformData.call(config, config.transformResponse, response);
      response.headers = AxiosHeaders_default.from(response.headers);
      return response;
    },
    function onAdapterRejection(reason) {
      if (!isCancel(reason)) {
        throwIfCancellationRequested(config);
        if (reason && reason.response) {
          reason.response.data = transformData.call(
            config,
            config.transformResponse,
            reason.response
          );
          reason.response.headers = AxiosHeaders_default.from(reason.response.headers);
        }
      }
      return Promise.reject(reason);
    }
  );
}
var init_dispatchRequest = __esm({
  "../../../../../node_modules/axios/lib/core/dispatchRequest.js"() {
    "use strict";
    init_transformData();
    init_isCancel();
    init_defaults();
    init_CanceledError();
    init_AxiosHeaders();
    init_adapters();
  }
});

// ../../../../../node_modules/axios/lib/helpers/validator.js
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object") {
    throw new AxiosError_default("options must be an object", AxiosError_default.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator = Object.prototype.hasOwnProperty.call(schema, opt) ? schema[opt] : void 0;
    if (validator) {
      const value = options[opt];
      const result = value === void 0 || validator(value, opt, options);
      if (result !== true) {
        throw new AxiosError_default(
          "option " + opt + " must be " + result,
          AxiosError_default.ERR_BAD_OPTION_VALUE
        );
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError_default("Unknown option " + opt, AxiosError_default.ERR_BAD_OPTION);
    }
  }
}
var validators, deprecatedWarnings, validator_default;
var init_validator = __esm({
  "../../../../../node_modules/axios/lib/helpers/validator.js"() {
    "use strict";
    init_data();
    init_AxiosError();
    validators = {};
    ["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
      validators[type] = function validator(thing) {
        return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
      };
    });
    deprecatedWarnings = {};
    validators.transitional = function transitional(validator, version, message) {
      function formatMessage(opt, desc) {
        return "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
      }
      return (value, opt, opts) => {
        if (validator === false) {
          throw new AxiosError_default(
            formatMessage(opt, " has been removed" + (version ? " in " + version : "")),
            AxiosError_default.ERR_DEPRECATED
          );
        }
        if (version && !deprecatedWarnings[opt]) {
          deprecatedWarnings[opt] = true;
          console.warn(
            formatMessage(
              opt,
              " has been deprecated since v" + version + " and will be removed in the near future"
            )
          );
        }
        return validator ? validator(value, opt, opts) : true;
      };
    };
    validators.spelling = function spelling(correctSpelling) {
      return (value, opt) => {
        console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
        return true;
      };
    };
    validator_default = {
      assertOptions,
      validators
    };
  }
});

// ../../../../../node_modules/axios/lib/core/Axios.js
var validators2, Axios, Axios_default;
var init_Axios = __esm({
  "../../../../../node_modules/axios/lib/core/Axios.js"() {
    "use strict";
    init_utils();
    init_buildURL();
    init_InterceptorManager();
    init_dispatchRequest();
    init_mergeConfig();
    init_buildFullPath();
    init_validator();
    init_AxiosHeaders();
    init_transitional();
    validators2 = validator_default.validators;
    Axios = class {
      constructor(instanceConfig) {
        this.defaults = instanceConfig || {};
        this.interceptors = {
          request: new InterceptorManager_default(),
          response: new InterceptorManager_default()
        };
      }
      /**
       * Dispatch a request
       *
       * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
       * @param {?Object} config
       *
       * @returns {Promise} The Promise to be fulfilled
       */
      async request(configOrUrl, config) {
        try {
          return await this._request(configOrUrl, config);
        } catch (err) {
          if (err instanceof Error) {
            let dummy = {};
            Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error();
            const stack = (() => {
              if (!dummy.stack) {
                return "";
              }
              const firstNewlineIndex = dummy.stack.indexOf("\n");
              return firstNewlineIndex === -1 ? "" : dummy.stack.slice(firstNewlineIndex + 1);
            })();
            try {
              if (!err.stack) {
                err.stack = stack;
              } else if (stack) {
                const firstNewlineIndex = stack.indexOf("\n");
                const secondNewlineIndex = firstNewlineIndex === -1 ? -1 : stack.indexOf("\n", firstNewlineIndex + 1);
                const stackWithoutTwoTopLines = secondNewlineIndex === -1 ? "" : stack.slice(secondNewlineIndex + 1);
                if (!String(err.stack).endsWith(stackWithoutTwoTopLines)) {
                  err.stack += "\n" + stack;
                }
              }
            } catch (e) {
            }
          }
          throw err;
        }
      }
      _request(configOrUrl, config) {
        if (typeof configOrUrl === "string") {
          config = config || {};
          config.url = configOrUrl;
        } else {
          config = configOrUrl || {};
        }
        config = mergeConfig(this.defaults, config);
        const { transitional: transitional2, paramsSerializer, headers } = config;
        if (transitional2 !== void 0) {
          validator_default.assertOptions(
            transitional2,
            {
              silentJSONParsing: validators2.transitional(validators2.boolean),
              forcedJSONParsing: validators2.transitional(validators2.boolean),
              clarifyTimeoutError: validators2.transitional(validators2.boolean),
              legacyInterceptorReqResOrdering: validators2.transitional(validators2.boolean)
            },
            false
          );
        }
        if (paramsSerializer != null) {
          if (utils_default.isFunction(paramsSerializer)) {
            config.paramsSerializer = {
              serialize: paramsSerializer
            };
          } else {
            validator_default.assertOptions(
              paramsSerializer,
              {
                encode: validators2.function,
                serialize: validators2.function
              },
              true
            );
          }
        }
        if (config.allowAbsoluteUrls !== void 0) {
        } else if (this.defaults.allowAbsoluteUrls !== void 0) {
          config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
        } else {
          config.allowAbsoluteUrls = true;
        }
        validator_default.assertOptions(
          config,
          {
            baseUrl: validators2.spelling("baseURL"),
            withXsrfToken: validators2.spelling("withXSRFToken")
          },
          true
        );
        config.method = (config.method || this.defaults.method || "get").toLowerCase();
        let contextHeaders = headers && utils_default.merge(headers.common, headers[config.method]);
        headers && utils_default.forEach(["delete", "get", "head", "post", "put", "patch", "common"], (method) => {
          delete headers[method];
        });
        config.headers = AxiosHeaders_default.concat(contextHeaders, headers);
        const requestInterceptorChain = [];
        let synchronousRequestInterceptors = true;
        this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
          if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
            return;
          }
          synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
          const transitional3 = config.transitional || transitional_default;
          const legacyInterceptorReqResOrdering = transitional3 && transitional3.legacyInterceptorReqResOrdering;
          if (legacyInterceptorReqResOrdering) {
            requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
          } else {
            requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
          }
        });
        const responseInterceptorChain = [];
        this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
          responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
        });
        let promise;
        let i = 0;
        let len;
        if (!synchronousRequestInterceptors) {
          const chain = [dispatchRequest.bind(this), void 0];
          chain.unshift(...requestInterceptorChain);
          chain.push(...responseInterceptorChain);
          len = chain.length;
          promise = Promise.resolve(config);
          while (i < len) {
            promise = promise.then(chain[i++], chain[i++]);
          }
          return promise;
        }
        len = requestInterceptorChain.length;
        let newConfig = config;
        while (i < len) {
          const onFulfilled = requestInterceptorChain[i++];
          const onRejected = requestInterceptorChain[i++];
          try {
            newConfig = onFulfilled(newConfig);
          } catch (error) {
            onRejected.call(this, error);
            break;
          }
        }
        try {
          promise = dispatchRequest.call(this, newConfig);
        } catch (error) {
          return Promise.reject(error);
        }
        i = 0;
        len = responseInterceptorChain.length;
        while (i < len) {
          promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
        }
        return promise;
      }
      getUri(config) {
        config = mergeConfig(this.defaults, config);
        const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
        return buildURL(fullPath, config.params, config.paramsSerializer);
      }
    };
    utils_default.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
      Axios.prototype[method] = function(url2, config) {
        return this.request(
          mergeConfig(config || {}, {
            method,
            url: url2,
            data: (config || {}).data
          })
        );
      };
    });
    utils_default.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
      function generateHTTPMethod(isForm) {
        return function httpMethod(url2, data, config) {
          return this.request(
            mergeConfig(config || {}, {
              method,
              headers: isForm ? {
                "Content-Type": "multipart/form-data"
              } : {},
              url: url2,
              data
            })
          );
        };
      }
      Axios.prototype[method] = generateHTTPMethod();
      Axios.prototype[method + "Form"] = generateHTTPMethod(true);
    });
    Axios_default = Axios;
  }
});

// ../../../../../node_modules/axios/lib/cancel/CancelToken.js
var CancelToken, CancelToken_default;
var init_CancelToken = __esm({
  "../../../../../node_modules/axios/lib/cancel/CancelToken.js"() {
    "use strict";
    init_CanceledError();
    CancelToken = class _CancelToken {
      constructor(executor) {
        if (typeof executor !== "function") {
          throw new TypeError("executor must be a function.");
        }
        let resolvePromise;
        this.promise = new Promise(function promiseExecutor(resolve) {
          resolvePromise = resolve;
        });
        const token = this;
        this.promise.then((cancel) => {
          if (!token._listeners) return;
          let i = token._listeners.length;
          while (i-- > 0) {
            token._listeners[i](cancel);
          }
          token._listeners = null;
        });
        this.promise.then = (onfulfilled) => {
          let _resolve;
          const promise = new Promise((resolve) => {
            token.subscribe(resolve);
            _resolve = resolve;
          }).then(onfulfilled);
          promise.cancel = function reject() {
            token.unsubscribe(_resolve);
          };
          return promise;
        };
        executor(function cancel(message, config, request) {
          if (token.reason) {
            return;
          }
          token.reason = new CanceledError_default(message, config, request);
          resolvePromise(token.reason);
        });
      }
      /**
       * Throws a `CanceledError` if cancellation has been requested.
       */
      throwIfRequested() {
        if (this.reason) {
          throw this.reason;
        }
      }
      /**
       * Subscribe to the cancel signal
       */
      subscribe(listener) {
        if (this.reason) {
          listener(this.reason);
          return;
        }
        if (this._listeners) {
          this._listeners.push(listener);
        } else {
          this._listeners = [listener];
        }
      }
      /**
       * Unsubscribe from the cancel signal
       */
      unsubscribe(listener) {
        if (!this._listeners) {
          return;
        }
        const index = this._listeners.indexOf(listener);
        if (index !== -1) {
          this._listeners.splice(index, 1);
        }
      }
      toAbortSignal() {
        const controller = new AbortController();
        const abort = (err) => {
          controller.abort(err);
        };
        this.subscribe(abort);
        controller.signal.unsubscribe = () => this.unsubscribe(abort);
        return controller.signal;
      }
      /**
       * Returns an object that contains a new `CancelToken` and a function that, when called,
       * cancels the `CancelToken`.
       */
      static source() {
        let cancel;
        const token = new _CancelToken(function executor(c) {
          cancel = c;
        });
        return {
          token,
          cancel
        };
      }
    };
    CancelToken_default = CancelToken;
  }
});

// ../../../../../node_modules/axios/lib/helpers/spread.js
function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}
var init_spread = __esm({
  "../../../../../node_modules/axios/lib/helpers/spread.js"() {
    "use strict";
  }
});

// ../../../../../node_modules/axios/lib/helpers/isAxiosError.js
function isAxiosError(payload) {
  return utils_default.isObject(payload) && payload.isAxiosError === true;
}
var init_isAxiosError = __esm({
  "../../../../../node_modules/axios/lib/helpers/isAxiosError.js"() {
    "use strict";
    init_utils();
  }
});

// ../../../../../node_modules/axios/lib/helpers/HttpStatusCode.js
var HttpStatusCode, HttpStatusCode_default;
var init_HttpStatusCode = __esm({
  "../../../../../node_modules/axios/lib/helpers/HttpStatusCode.js"() {
    HttpStatusCode = {
      Continue: 100,
      SwitchingProtocols: 101,
      Processing: 102,
      EarlyHints: 103,
      Ok: 200,
      Created: 201,
      Accepted: 202,
      NonAuthoritativeInformation: 203,
      NoContent: 204,
      ResetContent: 205,
      PartialContent: 206,
      MultiStatus: 207,
      AlreadyReported: 208,
      ImUsed: 226,
      MultipleChoices: 300,
      MovedPermanently: 301,
      Found: 302,
      SeeOther: 303,
      NotModified: 304,
      UseProxy: 305,
      Unused: 306,
      TemporaryRedirect: 307,
      PermanentRedirect: 308,
      BadRequest: 400,
      Unauthorized: 401,
      PaymentRequired: 402,
      Forbidden: 403,
      NotFound: 404,
      MethodNotAllowed: 405,
      NotAcceptable: 406,
      ProxyAuthenticationRequired: 407,
      RequestTimeout: 408,
      Conflict: 409,
      Gone: 410,
      LengthRequired: 411,
      PreconditionFailed: 412,
      PayloadTooLarge: 413,
      UriTooLong: 414,
      UnsupportedMediaType: 415,
      RangeNotSatisfiable: 416,
      ExpectationFailed: 417,
      ImATeapot: 418,
      MisdirectedRequest: 421,
      UnprocessableEntity: 422,
      Locked: 423,
      FailedDependency: 424,
      TooEarly: 425,
      UpgradeRequired: 426,
      PreconditionRequired: 428,
      TooManyRequests: 429,
      RequestHeaderFieldsTooLarge: 431,
      UnavailableForLegalReasons: 451,
      InternalServerError: 500,
      NotImplemented: 501,
      BadGateway: 502,
      ServiceUnavailable: 503,
      GatewayTimeout: 504,
      HttpVersionNotSupported: 505,
      VariantAlsoNegotiates: 506,
      InsufficientStorage: 507,
      LoopDetected: 508,
      NotExtended: 510,
      NetworkAuthenticationRequired: 511,
      WebServerIsDown: 521,
      ConnectionTimedOut: 522,
      OriginIsUnreachable: 523,
      TimeoutOccurred: 524,
      SslHandshakeFailed: 525,
      InvalidSslCertificate: 526
    };
    Object.entries(HttpStatusCode).forEach(([key, value]) => {
      HttpStatusCode[value] = key;
    });
    HttpStatusCode_default = HttpStatusCode;
  }
});

// ../../../../../node_modules/axios/lib/axios.js
function createInstance(defaultConfig) {
  const context = new Axios_default(defaultConfig);
  const instance = bind(Axios_default.prototype.request, context);
  utils_default.extend(instance, Axios_default.prototype, context, { allOwnKeys: true });
  utils_default.extend(instance, context, null, { allOwnKeys: true });
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };
  return instance;
}
var axios, axios_default;
var init_axios = __esm({
  "../../../../../node_modules/axios/lib/axios.js"() {
    "use strict";
    init_utils();
    init_bind();
    init_Axios();
    init_mergeConfig();
    init_defaults();
    init_formDataToJSON();
    init_CanceledError();
    init_CancelToken();
    init_isCancel();
    init_data();
    init_toFormData();
    init_AxiosError();
    init_spread();
    init_isAxiosError();
    init_AxiosHeaders();
    init_adapters();
    init_HttpStatusCode();
    axios = createInstance(defaults_default);
    axios.Axios = Axios_default;
    axios.CanceledError = CanceledError_default;
    axios.CancelToken = CancelToken_default;
    axios.isCancel = isCancel;
    axios.VERSION = VERSION;
    axios.toFormData = toFormData_default;
    axios.AxiosError = AxiosError_default;
    axios.Cancel = axios.CanceledError;
    axios.all = function all(promises) {
      return Promise.all(promises);
    };
    axios.spread = spread;
    axios.isAxiosError = isAxiosError;
    axios.mergeConfig = mergeConfig;
    axios.AxiosHeaders = AxiosHeaders_default;
    axios.formToJSON = (thing) => formDataToJSON_default(utils_default.isHTMLForm(thing) ? new FormData(thing) : thing);
    axios.getAdapter = adapters_default.getAdapter;
    axios.HttpStatusCode = HttpStatusCode_default;
    axios.default = axios;
    axios_default = axios;
  }
});

// ../../../../../node_modules/axios/index.js
var Axios2, AxiosError2, CanceledError2, isCancel2, CancelToken2, VERSION2, all2, Cancel, isAxiosError2, spread2, toFormData2, AxiosHeaders2, HttpStatusCode2, formToJSON, getAdapter2, mergeConfig2;
var init_axios2 = __esm({
  "../../../../../node_modules/axios/index.js"() {
    init_axios();
    ({
      Axios: Axios2,
      AxiosError: AxiosError2,
      CanceledError: CanceledError2,
      isCancel: isCancel2,
      CancelToken: CancelToken2,
      VERSION: VERSION2,
      all: all2,
      Cancel,
      isAxiosError: isAxiosError2,
      spread: spread2,
      toFormData: toFormData2,
      AxiosHeaders: AxiosHeaders2,
      HttpStatusCode: HttpStatusCode2,
      formToJSON,
      getAdapter: getAdapter2,
      mergeConfig: mergeConfig2
    } = axios_default);
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/lib/constants.js
var require_constants = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/lib/constants.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CLIENT_METADATA = exports2.DEFAULT_API_VERSION = exports2.DEFAULT_API_BASE_URL = exports2.DEFAULT_HEADERS = void 0;
    exports2.DEFAULT_HEADERS = {
      "Content-Type": "application/json"
    };
    exports2.DEFAULT_API_BASE_URL = "https://api.anam.ai";
    exports2.DEFAULT_API_VERSION = "/v1";
    exports2.CLIENT_METADATA = {
      client: "js-sdk",
      version: "4.13.1"
    };
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/lib/ClientMetrics.js
var require_ClientMetrics = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/lib/ClientMetrics.js"(exports2) {
    "use strict";
    var __awaiter = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createRTCStatsReport = exports2.sendClientMetric = exports2.setMetricsContext = exports2.setClientMetricsDisabled = exports2.setClientMetricsApiGateway = exports2.setClientMetricsBaseUrl = exports2.ClientMetricMeasurement = exports2.DEFAULT_ANAM_API_VERSION = exports2.DEFAULT_ANAM_METRICS_BASE_URL = void 0;
    var constants_1 = require_constants();
    exports2.DEFAULT_ANAM_METRICS_BASE_URL = "https://api.anam.ai";
    exports2.DEFAULT_ANAM_API_VERSION = "/v1";
    var ClientMetricMeasurement;
    (function(ClientMetricMeasurement2) {
      ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_ERROR"] = "client_error";
      ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_CONNECTION_CLOSED"] = "client_connection_closed";
      ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_CONNECTION_ESTABLISHED"] = "client_connection_established";
      ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_SESSION_ATTEMPT"] = "client_session_attempt";
      ClientMetricMeasurement2["CLIENT_METRIC_MEASUREMENT_SESSION_SUCCESS"] = "client_session_success";
    })(ClientMetricMeasurement || (exports2.ClientMetricMeasurement = ClientMetricMeasurement = {}));
    var anamCurrentBaseUrl = exports2.DEFAULT_ANAM_METRICS_BASE_URL;
    var anamCurrentApiVersion = exports2.DEFAULT_ANAM_API_VERSION;
    var apiGatewayConfig;
    var metricsDisabled = false;
    var setClientMetricsBaseUrl = (baseUrl, apiVersion = exports2.DEFAULT_ANAM_API_VERSION) => {
      anamCurrentBaseUrl = baseUrl;
      anamCurrentApiVersion = apiVersion;
    };
    exports2.setClientMetricsBaseUrl = setClientMetricsBaseUrl;
    var setClientMetricsApiGateway = (config) => {
      apiGatewayConfig = config;
    };
    exports2.setClientMetricsApiGateway = setClientMetricsApiGateway;
    var setClientMetricsDisabled = (disabled) => {
      metricsDisabled = disabled;
    };
    exports2.setClientMetricsDisabled = setClientMetricsDisabled;
    var anamMetricsContext = {
      sessionId: null,
      organizationId: null,
      attemptCorrelationId: null
    };
    var setMetricsContext = (context) => {
      anamMetricsContext = Object.assign(Object.assign({}, anamMetricsContext), context);
    };
    exports2.setMetricsContext = setMetricsContext;
    var sendClientMetric = (name, value, tags) => __awaiter(void 0, void 0, void 0, function* () {
      if (metricsDisabled) {
        return;
      }
      try {
        const metricTags = Object.assign(Object.assign({}, constants_1.CLIENT_METADATA), tags);
        if (anamMetricsContext.sessionId) {
          metricTags.sessionId = anamMetricsContext.sessionId;
        }
        if (anamMetricsContext.organizationId) {
          metricTags.organizationId = anamMetricsContext.organizationId;
        }
        if (anamMetricsContext.attemptCorrelationId) {
          metricTags.attemptCorrelationId = anamMetricsContext.attemptCorrelationId;
        }
        const targetPath = `${anamCurrentApiVersion}/metrics/client`;
        let url2;
        let headers = {
          "Content-Type": "application/json"
        };
        if ((apiGatewayConfig === null || apiGatewayConfig === void 0 ? void 0 : apiGatewayConfig.enabled) && (apiGatewayConfig === null || apiGatewayConfig === void 0 ? void 0 : apiGatewayConfig.baseUrl)) {
          url2 = `${apiGatewayConfig.baseUrl}${targetPath}`;
          headers["X-Anam-Target-Url"] = `${anamCurrentBaseUrl}${targetPath}`;
        } else {
          url2 = `${anamCurrentBaseUrl}${targetPath}`;
        }
        yield fetch(url2, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name,
            value,
            tags: metricTags
          })
        });
      } catch (error) {
        console.error("Failed to send error metric:", error);
      }
    });
    exports2.sendClientMetric = sendClientMetric;
    var createRTCStatsReport = (stats, outputFormat = "console") => {
      var _a, _b, _c;
      const statsByType = {};
      stats.forEach((report) => {
        if (!statsByType[report.type]) {
          statsByType[report.type] = [];
        }
        statsByType[report.type].push(report);
      });
      const jsonReport = {
        issues: []
      };
      const inboundVideo = ((_a = statsByType["inbound-rtp"]) === null || _a === void 0 ? void 0 : _a.filter((r) => r.kind === "video")) || [];
      if (inboundVideo.length > 0) {
        jsonReport.personaVideoStream = [];
        inboundVideo.forEach((report) => {
          var _a2, _b2, _c2, _d, _e;
          const videoData = {
            framesReceived: (_a2 = report.framesReceived) !== null && _a2 !== void 0 ? _a2 : "unknown",
            framesDropped: (_b2 = report.framesDropped) !== null && _b2 !== void 0 ? _b2 : "unknown",
            framesPerSecond: (_c2 = report.framesPerSecond) !== null && _c2 !== void 0 ? _c2 : "unknown",
            packetsReceived: (_d = report.packetsReceived) !== null && _d !== void 0 ? _d : "unknown",
            packetsLost: (_e = report.packetsLost) !== null && _e !== void 0 ? _e : "unknown",
            resolution: report.frameWidth && report.frameHeight ? `${report.frameWidth}x${report.frameHeight}` : void 0,
            jitter: report.jitter !== void 0 ? report.jitter : void 0
          };
          jsonReport.personaVideoStream.push(videoData);
        });
      }
      const inboundAudio = ((_b = statsByType["inbound-rtp"]) === null || _b === void 0 ? void 0 : _b.filter((r) => r.kind === "audio")) || [];
      if (inboundAudio.length > 0) {
        jsonReport.personaAudioStream = [];
        inboundAudio.forEach((report) => {
          var _a2, _b2, _c2;
          const audioData = {
            packetsReceived: (_a2 = report.packetsReceived) !== null && _a2 !== void 0 ? _a2 : "unknown",
            packetsLost: (_b2 = report.packetsLost) !== null && _b2 !== void 0 ? _b2 : "unknown",
            audioLevel: (_c2 = report.audioLevel) !== null && _c2 !== void 0 ? _c2 : "unknown",
            jitter: report.jitter !== void 0 ? report.jitter : void 0,
            totalAudioEnergy: report.totalAudioEnergy !== void 0 ? report.totalAudioEnergy : void 0
          };
          jsonReport.personaAudioStream.push(audioData);
        });
      }
      const outboundAudio = ((_c = statsByType["outbound-rtp"]) === null || _c === void 0 ? void 0 : _c.filter((r) => r.kind === "audio")) || [];
      if (outboundAudio.length > 0) {
        jsonReport.userAudioInput = [];
        outboundAudio.forEach((report) => {
          var _a2, _b2;
          const userAudioData = {
            packetsSent: (_a2 = report.packetsSent) !== null && _a2 !== void 0 ? _a2 : "unknown",
            retransmittedPackets: (_b2 = report.retransmittedPacketsSent) !== null && _b2 !== void 0 ? _b2 : void 0,
            avgPacketSendDelay: report.totalPacketSendDelay !== void 0 ? report.totalPacketSendDelay / (report.packetsSent || 1) * 1e3 : void 0
          };
          jsonReport.userAudioInput.push(userAudioData);
        });
      }
      if (statsByType["codec"]) {
        jsonReport.codecs = [];
        statsByType["codec"].forEach((report) => {
          const codecData = {
            status: report.payloadType ? "Active" : "Available",
            mimeType: report.mimeType || "Unknown",
            payloadType: report.payloadType || "N/A",
            clockRate: report.clockRate || void 0,
            channels: report.channels || void 0
          };
          jsonReport.codecs.push(codecData);
        });
      }
      if (statsByType["transport"]) {
        jsonReport.transportLayer = [];
        statsByType["transport"].forEach((report) => {
          const transportData = {
            dtlsState: report.dtlsState || "unknown",
            iceState: report.iceState || "unknown",
            bytesSent: report.bytesSent || void 0,
            bytesReceived: report.bytesReceived || void 0
          };
          jsonReport.transportLayer.push(transportData);
        });
      }
      const issues = [];
      inboundVideo.forEach((report) => {
        if (typeof report.framesDropped === "number" && report.framesDropped > 0) {
          issues.push(`Video: ${report.framesDropped} frames dropped`);
        }
        if (typeof report.packetsLost === "number" && report.packetsLost > 0) {
          issues.push(`Video: ${report.packetsLost} packets lost`);
        }
        if (typeof report.framesPerSecond === "number" && report.framesPerSecond < 23) {
          issues.push(`Video: Low frame rate (${report.framesPerSecond} fps)`);
        }
      });
      inboundAudio.forEach((report) => {
        if (typeof report.packetsLost === "number" && report.packetsLost > 0) {
          issues.push(`Audio: ${report.packetsLost} packets lost`);
        }
        if (typeof report.jitter === "number" && report.jitter > 0.1) {
          issues.push(`Audio: High jitter (${(report.jitter * 1e3).toFixed(1)}ms)`);
        }
      });
      jsonReport.issues = issues;
      if (outputFormat === "json") {
        return jsonReport;
      }
      console.group("\u{1F4CA} WebRTC Session Statistics Report");
      if (jsonReport.personaVideoStream && jsonReport.personaVideoStream.length > 0) {
        console.group("\u{1F4F9} Persona Video Stream (Inbound)");
        jsonReport.personaVideoStream.forEach((videoData) => {
          console.log(`Frames Received: ${videoData.framesReceived}`);
          console.log(`Frames Dropped: ${videoData.framesDropped}`);
          console.log(`Frames Per Second: ${videoData.framesPerSecond}`);
          console.log(`Packets Received: ${typeof videoData.packetsReceived === "number" ? videoData.packetsReceived.toLocaleString() : videoData.packetsReceived}`);
          console.log(`Packets Lost: ${videoData.packetsLost}`);
          if (videoData.resolution) {
            console.log(`Resolution: ${videoData.resolution}`);
          }
          if (videoData.jitter !== void 0) {
            console.log(`Jitter: ${videoData.jitter.toFixed(5)}ms`);
          }
        });
        console.groupEnd();
      }
      if (jsonReport.personaAudioStream && jsonReport.personaAudioStream.length > 0) {
        console.group("\u{1F50A} Persona Audio Stream (Inbound)");
        jsonReport.personaAudioStream.forEach((audioData) => {
          console.log(`Packets Received: ${typeof audioData.packetsReceived === "number" ? audioData.packetsReceived.toLocaleString() : audioData.packetsReceived}`);
          console.log(`Packets Lost: ${audioData.packetsLost}`);
          console.log(`Audio Level: ${audioData.audioLevel}`);
          if (audioData.jitter !== void 0) {
            console.log(`Jitter: ${audioData.jitter.toFixed(5)}ms`);
          }
          if (audioData.totalAudioEnergy !== void 0) {
            console.log(`Total Audio Energy: ${audioData.totalAudioEnergy.toFixed(6)}`);
          }
        });
        console.groupEnd();
      }
      if (jsonReport.userAudioInput && jsonReport.userAudioInput.length > 0) {
        console.group("\u{1F3A4} User Audio Input (Outbound)");
        jsonReport.userAudioInput.forEach((userAudioData) => {
          console.log(`Packets Sent: ${typeof userAudioData.packetsSent === "number" ? userAudioData.packetsSent.toLocaleString() : userAudioData.packetsSent}`);
          if (userAudioData.retransmittedPackets) {
            console.log(`Retransmitted Packets: ${userAudioData.retransmittedPackets}`);
          }
          if (userAudioData.avgPacketSendDelay !== void 0) {
            console.log(`Avg Packet Send Delay: ${userAudioData.avgPacketSendDelay.toFixed(5)}ms`);
          }
        });
        console.groupEnd();
      }
      if (jsonReport.codecs && jsonReport.codecs.length > 0) {
        console.group("\u{1F527} Codecs Used");
        jsonReport.codecs.forEach((codecData) => {
          console.log(`${codecData.status} ${codecData.mimeType} - Payload Type: ${codecData.payloadType}`);
          if (codecData.clockRate) {
            console.log(`  Clock Rate: ${codecData.clockRate}Hz`);
          }
          if (codecData.channels) {
            console.log(`  Channels: ${codecData.channels}`);
          }
        });
        console.groupEnd();
      }
      if (jsonReport.transportLayer && jsonReport.transportLayer.length > 0) {
        console.group("\u{1F69A} Transport Layer");
        jsonReport.transportLayer.forEach((transportData) => {
          console.log(`DTLS State: ${transportData.dtlsState}`);
          console.log(`ICE State: ${transportData.iceState}`);
          if (transportData.bytesReceived || transportData.bytesSent) {
            console.log(`Data Transfer (bytes) - Sent: ${(transportData.bytesSent || 0).toLocaleString()}, Received: ${(transportData.bytesReceived || 0).toLocaleString()}`);
          }
        });
        console.groupEnd();
      }
      if (jsonReport.issues.length > 0) {
        console.group("\u26A0\uFE0F Potential Issues Detected");
        jsonReport.issues.forEach((issue) => console.warn(issue));
        console.groupEnd();
      } else {
        console.log("\u2705 No significant issues detected");
      }
      console.groupEnd();
    };
    exports2.createRTCStatsReport = createRTCStatsReport;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/lib/ClientError.js
var require_ClientError = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/lib/ClientError.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ClientError = exports2.ErrorCode = void 0;
    var ClientMetrics_1 = require_ClientMetrics();
    var ErrorCode;
    (function(ErrorCode2) {
      ErrorCode2["CLIENT_ERROR_CODE_USAGE_LIMIT_REACHED"] = "CLIENT_ERROR_CODE_USAGE_LIMIT_REACHED";
      ErrorCode2["CLIENT_ERROR_CODE_SPEND_CAP_REACHED"] = "CLIENT_ERROR_CODE_SPEND_CAP_REACHED";
      ErrorCode2["CLIENT_ERROR_CODE_VALIDATION_ERROR"] = "CLIENT_ERROR_CODE_VALIDATION_ERROR";
      ErrorCode2["CLIENT_ERROR_CODE_AUTHENTICATION_ERROR"] = "CLIENT_ERROR_CODE_AUTHENTICATION_ERROR";
      ErrorCode2["CLIENT_ERROR_CODE_SERVER_ERROR"] = "CLIENT_ERROR_CODE_SERVER_ERROR";
      ErrorCode2["CLIENT_ERROR_CODE_MAX_CONCURRENT_SESSIONS_REACHED"] = "CLIENT_ERROR_CODE_MAX_CONCURRENT_SESSIONS_REACHED";
      ErrorCode2["CLIENT_ERROR_CODE_SERVICE_BUSY"] = "CLIENT_ERROR_CODE_SERVICE_BUSY";
      ErrorCode2["CLIENT_ERROR_CODE_NO_PLAN_FOUND"] = "CLIENT_ERROR_CODE_NO_PLAN_FOUND";
      ErrorCode2["CLIENT_ERROR_CODE_UNKNOWN_ERROR"] = "CLIENT_ERROR_CODE_UNKNOWN_ERROR";
      ErrorCode2["CLIENT_ERROR_CODE_CONFIGURATION_ERROR"] = "CLIENT_ERROR_CODE_CONFIGURATION_ERROR";
    })(ErrorCode || (exports2.ErrorCode = ErrorCode = {}));
    var ClientError2 = class _ClientError extends Error {
      constructor(message, code, statusCode = 500, details) {
        super(message);
        this.name = "ClientError";
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        Object.setPrototypeOf(this, _ClientError.prototype);
        (0, ClientMetrics_1.sendClientMetric)(ClientMetrics_1.ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_ERROR, code, {
          details,
          statusCode
        });
      }
    };
    exports2.ClientError = ClientError2;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/lib/correlationId.js
var require_correlationId = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/lib/correlationId.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.generateCorrelationId = void 0;
    function generateCorrelationId() {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    exports2.generateCorrelationId = generateCorrelationId;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/lib/validateApiGatewayConfig.js
var require_validateApiGatewayConfig = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/lib/validateApiGatewayConfig.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateApiGatewayConfig = void 0;
    function validateApiGatewayConfig(apiGatewayConfig) {
      if (!apiGatewayConfig || !apiGatewayConfig.enabled) {
        return void 0;
      }
      if (!apiGatewayConfig.baseUrl) {
        return "API Gateway baseUrl is required when enabled";
      }
      try {
        const url2 = new URL(apiGatewayConfig.baseUrl);
        if (!["http:", "https:", "ws:", "wss:"].includes(url2.protocol)) {
          return `Invalid API Gateway baseUrl protocol: ${url2.protocol}. Must be http:, https:, ws:, or wss:`;
        }
      } catch (error) {
        return `Invalid API Gateway baseUrl: ${apiGatewayConfig.baseUrl}`;
      }
      if (apiGatewayConfig.wsPath) {
        if (!apiGatewayConfig.wsPath.startsWith("/")) {
          return "API Gateway wsPath must start with /";
        }
      }
      return void 0;
    }
    exports2.validateApiGatewayConfig = validateApiGatewayConfig;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/signalling/SignalMessage.js
var require_SignalMessage = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/signalling/SignalMessage.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SignalMessageAction = void 0;
    var SignalMessageAction;
    (function(SignalMessageAction2) {
      SignalMessageAction2["OFFER"] = "offer";
      SignalMessageAction2["ANSWER"] = "answer";
      SignalMessageAction2["ICE_CANDIDATE"] = "icecandidate";
      SignalMessageAction2["END_SESSION"] = "endsession";
      SignalMessageAction2["HEARTBEAT"] = "heartbeat";
      SignalMessageAction2["WARNING"] = "warning";
      SignalMessageAction2["TALK_STREAM_INTERRUPTED"] = "talkinputstreaminterrupted";
      SignalMessageAction2["TALK_STREAM_INPUT"] = "talkstream";
      SignalMessageAction2["SESSION_READY"] = "sessionready";
      SignalMessageAction2["AGENT_AUDIO_INPUT"] = "agentaudioinput";
      SignalMessageAction2["AGENT_AUDIO_INPUT_END"] = "agentaudioinputend";
    })(SignalMessageAction || (exports2.SignalMessageAction = SignalMessageAction = {}));
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/signalling/index.js
var require_signalling = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/signalling/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SignalMessageAction = void 0;
    var SignalMessage_1 = require_SignalMessage();
    Object.defineProperty(exports2, "SignalMessageAction", { enumerable: true, get: function() {
      return SignalMessage_1.SignalMessageAction;
    } });
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/streaming/DataChannelMessage.js
var require_DataChannelMessage = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/streaming/DataChannelMessage.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DataChannelMessage = void 0;
    var DataChannelMessage;
    (function(DataChannelMessage2) {
      DataChannelMessage2["SPEECH_TEXT"] = "speechText";
      DataChannelMessage2["CLIENT_TOOL_EVENT"] = "clientToolEvent";
      DataChannelMessage2["TOOL_CALL_STARTED_EVENT"] = "toolCallStarted";
      DataChannelMessage2["TOOL_CALL_COMPLETED_EVENT"] = "toolCallCompleted";
      DataChannelMessage2["TOOL_CALL_FAILED_EVENT"] = "toolCallFailed";
      DataChannelMessage2["REASONING_TEXT"] = "reasoningText";
      DataChannelMessage2["USER_SPEECH_STARTED"] = "userSpeechStarted";
      DataChannelMessage2["USER_SPEECH_ENDED"] = "userSpeechEnded";
    })(DataChannelMessage || (exports2.DataChannelMessage = DataChannelMessage = {}));
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/streaming/index.js
var require_streaming = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/streaming/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DataChannelMessage = void 0;
    var DataChannelMessage_1 = require_DataChannelMessage();
    Object.defineProperty(exports2, "DataChannelMessage", { enumerable: true, get: function() {
      return DataChannelMessage_1.DataChannelMessage;
    } });
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/InputAudioState.js
var require_InputAudioState = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/InputAudioState.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AudioPermissionState = void 0;
    var AudioPermissionState;
    (function(AudioPermissionState2) {
      AudioPermissionState2["PENDING"] = "pending";
      AudioPermissionState2["GRANTED"] = "granted";
      AudioPermissionState2["DENIED"] = "denied";
      AudioPermissionState2["NOT_REQUESTED"] = "not_requested";
    })(AudioPermissionState || (exports2.AudioPermissionState = AudioPermissionState = {}));
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/messageHistory/MessageRole.js
var require_MessageRole = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/messageHistory/MessageRole.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MessageRole = void 0;
    var MessageRole2;
    (function(MessageRole3) {
      MessageRole3["USER"] = "user";
      MessageRole3["PERSONA"] = "persona";
    })(MessageRole2 || (exports2.MessageRole = MessageRole2 = {}));
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/messageHistory/index.js
var require_messageHistory = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/messageHistory/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MessageRole = void 0;
    var MessageRole_1 = require_MessageRole();
    Object.defineProperty(exports2, "MessageRole", { enumerable: true, get: function() {
      return MessageRole_1.MessageRole;
    } });
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/events/public/AnamEvent.js
var require_AnamEvent = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/events/public/AnamEvent.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AnamEvent = void 0;
    var AnamEvent3;
    (function(AnamEvent4) {
      AnamEvent4["MESSAGE_HISTORY_UPDATED"] = "MESSAGE_HISTORY_UPDATED";
      AnamEvent4["MESSAGE_STREAM_EVENT_RECEIVED"] = "MESSAGE_STREAM_EVENT_RECEIVED";
      AnamEvent4["CONNECTION_ESTABLISHED"] = "CONNECTION_ESTABLISHED";
      AnamEvent4["CONNECTION_CLOSED"] = "CONNECTION_CLOSED";
      AnamEvent4["INPUT_AUDIO_STREAM_STARTED"] = "INPUT_AUDIO_STREAM_STARTED";
      AnamEvent4["VIDEO_STREAM_STARTED"] = "VIDEO_STREAM_STARTED";
      AnamEvent4["VIDEO_PLAY_STARTED"] = "VIDEO_PLAY_STARTED";
      AnamEvent4["AUDIO_STREAM_STARTED"] = "AUDIO_STREAM_STARTED";
      AnamEvent4["TALK_STREAM_INTERRUPTED"] = "TALK_STREAM_INTERRUPTED";
      AnamEvent4["SESSION_READY"] = "SESSION_READY";
      AnamEvent4["SERVER_WARNING"] = "SERVER_WARNING";
      AnamEvent4["MIC_PERMISSION_PENDING"] = "MIC_PERMISSION_PENDING";
      AnamEvent4["MIC_PERMISSION_GRANTED"] = "MIC_PERMISSION_GRANTED";
      AnamEvent4["MIC_PERMISSION_DENIED"] = "MIC_PERMISSION_DENIED";
      AnamEvent4["INPUT_AUDIO_DEVICE_CHANGED"] = "INPUT_AUDIO_DEVICE_CHANGED";
      AnamEvent4["CLIENT_TOOL_EVENT_RECEIVED"] = "CLIENT_TOOL_EVENT_RECEIVED";
      AnamEvent4["TOOL_CALL_STARTED"] = "TOOL_CALL_STARTED";
      AnamEvent4["TOOL_CALL_COMPLETED"] = "TOOL_CALL_COMPLETED";
      AnamEvent4["TOOL_CALL_FAILED"] = "TOOL_CALL_FAILED";
      AnamEvent4["REASONING_HISTORY_UPDATED"] = "REASONING_HISTORY_UPDATED";
      AnamEvent4["REASONING_STREAM_EVENT_RECEIVED"] = "REASONING_STREAM_EVENT_RECEIVED";
      AnamEvent4["USER_SPEECH_STARTED"] = "USER_SPEECH_STARTED";
      AnamEvent4["USER_SPEECH_ENDED"] = "USER_SPEECH_ENDED";
    })(AnamEvent3 || (exports2.AnamEvent = AnamEvent3 = {}));
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/events/internal/InternalEvent.js
var require_InternalEvent = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/events/internal/InternalEvent.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InternalEvent = void 0;
    var InternalEvent;
    (function(InternalEvent2) {
      InternalEvent2["WEB_SOCKET_OPEN"] = "WEB_SOCKET_OPEN";
      InternalEvent2["SIGNAL_MESSAGE_RECEIVED"] = "SIGNAL_MESSAGE_RECEIVED";
      InternalEvent2["WEBRTC_CHAT_MESSAGE_RECEIVED"] = "WEBRTC_CHAT_MESSAGE_RECEIVED";
      InternalEvent2["WEBRTC_CLIENT_TOOL_EVENT_RECEIVED"] = "WEBRTC_CLIENT_TOOL_EVENT_RECEIVED";
      InternalEvent2["WEBRTC_TOOL_CALL_STARTED_EVENT_RECEIVED"] = "WEBRTC_TOOL_CALL_STARTED_EVENT_RECEIVED";
      InternalEvent2["WEBRTC_TOOL_CALL_COMPLETED_EVENT_RECEIVED"] = "WEBRTC_TOOL_CALL_COMPLETED_EVENT_RECEIVED";
      InternalEvent2["WEBRTC_TOOL_CALL_FAILED_EVENT_RECEIVED"] = "WEBRTC_TOOL_CALL_FAILED_EVENT_RECEIVED";
      InternalEvent2["WEBRTC_REASONING_TEXT_MESSAGE_RECEIVED"] = "WEBRTC_REASONING_TEXT_MESSAGE_RECEIVED";
      InternalEvent2["TOOL_CALL_RESULT_READY"] = "TOOL_CALL_RESULT_READY";
    })(InternalEvent || (exports2.InternalEvent = InternalEvent = {}));
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/events/public/ConnectionClosedCodes.js
var require_ConnectionClosedCodes = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/events/public/ConnectionClosedCodes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConnectionClosedCode = void 0;
    var ConnectionClosedCode;
    (function(ConnectionClosedCode2) {
      ConnectionClosedCode2["NORMAL"] = "CONNECTION_CLOSED_CODE_NORMAL";
      ConnectionClosedCode2["MICROPHONE_PERMISSION_DENIED"] = "CONNECTION_CLOSED_CODE_MICROPHONE_PERMISSION_DENIED";
      ConnectionClosedCode2["SIGNALLING_CLIENT_CONNECTION_FAILURE"] = "CONNECTION_CLOSED_CODE_SIGNALLING_CLIENT_CONNECTION_FAILURE";
      ConnectionClosedCode2["WEBRTC_FAILURE"] = "CONNECTION_CLOSED_CODE_WEBRTC_FAILURE";
      ConnectionClosedCode2["SERVER_CLOSED_CONNECTION"] = "CONNECTION_CLOSED_CODE_SERVER_CLOSED_CONNECTION";
    })(ConnectionClosedCode || (exports2.ConnectionClosedCode = ConnectionClosedCode = {}));
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/events/index.js
var require_events = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/events/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConnectionClosedCode = exports2.InternalEvent = exports2.AnamEvent = void 0;
    var AnamEvent_1 = require_AnamEvent();
    Object.defineProperty(exports2, "AnamEvent", { enumerable: true, get: function() {
      return AnamEvent_1.AnamEvent;
    } });
    var InternalEvent_1 = require_InternalEvent();
    Object.defineProperty(exports2, "InternalEvent", { enumerable: true, get: function() {
      return InternalEvent_1.InternalEvent;
    } });
    var ConnectionClosedCodes_1 = require_ConnectionClosedCodes();
    Object.defineProperty(exports2, "ConnectionClosedCode", { enumerable: true, get: function() {
      return ConnectionClosedCodes_1.ConnectionClosedCode;
    } });
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/AgentAudioInputStream.js
var require_AgentAudioInputStream = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/AgentAudioInputStream.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AgentAudioInputStream = void 0;
    var AgentAudioInputStream = class {
      constructor(config, signallingClient) {
        this.sequenceNumber = 0;
        this.config = config;
        this.signallingClient = signallingClient;
      }
      /**
       * Send PCM audio chunk to server.
       * @param audioData - Raw PCM audio bytes (ArrayBuffer/Uint8Array) or base64-encoded string
       */
      sendAudioChunk(audioData) {
        const base64 = typeof audioData === "string" ? audioData : this.arrayBufferToBase64(audioData);
        const payload = {
          audioData: base64,
          encoding: this.config.encoding,
          sampleRate: this.config.sampleRate,
          channels: this.config.channels,
          sequenceNumber: this.sequenceNumber++
        };
        this.signallingClient.sendAgentAudioInput(payload);
      }
      /**
       * Signal end of the current audio sequence/turn.
       * Sends AGENT_AUDIO_INPUT_END signal message and resets sequence number.
       */
      endSequence() {
        this.signallingClient.sendAgentAudioInputEnd();
        this.sequenceNumber = 0;
      }
      /**
       * Get the current sequence number (number of chunks sent in current sequence).
       */
      getSequenceNumber() {
        return this.sequenceNumber;
      }
      /**
       * Get the audio format configuration for this stream.
       */
      getConfig() {
        return this.config;
      }
      arrayBufferToBase64(buffer) {
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
        return btoa(binary);
      }
    };
    exports2.AgentAudioInputStream = AgentAudioInputStream;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/index.js
var require_types = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AgentAudioInputStream = exports2.ConnectionClosedCode = exports2.InternalEvent = exports2.AnamEvent = exports2.MessageRole = exports2.AudioPermissionState = exports2.DataChannelMessage = exports2.SignalMessageAction = void 0;
    var signalling_1 = require_signalling();
    Object.defineProperty(exports2, "SignalMessageAction", { enumerable: true, get: function() {
      return signalling_1.SignalMessageAction;
    } });
    var streaming_1 = require_streaming();
    Object.defineProperty(exports2, "DataChannelMessage", { enumerable: true, get: function() {
      return streaming_1.DataChannelMessage;
    } });
    var InputAudioState_1 = require_InputAudioState();
    Object.defineProperty(exports2, "AudioPermissionState", { enumerable: true, get: function() {
      return InputAudioState_1.AudioPermissionState;
    } });
    var messageHistory_1 = require_messageHistory();
    Object.defineProperty(exports2, "MessageRole", { enumerable: true, get: function() {
      return messageHistory_1.MessageRole;
    } });
    var events_1 = require_events();
    Object.defineProperty(exports2, "AnamEvent", { enumerable: true, get: function() {
      return events_1.AnamEvent;
    } });
    var events_2 = require_events();
    Object.defineProperty(exports2, "InternalEvent", { enumerable: true, get: function() {
      return events_2.InternalEvent;
    } });
    var events_3 = require_events();
    Object.defineProperty(exports2, "ConnectionClosedCode", { enumerable: true, get: function() {
      return events_3.ConnectionClosedCode;
    } });
    var AgentAudioInputStream_1 = require_AgentAudioInputStream();
    Object.defineProperty(exports2, "AgentAudioInputStream", { enumerable: true, get: function() {
      return AgentAudioInputStream_1.AgentAudioInputStream;
    } });
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/SignallingClient.js
var require_SignallingClient = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/SignallingClient.js"(exports2) {
    "use strict";
    var __awaiter = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SignallingClient = void 0;
    var types_1 = require_types();
    var DEFAULT_HEARTBEAT_INTERVAL_SECONDS = 5;
    var DEFAULT_WS_RECONNECTION_ATTEMPTS = 5;
    var SignallingClient = class {
      constructor(sessionId, options, publicEventEmitter, internalEventEmitter, apiGatewayConfig) {
        var _a, _b, _c, _d, _e;
        this.stopSignal = false;
        this.sendingBuffer = [];
        this.wsConnectionAttempts = 0;
        this.socket = null;
        this.heartBeatIntervalRef = null;
        this.publicEventEmitter = publicEventEmitter;
        this.internalEventEmitter = internalEventEmitter;
        this.apiGatewayConfig = apiGatewayConfig;
        if (!sessionId) {
          throw new Error("Signalling Client: sessionId is required");
        }
        this.sessionId = sessionId;
        const { heartbeatIntervalSeconds, maxWsReconnectionAttempts, url: url2 } = options;
        this.heartbeatIntervalSeconds = heartbeatIntervalSeconds || DEFAULT_HEARTBEAT_INTERVAL_SECONDS;
        this.maxWsReconnectionAttempts = maxWsReconnectionAttempts || DEFAULT_WS_RECONNECTION_ATTEMPTS;
        if (!url2.baseUrl) {
          throw new Error("Signalling Client: baseUrl is required");
        }
        if (((_a = this.apiGatewayConfig) === null || _a === void 0 ? void 0 : _a.enabled) && ((_b = this.apiGatewayConfig) === null || _b === void 0 ? void 0 : _b.baseUrl)) {
          const gatewayUrl = new URL(this.apiGatewayConfig.baseUrl);
          const wsPath = (_c = this.apiGatewayConfig.wsPath) !== null && _c !== void 0 ? _c : "/ws";
          gatewayUrl.protocol = gatewayUrl.protocol.replace("http", "ws");
          gatewayUrl.pathname = wsPath;
          this.url = gatewayUrl;
          const httpProtocol = url2.protocol || "https";
          const targetProtocol = httpProtocol === "http" ? "ws" : "wss";
          const httpUrl = `${httpProtocol}://${url2.baseUrl}`;
          const targetWsPath = (_d = url2.signallingPath) !== null && _d !== void 0 ? _d : "/ws";
          const targetUrl = new URL(httpUrl);
          targetUrl.protocol = targetProtocol === "ws" ? "ws:" : "wss:";
          if (url2.port) {
            targetUrl.port = url2.port;
          }
          targetUrl.pathname = targetWsPath;
          targetUrl.searchParams.append("session_id", sessionId);
          this.url.searchParams.append("target_url", targetUrl.href);
        } else {
          const httpProtocol = url2.protocol || "https";
          const initUrl = `${httpProtocol}://${url2.baseUrl}`;
          this.url = new URL(initUrl);
          this.url.protocol = url2.protocol === "http" ? "ws:" : "wss:";
          if (url2.port) {
            this.url.port = url2.port;
          }
          this.url.pathname = (_e = url2.signallingPath) !== null && _e !== void 0 ? _e : "/ws";
          this.url.searchParams.append("session_id", sessionId);
        }
      }
      stop() {
        this.stopSignal = true;
        this.closeSocket();
      }
      connect() {
        this.socket = new WebSocket(this.url.href);
        this.socket.onopen = this.onOpen.bind(this);
        this.socket.onclose = this.onClose.bind(this);
        this.socket.onerror = this.onError.bind(this);
        return this.socket;
      }
      sendOffer(localDescription) {
        return __awaiter(this, void 0, void 0, function* () {
          const offerMessagePayload = {
            connectionDescription: localDescription,
            userUid: this.sessionId
            // TODO: this should be renamed to session ID on the server
          };
          const offerMessage = {
            actionType: types_1.SignalMessageAction.OFFER,
            sessionId: this.sessionId,
            payload: offerMessagePayload
          };
          this.sendSignalMessage(offerMessage);
        });
      }
      sendIceCandidate(candidate) {
        return __awaiter(this, void 0, void 0, function* () {
          const iceCandidateMessage = {
            actionType: types_1.SignalMessageAction.ICE_CANDIDATE,
            sessionId: this.sessionId,
            payload: candidate.toJSON()
          };
          this.sendSignalMessage(iceCandidateMessage);
        });
      }
      sendSignalMessage(message) {
        var _a;
        if (((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN) {
          try {
            this.socket.send(JSON.stringify(message));
          } catch (error) {
            console.error("SignallingClient - sendSignalMessage: error sending message", error);
          }
        } else {
          this.sendingBuffer.push(message);
        }
      }
      sendTalkMessage(payload) {
        return __awaiter(this, void 0, void 0, function* () {
          const chatMessage = {
            actionType: types_1.SignalMessageAction.TALK_STREAM_INPUT,
            sessionId: this.sessionId,
            payload
          };
          this.sendSignalMessage(chatMessage);
        });
      }
      sendAgentAudioInput(payload) {
        const message = {
          actionType: types_1.SignalMessageAction.AGENT_AUDIO_INPUT,
          sessionId: this.sessionId,
          payload
        };
        this.sendSignalMessage(message);
      }
      sendAgentAudioInputEnd() {
        const message = {
          actionType: types_1.SignalMessageAction.AGENT_AUDIO_INPUT_END,
          sessionId: this.sessionId,
          payload: {}
        };
        this.sendSignalMessage(message);
      }
      closeSocket() {
        if (this.socket) {
          this.socket.close();
          this.socket = null;
        }
        if (this.heartBeatIntervalRef) {
          clearInterval(this.heartBeatIntervalRef);
          this.heartBeatIntervalRef = null;
        }
      }
      onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
          if (!this.socket) {
            throw new Error("SignallingClient - onOpen: socket is null");
          }
          try {
            this.wsConnectionAttempts = 0;
            this.flushSendingBuffer();
            this.socket.onmessage = this.onMessage.bind(this);
            this.startSendingHeartBeats();
            this.internalEventEmitter.emit(types_1.InternalEvent.WEB_SOCKET_OPEN);
          } catch (e) {
            console.error("SignallingClient - onOpen: error in onOpen", e);
            this.publicEventEmitter.emit(types_1.AnamEvent.CONNECTION_CLOSED, types_1.ConnectionClosedCode.SIGNALLING_CLIENT_CONNECTION_FAILURE);
          }
        });
      }
      onClose() {
        return __awaiter(this, void 0, void 0, function* () {
          this.wsConnectionAttempts += 1;
          if (this.stopSignal) {
            return;
          }
          if (this.wsConnectionAttempts <= this.maxWsReconnectionAttempts) {
            this.socket = null;
            setTimeout(() => {
              this.connect();
            }, 100 * this.wsConnectionAttempts);
          } else {
            if (this.heartBeatIntervalRef) {
              clearInterval(this.heartBeatIntervalRef);
              this.heartBeatIntervalRef = null;
            }
            this.publicEventEmitter.emit(types_1.AnamEvent.CONNECTION_CLOSED, types_1.ConnectionClosedCode.SIGNALLING_CLIENT_CONNECTION_FAILURE);
          }
        });
      }
      onError(event) {
        if (this.stopSignal) {
          return;
        }
        console.error("SignallingClient - onError: ", event);
      }
      flushSendingBuffer() {
        const newBuffer = [];
        if (this.sendingBuffer.length > 0) {
          this.sendingBuffer.forEach((message) => {
            var _a;
            if (((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN) {
              this.socket.send(JSON.stringify(message));
            } else {
              newBuffer.push(message);
            }
          });
        }
        this.sendingBuffer = newBuffer;
      }
      onMessage(event) {
        return __awaiter(this, void 0, void 0, function* () {
          const message = JSON.parse(event.data);
          this.internalEventEmitter.emit(types_1.InternalEvent.SIGNAL_MESSAGE_RECEIVED, message);
        });
      }
      startSendingHeartBeats() {
        if (!this.socket) {
          throw new Error("SignallingClient - startSendingHeartBeats: socket is null");
        }
        if (this.heartBeatIntervalRef) {
          console.warn("SignallingClient - startSendingHeartBeats: heartbeat interval already set");
        }
        const heartbeatInterval = this.heartbeatIntervalSeconds * 1e3;
        const heartbeatMessage = {
          actionType: types_1.SignalMessageAction.HEARTBEAT,
          sessionId: this.sessionId,
          payload: ""
        };
        const heartbeatMessageJson = JSON.stringify(heartbeatMessage);
        this.heartBeatIntervalRef = setInterval(() => {
          var _a;
          if (this.stopSignal) {
            return;
          }
          if (((_a = this.socket) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN) {
            this.socket.send(heartbeatMessageJson);
          }
        }, heartbeatInterval);
      }
    };
    exports2.SignallingClient = SignallingClient;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/PersonaConfig.js
var require_PersonaConfig = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/PersonaConfig.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isCustomPersonaConfig = void 0;
    function isCustomPersonaConfig(personaConfig) {
      return "brainType" in personaConfig || "llmId" in personaConfig;
    }
    exports2.isCustomPersonaConfig = isCustomPersonaConfig;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/CoreApiRestClient.js
var require_CoreApiRestClient = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/CoreApiRestClient.js"(exports2) {
    "use strict";
    var __awaiter = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CoreApiRestClient = void 0;
    var ClientError_1 = require_ClientError();
    var constants_1 = require_constants();
    var PersonaConfig_1 = require_PersonaConfig();
    var CoreApiRestClient = class {
      constructor(sessionToken, apiKey, options) {
        if (!sessionToken && !apiKey) {
          throw new Error("Either sessionToken or apiKey must be provided");
        }
        this.sessionToken = sessionToken || null;
        this.apiKey = apiKey || null;
        this.baseUrl = (options === null || options === void 0 ? void 0 : options.baseUrl) || constants_1.DEFAULT_API_BASE_URL;
        this.apiVersion = (options === null || options === void 0 ? void 0 : options.apiVersion) || constants_1.DEFAULT_API_VERSION;
        this.apiGatewayConfig = (options === null || options === void 0 ? void 0 : options.apiGateway) || void 0;
      }
      /**
       * Builds URL and headers for a request, applying API Gateway configuration if enabled
       */
      buildGatewayUrlAndHeaders(targetPath, baseHeaders) {
        var _a, _b;
        if (((_a = this.apiGatewayConfig) === null || _a === void 0 ? void 0 : _a.enabled) && ((_b = this.apiGatewayConfig) === null || _b === void 0 ? void 0 : _b.baseUrl)) {
          const url2 = `${this.apiGatewayConfig.baseUrl}${targetPath}`;
          const targetUrl = new URL(`${this.baseUrl}${targetPath}`);
          const headers = Object.assign(Object.assign({}, baseHeaders), { "X-Anam-Target-Url": targetUrl.href });
          return { url: url2, headers };
        } else {
          return {
            url: `${this.baseUrl}${targetPath}`,
            headers: baseHeaders
          };
        }
      }
      startSession(personaConfig, sessionOptions) {
        return __awaiter(this, void 0, void 0, function* () {
          if (!this.sessionToken) {
            if (!personaConfig) {
              throw new ClientError_1.ClientError("Persona configuration must be provided when using apiKey", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_VALIDATION_ERROR, 400);
            }
            this.sessionToken = yield this.unsafe_getSessionToken(personaConfig);
          }
          if (personaConfig && "brainType" in personaConfig) {
            console.warn("Warning: brainType is deprecated and will be removed in a future version. Please use llmId instead.");
          }
          try {
            const targetPath = `${this.apiVersion}/engine/session`;
            const { url: url2, headers } = this.buildGatewayUrlAndHeaders(targetPath, {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.sessionToken}`
            });
            const response = yield fetch(url2, {
              method: "POST",
              headers,
              body: JSON.stringify({
                personaConfig,
                sessionOptions,
                clientMetadata: constants_1.CLIENT_METADATA
              })
            });
            const data = yield response.json();
            const errorCause = data.error;
            switch (response.status) {
              case 200:
              case 201:
                return data;
              case 400:
                throw new ClientError_1.ClientError("Invalid request to start session", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_VALIDATION_ERROR, 400, { cause: data.message });
              case 401:
                throw new ClientError_1.ClientError("Authentication failed when starting session", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_AUTHENTICATION_ERROR, 401, { cause: data.message });
              case 402:
                throw new ClientError_1.ClientError("Please sign up for a plan to start a session", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_NO_PLAN_FOUND, 402, { cause: data.message });
              case 403:
                throw new ClientError_1.ClientError("Authentication failed when starting session", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_AUTHENTICATION_ERROR, 403, { cause: data.message });
              case 429:
                if (errorCause === "Concurrent session limit reached") {
                  throw new ClientError_1.ClientError("Concurrency limit reached, please upgrade your plan", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_MAX_CONCURRENT_SESSIONS_REACHED, 429, { cause: data.message });
                } else if (errorCause === "Spend cap reached") {
                  throw new ClientError_1.ClientError("Spend cap reached, please upgrade your plan", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_SPEND_CAP_REACHED, 429, { cause: data.message });
                } else {
                  throw new ClientError_1.ClientError("Usage limit reached, please upgrade your plan", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_USAGE_LIMIT_REACHED, 429, { cause: data.message });
                }
              case 503:
                throw new ClientError_1.ClientError("There are no available personas, please try again later", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_SERVICE_BUSY, 503, { cause: data.message });
              default:
                throw new ClientError_1.ClientError("Unknown error when starting session", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_SERVER_ERROR, 500, { cause: data.message });
            }
          } catch (error) {
            if (error instanceof ClientError_1.ClientError) {
              throw error;
            }
            throw new ClientError_1.ClientError("Failed to start session", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_SERVER_ERROR, 500, { cause: error instanceof Error ? error.message : String(error) });
          }
        });
      }
      unsafe_getSessionToken(personaConfig) {
        return __awaiter(this, void 0, void 0, function* () {
          console.warn("Using an insecure method. This method should not be used in production.");
          if (!this.apiKey) {
            throw new Error("No apiKey provided");
          }
          if (personaConfig && "brainType" in personaConfig) {
            console.warn("Warning: brainType is deprecated and will be removed in a future version. Please use llmId instead.");
          }
          let body = {
            clientLabel: "js-sdk-api-key"
          };
          if ((0, PersonaConfig_1.isCustomPersonaConfig)(personaConfig)) {
            body = Object.assign(Object.assign({}, body), { personaConfig });
          }
          try {
            const targetPath = `${this.apiVersion}/auth/session-token`;
            const { url: url2, headers } = this.buildGatewayUrlAndHeaders(targetPath, {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`
            });
            const response = yield fetch(url2, {
              method: "POST",
              headers,
              body: JSON.stringify(body)
            });
            const data = yield response.json();
            return data.sessionToken;
          } catch (e) {
            throw new Error("Failed to get session token");
          }
        });
      }
      getApiUrl() {
        return `${this.baseUrl}${this.apiVersion}`;
      }
    };
    exports2.CoreApiRestClient = CoreApiRestClient;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/EngineApiRestClient.js
var require_EngineApiRestClient = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/EngineApiRestClient.js"(exports2) {
    "use strict";
    var __awaiter = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EngineApiRestClient = void 0;
    var EngineApiRestClient = class {
      constructor(baseUrl, sessionId, apiGatewayConfig) {
        this.baseUrl = baseUrl;
        this.sessionId = sessionId;
        this.apiGatewayConfig = apiGatewayConfig;
      }
      sendTalkCommand(content) {
        return __awaiter(this, void 0, void 0, function* () {
          var _a, _b;
          try {
            let url2;
            let headers = {
              "Content-Type": "application/json"
            };
            const targetPath = `/talk`;
            const queryString = `?session_id=${this.sessionId}`;
            if (((_a = this.apiGatewayConfig) === null || _a === void 0 ? void 0 : _a.enabled) && ((_b = this.apiGatewayConfig) === null || _b === void 0 ? void 0 : _b.baseUrl)) {
              url2 = `${this.apiGatewayConfig.baseUrl}${targetPath}${queryString}`;
              const targetUrl = new URL(`${this.baseUrl}${targetPath}${queryString}`);
              headers["X-Anam-Target-Url"] = targetUrl.href;
            } else {
              url2 = `${this.baseUrl}${targetPath}${queryString}`;
            }
            const response = yield fetch(url2, {
              method: "POST",
              headers,
              body: JSON.stringify({
                content
              })
            });
            if (!response.ok) {
              throw new Error(`Failed to send talk command: ${response.status} ${response.statusText}`);
            }
          } catch (error) {
            console.error(error);
            throw new Error("EngineApiRestClient - sendTalkCommand: Failed to send talk command");
          }
        });
      }
    };
    exports2.EngineApiRestClient = EngineApiRestClient;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/InternalEventEmitter.js
var require_InternalEventEmitter = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/InternalEventEmitter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InternalEventEmitter = void 0;
    var InternalEventEmitter = class {
      constructor() {
        this.listeners = {};
      }
      addListener(event, callback) {
        if (!this.listeners[event]) {
          this.listeners[event] = /* @__PURE__ */ new Set();
        }
        this.listeners[event].add(callback);
      }
      removeListener(event, callback) {
        if (!this.listeners[event])
          return;
        this.listeners[event].delete(callback);
      }
      emit(event, ...args) {
        if (!this.listeners[event])
          return;
        this.listeners[event].forEach((callback) => {
          callback(...args);
        });
      }
    };
    exports2.InternalEventEmitter = InternalEventEmitter;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/MessageHistoryClient.js
var require_MessageHistoryClient = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/MessageHistoryClient.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MessageHistoryClient = void 0;
    var types_1 = require_types();
    var MessageHistoryClient = class {
      constructor(publicEventEmitter, internalEventEmitter) {
        this.messages = [];
        this.publicEventEmitter = publicEventEmitter;
        this.internalEventEmitter = internalEventEmitter;
        this.internalEventEmitter.addListener(types_1.InternalEvent.WEBRTC_CHAT_MESSAGE_RECEIVED, this.processWebRtcTextMessageEvent.bind(this));
      }
      webRtcTextMessageEventToMessageStreamEvent(event) {
        return {
          id: `${event.role}::${event.message_id}`,
          // id is the same for persona and user for a single question response, so we need to differentiate them
          content: event.content,
          role: event.role,
          endOfSpeech: event.end_of_speech,
          interrupted: event.interrupted
        };
      }
      processUserMessage(messageEvent) {
        const userMessage = {
          id: messageEvent.id,
          content: messageEvent.content,
          role: messageEvent.role
        };
        this.messages.push(userMessage);
      }
      processPersonaMessage(messageEvent) {
        const personaMessage = {
          id: messageEvent.id,
          content: messageEvent.content,
          role: messageEvent.role,
          interrupted: messageEvent.interrupted
        };
        const existingMessageIndex = this.messages.findIndex((m) => m.id === personaMessage.id);
        if (existingMessageIndex !== -1) {
          const existingMessage = this.messages[existingMessageIndex];
          this.messages[existingMessageIndex] = Object.assign(Object.assign({}, existingMessage), { content: existingMessage.content + personaMessage.content, interrupted: existingMessage.interrupted || personaMessage.interrupted });
        } else {
          this.messages.push(personaMessage);
        }
      }
      processWebRtcTextMessageEvent(event) {
        const messageStreamEvent = this.webRtcTextMessageEventToMessageStreamEvent(event);
        this.publicEventEmitter.emit(types_1.AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, messageStreamEvent);
        switch (messageStreamEvent.role) {
          case types_1.MessageRole.USER:
            this.processUserMessage(messageStreamEvent);
            break;
          case types_1.MessageRole.PERSONA:
            this.processPersonaMessage(messageStreamEvent);
            break;
        }
        if (messageStreamEvent.endOfSpeech) {
          this.publicEventEmitter.emit(types_1.AnamEvent.MESSAGE_HISTORY_UPDATED, this.messages);
        }
      }
    };
    exports2.MessageHistoryClient = MessageHistoryClient;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/PublicEventEmitter.js
var require_PublicEventEmitter = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/PublicEventEmitter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PublicEventEmitter = void 0;
    var ClientMetrics_1 = require_ClientMetrics();
    var types_1 = require_types();
    var PublicEventEmitter = class {
      constructor() {
        this.listeners = {};
      }
      addListener(event, callback) {
        if (!this.listeners[event]) {
          this.listeners[event] = /* @__PURE__ */ new Set();
        }
        this.listeners[event].add(callback);
      }
      removeListener(event, callback) {
        if (!this.listeners[event])
          return;
        this.listeners[event].delete(callback);
      }
      emit(event, ...args) {
        if (event === types_1.AnamEvent.CONNECTION_ESTABLISHED) {
          (0, ClientMetrics_1.sendClientMetric)(ClientMetrics_1.ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_CONNECTION_ESTABLISHED, "1");
        }
        if (event === types_1.AnamEvent.CONNECTION_CLOSED) {
          const [closeCode, details] = args;
          (0, ClientMetrics_1.sendClientMetric)(ClientMetrics_1.ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_CONNECTION_CLOSED, closeCode, details ? { details } : void 0);
        }
        if (!this.listeners[event])
          return;
        this.listeners[event].forEach((callback) => {
          callback(...args);
        });
      }
    };
    exports2.PublicEventEmitter = PublicEventEmitter;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/TalkMessageStreamState.js
var require_TalkMessageStreamState = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/TalkMessageStreamState.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TalkMessageStreamState = void 0;
    var TalkMessageStreamState;
    (function(TalkMessageStreamState2) {
      TalkMessageStreamState2[TalkMessageStreamState2["UNSTARTED"] = 0] = "UNSTARTED";
      TalkMessageStreamState2[TalkMessageStreamState2["STREAMING"] = 1] = "STREAMING";
      TalkMessageStreamState2[TalkMessageStreamState2["INTERRUPTED"] = 2] = "INTERRUPTED";
      TalkMessageStreamState2[TalkMessageStreamState2["ENDED"] = 3] = "ENDED";
    })(TalkMessageStreamState || (exports2.TalkMessageStreamState = TalkMessageStreamState = {}));
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/TalkMessageStream.js
var require_TalkMessageStream = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/types/TalkMessageStream.js"(exports2) {
    "use strict";
    var __awaiter = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TalkMessageStream = void 0;
    var _1 = require_types();
    var TalkMessageStreamState_1 = require_TalkMessageStreamState();
    var TalkMessageStream = class {
      constructor(correlationId, internalEventEmitter, signallingClient) {
        this.state = TalkMessageStreamState_1.TalkMessageStreamState.UNSTARTED;
        this.correlationId = correlationId;
        this.internalEventEmitter = internalEventEmitter;
        this.signallingClient = signallingClient;
        this.internalEventEmitter.addListener(_1.InternalEvent.SIGNAL_MESSAGE_RECEIVED, this.onSignalMessage.bind(this));
      }
      onDeactivate() {
        this.internalEventEmitter.removeListener(_1.InternalEvent.SIGNAL_MESSAGE_RECEIVED, this.onSignalMessage.bind(this));
      }
      onSignalMessage(signalMessage) {
        return __awaiter(this, void 0, void 0, function* () {
          if (signalMessage.actionType === _1.SignalMessageAction.TALK_STREAM_INTERRUPTED) {
            const message = signalMessage.payload;
            if (message.correlationId === this.correlationId) {
              this.state = TalkMessageStreamState_1.TalkMessageStreamState.INTERRUPTED;
              this.onDeactivate();
            }
          }
        });
      }
      endMessage() {
        return __awaiter(this, void 0, void 0, function* () {
          if (this.state === TalkMessageStreamState_1.TalkMessageStreamState.ENDED) {
            console.warn("Talk stream is already ended via end of speech. No need to call endMessage.");
            return;
          }
          if (this.state !== TalkMessageStreamState_1.TalkMessageStreamState.STREAMING) {
            console.warn("Talk stream is not in an active state: " + this.state);
            return;
          }
          const payload = {
            content: "",
            startOfSpeech: false,
            endOfSpeech: true,
            correlationId: this.correlationId
          };
          yield this.signallingClient.sendTalkMessage(payload);
          this.state = TalkMessageStreamState_1.TalkMessageStreamState.ENDED;
          this.onDeactivate();
        });
      }
      streamMessageChunk(partialMessage, endOfSpeech) {
        return __awaiter(this, void 0, void 0, function* () {
          if (this.state !== TalkMessageStreamState_1.TalkMessageStreamState.STREAMING && this.state !== TalkMessageStreamState_1.TalkMessageStreamState.UNSTARTED) {
            throw new Error("Talk stream is not in an active state: " + this.state);
          }
          const payload = {
            content: partialMessage,
            startOfSpeech: this.state === TalkMessageStreamState_1.TalkMessageStreamState.UNSTARTED,
            endOfSpeech,
            correlationId: this.correlationId
          };
          this.state = endOfSpeech ? TalkMessageStreamState_1.TalkMessageStreamState.ENDED : TalkMessageStreamState_1.TalkMessageStreamState.STREAMING;
          if (this.state === TalkMessageStreamState_1.TalkMessageStreamState.ENDED) {
            this.onDeactivate();
          }
          yield this.signallingClient.sendTalkMessage(payload);
        });
      }
      getCorrelationId() {
        return this.correlationId;
      }
      isActive() {
        return this.state === TalkMessageStreamState_1.TalkMessageStreamState.STREAMING || this.state === TalkMessageStreamState_1.TalkMessageStreamState.UNSTARTED;
      }
      getState() {
        return this.state;
      }
    };
    exports2.TalkMessageStream = TalkMessageStream;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/ToolCallManager.js
var require_ToolCallManager = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/ToolCallManager.js"(exports2) {
    "use strict";
    var __awaiter = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ToolCallManager = void 0;
    var types_1 = require_types();
    var calculateExecutionTime = (startTimestamp, endTimestamp) => {
      if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
        return 0;
      }
      const executionTime = endTimestamp - startTimestamp;
      return executionTime > 0 ? executionTime : 0;
    };
    var ToolCallManager = class {
      constructor(publicEventEmitter, internalEventEmitter) {
        this.handlers = /* @__PURE__ */ Object.create(null);
        this.pendingCalls = /* @__PURE__ */ Object.create(null);
        this.failedCalls = /* @__PURE__ */ Object.create(null);
        this.activeSessionId = null;
        this.publicEventEmitter = publicEventEmitter;
        this.internalEventEmitter = internalEventEmitter;
      }
      setActiveSession(sessionId) {
        this.activeSessionId = sessionId;
        this.clearPendingCalls();
        this.clearFailedCalls();
      }
      clearSessionState() {
        this.activeSessionId = null;
        this.clearPendingCalls();
        this.clearFailedCalls();
      }
      clearPendingCalls() {
        this.pendingCalls = /* @__PURE__ */ Object.create(null);
      }
      clearFailedCalls() {
        this.failedCalls = /* @__PURE__ */ Object.create(null);
      }
      registerHandler(toolName, handler) {
        this.handlers[toolName] = handler;
        return () => {
          delete this.handlers[toolName];
        };
      }
      processToolCallStartedEvent(toolCallEvent) {
        return __awaiter(this, void 0, void 0, function* () {
          if (this.activeSessionId !== toolCallEvent.session_id) {
            return;
          }
          const { tool_name, timestamp } = toolCallEvent;
          const payload = this.WebRTCToolCallStartedEventToToolCallStartedPayload(toolCallEvent);
          const parsedTimestamp = new Date(timestamp);
          this.pendingCalls[toolCallEvent.tool_call_id] = {
            payload,
            timestamp: parsedTimestamp.getTime()
          };
          if (!(tool_name in this.handlers)) {
            return;
          }
          const handler = this.handlers[tool_name];
          if (!handler.onStart) {
            return;
          }
          try {
            let result = yield handler.onStart(payload);
            if (toolCallEvent.tool_type === "client") {
              this.sendToolResult({
                sessionId: toolCallEvent.session_id,
                toolCallId: toolCallEvent.tool_call_id,
                userActionCorrelationId: toolCallEvent.user_action_correlation_id,
                timestampUserAction: toolCallEvent.timestamp_user_action,
                result: result !== null && result !== void 0 ? result : void 0,
                errorMessage: void 0
              });
              yield this.processToolCallCompletedEvent(Object.assign(Object.assign({}, toolCallEvent), { result, timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
              return;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (toolCallEvent.tool_type === "client") {
              this.sendToolResult({
                sessionId: toolCallEvent.session_id,
                toolCallId: toolCallEvent.tool_call_id,
                userActionCorrelationId: toolCallEvent.user_action_correlation_id,
                timestampUserAction: toolCallEvent.timestamp_user_action,
                result: void 0,
                errorMessage: `Error in handler: ${errorMessage}`
              });
            }
            yield this.processToolCallFailedEvent(Object.assign(Object.assign({}, toolCallEvent), { error_message: `Error in onStart handler: ${errorMessage}`, timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
            return;
          }
        });
      }
      processToolCallCompletedEvent(toolCallEvent) {
        return __awaiter(this, void 0, void 0, function* () {
          const { tool_name, tool_call_id, timestamp } = toolCallEvent;
          if (this.activeSessionId !== toolCallEvent.session_id) {
            return;
          }
          if (tool_call_id in this.failedCalls) {
            delete this.failedCalls[tool_call_id];
            return;
          }
          const payload = this.webRTCToolCallCompletedEventToToolCallCompletedPayload(toolCallEvent);
          if (tool_call_id in this.pendingCalls) {
            delete this.pendingCalls[tool_call_id];
          }
          if (!(tool_name in this.handlers)) {
            return;
          }
          const handler = this.handlers[tool_name];
          if (!handler.onComplete) {
            return;
          }
          if (toolCallEvent.tool_type === "client") {
            this.publicEventEmitter.emit(types_1.AnamEvent.TOOL_CALL_COMPLETED, payload);
          }
          try {
            yield handler.onComplete(payload);
          } catch (error) {
            console.error(`Error in onComplete handler for tool ${tool_name}:`, error);
            return;
          }
        });
      }
      processToolCallFailedEvent(toolCallEvent) {
        return __awaiter(this, void 0, void 0, function* () {
          const { tool_name, tool_call_id, timestamp } = toolCallEvent;
          if (this.activeSessionId !== toolCallEvent.session_id) {
            return;
          }
          const payload = this.webRTCToolCallFailedEventToToolCallFailedPayload(toolCallEvent);
          this.failedCalls[tool_call_id] = payload;
          if (tool_call_id in this.pendingCalls) {
            delete this.pendingCalls[tool_call_id];
          }
          if (!(tool_name in this.handlers)) {
            return;
          }
          const handler = this.handlers[tool_name];
          if (!handler.onFail) {
            return;
          }
          if (toolCallEvent.tool_type === "client") {
            this.publicEventEmitter.emit(types_1.AnamEvent.TOOL_CALL_FAILED, payload);
          }
          try {
            yield handler.onFail(payload);
          } catch (error) {
            console.error(`Error in onFail handler for tool ${tool_name}:`, error);
            return;
          }
        });
      }
      /**
       * Emits a tool result event so it can be sent back to the engine.
       * The StreamingClient listens for this event and sends the data channel message.
       */
      sendToolResult(result) {
        const payload = {
          sessionId: result.sessionId,
          toolCallId: result.toolCallId,
          result: result.result,
          errorMessage: result.errorMessage,
          userActionCorrelationId: result.userActionCorrelationId,
          timestampUserAction: result.timestampUserAction
        };
        this.internalEventEmitter.emit(types_1.InternalEvent.TOOL_CALL_RESULT_READY, payload);
      }
      /**
       * Converts a WebRtcClientToolEvent to a ClientToolEvent
       */
      static WebRTCClientToolEventToClientToolEvent(webRtcEvent) {
        return {
          eventUid: webRtcEvent.event_uid,
          sessionId: webRtcEvent.session_id,
          eventName: webRtcEvent.event_name,
          eventData: webRtcEvent.event_data,
          timestamp: webRtcEvent.timestamp,
          timestampUserAction: webRtcEvent.timestamp_user_action,
          userActionCorrelationId: webRtcEvent.user_action_correlation_id
        };
      }
      static WebRTCToolCallStartedEventToClientToolEvent(webRtcEvent) {
        return {
          eventUid: webRtcEvent.event_uid,
          sessionId: webRtcEvent.session_id,
          eventName: webRtcEvent.tool_name,
          eventData: webRtcEvent.arguments,
          timestamp: webRtcEvent.timestamp,
          timestampUserAction: webRtcEvent.timestamp_user_action,
          userActionCorrelationId: webRtcEvent.user_action_correlation_id
        };
      }
      WebRTCToolCallStartedEventToToolCallStartedPayload(webRtcEvent) {
        return {
          eventUid: webRtcEvent.event_uid,
          sessionId: webRtcEvent.session_id,
          toolCallId: webRtcEvent.tool_call_id,
          toolName: webRtcEvent.tool_name,
          toolType: webRtcEvent.tool_type,
          toolSubtype: webRtcEvent.tool_subtype,
          arguments: webRtcEvent.arguments,
          timestamp: webRtcEvent.timestamp,
          timestampUserAction: webRtcEvent.timestamp_user_action,
          userActionCorrelationId: webRtcEvent.user_action_correlation_id
        };
      }
      webRTCToolCallCompletedEventToToolCallCompletedPayload(webRtcEvent) {
        const parsedTimestamp = new Date(webRtcEvent.timestamp);
        const pendingCall = this.pendingCalls[webRtcEvent.tool_call_id];
        const executionTime = pendingCall ? calculateExecutionTime(pendingCall.timestamp, parsedTimestamp.getTime()) : 0;
        return {
          eventUid: webRtcEvent.event_uid,
          sessionId: webRtcEvent.session_id,
          toolCallId: webRtcEvent.tool_call_id,
          toolName: webRtcEvent.tool_name,
          toolType: webRtcEvent.tool_type,
          toolSubtype: webRtcEvent.tool_subtype,
          result: webRtcEvent.result,
          executionTime: executionTime > 0 ? executionTime : 0,
          timestamp: webRtcEvent.timestamp,
          documentsAccessed: webRtcEvent.documents_accessed,
          // Include accessed files if present
          timestampUserAction: webRtcEvent.timestamp_user_action,
          userActionCorrelationId: webRtcEvent.user_action_correlation_id
        };
      }
      webRTCToolCallFailedEventToToolCallFailedPayload(webRtcEvent) {
        const parsedTimestamp = new Date(webRtcEvent.timestamp);
        const pendingCall = this.pendingCalls[webRtcEvent.tool_call_id];
        const executionTime = pendingCall ? calculateExecutionTime(pendingCall.timestamp, parsedTimestamp.getTime()) : 0;
        return {
          eventUid: webRtcEvent.event_uid,
          sessionId: webRtcEvent.session_id,
          toolCallId: webRtcEvent.tool_call_id,
          toolName: webRtcEvent.tool_name,
          toolType: webRtcEvent.tool_type,
          toolSubtype: webRtcEvent.tool_subtype,
          errorMessage: webRtcEvent.error_message,
          executionTime: executionTime > 0 ? executionTime : 0,
          timestamp: webRtcEvent.timestamp,
          timestampUserAction: webRtcEvent.timestamp_user_action,
          userActionCorrelationId: webRtcEvent.user_action_correlation_id
        };
      }
    };
    exports2.ToolCallManager = ToolCallManager;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/StreamingClient.js
var require_StreamingClient = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/StreamingClient.js"(exports2) {
    "use strict";
    var __awaiter = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.StreamingClient = void 0;
    var ClientMetrics_1 = require_ClientMetrics();
    var modules_1 = require_modules();
    var types_1 = require_types();
    var AgentAudioInputStream_1 = require_AgentAudioInputStream();
    var TalkMessageStream_1 = require_TalkMessageStream();
    var ToolCallManager_1 = require_ToolCallManager();
    var SUCCESS_METRIC_POLLING_TIMEOUT_MS = 15e3;
    var STATS_COLLECTION_INTERVAL_MS = 5e3;
    var ICE_CANDIDATE_POOL_SIZE = 2;
    var StreamingClient = class {
      constructor(sessionId, options, publicEventEmitter, internalEventEmitter, toolCallManager) {
        var _a, _b, _c, _d;
        this.peerConnection = null;
        this.connectionReceivedAnswer = false;
        this.remoteIceCandidateBuffer = [];
        this.inputAudioStream = null;
        this.dataChannel = null;
        this.videoElement = null;
        this.videoStream = null;
        this.audioStream = null;
        this.inputAudioState = {
          isMuted: false,
          permissionState: types_1.AudioPermissionState.NOT_REQUESTED
        };
        this.successMetricPoller = null;
        this.successMetricFired = false;
        this.showPeerConnectionStatsReport = false;
        this.peerConnectionStatsReportOutputFormat = "console";
        this.statsCollectionInterval = null;
        this.agentAudioInputStream = null;
        this.publicEventEmitter = publicEventEmitter;
        this.internalEventEmitter = internalEventEmitter;
        this.toolCallManager = toolCallManager;
        this.apiGatewayConfig = options.apiGateway;
        const { inputAudio } = options;
        this.inputAudioState = inputAudio.inputAudioState;
        if (options.inputAudio.userProvidedMediaStream) {
          this.inputAudioStream = options.inputAudio.userProvidedMediaStream;
        }
        this.disableInputAudio = options.inputAudio.disableInputAudio === true;
        this.internalEventEmitter.addListener(types_1.InternalEvent.WEB_SOCKET_OPEN, this.onSignallingClientConnected.bind(this));
        this.internalEventEmitter.addListener(types_1.InternalEvent.SIGNAL_MESSAGE_RECEIVED, this.onSignalMessage.bind(this));
        this.internalEventEmitter.addListener(types_1.InternalEvent.WEBRTC_TOOL_CALL_STARTED_EVENT_RECEIVED, this.toolCallManager.processToolCallStartedEvent.bind(this.toolCallManager));
        this.internalEventEmitter.addListener(types_1.InternalEvent.WEBRTC_TOOL_CALL_COMPLETED_EVENT_RECEIVED, this.toolCallManager.processToolCallCompletedEvent.bind(this.toolCallManager));
        this.internalEventEmitter.addListener(types_1.InternalEvent.WEBRTC_TOOL_CALL_FAILED_EVENT_RECEIVED, this.toolCallManager.processToolCallFailedEvent.bind(this.toolCallManager));
        this.internalEventEmitter.addListener(types_1.InternalEvent.TOOL_CALL_RESULT_READY, this.onToolCallResultReceived.bind(this));
        this.iceServers = options.iceServers;
        this.signallingClient = new modules_1.SignallingClient(sessionId, options.signalling, this.publicEventEmitter, this.internalEventEmitter, this.apiGatewayConfig);
        this.engineApiRestClient = new modules_1.EngineApiRestClient(options.engine.baseUrl, sessionId, this.apiGatewayConfig);
        this.audioDeviceId = options.inputAudio.audioDeviceId;
        this.showPeerConnectionStatsReport = (_b = (_a = options.metrics) === null || _a === void 0 ? void 0 : _a.showPeerConnectionStatsReport) !== null && _b !== void 0 ? _b : false;
        this.peerConnectionStatsReportOutputFormat = (_d = (_c = options.metrics) === null || _c === void 0 ? void 0 : _c.peerConnectionStatsReportOutputFormat) !== null && _d !== void 0 ? _d : "console";
      }
      onInputAudioStateChange(oldState, newState) {
        if (oldState.isMuted !== newState.isMuted) {
          if (newState.isMuted) {
            this.muteAllAudioTracks();
          } else {
            this.unmuteAllAudioTracks();
          }
        }
      }
      muteAllAudioTracks() {
        var _a;
        (_a = this.inputAudioStream) === null || _a === void 0 ? void 0 : _a.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      unmuteAllAudioTracks() {
        var _a;
        (_a = this.inputAudioStream) === null || _a === void 0 ? void 0 : _a.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }
      startStatsCollection() {
        if (this.statsCollectionInterval) {
          return;
        }
        this.statsCollectionInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
          if (!this.peerConnection || !this.dataChannel || this.dataChannel.readyState !== "open") {
            return;
          }
          try {
            const stats = yield this.peerConnection.getStats();
            this.sendClientSideMetrics(stats);
          } catch (error) {
            console.error("Failed to collect and send stats:", error);
          }
        }), STATS_COLLECTION_INTERVAL_MS);
      }
      sendClientSideMetrics(stats) {
        stats.forEach((report) => {
          if (report.type === "inbound-rtp") {
            const metrics = {
              message_type: "remote_rtp_stats",
              data: report
            };
            if (this.dataChannel && this.dataChannel.readyState === "open") {
              this.dataChannel.send(JSON.stringify(metrics));
            }
          }
        });
      }
      startSuccessMetricPolling() {
        if (this.successMetricPoller || this.successMetricFired) {
          return;
        }
        const timeoutId = setTimeout(() => {
          if (this.successMetricPoller) {
            console.warn("No video frames received, there is a problem with the connection.");
            clearInterval(this.successMetricPoller);
            this.successMetricPoller = null;
          }
        }, SUCCESS_METRIC_POLLING_TIMEOUT_MS);
        this.successMetricPoller = setInterval(() => __awaiter(this, void 0, void 0, function* () {
          if (!this.peerConnection || this.successMetricFired) {
            if (this.successMetricPoller) {
              clearInterval(this.successMetricPoller);
            }
            clearTimeout(timeoutId);
            return;
          }
          try {
            const stats = yield this.peerConnection.getStats();
            let videoDetected = false;
            let detectionMethod = null;
            stats.forEach((report) => {
              if (report.type === "inbound-rtp" && report.kind === "video") {
                if (report.framesDecoded !== void 0 && report.framesDecoded > 0) {
                  videoDetected = true;
                  detectionMethod = "framesDecoded";
                } else if (report.framesReceived !== void 0 && report.framesReceived > 0) {
                  videoDetected = true;
                  detectionMethod = "framesReceived";
                } else if (report.bytesReceived > 0 && report.packetsReceived > 0 && // Additional check: ensure we've received enough data for actual video
                report.bytesReceived > 1e5) {
                  videoDetected = true;
                  detectionMethod = "bytesReceived";
                }
              }
            });
            if (videoDetected && !this.successMetricFired) {
              this.successMetricFired = true;
              (0, ClientMetrics_1.sendClientMetric)(ClientMetrics_1.ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_SESSION_SUCCESS, "1", detectionMethod ? { detectionMethod } : void 0);
              if (this.successMetricPoller) {
                clearInterval(this.successMetricPoller);
              }
              clearTimeout(timeoutId);
              this.successMetricPoller = null;
            }
          } catch (error) {
          }
        }), 500);
      }
      muteInputAudio() {
        const oldAudioState = this.inputAudioState;
        const newAudioState = Object.assign(Object.assign({}, this.inputAudioState), { isMuted: true });
        this.inputAudioState = newAudioState;
        this.onInputAudioStateChange(oldAudioState, newAudioState);
        return this.inputAudioState;
      }
      unmuteInputAudio() {
        const oldAudioState = this.inputAudioState;
        const newAudioState = Object.assign(Object.assign({}, this.inputAudioState), { isMuted: false });
        this.inputAudioState = newAudioState;
        this.onInputAudioStateChange(oldAudioState, newAudioState);
        return this.inputAudioState;
      }
      getInputAudioState() {
        return this.inputAudioState;
      }
      getPeerConnection() {
        return this.peerConnection;
      }
      changeAudioInputDevice(deviceId) {
        return __awaiter(this, void 0, void 0, function* () {
          if (!this.peerConnection) {
            throw new Error("StreamingClient - changeAudioInputDevice: peer connection is not initialized. Start streaming first.");
          }
          if (deviceId === null || deviceId === void 0) {
            throw new Error("StreamingClient - changeAudioInputDevice: deviceId is required");
          }
          const wasMuted = this.inputAudioState.isMuted;
          try {
            if (this.inputAudioStream) {
              this.inputAudioStream.getAudioTracks().forEach((track) => {
                track.stop();
              });
            }
            const audioConstraints = {
              echoCancellation: true,
              deviceId: {
                exact: deviceId
              }
            };
            this.inputAudioStream = yield navigator.mediaDevices.getUserMedia({
              audio: audioConstraints
            });
            this.audioDeviceId = deviceId;
            yield this.setupAudioTrack();
            if (wasMuted) {
              this.muteAllAudioTracks();
            }
            this.publicEventEmitter.emit(types_1.AnamEvent.INPUT_AUDIO_DEVICE_CHANGED, deviceId);
          } catch (error) {
            console.error("Failed to change audio input device:", error);
            throw new Error(`StreamingClient - changeAudioInputDevice: ${error instanceof Error ? error.message : String(error)}`);
          }
        });
      }
      getInputAudioStream() {
        return this.inputAudioStream;
      }
      getVideoStream() {
        return this.videoStream;
      }
      getAudioStream() {
        return this.audioStream;
      }
      onToolCallResultReceived(payload) {
        const message = {
          session_id: payload.sessionId,
          message_type: "tool_result",
          tool_call_id: payload.toolCallId,
          user_action_correlation_id: payload.userActionCorrelationId,
          timestamp_user_action: payload.timestampUserAction
        };
        if (payload.result !== void 0) {
          message.result = payload.result;
        }
        if (payload.errorMessage) {
          message.error = payload.errorMessage;
        }
        this.sendDataMessage(JSON.stringify(message));
      }
      sendDataMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === "open") {
          this.dataChannel.send(message);
        }
      }
      setMediaStreamTargetById(videoElementId) {
        if (videoElementId) {
          const videoElement = document.getElementById(videoElementId);
          if (!videoElement) {
            throw new Error(`StreamingClient: video element with id ${videoElementId} not found`);
          }
          this.videoElement = videoElement;
        }
      }
      startConnection() {
        try {
          if (this.peerConnection) {
            console.error("StreamingClient - startConnection: peer connection already exists");
            return;
          }
          this.signallingClient.connect();
        } catch (error) {
          console.error("StreamingClient - startConnection: error", error);
          this.handleWebrtcFailure(error);
        }
      }
      stopConnection() {
        return __awaiter(this, void 0, void 0, function* () {
          yield this.shutdown();
        });
      }
      sendTalkCommand(content) {
        return __awaiter(this, void 0, void 0, function* () {
          if (!this.peerConnection) {
            throw new Error("StreamingClient - sendTalkCommand: peer connection is null");
          }
          yield this.engineApiRestClient.sendTalkCommand(content);
          return;
        });
      }
      startTalkMessageStream(correlationId) {
        if (!correlationId) {
          correlationId = Math.random().toString(36).substring(2, 15);
        }
        return new TalkMessageStream_1.TalkMessageStream(correlationId, this.internalEventEmitter, this.signallingClient);
      }
      createAgentAudioInputStream(config) {
        this.agentAudioInputStream = new AgentAudioInputStream_1.AgentAudioInputStream(config, this.signallingClient);
        return this.agentAudioInputStream;
      }
      getAgentAudioInputStream() {
        return this.agentAudioInputStream;
      }
      initPeerConnection() {
        return __awaiter(this, void 0, void 0, function* () {
          this.peerConnection = new RTCPeerConnection({
            iceServers: this.iceServers,
            iceCandidatePoolSize: ICE_CANDIDATE_POOL_SIZE
          });
          this.peerConnection.onicecandidate = this.onIceCandidate.bind(this);
          this.peerConnection.oniceconnectionstatechange = this.onIceConnectionStateChange.bind(this);
          this.peerConnection.onconnectionstatechange = this.onConnectionStateChange.bind(this);
          this.peerConnection.addEventListener("track", this.onTrackEventHandler.bind(this));
          yield this.setupDataChannels();
          this.peerConnection.addTransceiver("video", { direction: "recvonly" });
          if (this.disableInputAudio) {
            this.peerConnection.addTransceiver("audio", { direction: "recvonly" });
          } else {
            this.peerConnection.addTransceiver("audio", { direction: "sendrecv" });
            if (this.inputAudioStream) {
              yield this.setupAudioTrack();
            } else {
              this.requestMicrophonePermissionAsync().catch((error) => {
                console.error("Async microphone permission request failed:", error);
              });
            }
          }
        });
      }
      onSignalMessage(signalMessage) {
        return __awaiter(this, void 0, void 0, function* () {
          if (!this.peerConnection) {
            console.error("StreamingClient - onSignalMessage: peerConnection is not initialized");
            return;
          }
          switch (signalMessage.actionType) {
            case types_1.SignalMessageAction.ANSWER:
              const answer = signalMessage.payload;
              yield this.peerConnection.setRemoteDescription(answer);
              this.connectionReceivedAnswer = true;
              this.flushRemoteIceCandidateBuffer();
              break;
            case types_1.SignalMessageAction.ICE_CANDIDATE:
              const iceCandidateConfig = signalMessage.payload;
              const candidate = new RTCIceCandidate(iceCandidateConfig);
              if (this.connectionReceivedAnswer) {
                yield this.peerConnection.addIceCandidate(candidate);
              } else {
                this.remoteIceCandidateBuffer.push(candidate);
              }
              break;
            case types_1.SignalMessageAction.END_SESSION:
              const reason = signalMessage.payload;
              this.publicEventEmitter.emit(types_1.AnamEvent.CONNECTION_CLOSED, types_1.ConnectionClosedCode.SERVER_CLOSED_CONNECTION, reason);
              this.shutdown();
              break;
            case types_1.SignalMessageAction.WARNING:
              const message = signalMessage.payload;
              console.warn("Warning received from server: " + message);
              this.publicEventEmitter.emit(types_1.AnamEvent.SERVER_WARNING, message);
              break;
            case types_1.SignalMessageAction.TALK_STREAM_INTERRUPTED:
              const chatMessage = signalMessage.payload;
              this.publicEventEmitter.emit(types_1.AnamEvent.TALK_STREAM_INTERRUPTED, chatMessage.correlationId);
              break;
            case types_1.SignalMessageAction.SESSION_READY:
              const sessionId = signalMessage.sessionId;
              this.publicEventEmitter.emit(types_1.AnamEvent.SESSION_READY, sessionId);
              break;
            case types_1.SignalMessageAction.HEARTBEAT:
              break;
            default:
              console.warn("StreamingClient - onSignalMessage: unknown signal message action type. Is your @anam-ai/js-sdk version up to date?", signalMessage);
          }
        });
      }
      onSignallingClientConnected() {
        return __awaiter(this, void 0, void 0, function* () {
          if (!this.peerConnection) {
            try {
              yield this.initPeerConnectionAndSendOffer();
            } catch (err) {
              console.error("StreamingClient - onSignallingClientConnected: Error initializing peer connection", err);
              this.handleWebrtcFailure(err);
            }
          }
        });
      }
      flushRemoteIceCandidateBuffer() {
        this.remoteIceCandidateBuffer.forEach((candidate) => {
          var _a;
          (_a = this.peerConnection) === null || _a === void 0 ? void 0 : _a.addIceCandidate(candidate);
        });
        this.remoteIceCandidateBuffer = [];
      }
      /**
       * ICE Candidate Trickle
       * As each ICE candidate is gathered from the STUN server it is sent to the
       * webRTC server immediately in an effort to reduce time to connection.
       */
      onIceCandidate(event) {
        if (event.candidate) {
          this.signallingClient.sendIceCandidate(event.candidate);
        }
      }
      onIceConnectionStateChange() {
        var _a, _b;
        if (((_a = this.peerConnection) === null || _a === void 0 ? void 0 : _a.iceConnectionState) === "connected" || ((_b = this.peerConnection) === null || _b === void 0 ? void 0 : _b.iceConnectionState) === "completed") {
          this.publicEventEmitter.emit(types_1.AnamEvent.CONNECTION_ESTABLISHED);
          this.startStatsCollection();
        }
      }
      onConnectionStateChange() {
        var _a;
        if (((_a = this.peerConnection) === null || _a === void 0 ? void 0 : _a.connectionState) === "closed") {
          console.error("StreamingClient - onConnectionStateChange: Connection closed");
          this.handleWebrtcFailure("The connection to our servers was lost. Please try again.");
        }
      }
      handleWebrtcFailure(err) {
        console.error({ message: "StreamingClient - handleWebrtcFailure: ", err });
        if (err.name === "NotAllowedError" && err.message === "Permission denied") {
          this.publicEventEmitter.emit(types_1.AnamEvent.CONNECTION_CLOSED, types_1.ConnectionClosedCode.MICROPHONE_PERMISSION_DENIED);
        } else {
          this.publicEventEmitter.emit(types_1.AnamEvent.CONNECTION_CLOSED, types_1.ConnectionClosedCode.WEBRTC_FAILURE);
        }
        try {
          this.stopConnection();
        } catch (error) {
          console.error("StreamingClient - handleWebrtcFailure: error stopping connection", error);
        }
      }
      onTrackEventHandler(event) {
        if (event.track.kind === "video") {
          this.startSuccessMetricPolling();
          this.videoStream = event.streams[0];
          this.publicEventEmitter.emit(types_1.AnamEvent.VIDEO_STREAM_STARTED, this.videoStream);
          if (this.videoElement) {
            this.videoElement.srcObject = this.videoStream;
            const handle = this.videoElement.requestVideoFrameCallback(() => {
              var _a;
              (_a = this.videoElement) === null || _a === void 0 ? void 0 : _a.cancelVideoFrameCallback(handle);
              this.publicEventEmitter.emit(types_1.AnamEvent.VIDEO_PLAY_STARTED);
              if (!this.successMetricFired) {
                this.successMetricFired = true;
                (0, ClientMetrics_1.sendClientMetric)(ClientMetrics_1.ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_SESSION_SUCCESS, "1", { detectionMethod: "videoElement" });
              }
            });
          }
        } else if (event.track.kind === "audio") {
          this.audioStream = event.streams[0];
          this.publicEventEmitter.emit(types_1.AnamEvent.AUDIO_STREAM_STARTED, this.audioStream);
        }
      }
      /**
       * Set up the data channels for sending and receiving messages
       */
      setupDataChannels() {
        return __awaiter(this, void 0, void 0, function* () {
          if (!this.peerConnection) {
            console.error("StreamingClient - setupDataChannels: peer connection is not initialized");
            return;
          }
          if (!this.disableInputAudio && this.inputAudioStream) {
            if (!this.inputAudioStream.getAudioTracks().length) {
              throw new Error("StreamingClient - setupDataChannels: user provided stream does not have audio tracks");
            }
          }
          const dataChannel = this.peerConnection.createDataChannel("session", {
            ordered: true
          });
          dataChannel.onopen = () => {
            this.dataChannel = dataChannel !== null && dataChannel !== void 0 ? dataChannel : null;
          };
          dataChannel.onclose = () => {
          };
          dataChannel.onmessage = (event) => {
            var _a, _b, _c, _d;
            try {
              const message = JSON.parse(event.data);
              switch (message.messageType) {
                case types_1.DataChannelMessage.SPEECH_TEXT:
                  this.internalEventEmitter.emit(types_1.InternalEvent.WEBRTC_CHAT_MESSAGE_RECEIVED, message.data);
                  break;
                case types_1.DataChannelMessage.CLIENT_TOOL_EVENT:
                  const webRtcToolEvent = message.data;
                  this.internalEventEmitter.emit(types_1.InternalEvent.WEBRTC_CLIENT_TOOL_EVENT_RECEIVED, webRtcToolEvent);
                  const clientToolEvent = ToolCallManager_1.ToolCallManager.WebRTCClientToolEventToClientToolEvent(webRtcToolEvent);
                  this.publicEventEmitter.emit(types_1.AnamEvent.CLIENT_TOOL_EVENT_RECEIVED, clientToolEvent);
                  break;
                case types_1.DataChannelMessage.TOOL_CALL_STARTED_EVENT:
                  const webRtcToolCallStartedEvent = message.data;
                  this.publicEventEmitter.emit(types_1.AnamEvent.TOOL_CALL_STARTED, this.toolCallManager.WebRTCToolCallStartedEventToToolCallStartedPayload(webRtcToolCallStartedEvent));
                  this.internalEventEmitter.emit(types_1.InternalEvent.WEBRTC_TOOL_CALL_STARTED_EVENT_RECEIVED, webRtcToolCallStartedEvent);
                  break;
                case types_1.DataChannelMessage.TOOL_CALL_COMPLETED_EVENT:
                  const webRtcToolCallCompletedEvent = message.data;
                  this.publicEventEmitter.emit(types_1.AnamEvent.TOOL_CALL_COMPLETED, this.toolCallManager.webRTCToolCallCompletedEventToToolCallCompletedPayload(webRtcToolCallCompletedEvent));
                  this.internalEventEmitter.emit(types_1.InternalEvent.WEBRTC_TOOL_CALL_COMPLETED_EVENT_RECEIVED, webRtcToolCallCompletedEvent);
                  break;
                case types_1.DataChannelMessage.TOOL_CALL_FAILED_EVENT:
                  const webRtcToolCallFailedEvent = message.data;
                  this.publicEventEmitter.emit(types_1.AnamEvent.TOOL_CALL_FAILED, this.toolCallManager.webRTCToolCallFailedEventToToolCallFailedPayload(webRtcToolCallFailedEvent));
                  this.internalEventEmitter.emit(types_1.InternalEvent.WEBRTC_TOOL_CALL_FAILED_EVENT_RECEIVED, webRtcToolCallFailedEvent);
                  break;
                case types_1.DataChannelMessage.REASONING_TEXT:
                  this.internalEventEmitter.emit(types_1.InternalEvent.WEBRTC_REASONING_TEXT_MESSAGE_RECEIVED, message.data);
                  break;
                case types_1.DataChannelMessage.USER_SPEECH_STARTED:
                  this.publicEventEmitter.emit(types_1.AnamEvent.USER_SPEECH_STARTED, (_b = (_a = message.data) === null || _a === void 0 ? void 0 : _a.user_action_correlation_id) !== null && _b !== void 0 ? _b : "unknown");
                  break;
                case types_1.DataChannelMessage.USER_SPEECH_ENDED:
                  this.publicEventEmitter.emit(types_1.AnamEvent.USER_SPEECH_ENDED, (_d = (_c = message.data) === null || _c === void 0 ? void 0 : _c.user_action_correlation_id) !== null && _d !== void 0 ? _d : "unknown");
                  break;
                default:
                  break;
              }
            } catch (error) {
              console.error("Failed to parse data channel message:", error);
            }
          };
        });
      }
      /**
       * Request microphone permission asynchronously without blocking connection
       */
      requestMicrophonePermissionAsync() {
        return __awaiter(this, void 0, void 0, function* () {
          if (this.inputAudioState.permissionState === types_1.AudioPermissionState.PENDING) {
            return;
          }
          this.inputAudioState = Object.assign(Object.assign({}, this.inputAudioState), { permissionState: types_1.AudioPermissionState.PENDING });
          this.publicEventEmitter.emit(types_1.AnamEvent.MIC_PERMISSION_PENDING);
          try {
            const audioConstraints = {
              echoCancellation: true
            };
            if (this.audioDeviceId) {
              audioConstraints.deviceId = {
                exact: this.audioDeviceId
              };
            }
            this.inputAudioStream = yield navigator.mediaDevices.getUserMedia({
              audio: audioConstraints
            });
            this.inputAudioState = Object.assign(Object.assign({}, this.inputAudioState), { permissionState: types_1.AudioPermissionState.GRANTED });
            this.publicEventEmitter.emit(types_1.AnamEvent.MIC_PERMISSION_GRANTED);
            yield this.setupAudioTrack();
          } catch (error) {
            console.error("Failed to get microphone permission:", error);
            this.inputAudioState = Object.assign(Object.assign({}, this.inputAudioState), { permissionState: types_1.AudioPermissionState.DENIED });
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.publicEventEmitter.emit(types_1.AnamEvent.MIC_PERMISSION_DENIED, errorMessage);
          }
        });
      }
      /**
       * Set up audio track and add it to the peer connection using replaceTrack
       */
      setupAudioTrack() {
        return __awaiter(this, void 0, void 0, function* () {
          if (!this.peerConnection || !this.inputAudioStream) {
            return;
          }
          if (!this.inputAudioStream.getAudioTracks().length) {
            console.error("StreamingClient - setupAudioTrack: stream does not have audio tracks");
            return;
          }
          if (this.inputAudioState.isMuted) {
            this.muteAllAudioTracks();
          }
          const audioTrack = this.inputAudioStream.getAudioTracks()[0];
          const existingSenders = this.peerConnection.getSenders();
          const audioSender = existingSenders.find((sender) => {
            var _a;
            return ((_a = sender.track) === null || _a === void 0 ? void 0 : _a.kind) === "audio" || sender.track === null && sender.dtmf !== null;
          });
          if (audioSender) {
            try {
              yield audioSender.replaceTrack(audioTrack);
            } catch (error) {
              console.error("Failed to replace audio track:", error);
              this.peerConnection.addTrack(audioTrack, this.inputAudioStream);
            }
          } else {
            this.peerConnection.addTrack(audioTrack, this.inputAudioStream);
          }
          this.publicEventEmitter.emit(types_1.AnamEvent.INPUT_AUDIO_STREAM_STARTED, this.inputAudioStream);
        });
      }
      initPeerConnectionAndSendOffer() {
        return __awaiter(this, void 0, void 0, function* () {
          yield this.initPeerConnection();
          if (!this.peerConnection) {
            console.error("StreamingClient - initPeerConnectionAndSendOffer: peer connection is not initialized");
            return;
          }
          try {
            const offer = yield this.peerConnection.createOffer();
            yield this.peerConnection.setLocalDescription(offer);
          } catch (error) {
            console.error("StreamingClient - initPeerConnectionAndSendOffer: error creating offer", error);
          }
          if (!this.peerConnection.localDescription) {
            throw new Error("StreamingClient - initPeerConnectionAndSendOffer: local description is null");
          }
          yield this.signallingClient.sendOffer(this.peerConnection.localDescription);
        });
      }
      shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
          var _a;
          if (this.showPeerConnectionStatsReport) {
            const stats = yield (_a = this.peerConnection) === null || _a === void 0 ? void 0 : _a.getStats();
            if (stats) {
              const report = (0, ClientMetrics_1.createRTCStatsReport)(stats, this.peerConnectionStatsReportOutputFormat);
              if (report) {
                console.log(report, void 0, 2);
              }
            }
          }
          if (this.statsCollectionInterval) {
            clearInterval(this.statsCollectionInterval);
            this.statsCollectionInterval = null;
          }
          if (this.successMetricPoller) {
            clearInterval(this.successMetricPoller);
            this.successMetricPoller = null;
          }
          this.successMetricFired = false;
          try {
            if (this.inputAudioStream) {
              this.inputAudioStream.getTracks().forEach((track) => {
                track.stop();
              });
            }
            this.inputAudioStream = null;
          } catch (error) {
            console.error("StreamingClient - shutdown: error stopping input audio stream", error);
          }
          try {
            this.signallingClient.stop();
          } catch (error) {
            console.error("StreamingClient - shutdown: error stopping signallilng", error);
          }
          try {
            if (this.peerConnection && this.peerConnection.connectionState !== "closed") {
              this.peerConnection.onconnectionstatechange = null;
              this.peerConnection.close();
              this.peerConnection = null;
            }
          } catch (error) {
            console.error("StreamingClient - shutdown: error closing peer connection", error);
          }
        });
      }
    };
    exports2.StreamingClient = StreamingClient;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/ReasoningHistoryClient.js
var require_ReasoningHistoryClient = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/ReasoningHistoryClient.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReasoningHistoryClient = void 0;
    var types_1 = require_types();
    var ReasoningHistoryClient = class {
      constructor(publicEventEmitter, internalEventEmitter) {
        this.reasoning_messages = [];
        this.publicEventEmitter = publicEventEmitter;
        this.internalEventEmitter = internalEventEmitter;
        this.internalEventEmitter.addListener(types_1.InternalEvent.WEBRTC_REASONING_TEXT_MESSAGE_RECEIVED, this.processWebRtcReasoningTextMessageEvent.bind(this));
      }
      webRtcTextMessageEventToReasoningStreamEvent(event) {
        return {
          id: `${event.role}::${event.message_id}`,
          content: event.content,
          endOfThought: event.end_of_thought,
          role: event.role
        };
      }
      processWebRtcReasoningTextMessageEvent(event) {
        const ReasoningStreamEvent = this.webRtcTextMessageEventToReasoningStreamEvent(event);
        this.publicEventEmitter.emit(types_1.AnamEvent.REASONING_STREAM_EVENT_RECEIVED, ReasoningStreamEvent);
        const message = {
          id: ReasoningStreamEvent.id,
          content: ReasoningStreamEvent.content,
          role: ReasoningStreamEvent.role
        };
        const existingMessageIndex = this.reasoning_messages.findIndex((m) => m.id === message.id);
        if (existingMessageIndex !== -1) {
          const existingMessage = this.reasoning_messages[existingMessageIndex];
          existingMessage.content += message.content;
          this.reasoning_messages[existingMessageIndex] = existingMessage;
        } else {
          this.reasoning_messages.push(message);
        }
        if (ReasoningStreamEvent.endOfThought) {
          this.publicEventEmitter.emit(types_1.AnamEvent.REASONING_HISTORY_UPDATED, this.reasoning_messages);
        }
      }
    };
    exports2.ReasoningHistoryClient = ReasoningHistoryClient;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/index.js
var require_modules = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/modules/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ReasoningHistoryClient = exports2.StreamingClient = exports2.PublicEventEmitter = exports2.MessageHistoryClient = exports2.InternalEventEmitter = exports2.EngineApiRestClient = exports2.CoreApiRestClient = exports2.SignallingClient = void 0;
    var SignallingClient_1 = require_SignallingClient();
    Object.defineProperty(exports2, "SignallingClient", { enumerable: true, get: function() {
      return SignallingClient_1.SignallingClient;
    } });
    var CoreApiRestClient_1 = require_CoreApiRestClient();
    Object.defineProperty(exports2, "CoreApiRestClient", { enumerable: true, get: function() {
      return CoreApiRestClient_1.CoreApiRestClient;
    } });
    var EngineApiRestClient_1 = require_EngineApiRestClient();
    Object.defineProperty(exports2, "EngineApiRestClient", { enumerable: true, get: function() {
      return EngineApiRestClient_1.EngineApiRestClient;
    } });
    var InternalEventEmitter_1 = require_InternalEventEmitter();
    Object.defineProperty(exports2, "InternalEventEmitter", { enumerable: true, get: function() {
      return InternalEventEmitter_1.InternalEventEmitter;
    } });
    var MessageHistoryClient_1 = require_MessageHistoryClient();
    Object.defineProperty(exports2, "MessageHistoryClient", { enumerable: true, get: function() {
      return MessageHistoryClient_1.MessageHistoryClient;
    } });
    var PublicEventEmitter_1 = require_PublicEventEmitter();
    Object.defineProperty(exports2, "PublicEventEmitter", { enumerable: true, get: function() {
      return PublicEventEmitter_1.PublicEventEmitter;
    } });
    var StreamingClient_1 = require_StreamingClient();
    Object.defineProperty(exports2, "StreamingClient", { enumerable: true, get: function() {
      return StreamingClient_1.StreamingClient;
    } });
    var ReasoningHistoryClient_1 = require_ReasoningHistoryClient();
    Object.defineProperty(exports2, "ReasoningHistoryClient", { enumerable: true, get: function() {
      return ReasoningHistoryClient_1.ReasoningHistoryClient;
    } });
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/AnamClient.js
var require_AnamClient = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/AnamClient.js"(exports2) {
    "use strict";
    var __awaiter = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var buffer_1 = require("buffer");
    var ClientError_1 = require_ClientError();
    var ClientMetrics_1 = require_ClientMetrics();
    var correlationId_1 = require_correlationId();
    var validateApiGatewayConfig_1 = require_validateApiGatewayConfig();
    var modules_1 = require_modules();
    var types_1 = require_types();
    var ToolCallManager_1 = require_ToolCallManager();
    var AnamClient = class {
      constructor(sessionToken, personaConfig, options) {
        var _a, _b, _c, _d, _e;
        this.inputAudioState = {
          isMuted: false,
          permissionState: types_1.AudioPermissionState.NOT_REQUESTED
        };
        this.sessionId = null;
        this.organizationId = null;
        this.streamingClient = null;
        this._isStreaming = false;
        const configError = this.validateClientConfig(sessionToken, personaConfig, options);
        if (configError) {
          throw new ClientError_1.ClientError(configError, ClientError_1.ErrorCode.CLIENT_ERROR_CODE_CONFIGURATION_ERROR, 400);
        }
        this.personaConfig = personaConfig;
        this.clientOptions = options;
        if (((_a = options === null || options === void 0 ? void 0 : options.api) === null || _a === void 0 ? void 0 : _a.baseUrl) || ((_b = options === null || options === void 0 ? void 0 : options.api) === null || _b === void 0 ? void 0 : _b.apiVersion)) {
          (0, ClientMetrics_1.setClientMetricsBaseUrl)(options.api.baseUrl || ClientMetrics_1.DEFAULT_ANAM_METRICS_BASE_URL, options.api.apiVersion || ClientMetrics_1.DEFAULT_ANAM_API_VERSION);
        }
        if ((_d = (_c = options === null || options === void 0 ? void 0 : options.api) === null || _c === void 0 ? void 0 : _c.apiGateway) === null || _d === void 0 ? void 0 : _d.enabled) {
          (0, ClientMetrics_1.setClientMetricsApiGateway)(options.api.apiGateway);
        }
        if ((_e = options === null || options === void 0 ? void 0 : options.metrics) === null || _e === void 0 ? void 0 : _e.disableClientMetrics) {
          (0, ClientMetrics_1.setClientMetricsDisabled)(true);
        }
        this.publicEventEmitter = new modules_1.PublicEventEmitter();
        this.internalEventEmitter = new modules_1.InternalEventEmitter();
        this.toolCallManager = new ToolCallManager_1.ToolCallManager(this.publicEventEmitter, this.internalEventEmitter);
        this.apiClient = new modules_1.CoreApiRestClient(sessionToken, options === null || options === void 0 ? void 0 : options.apiKey, options === null || options === void 0 ? void 0 : options.api);
        this.messageHistoryClient = new modules_1.MessageHistoryClient(this.publicEventEmitter, this.internalEventEmitter);
        this.reasoningHistoryClient = new modules_1.ReasoningHistoryClient(this.publicEventEmitter, this.internalEventEmitter);
      }
      decodeJwt(token) {
        try {
          const base64Payload = token.split(".")[1];
          const payloadString = buffer_1.Buffer.from(base64Payload, "base64").toString("utf8");
          const payload = JSON.parse(payloadString);
          return payload;
        } catch (error) {
          throw new Error("Invalid session token format");
        }
      }
      validateClientConfig(sessionToken, personaConfig, options) {
        var _a, _b;
        if (!sessionToken && !(options === null || options === void 0 ? void 0 : options.apiKey)) {
          return "Either sessionToken or apiKey must be provided";
        }
        if ((options === null || options === void 0 ? void 0 : options.apiKey) && sessionToken) {
          return "Only one of sessionToken or apiKey should be used";
        }
        const apiGatewayError = (0, validateApiGatewayConfig_1.validateApiGatewayConfig)((_a = options === null || options === void 0 ? void 0 : options.api) === null || _a === void 0 ? void 0 : _a.apiGateway);
        if (apiGatewayError) {
          return apiGatewayError;
        }
        if (sessionToken) {
          const decodedToken = this.decodeJwt(sessionToken);
          this.organizationId = decodedToken.accountId;
          (0, ClientMetrics_1.setMetricsContext)({
            organizationId: this.organizationId
          });
          const tokenType = (_b = decodedToken.type) === null || _b === void 0 ? void 0 : _b.toLowerCase();
          if (tokenType === "legacy") {
            return "Legacy session tokens are no longer supported. Please define your persona when creating your session token. See https://docs.anam.ai/resources/migrating-legacy for more information.";
          } else if (tokenType === "ephemeral" || tokenType === "stateful") {
            if (personaConfig) {
              return "This session token already contains a persona configuration. Please remove the personaConfig parameter.";
            }
          }
        } else {
          if (!personaConfig) {
            return "Missing persona config. Persona configuration must be provided when using apiKey";
          }
        }
        if (options === null || options === void 0 ? void 0 : options.voiceDetection) {
          if (options.disableInputAudio) {
            return "Voice detection is disabled because input audio is disabled. Please set disableInputAudio to false to enable voice detection.";
          }
          if (options.voiceDetection.endOfSpeechSensitivity !== void 0) {
            if (typeof options.voiceDetection.endOfSpeechSensitivity !== "number") {
              return "End of speech sensitivity must be a number";
            }
            if (options.voiceDetection.endOfSpeechSensitivity < 0 || options.voiceDetection.endOfSpeechSensitivity > 1) {
              return "End of speech sensitivity must be between 0 and 1";
            }
          }
        }
        return void 0;
      }
      buildStartSessionOptionsForClient() {
        var _a;
        const sessionOptions = {};
        if ((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.voiceDetection) {
          sessionOptions.voiceDetection = this.clientOptions.voiceDetection;
        }
        if (Object.keys(sessionOptions).length === 0) {
          return void 0;
        }
        return sessionOptions;
      }
      startSession(userProvidedAudioStream) {
        return __awaiter(this, void 0, void 0, function* () {
          var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
          const config = this.personaConfig;
          const sessionOptions = this.buildStartSessionOptionsForClient();
          const response = yield this.apiClient.startSession(config, sessionOptions);
          const { sessionId, clientConfig, engineHost, engineProtocol, signallingEndpoint } = response;
          const { heartbeatIntervalSeconds, maxWsReconnectionAttempts, iceServers: defaultIceServers } = clientConfig;
          this.sessionId = sessionId;
          this.toolCallManager.setActiveSession(sessionId);
          (0, ClientMetrics_1.setMetricsContext)({
            sessionId: this.sessionId
          });
          const iceServers = ((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.iceServers) ? this.clientOptions.iceServers : defaultIceServers;
          try {
            this.streamingClient = new modules_1.StreamingClient(sessionId, {
              engine: {
                baseUrl: `${engineProtocol}://${engineHost}`
              },
              signalling: {
                heartbeatIntervalSeconds,
                maxWsReconnectionAttempts,
                url: {
                  baseUrl: engineHost,
                  protocol: engineProtocol,
                  signallingPath: signallingEndpoint
                }
              },
              iceServers,
              inputAudio: {
                inputAudioState: this.inputAudioState,
                userProvidedMediaStream: ((_b = this.clientOptions) === null || _b === void 0 ? void 0 : _b.disableInputAudio) ? void 0 : userProvidedAudioStream,
                audioDeviceId: (_c = this.clientOptions) === null || _c === void 0 ? void 0 : _c.audioDeviceId,
                disableInputAudio: (_d = this.clientOptions) === null || _d === void 0 ? void 0 : _d.disableInputAudio
              },
              apiGateway: (_f = (_e = this.clientOptions) === null || _e === void 0 ? void 0 : _e.api) === null || _f === void 0 ? void 0 : _f.apiGateway,
              metrics: {
                showPeerConnectionStatsReport: (_j = (_h = (_g = this.clientOptions) === null || _g === void 0 ? void 0 : _g.metrics) === null || _h === void 0 ? void 0 : _h.showPeerConnectionStatsReport) !== null && _j !== void 0 ? _j : false,
                peerConnectionStatsReportOutputFormat: (_m = (_l = (_k = this.clientOptions) === null || _k === void 0 ? void 0 : _k.metrics) === null || _l === void 0 ? void 0 : _l.peerConnectionStatsReportOutputFormat) !== null && _m !== void 0 ? _m : "console"
              }
            }, this.publicEventEmitter, this.internalEventEmitter, this.toolCallManager);
          } catch (error) {
            this.toolCallManager.clearSessionState();
            (0, ClientMetrics_1.setMetricsContext)({
              sessionId: null
            });
            throw new ClientError_1.ClientError("Failed to initialize streaming client", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_SERVER_ERROR, 500, {
              cause: error instanceof Error ? error.message : String(error),
              sessionId
            });
          }
          return sessionId;
        });
      }
      startSessionIfNeeded(userProvidedAudioStream) {
        return __awaiter(this, void 0, void 0, function* () {
          if (!this.sessionId || !this.streamingClient) {
            yield this.startSession(userProvidedAudioStream);
            if (!this.sessionId || !this.streamingClient) {
              throw new ClientError_1.ClientError("Session ID or streaming client is not available after starting session", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_SERVER_ERROR, 500, {
                cause: "Failed to initialize session properly"
              });
            }
          }
        });
      }
      stream(userProvidedAudioStream) {
        return __awaiter(this, void 0, void 0, function* () {
          var _a;
          if (this._isStreaming) {
            throw new Error("Already streaming");
          }
          const attemptCorrelationId = (0, correlationId_1.generateCorrelationId)();
          (0, ClientMetrics_1.setMetricsContext)({
            attemptCorrelationId,
            sessionId: null
            // reset sessionId
          });
          (0, ClientMetrics_1.sendClientMetric)(ClientMetrics_1.ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_SESSION_ATTEMPT, "1");
          if (((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.disableInputAudio) && userProvidedAudioStream) {
            console.warn("AnamClient: Input audio is disabled. User-provided audio stream will be ignored.");
          }
          yield this.startSessionIfNeeded(userProvidedAudioStream);
          this._isStreaming = true;
          return new Promise((resolve) => {
            var _a2;
            const streams = [];
            let videoReceived = false;
            let audioReceived = false;
            this.publicEventEmitter.addListener(types_1.AnamEvent.VIDEO_STREAM_STARTED, (videoStream) => {
              streams.push(videoStream);
              videoReceived = true;
              if (audioReceived) {
                resolve(streams);
              }
            });
            this.publicEventEmitter.addListener(types_1.AnamEvent.AUDIO_STREAM_STARTED, (audioStream) => {
              streams.push(audioStream);
              audioReceived = true;
              if (videoReceived) {
                resolve(streams);
              }
            });
            (_a2 = this.streamingClient) === null || _a2 === void 0 ? void 0 : _a2.startConnection();
          });
        });
      }
      /**
       * @deprecated This method is deprecated. Please use streamToVideoElement instead.
       */
      streamToVideoAndAudioElements(videoElementId, audioElementId, userProvidedAudioStream) {
        return __awaiter(this, void 0, void 0, function* () {
          console.warn("AnamClient: streamToVideoAndAudioElements is deprecated. To avoid possible audio issues, please use streamToVideoElement instead.");
          yield this.streamToVideoElement(videoElementId, userProvidedAudioStream);
        });
      }
      streamToVideoElement(videoElementId, userProvidedAudioStream) {
        return __awaiter(this, void 0, void 0, function* () {
          var _a;
          const attemptCorrelationId = (0, correlationId_1.generateCorrelationId)();
          (0, ClientMetrics_1.setMetricsContext)({
            attemptCorrelationId,
            sessionId: null
            // reset sessionId
          });
          (0, ClientMetrics_1.sendClientMetric)(ClientMetrics_1.ClientMetricMeasurement.CLIENT_METRIC_MEASUREMENT_SESSION_ATTEMPT, "1");
          if (((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.disableInputAudio) && userProvidedAudioStream) {
            console.warn("AnamClient: Input audio is disabled. User-provided audio stream will be ignored.");
          }
          try {
            yield this.startSessionIfNeeded(userProvidedAudioStream);
          } catch (error) {
            if (error instanceof ClientError_1.ClientError) {
              throw error;
            }
            throw new ClientError_1.ClientError("Failed to start session", ClientError_1.ErrorCode.CLIENT_ERROR_CODE_SERVER_ERROR, 500, {
              cause: error instanceof Error ? error.message : String(error),
              sessionId: this.sessionId
            });
          }
          if (this._isStreaming) {
            throw new Error("Already streaming");
          }
          this._isStreaming = true;
          if (!this.streamingClient) {
            throw new Error("Failed to stream: streaming client is not available");
          }
          this.streamingClient.setMediaStreamTargetById(videoElementId);
          this.streamingClient.startConnection();
        });
      }
      /**
       * Send a talk command to make the persona speak the provided content.
       * @param content - The text content for the persona to speak
       * @throws Error if session is not started or not currently streaming
       */
      talk(content) {
        return __awaiter(this, void 0, void 0, function* () {
          if (!this.streamingClient) {
            throw new Error("Failed to send talk command: session is not started. Have you called startSession?");
          }
          if (!this._isStreaming) {
            throw new Error("Failed to send talk command: not currently streaming. Have you called stream?");
          }
          yield this.streamingClient.sendTalkCommand(content);
          return;
        });
      }
      /**
       * Send a raw data message through the WebRTC data channel.
       * @param message - The message string to send through the data channel
       * @throws Error if session is not started
       */
      sendDataMessage(message) {
        if (this.streamingClient) {
          this.streamingClient.sendDataMessage(message);
        } else {
          throw new Error("Failed to send message: session is not started.");
        }
      }
      /**
       * Send a user text message in the active streaming session.
       * @param content - The text message content to send
       * @throws Error if not currently streaming or session is not started
       */
      sendUserMessage(content) {
        if (!this._isStreaming) {
          console.warn("AnamClient: Not currently streaming. User message will not be sent.");
          throw new Error("Failed to send user message: not currently streaming");
        }
        const sessionId = this.getActiveSessionId();
        if (!sessionId) {
          throw new Error("Failed to send user message: no active session");
        }
        const currentTimestamp = (/* @__PURE__ */ new Date()).toISOString().replace("Z", "");
        const body = JSON.stringify({
          content,
          timestamp: currentTimestamp,
          session_id: sessionId,
          message_type: "speech"
        });
        this.sendDataMessage(body);
      }
      interruptPersona() {
        if (!this._isStreaming) {
          throw new Error("Failed to send interrupt command: not currently streaming");
        }
        const sessionId = this.getActiveSessionId();
        if (!sessionId) {
          throw new Error("Failed to send interrupt command: no active session");
        }
        const body = JSON.stringify({
          message_type: "interrupt",
          session_id: sessionId,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
          // Removing the trailing Z is unnecessary.
        });
        this.sendDataMessage(body);
      }
      /**
       * Add context information to the active streaming session.
       * This allows injecting additional context (e.g., DOM state, user actions)
       * that the persona can use to inform its responses.
       * @param content - The context content string to send
       * @throws Error if not currently streaming or no active session
       */
      addContext(content) {
        if (!this._isStreaming) {
          throw new Error("Failed to add context: not currently streaming");
        }
        const sessionId = this.getActiveSessionId();
        if (!sessionId) {
          throw new Error("Failed to add context: no active session");
        }
        const body = JSON.stringify({
          message_type: "context",
          session_id: sessionId,
          content
        });
        this.sendDataMessage(body);
      }
      stopStreaming() {
        return __awaiter(this, void 0, void 0, function* () {
          if (this.streamingClient) {
            this.publicEventEmitter.emit(types_1.AnamEvent.CONNECTION_CLOSED, types_1.ConnectionClosedCode.NORMAL);
            this.toolCallManager.clearSessionState();
            yield this.streamingClient.stopConnection();
            this.streamingClient = null;
            this.sessionId = null;
            (0, ClientMetrics_1.setMetricsContext)({
              attemptCorrelationId: null,
              sessionId: null,
              organizationId: this.organizationId
            });
            this._isStreaming = false;
          }
        });
      }
      isStreaming() {
        return this._isStreaming;
      }
      setPersonaConfig(personaConfig) {
        this.personaConfig = personaConfig;
      }
      getPersonaConfig() {
        return this.personaConfig;
      }
      getInputAudioState() {
        var _a;
        if ((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.disableInputAudio) {
          console.warn("AnamClient: Audio state will not be used because input audio is disabled.");
        }
        if (this.streamingClient) {
          this.inputAudioState = this.streamingClient.getInputAudioState();
        }
        return this.inputAudioState;
      }
      muteInputAudio() {
        var _a, _b;
        if ((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.disableInputAudio) {
          console.warn("AnamClient: Input audio is disabled. Muting input audio will have no effect.");
        }
        if (this.streamingClient && !((_b = this.clientOptions) === null || _b === void 0 ? void 0 : _b.disableInputAudio)) {
          this.inputAudioState = this.streamingClient.muteInputAudio();
        } else {
          this.inputAudioState = Object.assign(Object.assign({}, this.inputAudioState), { isMuted: true });
        }
        return this.inputAudioState;
      }
      unmuteInputAudio() {
        var _a, _b;
        if ((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.disableInputAudio) {
          console.warn("AnamClient: Input audio is disabled. Unmuting input audio will have no effect.");
        }
        if (this.streamingClient && !((_b = this.clientOptions) === null || _b === void 0 ? void 0 : _b.disableInputAudio)) {
          this.inputAudioState = this.streamingClient.unmuteInputAudio();
        } else {
          this.inputAudioState = Object.assign(Object.assign({}, this.inputAudioState), { isMuted: false });
        }
        return this.inputAudioState;
      }
      changeAudioInputDevice(deviceId) {
        return __awaiter(this, void 0, void 0, function* () {
          var _a;
          if ((_a = this.clientOptions) === null || _a === void 0 ? void 0 : _a.disableInputAudio) {
            throw new Error("AnamClient: Cannot change audio input device because input audio is disabled.");
          }
          if (!this._isStreaming) {
            throw new Error("AnamClient: Cannot change audio input device while not streaming. Start streaming first.");
          }
          if (!this.streamingClient) {
            throw new Error("AnamClient: Cannot change audio input device because streaming client is not available. Start streaming first.");
          }
          yield this.streamingClient.changeAudioInputDevice(deviceId);
        });
      }
      createTalkMessageStream(correlationId) {
        if (!this.streamingClient) {
          throw new Error("Failed to start talk message stream: session is not started.");
        }
        if (correlationId && correlationId.trim() === "") {
          throw new Error("Failed to start talk message stream: correlationId is empty");
        }
        return this.streamingClient.startTalkMessageStream(correlationId);
      }
      createAgentAudioInputStream(config) {
        if (!this.streamingClient) {
          throw new Error("Failed to create agent audio input stream: session is not started.");
        }
        return this.streamingClient.createAgentAudioInputStream(config);
      }
      /**
       * Event handling
       */
      addListener(event, callback) {
        this.publicEventEmitter.addListener(event, callback);
      }
      removeListener(event, callback) {
        this.publicEventEmitter.removeListener(event, callback);
      }
      getActiveSessionId() {
        return this.sessionId;
      }
      registerToolCallHandler(toolName, handler) {
        return this.toolCallManager.registerHandler(toolName, handler);
      }
    };
    exports2.default = AnamClient;
  }
});

// ../../../../../node_modules/@anam-ai/js-sdk/dist/main/index.js
var require_main = __commonJS({
  "../../../../../node_modules/@anam-ai/js-sdk/dist/main/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ErrorCode = exports2.ClientError = exports2.unsafe_createClientWithApiKey = exports2.createClient = void 0;
    var AnamClient_1 = __importDefault(require_AnamClient());
    var ClientError_1 = require_ClientError();
    Object.defineProperty(exports2, "ClientError", { enumerable: true, get: function() {
      return ClientError_1.ClientError;
    } });
    Object.defineProperty(exports2, "ErrorCode", { enumerable: true, get: function() {
      return ClientError_1.ErrorCode;
    } });
    var createClient2 = (sessionToken, options) => {
      return new AnamClient_1.default(sessionToken, void 0, options);
    };
    exports2.createClient = createClient2;
    var unsafe_createClientWithApiKey = (apiKey, personaConfig, options) => {
      return new AnamClient_1.default(void 0, personaConfig, Object.assign(Object.assign({}, options), { apiKey }));
    };
    exports2.unsafe_createClientWithApiKey = unsafe_createClientWithApiKey;
    __exportStar(require_types(), exports2);
  }
});

// ../../../../utils/anamGreeting.js
function getStoredUserDisplayName() {
  try {
    const u = JSON.parse(localStorage.getItem("impetus_user") || "{}");
    return String(u?.name || u?.full_name || u?.nome || u?.display_name || "").trim();
  } catch {
    return "";
  }
}
function getStoredUserFirstName() {
  const full = getStoredUserDisplayName();
  if (full) return full.split(/\s+/)[0] || "";
  try {
    const u = JSON.parse(localStorage.getItem("impetus_user") || "{}");
    const email = String(u?.email || "").trim();
    if (email.includes("@")) return email.split("@")[0];
  } catch (_) {
  }
  return "";
}
function getTimePeriod(localHour = (/* @__PURE__ */ new Date()).getHours()) {
  const h = Number(localHour);
  if (h >= 5 && h < 12) return "manha";
  if (h >= 12 && h < 18) return "tarde";
  return "noite";
}
function getTimeOfDayGreeting(localHour = (/* @__PURE__ */ new Date()).getHours()) {
  const period = getTimePeriod(localHour);
  if (period === "manha") return "Bom dia";
  if (period === "tarde") return "Boa tarde";
  return "Boa noite";
}
function buildAnamOpeningLine(opts = {}) {
  const hour = opts.localHour ?? (/* @__PURE__ */ new Date()).getHours();
  const greeting = getTimeOfDayGreeting(hour);
  const firstName = String(opts.userFirstName ?? getStoredUserFirstName()).trim();
  if (firstName) {
    return `${greeting}, ${firstName}. Como posso ajudar?`;
  }
  return `${greeting}. Como posso ajudar?`;
}
function getAnamSessionContextPayload() {
  const userDisplayName = getStoredUserDisplayName() || getStoredUserFirstName();
  let timezone = "America/Sao_Paulo";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
  } catch (_) {
  }
  return {
    userDisplayName,
    localHour: (/* @__PURE__ */ new Date()).getHours(),
    timezone
  };
}
var init_anamGreeting = __esm({
  "../../../../utils/anamGreeting.js"() {
  }
});

// ../../../../voice/voiceVisualPanelService.js
function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function inferVoiceVisualIntent(text) {
  const t = norm(text);
  if (t.length < 4) return null;
  if (/\b(limpar|esvaziar|tirar (o )?grafico|tirar (o )?gráfico|fechar (o )?painel)\b/.test(t)) return "clear";
  if (/\b(chat|conversa|mensagem|mandou|mandei|inbox|nao\s+lida|não\s+lida)\b/.test(t) && /\b(resumo|cite|citar|o\s+que|nova|novas|ultima|última|painel|gera|gere|mostra|tem|ha|há|conversa|mensagem|ela|ele)\b/.test(
    t
  )) {
    return "chat_thread";
  }
  if (/\b(painel completo|tudo no painel|mostra tudo|mostrar tudo|visao geral|visão geral|dashboard completo|o que acontece|situacao|situação)\b/.test(t))
    return "full_panel";
  if (/\b(relatorios?|sumarios?|sumários?|resumo executivo)\b/.test(t) || /\b(exportar|excel|planilha|pdf|imprimir|emitir|elaborar|baixar|download|docx|xlsx|csv)\b/.test(t) || /\b(gera|gerar|gere|gerem|cria|crie|criar|monta|monte|faca|faça|faz|fazer|emite|emitir|manda|mande|envia|envie)\b/.test(t) || /\b(quero|preciso)\b/.test(t)) {
    if (/\b(relatorios?|sumarios?|sumários?|pdf|excel|planilha|export|documento|arquivo|ficheiro|download|csv|xlsx|docx)\b/.test(t)) {
      return "export_pack";
    }
  }
  if (/\b(grafico|gráfico|chart|diagrama|tendencia|tendência|evolucao|evolução|linha temporal|historico|histórico)\b/.test(t))
    return "trend";
  if (/\b(manutencao|manutenção|ordem de servico|ordem de serviço|\bos\b|maquinas|máquinas|equipamento)\b/.test(t))
    return "maintenance";
  if (/\b(cerebro|cérebro|inteligencia operacional|operacional brain|brain)\b/.test(t)) return "operational_brain";
  if (/\b(indicador|kpi|kpis|painel|numeros|números|metricas|métricas)\b/.test(t)) return "summary_bar";
  if (/\b(mostra|exibe|gera|gere|cria|crie)\b/.test(t) && t.length >= 6) return "summary_bar";
  if (/\b(mostrar|exibir)\b/.test(t) && t.length > 14 && /\b(painel|dashboard|grafico|gráfico|kpi|indicador|metricas|métricas|dados|relatorio|relatório|numeros|números)\b/.test(t)) {
    return "summary_bar";
  }
  if (/\b(quero ver|preciso ver)\b/.test(t) && /\b(painel|dashboard|grafico|gráfico|dados|kpi|indicadores)\b/.test(t)) {
    return "summary_bar";
  }
  if (/\b(politica|política|procedimento|norma|documento da empresa)\b/.test(t))
    return "policy_hint";
  if (t.length >= 18 && /\b(quero|preciso)\b/.test(t) && /\b(painel|dashboard|grafico|gráfico|relatorio|relatório|kpi|indicador|metricas|métricas|exportar|planilha|pdf)\b/.test(t)) {
    return "full_panel";
  }
  return null;
}
var init_voiceVisualPanelService = __esm({
  "../../../../voice/voiceVisualPanelService.js"() {
    init_api();
  }
});

// ../../../../utils/anamPanelGovernance.js
function norm2(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function hasVisualTopic(userText, assistantText) {
  const blob = `${norm2(userText)} ${norm2(assistantText)}`;
  if (inferVoiceVisualIntent(userText) || inferVoiceVisualIntent(assistantText)) return true;
  return /\b(painel|grafico|gráfico|kpi|relatorio|relatório|dashboard|export|pdf|excel|indicador|metrica|métrica|linha\s+[a-z0-9])\b/.test(
    blob
  );
}
function isAnamPanelCommitPhrase(assistantText, userText = "") {
  const raw = String(assistantText || "").trim();
  const a = norm2(raw);
  if (a.length < 12) return false;
  if (!hasVisualTopic(userText, assistantText)) return false;
  if (raw.endsWith("?")) return false;
  const isQuestion = /\b(quer|gostaria|prefere|qual\s|quando\s|como\s|posso preparar|devo\s|confirma|confirme|deseja|precisa de|me diz|me diga)\b/.test(
    a
  );
  const hasCommitVerb = /\b(gerando|montando|preparando|exibindo|a gerar|a montar|a preparar|vou gerar|vou montar|vou mostrar|vou exibir|vou preparar|vou criar|vou colocar|ja vou|já vou|irei gerar|irei montar)\b/.test(
    a
  );
  if (isQuestion && !hasCommitVerb) return false;
  const commitPatterns = [
    /\b(gerando|montando|preparando|exibindo)\b/,
    /\b(vou|ja vou|já vou|irei)\s+(gerar|montar|mostrar|exibir|preparar|criar|colocar)\b/,
    /\b(tudo bem|ok|certo|perfeito|pronto),?\s+(vou\s+)?(gerar|montar|mostrar|exibir|preparar)\b/,
    /\bno painel\b/,
    /\b(esta|está)\s+(sendo\s+)?(gerad|montad|preparad|exibid)/,
    /\b(enviei|mandei)\s+(para\s+)?o painel\b/
  ];
  return commitPatterns.some((re) => re.test(a));
}
function buildAnamPanelCommand(userText, assistantText, recentTurns = []) {
  const lines = [];
  const turns = Array.isArray(recentTurns) ? recentTurns.slice(-6) : [];
  if (turns.length) {
    lines.push(
      "Conversa acordada (Anam + utilizador):",
      ...turns.map((t) => `- ${t.role === "user" ? "Utilizador" : "Anam"}: ${String(t.text || "").trim()}`)
    );
  }
  const u = String(userText || "").trim();
  const a = String(assistantText || "").trim();
  if (u) lines.push(`Pedido final do utilizador: ${u}`);
  if (a) lines.push(`Instru\xE7\xE3o de execu\xE7\xE3o no painel (confirmada pela Anam): ${a}`);
  lines.push(
    "Monte no painel direito apenas o que foi acordado acima. Use dados reais IMPETUS quando existirem."
  );
  return lines.join("\n").slice(0, 3800);
}
var init_anamPanelGovernance = __esm({
  "../../../../utils/anamPanelGovernance.js"() {
    init_voiceVisualPanelService();
  }
});

// ../../../../features/smartPanel/panelMetaIntent.js
function norm3(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
function isHowToQuestion(text) {
  const n = norm3(text);
  if (!/\b(como|onde|qual\s+menu|passo\s+a\s+passo|tutorial|ensina|explica)\b/.test(n)) {
    return false;
  }
  if (/\b(quero|preciso|pode|podia|seria|faz|fac|manda|envia|imprime|imprimir|baixa|gera|tira|d[aá])\b/.test(n)) {
    return false;
  }
  return true;
}
function hasPanelContext(n) {
  return /\b(painel|relatorio|resumo|grafico|isso|isto|aquilo|resultado|dados|conteudo|documento|tabela|kpi|o\s+que\s+(?:gerou|mostrou|criou|montou)|que\s+(?:gerou|mostrou)|agora|aqui)\b/.test(
    n
  );
}
function isShortRequest(len) {
  return len <= 100;
}
function inferConversationalPanelMeta(stripped) {
  const raw = String(stripped || "").trim();
  if (!raw || raw.length > 240) return null;
  if (isHowToQuestion(raw)) return null;
  const n = norm3(raw);
  const panelCtx = hasPanelContext(n);
  const short = isShortRequest(raw.length);
  const printFamily = /\b(imprim\w*|impress\w*|print\w*|impressora|copia\s+em\s+papel|folha\s+impressa|versao\s+impressa|tirar\s+(?:uma\s+)?copia|copia\s+disso|em\s+papel|mandar\s+pra\s+impressora|na\s+impressora)\b/.test(
    n
  );
  const printRequest = printFamily && (panelCtx || short || /\b(para\s+mim|pra\s+mim|por\s+favor|agora|ja|isso|isto)\b/.test(n) || /^(?:pode|podia|quero|preciso|seria|d[aá]|me\s+ajuda|voc[eê]\s+pode|vc\s+pode|consegue)/.test(n));
  if (printRequest && !/\b(nao\s+imprim|sem\s+imprim|deixa\s+de\s+imprim)\b/.test(n)) {
    return { kind: "print" };
  }
  if (/\b(copia|reproduz)\b/.test(n) && panelCtx && !/\b(email|whatsapp|pdf)\b/.test(n)) {
    return { kind: "print" };
  }
  const explicitPdfExport = /\b(baix|descarreg|export|download|salv|imprim)\w*\b/.test(n) || /\b(?:quero|preciso|pode|seria)\s+(?:o\s+)?pdf\b/.test(n) || /^pdf\b/.test(n);
  if (/\bpdf\b/.test(n) && explicitPdfExport && (panelCtx || /\b(baix|descarreg|export|salv|imprim|quero|preciso)\b/.test(n))) {
    return { kind: "pdf" };
  }
  if (/\b(baixar|baixa|descarregar|descarrega|download|salvar|exportar|guardar|pegar)\w*\b/.test(n) && panelCtx && !/\b(excel|planilha|xlsx|imprim)\b/.test(n)) {
    return { kind: "pdf" };
  }
  if (/\b(quero|preciso|pode|seria)\s+(?:o\s+)?(?:arquivo|ficheiro|documento)\b/.test(n) && panelCtx) {
    return { kind: "pdf" };
  }
  if (/\b(excel|planilha|xlsx|spreadsheet)\b/.test(n) && (panelCtx || short || /\b(baix|export|gera|quero|preciso|pode|seria)\b/.test(n))) {
    return { kind: "excel" };
  }
  return inferConversationalChatMeta(raw, n, panelCtx, short);
}
function inferConversationalChatMeta(raw, n, panelCtx, short) {
  const sendVerb = /\b(enviar|envia|envie|mandar|manda|mande|passar|passa|repassar|encaminhar|encaminha|disparar|dispara)\w*\b/.test(
    n
  );
  if (!sendVerb) return null;
  if (/\b(email|e-mail|whatsapp|telegram|sms)\b/.test(n)) return null;
  const chatCtx = /\b(chat|mensagem|impetus|interno|conversa|contacto|colega)\b/.test(n) || panelCtx || short;
  if (!chatCtx && raw.length > 80) return null;
  const groupM = raw.match(/\b(?:para|pr[oó]|pro)\s+(?:o|a)\s+grupo\s+([^.,!?]+)/i);
  if (groupM) {
    const gname = groupM[1].trim();
    if (gname.length >= 2) {
      return { kind: "chat", userQueries: [], groupQuery: gname, roleQueries: [] };
    }
  }
  const pluralM = raw.match(/\b(?:para|pr[oó]|pro)\s+(?:os|as)\s+([^.,!?]+)/i);
  if (pluralM) {
    const label = pluralM[1].trim().replace(/\s+no\s+chat.*$/i, "");
    if (label.length >= 3) {
      return { kind: "chat", userQueries: [], groupQuery: label, roleQueries: [label] };
    }
  }
  const paraM = raw.match(
    /\b(?:para|pr[oó]|pro)\s+(?:o|a|os|as)?\s*([^.,!?]+?)(?:\s+no\s+chat|\s+no\s+impetus|\s+pelo\s+chat|[,.]|$)/i
  );
  if (paraM) {
    let name = paraM[1].trim();
    name = name.replace(/^(?:o|a|os|as)\s+/i, "").trim();
    if (name.length >= 2 && !/^(?:revis[aã]o|produ[cç][aã]o|sistema|isso|isto|aquilo|mim|si)$/i.test(name)) {
      return { kind: "chat", userQueries: [name], groupQuery: null, roleQueries: [] };
    }
  }
  if (/\b(?:isso|isto|painel|relat[oó]rio)\b/.test(n) && sendVerb && (panelCtx || short)) {
    const lastPara = raw.match(/\bpara\s+(.+)$/i);
    if (lastPara) {
      const name = lastPara[1].replace(/\s+no\s+chat.*$/i, "").trim();
      if (name.length >= 2) {
        return { kind: "chat", userQueries: [name.replace(/^(?:o|a)\s+/i, "")], groupQuery: null, roleQueries: [] };
      }
    }
  }
  return null;
}
var init_panelMetaIntent = __esm({
  "../../../../features/smartPanel/panelMetaIntent.js"() {
  }
});

// ../../../../features/smartPanel/panelVoiceMetaCommands.js
function norm4(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function stripCourtesyPrefixes(text) {
  let t = String(text || "").trim();
  for (let i = 0; i < 8; i++) {
    const next = t.replace(/^(?:ol[áa]|oi|ei)[,.\s-]+/i, "").replace(/^(?:por\s+favor\s+e\s+)?por\s+gentileza[,.\s]+/i, "").replace(/^por\s+favor[,.\s]+/i, "").replace(/^favor[,.\s]+/i, "").replace(/^(?:ei\s+)?ia[,.\s-]+/i, "").replace(/^por\s+favor\s+ia[,.\s-]*/i, "").trim();
    if (next === t) break;
    t = next;
  }
  return t.trim();
}
function stripCourtesySuffixes(text) {
  let t = String(text || "").trim();
  for (let i = 0; i < 8; i++) {
    const next = t.replace(/[,.\s]+(?:por\s+favor|por\s+gentileza|obrigad[oa]|valeu|brigad[oa])\s*$/i, "").replace(/\s+(?:por\s+favor|por\s+gentileza|obrigad[oa]|valeu|brigad[oa])\s*$/i, "").replace(/[.!?…]+\s*$/g, "").trim();
    if (next === t) break;
    t = next;
  }
  return t.trim();
}
function looksLikeImplicitChatCommand(rawTrim) {
  const t = String(rawTrim || "").trim();
  const afterCourtesy = t.replace(/^(?:por\s+favor|por\s+gentileza)\s+/i, "").trim();
  const afterSubject = afterCourtesy.replace(/^(?:eu|n[oó]s)\s+/i, "").trim();
  const lead = new RegExp(
    `^(?:${SEND_VERB_RE}|(?:quero|preciso)\\s+${SEND_VERB_RE})\\b`,
    "i"
  );
  return lead.test(afterCourtesy) || lead.test(afterSubject);
}
function chatTargetsSanity(chat) {
  if (!chat) return false;
  if (chat.groupQuery && String(chat.groupQuery).trim().length >= 2) return true;
  if ((chat.roleQueries || []).some((q) => String(q).trim().length >= 3)) return true;
  const uq = chat.userQueries || [];
  if (!uq.length) return false;
  return uq.some((q) => !WORKFLOW_RECIPIENT_BLOCK.test(norm4(String(q).trim())));
}
function stripRecipientTail(frag) {
  return String(frag || "").trim().replace(/\s+(?:do|da|no|na)\s+(?:painel|relat[oó]rio|chat|impetus).*$/i, "").replace(/\s+do\s+que\s+(?:gerou|geraste|mostrou|mostraste).*$/i, "").replace(/\s+no\s+chat\s*$/i, "").trim();
}
function parseRecipientFragment(frag) {
  let f = stripRecipientTail(frag);
  f = f.replace(/^(?:esse|este)\s+(?:painel|relat[oó]rio|resumo)\s+/i, "").trim();
  f = f.replace(/^(?:o|a)\s+(?:painel|relat[oó]rio|resumo)\s+para\s+/i, "").trim();
  if (/^grupo\s+/i.test(f)) {
    const g = f.replace(/^grupo\s+/i, "").trim();
    if (g.length >= 2) return { userQueries: [], groupQuery: g, roleQueries: [] };
  }
  const plural = f.match(/^(?:os|as)\s+(.+)$/i);
  if (plural) {
    const label = stripRecipientTail(plural[1]);
    if (label.length >= 3) {
      return { userQueries: [], groupQuery: label, roleQueries: [label] };
    }
  }
  if (/^todos\s+(?:os|as)\s+/i.test(f)) {
    const label = f.replace(/^todos\s+(?:os|as)\s+/i, "").trim();
    if (label.length >= 3) {
      return { userQueries: [], groupQuery: label, roleQueries: [label] };
    }
  }
  if (COLLECTIVE_ROLE_RE.test(norm4(f)) && f.length <= 40) {
    return { userQueries: [], groupQuery: f, roleQueries: [f] };
  }
  let namesFrag = f.replace(/^(?:o|a|os|as)\s+/i, "").trim();
  const userQueries = splitRecipientList(namesFrag);
  return { userQueries, groupQuery: null, roleQueries: [] };
}
function parseSendPanelToTargets(stripped) {
  if (!new RegExp(`\\b${SEND_VERB_RE}\\b`).test(norm4(stripped))) return null;
  const patterns = [
    new RegExp(
      `\\b${SEND_VERB_RE}\\s+(?:isso|isto|aquilo|o\\s+painel|este\\s+painel|esse\\s+painel|o\\s+relat[o\xF3]rio|o\\s+resumo|tudo)\\s+(?:para|pr[oa])\\s+(.+)`,
      "i"
    ),
    new RegExp(
      `\\b${SEND_VERB_RE}\\s+(?:para|pr[oa])\\s+(.+?)\\s+(?:isso|isto|aquilo|o\\s+painel|este\\s+painel|esse\\s+painel|tudo)\\b`,
      "i"
    ),
    new RegExp(
      `\\b(?:quero|preciso)\\s+${SEND_VERB_RE}\\s+(?:isso|isto|o\\s+painel)?\\s*(?:para|pr[oa])\\s+(.+)`,
      "i"
    )
  ];
  for (const re of patterns) {
    const m = stripped.match(re);
    if (!m) continue;
    const targets = parseRecipientFragment(m[1]);
    if (chatTargetsSanity(targets)) {
      return { kind: "chat", ...targets };
    }
  }
  return null;
}
function splitRecipientList(frag) {
  let f = String(frag || "").trim();
  f = f.replace(/^(?:esse|este|o|a)\s+(?:painel|relat[oó]rio|resumo)\s+/i, "").trim();
  f = f.replace(/^(?:o|a|os|as)\s+/i, "").trim();
  f = f.replace(/^(?:contatos?|contactos?)\s+de\s+/i, "").trim();
  f = f.replace(/^(?:as\s+)?pessoas?\s+/i, "").trim();
  if (!f || f.length < 2) return [];
  const chunks = f.split(/\s*,\s*/);
  const names = [];
  for (const chunk of chunks) {
    for (const part of chunk.split(/\s+e\s+/i)) {
      const name = part.trim().replace(/^(?:o|a|os|as)\s+/i, "").trim();
      if (name.length >= 2 && !/^(?:relat|painel|resumo|isto|isso)\b/i.test(name)) names.push(name);
    }
  }
  return names;
}
function parseChatTargets(t) {
  const rawTrim = String(t || "").trim();
  const n = norm4(rawTrim);
  if (!new RegExp(`\\b${SEND_VERB_RE}\\b`).test(n)) return null;
  const hasChatCtx = /\bno\s+chat\b/.test(n) || /\bchat\s+interno\b/.test(n) || /\bchat\s+impetus\b/.test(n) || /\bimpetus\s+chat\b/.test(n) || /\bno\s+impetus\b/.test(n);
  const groupRe = new RegExp(
    `\\b(?:para|pr[oa]|no|ao)\\s+(?:o\\s+|a\\s+)?grupo\\s+(.+?)(?:\\s+no\\s+chat|\\s+no\\s+impetus|\\s+do\\s+chat|\\.?\\s*$)`,
    "i"
  );
  const gm = rawTrim.match(groupRe);
  if (gm) {
    let gname = gm[1].trim().replace(/\s+no\s+(?:chat|impetus).*$/i, "").trim();
    gname = gname.replace(/^(?:o|a)\s+/i, "").trim();
    if (gname.length >= 2) return { userQueries: [], groupQuery: gname };
  }
  const directNoChatPara = rawTrim.match(
    new RegExp(
      `\\b${SEND_VERB_RE}\\s+no\\s+chat(?:\\s+interno)?\\s+para\\s+(.+?)\\s*$`,
      "i"
    )
  );
  if (directNoChatPara) {
    let frag2 = directNoChatPara[1].trim();
    if (/^grupo\s+/i.test(frag2)) {
      const rest = frag2.replace(/^grupo\s+/i, "").trim();
      if (rest.length >= 2) return { userQueries: [], groupQuery: rest };
    }
    const targets2 = parseRecipientFragment(frag2);
    if (chatTargetsSanity(targets2)) return targets2;
  }
  const directImpPara = rawTrim.match(
    new RegExp(`\\b${SEND_VERB_RE}\\s+no\\s+impetus\\s+para\\s+(.+?)\\s*$`, "i")
  );
  if (directImpPara) {
    let frag2 = directImpPara[1].trim();
    if (/^grupo\s+/i.test(frag2)) {
      const rest = frag2.replace(/^grupo\s+/i, "").trim();
      if (rest.length >= 2) return { userQueries: [], groupQuery: rest };
    }
    const targetsImp = parseRecipientFragment(frag2);
    if (chatTargetsSanity(targetsImp)) return targetsImp;
  }
  let cut = rawTrim.search(/\s+no\s+chat\s+interno\b/i);
  if (cut === -1) cut = rawTrim.search(/\s+no\s+chat\b/i);
  if (cut === -1) {
    const ni = rawTrim.search(/\s+no\s+impetus/i);
    if (ni !== -1) cut = ni;
  }
  if (cut === -1) {
    const m1 = rawTrim.match(/\bchat\s+impetus\b/i);
    if (m1 && m1.index != null) cut = m1.index;
  }
  if (cut === -1) {
    const m2 = rawTrim.match(/\bimpetus\s+chat\b/i);
    if (m2 && m2.index != null) cut = m2.index;
  }
  let before;
  if (cut !== -1) {
    before = rawTrim.slice(0, cut).trim();
    let tail = rawTrim.slice(cut).trim();
    tail = tail.replace(/^no\s+chat(?:\s+interno)?\b/i, "").trim();
    tail = tail.replace(/^no\s+impetus\b/i, "").trim();
    tail = tail.replace(/^chat\s+impetus\b/i, "").trim();
    tail = tail.replace(/^impetus\s+chat\b/i, "").trim();
    const tailPara = tail.match(/^para\s+(.+)/i);
    if (tailPara) {
      let frag2 = tailPara[1].trim();
      if (/^grupo\s+/i.test(frag2)) {
        const rest = frag2.replace(/^grupo\s+/i, "").trim();
        if (rest.length >= 2) return { userQueries: [], groupQuery: rest.replace(/\s+no\s+chat.*$/i, "").trim() };
      }
      const tailTargets = parseRecipientFragment(frag2);
      if (chatTargetsSanity(tailTargets)) return tailTargets;
    }
  } else if (hasChatCtx) {
    return null;
  } else {
    if (rawTrim.length > 130) return null;
    if (!/\bpara\b/.test(n)) return null;
    if (/\b(email|e-mail|whatsapp|telegram|sms)\b/.test(n)) return null;
    const isPanelSend = /\b(isso|isto|aquilo|painel|relat[oó]rio|resumo)\b/i.test(n) && new RegExp(`\\b${SEND_VERB_RE}\\b`).test(n);
    const blockedImplicit = !isPanelSend && /\b(mostrar|mostra|exibir|exibe|gr[aá]fico|quero\s+ver|dados\s+de|gere|gera|crie|cria|fa[çc]a|faz|monte|monta|explique|analise|analisa)\b/i.test(
      n
    );
    if (blockedImplicit) return null;
    if (!looksLikeImplicitChatCommand(rawTrim)) return null;
    if (rawTrim.length > (isPanelSend ? 180 : 130)) return null;
    before = rawTrim;
  }
  const paraRe = /\bpara\b/gi;
  let lastIdx = -1;
  let m;
  while ((m = paraRe.exec(before)) !== null) lastIdx = m.index;
  if (lastIdx === -1) return null;
  let frag = before.slice(lastIdx).replace(/^\s*para\s+/i, "").trim();
  const targets = parseRecipientFragment(frag);
  if (!chatTargetsSanity(targets)) return null;
  return targets;
}
function parseShareIntent(stripped) {
  const sn = String(stripped || "").trim().replace(/[.!?…]+$/g, "").trim();
  const n = norm4(sn);
  if (!sn || sn.length > 88) return null;
  if (new RegExp(`\\b${SEND_VERB_RE}\\s+para\\s+`, "i").test(sn)) return null;
  const looksConversational = /\b(como|quando|onde|por\s+que|porque|qual|quais|o\s+que|que\s|sera|será|pode\s|podia|d[aá]\s+para|explica|mostra|quero\s+saber|devo|deveria|achas|acha|n[aã]o\s+sei|seria\s+poss|gostaria|d[uú]vida)\b/i.test(
    n
  );
  if (looksConversational && sn.length > 28) return null;
  const shortPartilhar = /^(?:por\s+favor\s+|por\s+gentileza\s+)?(?:ia\s+)?(partilhar|partilha|compartilhar|compartilha)(\s+(?:isso|isto|o\s+painel|este\s+painel|esse\s+painel|o\s+relat[oó]rio|o\s+resumo|agora|tudo|aqui))?$/i.test(
    sn
  );
  const shortShareEn = /^(?:por\s+favor\s+|por\s+gentileza\s+)?(?:ia\s+)?share(\s+(?:this|it|the\s+panel|now))?$/i.test(sn);
  if (shortPartilhar || shortShareEn) return { kind: "share" };
  if (/\bcopiar\b/i.test(sn) && /\b(isso|isto|painel|relat|resumo|tudo|conte[uú]do)\b/i.test(n) && sn.length <= 72 && (!looksConversational || sn.length <= 22)) {
    return { kind: "share" };
  }
  const sendNoChatBare = new RegExp(
    `\\b${SEND_VERB_RE}\\s+no\\s+chat\\s*$`,
    "i"
  );
  const sendAoChatBare = new RegExp(`\\b${SEND_VERB_RE}\\s+ao\\s+chat\\s*$`, "i");
  const sendProChat = new RegExp(
    `\\b${SEND_VERB_RE}\\s+(?:pro|pr[o\xF3])\\s+chat\\s*$`,
    "i"
  );
  if (sendNoChatBare.test(sn) || sendAoChatBare.test(sn) || sendProChat.test(sn)) {
    return { kind: "share" };
  }
  const sendObjNoChat = new RegExp(
    `^${SEND_VERB_RE}(\\s+(?:isso|isto|isso\\s+a[i\xED]|aquilo|o\\s+painel|agora|o\\s+relat[o\xF3]rio|este\\s+painel|esse\\s+painel|tudo|o\\s+resumo))?\\s+no\\s+chat\\s*$`,
    "i"
  );
  if (sendObjNoChat.test(sn)) return { kind: "share" };
  if (new RegExp(
    `^${SEND_VERB_RE}(\\s+(?:isso|isto|o\\s+painel|agora|o\\s+relat[o\xF3]rio|este\\s+painel|esse\\s+painel|tudo|o\\s+resumo))?\\s*$`,
    "i"
  ).test(sn)) {
    return { kind: "share" };
  }
  return null;
}
function softenPrintTail(soft) {
  let s = String(soft || "").trim();
  for (let j = 0; j < 6; j++) {
    const next = s.replace(/\s+para\s+mim\s*$/i, "").replace(/\s+pra\s+mim\s*$/i, "").replace(/\s+para\s+si\s*$/i, "").replace(/\s+para\s+voc[eê]\s*$/i, "").replace(/\s+me\s*$/i, "").trim();
    if (next === s) break;
    s = next;
  }
  return s;
}
function normalizeHyphenImperatives(s) {
  return String(s || "").replace(/\bimprima-me\b/gi, "imprima me").replace(/\bimprime-me\b/gi, "imprime me").replace(/\bimprimir-me\b/gi, "imprimir me");
}
function parseExportMeta(stripped) {
  const sn = normalizeHyphenImperatives(stripped.trim());
  const n = norm4(sn.replace(/[,;.]+/g, " "));
  const soft = n.replace(/\b(por|favor|gentileza|ia|ei|ol[áa]|oi)\b/g, " ").replace(/\s+/g, " ").trim();
  const printSoft = softenPrintTail(soft);
  if (/\bcomo\b/i.test(n) && !/^(?:por\s+favor\s+)?(?:ia\s+)?(?:baix|descarreg|export|manda|envi|imprim)/i.test(sn) && /\b(pdf|excel|planilha|xlsx|imprimir|imprime|baixar|exportar|download|partilhar|compartilhar)\b/i.test(sn) && sn.length > 20) {
    return null;
  }
  const tooLong = sn.length > 140;
  const exportWords = /\b(imprimir|imprime|imprima|print|impress[aã]o|pdf|excel|planilha|xlsx|exportar|baixar|descarregar|download|salvar|gera|gerar)\b/i.test(
    sn
  );
  if (tooLong && !exportWords) return null;
  const blocked = /\b(mostrar|mostra|exibir|exibe|gr[aá]fico|quero\s+ver|dados\s+de)\b/.test(n);
  if (blocked && sn.length > 40) return null;
  const printOk = /^(?:imprimir|imprime|imprima|print)(\s+painel|\s+isto|\s+isso|\s+agora|\s+o\s+painel|\s+este|\s+esse|\s+tudo|\s+o\s+relat[oó]rio|\s+o\s+resumo|\s+para\s+mim|\s+pra\s+mim|\s+para\s+si|\s+para\s+voc[eê]|\s+me|\s+por\s+gentileza|\s+por\s+favor)*\s*$/i.test(
    printSoft
  ) || /^(?:imprimir|imprime|imprima|print)$/i.test(printSoft) || /^(?:pode|podia|quero|preciso)\s+(?:imprimir|imprima|imprime)\b/i.test(sn) || /^(?:faz|fa[çc]a|fazer)\s+(?:a\s+)?impress[aã]o(?:\s+para\s+mim|\s+pra\s+mim)?\b/i.test(sn) || /\b(?:imprimir|imprime|imprima)\s+(?:este|esse|o|esta|essa)\s+(?:painel|relat)\w*/i.test(sn) || /\b(?:imprimir|imprime|imprima)\b/i.test(sn) && /\b(?:do\s+que\s+)?(?:gerou|geraste|mostrou|mostraste|painel|isso|isto|relat)\w*/i.test(sn) && sn.length <= 130 || /^(?:por\s+favor\s+|por\s+gentileza\s+)*(imprimir|imprime|imprima|print)\b/i.test(sn) && sn.length <= 120 || /^(?:imprimir|imprime|imprima)\b/i.test(sn) && /\b(por\s+favor|por\s+gentileza)\b/i.test(sn) && sn.length <= 120 || /^(?:quero|preciso)\s+(?:imprimir|imprima|fazer\s+impress)/i.test(sn) && sn.length <= 100 || /\b(?:imprimir|imprime|imprima)\s+para\s+mim\b/i.test(sn) && sn.length <= 100 || /\b(?:imprimir|imprime|imprima)\s+pra\s+mim\b/i.test(sn) && sn.length <= 100 || /\b(?:imprimir|imprime|imprima)\s+para\s+si\b/i.test(sn) && sn.length <= 100 || /^(?:imprimir|imprime|imprima|print)\s+me\b/i.test(n) && sn.length <= 100;
  if (printOk) return { kind: "print" };
  const pdfOk = /^pdf|baixar\s+pdf|exportar\s+pdf|download\s+pdf|baixar\s+o\s+pdf|salvar\s+pdf|salvar\s+o\s+pdf$/i.test(soft) || /\b(?:gera|gerar|quero|preciso)\s+(?:o\s+)?pdf\b/i.test(sn) || /\b(?:baixar|descarregar|exportar)\s+(?:o\s+)?relat[oó]rio\b/i.test(sn) && sn.length <= 52 || /^(?:por\s+favor\s+|por\s+gentileza\s+)?(?:o\s+)?pdf$/i.test(sn) && sn.length <= 90 || /^(?:quero|preciso)\s+(?:o\s+)?pdf$/i.test(sn) && sn.length <= 80 || /\b(?:baix|descarreg|download|salv|export)\w*\b/i.test(sn) && /\bpdf\b/i.test(sn) && sn.length <= 120 || /\bpdf\b/i.test(sn) && /\b(?:do\s+que\s+)?(?:gerou|geraste|mostrou|mostraste|criou|criaste|painel|isso|isto|a[ií]|relat)\w*/i.test(sn) && sn.length <= 130 || /\b(?:baix|descarreg)\w*\b/i.test(sn) && /\b(?:pra|para)\s+mim\b/i.test(sn) && /\b(?:pdf|relat|painel|isso|isto)\b/i.test(sn) && sn.length <= 130;
  if (pdfOk) return { kind: "pdf" };
  const downloadOk = /^baixar|descarregar|download$/i.test(soft) || /^(?:baixar|descarregar|download)(\s+painel|\s+isto|\s+isso|\s+agora|\s+o\s+painel|\s+este|\s+esse|\s+tudo|\s+o\s+pdf|\s+por\s+favor|\s+por\s+gentileza)*\s*$/i.test(
    soft
  ) || /^(?:por\s+favor\s+|por\s+gentileza\s+)?(?:baixar|descarregar)$/i.test(sn) && sn.length <= 100 || /^(?:quero|preciso)\s+(?:baixar|descarregar)/i.test(sn) && sn.length <= 90;
  if (downloadOk) return { kind: "pdf" };
  const excelOk = /^excel|planilha|xlsx|exportar\s+excel|baixar\s+excel|exportar\s+a\s+planilha|baixar\s+a\s+planilha$/i.test(soft) || /\b(?:quero|preciso|gera|gerar)\s+(?:a\s+)?planilha\b/i.test(sn) || /\b(?:quero|preciso|gera|gerar)\s+(?:o\s+)?excel\b/i.test(sn) || /^(?:por\s+favor\s+|por\s+gentileza\s+)?(?:a\s+)?planilha$/i.test(sn) && sn.length <= 90 || /^(?:quero|preciso)\s+(?:o\s+)?excel$/i.test(sn) && sn.length <= 80 || /^(?:quero|preciso)\s+(?:a\s+)?planilha$/i.test(sn) && sn.length <= 80 || /\b(?:baix|descarreg|export)\w*\b/i.test(sn) && /\b(?:excel|planilha|xlsx)\b/i.test(sn) && sn.length <= 120;
  if (excelOk) return { kind: "excel" };
  return null;
}
function looksLikePanelGenerationRequest(text) {
  const n = norm4(text);
  if (!n) return false;
  const wantsVisual = /\b(mostra|mostrar|exibe|exibir|gera|gerar|gere|cria|crie|criar|monta|montar|painel|grafico|gráfico|kpi|dashboard|quero ver|preciso ver|numeros|números|metrica|métrica|indicador)\b/.test(
    n
  );
  const wantsExport = /\b(baixar|descarregar|exportar|imprimir|imprime|imprima|enviar|envia|envie|mandar|manda|mande|download|partilhar|compartilhar)\b/.test(
    n
  );
  if (!wantsVisual || wantsExport) return false;
  if (/\b(relat[oó]rio|resumo|producao|produção)\b/.test(n) && !/\bpdf\b/.test(n)) return true;
  if (/\b(relat[oó]rio|painel)\b/.test(n) && /\bpdf\b/.test(n) && !wantsExport) return true;
  return wantsVisual;
}
function parsePanelVoiceMetaCommand(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const stripped = stripCourtesySuffixes(stripCourtesyPrefixes(raw));
  if (looksLikePanelGenerationRequest(stripped)) return null;
  if (stripped.length <= 420) {
    const sendPanel = parseSendPanelToTargets(stripped);
    if (sendPanel) return sendPanel;
    const msgPara = stripped.match(
      new RegExp(
        `\\b${SEND_VERB_RE}\\s+(?:uma\\s+)?(?:mensagem|msg|conte[u\xFA]do|painel|relat[o\xF3]rio|isso|isto)\\s+para\\s+(.+)`,
        "i"
      )
    );
    if (msgPara) {
      const targets = parseRecipientFragment(msgPara[1]);
      if (chatTargetsSanity(targets)) {
        return { kind: "chat", ...targets };
      }
    }
    const chat = parseChatTargets(stripped);
    if (chat && chatTargetsSanity(chat) && (chat.groupQuery || chat.roleQueries && chat.roleQueries.length || chat.userQueries && chat.userQueries.length))
      return {
        kind: "chat",
        userQueries: chat.userQueries || [],
        groupQuery: chat.groupQuery,
        roleQueries: chat.roleQueries || []
      };
  }
  const shareMeta = parseShareIntent(stripped);
  if (shareMeta) return shareMeta;
  const exportMeta = parseExportMeta(stripped);
  if (exportMeta) return exportMeta;
  const conversational = inferConversationalPanelMeta(stripped);
  if (conversational) return conversational;
  return null;
}
var SEND_VERB_RE, COLLECTIVE_ROLE_RE, WORKFLOW_RECIPIENT_BLOCK;
var init_panelVoiceMetaCommands = __esm({
  "../../../../features/smartPanel/panelVoiceMetaCommands.js"() {
    init_panelMetaIntent();
    SEND_VERB_RE = "(?:enviar|envia|envie|mande|manda|mandar|passa|passar|repassa|repassar|encaminha|encaminhar)";
    COLLECTIVE_ROLE_RE = /^(?:supervisores?|supervisoras?|gestores?|gerentes?|t[eé]cnicos?|mec[aâ]nicos?|operadores?|coordenadores?|equipe|time|turno|produ[cç][aã]o|qualidade|manuten[cç][aã]o|rh|diretoria|lideran[cç]a|engenharia)$/i;
    WORKFLOW_RECIPIENT_BLOCK = /^(?:revis[aã]o|produ[cç][aã]o|fabrica|f[aá]brica|sistema|homolog|staging|an[aá]lise|aprova[cç][aã]o|qualidade)$/i;
  }
});

// ../../../../utils/anamMetaGovernance.js
var anamMetaGovernance_exports = {};
__export(anamMetaGovernance_exports, {
  buildSyntheticMetaCommand: () => buildSyntheticMetaCommand,
  isAnamMetaCommitPhrase: () => isAnamMetaCommitPhrase,
  resolvePanelMetaFromConversation: () => resolvePanelMetaFromConversation
});
function norm5(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function userWantsMetaKind(userText, kind) {
  const u = String(userText || "").trim();
  if (!u) return false;
  const parsed = parsePanelVoiceMetaCommand(u);
  if (parsed?.kind === kind) return true;
  const n = norm5(u);
  if (kind === "chat") {
    return /\b(enviar|envia|envie|mandar|manda|mande|passar|passa|repassar|encaminhar|chat)\w*\b/.test(n);
  }
  if (kind === "print") {
    return /\b(imprim\w*|impress\w*|print\w*|copia|papel)\b/.test(n);
  }
  if (kind === "pdf") return /\b(pdf|baixar|descarregar|download)\w*\b/.test(n);
  if (kind === "excel") return /\b(excel|planilha|xlsx)\b/.test(n);
  return false;
}
function conversationWantsKind(userText, assistantText, kind) {
  const u = String(userText || "").trim();
  if (!u || u.length < 3) return false;
  if (userWantsMetaKind(u, kind)) return true;
  const blob = `${u} ${String(assistantText || "").trim()}`.trim();
  return userWantsMetaKind(blob, kind);
}
function isAnamMetaCommitPhrase(kind, assistantText, userText = "") {
  const raw = String(assistantText || "").trim();
  const a = norm5(raw);
  if (a.length < 10) return false;
  if (!conversationWantsKind(userText, assistantText, kind)) return false;
  if (raw.endsWith("?") && !/\b(vou|ja|já|estou|deixa|irei)\b/.test(a)) return false;
  const isQuestion = /\b(quer|gostaria|prefere|qual\s|quando\s|como\s|devo\s|confirma|confirme|deseja|me diz|me diga)\b/.test(a) && !/\b(vou|ja|já|estou|enviando|mandando|imprimindo)\b/.test(a);
  if (isQuestion) return false;
  if (kind === "chat") {
    return /\b(enviando|mandando|vou\s+enviar|vou\s+mandar|ja\s+enviei|já\s+enviei|enviei|mandei|estou\s+enviando|a\s+enviar|a\s+mandar|deixa\s+eu\s+enviar|deixa\s+eu\s+mandar|vou\s+passar|passando|encaminhando)\b/.test(
      a
    );
  }
  if (kind === "print") {
    return /\b(imprimindo|vou\s+imprim|ja\s+imprimi|já\s+imprimi|imprimi|abri\s+a\s+impress|abrindo\s+a\s+impress|a\s+imprimir|deixa\s+eu\s+imprim|mandei\s+imprimir)\b/.test(
      a
    );
  }
  if (kind === "pdf") {
    return /\b(baixando|vou\s+baixar|gerando\s+o\s+pdf|vou\s+gerar\s+o\s+pdf|ja\s+baixei|já\s+baixei|baixei|descarreguei|pdf\s+pronto)\b/.test(
      a
    );
  }
  if (kind === "excel") {
    return /\b(baixando|vou\s+baixar|gerando\s+a\s+planilha|planilha\s+pronta|excel\s+pronto|ja\s+baixei|já\s+baixei|baixei)\b/.test(
      a
    );
  }
  return false;
}
function extractChatMetaFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const parsed = parsePanelVoiceMetaCommand(raw);
  if (parsed?.kind === "chat") return parsed;
  const groupM = raw.match(/\b(?:para|pr[oó]|pro)\s+(?:o|a)\s+grupo\s+([^.,!?]+)/i);
  if (groupM) {
    const gname = groupM[1].trim();
    if (gname.length >= 2) {
      return { kind: "chat", userQueries: [], groupQuery: gname, roleQueries: [] };
    }
  }
  const pluralM = raw.match(/\b(?:para|pr[oó]|pro)\s+(?:os|as)\s+([^.,!?]+)/i);
  if (pluralM) {
    const label = pluralM[1].trim().replace(/\s+no\s+chat.*$/i, "");
    if (label.length >= 3 && !WORKFLOW_BLOCK.test(norm5(label))) {
      return { kind: "chat", userQueries: [], groupQuery: label, roleQueries: [label] };
    }
  }
  const paraM = raw.match(
    /\b(?:para|pr[oó]|pro)\s+(?:o|a|os|as)?\s*([^.,!?]+?)(?:\s+no\s+chat|\s+no\s+impetus|\s+pelo\s+chat|$)/i
  );
  if (paraM) {
    let name = paraM[1].trim();
    name = name.replace(/^(?:o|a|os|as)\s+/i, "").trim();
    if (name.length >= 2 && !WORKFLOW_BLOCK.test(norm5(name))) {
      return { kind: "chat", userQueries: [name], groupQuery: null, roleQueries: [] };
    }
  }
  return null;
}
function resolvePanelMetaFromConversation(userText, assistantText, preferredKind = null) {
  const u = String(userText || "").trim();
  if (!u || u.length < 3) return null;
  const blob = `${u} ${String(assistantText || "").trim()}`.trim();
  const sources = [u, blob].filter((t) => String(t || "").trim().length >= 3);
  for (const t of sources) {
    const meta = parsePanelVoiceMetaCommand(t);
    if (meta && (!preferredKind || meta.kind === preferredKind)) return meta;
  }
  if (!preferredKind || preferredKind === "chat") {
    for (const t of sources) {
      const chat = extractChatMetaFromText(t);
      if (chat) return chat;
    }
  }
  if (!preferredKind || preferredKind === "print") {
    if (userWantsMetaKind(blob, "print")) return { kind: "print" };
  }
  if (!preferredKind || preferredKind === "pdf") {
    if (userWantsMetaKind(blob, "pdf")) return { kind: "pdf" };
  }
  if (!preferredKind || preferredKind === "excel") {
    if (userWantsMetaKind(blob, "excel")) return { kind: "excel" };
  }
  return null;
}
function buildSyntheticMetaCommand(meta) {
  if (!meta?.kind) return "";
  if (meta.kind === "chat") {
    if (meta.groupQuery) return `manda isso para o grupo ${meta.groupQuery}`;
    if (meta.roleQueries?.length) return `enviar para os ${meta.roleQueries[0]}`;
    if (meta.userQueries?.length) {
      return `manda isso para ${meta.userQueries.join(" e ")}`;
    }
    return "enviar no chat interno";
  }
  if (meta.kind === "print") return "imprimir o painel";
  if (meta.kind === "pdf") return "baixar pdf do painel";
  if (meta.kind === "excel") return "baixar excel do painel";
  if (meta.kind === "share") return "partilhar";
  return "";
}
var WORKFLOW_BLOCK;
var init_anamMetaGovernance = __esm({
  "../../../../utils/anamMetaGovernance.js"() {
    init_panelVoiceMetaCommands();
    WORKFLOW_BLOCK = /^(?:revis[aã]o|produ[cç][aã]o|fabrica|f[aá]brica|sistema|homolog|staging|an[aá]lise|aprova[cç][aã]o|qualidade)$/i;
  }
});

// ../../../../features/smartPanel/smartPanelEvents.js
async function runVoicePanelMetaIfHandled(text) {
  const t = String(text || "").trim();
  if (!t) return { handled: false };
  const handler = voicePanelMetaHandler || anamPanelCommandHandler;
  if (!handler) {
    console.warn("[panel-meta] handler n\xE3o registado \u2014 overlay de voz sem SmartPanel?");
    return { handled: false };
  }
  const result = await handler(t);
  if (result === true) return { handled: true, success: true };
  if (result && typeof result === "object" && result.handled) return result;
  return { handled: false };
}
async function runPanelMetaResolved(meta) {
  if (!meta?.kind) return { handled: false };
  if (panelMetaDirectHandler) {
    const direct = await panelMetaDirectHandler(meta);
    if (direct && typeof direct === "object" && direct.handled) return direct;
    if (direct === true) return { handled: true, success: true };
  }
  const { buildSyntheticMetaCommand: buildSyntheticMetaCommand2 } = await Promise.resolve().then(() => (init_anamMetaGovernance(), anamMetaGovernance_exports));
  const synthetic = buildSyntheticMetaCommand2(meta);
  if (synthetic) return runVoicePanelMetaIfHandled(synthetic);
  return { handled: false };
}
function shouldAnamTriggerPanel(t) {
  if (parsePanelVoiceMetaCommand(t)) return true;
  if (t.length < 4) return false;
  if (inferVoiceVisualIntent(t) != null) return true;
  return t.length >= 6 && /\b(mostra|exibe|gera|gere|cria|crie|painel|grafico|gráfico|kpi|relatorio|relatório|dashboard|exporta|pdf|excel|manutenc|manutenção|producao|produção|indicador|metrica|métrica|numeros|números|resumo|tabela|chat|conversa|mensagem|mandou|cite)\b/i.test(
    t
  );
}
function fireAnamPanelCommand(t) {
  if (anamPanelCommandHandler) {
    void anamPanelCommandHandler(t);
    return;
  }
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SMART_PANEL_VOICE_EVENT, { detail: { text: t, source: "anam" } }));
}
function dispatchAnamPanelVoiceCommand(text) {
  const t = String(text || "").trim();
  if (!shouldAnamTriggerPanel(t)) return;
  fireAnamPanelCommand(t);
}
function dispatchAnamPanelCommit(detail) {
  const userTranscript = String(detail?.userTranscript || "").trim();
  const assistantResponse = String(detail?.assistantResponse || "").trim();
  if (!isAnamPanelCommitPhrase(assistantResponse, userTranscript)) return;
  const panelCommand = buildAnamPanelCommand(
    userTranscript,
    assistantResponse,
    detail?.recentTurns
  );
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CLAUDE_PANEL_BRIDGE_EVENT, {
      detail: {
        userTranscript: panelCommand,
        assistantResponse,
        source: "anam-commit"
      }
    })
  );
}
var SMART_PANEL_VOICE_EVENT, voicePanelMetaHandler, anamPanelCommandHandler, panelMetaDirectHandler, CLAUDE_PANEL_BRIDGE_EVENT, SMART_PANEL_CONTEXT_UPDATED_EVENT;
var init_smartPanelEvents = __esm({
  "../../../../features/smartPanel/smartPanelEvents.js"() {
    init_voiceVisualPanelService();
    init_anamPanelGovernance();
    init_panelVoiceMetaCommands();
    SMART_PANEL_VOICE_EVENT = "impetus-smart-panel-command";
    voicePanelMetaHandler = null;
    anamPanelCommandHandler = null;
    panelMetaDirectHandler = null;
    CLAUDE_PANEL_BRIDGE_EVENT = "impetus-claude-panel-bridge";
    SMART_PANEL_CONTEXT_UPDATED_EVENT = "impetus-smart-panel-context-updated";
  }
});

// ../../../../utils/anamOpeningGate.js
function normGreetingText(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
function isAllowedOpeningSpeech(spoken, expectedLine) {
  const a = normGreetingText(spoken);
  const e = normGreetingText(expectedLine);
  if (!a || !e) return false;
  if (a === e || a.includes(e) || e.includes(a)) return true;
  const eCore = e.replace(/\bcomo posso ajudar\b/g, "").trim();
  return eCore.length >= 8 && a.includes(eCore.slice(0, Math.min(28, eCore.length)));
}
function isForbiddenOpeningSpeech(text) {
  const a = normGreetingText(text);
  if (a.length < 6) return false;
  if (a.includes("impulsion")) return true;
  if (/\bola\b/.test(a) && /\bajudar\b/.test(a)) return true;
  if (a.includes("voce hoje") || a.includes("voc\xEA hoje")) return true;
  if (a.includes("em que posso") || a.includes("o que posso fazer")) return true;
  if (/\bhey\b/.test(a) && /\bhelp\b/.test(a)) return true;
  return false;
}
function shouldBlockPersonaOpening({ spoken, expectedLine, userHasSpoken, sessionAgeMs }) {
  if (userHasSpoken) return false;
  if (!Number.isFinite(sessionAgeMs) || sessionAgeMs > 3e4) return false;
  const t = String(spoken || "").trim();
  if (t.length < 6) return false;
  if (isAllowedOpeningSpeech(t, expectedLine)) return false;
  if (isForbiddenOpeningSpeech(t)) return true;
  return t.length >= 12;
}
var init_anamOpeningGate = __esm({
  "../../../../utils/anamOpeningGate.js"() {
  }
});

// ../../../../voice/voiceSessionCloseIntent.js
function norm6(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}
function getUserFirstName() {
  try {
    const u = JSON.parse(localStorage.getItem("impetus_user") || "{}");
    const n = String(u?.name || u?.full_name || "").trim().split(/\s+/)[0];
    return n || "";
  } catch {
    return "";
  }
}
function assistantAskedAnythingElse(text) {
  const n = norm6(text);
  if (n.length < 5) return false;
  return /\b(mais alguma|algo mais|alguma coisa mais|precisa de mais|precisa de algo|posso ajudar|te ajudo|ajudo (?:em|com|a)?|quer (?:que eu )?(?:faça|mostre|gera|ajude)|mais alguma coisa|deseja mais|quer algo mais|mais alguma duvida|mais alguma pergunta)\b/.test(
    n
  ) || /\b(necessita de mais|mais alguma coisa|ajudar (?:em|com) mais|posso te ajudar|e isso ou precisa)\b/.test(n) || /\?/.test(n) && /\b(mais|alguma|ajudar|precisa|algo)\b/.test(n) && n.length <= 120;
}
function userDeclinesMoreHelp(text) {
  const n = norm6(text);
  if (!n || n.length > 56) return false;
  if (/\?/.test(n)) return false;
  if (/\b(como|mostra|gera|gere|cria|quero ver|preciso ver|painel|grafico|relatorio|chat|abre|lista)\b/.test(n)) {
    return false;
  }
  if (/^(nao|nao obrigado|nao preciso|nada|nada nao|nada mais|so isso|e isso|tudo bem|tudo certo|ta bom|ok|certo|valeu|obrigado|obrigada|pode ser|pode encerrar|pode fechar|fecha|encerra|tchau|ate logo|so|nao quero|nao mais)$/.test(
    n
  )) {
    return true;
  }
  if (n.length <= 28 && /\b(nao|nada|so isso|ta bom|tchau|valeu|obrigad)\b/.test(n) && !/\b(sim|quero|preciso|mostra)\b/.test(n)) {
    return true;
  }
  return /\b(nao preciso|nada mais|so isso|pode encerrar|pode fechar|nao quero mais|nao e necessario|nao ha mais)\b/.test(
    n
  );
}
function userRequestsSessionClose(text) {
  const n = norm6(text);
  return /\b(encerr|fechar|desligar|sair|fecha a sess|encerre|pode sair|terminar (?:a )?sess)\b/.test(n);
}
function personaSignalsSessionEnd(text) {
  const n = norm6(text);
  if (n.length < 8) return false;
  return /\b(encerrando|encerro|vou encerrar|fechando a sess|finalizando a sess|encerrei)\b/.test(n) || /\b(qualquer coisa [eé] s[oó] chamar|se precisar [eé] s[oó] chamar|ate a proxima|por hoje e isso|foi isso entao)\b/.test(
    n
  ) || /\b(ta bom|tudo bem)\b/.test(n) && /\b(chamar|ate logo|ate mais|encerr)\b/.test(n);
}
function findLastAssistantText(turns, skipRoles = /* @__PURE__ */ new Set(["user"])) {
  for (let i = turns.length - 1; i >= 0; i--) {
    const r = String(turns[i]?.role || "").toLowerCase();
    if (skipRoles.has(r)) continue;
    if (r === "assistant" || r === "persona") {
      return String(turns[i]?.text || "").trim();
    }
  }
  return "";
}
function anyRecentAssistantAskedAnythingElse(turns, maxLookback = 6) {
  let seen = 0;
  for (let i = turns.length - 1; i >= 0 && seen < maxLookback; i--) {
    const r = String(turns[i]?.role || "").toLowerCase();
    if (r !== "assistant" && r !== "persona") continue;
    seen += 1;
    if (assistantAskedAnythingElse(turns[i]?.text)) return true;
  }
  return false;
}
function evaluateVoiceSessionClose(input = {}) {
  const userText = String(input.userText || "").trim();
  const assistantText = String(input.assistantText || "").trim();
  const lastAssistantHint = String(input.lastAssistantHint || "").trim();
  const turns = Array.isArray(input.recentTurns) ? input.recentTurns : [];
  const firstName = getUserFirstName();
  const nameBit = firstName ? `, ${firstName}` : "";
  const defaultFarewell = `T\xE1 bom${nameBit}, encerrando a sess\xE3o. Qualquer coisa \xE9 s\xF3 chamar.`;
  if (personaSignalsSessionEnd(assistantText)) {
    return { close: true, reason: "persona_farewell", speakFarewell: false, delayMs: 1800 };
  }
  if (userRequestsSessionClose(userText)) {
    return {
      close: true,
      reason: "user_explicit_close",
      speakFarewell: true,
      farewellLine: defaultFarewell,
      delayMs: 2800
    };
  }
  const prevAssistant = findLastAssistantText(turns) || lastAssistantHint || assistantText;
  const askedRecently = assistantAskedAnythingElse(prevAssistant) || assistantAskedAnythingElse(lastAssistantHint) || assistantAskedAnythingElse(assistantText) || anyRecentAssistantAskedAnythingElse(turns);
  if (userDeclinesMoreHelp(userText) && askedRecently) {
    return {
      close: true,
      reason: "user_declined_more",
      speakFarewell: true,
      farewellLine: defaultFarewell,
      delayMs: 2800
    };
  }
  return { close: false };
}
function dispatchVoiceSessionClose(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(VOICE_SESSION_CLOSE_EVENT, {
      detail: { reason: detail.reason || "unknown", ...detail }
    })
  );
}
var VOICE_SESSION_CLOSE_EVENT;
var init_voiceSessionCloseIntent = __esm({
  "../../../../voice/voiceSessionCloseIntent.js"() {
    VOICE_SESSION_CLOSE_EVENT = "impetus-voice-session-close";
  }
});

// ../../../../services/anamPanelBridge.js
function scheduleVoiceTruthShadow(userText, assistantText, channel = "anam_voice", client = null, g = null) {
  const assistant = String(assistantText || "").trim();
  if (assistant.length < 8) return;
  void dashboard.voiceTruthShadowValidate({
    assistant_text: assistant,
    query_text: String(userText || "").trim(),
    channel
  }).then(async (res) => {
    const assessment = res?.data?.assessment;
    if (!assessment) return;
    const shouldCorrect = Boolean(assessment.would_block || assessment.would_replace);
    if (!shouldCorrect) return;
    if (!res?.data?.oral_enforce_enabled || !client?.talk || g?.client !== client) return;
    const line = String(assessment.would_replace_text || MSG_NO_DATA_PT).trim().slice(0, 280);
    try {
      client.interruptPersona?.();
    } catch (_) {
    }
    try {
      await client.talk(line);
      g.lastMetaTalkAt = Date.now();
    } catch (e) {
      console.warn("[anam] voice truth enforce talk", e?.message || e);
    }
  }).catch((e) => console.warn("[anam] voice truth shadow", e?.message || e));
}
function blockPersonaOpeningIfNeeded(client, g, spoken) {
  if (!client || !spoken) return false;
  const sessionAgeMs = g?.sessionStartedAt ? Date.now() - g.sessionStartedAt : 999999;
  const shouldBlock = shouldBlockPersonaOpening({
    spoken,
    expectedLine: g?.expectedOpeningLine || "",
    userHasSpoken: Boolean(g?.userHasSpoken),
    sessionAgeMs
  });
  if (!shouldBlock) return false;
  try {
    client.interruptPersona?.();
  } catch (_) {
  }
  return true;
}
function readPanelContextFromStorage() {
  try {
    return String(sessionStorage.getItem("impetus_voice_last_panel_context") || "").trim();
  } catch (_) {
    return "";
  }
}
function pushPanelContextToClient(client) {
  if (!client?.addContext) return;
  const panelCtx = readPanelContextFromStorage();
  const block = panelCtx ? `${PANEL_BRIEF}

CONTEXTO ATUAL DO PAINEL VISUAL:
${panelCtx}` : PANEL_BRIEF;
  try {
    client.addContext(block.slice(0, 6500));
  } catch (_) {
  }
}
async function injectOperationalVoiceContext(client, hint = "") {
  if (!client?.addContext) return;
  try {
    const params = hint ? { hint: String(hint).slice(0, 200) } : {};
    const r = await dashboard.getVoiceRealtimeContext(params);
    const append2 = String(r.data?.instructions_append || r?.instructions_append || "").trim();
    if (append2) {
      client.addContext(
        `[ATUALIZA\xC7\xC3O DADOS IMPETUS ${(/* @__PURE__ */ new Date()).toISOString()}]
${append2}`.slice(0, 6500)
      );
    }
  } catch (e) {
    console.warn("[anam] voice context refresh", e?.message || e);
  }
  pushPanelContextToClient(client);
}
function normRole(msg) {
  const r = msg?.role;
  if (r === import_js_sdk.MessageRole.USER || r === "user") return "user";
  if (r === import_js_sdk.MessageRole.PERSONA || r === "persona") return "persona";
  return String(r || "").toLowerCase();
}
async function speakMetaResult(client, g, result) {
  const line = String(result?.speakLine || "").trim();
  if (!line || !client?.talk || g?.client !== client) return;
  try {
    client.interruptPersona?.();
  } catch (_) {
  }
  try {
    await client.talk(line.slice(0, 280));
    g.lastMetaTalkAt = Date.now();
    if (result?.success) g.lastPanelMetaSuccessAt = Date.now();
  } catch (e) {
    console.warn("[anam] meta talk", e?.message || e);
  }
}
function personaClaimsPanelMetaDone(assistantText, userText) {
  const a = String(assistantText || "").trim();
  if (a.length < 8) return false;
  const meta = parsePanelVoiceMetaCommand(userText);
  if (!meta || meta.kind === "share") return false;
  if (meta.kind === "chat") {
    if (!/\b(enviei|mandei|j[aá]\s+enviei|acabei de enviar|foi enviado|est[aá] enviado)\b/i.test(a)) {
      return false;
    }
    if (/\b(chat|mensagem|impetus)\b/i.test(a)) return true;
    return true;
  }
  if (meta.kind === "print") {
    return /\b(imprimi|imprimindo|j[aá]\s+imprimi|foi\s+imprim|est[aá]\s+imprim|mandei\s+imprimir|abri\s+a\s+impress|disparei\s+a\s+impress|vou\s+imprim|abrindo\s+a\s+impress|deixa\s+eu\s+imprim)\b/i.test(
      a
    );
  }
  if (meta.kind === "pdf") {
    return /\b(baixei|descarreguei|pdf\s+pronto|j[aá]\s+baixei|foi\s+baixad|est[aá]\s+baixad|gerou\s+o\s+pdf)\b/i.test(a);
  }
  if (meta.kind === "excel") {
    return /\b(baixei|descarreguei|planilha\s+pronta|excel\s+pronto|j[aá]\s+baixei|foi\s+baixad)\b/i.test(a);
  }
  return false;
}
async function runResolvedMeta(meta, execKey, client, g) {
  if (!meta?.kind) return null;
  const result = await runPanelMetaResolved(meta);
  if (!result?.handled) return null;
  g.lastMetaExecKey = execKey;
  if (result.success) {
    await speakMetaResult(client, g, result);
    return true;
  }
  if (result.speakLine) {
    await speakMetaResult(client, g, result);
    return false;
  }
  return false;
}
async function ensurePanelMetaExecuted(userText, assistantText, client, g) {
  const u = String(userText || "").trim();
  const a = String(assistantText || "").trim();
  if (u.length < 3 && a.length < 8) return false;
  if (inferVoiceVisualIntent(u) === "clear") {
    dispatchAnamPanelVoiceCommand(u);
    return true;
  }
  const userMeta = parsePanelVoiceMetaCommand(u);
  if (!userMeta && u.length >= 3 && a.length < 8) return false;
  const metaKinds = ["chat", "print", "pdf", "excel"];
  if (a.length >= 8 && u.length >= 3) {
    for (const kind of metaKinds) {
      if (!isAnamMetaCommitPhrase(kind, a, u)) continue;
      const execKey2 = `meta-commit:${kind}:${u.slice(0, 40)}:${a.slice(0, 60)}`;
      const recentlyDone2 = g.lastMetaExecKey === execKey2 && g.lastPanelMetaSuccessAt && Date.now() - g.lastPanelMetaSuccessAt < 5e3;
      if (recentlyDone2) return true;
      const meta = resolvePanelMetaFromConversation(u, a, kind);
      if (meta) {
        try {
          client.interruptPersona?.();
        } catch (_) {
        }
        const done = await runResolvedMeta(meta, execKey2, client, g);
        if (done !== null) return done;
      }
    }
  }
  if (u.length < 3) return false;
  const execKey = `meta:${u.slice(0, 100)}`;
  const recentlyDone = g.lastMetaExecKey === execKey && g.lastPanelMetaSuccessAt && Date.now() - g.lastPanelMetaSuccessAt < 4e3;
  if (!recentlyDone && userMeta) {
    const failCooldownKey = `no-panel:${userMeta.kind}`;
    const inFailCooldown = g.lastMetaFailKey === failCooldownKey && g.lastMetaFailAt && Date.now() - g.lastMetaFailAt < 45e3;
    if (inFailCooldown) return false;
    const result = await runVoicePanelMetaIfHandled(u);
    if (result?.handled) {
      g.lastMetaExecKey = execKey;
      if (result.success) {
        g.lastMetaFailKey = "";
        await speakMetaResult(client, g, result);
        return true;
      }
      if (!result.success) {
        g.lastMetaFailKey = failCooldownKey;
        g.lastMetaFailAt = Date.now();
      }
      if (result.speakLine) {
        await speakMetaResult(client, g, result);
        return false;
      }
      return false;
    }
  } else if (g.lastPanelMetaSuccessAt) {
    return true;
  }
  if (userMeta && personaClaimsPanelMetaDone(a, u) && !g.lastPanelMetaSuccessAt) {
    try {
      client.interruptPersona?.();
    } catch (_) {
    }
    const kind = parsePanelVoiceMetaCommand(u)?.kind || resolvePanelMetaFromConversation(u, a)?.kind;
    const meta = kind ? resolvePanelMetaFromConversation(u, a, kind) : null;
    const retry = meta ? await runPanelMetaResolved(meta) : await runVoicePanelMetaIfHandled(u);
    g.lastMetaExecKey = execKey;
    if (retry?.handled) {
      await speakMetaResult(client, g, retry);
      return Boolean(retry.success);
    }
    if (client?.talk && g.client === client) {
      try {
        client.interruptPersona?.();
      } catch (_) {
      }
      const kind2 = parsePanelVoiceMetaCommand(u)?.kind;
      const failLine = kind2 === "print" ? "N\xE3o consegui abrir a impress\xE3o. Gere o painel primeiro e permita pop-ups neste site." : kind2 === "pdf" || kind2 === "excel" ? "N\xE3o consegui exportar o painel. Gere o relat\xF3rio primeiro e tente de novo." : "N\xE3o consegui enviar no chat interno. Confirme se o painel j\xE1 foi gerado e o nome do destinat\xE1rio no Impetus.";
      await client.talk(failLine);
      g.lastMetaTalkAt = Date.now();
    }
    return false;
  }
  return false;
}
function maybeScheduleSessionClose(client, g, { userText = "", assistantText = "" } = {}) {
  if (g.sessionCloseScheduled) return;
  const decision = evaluateVoiceSessionClose({
    userText,
    assistantText,
    lastAssistantHint: g.lastAssistantUtterance || "",
    recentTurns: g.panelConversation || []
  });
  if (!decision.close) return;
  g.sessionCloseScheduled = true;
  const runClose = () => {
    g.sessionCloseScheduled = false;
    dispatchVoiceSessionClose({ reason: decision.reason });
  };
  const farewell = String(decision.farewellLine || "").trim();
  const delayMs = decision.delayMs || 2400;
  if (decision.speakFarewell && farewell && client?.talk && g.client === client) {
    try {
      client.interruptPersona?.();
    } catch (_) {
    }
    void (async () => {
      try {
        await Promise.race([
          client.talk(farewell.slice(0, 280)),
          new Promise((resolve) => setTimeout(resolve, 2200))
        ]);
        g.lastMetaTalkAt = Date.now();
      } catch (e) {
        console.warn("[anam] session close talk", e?.message || e);
      } finally {
        setTimeout(runClose, delayMs);
      }
    })();
    return;
  }
  setTimeout(runClose, delayMs);
}
function pushPanelTurn(g, role, text) {
  if (!g.panelConversation) g.panelConversation = [];
  const t = String(text || "").trim();
  if (t.length < 2) return;
  const last = g.panelConversation[g.panelConversation.length - 1];
  if (last && last.role === role && last.text === t) return;
  g.panelConversation.push({ role, text: t });
  if (g.panelConversation.length > 10) {
    g.panelConversation = g.panelConversation.slice(-10);
  }
}
function tryPanelCommit(userText, assistantText, g, commitKey) {
  const u = String(userText || "").trim();
  const a = String(assistantText || "").trim();
  if (a.length < 8) return;
  if (g.lastPanelCommitKey === commitKey) return;
  g.lastPanelCommitKey = commitKey;
  dispatchAnamPanelCommit({
    userTranscript: u,
    assistantResponse: a,
    recentTurns: g.panelConversation || []
  });
}
function wireAnamPanelBridge(client, g) {
  if (!client || typeof client.addListener !== "function") return;
  if (g.panelBridgeWired && g.panelBridgeClient === client) return;
  unwireAnamPanelBridge(g);
  g.panelConversation = [];
  g.lastPanelCommitKey = "";
  g.sessionCloseScheduled = false;
  let lastUserFinal = "";
  let lastHandledUserKey = "";
  let personaAccum = "";
  const processUserText = (text, key) => {
    const t = String(text || "").trim();
    if (t.length < 2) return;
    const dedupeKey = key || t;
    if (dedupeKey === lastHandledUserKey) return;
    lastHandledUserKey = dedupeKey;
    lastUserFinal = t;
    pushPanelTurn(g, "user", t);
    maybeScheduleSessionClose(client, g, { userText: t });
    void injectOperationalVoiceContext(client, t);
    void ensurePanelMetaExecuted(t, "", client, g);
  };
  const onMessageHistory = (messages) => {
    const arr = Array.isArray(messages) ? messages : [];
    const users = arr.filter((m) => normRole(m) === "user");
    const personas = arr.filter((m) => normRole(m) === "persona");
    const lastUser = users[users.length - 1];
    const lastPersona = personas[personas.length - 1];
    if (lastUser?.content) {
      processUserText(lastUser.content, `hist-user:${lastUser.id || lastUser.content}`);
    }
    if (lastPersona?.content) {
      g.lastAssistantUtterance = String(lastPersona.content || "").trim();
      const u = lastUser?.content || lastUserFinal;
      const metaKind = resolvePanelMetaFromConversation(u, lastPersona.content)?.kind || parsePanelVoiceMetaCommand(u)?.kind;
      const skipPanelCommit = metaKind === "chat" || metaKind === "pdf" || metaKind === "excel" || metaKind === "print" || metaKind === "share";
      void ensurePanelMetaExecuted(u, lastPersona.content, client, g).then((metaDone) => {
        if (!metaDone && !skipPanelCommit) {
          pushPanelTurn(g, "assistant", lastPersona.content);
          tryPanelCommit(
            u,
            lastPersona.content,
            g,
            `hist-commit:${lastUser?.id || "u"}:${lastPersona.id}:${lastPersona.content.length}`
          );
        }
        scheduleVoiceTruthShadow(u, lastPersona.content, "anam_voice", client, g);
        maybeScheduleSessionClose(client, g, {
          userText: u,
          assistantText: lastPersona.content
        });
      });
    }
  };
  const onMessage = (ev) => {
    const role = String(ev?.role || "").toLowerCase();
    const content = String(ev?.content || "");
    const end = Boolean(ev?.endOfSpeech);
    const interrupted = Boolean(ev?.interrupted);
    if (role === "user" || role === import_js_sdk.MessageRole.USER) {
      if (content.trim().length >= 3) {
        g.userHasSpoken = true;
        processUserText(content, `stream-user:${ev?.id || content}`);
      }
      return;
    }
    if (role === "persona" || role === import_js_sdk.MessageRole.PERSONA) {
      if (interrupted) {
        personaAccum = "";
        return;
      }
      if (content) {
        personaAccum = end ? content : `${personaAccum}${content}`;
        const partial = personaAccum.trim();
        if (partial.length >= 8 && blockPersonaOpeningIfNeeded(client, g, partial)) {
          personaAccum = "";
          return;
        }
      }
      if (end) {
        const assistant = personaAccum.trim();
        personaAccum = "";
        if (blockPersonaOpeningIfNeeded(client, g, assistant)) {
          return;
        }
        if (assistant.length >= 6) {
          g.lastAssistantUtterance = assistant;
          if (personaClaimsPanelMetaDone(assistant, lastUserFinal) && !g.lastPanelMetaSuccessAt) {
            try {
              client.interruptPersona?.();
            } catch (_) {
            }
          }
          if (g.lastMetaTalkAt && Date.now() - g.lastMetaTalkAt < 12e3 && /\b(clique|clica|menu|bot[aã]o|para baixar|v[aá]\s+em|acesse|abre o|passo a passo|exportar.*?(?:clic|menu))\b/i.test(
            assistant
          )) {
            try {
              client.interruptPersona?.();
            } catch (_) {
            }
            return;
          }
          const metaKind = resolvePanelMetaFromConversation(lastUserFinal, assistant)?.kind || parsePanelVoiceMetaCommand(lastUserFinal)?.kind;
          const skipPanelCommit = metaKind === "chat" || metaKind === "pdf" || metaKind === "excel" || metaKind === "print" || metaKind === "share";
          void ensurePanelMetaExecuted(lastUserFinal, assistant, client, g).then((metaDone) => {
            if (metaDone || skipPanelCommit) return;
            pushPanelTurn(g, "assistant", assistant);
            tryPanelCommit(
              lastUserFinal,
              assistant,
              g,
              `stream-commit:${lastUserFinal.length}:${assistant.length}`
            );
          });
          if (!skipPanelCommit) {
            pushPanelTurn(g, "assistant", assistant);
          }
          scheduleVoiceTruthShadow(lastUserFinal, assistant, "anam_voice", client, g);
          maybeScheduleSessionClose(client, g, {
            userText: lastUserFinal,
            assistantText: assistant
          });
        }
      }
    }
  };
  const onPanelContext = () => {
    pushPanelContextToClient(client);
  };
  const onSessionReady = () => {
    void injectOperationalVoiceContext(client);
  };
  client.addListener(import_js_sdk.AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onMessage);
  client.addListener(import_js_sdk.AnamEvent.MESSAGE_HISTORY_UPDATED, onMessageHistory);
  client.addListener(import_js_sdk.AnamEvent.SESSION_READY, onSessionReady);
  if (typeof window !== "undefined") {
    window.addEventListener(SMART_PANEL_CONTEXT_UPDATED_EVENT, onPanelContext);
  }
  g.panelBridgeWired = true;
  g.panelBridgeClient = client;
  g.panelBridgeCleanup = () => {
    try {
      client.removeListener(import_js_sdk.AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onMessage);
      client.removeListener(import_js_sdk.AnamEvent.MESSAGE_HISTORY_UPDATED, onMessageHistory);
      client.removeListener(import_js_sdk.AnamEvent.SESSION_READY, onSessionReady);
    } catch (_) {
    }
    if (typeof window !== "undefined") {
      window.removeEventListener(SMART_PANEL_CONTEXT_UPDATED_EVENT, onPanelContext);
    }
    g.panelBridgeWired = false;
    g.panelBridgeClient = null;
    g.panelBridgeCleanup = null;
    g.panelConversation = [];
    g.lastPanelCommitKey = "";
  };
  void injectOperationalVoiceContext(client);
}
function unwireAnamPanelBridge(g) {
  if (g?.panelBridgeCleanup) {
    g.panelBridgeCleanup();
  }
}
var import_js_sdk, MSG_NO_DATA_PT, PANEL_BRIEF;
var init_anamPanelBridge = __esm({
  "../../../../services/anamPanelBridge.js"() {
    import_js_sdk = __toESM(require_main(), 1);
    init_api();
    init_smartPanelEvents();
    init_voiceVisualPanelService();
    init_anamOpeningGate();
    init_panelVoiceMetaCommands();
    init_anamMetaGovernance();
    init_smartPanelEvents();
    init_voiceSessionCloseIntent();
    MSG_NO_DATA_PT = "N\xE3o tenho dados operacionais verificados no IMPETUS para afirmar isso com seguran\xE7a. Posso consultar outra \xE1rea ou outro indicador?";
    PANEL_BRIEF = `PAINEL DIREITO (SmartPanel IMPETUS):
- \xC1rea visual ao lado do avatar: gr\xE1ficos, KPIs, tabelas e relat\xF3rios operacionais.
- O painel mostra dados de TODO o IMPETUS que o utilizador pode aceder (telemetria, manuten\xE7\xE3o, produ\xE7\xE3o, qualidade, etc.). Atualize s\xF3 ap\xF3s acordo: \xABCerto, gerando a telemetria no painel\xBB.
- A\xC7\xD5ES AUTOM\xC1TICAS (confirme com UMA frase de execu\xE7\xE3o \u2014 o sistema dispara igual ao painel visual):
  \u2022 Chat: ap\xF3s acordo, diga ex.: \xABCerto, vou enviar para o Jo\xE3o no chat interno\xBB \u2014 o IMPETUS envia; n\xE3o pe\xE7a ao utilizador ir ao menu.
  \u2022 Imprimir: \xABVou abrir a impress\xE3o do painel\xBB.
  \u2022 PDF/Excel: \xABVou gerar o PDF\xBB / \xABVou baixar a planilha\xBB.
  \u2022 Linguagem natural; N\xC3O exija palavras-chave. Confirme s\xF3 depois que o sistema concluir.
- Use o CONTEXTO DO PAINEL abaixo para falar do que est\xE1 vis\xEDvel.
- Responda em portugu\xEAs do Brasil, direto ao assunto.`;
  }
});

// ../../../../services/anamSessionSingleton.js
var anamSessionSingleton_exports = {};
__export(anamSessionSingleton_exports, {
  ANAM_STREAM_READY_EVENT: () => ANAM_STREAM_READY_EVENT,
  ClientError: () => import_js_sdk2.ClientError,
  SHARED_VIDEO_ID: () => SHARED_VIDEO_ID,
  acquireAnamStream: () => acquireAnamStream,
  isAnamSessionActive: () => isAnamSessionActive,
  releaseAnamStream: () => releaseAnamStream,
  stopAnamStreamNow: () => stopAnamStreamNow
});
function notifyAnamStreamReady() {
  if (typeof window === "undefined") return;
  window.__impetusAnamConnected = true;
  window.dispatchEvent(new CustomEvent(ANAM_STREAM_READY_EVENT));
}
function getTabId() {
  if (typeof window === "undefined") return "ssr";
  if (!window.__impetusAnamTabId) {
    window.__impetusAnamTabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return window.__impetusAnamTabId;
}
function getState() {
  if (typeof window === "undefined") {
    return {
      client: null,
      videoEl: null,
      consumers: 0,
      connectPromise: null,
      graceTimer: null,
      stopTimer: null,
      greetingTimer: null,
      streaming: false,
      stopInFlight: null,
      openingTalkDone: false
    };
  }
  if (!window.__impetusAnamG) {
    window.__impetusAnamG = {
      client: null,
      videoEl: null,
      consumers: 0,
      connectPromise: null,
      graceTimer: null,
      stopTimer: null,
      streaming: false,
      stopInFlight: null,
      openingTalkDone: false
    };
  }
  return window.__impetusAnamG;
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function clearTimers(g) {
  if (g.graceTimer) {
    clearTimeout(g.graceTimer);
    g.graceTimer = null;
  }
  if (g.stopTimer) {
    clearTimeout(g.stopTimer);
    g.stopTimer = null;
  }
  if (g.openingTalkTimer) {
    clearTimeout(g.openingTalkTimer);
    g.openingTalkTimer = null;
  }
  if (g.openingTalkFallbackTimer) {
    clearTimeout(g.openingTalkFallbackTimer);
    g.openingTalkFallbackTimer = null;
  }
}
function isConcurrencyError(err) {
  const code = err?.code || "";
  const msg = `${err?.message || ""} ${err?.details?.cause || ""}`;
  return code === "CLIENT_ERROR_CODE_MAX_CONCURRENT_SESSIONS_REACHED" || /concurrent|concurrency|paralel|outra aba/i.test(msg);
}
function runConnectExclusive(fn) {
  const run = connectMutex.then(() => fn());
  connectMutex = run.catch(() => {
  });
  return run;
}
function tryAcquireTabLock() {
  if (typeof window === "undefined") return { ok: true };
  const tabId = getTabId();
  const now = Date.now();
  try {
    const raw = localStorage.getItem(TAB_LOCK_KEY);
    if (raw) {
      const lock = JSON.parse(raw);
      const stale = now - (lock.at || 0) >= TAB_LOCK_TTL_MS;
      const otherTab = lock.tabId && lock.tabId !== tabId;
      if (otherTab && !stale) {
        console.warn("[anam] lock de outra sess\xE3o; a assumir liga\xE7\xE3o nesta aba.");
        localStorage.removeItem(TAB_LOCK_KEY);
      } else if (stale) {
        localStorage.removeItem(TAB_LOCK_KEY);
      }
    }
    localStorage.setItem(TAB_LOCK_KEY, JSON.stringify({ tabId, at: now }));
    return { ok: true };
  } catch (_) {
    return { ok: true };
  }
}
function releaseTabLock() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(TAB_LOCK_KEY);
    if (!raw) return;
    const lock = JSON.parse(raw);
    if (lock.tabId === getTabId()) {
      localStorage.removeItem(TAB_LOCK_KEY);
    }
  } catch (_) {
  }
}
function styleAnamVideoEl(el) {
  el.className = "voice-avatar-external-slot__anam-video";
  el.autoplay = true;
  el.playsInline = true;
  el.setAttribute("playsinline", "");
  el.setAttribute("webkit-playsinline", "true");
  el.muted = false;
  el.defaultMuted = false;
}
function ensureSharedVideo(g) {
  let el = document.getElementById(SHARED_VIDEO_ID);
  if (!el) {
    el = document.createElement("video");
    el.id = SHARED_VIDEO_ID;
    styleAnamVideoEl(el);
    g.videoEl = el;
  } else {
    g.videoEl = el;
    styleAnamVideoEl(el);
  }
  return el;
}
function ensureSharedAudio(g) {
  let el = document.getElementById(SHARED_AUDIO_ID);
  if (!el) {
    el = document.createElement("audio");
    el.id = SHARED_AUDIO_ID;
    el.autoplay = true;
    el.setAttribute("playsinline", "");
    g.audioEl = el;
  } else {
    g.audioEl = el;
  }
  return el;
}
function mergeAnamStreams(g) {
  const ms = new MediaStream();
  if (g.pendingVideoStream) {
    g.pendingVideoStream.getVideoTracks().forEach((t) => ms.addTrack(t));
  }
  if (g.pendingAudioStream) {
    g.pendingAudioStream.getAudioTracks().forEach((t) => ms.addTrack(t));
  }
  return ms.getTracks().length ? ms : null;
}
async function playVideoElement(video) {
  if (!video) return;
  try {
    await video.play();
  } catch (_) {
    try {
      video.muted = true;
      await video.play();
      video.muted = false;
    } catch (e2) {
      console.warn("[anam] video.play", e2?.message || e2);
    }
  }
}
function bindAnamMediaToDom(g) {
  const video = g.videoEl || document.getElementById(SHARED_VIDEO_ID);
  if (!video) return;
  const merged = mergeAnamStreams(g);
  if (merged) {
    video.srcObject = merged;
    void playVideoElement(video);
    return;
  }
  if (g.pendingVideoStream) {
    video.srcObject = g.pendingVideoStream;
    void playVideoElement(video);
  }
}
function bindVideoStream(stream4, g) {
  if (!stream4) return;
  g.pendingVideoStream = stream4;
  bindAnamMediaToDom(g);
  notifyAnamStreamReady();
}
function bindAudioStream(stream4, g) {
  if (!stream4) return;
  g.pendingAudioStream = stream4;
  const audio = ensureSharedAudio(g);
  audio.srcObject = stream4;
  void audio.play().catch(() => {
  });
  bindAnamMediaToDom(g);
}
function resolveAnamMountEl(g, mountEl) {
  return mountEl || g.lastMountEl || (typeof document !== "undefined" ? document.querySelector('[data-anam-mount="true"]') : null);
}
async function waitForVideoInDocument(g, mountEl, maxMs = 1e4) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const target = resolveAnamMountEl(g, mountEl);
    if (target) g.lastMountEl = target;
    mountVideoTo(g, target);
    const el = document.getElementById(SHARED_VIDEO_ID);
    if (el?.isConnected) {
      g.videoEl = el;
      return el;
    }
    await sleep(60);
  }
  throw new Error(
    "Elemento de v\xEDdeo Anam n\xE3o encontrado no DOM. Feche o painel, aguarde 2s e abra de novo."
  );
}
function mountVideoTo(g, mountEl) {
  const video = ensureSharedVideo(g);
  const audio = ensureSharedAudio(g);
  if (mountEl) {
    mountEl.style.position = "relative";
    if (video.parentElement !== mountEl && !mountEl.contains(video)) {
      mountEl.appendChild(video);
    }
    if (audio.parentElement !== mountEl && !mountEl.contains(audio)) {
      audio.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden";
      mountEl.appendChild(audio);
    }
  }
  bindAnamMediaToDom(g);
  return video;
}
async function prepareServerSlot() {
  try {
    await anam.prepareSession();
  } catch (_) {
  }
}
async function ensureStoppedBeforeConnect(g) {
  if (g.streaming && g.client) return;
  if (g.stopInFlight) {
    await Promise.race([g.stopInFlight.catch(() => {
    }), sleep(8e3)]);
  }
  if (g.connectPromise) {
    await Promise.race([g.connectPromise.catch(() => {
    }), sleep(12e3)]);
  }
  if (g.client || g.streaming) {
    await stopAnamStreamNow();
    await prepareServerSlot();
    await sleep(600);
  }
}
function attachSessionContext(client) {
  if (!client?.addContext) return;
  const ctx = getAnamSessionContextPayload();
  const period = ctx.localHour >= 5 && ctx.localHour < 12 ? "manh\xE3" : ctx.localHour >= 12 && ctx.localHour < 18 ? "tarde" : "noite";
  try {
    const first = String(ctx.userDisplayName || "").trim().split(/\s+/)[0] || "utilizador";
    client.addContext(
      `Utilizador: ${ctx.userDisplayName || first}; tratar por ${first}. Hora local ${ctx.localHour}h (${ctx.timezone}); per\xEDodo ${period}. Sauda\xE7\xE3o j\xE1 dita pelo sistema. Sil\xEAncio at\xE9 o utilizador falar; proibido Ol\xE1, impulsionar ou novo cumprimento.`
    );
  } catch (_) {
  }
}
function scheduleOpeningTalk(client, g) {
  if (!client || g.openingTalkDone) return;
  const line = g.expectedOpeningLine || buildAnamOpeningLine();
  if (!line) return;
  let speakInFlight = false;
  const speakOnce = async () => {
    if (g.openingTalkDone || speakInFlight || g.client !== client) return;
    speakInFlight = true;
    try {
      if (typeof client.isStreaming === "function" && !client.isStreaming()) return;
      try {
        client.interruptPersona?.();
      } catch (_) {
      }
      await sleep(400);
      if (g.openingTalkDone || g.client !== client) return;
      await client.talk(line);
      g.openingTalkDone = true;
      attachSessionContext(client);
    } catch (e) {
      console.warn("[anam] sauda\xE7\xE3o talk", e?.message || e);
    } finally {
      speakInFlight = false;
    }
  };
  const armSpeak = (delayMs) => {
    if (g.openingTalkTimer) clearTimeout(g.openingTalkTimer);
    g.openingTalkTimer = setTimeout(() => {
      g.openingTalkTimer = null;
      void speakOnce();
    }, delayMs);
  };
  if (typeof client.addListener !== "function") {
    armSpeak(900);
    return;
  }
  const onReady = () => {
    client.removeListener(import_js_sdk2.AnamEvent.SESSION_READY, onReady);
    armSpeak(700);
  };
  client.addListener(import_js_sdk2.AnamEvent.SESSION_READY, onReady);
  g.openingTalkFallbackTimer = setTimeout(() => {
    g.openingTalkFallbackTimer = null;
    if (!g.openingTalkDone && g.client === client) void speakOnce();
  }, 2800);
}
function attachStreamReadyListeners(client, g) {
  if (!client?.addListener || g.streamReadyListenerAttached) return;
  const onVideoStream = (stream4) => bindVideoStream(stream4, g);
  const onAudioStream = (stream4) => bindAudioStream(stream4, g);
  const onVideoPlay = () => notifyAnamStreamReady();
  const onReady = () => {
    bindAnamMediaToDom(g);
    notifyAnamStreamReady();
  };
  client.addListener(import_js_sdk2.AnamEvent.VIDEO_STREAM_STARTED, onVideoStream);
  client.addListener(import_js_sdk2.AnamEvent.AUDIO_STREAM_STARTED, onAudioStream);
  client.addListener(import_js_sdk2.AnamEvent.VIDEO_PLAY_STARTED, onVideoPlay);
  client.addListener(import_js_sdk2.AnamEvent.SESSION_READY, onReady);
  if (g.mediaFrameTimer) clearInterval(g.mediaFrameTimer);
  g.mediaFrameTimer = setInterval(() => {
    const video = g.videoEl || document.getElementById(SHARED_VIDEO_ID);
    if (!video) return;
    if (g.pendingVideoStream && (!video.srcObject || video.videoWidth === 0)) {
      bindAnamMediaToDom(g);
    }
    if (video.videoWidth > 0) {
      notifyAnamStreamReady();
    }
  }, 800);
  g.streamReadyListenerAttached = true;
  g.streamReadyCleanup = () => {
    if (g.mediaFrameTimer) {
      clearInterval(g.mediaFrameTimer);
      g.mediaFrameTimer = null;
    }
    try {
      client.removeListener(import_js_sdk2.AnamEvent.VIDEO_STREAM_STARTED, onVideoStream);
      client.removeListener(import_js_sdk2.AnamEvent.AUDIO_STREAM_STARTED, onAudioStream);
      client.removeListener(import_js_sdk2.AnamEvent.VIDEO_PLAY_STARTED, onVideoPlay);
      client.removeListener(import_js_sdk2.AnamEvent.SESSION_READY, onReady);
    } catch (_) {
    }
    g.streamReadyListenerAttached = false;
  };
}
async function connectOnceInternal(g) {
  g.openingTalkDone = false;
  g.userHasSpoken = false;
  g.sessionStartedAt = Date.now();
  g.expectedOpeningLine = buildAnamOpeningLine();
  const tokenRes = await anam.createSessionToken(getAnamSessionContextPayload());
  const sessionToken = tokenRes.data?.sessionToken;
  if (!sessionToken) {
    throw new Error("Sem sessionToken \u2014 fa\xE7a login novamente.");
  }
  const client = (0, import_js_sdk2.createClient)(sessionToken, { disableInputAudio: false });
  g.client = client;
  attachStreamReadyListeners(client, g);
  const connectWork = async () => {
    const v = await waitForVideoInDocument(g, g.lastMountEl);
    if (!document.getElementById(v.id)) {
      throw new Error(`StreamingClient: video element with id ${v.id} not found`);
    }
    await client.streamToVideoElement(v.id);
    g.streaming = true;
    notifyAnamStreamReady();
    wireAnamPanelBridge(client, g);
    scheduleOpeningTalk(client, g);
    return client;
  };
  try {
    return await Promise.race([
      connectWork(),
      sleep(CONNECT_TIMEOUT_MS).then(() => {
        throw new Error("Liga\xE7\xE3o Anam expirou (45s). Verifique rede, microfone e feche outras abas.");
      })
    ]);
  } catch (err) {
    try {
      await client.stopStreaming?.();
    } catch (_) {
    }
    g.client = null;
    g.streaming = false;
    window.__impetusAnamConnected = false;
    throw err;
  }
}
async function connectWithRetry(g) {
  if (g.streaming && g.client) {
    return g.client;
  }
  return runConnectExclusive(async () => {
    if (g.streaming && g.client) {
      return g.client;
    }
    if (g.connectPromise) {
      return g.connectPromise;
    }
    g.connectPromise = (async () => {
      await ensureStoppedBeforeConnect(g);
      let lastErr;
      for (let attempt = 0; attempt < CONCURRENCY_WAITS_MS.length; attempt += 1) {
        try {
          return await connectOnceInternal(g);
        } catch (err) {
          lastErr = err;
          if (!isConcurrencyError(err)) {
            throw err;
          }
          await stopAnamStreamNow();
          await prepareServerSlot();
          const waitMs = CONCURRENCY_WAITS_MS[attempt] || 12e3;
          await sleep(waitMs);
        }
      }
      throw lastErr;
    })();
    try {
      return await g.connectPromise;
    } finally {
      g.connectPromise = null;
    }
  });
}
async function acquireAnamStream({ mountEl }) {
  const g = getState();
  if (mountEl) g.lastMountEl = mountEl;
  tryAcquireTabLock();
  const openingThisVisit = g.consumers === 0;
  g.consumers += 1;
  clearTimers(g);
  if (g.streaming && g.client) {
    await waitForVideoInDocument(g, mountEl);
    bindAnamMediaToDom(g);
    wireAnamPanelBridge(g.client, g);
    notifyAnamStreamReady();
    return { reused: true, videoId: SHARED_VIDEO_ID };
  }
  await connectWithRetry(g);
  return { reused: false, videoId: SHARED_VIDEO_ID };
}
function releaseAnamStream() {
  const g = getState();
  g.consumers = Math.max(0, g.consumers - 1);
  if (g.consumers > 0) return;
  clearTimers(g);
  g.graceTimer = setTimeout(() => {
    g.graceTimer = null;
    if (g.consumers > 0) return;
    void stopAnamStreamNow();
  }, UNMOUNT_GRACE_MS);
}
async function stopAnamStreamNow() {
  const g = getState();
  if (g.stopInFlight) {
    return g.stopInFlight;
  }
  g.stopInFlight = (async () => {
    clearTimers(g);
    g.consumers = 0;
    g.connectPromise = null;
    g.streaming = false;
    window.__impetusAnamConnected = false;
    g.openingTalkDone = false;
    unwireAnamPanelBridge(g);
    if (g.streamReadyCleanup) g.streamReadyCleanup();
    releaseTabLock();
    const client = g.client;
    g.client = null;
    if (client) {
      try {
        await client.stopStreaming?.();
      } catch (_) {
      }
    }
    const video = g.videoEl || document.getElementById(SHARED_VIDEO_ID);
    if (video) {
      try {
        video.pause();
        video.srcObject = null;
      } catch (_) {
      }
    }
    g.videoEl = video || null;
    g.pendingVideoStream = null;
    g.pendingAudioStream = null;
    const audio = g.audioEl || document.getElementById(SHARED_AUDIO_ID);
    if (audio) {
      try {
        audio.pause();
        audio.srcObject = null;
      } catch (_) {
      }
    }
    g.audioEl = audio || null;
    await prepareServerSlot();
  })();
  try {
    await g.stopInFlight;
  } finally {
    g.stopInFlight = null;
  }
}
function isAnamSessionActive() {
  const g = getState();
  return Boolean(g.streaming && g.client);
}
var import_js_sdk2, SHARED_VIDEO_ID, SHARED_AUDIO_ID, UNMOUNT_GRACE_MS, TAB_LOCK_KEY, TAB_LOCK_TTL_MS, CONCURRENCY_WAITS_MS, CONNECT_TIMEOUT_MS, ANAM_STREAM_READY_EVENT, connectMutex;
var init_anamSessionSingleton = __esm({
  "../../../../services/anamSessionSingleton.js"() {
    import_js_sdk2 = __toESM(require_main(), 1);
    init_api();
    init_anamGreeting();
    init_anamPanelBridge();
    SHARED_VIDEO_ID = "impetus-anam-shared-video";
    SHARED_AUDIO_ID = "impetus-anam-shared-audio";
    UNMOUNT_GRACE_MS = 800;
    TAB_LOCK_KEY = "impetus_anam_tab_lock";
    TAB_LOCK_TTL_MS = 12e3;
    CONCURRENCY_WAITS_MS = [2e3, 5e3, 8e3, 12e3];
    CONNECT_TIMEOUT_MS = 45e3;
    ANAM_STREAM_READY_EVENT = "impetus-anam-stream-ready";
    connectMutex = Promise.resolve();
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(TAB_LOCK_KEY);
        if (raw) {
          const lock = JSON.parse(raw);
          if (Date.now() - (lock.at || 0) > TAB_LOCK_TTL_MS) {
            localStorage.removeItem(TAB_LOCK_KEY);
          }
        }
      } catch (_) {
      }
      window.addEventListener("beforeunload", () => {
        void stopAnamStreamNow();
      });
      window.addEventListener("impetus-logout", () => {
        void stopAnamStreamNow();
      });
      window.addEventListener("storage", (ev) => {
        if (ev.key === "impetus_token" && !ev.newValue) {
          void stopAnamStreamNow();
        }
      });
    }
  }
});

// ../../../../services/api.js
function normalizeApiBase(raw) {
  if (raw === void 0 || raw === null || String(raw).trim() === "") return "/api";
  const t = String(raw).trim().replace(/\/$/, "");
  if (t === "/api") return "/api";
  if (t.endsWith("/api")) return t;
  if (/^https?:\/\//i.test(t)) return `${t}/api`;
  return t;
}
function handleFinalError(error) {
  const urlPath = error.config?.url || "";
  const isProacaoRequest = urlPath.includes("/proacao");
  const isLoginRequest = urlPath.includes("/auth/login");
  if (error.response?.status === 401 && !isProacaoRequest && !isLoginRequest) {
    localStorage.removeItem("impetus_token");
    localStorage.removeItem("impetus_user");
    Promise.resolve().then(() => (init_anamSessionSingleton(), anamSessionSingleton_exports)).then((m) => m.stopAnamStreamNow()).catch(() => {
    });
    window.location.href = "/";
  }
  if (error.response?.status === 403 && error.response?.data?.code === "LICENSE_INVALID") {
    error.apiMessage = "Licen\xE7a inv\xE1lida ou expirada. Entre em contato com o suporte.";
    window.location.href = "/license-expired";
  } else if (error.response?.status === 403 && error.response?.data?.code === "COMPANY_INACTIVE") {
    error.apiMessage = error.response?.data?.error || "Assinatura em atraso. Regularize o pagamento para continuar.";
    window.location.href = error.response?.data?.redirect || "/subscription-expired";
  } else if (error.response?.status === 403 && /^INDUSTRIAL_/.test(error.response?.data?.code || "")) {
    error.apiMessage = error.response?.data?.error || "Permiss\xE3o insuficiente para esta a\xE7\xE3o no m\xF3dulo Integra\xE7\xE3o Industrial.";
  } else if (error.response?.status === 403 && error.response?.data?.code === "ROLE_VERIFICATION_REQUIRED") {
    error.apiMessage = error.response?.data?.error || "Valide seu cargo para acessar dados estrat\xE9gicos.";
    error.needsRoleVerification = true;
    if (typeof window !== "undefined" && !window.location.pathname.includes("/validacao-cargo")) {
      window.location.href = "/validacao-cargo";
    }
  } else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    error.apiMessage = "Tempo esgotado. Verifique sua conex\xE3o e tente novamente.";
  } else if (error.code === "ERR_NETWORK") {
    error.apiMessage = "Sem conex\xE3o. Verifique sua internet.";
  } else if (error.response?.data?.error) {
    error.apiMessage = error.response.data.error;
  } else {
    error.apiMessage = error.message || "Erro ao processar requisi\xE7\xE3o";
  }
  return Promise.reject(error);
}
var import_meta, API_URL, REQUEST_TIMEOUT_MS, MAX_RETRIES, RETRY_DELAY_MS, api, anam, dashboard, api_default;
var init_api = __esm({
  "../../../../services/api.js"() {
    init_axios2();
    import_meta = {};
    API_URL = normalizeApiBase(import_meta.env.VITE_API_URL);
    REQUEST_TIMEOUT_MS = 6e4;
    MAX_RETRIES = 2;
    RETRY_DELAY_MS = 1e3;
    api = axios_default.create({
      baseURL: API_URL,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json"
      }
    });
    api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("impetus_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (config.data instanceof FormData) {
          delete config.headers["Content-Type"];
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    api.interceptors.response.use(
      (response) => {
        try {
          const url2 = String(response.config?.url || "");
          const method = String(response.config?.method || "").toLowerCase();
          if (method === "post" && (url2.includes("/dashboard/chat") || url2.includes("/dashboard/chat-multimodal") || url2.includes("/cognitive-council/execute"))) {
            const tid = response.headers?.["x-ai-trace-id"] || response.headers?.["X-AI-Trace-ID"];
            if (tid && typeof sessionStorage !== "undefined") {
              sessionStorage.setItem("impetus_last_ai_trace_id", tid);
            }
          }
        } catch (_) {
        }
        return response;
      },
      async (error) => {
        const config = error.config || {};
        if (error.response?.status === 401 || error.response?.status === 403) {
          return handleFinalError(error);
        }
        const retryCount = config.__retryCount ?? 0;
        const noRetryBody = config.data instanceof FormData;
        const isRetryable = !noRetryBody && retryCount < MAX_RETRIES && (["ECONNABORTED", "ERR_NETWORK", "ETIMEDOUT"].includes(error.code) || [502, 503, 504].includes(error.response?.status));
        if (isRetryable) {
          config.__retryCount = retryCount + 1;
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
          await new Promise((r) => setTimeout(r, Math.min(delay, 5e3)));
          return api.request(config);
        }
        return handleFinalError(error);
      }
    );
    anam = {
      /** Sem JWT — só indica se ANAM_API_KEY está no servidor */
      getPublicConfig: () => api.get("/anam/public-config"),
      getConfig: () => api.get("/anam/config"),
      prepareSession: () => api.post("/anam/prepare"),
      createSessionToken: (body) => api.post("/anam/session-token", body || {})
    };
    dashboard = {
      /** Dashboard inteligente - payload completo personalizado por perfil */
      getMe: (config = {}) => api.get("/dashboard/me", config),
      /** Contexto interno + regras de acesso (Realtime / Anam ao vivo) */
      getVoiceRealtimeContext: (params) => api.get("/dashboard/voice-realtime-context", {
        params: { channel: "anam_voice", force: "1", ...params || {} }
      }),
      /** FASE 34 — validação shadow de transcript de voz (não altera áudio) */
      voiceTruthShadowValidate: (body) => api.post("/dashboard/voice-truth-shadow-validate", body),
      /** Layout personalizado (perfil, modulos, assistente_ia, layout, layout_rules_version para telemetria/debug) */
      getPersonalizado: () => api.get("/dashboard/personalizado"),
      /** Painel vivo dinamico orientado a eventos */
      getLiveSurface: () => api.get("/dashboard/live-surface"),
      /** Pulso cognitivo — centro global, feed, timeline, heatmap, radar */
      getCognitivePulse: () => api.get("/dashboard/cognitive-pulse"),
      getConfig: () => api.get("/dashboard/config"),
      savePreferences: (data) => api.post("/dashboard/preferences", data),
      saveFavoriteKpis: (favorite_kpis) => api.post("/dashboard/favorite-kpis", { favorite_kpis }),
      trackInteraction: (event_type, entity_type, entity_id, context) => api.post("/dashboard/track-interaction", { event_type, entity_type, entity_id, context }),
      /** Painel de comando visual (IA + dados reais, permissões no servidor) */
      runPanelCommand: (command) => api.post("/dashboard/panel-command", { command }),
      /** Painel visual pós-voz (Claude): transcrição utilizador + resposta assistente */
      runClaudePanel: (body) => api.post("/dashboard/claude-panel", {
        userTranscript: String(body?.userTranscript ?? "").slice(0, 8e3),
        assistantResponse: String(body?.assistantResponse ?? "").slice(0, 8e3)
      }),
      /** Preferências de perfil / IA (próprio utilizador) */
      patchProfileContext: (body) => api.patch("/dashboard/profile-context", body),
      getWidgets: () => api.get("/dashboard/widgets"),
      getDynamicLayout: () => api.get("/dashboard/dynamic-layout"),
      /** Dashboard Inteligente Dinâmico do colaborador — layout gerado por perfil */
      getColaboradorDynamicLayout: () => api.get("/dashboard/colaborador/dynamic-layout"),
      getSummary: () => api.get("/dashboard/summary"),
      getTrend: (months = 6) => api.get(`/dashboard/trend?months=${months}`),
      getChartsBundle: () => api.get("/dashboard/charts/bundle"),
      getProductionDemand: (weeks = 8) => api.get(`/dashboard/charts/production-demand?weeks=${weeks}`),
      getPulseClimate: (weeks = 8) => api.get(`/dashboard/charts/pulse-climate?weeks=${weeks}`),
      getInsights: (limit = 10, offset = 0) => api.get(`/dashboard/insights?limit=${limit}&offset=${offset}`),
      getRecentInteractions: (limit = 10, offset = 0) => api.get(`/dashboard/recent-interactions?limit=${limit}&offset=${offset}`),
      getKPIs: () => api.get("/dashboard/kpis"),
      getPlcAlerts: (acknowledged = false) => api.get(`/plc-alerts?acknowledged=${acknowledged}`),
      acknowledgePlcAlert: (id) => api.post(`/plc-alerts/${id}/acknowledge`),
      getSmartSummary: () => api.get("/dashboard/smart-summary"),
      chat: (message, history = [], opts = {}) => {
        let last_ai_trace_id;
        try {
          last_ai_trace_id = sessionStorage.getItem("impetus_last_ai_trace_id") || void 0;
        } catch (_) {
          last_ai_trace_id = void 0;
        }
        return api.post("/dashboard/chat", {
          message,
          history,
          ...last_ai_trace_id ? { last_ai_trace_id } : {},
          ...opts.voiceMode ? { voiceMode: true } : {},
          ...opts.sentimentContext ? { sentimentContext: opts.sentimentContext } : {},
          ...opts.panelContext ? { voice_panel_context: String(opts.panelContext).slice(0, 6e3) } : {}
        });
      },
      chatWithHeader: (message, history = [], headers = {}, opts = {}) => {
        let last_ai_trace_id;
        try {
          last_ai_trace_id = sessionStorage.getItem("impetus_last_ai_trace_id") || void 0;
        } catch (_) {
          last_ai_trace_id = void 0;
        }
        return api.post(
          "/dashboard/chat",
          {
            message,
            history,
            ...last_ai_trace_id ? { last_ai_trace_id } : {},
            ...opts.voiceMode ? { voiceMode: true } : {}
          },
          { headers }
        );
      },
      /** Confirmação de proposta system_influence (chat) — alinhado a POST /api/operational/confirm-action */
      confirmOperationalSystemInfluence: (body) => api.post("/operational/confirm-action", body),
      /** Rollback controlado — corpo { rollback_context } devolvido na confirmação */
      rollbackOperationalSystemInfluence: (body) => api.post("/operational/rollback-action", body),
      chatMultimodal: (payload = {}) => {
        let last_ai_trace_id;
        try {
          last_ai_trace_id = sessionStorage.getItem("impetus_last_ai_trace_id") || void 0;
        } catch (_) {
          last_ai_trace_id = void 0;
        }
        return api.post("/dashboard/chat-multimodal", {
          ...payload,
          ...last_ai_trace_id ? { last_ai_trace_id } : {}
        });
      },
      uploadChatFile: (formData) => api.post("/dashboard/chat/upload-file", formData),
      /** STT — gravar áudio no cliente e enviar; retorna { ok, transcript } */
      transcribeChatAudio: (audioBlob, opts = {}) => {
        const fd = new FormData();
        fd.append("audio", audioBlob, opts.filename || "voice.webm");
        fd.append("language", opts.language || "pt");
        if (opts.prompt) fd.append("prompt", opts.prompt);
        return api.post("/dashboard/chat/voice/transcribe", fd);
      },
      /** Legado — preferir voz OpenAI em /dashboard/chat/voice/speak */
      gerarVoz: (texto, falar = true) => api.post("/voz", { texto: texto || "", falar: !!falar }),
      getVoicePreferences: () => api.get("/dashboard/chat/voice/preferences"),
      putVoicePreferences: (body) => api.put("/dashboard/chat/voice/preferences", body),
      formatVoiceAlert: (alert_data) => api.post("/dashboard/chat/voice/format-alert", { alert_data }),
      /** TTS boas-vindas SSML (variant full|short, userDisplayName, spellName opcional) */
      speakWelcome: (body = {}) => api.post("/dashboard/chat/voice/welcome", body, { responseType: "arraybuffer" }),
      logActivity: (data) => api.post("/dashboard/log-activity", data),
      getVisibility: () => api.get("/dashboard/visibility"),
      getUserContext: () => api.get("/dashboard/user-context"),
      executiveQuery: (query, modoApresentacao = false) => api.post("/dashboard/executive-query", { query, modoApresentacao }),
      orgAIAssistant: (question) => api.post("/dashboard/org-ai-assistant", { question }),
      // Dashboard operacional manutenção (perfil mecânico)
      maintenance: {
        getSummary: () => api.get("/dashboard/maintenance/summary"),
        getCards: () => api.get("/dashboard/maintenance/cards"),
        getMyTasks: () => api.get("/dashboard/maintenance/my-tasks"),
        getMachinesAttention: () => api.get("/dashboard/maintenance/machines-attention"),
        getInterventions: () => api.get("/dashboard/maintenance/interventions"),
        getPreventives: () => api.get("/dashboard/maintenance/preventives"),
        getPreventivesBoard: () => api.get("/dashboard/maintenance/preventives-board"),
        getRecurringFailures: () => api.get("/dashboard/maintenance/recurring-failures")
      },
      // Cadastrar com IA - upload multimodal (texto, imagem, documento, áudio)
      cadastrarComIA: {
        cadastrar: (formData) => api.post("/cadastrar-com-ia", formData),
        listar: (categoria, limit) => api.get("/cadastrar-com-ia", { params: { categoria, limit } })
      },
      // Cérebro Operacional - Painel de Inteligência Operacional
      operationalBrain: {
        getSummary: (params) => api.get("/dashboard/operational-brain/summary", { params }),
        getKnowledgeMap: () => api.get("/dashboard/operational-brain/knowledge-map"),
        getInsights: (params) => api.get("/dashboard/operational-brain/insights", { params }),
        markInsightRead: (id) => api.post(`/dashboard/operational-brain/insights/${id}/read`),
        getAlerts: (params) => api.get("/dashboard/operational-brain/alerts", { params }),
        resolveAlert: (id) => api.post(`/dashboard/operational-brain/alerts/${id}/resolve`),
        getTimeline: (params) => api.get("/dashboard/operational-brain/timeline", { params }),
        checkAlerts: () => api.post("/dashboard/operational-brain/check-alerts")
      },
      industrial: {
        getStatus: () => api.get("/dashboard/industrial/status"),
        getEvents: (params) => api.get("/dashboard/industrial/events", { params }),
        getProfiles: () => api.get("/dashboard/industrial/profiles"),
        getAutomation: () => api.get("/dashboard/industrial/automation"),
        setAutomation: (mode) => api.post("/dashboard/industrial/automation", { mode }),
        sendCommand: (data) => api.post("/dashboard/industrial/command", data),
        getMachines: () => api.get("/dashboard/industrial/machines"),
        addMachine: (data) => api.post("/dashboard/industrial/machines", data),
        updateMachine: (id, data) => api.put(`/dashboard/industrial/machines/${id}`, data),
        deleteMachine: (id) => api.delete(`/dashboard/industrial/machines/${id}`)
      },
      forecasting: {
        getProjections: (metric) => api.get("/dashboard/forecasting/projections", { params: { metric: metric || "eficiencia" } }),
        getAlerts: (limit) => api.get("/dashboard/forecasting/alerts", { params: { limit: limit || 15 } }),
        getSimulation: (hours) => api.get("/dashboard/forecasting/simulation", { params: { hours: hours || 48 } }),
        getHealth: () => api.get("/dashboard/forecasting/health"),
        ask: (question) => api.post("/dashboard/forecasting/ask", { question }),
        getExtendedProjections: () => api.get("/dashboard/forecasting/extended-projections"),
        getProfitLoss: (days) => api.get("/dashboard/forecasting/profit-loss", { params: { days: days || 14 } }),
        getCriticalFactors: () => api.get("/dashboard/forecasting/critical-factors"),
        simulateDecision: (action, value) => api.post("/dashboard/forecasting/simulate-decision", { action, value }),
        getConfig: () => api.get("/dashboard/forecasting/config"),
        updateConfig: (data) => api.put("/dashboard/forecasting/config", data)
      },
      costs: {
        getExecutiveSummary: () => api.get("/dashboard/costs/executive-summary"),
        getByOrigin: () => api.get("/dashboard/costs/by-origin"),
        getTopLoss: () => api.get("/dashboard/costs/top-loss"),
        getProjectedLoss: () => api.get("/dashboard/costs/projected-loss"),
        listItems: () => api.get("/dashboard/costs/items"),
        createItem: (data) => api.post("/dashboard/costs/items", data),
        updateItem: (id, data) => api.put(`/dashboard/costs/items/${id}`, data),
        deleteItem: (id) => api.delete(`/dashboard/costs/items/${id}`)
      },
      financialLeakage: {
        getMap: () => api.get("/dashboard/financial-leakage/map"),
        getRanking: () => api.get("/dashboard/financial-leakage/ranking"),
        getAlerts: () => api.get("/dashboard/financial-leakage/alerts"),
        getReport: () => api.get("/dashboard/financial-leakage/report"),
        getProjectedImpact: () => api.get("/dashboard/financial-leakage/projected-impact")
      }
    };
    api_default = api;
  }
});

// ../ExecutivePortalWorkspace.jsx
var ExecutivePortalWorkspace_exports = {};
__export(ExecutivePortalWorkspace_exports, {
  ExecutivePortalWorkspace: () => ExecutivePortalWorkspace,
  default: () => ExecutivePortalWorkspace_default
});
module.exports = __toCommonJS(ExecutivePortalWorkspace_exports);
var import_react9 = __toESM(require("react"), 1);
var import_ExecutivePortal = __toESM(require_ExecutivePortal(), 1);
var import_ExecutiveCockpitPage = __toESM(require_executive_cockpit_page_stub(), 1);

// ../../decision-visualization/DecisionVisualizationPage.jsx
var import_react8 = __toESM(require("react"), 1);
var import_DecisionVisualization3 = __toESM(require_DecisionVisualization(), 1);

// ../../decision-visualization/DecisionVisualizationContainer.jsx
var import_react7 = __toESM(require("react"), 1);
var import_DecisionVisualization2 = __toESM(require_DecisionVisualization(), 1);

// ../../decision-visualization/useDecisionVisualizationViewModel.js
var import_react = require("react");

// ../../decision-visualization/decisionVisualizationViewModelLoader.js
function createDecisionVisualizationCache() {
  return {
    viewModel: null,
    promise: null,
    companyId: null
  };
}
async function loadDecisionVisualizationViewModel(companyId, cache, fetcher) {
  if (!companyId) {
    return { ok: false, error: "companyId inv\xE1lido" };
  }
  if (cache.companyId !== companyId) {
    cache.companyId = companyId;
    cache.viewModel = null;
    cache.promise = null;
  }
  if (cache.viewModel) {
    return cache.viewModel;
  }
  if (cache.promise) {
    return cache.promise;
  }
  cache.promise = Promise.resolve(fetcher(companyId)).then((result) => {
    cache.viewModel = result;
    cache.promise = null;
    return result;
  }).catch((err) => {
    cache.promise = null;
    throw err;
  });
  return cache.promise;
}
function clearDecisionVisualizationCache(cache) {
  cache.viewModel = null;
  cache.promise = null;
  cache.companyId = null;
}

// ../../decision-visualization/decisionVisualizationGateway.js
init_api();
async function fetchDecisionVisualizationViewModel(_companyId) {
  const { data } = await api_default.get("/aioi/executive-cockpit/view-model-bundle");
  if (!data?.ok) {
    return { ok: false, error: data?.error || "Falha ao carregar view model bundle" };
  }
  const viewModel = data.decision_visualization_view_model;
  if (!viewModel) {
    return { ok: false, error: "decision_visualization_view_model indispon\xEDvel" };
  }
  return { ok: true, viewModel };
}

// ../../decision-visualization/useDecisionVisualizationViewModel.js
var INITIAL_STATE = {
  status: "idle",
  viewModel: null,
  error: null,
  readOnly: true
};
function useDecisionVisualizationViewModel(companyId, options = {}) {
  const fetcher = options.fetcher || fetchDecisionVisualizationViewModel;
  const cacheRef = (0, import_react.useRef)(createDecisionVisualizationCache());
  const [state, setState] = (0, import_react.useState)(INITIAL_STATE);
  const reload = (0, import_react.useCallback)(async () => {
    if (!companyId) {
      setState({ status: "empty", viewModel: null, error: null, readOnly: true });
      return;
    }
    setState((prev) => ({
      ...prev,
      status: "loading",
      error: null,
      readOnly: true
    }));
    try {
      const result = await loadDecisionVisualizationViewModel(
        companyId,
        cacheRef.current,
        fetcher
      );
      if (!result?.ok) {
        setState({
          status: "error",
          viewModel: null,
          error: result?.error || "Falha ao carregar view model",
          readOnly: true
        });
        return;
      }
      setState({
        status: "ready",
        viewModel: result.viewModel,
        error: null,
        readOnly: true
      });
    } catch (err) {
      setState({
        status: "error",
        viewModel: null,
        error: err?.message || "Erro de rede",
        readOnly: true
      });
    }
  }, [companyId, fetcher]);
  (0, import_react.useEffect)(() => {
    reload();
  }, [reload]);
  const invalidateCache = (0, import_react.useCallback)(() => {
    clearDecisionVisualizationCache(cacheRef.current);
  }, []);
  return {
    ...state,
    reload,
    invalidateCache
  };
}

// ../../decision-visualization/DecisionPerspectiveCard.jsx
var import_react3 = __toESM(require("react"), 1);

// ../../decision-visualization/DecisionVisualizationSection.jsx
var import_react2 = __toESM(require("react"), 1);
var import_DecisionVisualization = __toESM(require_DecisionVisualization(), 1);
var import_jsx_runtime = require("react/jsx-runtime");
function formatLabel(key) {
  return String(key).replace(/_/g, " ");
}
function DecisionVisualizationSection({ label, data, testId }) {
  const entries = data && typeof data === "object" && !Array.isArray(data) ? Object.entries(data) : [];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "section",
    {
      className: import_DecisionVisualization.default.card,
      "data-testid": testId,
      "aria-label": label,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: import_DecisionVisualization.default.cardTitle, children: label }),
        entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: import_DecisionVisualization.default.empty, "aria-live": "polite", children: "\u2014" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", { className: import_DecisionVisualization.default.fieldList, children: entries.map(([key, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: import_DecisionVisualization.default.fieldRow, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { className: import_DecisionVisualization.default.fieldKey, children: formatLabel(key) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { className: import_DecisionVisualization.default.fieldValue, children: value === null || value === void 0 ? "\u2014" : String(value) })
        ] }, key)) })
      ]
    }
  );
}

// ../../decision-visualization/DecisionPerspectiveCard.jsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function DecisionPerspectiveCard({ data }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    DecisionVisualizationSection,
    {
      label: "Decision Perspective",
      data,
      testId: "decision-perspective-card"
    }
  );
}
var DecisionPerspectiveCard_default = DecisionPerspectiveCard;

// ../../decision-visualization/DecisionConsistencyCard.jsx
var import_react4 = __toESM(require("react"), 1);
var import_jsx_runtime3 = require("react/jsx-runtime");
function DecisionConsistencyCard({ data }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    DecisionVisualizationSection,
    {
      label: "Decision Consistency",
      data,
      testId: "decision-consistency-card"
    }
  );
}
var DecisionConsistencyCard_default = DecisionConsistencyCard;

// ../../decision-visualization/DecisionCoverageCard.jsx
var import_react5 = __toESM(require("react"), 1);
var import_jsx_runtime4 = require("react/jsx-runtime");
function DecisionCoverageCard({ data }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    DecisionVisualizationSection,
    {
      label: "Decision Visualization Coverage",
      data,
      testId: "decision-coverage-card"
    }
  );
}
var DecisionCoverageCard_default = DecisionCoverageCard;

// ../../decision-visualization/EnterpriseDecisionVisualizationCard.jsx
var import_react6 = __toESM(require("react"), 1);
var import_jsx_runtime5 = require("react/jsx-runtime");
function EnterpriseDecisionVisualizationCard({ data }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    DecisionVisualizationSection,
    {
      label: "Enterprise Decision Visualization",
      data,
      testId: "enterprise-decision-visualization-card"
    }
  );
}
var EnterpriseDecisionVisualizationCard_default = EnterpriseDecisionVisualizationCard;

// ../../decision-visualization/DecisionVisualizationContainer.jsx
var import_jsx_runtime6 = require("react/jsx-runtime");
function DecisionStatePanel({ status, error }) {
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
    "div",
    {
      className: import_DecisionVisualization2.default.statePanel,
      role: "status",
      "aria-live": "polite",
      "data-testid": `decision-viz-state-${status}`,
      children: [
        status === "loading" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: import_DecisionVisualization2.default.loadingDot, "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: import_DecisionVisualization2.default.stateLabel, children: "Carregando" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: import_DecisionVisualization2.default.stateMessage, children: "A carregar view model P5.3\u2026" })
        ] }),
        status === "empty" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: import_DecisionVisualization2.default.stateLabel, children: "Sem tenant" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: import_DecisionVisualization2.default.stateMessage, children: "Selecione uma empresa para visualizar decis\xF5es." })
        ] }),
        status === "error" && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: import_DecisionVisualization2.default.stateLabel, children: "Erro" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: `${import_DecisionVisualization2.default.stateMessage} ${import_DecisionVisualization2.default.stateError}`, children: error })
        ] })
      ]
    }
  );
}
function DecisionVisualizationContainer({ companyId, fetcher }) {
  const { status, viewModel, error, readOnly } = useDecisionVisualizationViewModel(companyId, {
    fetcher
  });
  if (status === "loading" || status === "idle") {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(DecisionStatePanel, { status: "loading" });
  }
  if (status === "empty") {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(DecisionStatePanel, { status: "empty" });
  }
  if (status === "error") {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(DecisionStatePanel, { status: "error", error });
  }
  const data = viewModel?.contract?.data || {};
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
    readOnly && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: import_DecisionVisualization2.default.readOnlyBadge, "data-testid": "decision-viz-read-only-badge", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: import_DecisionVisualization2.default.readOnlyBadgeDot, "aria-hidden": "true" }),
      "Read Only"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
      "section",
      {
        className: import_DecisionVisualization2.default.grid,
        "data-testid": "decision-visualization-grid",
        "aria-label": "Decision Visualization",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(DecisionPerspectiveCard_default, { data: data.decision_perspective }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(DecisionConsistencyCard_default, { data: data.decision_consistency }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(DecisionCoverageCard_default, { data: data.decision_visualization_coverage }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(EnterpriseDecisionVisualizationCard_default, { data: data.enterprise_decision_visualization })
        ]
      }
    )
  ] });
}
var DecisionVisualizationContainer_default = DecisionVisualizationContainer;

// ../../decision-visualization/DecisionVisualizationPage.jsx
var import_jsx_runtime7 = require("react/jsx-runtime");
function DecisionVisualizationPage({ companyId, fetcher }) {
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
    "main",
    {
      className: import_DecisionVisualization3.default.page,
      "data-testid": "decision-visualization-page",
      "aria-label": "Enterprise Decision Visualization",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("header", { className: import_DecisionVisualization3.default.header, children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: import_DecisionVisualization3.default.headerEyebrow, children: "AIOI \xB7 P5.6" }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h1", { className: import_DecisionVisualization3.default.headerTitle, children: "Decision Visualization" }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: import_DecisionVisualization3.default.headerMeta, children: "View model soberano \xB7 somente visualiza\xE7\xE3o \xB7 zero execu\xE7\xE3o" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DecisionVisualizationContainer_default, { companyId, fetcher })
      ]
    }
  );
}
var DecisionVisualizationPage_default = DecisionVisualizationPage;

// ../ExecutivePortalNavigation.js
var EXECUTIVE_PORTAL_SECTIONS = [
  {
    id: "executive_cockpit",
    label: "Executive Cockpit",
    ready: true
  },
  {
    id: "decision_visualization",
    label: "Decision Visualization",
    ready: true
  },
  {
    id: "interface_intelligence",
    label: "Interface Intelligence",
    ready: false,
    placeholder: true
  },
  {
    id: "executive_reports",
    label: "Executive Reports",
    ready: false,
    placeholder: true
  }
];
function getExecutivePortalSection(sectionId) {
  return EXECUTIVE_PORTAL_SECTIONS.find((section) => section.id === sectionId) || null;
}
function isExecutivePortalPlaceholder(sectionId) {
  const section = getExecutivePortalSection(sectionId);
  return Boolean(section?.placeholder);
}

// ../ExecutivePortalWorkspace.jsx
var import_jsx_runtime8 = require("react/jsx-runtime");
function PortalPlaceholder({ section }) {
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    "div",
    {
      className: import_ExecutivePortal.default.placeholderPanel,
      role: "status",
      "aria-live": "polite",
      "data-testid": `portal-placeholder-${section.id}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: import_ExecutivePortal.default.placeholderLabel, children: "Placeholder" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h2", { className: import_ExecutivePortal.default.placeholderTitle, children: section.label }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: import_ExecutivePortal.default.placeholderMessage, children: "M\xF3dulo executivo futuro \u2014 somente visualiza\xE7\xE3o READ ONLY quando dispon\xEDvel." })
      ]
    }
  );
}
function PortalEmptyState() {
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    "div",
    {
      className: import_ExecutivePortal.default.statePanel,
      role: "status",
      "aria-live": "polite",
      "data-testid": "portal-workspace-empty",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: import_ExecutivePortal.default.stateLabel, children: "Sem tenant" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: import_ExecutivePortal.default.stateMessage, children: "Selecione um tenant para aceder \xE0s experi\xEAncias executivas." })
      ]
    }
  );
}
function PortalUnknownSection({ sectionId }) {
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    "div",
    {
      className: import_ExecutivePortal.default.statePanel,
      role: "alert",
      "data-testid": "portal-workspace-error",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: import_ExecutivePortal.default.stateLabel, children: "Sec\xE7\xE3o inv\xE1lida" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: `${import_ExecutivePortal.default.stateMessage} ${import_ExecutivePortal.default.stateError}`, children: sectionId || "unknown" })
      ]
    }
  );
}
function ExecutivePortalWorkspace({
  activeSection,
  companyId,
  tenantLabel,
  fetcher
}) {
  const section = getExecutivePortalSection(activeSection);
  if (!section) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PortalUnknownSection, { sectionId: activeSection });
  }
  if (!companyId && (section.id === "executive_cockpit" || section.id === "decision_visualization")) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PortalEmptyState, {});
  }
  if (section.id === "executive_cockpit") {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      "div",
      {
        className: import_ExecutivePortal.default.workspace,
        "data-testid": "portal-workspace-cockpit",
        "aria-label": "Executive Cockpit Workspace",
        children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_ExecutiveCockpitPage.default, { companyId, fetcher })
      }
    );
  }
  if (section.id === "decision_visualization") {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      "div",
      {
        className: import_ExecutivePortal.default.workspace,
        "data-testid": "portal-workspace-decision_visualization",
        "aria-label": "Decision Visualization Workspace",
        children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(DecisionVisualizationPage_default, { companyId, fetcher })
      }
    );
  }
  if (isExecutivePortalPlaceholder(section.id)) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      "div",
      {
        className: import_ExecutivePortal.default.workspace,
        "data-testid": `portal-workspace-${section.id}`,
        "aria-label": `${section.label} Workspace`,
        children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PortalPlaceholder, { section })
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PortalUnknownSection, { sectionId: activeSection });
}
var ExecutivePortalWorkspace_default = ExecutivePortalWorkspace;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ExecutivePortalWorkspace
});
/*! Bundled license information:

mime-db/index.js:
  (*!
   * mime-db
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015-2022 Douglas Christopher Wilson
   * MIT Licensed
   *)

mime-types/index.js:
  (*!
   * mime-types
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)
*/
