"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/amadeus/client/errors.ts
var ResponseError = class {
  constructor(response) {
    this.response = response.returnResponseError();
    this.description = [
      {
        code: 0,
        detail: "Unknown error",
        source: {
          pointer: ""
        },
        status: 0,
        title: "Unknown error"
      }
    ];
    this.determineDescription();
  }
  determineDescription() {
    if (!this.response || !this.response.parsed) return;
    const result = this.response.result;
    if (result && typeof result === "object" && "errors" in result && result.errors) {
      this.description = result.errors;
    } else if (result) {
      this.description = result;
    }
  }
};
var NetworkError = class extends ResponseError {
  constructor(...args) {
    super(...args);
    this.code = "NetworkError";
  }
};
var ParserError = class extends ResponseError {
  constructor(...args) {
    super(...args);
    this.code = "ParserError";
  }
};
var ServerError = class extends ResponseError {
  constructor(...args) {
    super(...args);
    this.code = "ServerError";
  }
};
var ClientError = class extends ResponseError {
  constructor(...args) {
    super(...args);
    this.code = "ClientError";
  }
};
var AuthenticationError = class extends ResponseError {
  constructor(...args) {
    super(...args);
    this.code = "AuthenticationError";
  }
};
var NotFoundError = class extends ResponseError {
  constructor(...args) {
    super(...args);
    this.code = "NotFoundError";
  }
};
var UnknownError = class extends ResponseError {
  constructor(...args) {
    super(...args);
    this.code = "UnknownError";
  }
};

// src/amadeus/client/index.ts
var _util = require('util'); var _util2 = _interopRequireDefault(_util);

// src/amadeus/client/validator.ts
var _http = require('http'); var http = _interopRequireWildcard(_http);
var _https = require('https'); var https = _interopRequireWildcard(_https);

// src/constants/index.ts
var HOSTS = {
  test: "test.travel.api.amadeus.com",
  production: "travel.api.amadeus.com"
};
var RECOGNIZED_OPTIONS = [
  "clientId",
  "clientSecret",
  "logger",
  "logLevel",
  "hostname",
  "host",
  "customAppId",
  "customAppVersion",
  "http",
  "ssl",
  "port"
];
var ListHTTPOverride = [
  "/v2/shopping/flight-offers",
  "/v1/shopping/seatmaps",
  "/v1/shopping/availability/flight-availabilities",
  "/v2/shopping/flight-offers/prediction",
  "/v1/shopping/flight-offers/pricing",
  "/v1/shopping/flight-offers/upselling"
];

// src/amadeus/client/validator.ts
var Validator = class {
  /**
   * Initialise the client's default value, ensuring the required values are
   * present
   *
   * @param  {Client} client the client object to set the defaults for
   * @param  {Object} options the associative array of options passed to the
   *  client on initialization
   */
  static validateAndInitialize(client, options) {
    this.initializeClientCredentials(client, options);
    this.initializeLogger(client, options);
    this.initializeHost(client, options);
    this.initializeCustomApp(client, options);
    this.initializeHttp(client, options);
    this.warnOnUnrecognizedOptions(options, client, RECOGNIZED_OPTIONS);
  }
  static initializeClientCredentials(client, options) {
    client.clientId = this.initRequired("clientId", options);
    client.clientSecret = this.initRequired("clientSecret", options);
  }
  static initializeLogger(client, options) {
    client.logLevel = this.initOptional(
      "logLevel",
      options,
      "silent"
    );
    client.logger = this.initOptional("logger", options, console);
  }
  static initializeHost(client, options) {
    const defaultHostname = process.env.NODE_ENV === "test" ? "test" : "production";
    const hostname = this.initOptional(
      "hostname",
      options,
      defaultHostname
    );
    client.host = this.initOptional("host", options, HOSTS[hostname]);
    client.port = this.initOptional("port", options, 443);
    client.ssl = this.initOptional("ssl", options, true);
  }
  static initializeCustomApp(client, options) {
    client.customAppId = this.initOptional("customAppId", options);
    client.customAppVersion = this.initOptional("customAppVersion", options);
  }
  static initializeHttp(client, options) {
    const network = client.ssl ? https : http;
    client.http = this.initOptional("http", options, network);
  }
  static initRequired(key, options) {
    const result = this.initOptional(key, options);
    if (!result) throw new ArgumentError(`Missing required argument: ${key}`);
    return result;
  }
  static initOptional(key, options, fallback) {
    const envKey = `AMADEUS_${key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`).toUpperCase()}`;
    const value = options[key] || process.env[envKey] || fallback;
    return value;
  }
  static warnOnUnrecognizedOptions(options, client, recognizedOptions) {
    Object.keys(options).forEach((key) => {
      if (recognizedOptions.indexOf(key) === -1 && client.warn()) {
        client.logger.log(`Unrecognized option: ${key}`);
      }
    });
  }
};
var ArgumentError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ArgumentError";
  }
};

// src/amadeus/client/request.ts
var _qs = require('qs'); var _qs2 = _interopRequireDefault(_qs);
var Request = class {
  constructor(options) {
    this.host = options.host;
    this.port = options.port;
    this.ssl = options.ssl;
    this.scheme = this.ssl ? "https" : "http";
    this.verb = options.verb;
    this.path = options.path;
    this.params = options.params;
    this.queryPath = this.fullQueryPath();
    this.bearerToken = options.bearerToken;
    this.clientVersion = options.clientVersion;
    this.languageVersion = options.languageVersion;
    this.appId = options.appId;
    this.appVersion = options.appVersion;
    this.headers = {
      "User-Agent": this.userAgent(),
      Accept: "application/json, application/vnd.amadeus+json"
    };
    this.addAuthorizationHeader();
    this.addContentTypeHeader();
    this.addHTTPOverrideHeader();
  }
  /**
   * Compiles the options for the HTTP request.
   *
   * Used by Client.execute when executing this request against the server.
   *
   * @return {RequestOptions} an associative object of options to be passed into the
   *  Client.execute function
   * @public
   */
  options() {
    return {
      host: this.host,
      port: this.port,
      protocol: `${this.scheme}:`,
      path: this.queryPath,
      method: this.verb,
      headers: this.headers
    };
  }
  /**
   * Creats the body for the API call, serializing the params if the verb is POST.
   *
   * @return {any} the serialized params
   * @public
   */
  body() {
    if (this.verb !== "POST") return "";
    if (!this.bearerToken) return _qs2.default.stringify(this.params);
    return this.params;
  }
  /**
   * Builds up the custom User Agent
   *
   * @return {string} a user agent in the format "library/version language/version app/version"
   * @private
   */
  userAgent() {
    const userAgent = `amadeus-ts/${this.clientVersion} node/${this.languageVersion}`;
    if (!this.appId) return userAgent;
    return `${userAgent} ${this.appId}/${this.appVersion}`;
  }
  /**
   * Builds the full query path, combining the path with the query params if the
   * verb is 'GET'. For example: '/foo/bar?baz=qux'
   *
   * @return {string} the path and params combined into one string.
   * @private
   */
  fullQueryPath() {
    if (this.verb === "POST") return this.path;
    return `${this.path}?${_qs2.default.stringify(this.params, {
      arrayFormat: "comma"
    })}`;
  }
  /**
   * Adds an Authorization header if the BearerToken is present
   *
   * @private
   */
  addAuthorizationHeader() {
    if (!this.bearerToken) return;
    this.headers["Authorization"] = `Bearer ${this.bearerToken}`;
  }
  /**
   * Adds a Content-Type header if the HTTP method equals POST
   *
   * @private
   */
  addContentTypeHeader() {
    if (this.verb === "POST" && !this.bearerToken) {
      this.headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else {
      this.headers["Content-Type"] = "application/vnd.amadeus+json";
    }
  }
  /**
   * Adds HTTPOverride method if it is required
   *
   *  @private
   */
  addHTTPOverrideHeader() {
    if (this.verb === "POST" && ListHTTPOverride.includes(this.path)) {
      this.headers["X-HTTP-Method-Override"] = "GET";
    }
  }
};

// package.json
var package_default = {
  name: "amadeus-ts",
  version: "5.1.1",
  description: "Node library for the Amadeus travel APIs Written in TypeScript",
  type: "module",
  exports: {
    ".": {
      types: "./dist/index.d.ts",
      require: "./dist/index.cjs",
      import: "./dist/index.js"
    }
  },
  scripts: {
    prebuild: "pnpm lint && rimraf ./dist",
    build: "tsup",
    test: "vitest run",
    lint: "tsc",
    release: "pnpm build && pnpm publish --provenance --no-git-checks --access public"
  },
  keywords: [
    "amadeus",
    "travel",
    "api",
    "apis",
    "hotels",
    "flights",
    "sdk"
  ],
  author: "darseen, safiri",
  homepage: "https://developers.amadeus.com",
  repository: {
    url: "https://github.com/darseen/amadeus-ts"
  },
  license: "MIT",
  packageManager: "pnpm@10.4.1+sha512.c753b6c3ad7afa13af388fa6d808035a008e30ea9993f58c6663e2bc5ff21679aa834db094987129aa4d488b86df57f7b634981b2f827cdcacc698cc0cfb88af",
  dependencies: {
    qs: "^6.14.0"
  },
  devDependencies: {
    "@types/node": "^22.13.4",
    "@types/qs": "^6.9.18",
    rimraf: "^6.0.1",
    tsup: "^8.3.6",
    typescript: "^5.7.3",
    vitest: "^3.0.6"
  },
  pnpm: {
    onlyBuiltDependencies: [
      "esbuild"
    ]
  }
};

// src/amadeus/client/access-token.ts
var _events = require('events'); var _events2 = _interopRequireDefault(_events);
var TOKEN_BUFFER = 10;
var AccessToken = class {
  constructor() {
    this.expiresAt = 0;
  }
  /**
   * Fetches or returns a cached bearer token. Used by the Client to get a
   * token before making an API call.
   *
   * @param  {Client} client the Amadeus Client to make an API call with
   * @return {Promise.<Response, ResponseError>} a Promise
   * @public
   */
  bearerToken(client) {
    const emitter = new (0, _events2.default)();
    const promise = this.promise(emitter);
    this.emitOrLoadAccessToken(client, emitter);
    return promise;
  }
  /**
   * Builds a promise to be returned to the API user
   *
   * @param  {EventEmitter} emitter the EventEmitter used to notify the Promise of
   * @return {Promise} a promise
   * @private
   */
  promise(emitter) {
    return new Promise((resolve, reject) => {
      emitter.on("resolve", (response) => resolve(response));
      emitter.on("reject", (error) => reject(error));
    });
  }
  /**
   * Checks if the token needs a refresh, if not emits the cached token,
   * otherwise tries to load a new access token
   *
   * @param  {Client} client the Amadeus Client to make an API call with
   * @param  {EventEmitter} emitter the EventEmitter used to emit the token
   * @private
   */
  emitOrLoadAccessToken(client, emitter) {
    if (this.needsLoadOrRefresh()) {
      this.loadAccessToken(client, emitter);
    } else {
      emitter.emit("resolve", this.accessToken);
    }
  }
  /**
   * Checks if the token needs a refresh or first load
   *
   * @return {boolean} wether the token needs a refresh
   * @private
   */
  needsLoadOrRefresh() {
    return !this.accessToken || Date.now() + TOKEN_BUFFER > this.expiresAt;
  }
  /**
   * Loads the access token using the client, emits the token when it's loaded
   *
   * @param  {Client} client the Amadeus Client to make an API call with
   * @param  {EventEmitter} emitter the EventEmitter used to emit the token
   * @private
   */
  loadAccessToken(client, emitter) {
    return __async(this, null, function* () {
      try {
        const response = yield client.unauthenticatedRequest("POST", "/v1/security/oauth2/token", {
          grant_type: "client_credentials",
          client_id: client.clientId,
          client_secret: client.clientSecret
        });
        this.storeAccessToken(response);
        this.emitOrLoadAccessToken(client, emitter);
      } catch (error) {
        emitter.emit("reject", error);
      }
    });
  }
  /**
   * Stores a loaded access token, calculating the expiry date
   *
   * @param  {Response} response the response object received from the client
   * @private
   */
  storeAccessToken(response) {
    var _a;
    this.accessToken = (_a = response.result) == null ? void 0 : _a.access_token;
    this.expiresAt = response.result ? Date.now() + response.result.expires_in * 1e3 : 0;
  }
};

// src/amadeus/client/index.ts


// src/amadeus/client/listener.ts


// src/amadeus/client/response.ts
var JSON_CONTENT_TYPES = ["application/json", "application/vnd.amadeus+json"];
var Response = class {
  constructor(http_response, request) {
    if (http_response instanceof Error) {
      this.headers = {};
      this.statusCode = void 0;
      this.error = http_response;
    } else {
      this.headers = http_response.headers || {};
      this.statusCode = http_response.statusCode;
      this.error = null;
    }
    this.request = request;
    this.body = "";
    this.result = null;
    this.data = null;
    this.parsed = false;
  }
  /**
   * Add a chunk received from the API to the body
   *
   * @param {string} chunk a chunk of data
   * @public
   */
  addChunk(chunk) {
    if (!this.error) this.body += chunk;
  }
  /**
   * Tries to parse the raw data
   * @public
   */
  parse() {
    if (this.error) return;
    try {
      if (this.statusCode === 204) return;
      if (this.isJson()) {
        this.result = JSON.parse(this.body);
        this.data = this.result.data;
        this.parsed = true;
      }
    } catch (error) {
      if (error instanceof Error) {
        this.error = error;
      }
    }
  }
  /**
   * Whether this API call can be considered a success. Used to wrap the response
   * into a ResponseError
   *
   * @return {boolean}
   * @public
   */
  success() {
    if (this.error) return false;
    if (this.statusCode === 204 || this.parsed && this.statusCode && this.statusCode < 300) {
      return true;
    }
    return false;
  }
  /**
   * Tests if the content is seemingly JSON
   *
   * @return {boolean}
   * @private
   */
  isJson() {
    return JSON_CONTENT_TYPES.indexOf(this.headers["content-type"]) !== -1;
  }
  /**
   * This method return only the data that the user needs,
   * and removes the ablility to use any of the public methods that can be used to manipulate the response.
   * It returns the response with 'result' and 'data' being possibly null that's the only difference between it and returnResponseSuccess method.
   *
   * @return {ReturnedResponseError}
   * @public
   */
  returnResponseError() {
    return {
      headers: this.headers,
      statusCode: this.statusCode,
      body: this.body,
      result: this.result,
      data: this.data,
      parsed: this.parsed,
      request: this.request
    };
  }
  /**
   * This method return only the data that the user needs,
   * and removes the ablility to use any of the public methods that can be used to manipulate the response.
   *
   * @return {ReturnedResponseSuccess}
   * @public
   */
  returnResponseSuccess() {
    return {
      headers: this.headers,
      statusCode: this.statusCode,
      body: this.body,
      result: this.result,
      data: this.data,
      parsed: this.parsed,
      request: this.request
    };
  }
};

// src/amadeus/client/listener.ts
var Listener = class {
  constructor(request, emitter, client) {
    this.request = request;
    this.emitter = emitter;
    this.client = client;
  }
  /**
   * Listens to various events on the http_response object, listening for data,
   * connections closing for bad reasons, and the end of the response.
   *
   * Used by the Client when making an API call.
   *
   * @param {IncomingMessage} httpResponse a Node http response object
   * @public
   */
  onResponse(httpResponse) {
    const response = new Response(httpResponse, this.request);
    httpResponse.on("data", (data) => response.addChunk(data));
    httpResponse.on("end", () => this.onEnd(response));
    httpResponse.on("close", () => this.onNetworkError(response));
    httpResponse.on("error", () => this.onNetworkError(response));
  }
  /**
   * Listens to a network error when making an API call.
   *
   * Used by the Client when making an API call.
   *
   * @param  {IncomingMessage|Error} httpResponse a Node http response object
   * @public
   */
  onError(error) {
    const response = new Response(error, this.request);
    this.onNetworkError(response);
  }
  /**
   * When the connection ends, check if the response can be parsed or not and
   * act accordingly.
   *
   * @param  {Response} response
   * @private
   */
  onEnd(response) {
    response.parse();
    if (response.success()) {
      this.onSuccess(response);
    } else {
      this.onFail(response);
    }
  }
  /**
   * When the response was successful, resolve the promise and return the
   * response object
   *
   * @param  {Response} response
   * @private
   */
  onSuccess(response) {
    this.log(response);
    this.emitter.emit("resolve", response.returnResponseSuccess());
  }
  /**
   * When the connection was not successful, determine the reason and resolve
   * the promise accordingly.
   *
   * @param {Response} response
   * @private
   */
  onFail(response) {
    const Error2 = this.errorFor({
      parsed: response.parsed,
      statusCode: response.statusCode
    });
    const error = new Error2(response);
    this.log(response, error);
    this.emitter.emit("reject", error);
  }
  /**
   * Find the right error for the given response.
   *
   * @param {Response} reponse
   * @returns {ResponseError}
   */
  errorFor({
    statusCode,
    parsed
  }) {
    if (statusCode === void 0) return NetworkError;
    if (statusCode >= 500) return ServerError;
    else if (statusCode === 401) return AuthenticationError;
    else if (statusCode === 404) return NotFoundError;
    else if (statusCode >= 400) return ClientError;
    else if (!parsed) return ParserError;
    else return UnknownError;
  }
  /**
   * When the connection ran into a network error, reject the promise with a
   * NetworkError.
   *
   * @param  {Response} response
   * @private
   */
  onNetworkError(response) {
    response.parse();
    const error = new NetworkError(response);
    this.log(response, error);
    this.emitter.emit("reject", error);
  }
  /**
   * Logs the response, when in debug mode
   *
   * @param  {Response} response the response object to log
   * @private
   */
  log(response, error = null) {
    if (this.client.debug()) {
      this.client.logger.log(_util2.default.inspect(response, false, null));
    }
    if (!this.client.debug() && this.client.warn() && error) {
      this.client.logger.log("Amadeus", error.code, error.description);
    }
  }
};

// src/amadeus/client/index.ts
var Client = class {
  constructor(options = {}) {
    Validator.validateAndInitialize(this, options);
    this.accessToken = new AccessToken();
    this.version = package_default.version;
  }
  /**
   * Make an authenticated GET API call.
   *
   * ```ts
   * amadeus.client.get('/v2/foo/bar', { some: 'data' });
   * ```
   * @param {string} path the full path of the API endpoint
   * @param {Object} [params={}] the query string parameters
   * @return {Promise<Response|ResponseError>} a Promise
   */
  get(path, params = {}) {
    return this.request("GET", path, params);
  }
  /**
   * Make an authenticated POST API call.
   *
   * ```ts
   * amadeus.client.post('/v2/foo/bar', { some: 'data' });
   * ```
   * @param {string} path the full path of the API endpoint
   * @param {Object} [params={}] the POST parameters
   * @return {Promise<Response|ResponseError>} a Promise
   */
  post(path, params = {}) {
    return this.request("POST", path, JSON.stringify(params));
  }
  /**
   * Make an authenticated DELETE API call.
   *
   * ```ts
   * amadeus.client.delete('/v2/foo/bar', { some: 'data' });
   * ```
   * @param {string} path the full path of the API endpoint
   * @param {Object} [params={}] the query string parameters
   * @return {Promise<Response|ResponseError>} a Promise
   */
  delete(path, params = {}) {
    return this.request("DELETE", path, params);
  }
  /**
   * Make an authenticated API call.
   *
   * ```ts
   * amadeus.client.call('GET', '/v2/foo/bar', { some: 'data' });
   * ```
   * @param {Verb} verb the HTTP method, for example `GET` or `POST`
   * @param {string} path the full path of the API endpoint
   * @param {Object} [params={}] the POST parameters
   * @return {Promise<Response|ResponseError>} a Promise
   * @public
   */
  request(_0, _1) {
    return __async(this, arguments, function* (verb, path, params = {}) {
      const bearerToken = yield this.accessToken.bearerToken(this);
      return this.unauthenticatedRequest(verb, path, params, bearerToken);
    });
  }
  /**
   * Make any kind of API call, authenticated or not
   *
   * Used by the .get, .post methods to make API calls.
   *
   * Sets up a new Promise and then excutes the API call, triggering the Promise
   * to be called when the API call fails or succeeds.
   *
   * @param {Verb} verb the HTTP method, for example `GET` or `POST`
   * @param {string} path the full path of the API endpoint
   * @param {Object} params the parameters to pass in the query or body
   * @param {string} [bearerToken=null] the BearerToken as generated by the
   *  AccessToken class
   * @return {Promise<Response|ResponseError>} a Promise
   * @public
   */
  unauthenticatedRequest(verb, path, params = {}, bearerToken = null) {
    const request = this.buildRequest(verb, path, params, bearerToken);
    this.log(request);
    const emitter = new (0, _events2.default)();
    const promise = this.buildPromise(emitter);
    this.execute(request, emitter);
    return promise;
  }
  /**
   * Actually executes the API call.
   *
   * @param {Request} request the request to execute
   * @param {EventEmitter} emitter the event emitter to notify of changes
   * @private
   */
  execute(request, emitter) {
    const http_request = this.http.request(request.options());
    const listener = new Listener(request, emitter, this);
    http_request.on("response", (response) => listener.onResponse(response));
    http_request.on("error", (error) => listener.onError(error));
    http_request.write(request.body());
    http_request.end();
  }
  /**
   * Builds a Request object to be used in the API call
   *
   * @param {Verb} verb the HTTP method, for example `GET` or `POST`
   * @param {string} path the full path of the API endpoint
   * @param {Object} params the parameters to pass in the query or body
   * @param {string} [bearerToken=null] the BearerToken as generated by the
   *  AccessToken class
   * @return {Request}
   * @private
   */
  buildRequest(verb, path, params, bearerToken = null) {
    return new Request({
      host: this.host,
      verb,
      path,
      params,
      bearerToken,
      clientVersion: this.version,
      languageVersion: process.versions.node,
      appId: this.customAppId || null,
      appVersion: this.customAppVersion || null,
      port: this.port,
      ssl: this.ssl
    });
  }
  /**
   * Builds a Promise to be returned to the API user
   *
   * @param  {EventEmitter} emitter the event emitter to notify of changes
   * @return {Promise} a promise
   * @private
   */
  buildPromise(emitter) {
    return new Promise((resolve, reject) => {
      emitter.on(
        "resolve",
        (response) => resolve(response)
      );
      emitter.on("reject", (error) => reject(error));
    });
  }
  /**
   * Logs the request, when in debug mode
   *
   * @param {Request} request the request object to log
   * @public
   */
  log(request) {
    if (this.debug()) {
      this.logger.log(_util2.default.inspect(request, false, null));
    }
  }
  /**
   * Determines if this client is in debug mode
   *
   * @return {boolean}
   */
  debug() {
    return this.logLevel === "debug";
  }
  /**
   * Determines if this client is in warn or debug mode
   *
   * @return {boolean}
   */
  warn() {
    return this.logLevel === "warn" || this.debug();
  }
};

// src/amadeus/namespaces/reference-data/airlines.ts
var Airlines = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Returns the airline name and code.
   *
   * @param {Object} params
   * @param {string} params.airlineCodes Code of the airline following IATA or ICAO standard.
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find to which airlines belongs IATA Code BA
   *
   * ```ts
   * amadeus.referenceData.airlines.get({
   *   airlineCodes : 'BA'
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/reference-data/airlines", params);
  }
};

// src/amadeus/namespaces/reference-data/location.ts
var Location = class {
  constructor(client, locationId) {
    this.client = client;
    this.locationId = locationId;
  }
  /**
   * Returns details for a specific airport
   *
   * @param {Object} params
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find details for location with ID 'ALHR'
   *
   * ```ts
   * amadeus.referenceData.location('ALHR').get();
   * ```
   */
  get(params = {}) {
    return this.client.get(`/v1/reference-data/locations/${this.locationId}`, params);
  }
};

// src/amadeus/namespaces/reference-data/locations/airports.ts
var Airports = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Returns a list of relevant airports near to a given point.
   *
   * @param {Object} params
   * @param {number} params.latitude latitude location to be at the center of
   *   the search circle - required
   * @param {number} params.longitude longitude location to be at the center of
   *   the search circle - required
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find the nearest airport to the 49.0000,2.55 lat/long
   *
   * ```ts
   * amadeus.referenceData.locations.airports.get({
   *   longitude: 49.0000,
   *   latitude: 2.55
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/reference-data/locations/airports", params);
  }
};

// src/amadeus/namespaces/reference-data/locations/cities.ts
var Cities = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Return a list of cities matching a given keyword..
   *
   * @param {Object} params
   * @param {string} params.keyword keyword that should represent
   * the start of a word in a city name
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Return a list of cities matching a keyword 'France'
   *
   * ```ts
   * amadeus.referenceData.locations.cities.get({
   *   keyword: 'FRANCE'
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/reference-data/locations/cities", params);
  }
};

// src/amadeus/namespaces/reference-data/locations/hotel.ts
var Hotel = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Returns a list of hotels for a given area.
   *
   * @param {Object} params
   * @param {string} params.keyword Location query keyword Example: PARI
   * @param {string} params.subType Category of search - To enter several value, repeat the query parameter    * Use HOTEL_LEISURE to target aggregators or HOTEL_GDS to target directly the chains
   * @return {Promise<Response|ResponseError>} a Promise
   *
   *  Find relevant points of interest within an area in Barcelona
   * ```ts
   * amadeus.referenceData.locations.hotel.get({
   *   keyword: 'PARIS',
   *   subType: 'HOTEL_GDS'
   * })
   * ```
   */
  get(params) {
    return this.client.get("/v1/reference-data/locations/hotel", params);
  }
};

// src/amadeus/namespaces/reference-data/locations/hotels/by-city.ts
var byCity = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Returns a list of hotels for a given area.
   *
   * @param {Object} params
   * @param {string} params.cityCode City IATA code
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find list of hotels in Barcelona
   *
   * ```ts
   * amadeus.referenceData.locations.hotels.byCity.get({
   *   cityCode: 'BCN'
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/reference-data/locations/hotels/by-city", params);
  }
};

// src/amadeus/namespaces/reference-data/locations/hotels/by-geocode.ts
var byGeocode = class {
  constructor(client) {
    this.client = client;
  }
  /**
   *  Returns a list of hotels for a given area.
   *
   * @param {Object} params
   * @param {number} params.latitude latitude location to be at the center of
   * the search circle - required
   * @param {number} params.longitude longitude location to be at the center of
   * the search circle - required
   * @return {Promise<Response|ResponseError>} a Promise
   *
   *  Returns a list of hotels within an area in Barcelona
   *
   * ```ts
   * amadeus.referenceData.locations.hotels.byGeocode.get({
      latitude: 48.83152,
      longitude: 2.24691
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/reference-data/locations/hotels/by-geocode", params);
  }
};

// src/amadeus/namespaces/reference-data/locations/hotels/by-hotels.ts
var byHotels = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Returns a list of hotels for a given area.
   *
   * @param {Object} params
   * @param {string} params.hotelIds Comma separated list of Amadeus hotel
   *   codes to request. Example: XKPARC12
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find relevant points of interest within an area in Barcelona
   * ```ts
   * amadeus.referenceData.locations.hotels.byHotels.get({
   *   hotelIds: 'ACPAR245'
   * })
   * ```
   */
  get(params) {
    return this.client.get("/v1/reference-data/locations/hotels/by-hotels", params);
  }
};

// src/amadeus/namespaces/reference-data/locations/hotels/index.ts
var Hotels = class {
  constructor(client) {
    this.client = client;
    this.byCity = new byCity(client);
    this.byGeocode = new byGeocode(client);
    this.byHotels = new byHotels(client);
  }
};

// src/amadeus/namespaces/reference-data/locations/points-of-interest/by-square.ts
var BySquare = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Returns a list of relevant points of interest for a given area.
   *
   * @param {Object} params
   * @param {number} params.north latitude north of bounding box - required
   * @param {number} params.west  longitude west of bounding box - required
   * @param {number} params.south latitude south of bounding box - required
   * @param {number} params.east  longitude east of bounding box - required
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find relevant points of interest within an area in Barcelona
   *
   * ```ts
   * amadeus.referenceData.locations.pointsOfInterest.bySquare.get({
   *   north: 41.397158,
   *   west: 2.160873,
   *   south: 41.394582,
   *   east: 2.177181
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/reference-data/locations/pois/by-square", params);
  }
};

// src/amadeus/namespaces/reference-data/locations/points-of-interest/index.ts
var PointsOfInterest = class {
  constructor(client) {
    this.client = client;
    this.bySquare = new BySquare(client);
  }
  /**
   * Returns a list of relevant points of interest near to a given point
   *
   * @param {Object} params
   * @param {number} params.latitude latitude location to be at the center of
   *   the search circle - required
   * @param {number} params.longitude longitude location to be at the center of
   *   the search circle - required
   * @param {number} params.radius radius of the search in Kilometer - optional
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find relevant points of interest close to Barcelona
   *
   * ```ts
   * amadeus.referenceData.locations.pointsOfInterest.get({
   *   longitude: 2.160873,
   *   latitude: 41.397158
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/reference-data/locations/pois", params);
  }
};

// src/amadeus/namespaces/reference-data/locations/points-of-interest/poi.ts
var PointOfInterest = class {
  constructor(client, poiId) {
    this.client = client;
    this.poiId = poiId;
  }
  /**
   * Extracts the information about point of interest with given ID
   *
   * Extract the information about point of interest with ID '9CB40CB5D0'
   * ```ts
   * amadeus.referenceData.locations.pointOfInterest('9CB40CB5D0').get();
   * ```
   */
  get() {
    return this.client.get(`/v1/reference-data/locations/pois/${this.poiId}`);
  }
};

// src/amadeus/namespaces/reference-data/locations/index.ts
var Locations = class {
  constructor(client) {
    this.client = client;
    this.airports = new Airports(client);
    this.cities = new Cities(client);
    this.hotel = new Hotel(client);
    this.hotels = new Hotels(client);
    this.pointsOfInterest = new PointsOfInterest(client);
  }
  /**
   * Returns a list of airports and cities matching a given keyword.
   *
   * @param {Object} params
   * @param {string} params.keyword keyword that should represent the start of
   *   a word in a city or airport name or code
   * @param {string} params.subType the type of location to search for
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find any location starting with 'lon'
   *
   * ```ts
   * amadeus.referenceData.locations.get({
   *   keyword: 'lon',
   *   subType: Amadeus.location.any
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/reference-data/locations", params);
  }
  pointOfInterest(poiId) {
    return new PointOfInterest(this.client, poiId);
  }
};

// src/amadeus/namespaces/reference-data/recommended-locations.ts
var RecommendedLocations = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Returns the recommended locations (destinations).
   *
   * @param {Object} params
   * @param {string} params.cityCodes Code of the city following IATA standard.
   * @param {string} params.travelerCountryCode Origin country of the traveler following IATA standard.
   * @param {string} params.destinationCountryCodes Country codes follow IATA standard.
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Get recommended destinations from a given origin
   *
   * ```ts
   * amadeus.referenceData.recommendedDestinations.get({
   *   cityCodes: 'PAR',
   *   travelerCountryCode: 'FR'
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/reference-data/recommended-locations", params);
  }
};

// src/amadeus/namespaces/reference-data/urls/checkin-links.ts
var CheckinLinks = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Returns the checkin links for an airline, for the
   * language of your choice
   *
   * @param {Object} params
   * @param {string} params.airlineCode airline ID - required
   * @param {string} [params.language="en-GB"] the locale for the links
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find a the checkin links for Air France
   *
   * ```ts
   * amadeus.referenceData.urls.checkinLinks.get({
   *   airlineCode: 'AF'
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v2/reference-data/urls/checkin-links", params);
  }
};

// src/amadeus/namespaces/reference-data/urls/index.ts
var Urls = class {
  constructor(client) {
    this.client = client;
    this.checkinLinks = new CheckinLinks(client);
  }
};

// src/amadeus/namespaces/reference-data/index.ts
var ReferenceData = class {
  constructor(client) {
    this.client = client;
    this.urls = new Urls(client);
    this.locations = new Locations(client);
    this.airlines = new Airlines(client);
    this.recommendedLocations = new RecommendedLocations(client);
  }
  /**
   * The namespace for the Location APIs - accessing a specific location
   *
   * @param  {string} [locationId] The ID of the location to search for
   * @return {Location}
   **/
  location(locationId) {
    return new Location(this.client, locationId);
  }
};

// src/amadeus/namespaces/shopping/activities/by-square.ts
var BySquare2 = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Returns a list of tours and activities a given area.
   *
   * @param {Object} params
   * @param {number} params.north latitude north of bounding box - required
   * @param {number} params.west  longitude west of bounding box - required
   * @param {number} params.south latitude south of bounding box - required
   * @param {number} params.east  longitude east of bounding box - required
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find relevant tours and activities within an area in Barcelona
   *
   * ```ts
   * amadeus.shopping.activities.bySquare.get({
   *   north: 41.397158,
   *   west: 2.160873,
   *   south: 41.394582,
   *   east: 2.177181
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/shopping/activities/by-square", params);
  }
};

// src/amadeus/namespaces/shopping/activities/index.ts
var Activities = class {
  constructor(client) {
    this.client = client;
    this.bySquare = new BySquare2(client);
  }
  /**
   * /shopping/activities
   *
   * @param {Object} params
   * @param {number} params.latitude latitude location to be at the center of
   *   the search circle - required
   * @param {number} params.longitude longitude location to be at the center of
   *   the search circle - required
   * @param {number} params.radius radius of the search in Kilometer - optional
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * What are the best tours and activities in Barcelona? (based a geo location and a radius)
   *
   * ```ts
   * amadeus.shopping.activities.get({
   *   longitude: 2.160873,
   *   latitude: 41.397158
   * });
   * ```
   */
  get(params) {
    return this.client.get(
      "/v1/shopping/activities",
      params
    );
  }
};

// src/amadeus/namespaces/shopping/activity.ts
var Activity = class {
  constructor(client, activityId) {
    this.client = client;
    this.activityId = activityId;
  }
  /**
   * Retieve information of an activity by its Id.
   *
   * What is the activity information with Id 3216547684?
   * ```ts
   * amadeus.shopping.activity('3216547684').get();
   * ```
   */
  get() {
    return this.client.get(
      `/v1/shopping/activities/${this.activityId}`
    );
  }
};

// src/amadeus/namespaces/shopping/availability/flight-availabilities.ts
var FlightAvailabilities = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Get available seats in different fare classes
   *
   * @param {FlightAvailabilitiesParams} params
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * ```ts
   * amadeus.shopping.availability.flightAvailabilities.post(body);
   * ```
   */
  post(params) {
    return this.client.post("/v1/shopping/availability/flight-availabilities", params);
  }
};

// src/amadeus/namespaces/shopping/availability/index.ts
var Availability = class {
  constructor(client) {
    this.client = client;
    this.flightAvailabilities = new FlightAvailabilities(client);
  }
};

// src/amadeus/namespaces/shopping/flight-dates.ts
var FlightDates = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Find the cheapest flight dates from an origin to a destination.
   *
   * @param {Object} params
   * @param {string} params.origin City/Airport IATA code from which the flight
   *   will depart. BOS, for example.
   * @param {string} params.destination City/Airport IATA code to which the
   *   traveler is going. PAR, for example
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find the cheapest flight dates from New-York to Madrid
   *
   * ```ts
   * amadeus.shopping.flightDates.get({
   *   origin: 'NYC',
   *   destination: 'MAD'
   * });
   * ```
   */
  get(params) {
    return this.client.get(
      "/v1/shopping/flight-dates",
      params
    );
  }
};

// src/amadeus/namespaces/shopping/flight-destinations.ts
var FlightDestinations = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Find the cheapest destinations where you can fly to.
   *
   * @param {Object} params
   * @param {string} params.origin City/Airport IATA code from which the flight
   *   will depart. BOS, for example.
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find the cheapest destination from Madrid
   *
   * ```ts
   * amadeus.shopping.flightDestinations.get({
   *   origin: 'MAD'
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/shopping/flight-destinations", params);
  }
};

// src/amadeus/namespaces/shopping/flight-offers-search.ts
var FlightOffersSearch = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Get cheapest flight recommendations and prices on a given journey.
   *
   * @param {Object} params
   * @param {string} params.originLocationCode city/airport IATA code from which the traveler will depart, e.g. BOS for Boston
   * @param {string} params.destinationLocationCode city/airport IATA code to which the traveler is going, e.g. PAR for Paris
   * @param {string} params.departureDate the date on which the traveler will depart
   * from the origin to go to the destination. Dates are specified in the ISO 8601 YYYY-MM-DD format, e.g. 2017-12-25
   * @param {string} params.adults the number of adult travelers (age 12 or older on date of departure)
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Get cheapest flight recommendations and prices for SYD-BKK on 2020-08-01 for 2 adults
   *
   * ```ts
   * amadeus.shopping.flightOffers.get({
   *    originLocationCode: 'SYD',
   *    destinationLocationCode: 'BKK',
   *    departureDate: '2020-08-01',
   *    adults: '2'
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v2/shopping/flight-offers", params);
  }
  /**
   * To do a customized search with every option available.
   *
   * @param {FlightOffersSearchPostRequest} params
   * @param {number} params.getFlightOffersBody list of criteria to retrieve a list of flight offers
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * To do a customized search with given options.
   *
   * ```ts
   * amadeus.shopping.flightOffersSearch.post({
        "currencyCode": "USD",
        "originDestinations": [
          {
            "id": "1",
            "originLocationCode": "RIO",
            "destinationLocationCode": "MAD",
            "departureDateTimeRange": {
              "date": "2020-03-01",
              "time": "10:00:00"
            }
          },
          {
            "id": "2",
            "originLocationCode": "MAD",
            "destinationLocationCode": "RIO",
            "departureDateTimeRange": {
              "date": "2020-03-05",
              "time": "17:00:00"
            }
          }
        ],
        "travelers": [
          {
            "id": "1",
            "travelerType": "ADULT",
            "fareOptions": [
              "STANDARD"
            ]
          },
          {
            "id": "2",
            "travelerType": "CHILD",
            "fareOptions": [
              "STANDARD"
            ]
          }
        ],
        "sources": [
          "GDS"
        ],
        "searchCriteria": {
          "maxFlightOffers": 50,
          "flightFilters": {
            "cabinRestrictions": [
              {
                "cabin": "BUSINESS",
                "coverage": "MOST_SEGMENTS",
                "originDestinationIds": [
                  "1"
                ]
              }
            ],
            "carrierRestrictions": {
              "excludedCarrierCodes": [
                "AA",
                "TP",
                "AZ"
              ]
            }
          }
        }
      });
    * ```
    */
  post(params) {
    return this.client.post("/v2/shopping/flight-offers", params);
  }
};

// src/amadeus/namespaces/shopping/flight_offers/flight-choice-prediction.ts
var FlightChoicePrediction = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Returns a list of flight offers with the probability to be chosen.
   *
   * @param {Object} params
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Returns flights from NYC to MAD with the probability to be chosen.
   *
   * ```ts
   * amadeus.shopping.flightOffersSearch.get({
   *     originLocationCode: 'SYD',
   *     destinationLocationCode: 'BKK',
   *     departureDate: '2020-08-01',
   *     adults: '2'
   * }).then(function(response){
   *     return amadeus.shopping.flightOffers.prediction.post(
   *       response
   *     );
   * }).then(function(response){
   *     console.log(response.data);
   * }).catch(function(responseError){
   *     console.log(responseError);
   * });
   * ```
   */
  post(params) {
    return this.client.post("/v2/shopping/flight-offers/prediction", params);
  }
};

// src/amadeus/namespaces/shopping/flight_offers/pricing.ts
var Pricing = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * To get or confirm the price of a flight and obtain information
   * about taxes and fees to be applied to the entire journey. It also
   * retrieves ancillary information (e.g. additional bag or extra legroom
   * seats pricing) and the payment information details requested at booking time.
   *
   * @param {Object} params
   * @param {Object} params.data
   * @param {string} params.data.type 'flight-offers-pricing' for Flight Offer Pricing
   * @param {Array} params.data.flightOffers list of flight offers for which the
   * pricing needs to be retrieved
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * ```ts
   * amadeus.shopping.flightOffers.pricing.post({
   *  data: {
   *      type: 'flight-offers-pricing',
   *      flightOffers: []
   *  }
   * });
   * ```
   */
  post(params, additionalParams = {}) {
    const queryString = Object.keys(additionalParams).map(
      (key) => key + "=" + additionalParams[key]
    ).join("&");
    let url = "/v1/shopping/flight-offers/pricing";
    if (queryString !== "") {
      url += "?" + queryString;
    }
    return this.client.post(url, params);
  }
};

// src/amadeus/namespaces/shopping/flight_offers/upselling.ts
var Upselling = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Get available seats in different fare classes
   *
   * @param {Object} params
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * ```ts
   * amadeus.shopping.flightOffers.upselling.post(body);
   * ```
   */
  post(params) {
    return this.client.post("/v1/shopping/flight-offers/upselling", params);
  }
};

// src/amadeus/namespaces/shopping/flight_offers/index.ts
var FlightOffers = class {
  constructor(client) {
    this.client = client;
    this.prediction = new FlightChoicePrediction(client);
    this.pricing = new Pricing(client);
    this.upselling = new Upselling(client);
  }
};

// src/amadeus/namespaces/shopping/hotel-offer-search.ts
var HotelOfferSearch = class {
  constructor(client, offerId) {
    this.client = client;
    this.offerId = offerId;
  }
  /**
   * Returns details for a specific offer
   *
   * @param {Object} params
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Find details for the offer with ID 'XXX'
   *
   * ```ts
   *  amadeus.shopping.hotelOfferSearch('XXX').get();
   * ```
   */
  get(params = {}) {
    return this.client.get(`/v3/shopping/hotel-offers/${this.offerId}`, params);
  }
};

// src/amadeus/namespaces/shopping/hotel-offers-search.ts
var HotelOffersSearch = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Find the list of available offers in the specific hotels
   *
   * @param {Object} params
   * @param {string} params.hotelIds Comma separated list of Amadeus hotel
   * codes to request. Example: RTPAR001
   * @param {string} params.adults Number of adult guests (1-9) per room.
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Search for available offers in Novotel Paris for 2 adults
   *
   * ```ts
   * amadeus.shopping.hotelOffersSearch.get({
   *   hotelIds: 'RTPAR001',
   *   adults: '2'
   * })
   * ```
   */
  get(params) {
    return this.client.get("/v3/shopping/hotel-offers", params);
  }
};

// src/amadeus/namespaces/shopping/seatmaps.ts
var Seatmaps = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * To retrieve the seat map of each flight present in an order.
   *
   * @param {Object} params
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Retrieve the seat map for flight order with ID 'XXX'
   *
   * ```ts
   * amadeus.shopping.seatmaps.get({
   *    'flight-orderId': 'XXX'}
   * );
   * ```
   */
  get(params) {
    return this.client.get(
      "/v1/shopping/seatmaps",
      params
    );
  }
  /**
   * To retrieve the seat map of each flight included in a flight offer.
   *
   * @param {Object} params
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * To retrieve the seat map of each flight included in flight offers
   * for MAD-NYC flight on 2020-08-01.
   *
   * ```ts
   * amadeus.shopping.flightOffers.get({
   *    originLocationCode: 'MAD',
   *    destinationLocationCode: 'NYC',
   *    departureDate: '2020-08-01',
   *    adults: 1,
   * }).then(function(response){
   *    return amadeus.shopping.seatmaps.post(
   *        {
   *            'data': response.data
   *        }
   *    );
   * });
   * ```
   */
  post(params) {
    return this.client.post(
      "/v1/shopping/seatmaps",
      params
    );
  }
};

// src/amadeus/namespaces/shopping/transfer-offers.ts
var TransferOffers = class {
  constructor(client) {
    this.client = client;
  }
  /**
     * To search the list of transfer offers.
     *
     * @param {Object} params
     * @return {Promise<Response|ResponseError>} a Promise
     *
     * To search the list of transfer offers
     *
     * ```ts
     * amadeus.shopping.transferOffers.post(body)
  
     * ```
    */
  post(params) {
    return this.client.post("/v1/shopping/transfer-offers", params);
  }
};

// src/amadeus/namespaces/shopping/index.ts
var Shopping = class {
  constructor(client) {
    this.client = client;
    this.flightDestinations = new FlightDestinations(client);
    this.flightOffers = new FlightOffers(client);
    this.flightOffersSearch = new FlightOffersSearch(client);
    this.flightDates = new FlightDates(client);
    this.seatmaps = new Seatmaps(client);
    this.hotelOffersSearch = new HotelOffersSearch(client);
    this.activities = new Activities(client);
    this.availability = new Availability(client);
    this.transferOffers = new TransferOffers(client);
  }
  /**
   * Loads a namespaced path for a specific offer ID for Hotel Search V3
   *
   * @param {string} [offerId] The ID of the offer for a dedicated hotel
   * @return {HotelOfferSearch}
   **/
  hotelOfferSearch(offerId) {
    return new HotelOfferSearch(this.client, offerId);
  }
  /**
   * Loads a namespaced path for a specific activity ID
   *
   * @param {string} [activityId] The ID of the activity for a dedicated tour or activity
   * @return {Activity}
   **/
  activity(activityId) {
    return new Activity(this.client, activityId);
  }
};

// src/amadeus/namespaces/booking/flight-order.ts
var FlightOrder = class {
  constructor(client, orderId) {
    this.client = client;
    this.orderId = orderId;
  }
  /**
   * To retrieve a flight order based on its id.
   *
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * To retrieve a flight order with ID 'XXX'
   *
   * ```ts
   * amadeus.booking.flightOrder('XXX').get();
   * ```
   */
  get() {
    if (!this.orderId) throw new Error("MISSING_REQUIRED_PARAMETER");
    return this.client.get(
      "/v1/booking/flight-orders/" + this.orderId
    );
  }
  /**
   * To cancel a flight order based on its id.
   *
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * To cancel a flight order with ID 'XXX'
   *
   * ```ts
   * amadeus.booking.flightOrder('XXX').delete();
   * ```
   */
  delete() {
    if (!this.orderId) throw new Error("MISSING_REQUIRED_PARAMETER");
    return this.client.delete(
      "/v1/booking/flight-orders/" + this.orderId
    );
  }
};

// src/amadeus/namespaces/booking/flight-orders.ts
var FlightOrders = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * To book the selected flight-offer and create a flight-order
   *
   * @param {Object} params
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * To book the flight-offer(s) suggested by flightOffersSearch and create a flight-order
   *
   * ```ts
   * amadeus.booking.flightOrders.post({
   *  'type': 'flight-order',
   *  'flightOffers': [],
   *  'travelers': []
   * });
   * ```
   */
  post(params) {
    return this.client.post(
      "/v1/booking/flight-orders",
      params
    );
  }
};

// src/amadeus/namespaces/booking/hotel-bookings.ts
var HotelBookings = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * To book the offer retrieved from Hotel Shopping API.
   *
   * @param {Object} params
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * To book the hotel offer with ID 'XXX' with guests & payments info
   *
   * ```ts
   * amadeus.booking.hotelBookings.post(
   * {
   * 'data': {
   *   'offerId': 'XXXX',
   *   'guests': [],
   *   'payments': [],
   *   'rooms': []
   * }
   * })
   * ```
   */
  post(params) {
    return this.client.post("/v1/booking/hotel-bookings", params);
  }
};

// src/amadeus/namespaces/booking/hotel-orders.ts
var HotelOrders = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * To book the offer retrieved from Hotel Search API.
   *
   * @param {Object} params
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * To book the hotel offer with ID 'XXX' with guests, travel agents and payment info
   *
   * ```ts
   * amadeus.booking.hotelOrders.post(
   *  {
   *  'data': {
   *       'type': 'hotel-order',
   *       'guests': [],
   *       'travelAgent': {},
   *       'roomAssociations': [],
   *       'payment': {}
   *     }
   *   })
   * ```
   */
  post(params) {
    return this.client.post(
      "/v2/booking/hotel-orders",
      params
    );
  }
};

// src/amadeus/namespaces/booking/index.ts
var Booking = class {
  constructor(client) {
    this.client = client;
    this.flightOrders = new FlightOrders(client);
    this.hotelBookings = new HotelBookings(client);
    this.hotelOrders = new HotelOrders(client);
  }
  flightOrder(orderId) {
    return new FlightOrder(this.client, orderId);
  }
};

// src/amadeus/namespaces/travel/analytics/air-traffic/traveled.ts
var Traveled = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Returns a list of air traffic reports based on the number of people traveling.
   *
   * @param {Object} params
   * @param {string} params.originCityCode IATA code of the origin city - e.g. MAD for
   *   Madrid - required
   * @param {string} params.period period when consumers are travelling in
   *   YYYY-MM format
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Where were people flying to from Madrid in the January 2017?
   *
   * ```ts
   * amadeus.travel.analytics.AirTraffic.Traveled.get({
   *   originCityCode: 'MAD',
   *   period: '2017-01'
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/travel/analytics/air-traffic/traveled", params);
  }
};

// src/amadeus/namespaces/travel/analytics/air-traffic/booked.ts
var Booked = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Returns a list of air traffic reports based on the number of bookings.
   *
   * @param {Object} params
   * @param {string} params.originCityCode IATA code of the origin city - e.g. MAD for
   *   Madrid - required
   * @param {string} params.period period when consumers are travelling in
   *   YYYY-MM format
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Where were people flying to from Madrid in the August 2017?
   *
   * ```ts
   * amadeus.travel.analytics.AirTraffic.Booked.get({
   *   originCityCode: 'MAD',
   *   period: '2017-08'
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/travel/analytics/air-traffic/booked", params);
  }
};

// src/amadeus/namespaces/travel/analytics/air-traffic/busiest-period.ts
var BusiestPeriod = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Returns a list of air traffic reports.
   *
   * @param {Object} params
   * @param {string} params.cityCode IATA code of the origin city - e.g. MAD for
   *   Madrid - required
   * @param {string} params.period period when consumers are travelling in
   *   YYYY-MM format
   * @param {string} params.direction to select between arrivals and departures (default: arrivals)
   *   YYYY-MM format
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * What were the busiest months for Madrid in 2017?
   *
   * ```ts
   * amadeus.travel.analytics.AirTraffic.BusiestPeriod.get({
   *   cityCode: 'MAD',
   *   period: '2017',
   *   direction: Amadeus.direction.arriving
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/travel/analytics/air-traffic/busiest-period", params);
  }
};

// src/amadeus/namespaces/travel/analytics/air-traffic/index.ts
var AirTraffic = class {
  constructor(client) {
    this.client = client;
    this.traveled = new Traveled(client);
    this.booked = new Booked(client);
    this.busiestPeriod = new BusiestPeriod(client);
  }
};

// src/amadeus/namespaces/travel/analytics/index.ts
var Analytics = class {
  constructor(client) {
    this.client = client;
    this.airTraffic = new AirTraffic(client);
  }
};

// src/amadeus/namespaces/travel/predictions/flight-delay.ts
var FlightDelay = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * This machine learning API is based on a prediction model that takes the input of
   * the user -time, carrier, airport and aircraft information- and
   * predict the segment where the flight is likely to lay.
   *
   * @param {Object} params
   * @param {string} params.originLocationCode city/airport IATA code to which the traveler is departing, e.g. PAR for Paris
   * @param {string} params.destinationLocationCode city/airport IATA code to which the traveler is departing, e.g. PAR for Paris
   * @param {string} params.departureDate the date on which the traveler will depart from the origin to go to the destination. Dates are specified in the ISO 8601 YYYY-MM-DD format, e.g. 2019-12-25
   * @param {string} params.departureTime local time relative to originLocationCode on which the traveler will depart from the origin. Time respects ISO 8601 standard. e.g. 13:22:00
   * @param {string} params.arrivalDate the date on which the traveler will arrive to the destination from the origin. Dates are specified in the ISO 8601 YYYY-MM-DD format, e.g. 2019-12-25
   * @param {string} params.arrivalTime local time relative to destinationLocationCode on which the traveler will arrive to destination. Time respects ISO 8601 standard. e.g. 13:22:00
   * @param {string} params.aircraftCode IATA aircraft code (http://www.flugzeuginfo.net/table_accodes_iata_en.php)
   * @param {string} params.carrierCode airline / carrier code
   * @param {string} params.flightNumber flight number as assigned by the carrier
   * @param {string} params.duration flight duration in ISO8601 PnYnMnDTnHnMnS format, e.g. PT2H10M
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Predict the segment where LH1009 (BRU-FRA) is likely to lay on 2020-01-14
   *
   * ```ts
   * amadeus.travel.predictions.flightDelay.get({
   *    originLocationCode: 'BRU',
   *    destinationLocationCode: 'FRA',
   *    departureDate: '2020-01-14',
   *    departureTime: '11:05:00',
   *    arrivalDate: '2020-01-14',
   *    arrivalTime: '12:10:00',
   *    aircraftCode: '32A',
   *    carrierCode: 'LH',
   *    flightNumber: '1009',
   *    duration: 'PT1H05M'
   * })
   * ```
   */
  get(params) {
    return this.client.get("/v1/travel/predictions/flight-delay", params);
  }
};

// src/amadeus/namespaces/travel/predictions/trip-purpose.ts
var TripPurpose = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Forecast traveler purpose, Business or Leisure, together with the probability in the context of search & shopping.
   *
   * @param {Object} params
   * @param {string} params.originLocationCode city/airport IATA code from which the traveler will depart, e.g. BOS for Boston
   * @param {string} params.destinationLocationCode city/airport IATA code to which the traveler is going, e.g. PAR for Paris
   * @param {string} params.departureDate the date on which the traveler will depart from the origin to go to the destination. Dates are specified in the ISO 8601 YYYY-MM-DD format, e.g. 2017-12-25
   * @param {string} params.returnDate the date on which the traveler will depart from the destination to return to the origin. Dates are specified in the ISO 8601 YYYY-MM-DD format, e.g. 2018-02-28
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Forecast traveler purpose for a NYC-MAD round-trip between 2020-08-01 & 2020-08-12.
   *
   * ```ts
   * amadeus.travel.predictions.tripPurpose.get({
   *    originLocationCode: 'NYC',
   *    destinationLocationCode: 'MAD',
   *    departureDate: '2020-08-01',
   *    returnDate: '2020-08-12'
   * })
   * ```
   */
  get(params) {
    return this.client.get(
      "/v1/travel/predictions/trip-purpose",
      params
    );
  }
};

// src/amadeus/namespaces/travel/predictions/index.ts
var Predictions = class {
  constructor(client) {
    this.client = client;
    this.tripPurpose = new TripPurpose(client);
    this.flightDelay = new FlightDelay(client);
  }
};

// src/amadeus/namespaces/travel/index.ts
var Travel = class {
  constructor(client) {
    this.analytics = new Analytics(client);
    this.predictions = new Predictions(client);
  }
};

// src/amadeus/namespaces/e-reputation/hotel-sentiments.ts
var HotelSentiments = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Get the sentiment analysis of hotel reviews
   *
   * @param {Object} params
   * @param {string} params.hotelIds Comma separated list of Amadeus hotel
   *   codes to request. Example: XKPARC12
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Get Sentiment Analysis of reviews about Holiday Inn Paris Notre Dame.
   *
   * ```ts
   * amadeus.eReputation.hotelSentiments.get({
   *   hotelIds: 'XKPARC12'
   * })
   * ```
   */
  get(params) {
    return this.client.get("/v2/e-reputation/hotel-sentiments", params);
  }
};

// src/amadeus/namespaces/e-reputation/index.ts
var EReputation = class {
  constructor(client) {
    this.client = client;
    this.hotelSentiments = new HotelSentiments(client);
  }
};

// src/amadeus/namespaces/media/files.ts
var Files = class {
  constructor(client) {
    this.client = client;
  }
};

// src/amadeus/namespaces/media/index.ts
var Media = class {
  constructor(client) {
    this.client = client;
    this.files = new Files(client);
  }
};

// src/amadeus/namespaces/ordering/transfer-orders/transfers/cancellation.ts
var Cancellation = class {
  constructor(client, orderId) {
    this.client = client;
    this.orderId = orderId;
  }
  /**
   * To cancel a transfer order based on its id
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * To cancel a transfer order with ID 'XXX' and confirmation number '12345'
   *
   * ```ts
   * amadeus.ordering.transferOrder('XXX').transfers.cancellation.post({}, '12345');;
   * ```
   */
  post(body, confirmNbr) {
    return this.client.post(
      `/v1/ordering/transfer-orders/${this.orderId}/transfers/cancellation?confirmNbr=${confirmNbr}`,
      body
    );
  }
};

// src/amadeus/namespaces/ordering/transfer-orders/transfers/index.ts
var Transfers = class {
  constructor(client, orderId) {
    this.client = client;
    this.orderId = orderId;
    this.cancellation = new Cancellation(client, orderId);
  }
};

// src/amadeus/namespaces/ordering/transfer-order.ts
var TransferOrder = class {
  constructor(client, orderId) {
    this.client = client;
    this.orderId = orderId;
    this.transfers = new Transfers(client, orderId);
  }
};

// src/amadeus/namespaces/ordering/transfer-orders/index.ts
var TransferOrders = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * To book the selected transfer-offer and create a transfer-order
   *
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * To book the transfer-offer(s) suggested by transferOffers and create a transfer-order
   *
   * ```ts
   * amadeus.ordering.transferOrders.post(body, '2094123123');;
   * ```
   */
  post(body, offerId) {
    return this.client.post(`/v1/ordering/transfer-orders?offerId=${offerId}`, body);
  }
};

// src/amadeus/namespaces/ordering/index.ts
var Ordering = class {
  constructor(client) {
    this.client = client;
    this.transferOrders = new TransferOrders(client);
    this.transferOrder = (orderId) => new TransferOrder(client, orderId);
  }
};

// src/amadeus/namespaces/airport/direct-destination.ts
var DirectDestinations = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Get the percentage of on-time flight departures from a given airport
   *
   * @param {Object} params
   * @param {string} params.departureAirportCode airport IATA code, e.g. BOS for Boston
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * What destinations are served by this airport?
   *  ```ts
   * amadeus.airport.directDestinations.get({
   *   departureAirportCode: 'JFK',
   * })
   * ```
   */
  get(params) {
    return this.client.get("/v1/airport/direct-destinations", params);
  }
};

// src/amadeus/namespaces/airport/predictions/on-time.ts
var OnTime = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Get the percentage of on-time flight departures from a given airport
   *
   * @param {Object} params
   * @param {string} params.airportCode airport IATA code, e.g. BOS for Boston
   * @param {string} params.date the date on which the traveler will depart
   * from the give airport. Dates are specified in the ISO 8601 YYYY-MM-DD format, e.g. 2019-12-25
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Get the percentage of on-time flight departures from JFK
   *
   * ```ts
   * amadeus.airport.predictions.onTime.get({
   *   airportCode: 'JFK',
   *   date: '2020-08-01'
   * })
   * ```
   */
  get(params) {
    return this.client.get("/v1/airport/predictions/on-time", params);
  }
};

// src/amadeus/namespaces/airport/predictions/index.ts
var Predictions2 = class {
  constructor(client) {
    this.client = client;
    this.onTime = new OnTime(client);
  }
};

// src/amadeus/namespaces/airport/index.ts
var Airport = class {
  constructor(client) {
    this.client = client;
    this.directDestinations = new DirectDestinations(client);
    this.predictions = new Predictions2(client);
  }
};

// src/amadeus/client/pagination.ts
var Pagination = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Fetch the page for the given page name, and make the next API call based on
   * the previous request made.
   *
   * @param {PageName} pageName the name of the page to fetch, should be available
   *    as a link in the meta links in the response
   * @param {Response} response the response containing the links to the next pages,
   *   and the request used to make the previous call
   * @return {Promise<Response|ResponseError>} a Promise
   * @public
   */
  page(pageName, response) {
    const pageNumber = this.pageNumber(response, pageName);
    if (pageNumber) return this.call(response.request, pageNumber);
    return this.nullPromise();
  }
  /**
   * Makes a new call for the new page number
   *
   * @param  {Request} request the request used to make the previous call
   * @param  {number} pageNumber the page number to fetch
   * @return {Promise<Response|ResponseError>} a Promise
   * @private
   */
  call(request, pageNumber) {
    const params = request.params || {};
    params["page"] = params["page"] || {};
    params["page"]["offset"] = pageNumber;
    return this.client.request(request.verb, request.path, params);
  }
  /**
   * Tries to determine the page number from the page name. If not present, it
   * just returns null
   *
   * @param  {ReturnedResponseSuccess} response the response containing the links to the next pages
   * @param  {PageName} pageName the name of the page to fetch
   * @return {string}
   * @private
   */
  pageNumber(response, pageName) {
    try {
      const number = response.result["meta"]["links"][pageName].split("page%5Boffset%5D=")[1].split("&")[0];
      return number;
    } catch (TypeError2) {
      return null;
    }
  }
  /**
   * Returns a Promise that always resolves to null
   *
   * @return {Promise} a Promise that always resolves to null
   * @private
   */
  nullPromise() {
    return new Promise(function(resolve) {
      resolve(null);
    });
  }
};

// src/amadeus/namespaces/schedule/flights.ts
var Flights = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Provides real-time flight schedule data including up-to-date departure and arrival times,
   *  terminal and gate information, flight duration and real-time delay status
   *
   * @param {Object} params
   * @param {string} params.carrierCode 2 to 3-character IATA carrier code - required
   * @param {string} params.flightNumber 1 to 4-digit number of the flight. e.g. 4537 - required
   * @param {string} params.scheduledDepartureDate scheduled departure date of the flight, local to the departure airport - required
   * @return {Promise<Response|ResponseError>} a Promise
   * What's the current status of my flight?
   * ```ts
   * amadeus.schedule.flights.get({
   *   carrierCode: 'AZ',
   *   flightNumber: '319',
   *   scheduledDepartureDate: '2021-03-13'
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v2/schedule/flights", params);
  }
};

// src/amadeus/namespaces/schedule/index.ts
var Schedule = class {
  constructor(client) {
    this.client = client;
    this.flights = new Flights(client);
  }
};

// src/amadeus/namespaces/analytics/itinerary-price-metrics.ts
var ItineraryPriceMetrics = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Provides historical prices in a quartile distribution, including minimum, maximum and average price.
   *
   * @param {Object} params
   * @param {string} params.originIataCode city/airport code, following IATA standard, from which the traveler will depart
   * @param {string} params.destinationIataCode city/airport code, following IATA standard, from which the traveler is going
   * @param {string} params.departureDate The date on which the traveler will depart from the origin to go to the destination.
   * @return {Promise<Response|ResponseError>} a Promise
   * Am I getting a good deal on this flight?
   * ```ts
   * amadeus.analytics.itineraryPriceMetrics.get({
   * originIataCode: 'MAD',
   * destinationIataCode: 'CDG',
   * departureDate: '2021-03-13'
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/analytics/itinerary-price-metrics", params);
  }
};

// src/amadeus/namespaces/analytics/index.ts
var Analytics2 = class {
  constructor(client) {
    this.client = client;
    this.itineraryPriceMetrics = new ItineraryPriceMetrics(client);
  }
};

// src/amadeus/namespaces/airline/destinations.ts
var Destinations = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * find all destinations served by a given airline
   *
   * @param {Object} params
   * @param {string} params.airlineCode airline IATA code, e.g. BA for British airways
   * @return {Promise<Response|ResponseError>} a Promise
   *
   *  What destinations are served by this airline?
   *  ```ts
   * amadeus.airline.destinations.get({
   *   airlineCode: 'BA',
   * })
   * ```
   */
  get(params) {
    return this.client.get("/v1/airline/destinations", params);
  }
};

// src/amadeus/namespaces/airline/index.ts
var Airline = class {
  constructor(client) {
    this.client = client;
    this.destinations = new Destinations(client);
  }
};
var airline_default = Airline;

// src/amadeus/namespaces/location/analytics/category-rated-areas.ts
var CategoryRatedAreas = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Gets popularity score for location categories
   *
   * @param {Object} params
   * @param {number} params.latitude latitude location to be at the center of
   *   the search circle - required
   * @param {number} params.longitude longitude location to be at the center of
   *   the search circle - required
   * @param {number} params.radius radius of the search in Kilometer - optional
   * @return {Promise<Response|ResponseError>} a Promise
   *
   * Gets popularity score for location categories in Barcelona
   *
   * ```ts
   * amadeus.location.analytics.categoryRatedAreas.get({
   *   longitude: 2.160873,
   *   latitude: 41.397158
   * });
   * ```
   */
  get(params) {
    return this.client.get("/v1/location/analytics/category-rated-areas", params);
  }
};

// src/amadeus/namespaces/location/analytics/index.ts
var Analytics3 = class {
  constructor(client) {
    this.client = client;
    this.categoryRatedAreas = new CategoryRatedAreas(client);
  }
};

// src/amadeus/namespaces/location/index.ts
var Location2 = class {
  constructor(client) {
    this.client = client;
    this.analytics = new Analytics3(client);
  }
};

// src/amadeus/index.ts
var Amadeus = class {
  constructor(options = {}) {
    this.client = new Client(options);
    this.version = this.client.version;
    this.referenceData = new ReferenceData(this.client);
    this.shopping = new Shopping(this.client);
    this.booking = new Booking(this.client);
    this.travel = new Travel(this.client);
    this.eReputation = new EReputation(this.client);
    this.media = new Media(this.client);
    this.ordering = new Ordering(this.client);
    this.airport = new Airport(this.client);
    this.pagination = new Pagination(this.client);
    this.schedule = new Schedule(this.client);
    this.analytics = new Analytics2(this.client);
    this.location = new Location2(this.client);
    this.airline = new airline_default(this.client);
  }
  /**
   * The previous page for the given response. Resolves to null if the page
   * could not be found.
   *
   * ```ts
   * amadeus.referenceData.locations.get({
   *   keyword: 'LON',
   *   subType: 'AIRPORT,CITY',
   *   page: { offset: 2 }
   * }).then(function(response){
   *   console.log(response);
   *   return amadeus.previous(response);
   * }).then(function(previousPage){
   *   console.log(previousPage);
   * });
   * ```
   *
   * @param response the previous response for an API call
   * @return {Promise<Response|ResponseError>} a Promise
   */
  previous(response) {
    return this.pagination.page("previous", response);
  }
  /**
   * The next page for the given response. Resolves to null if the page could
   * not be found.
   *
   * ```ts
   * amadeus.referenceData.locations.get({
   *   keyword: 'LON',
   *   subType: 'AIRPORT,CITY'
   * }).then(function(response){
   *   console.log(response);
   *   return amadeus.next(response);
   * }).then(function(nextPage){
   *   console.log(nextPage);
   * });
   * ```
   *
   * @param response the previous response for an API call
   * @return {Promise<Response|ResponseError>} a Promise
   */
  next(response) {
    return this.pagination.page("next", response);
  }
  /**
   * The first page for the given response. Resolves to null if the page
   * could not be found.
   *
   * ```ts
   * amadeus.referenceData.locations.get({
   *   keyword: 'LON',
   *   subType: 'AIRPORT,CITY',
   *   page: { offset: 2 }
   * }).then(function(response){
   *   console.log(response);
   *   return amadeus.first(response);
   * }).then(function(firstPage){
   *   console.log(firstPage);
   * });
   * ```
   *
   * @param response the previous response for an API call
   * @return {Promise<Response|ResponseError>} a Promise
   */
  first(response) {
    return this.pagination.page("first", response);
  }
  /**
   * The last page for the given response. Resolves to null if the page
   * could not be found.
   *
   * ```ts
   * amadeus.referenceData.locations.get({
   *   keyword: 'LON',
   *   subType: 'AIRPORT,CITY'
   * }).then(function(response){
   *   console.log(response);
   *   return amadeus.last(response);
   * }).then(function(lastPage){
   *   console.log(lastPage);
   * });
   * ```
   *
   * @param response the previous response for an API call
   * @return {Promise<Response|ResponseError>} a Promise
   */
  last(response) {
    return this.pagination.page("last", response);
  }
};
Amadeus.location = {
  airport: "AIRPORT",
  city: "CITY",
  any: "AIRPORT,CITY"
};
Amadeus.direction = {
  arriving: "ARRIVING",
  departing: "DEPARTING"
};



exports.ResponseError = ResponseError; exports.default = Amadeus;
