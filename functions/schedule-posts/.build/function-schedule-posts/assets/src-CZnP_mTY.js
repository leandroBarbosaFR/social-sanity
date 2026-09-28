import { a as __toCommonJS, i as __require, n as __esmMin, r as __exportAll, t as __commonJSMin } from "./rolldown-runtime-BMI-E3GI.js";
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/error.js
var require_error = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function errorHandler(input) {
		/* istanbul ignore next: jic! */
		if (input instanceof Error) throw input;
		let { statusCode, headers, error, metadata } = input;
		if (error?.Error) error = error.Error;
		let err = error instanceof Error ? error : Error();
		if (statusCode) err.statusCode = statusCode;
		if (headers) err.headers = headers;
		if (error && typeof error === "object") {
			Object.entries(error).forEach(([n, value]) => {
				const name = n.toLowerCase();
				if (name === "message") err[name] = value;
				else if (name === "code") err[name] = err.name = value;
				else err[n] = value;
			});
			if (err.__type && !err.code) err.code = err.name = err.__type;
		}
		if (typeof error === "string") err.message = error;
		Object.entries(metadata).forEach(([name, value]) => {
			if (name !== "name" && value) err[name] = value;
		});
		let { service, name, property } = metadata;
		let msg = "@aws-lite/client: " + (property || service);
		if (name) msg += `.${name}`;
		if (error?.message || err.message) msg += `: ${error.message || err.message}`;
		else msg += ": unknown error";
		err.message = msg;
		if (!err.time) err.time = (/* @__PURE__ */ new Date()).toISOString();
		throw err;
	};
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/lib/validate.js
var require_validate = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var errorHandler = require_error();
	var is = {
		array: (item) => Array.isArray(item),
		boolean: (item) => typeof item === "boolean",
		buffer: (item) => Buffer.isBuffer(item),
		number: (item) => Number.isInteger(item),
		object: (item) => item && typeof item === "object" && !Array.isArray(item),
		stream: (item) => item?.on && item?._read && item?._readableState,
		string: (item) => typeof item === "string"
	};
	var payloadAliases = [
		"payload",
		"body",
		"data",
		"json"
	];
	/**
	* Validate plugin method params with the following format:
	* {
	*   name: { type: 'string', required: true },
	*   payload: { type: [ 'string', 'array', 'object' ] },
	*   disableMe: false,
	* }
	*/
	function validateInput(valid, input, metadata) {
		let errors = [];
		let dupedPayloadAliases = [];
		Object.keys(input).forEach((p) => payloadAliases.includes(p) && dupedPayloadAliases.push(p));
		if (dupedPayloadAliases.length > 1) errors.push(`- Found duplicate payload parameters: ${dupedPayloadAliases.join(", ")}`);
		Object.entries(valid).forEach(([param, validations]) => {
			let canonicalParam = param === "payload" ? Object.keys(input).find((p) => payloadAliases.includes(p)) || param : param;
			if (validations === false) {
				if (input[canonicalParam]) errors.push(`- Parameter '${canonicalParam}' must not be used`);
				return;
			}
			let { type, required } = validations;
			if (typeof input[canonicalParam] === "undefined") {
				if (required) errors.push(`- Missing required parameter: ${canonicalParam}`);
				return;
			}
			if (!type) {
				errors.push(`- Validator is missing required 'type' property: ${canonicalParam}`);
				return;
			}
			if (!is.string(type) && !is.array(type)) {
				errors.push(`- Validator 'type' property must be a string or array: ${param}`);
				return;
			}
			let types = is.array(type) ? type : [type];
			types = types.map((t) => t?.toLowerCase?.(t) || t);
			let foundInvalid = false;
			types.forEach((t) => {
				if (!is[t]) {
					errors.push(`- Invalid type found: ${canonicalParam} (${t})`);
					foundInvalid = true;
				}
			});
			if (foundInvalid) return;
			let plural = types.length > 1 ? " one of" : "";
			if (!types.some((t) => is[t](input[canonicalParam]))) errors.push(`- Parameter '${canonicalParam}' must be${plural}: ${types.join(", ")}`);
		});
		if (errors.length) errorHandler({
			error: { message: `validation error${errors.length > 1 ? "s" : ""}\n` + errors.join("\n") },
			metadata
		});
	}
	module.exports = {
		validateInput,
		is
	};
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/_vendor/aws.js
var require_aws = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var tslib_es6_exports = {};
	__export(tslib_es6_exports, {
		__addDisposableResource: () => __addDisposableResource,
		__assign: () => __assign,
		__asyncDelegator: () => __asyncDelegator,
		__asyncGenerator: () => __asyncGenerator,
		__asyncValues: () => __asyncValues,
		__await: () => __await,
		__awaiter: () => __awaiter,
		__classPrivateFieldGet: () => __classPrivateFieldGet,
		__classPrivateFieldIn: () => __classPrivateFieldIn,
		__classPrivateFieldSet: () => __classPrivateFieldSet,
		__createBinding: () => __createBinding,
		__decorate: () => __decorate,
		__disposeResources: () => __disposeResources,
		__esDecorate: () => __esDecorate,
		__exportStar: () => __exportStar,
		__extends: () => __extends,
		__generator: () => __generator,
		__importDefault: () => __importDefault,
		__importStar: () => __importStar,
		__makeTemplateObject: () => __makeTemplateObject,
		__metadata: () => __metadata,
		__param: () => __param,
		__propKey: () => __propKey,
		__read: () => __read,
		__rest: () => __rest,
		__runInitializers: () => __runInitializers,
		__setFunctionName: () => __setFunctionName,
		__spread: () => __spread,
		__spreadArray: () => __spreadArray,
		__spreadArrays: () => __spreadArrays,
		__values: () => __values,
		default: () => tslib_es6_default
	});
	function __extends(d, b) {
		if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
		extendStatics(d, b);
		function __() {
			this.constructor = d;
		}
		d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	}
	function __rest(s, e) {
		var t = {};
		for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
		if (s != null && typeof Object.getOwnPropertySymbols === "function") {
			for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
		}
		return t;
	}
	function __decorate(decorators, target, key, desc) {
		var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
		if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
		else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	}
	function __param(paramIndex, decorator) {
		return function(target, key) {
			decorator(target, key, paramIndex);
		};
	}
	function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
		function accept(f) {
			if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
			return f;
		}
		var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
		var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
		var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
		var _, done = false;
		for (var i = decorators.length - 1; i >= 0; i--) {
			var context = {};
			for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
			for (var p in contextIn.access) context.access[p] = contextIn.access[p];
			context.addInitializer = function(f) {
				if (done) throw new TypeError("Cannot add initializers after decoration has completed");
				extraInitializers.push(accept(f || null));
			};
			var result = (0, decorators[i])(kind === "accessor" ? {
				get: descriptor.get,
				set: descriptor.set
			} : descriptor[key], context);
			if (kind === "accessor") {
				if (result === void 0) continue;
				if (result === null || typeof result !== "object") throw new TypeError("Object expected");
				if (_ = accept(result.get)) descriptor.get = _;
				if (_ = accept(result.set)) descriptor.set = _;
				if (_ = accept(result.init)) initializers.unshift(_);
			} else if (_ = accept(result)) {
				if (kind === "field") initializers.unshift(_);
				else descriptor[key] = _;
			}
		}
		if (target) Object.defineProperty(target, contextIn.name, descriptor);
		done = true;
	}
	function __runInitializers(thisArg, initializers, value) {
		var useValue = arguments.length > 2;
		for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
		return useValue ? value : void 0;
	}
	function __propKey(x) {
		return typeof x === "symbol" ? x : "".concat(x);
	}
	function __setFunctionName(f, name, prefix) {
		if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
		return Object.defineProperty(f, "name", {
			configurable: true,
			value: prefix ? "".concat(prefix, " ", name) : name
		});
	}
	function __metadata(metadataKey, metadataValue) {
		if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
	}
	function __awaiter(thisArg, _arguments, P, generator) {
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
	}
	function __generator(thisArg, body) {
		var _ = {
			label: 0,
			sent: function() {
				if (t[0] & 1) throw t[1];
				return t[1];
			},
			trys: [],
			ops: []
		}, f, y, t, g = {
			next: verb(0),
			"throw": verb(1),
			"return": verb(2)
		};
		return typeof Symbol === "function" && (g[Symbol.iterator] = function() {
			return this;
		}), g;
		function verb(n) {
			return function(v) {
				return step([n, v]);
			};
		}
		function step(op) {
			if (f) throw new TypeError("Generator is already executing.");
			while (g && (g = 0, op[0] && (_ = 0)), _) try {
				if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
				if (y = 0, t) op = [op[0] & 2, t.value];
				switch (op[0]) {
					case 0:
					case 1:
						t = op;
						break;
					case 4:
						_.label++;
						return {
							value: op[1],
							done: false
						};
					case 5:
						_.label++;
						y = op[1];
						op = [0];
						continue;
					case 7:
						op = _.ops.pop();
						_.trys.pop();
						continue;
					default:
						if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
							_ = 0;
							continue;
						}
						if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
							_.label = op[1];
							break;
						}
						if (op[0] === 6 && _.label < t[1]) {
							_.label = t[1];
							t = op;
							break;
						}
						if (t && _.label < t[2]) {
							_.label = t[2];
							_.ops.push(op);
							break;
						}
						if (t[2]) _.ops.pop();
						_.trys.pop();
						continue;
				}
				op = body.call(thisArg, _);
			} catch (e) {
				op = [6, e];
				y = 0;
			} finally {
				f = t = 0;
			}
			if (op[0] & 5) throw op[1];
			return {
				value: op[0] ? op[1] : void 0,
				done: true
			};
		}
	}
	function __exportStar(m, o) {
		for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
	}
	function __values(o) {
		var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
		if (m) return m.call(o);
		if (o && typeof o.length === "number") return { next: function() {
			if (o && i >= o.length) o = void 0;
			return {
				value: o && o[i++],
				done: !o
			};
		} };
		throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
	}
	function __read(o, n) {
		var m = typeof Symbol === "function" && o[Symbol.iterator];
		if (!m) return o;
		var i = m.call(o), r, ar = [], e;
		try {
			while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
		} catch (error) {
			e = { error };
		} finally {
			try {
				if (r && !r.done && (m = i["return"])) m.call(i);
			} finally {
				if (e) throw e.error;
			}
		}
		return ar;
	}
	function __spread() {
		for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
		return ar;
	}
	function __spreadArrays() {
		for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
		for (var r = Array(s), k = 0, i = 0; i < il; i++) for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) r[k] = a[j];
		return r;
	}
	function __spreadArray(to, from, pack) {
		if (pack || arguments.length === 2) {
			for (var i = 0, l = from.length, ar; i < l; i++) if (ar || !(i in from)) {
				if (!ar) ar = Array.prototype.slice.call(from, 0, i);
				ar[i] = from[i];
			}
		}
		return to.concat(ar || Array.prototype.slice.call(from));
	}
	function __await(v) {
		return this instanceof __await ? (this.v = v, this) : new __await(v);
	}
	function __asyncGenerator(thisArg, _arguments, generator) {
		if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
		var g = generator.apply(thisArg, _arguments || []), i, q = [];
		return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
			return this;
		}, i;
		function verb(n) {
			if (g[n]) i[n] = function(v) {
				return new Promise(function(a, b) {
					q.push([
						n,
						v,
						a,
						b
					]) > 1 || resume(n, v);
				});
			};
		}
		function resume(n, v) {
			try {
				step(g[n](v));
			} catch (e) {
				settle(q[0][3], e);
			}
		}
		function step(r) {
			r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
		}
		function fulfill(value) {
			resume("next", value);
		}
		function reject(value) {
			resume("throw", value);
		}
		function settle(f, v) {
			if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
		}
	}
	function __asyncDelegator(o) {
		var i = {}, p;
		return verb("next"), verb("throw", function(e) {
			throw e;
		}), verb("return"), i[Symbol.iterator] = function() {
			return this;
		}, i;
		function verb(n, f) {
			i[n] = o[n] ? function(v) {
				return (p = !p) ? {
					value: __await(o[n](v)),
					done: false
				} : f ? f(v) : v;
			} : f;
		}
	}
	function __asyncValues(o) {
		if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
		var m = o[Symbol.asyncIterator], i;
		return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
			return this;
		}, i);
		function verb(n) {
			i[n] = o[n] && function(v) {
				return new Promise(function(resolve, reject) {
					v = o[n](v), settle(resolve, reject, v.done, v.value);
				});
			};
		}
		function settle(resolve, reject, d, v) {
			Promise.resolve(v).then(function(v2) {
				resolve({
					value: v2,
					done: d
				});
			}, reject);
		}
	}
	function __makeTemplateObject(cooked, raw) {
		if (Object.defineProperty) Object.defineProperty(cooked, "raw", { value: raw });
		else cooked.raw = raw;
		return cooked;
	}
	function __importStar(mod) {
		if (mod && mod.__esModule) return mod;
		var result = {};
		if (mod != null) {
			for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
		}
		__setModuleDefault(result, mod);
		return result;
	}
	function __importDefault(mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	}
	function __classPrivateFieldGet(receiver, state, kind, f) {
		if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
		if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
		return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
	}
	function __classPrivateFieldSet(receiver, state, value, kind, f) {
		if (kind === "m") throw new TypeError("Private method is not writable");
		if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
		if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
		return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
	}
	function __classPrivateFieldIn(state, receiver) {
		if (receiver === null || typeof receiver !== "object" && typeof receiver !== "function") throw new TypeError("Cannot use 'in' operator on non-object");
		return typeof state === "function" ? receiver === state : state.has(receiver);
	}
	function __addDisposableResource(env, value, async) {
		if (value !== null && value !== void 0) {
			if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
			var dispose;
			if (async) {
				if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
				dispose = value[Symbol.asyncDispose];
			}
			if (dispose === void 0) {
				if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
				dispose = value[Symbol.dispose];
			}
			if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
			env.stack.push({
				value,
				dispose,
				async
			});
		} else if (async) env.stack.push({ async: true });
		return value;
	}
	function __disposeResources(env) {
		function fail(e) {
			env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
			env.hasError = true;
		}
		function next() {
			while (env.stack.length) {
				var rec = env.stack.pop();
				try {
					var result = rec.dispose && rec.dispose.call(rec.value);
					if (rec.async) return Promise.resolve(result).then(next, function(e) {
						fail(e);
						return next();
					});
				} catch (e) {
					fail(e);
				}
			}
			if (env.hasError) throw env.error;
		}
		return next();
	}
	var extendStatics;
	var __assign;
	var __createBinding;
	var __setModuleDefault;
	var _SuppressedError;
	var tslib_es6_default;
	var init_tslib_es6 = __esm({ "node_modules/tslib/tslib.es6.mjs"() {
		extendStatics = function(d, b) {
			extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
				d2.__proto__ = b2;
			} || function(d2, b2) {
				for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
			};
			return extendStatics(d, b);
		};
		__assign = function() {
			__assign = Object.assign || function __assign2(t) {
				for (var s, i = 1, n = arguments.length; i < n; i++) {
					s = arguments[i];
					for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
				}
				return t;
			};
			return __assign.apply(this, arguments);
		};
		__createBinding = Object.create ? function(o, m, k, k2) {
			if (k2 === void 0) k2 = k;
			var desc = Object.getOwnPropertyDescriptor(m, k);
			if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
				enumerable: true,
				get: function() {
					return m[k];
				}
			};
			Object.defineProperty(o, k2, desc);
		} : function(o, m, k, k2) {
			if (k2 === void 0) k2 = k;
			o[k2] = m[k];
		};
		__setModuleDefault = Object.create ? function(o, v) {
			Object.defineProperty(o, "default", {
				enumerable: true,
				value: v
			});
		} : function(o, v) {
			o["default"] = v;
		};
		_SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
			var e = new Error(message);
			return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
		};
		tslib_es6_default = {
			__extends,
			__assign,
			__rest,
			__decorate,
			__param,
			__metadata,
			__awaiter,
			__generator,
			__createBinding,
			__exportStar,
			__values,
			__read,
			__spread,
			__spreadArrays,
			__spreadArray,
			__await,
			__asyncGenerator,
			__asyncDelegator,
			__asyncValues,
			__makeTemplateObject,
			__importStar,
			__importDefault,
			__classPrivateFieldGet,
			__classPrivateFieldSet,
			__classPrivateFieldIn,
			__addDisposableResource,
			__disposeResources
		};
	} });
	var require_convertToAttr = __commonJS({ "node_modules/@aws-sdk/util-dynamodb/dist-cjs/convertToAttr.js"(exports2) {
		"use strict";
		Object.defineProperty(exports2, "__esModule", { value: true });
		exports2.convertToAttr = void 0;
		var convertToAttr2 = (data, options) => {
			var _a, _b, _c, _d, _e, _f;
			if (data === void 0) throw new Error(`Pass options.removeUndefinedValues=true to remove undefined values from map/array/set.`);
			else if (data === null && typeof data === "object") return convertToNullAttr();
			else if (Array.isArray(data)) return convertToListAttr(data, options);
			else if (((_a = data === null || data === void 0 ? void 0 : data.constructor) === null || _a === void 0 ? void 0 : _a.name) === "Set") return convertToSetAttr(data, options);
			else if (((_b = data === null || data === void 0 ? void 0 : data.constructor) === null || _b === void 0 ? void 0 : _b.name) === "Map") return convertToMapAttrFromIterable(data, options);
			else if (((_c = data === null || data === void 0 ? void 0 : data.constructor) === null || _c === void 0 ? void 0 : _c.name) === "Object" || !data.constructor && typeof data === "object") return convertToMapAttrFromEnumerableProps(data, options);
			else if (isBinary(data)) {
				if (data.length === 0 && (options === null || options === void 0 ? void 0 : options.convertEmptyValues)) return convertToNullAttr();
				return convertToBinaryAttr(data);
			} else if (typeof data === "boolean" || ((_d = data === null || data === void 0 ? void 0 : data.constructor) === null || _d === void 0 ? void 0 : _d.name) === "Boolean") return { BOOL: data.valueOf() };
			else if (typeof data === "number" || ((_e = data === null || data === void 0 ? void 0 : data.constructor) === null || _e === void 0 ? void 0 : _e.name) === "Number") return convertToNumberAttr(data);
			else if (typeof data === "bigint") return convertToBigIntAttr(data);
			else if (typeof data === "string" || ((_f = data === null || data === void 0 ? void 0 : data.constructor) === null || _f === void 0 ? void 0 : _f.name) === "String") {
				if (data.length === 0 && (options === null || options === void 0 ? void 0 : options.convertEmptyValues)) return convertToNullAttr();
				return convertToStringAttr(data);
			} else if ((options === null || options === void 0 ? void 0 : options.convertClassInstanceToMap) && typeof data === "object") return convertToMapAttrFromEnumerableProps(data, options);
			throw new Error(`Unsupported type passed: ${data}. Pass options.convertClassInstanceToMap=true to marshall typeof object as map attribute.`);
		};
		exports2.convertToAttr = convertToAttr2;
		var convertToListAttr = (data, options) => ({ L: data.filter((item) => !(options === null || options === void 0 ? void 0 : options.removeUndefinedValues) || (options === null || options === void 0 ? void 0 : options.removeUndefinedValues) && item !== void 0).map((item) => (0, exports2.convertToAttr)(item, options)) });
		var convertToSetAttr = (set, options) => {
			const setToOperate = (options === null || options === void 0 ? void 0 : options.removeUndefinedValues) ? new Set([...set].filter((value) => value !== void 0)) : set;
			if (!(options === null || options === void 0 ? void 0 : options.removeUndefinedValues) && setToOperate.has(void 0)) throw new Error(`Pass options.removeUndefinedValues=true to remove undefined values from map/array/set.`);
			if (setToOperate.size === 0) {
				if (options === null || options === void 0 ? void 0 : options.convertEmptyValues) return convertToNullAttr();
				throw new Error(`Pass a non-empty set, or options.convertEmptyValues=true.`);
			}
			const item = setToOperate.values().next().value;
			if (typeof item === "number") return { NS: Array.from(setToOperate).map(convertToNumberAttr).map((item2) => item2.N) };
			else if (typeof item === "bigint") return { NS: Array.from(setToOperate).map(convertToBigIntAttr).map((item2) => item2.N) };
			else if (typeof item === "string") return { SS: Array.from(setToOperate).map(convertToStringAttr).map((item2) => item2.S) };
			else if (isBinary(item)) return { BS: Array.from(setToOperate).map(convertToBinaryAttr).map((item2) => item2.B) };
			else throw new Error(`Only Number Set (NS), Binary Set (BS) or String Set (SS) are allowed.`);
		};
		var convertToMapAttrFromIterable = (data, options) => ({ M: ((data2) => {
			const map = {};
			for (const [key, value] of data2) if (typeof value !== "function" && (value !== void 0 || !(options === null || options === void 0 ? void 0 : options.removeUndefinedValues))) map[key] = (0, exports2.convertToAttr)(value, options);
			return map;
		})(data) });
		var convertToMapAttrFromEnumerableProps = (data, options) => ({ M: ((data2) => {
			const map = {};
			for (const key in data2) {
				const value = data2[key];
				if (typeof value !== "function" && (value !== void 0 || !(options === null || options === void 0 ? void 0 : options.removeUndefinedValues))) map[key] = (0, exports2.convertToAttr)(value, options);
			}
			return map;
		})(data) });
		var convertToNullAttr = () => ({ NULL: true });
		var convertToBinaryAttr = (data) => ({ B: data });
		var convertToStringAttr = (data) => ({ S: data.toString() });
		var convertToBigIntAttr = (data) => ({ N: data.toString() });
		var validateBigIntAndThrow = (errorPrefix) => {
			throw new Error(`${errorPrefix} ${typeof BigInt === "function" ? "Use BigInt." : "Pass string value instead."} `);
		};
		var convertToNumberAttr = (num) => {
			if ([
				NaN,
				Number.POSITIVE_INFINITY,
				Number.NEGATIVE_INFINITY
			].map((val) => val.toString()).includes(num.toString())) throw new Error(`Special numeric value ${num.toString()} is not allowed`);
			else if (num > Number.MAX_SAFE_INTEGER) validateBigIntAndThrow(`Number ${num.toString()} is greater than Number.MAX_SAFE_INTEGER.`);
			else if (num < Number.MIN_SAFE_INTEGER) validateBigIntAndThrow(`Number ${num.toString()} is lesser than Number.MIN_SAFE_INTEGER.`);
			return { N: num.toString() };
		};
		var isBinary = (data) => {
			const binaryTypes = [
				"ArrayBuffer",
				"Blob",
				"Buffer",
				"DataView",
				"File",
				"Int8Array",
				"Uint8Array",
				"Uint8ClampedArray",
				"Int16Array",
				"Uint16Array",
				"Int32Array",
				"Uint32Array",
				"Float32Array",
				"Float64Array",
				"BigInt64Array",
				"BigUint64Array"
			];
			if (data === null || data === void 0 ? void 0 : data.constructor) return binaryTypes.includes(data.constructor.name);
			return false;
		};
	} });
	var require_convertToNative = __commonJS({ "node_modules/@aws-sdk/util-dynamodb/dist-cjs/convertToNative.js"(exports2) {
		"use strict";
		Object.defineProperty(exports2, "__esModule", { value: true });
		exports2.convertToNative = void 0;
		var convertToNative2 = (data, options) => {
			for (const [key, value] of Object.entries(data)) if (value !== void 0) switch (key) {
				case "NULL": return null;
				case "BOOL": return Boolean(value);
				case "N": return convertNumber(value, options);
				case "B": return convertBinary(value);
				case "S": return convertString(value);
				case "L": return convertList(value, options);
				case "M": return convertMap(value, options);
				case "NS": return new Set(value.map((item) => convertNumber(item, options)));
				case "BS": return new Set(value.map(convertBinary));
				case "SS": return new Set(value.map(convertString));
				default: throw new Error(`Unsupported type passed: ${key}`);
			}
			throw new Error(`No value defined: ${JSON.stringify(data)}`);
		};
		exports2.convertToNative = convertToNative2;
		var convertNumber = (numString, options) => {
			if (options === null || options === void 0 ? void 0 : options.wrapNumbers) return { value: numString };
			const num = Number(numString);
			if ((num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) && ![Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].includes(num)) {
				if (typeof BigInt === "function") try {
					return BigInt(numString);
				} catch (error) {
					throw new Error(`${numString} can't be converted to BigInt. Set options.wrapNumbers to get string value.`);
				}
				else throw new Error(`${numString} is outside SAFE_INTEGER bounds. Set options.wrapNumbers to get string value.`);
			}
			return num;
		};
		var convertString = (stringValue) => stringValue;
		var convertBinary = (binaryValue) => binaryValue;
		var convertList = (list, options) => list.map((item) => (0, exports2.convertToNative)(item, options));
		var convertMap = (map, options) => Object.entries(map).reduce((acc, [key, value]) => (acc[key] = (0, exports2.convertToNative)(value, options), acc), {});
	} });
	var require_marshall = __commonJS({ "node_modules/@aws-sdk/util-dynamodb/dist-cjs/marshall.js"(exports2) {
		"use strict";
		Object.defineProperty(exports2, "__esModule", { value: true });
		exports2.marshall = void 0;
		var convertToAttr_1 = require_convertToAttr();
		function marshall2(data, options) {
			const attributeValue = (0, convertToAttr_1.convertToAttr)(data, options);
			const [key, value] = Object.entries(attributeValue)[0];
			switch (key) {
				case "M":
				case "L": return (options === null || options === void 0 ? void 0 : options.convertTopLevelContainer) ? attributeValue : value;
				default: return attributeValue;
			}
		}
		exports2.marshall = marshall2;
	} });
	var require_models = __commonJS({ "node_modules/@aws-sdk/util-dynamodb/dist-cjs/models.js"(exports2) {
		"use strict";
		Object.defineProperty(exports2, "__esModule", { value: true });
	} });
	var require_unmarshall = __commonJS({ "node_modules/@aws-sdk/util-dynamodb/dist-cjs/unmarshall.js"(exports2) {
		"use strict";
		Object.defineProperty(exports2, "__esModule", { value: true });
		exports2.unmarshall = void 0;
		var convertToNative_1 = require_convertToNative();
		var unmarshall2 = (data, options) => {
			if (options === null || options === void 0 ? void 0 : options.convertWithoutMapWrapper) return (0, convertToNative_1.convertToNative)(data, options);
			return (0, convertToNative_1.convertToNative)({ M: data }, options);
		};
		exports2.unmarshall = unmarshall2;
	} });
	var require_dist_cjs = __commonJS({ "node_modules/@aws-sdk/util-dynamodb/dist-cjs/index.js"(exports2) {
		"use strict";
		Object.defineProperty(exports2, "__esModule", { value: true });
		var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
		tslib_1.__exportStar(require_convertToAttr(), exports2);
		tslib_1.__exportStar(require_convertToNative(), exports2);
		tslib_1.__exportStar(require_marshall(), exports2);
		tslib_1.__exportStar(require_models(), exports2);
		tslib_1.__exportStar(require_unmarshall(), exports2);
	} });
	var vendor_aws_json_entry_exports = {};
	__export(vendor_aws_json_entry_exports, {
		convertToAttr: () => import_util_dynamodb.convertToAttr,
		convertToNative: () => import_util_dynamodb.convertToNative,
		marshall: () => import_util_dynamodb.marshall,
		unmarshall: () => import_util_dynamodb.unmarshall
	});
	module.exports = __toCommonJS(vendor_aws_json_entry_exports);
	var import_util_dynamodb = __toESM(require_dist_cjs(), 1);
	0 && (module.exports = {
		convertToAttr,
		convertToNative,
		marshall,
		unmarshall
	});
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/_vendor/xml.js
var require_xml = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var b = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
	var I = b((E) => {
		"use strict";
		var B = ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD", ge = B + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040", q = "[" + B + "][" + ge + "]*", pe = new RegExp("^" + q + "$"), Ne = function(e, t) {
			let s = [], i = t.exec(e);
			for (; i;) {
				let n = [];
				n.startIndex = t.lastIndex - i[0].length;
				let r = i.length;
				for (let f = 0; f < r; f++) n.push(i[f]);
				s.push(n), i = t.exec(e);
			}
			return s;
		}, be = function(e) {
			let t = pe.exec(e);
			return !(t === null || typeof t > "u");
		};
		E.isExist = function(e) {
			return typeof e < "u";
		};
		E.isEmptyObject = function(e) {
			return Object.keys(e).length === 0;
		};
		E.merge = function(e, t, s) {
			if (t) {
				let i = Object.keys(t), n = i.length;
				for (let r = 0; r < n; r++) s === "strict" ? e[i[r]] = [t[i[r]]] : e[i[r]] = t[i[r]];
			}
		};
		E.getValue = function(e) {
			return E.isExist(e) ? e : "";
		};
		E.isName = be;
		E.getAllMatches = Ne;
		E.nameRegexp = q;
	});
	var x = b((G) => {
		"use strict";
		var C = I(), Ee = {
			allowBooleanAttributes: !1,
			unpairedTags: []
		};
		G.validate = function(e, t) {
			t = Object.assign({}, Ee, t);
			let s = [], i = !1, n = !1;
			e[0] === "﻿" && (e = e.substr(1));
			for (let r = 0; r < e.length; r++) if (e[r] === "<" && e[r + 1] === "?") {
				if (r += 2, r = k(e, r), r.err) return r;
			} else if (e[r] === "<") {
				let f = r;
				if (r++, e[r] === "!") {
					r = R(e, r);
					continue;
				} else {
					let u = !1;
					e[r] === "/" && (u = !0, r++);
					let o = "";
					for (; r < e.length && e[r] !== ">" && e[r] !== " " && e[r] !== "	" && e[r] !== `
` && e[r] !== "\r"; r++) o += e[r];
					if (o = o.trim(), o[o.length - 1] === "/" && (o = o.substring(0, o.length - 1), r--), !Ie(o)) {
						let d;
						return o.trim().length === 0 ? d = "Invalid space after '<'." : d = "Tag '" + o + "' is an invalid name.", h("InvalidTag", d, p(e, r));
					}
					let l = me(e, r);
					if (l === !1) return h("InvalidAttr", "Attributes for '" + o + "' have open quote.", p(e, r));
					let a = l.value;
					if (r = l.index, a[a.length - 1] === "/") {
						let d = r - a.length;
						a = a.substring(0, a.length - 1);
						let g = X(a, t);
						if (g === !0) i = !0;
						else return h(g.err.code, g.err.msg, p(e, d + g.err.line));
					} else if (u) if (l.tagClosed) {
						if (a.trim().length > 0) return h("InvalidTag", "Closing tag '" + o + "' can't have attributes or invalid starting.", p(e, f));
						{
							let d = s.pop();
							if (o !== d.tagName) {
								let g = p(e, d.tagStartPos);
								return h("InvalidTag", "Expected closing tag '" + d.tagName + "' (opened in line " + g.line + ", col " + g.col + ") instead of closing tag '" + o + "'.", p(e, f));
							}
							s.length == 0 && (n = !0);
						}
					} else return h("InvalidTag", "Closing tag '" + o + "' doesn't have proper closing.", p(e, r));
					else {
						let d = X(a, t);
						if (d !== !0) return h(d.err.code, d.err.msg, p(e, r - a.length + d.err.line));
						if (n === !0) return h("InvalidXml", "Multiple possible root nodes found.", p(e, r));
						t.unpairedTags.indexOf(o) !== -1 || s.push({
							tagName: o,
							tagStartPos: f
						}), i = !0;
					}
					for (r++; r < e.length; r++) if (e[r] === "<") if (e[r + 1] === "!") {
						r++, r = R(e, r);
						continue;
					} else if (e[r + 1] === "?") {
						if (r = k(e, ++r), r.err) return r;
					} else break;
					else if (e[r] === "&") {
						let d = Pe(e, r);
						if (d == -1) return h("InvalidChar", "char '&' is not expected.", p(e, r));
						r = d;
					} else if (n === !0 && !M(e[r])) return h("InvalidXml", "Extra text at the end", p(e, r));
					e[r] === "<" && r--;
				}
			} else {
				if (M(e[r])) continue;
				return h("InvalidChar", "char '" + e[r] + "' is not expected.", p(e, r));
			}
			if (i) {
				if (s.length == 1) return h("InvalidTag", "Unclosed tag '" + s[0].tagName + "'.", p(e, s[0].tagStartPos));
				if (s.length > 0) return h("InvalidXml", "Invalid '" + JSON.stringify(s.map((r) => r.tagName), null, 4).replace(/\r?\n/g, "") + "' found.", {
					line: 1,
					col: 1
				});
			} else return h("InvalidXml", "Start tag expected.", 1);
			return !0;
		};
		function M(e) {
			return e === " " || e === "	" || e === `
` || e === "\r";
		}
		function k(e, t) {
			let s = t;
			for (; t < e.length; t++) if (e[t] == "?" || e[t] == " ") {
				let i = e.substr(s, t - s);
				if (t > 5 && i === "xml") return h("InvalidXml", "XML declaration allowed only at the start of the document.", p(e, t));
				if (e[t] == "?" && e[t + 1] == ">") {
					t++;
					break;
				} else continue;
			}
			return t;
		}
		function R(e, t) {
			if (e.length > t + 5 && e[t + 1] === "-" && e[t + 2] === "-") {
				for (t += 3; t < e.length; t++) if (e[t] === "-" && e[t + 1] === "-" && e[t + 2] === ">") {
					t += 2;
					break;
				}
			} else if (e.length > t + 8 && e[t + 1] === "D" && e[t + 2] === "O" && e[t + 3] === "C" && e[t + 4] === "T" && e[t + 5] === "Y" && e[t + 6] === "P" && e[t + 7] === "E") {
				let s = 1;
				for (t += 8; t < e.length; t++) if (e[t] === "<") s++;
				else if (e[t] === ">" && (s--, s === 0)) break;
			} else if (e.length > t + 9 && e[t + 1] === "[" && e[t + 2] === "C" && e[t + 3] === "D" && e[t + 4] === "A" && e[t + 5] === "T" && e[t + 6] === "A" && e[t + 7] === "[") {
				for (t += 8; t < e.length; t++) if (e[t] === "]" && e[t + 1] === "]" && e[t + 2] === ">") {
					t += 2;
					break;
				}
			}
			return t;
		}
		var Te = "\"", ye = "'";
		function me(e, t) {
			let s = "", i = "", n = !1;
			for (; t < e.length; t++) {
				if (e[t] === Te || e[t] === ye) i === "" ? i = e[t] : i !== e[t] || (i = "");
				else if (e[t] === ">" && i === "") {
					n = !0;
					break;
				}
				s += e[t];
			}
			return i !== "" ? !1 : {
				value: s,
				index: t,
				tagClosed: n
			};
		}
		var Ae = new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`, "g");
		function X(e, t) {
			let s = C.getAllMatches(e, Ae), i = {};
			for (let n = 0; n < s.length; n++) {
				if (s[n][1].length === 0) return h("InvalidAttr", "Attribute '" + s[n][2] + "' has no space in starting.", w(s[n]));
				if (s[n][3] !== void 0 && s[n][4] === void 0) return h("InvalidAttr", "Attribute '" + s[n][2] + "' is without value.", w(s[n]));
				if (s[n][3] === void 0 && !t.allowBooleanAttributes) return h("InvalidAttr", "boolean attribute '" + s[n][2] + "' is not allowed.", w(s[n]));
				let r = s[n][2];
				if (!Oe(r)) return h("InvalidAttr", "Attribute '" + r + "' is an invalid name.", w(s[n]));
				if (!i.hasOwnProperty(r)) i[r] = 1;
				else return h("InvalidAttr", "Attribute '" + r + "' is repeated.", w(s[n]));
			}
			return !0;
		}
		function we(e, t) {
			let s = /\d/;
			for (e[t] === "x" && (t++, s = /[\da-fA-F]/); t < e.length; t++) {
				if (e[t] === ";") return t;
				if (!e[t].match(s)) break;
			}
			return -1;
		}
		function Pe(e, t) {
			if (t++, e[t] === ";") return -1;
			if (e[t] === "#") return t++, we(e, t);
			let s = 0;
			for (; t < e.length; t++, s++) if (!(e[t].match(/\w/) && s < 20)) {
				if (e[t] === ";") break;
				return -1;
			}
			return t;
		}
		function h(e, t, s) {
			return { err: {
				code: e,
				msg: t,
				line: s.line || s,
				col: s.col
			} };
		}
		function Oe(e) {
			return C.isName(e);
		}
		function Ie(e) {
			return C.isName(e);
		}
		function p(e, t) {
			let s = e.substring(0, t).split(/\r?\n/);
			return {
				line: s.length,
				col: s[s.length - 1].length + 1
			};
		}
		function w(e) {
			return e.startIndex + e[1].length;
		}
	});
	var U = b((V) => {
		var Z = {
			preserveOrder: !1,
			attributeNamePrefix: "@_",
			attributesGroupName: !1,
			textNodeName: "#text",
			ignoreAttributes: !0,
			removeNSPrefix: !1,
			allowBooleanAttributes: !1,
			parseTagValue: !0,
			parseAttributeValue: !1,
			trimValues: !0,
			cdataPropName: !1,
			numberParseOptions: {
				hex: !0,
				leadingZeros: !0,
				eNotation: !0
			},
			tagValueProcessor: function(e, t) {
				return t;
			},
			attributeValueProcessor: function(e, t) {
				return t;
			},
			stopNodes: [],
			alwaysCreateTextNode: !1,
			isArray: () => !1,
			commentPropName: !1,
			unpairedTags: [],
			processEntities: !0,
			htmlEntities: !1,
			ignoreDeclaration: !1,
			ignorePiTags: !1,
			transformTagName: !1,
			transformAttributeName: !1,
			updateTag: function(e, t, s) {
				return e;
			}
		}, Ce = function(e) {
			return Object.assign({}, Z, e);
		};
		V.buildOptions = Ce;
		V.defaultOptions = Z;
	});
	var J = b((vt, Y) => {
		"use strict";
		var v = class {
			constructor(t) {
				this.tagname = t, this.child = [], this[":@"] = {};
			}
			add(t, s) {
				t === "__proto__" && (t = "#__proto__"), this.child.push({ [t]: s });
			}
			addChild(t) {
				t.tagname === "__proto__" && (t.tagname = "#__proto__"), t[":@"] && Object.keys(t[":@"]).length > 0 ? this.child.push({
					[t.tagname]: t.child,
					":@": t[":@"]
				}) : this.child.push({ [t.tagname]: t.child });
			}
		};
		Y.exports = v;
	});
	var K = b((Ft, W) => {
		var xe = I();
		function Ve(e, t) {
			let s = {};
			if (e[t + 3] === "O" && e[t + 4] === "C" && e[t + 5] === "T" && e[t + 6] === "Y" && e[t + 7] === "P" && e[t + 8] === "E") {
				t = t + 9;
				let i = 1, n = !1, r = !1, f = "";
				for (; t < e.length; t++) if (e[t] === "<" && !r) {
					if (n && Se(e, t)) t += 7, [entityName, val, t] = ve(e, t + 1), val.indexOf("&") === -1 && (s[Be(entityName)] = {
						regx: RegExp(`&${entityName};`, "g"),
						val
					});
					else if (n && $e(e, t)) t += 8;
					else if (n && _e(e, t)) t += 8;
					else if (n && Le(e, t)) t += 9;
					else if (Fe) r = !0;
					else throw new Error("Invalid DOCTYPE");
					i++, f = "";
				} else if (e[t] === ">") {
					if (r ? e[t - 1] === "-" && e[t - 2] === "-" && (r = !1, i--) : i--, i === 0) break;
				} else e[t] === "[" ? n = !0 : f += e[t];
				if (i !== 0) throw new Error("Unclosed DOCTYPE");
			} else throw new Error("Invalid Tag instead of DOCTYPE");
			return {
				entities: s,
				i: t
			};
		}
		function ve(e, t) {
			let s = "";
			for (; t < e.length && e[t] !== "'" && e[t] !== "\""; t++) s += e[t];
			if (s = s.trim(), s.indexOf(" ") !== -1) throw new Error("External entites are not supported");
			let i = e[t++], n = "";
			for (; t < e.length && e[t] !== i; t++) n += e[t];
			return [
				s,
				n,
				t
			];
		}
		function Fe(e, t) {
			return e[t + 1] === "!" && e[t + 2] === "-" && e[t + 3] === "-";
		}
		function Se(e, t) {
			return e[t + 1] === "!" && e[t + 2] === "E" && e[t + 3] === "N" && e[t + 4] === "T" && e[t + 5] === "I" && e[t + 6] === "T" && e[t + 7] === "Y";
		}
		function $e(e, t) {
			return e[t + 1] === "!" && e[t + 2] === "E" && e[t + 3] === "L" && e[t + 4] === "E" && e[t + 5] === "M" && e[t + 6] === "E" && e[t + 7] === "N" && e[t + 8] === "T";
		}
		function _e(e, t) {
			return e[t + 1] === "!" && e[t + 2] === "A" && e[t + 3] === "T" && e[t + 4] === "T" && e[t + 5] === "L" && e[t + 6] === "I" && e[t + 7] === "S" && e[t + 8] === "T";
		}
		function Le(e, t) {
			return e[t + 1] === "!" && e[t + 2] === "N" && e[t + 3] === "O" && e[t + 4] === "T" && e[t + 5] === "A" && e[t + 6] === "T" && e[t + 7] === "I" && e[t + 8] === "O" && e[t + 9] === "N";
		}
		function Be(e) {
			if (xe.isName(e)) return e;
			throw new Error(`Invalid entity name ${e}`);
		}
		W.exports = Ve;
	});
	var z = b((St, Q) => {
		var qe = /^[-+]?0x[a-fA-F0-9]+$/, Me = /^([\-\+])?(0*)(\.[0-9]+([eE]\-?[0-9]+)?|[0-9]+(\.[0-9]+([eE]\-?[0-9]+)?)?)$/;
		!Number.parseInt && window.parseInt && (Number.parseInt = window.parseInt);
		!Number.parseFloat && window.parseFloat && (Number.parseFloat = window.parseFloat);
		var ke = {
			hex: !0,
			leadingZeros: !0,
			decimalPoint: ".",
			eNotation: !0
		};
		function Re(e, t = {}) {
			if (t = Object.assign({}, ke, t), !e || typeof e != "string") return e;
			let s = e.trim();
			if (t.skipLike !== void 0 && t.skipLike.test(s)) return e;
			if (t.hex && qe.test(s)) return Number.parseInt(s, 16);
			{
				let i = Me.exec(s);
				if (i) {
					let n = i[1], r = i[2], f = Xe(i[3]), u = i[4] || i[6];
					if (!t.leadingZeros && r.length > 0 && n && s[2] !== ".") return e;
					if (!t.leadingZeros && r.length > 0 && !n && s[1] !== ".") return e;
					{
						let o = Number(s), l = "" + o;
						return l.search(/[eE]/) !== -1 || u ? t.eNotation ? o : e : s.indexOf(".") !== -1 ? l === "0" && f === "" || l === f || n && l === "-" + f ? o : e : r ? f === l || n + f === l ? o : e : s === l || s === n + l ? o : e;
					}
				} else return e;
			}
		}
		function Xe(e) {
			return e && e.indexOf(".") !== -1 && (e = e.replace(/0+$/, ""), e === "." ? e = "0" : e[0] === "." ? e = "0" + e : e[e.length - 1] === "." && (e = e.substr(0, e.length - 1))), e;
		}
		Q.exports = Re;
	});
	var j = b((_t, H) => {
		"use strict";
		var _ = I(), P = J(), Ge = K(), Ze = z();
		"<((!\\[CDATA\\[([\\s\\S]*?)(]]>))|((NAME:)?(NAME))([^>]*)>|((\\/)(NAME)\\s*>))([^<]*)".replace(/NAME/g, _.nameRegexp);
		var F = class {
			constructor(t) {
				this.options = t, this.currentNode = null, this.tagsNodeStack = [], this.docTypeEntities = {}, this.lastEntities = {
					apos: {
						regex: /&(apos|#39|#x27);/g,
						val: "'"
					},
					gt: {
						regex: /&(gt|#62|#x3E);/g,
						val: ">"
					},
					lt: {
						regex: /&(lt|#60|#x3C);/g,
						val: "<"
					},
					quot: {
						regex: /&(quot|#34|#x22);/g,
						val: "\""
					}
				}, this.ampEntity = {
					regex: /&(amp|#38|#x26);/g,
					val: "&"
				}, this.htmlEntities = {
					space: {
						regex: /&(nbsp|#160);/g,
						val: " "
					},
					cent: {
						regex: /&(cent|#162);/g,
						val: "¢"
					},
					pound: {
						regex: /&(pound|#163);/g,
						val: "£"
					},
					yen: {
						regex: /&(yen|#165);/g,
						val: "¥"
					},
					euro: {
						regex: /&(euro|#8364);/g,
						val: "€"
					},
					copyright: {
						regex: /&(copy|#169);/g,
						val: "©"
					},
					reg: {
						regex: /&(reg|#174);/g,
						val: "®"
					},
					inr: {
						regex: /&(inr|#8377);/g,
						val: "₹"
					}
				}, this.addExternalEntities = Ue, this.parseXml = Qe, this.parseTextData = Ye, this.resolveNameSpace = Je, this.buildAttributesMap = Ke, this.isItStopNode = De, this.replaceEntitiesValue = He, this.readStopNodeData = tt, this.saveTextToParentTag = je, this.addChild = ze;
			}
		};
		function Ue(e) {
			let t = Object.keys(e);
			for (let s = 0; s < t.length; s++) {
				let i = t[s];
				this.lastEntities[i] = {
					regex: new RegExp("&" + i + ";", "g"),
					val: e[i]
				};
			}
		}
		function Ye(e, t, s, i, n, r, f) {
			if (e !== void 0 && (this.options.trimValues && !i && (e = e.trim()), e.length > 0)) {
				f || (e = this.replaceEntitiesValue(e));
				let u = this.options.tagValueProcessor(t, e, s, n, r);
				return u == null ? e : typeof u != typeof e || u !== e ? u : this.options.trimValues ? $(e, this.options.parseTagValue, this.options.numberParseOptions) : e.trim() === e ? $(e, this.options.parseTagValue, this.options.numberParseOptions) : e;
			}
		}
		function Je(e) {
			if (this.options.removeNSPrefix) {
				let t = e.split(":"), s = e.charAt(0) === "/" ? "/" : "";
				if (t[0] === "xmlns") return "";
				t.length === 2 && (e = s + t[1]);
			}
			return e;
		}
		var We = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
		function Ke(e, t, s) {
			if (!this.options.ignoreAttributes && typeof e == "string") {
				let i = _.getAllMatches(e, We), n = i.length, r = {};
				for (let f = 0; f < n; f++) {
					let u = this.resolveNameSpace(i[f][1]), o = i[f][4], l = this.options.attributeNamePrefix + u;
					if (u.length) if (this.options.transformAttributeName && (l = this.options.transformAttributeName(l)), l === "__proto__" && (l = "#__proto__"), o !== void 0) {
						this.options.trimValues && (o = o.trim()), o = this.replaceEntitiesValue(o);
						let a = this.options.attributeValueProcessor(u, o, t);
						a == null ? r[l] = o : typeof a != typeof o || a !== o ? r[l] = a : r[l] = $(o, this.options.parseAttributeValue, this.options.numberParseOptions);
					} else this.options.allowBooleanAttributes && (r[l] = !0);
				}
				if (!Object.keys(r).length) return;
				if (this.options.attributesGroupName) {
					let f = {};
					return f[this.options.attributesGroupName] = r, f;
				}
				return r;
			}
		}
		var Qe = function(e) {
			e = e.replace(/\r\n?/g, `
`);
			let t = new P("!xml"), s = t, i = "", n = "";
			for (let r = 0; r < e.length; r++) if (e[r] === "<") if (e[r + 1] === "/") {
				let u = m(e, ">", r, "Closing Tag is not closed."), o = e.substring(r + 2, u).trim();
				if (this.options.removeNSPrefix) {
					let d = o.indexOf(":");
					d !== -1 && (o = o.substr(d + 1));
				}
				this.options.transformTagName && (o = this.options.transformTagName(o)), s && (i = this.saveTextToParentTag(i, s, n));
				let l = n.substring(n.lastIndexOf(".") + 1);
				if (o && this.options.unpairedTags.indexOf(o) !== -1) throw new Error(`Unpaired tag can not be used as closing tag: </${o}>`);
				let a = 0;
				l && this.options.unpairedTags.indexOf(l) !== -1 ? (a = n.lastIndexOf(".", n.lastIndexOf(".") - 1), this.tagsNodeStack.pop()) : a = n.lastIndexOf("."), n = n.substring(0, a), s = this.tagsNodeStack.pop(), i = "", r = u;
			} else if (e[r + 1] === "?") {
				let u = S(e, r, !1, "?>");
				if (!u) throw new Error("Pi Tag is not closed.");
				if (i = this.saveTextToParentTag(i, s, n), !(this.options.ignoreDeclaration && u.tagName === "?xml" || this.options.ignorePiTags)) {
					let o = new P(u.tagName);
					o.add(this.options.textNodeName, ""), u.tagName !== u.tagExp && u.attrExpPresent && (o[":@"] = this.buildAttributesMap(u.tagExp, n, u.tagName)), this.addChild(s, o, n);
				}
				r = u.closeIndex + 1;
			} else if (e.substr(r + 1, 3) === "!--") {
				let u = m(e, "-->", r + 4, "Comment is not closed.");
				if (this.options.commentPropName) {
					let o = e.substring(r + 4, u - 2);
					i = this.saveTextToParentTag(i, s, n), s.add(this.options.commentPropName, [{ [this.options.textNodeName]: o }]);
				}
				r = u;
			} else if (e.substr(r + 1, 2) === "!D") {
				let u = Ge(e, r);
				this.docTypeEntities = u.entities, r = u.i;
			} else if (e.substr(r + 1, 2) === "![") {
				let u = m(e, "]]>", r, "CDATA is not closed.") - 2, o = e.substring(r + 9, u);
				if (i = this.saveTextToParentTag(i, s, n), this.options.cdataPropName) s.add(this.options.cdataPropName, [{ [this.options.textNodeName]: o }]);
				else {
					let l = this.parseTextData(o, s.tagname, n, !0, !1, !0);
					l ??= "", s.add(this.options.textNodeName, l);
				}
				r = u + 2;
			} else {
				let u = S(e, r, this.options.removeNSPrefix), o = u.tagName, l = u.rawTagName, a = u.tagExp, d = u.attrExpPresent, g = u.closeIndex;
				this.options.transformTagName && (o = this.options.transformTagName(o)), s && i && s.tagname !== "!xml" && (i = this.saveTextToParentTag(i, s, n, !1));
				let N = s;
				if (N && this.options.unpairedTags.indexOf(N.tagname) !== -1 && (s = this.tagsNodeStack.pop(), n = n.substring(0, n.lastIndexOf("."))), o !== t.tagname && (n += n ? "." + o : o), this.isItStopNode(this.options.stopNodes, n, o)) {
					let c = "";
					if (a.length > 0 && a.lastIndexOf("/") === a.length - 1) r = u.closeIndex;
					else if (this.options.unpairedTags.indexOf(o) !== -1) r = u.closeIndex;
					else {
						let T = this.readStopNodeData(e, l, g + 1);
						if (!T) throw new Error(`Unexpected end of ${l}`);
						r = T.i, c = T.tagContent;
					}
					let A = new P(o);
					o !== a && d && (A[":@"] = this.buildAttributesMap(a, n, o)), c && (c = this.parseTextData(c, o, n, !0, d, !0, !0)), n = n.substr(0, n.lastIndexOf(".")), A.add(this.options.textNodeName, c), this.addChild(s, A, n);
				} else {
					if (a.length > 0 && a.lastIndexOf("/") === a.length - 1) {
						o[o.length - 1] === "/" ? (o = o.substr(0, o.length - 1), n = n.substr(0, n.length - 1), a = o) : a = a.substr(0, a.length - 1), this.options.transformTagName && (o = this.options.transformTagName(o));
						let c = new P(o);
						o !== a && d && (c[":@"] = this.buildAttributesMap(a, n, o)), this.addChild(s, c, n), n = n.substr(0, n.lastIndexOf("."));
					} else {
						let c = new P(o);
						this.tagsNodeStack.push(s), o !== a && d && (c[":@"] = this.buildAttributesMap(a, n, o)), this.addChild(s, c, n), s = c;
					}
					i = "", r = g;
				}
			}
			else i += e[r];
			return t.child;
		};
		function ze(e, t, s) {
			let i = this.options.updateTag(t.tagname, s, t[":@"]);
			i === !1 || (typeof i == "string" && (t.tagname = i), e.addChild(t));
		}
		var He = function(e) {
			if (this.options.processEntities) {
				for (let t in this.docTypeEntities) {
					let s = this.docTypeEntities[t];
					e = e.replace(s.regx, s.val);
				}
				for (let t in this.lastEntities) {
					let s = this.lastEntities[t];
					e = e.replace(s.regex, s.val);
				}
				if (this.options.htmlEntities) for (let t in this.htmlEntities) {
					let s = this.htmlEntities[t];
					e = e.replace(s.regex, s.val);
				}
				e = e.replace(this.ampEntity.regex, this.ampEntity.val);
			}
			return e;
		};
		function je(e, t, s, i) {
			return e && (i === void 0 && (i = Object.keys(t.child).length === 0), e = this.parseTextData(e, t.tagname, s, !1, t[":@"] ? Object.keys(t[":@"]).length !== 0 : !1, i), e !== void 0 && e !== "" && t.add(this.options.textNodeName, e), e = ""), e;
		}
		function De(e, t, s) {
			let i = "*." + s;
			for (let n in e) {
				let r = e[n];
				if (i === r || t === r) return !0;
			}
			return !1;
		}
		function et(e, t, s = ">") {
			let i, n = "";
			for (let r = t; r < e.length; r++) {
				let f = e[r];
				if (i) f === i && (i = "");
				else if (f === "\"" || f === "'") i = f;
				else if (f === s[0]) if (s[1]) {
					if (e[r + 1] === s[1]) return {
						data: n,
						index: r
					};
				} else return {
					data: n,
					index: r
				};
				else f === "	" && (f = " ");
				n += f;
			}
		}
		function m(e, t, s, i) {
			let n = e.indexOf(t, s);
			if (n === -1) throw new Error(i);
			return n + t.length - 1;
		}
		function S(e, t, s, i = ">") {
			let n = et(e, t + 1, i);
			if (!n) return;
			let r = n.data, f = n.index, u = r.search(/\s/), o = r, l = !0;
			u !== -1 && (o = r.substr(0, u).replace(/\s\s*$/, ""), r = r.substr(u + 1));
			let a = o;
			if (s) {
				let d = o.indexOf(":");
				d !== -1 && (o = o.substr(d + 1), l = o !== n.data.substr(d + 1));
			}
			return {
				tagName: o,
				tagExp: r,
				closeIndex: f,
				attrExpPresent: l,
				rawTagName: a
			};
		}
		function tt(e, t, s) {
			let i = s, n = 1;
			for (; s < e.length; s++) if (e[s] === "<") if (e[s + 1] === "/") {
				let r = m(e, ">", s, `${t} is not closed`);
				if (e.substring(s + 2, r).trim() === t && (n--, n === 0)) return {
					tagContent: e.substring(i, s),
					i: r
				};
				s = r;
			} else if (e[s + 1] === "?") s = m(e, "?>", s + 1, "StopNode is not closed.");
			else if (e.substr(s + 1, 3) === "!--") s = m(e, "-->", s + 3, "StopNode is not closed.");
			else if (e.substr(s + 1, 2) === "![") s = m(e, "]]>", s, "StopNode is not closed.") - 2;
			else {
				let r = S(e, s, ">");
				r && ((r && r.tagName) === t && r.tagExp[r.tagExp.length - 1] !== "/" && n++, s = r.closeIndex);
			}
		}
		function $(e, t, s) {
			if (t && typeof e == "string") {
				let i = e.trim();
				return i === "true" ? !0 : i === "false" ? !1 : Ze(e, s);
			} else return _.isExist(e) ? e : "";
		}
		H.exports = F;
	});
	var te = b((ee) => {
		"use strict";
		function st(e, t) {
			return D(e, t);
		}
		function D(e, t, s) {
			let i, n = {};
			for (let r = 0; r < e.length; r++) {
				let f = e[r], u = nt(f), o = "";
				if (s === void 0 ? o = u : o = s + "." + u, u === t.textNodeName) i === void 0 ? i = f[u] : i += "" + f[u];
				else {
					if (u === void 0) continue;
					if (f[u]) {
						let l = D(f[u], t, o), a = it(l, t);
						f[":@"] ? rt(l, f[":@"], o, t) : Object.keys(l).length === 1 && l[t.textNodeName] !== void 0 && !t.alwaysCreateTextNode ? l = l[t.textNodeName] : Object.keys(l).length === 0 && (t.alwaysCreateTextNode ? l[t.textNodeName] = "" : l = ""), n[u] !== void 0 && n.hasOwnProperty(u) ? (Array.isArray(n[u]) || (n[u] = [n[u]]), n[u].push(l)) : t.isArray(u, o, a) ? n[u] = [l] : n[u] = l;
					}
				}
			}
			return typeof i == "string" ? i.length > 0 && (n[t.textNodeName] = i) : i !== void 0 && (n[t.textNodeName] = i), n;
		}
		function nt(e) {
			let t = Object.keys(e);
			for (let s = 0; s < t.length; s++) {
				let i = t[s];
				if (i !== ":@") return i;
			}
		}
		function rt(e, t, s, i) {
			if (t) {
				let n = Object.keys(t), r = n.length;
				for (let f = 0; f < r; f++) {
					let u = n[f];
					i.isArray(u, s + "." + u, !0, !0) ? e[u] = [t[u]] : e[u] = t[u];
				}
			}
		}
		function it(e, t) {
			let { textNodeName: s } = t, i = Object.keys(e).length;
			return !!(i === 0 || i === 1 && (e[s] || typeof e[s] == "boolean" || e[s] === 0));
		}
		ee.prettify = st;
	});
	var ne = b((Bt, se) => {
		var { buildOptions: ot } = U(), ut = j(), { prettify: ft } = te(), lt = x(), L = class {
			constructor(t) {
				this.externalEntities = {}, this.options = ot(t);
			}
			parse(t, s) {
				if (typeof t != "string") if (t.toString) t = t.toString();
				else throw new Error("XML data is accepted in String or Bytes[] form.");
				if (s) {
					s === !0 && (s = {});
					let r = lt.validate(t, s);
					if (r !== !0) throw Error(`${r.err.msg}:${r.err.line}:${r.err.col}`);
				}
				let i = new ut(this.options);
				i.addExternalEntities(this.externalEntities);
				let n = i.parseXml(t);
				return this.options.preserveOrder || n === void 0 ? n : ft(n, this.options);
			}
			addEntity(t, s) {
				if (s.indexOf("&") !== -1) throw new Error("Entity value can't have '&'");
				if (t.indexOf("&") !== -1 || t.indexOf(";") !== -1) throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
				if (s === "&") throw new Error("An entity with value '&' is not permitted");
				this.externalEntities[t] = s;
			}
		};
		se.exports = L;
	});
	var fe = b((qt, ue) => {
		var at = `
`;
		function dt(e, t) {
			let s = "";
			return t.format && t.indentBy.length > 0 && (s = at), ie(e, t, "", s);
		}
		function ie(e, t, s, i) {
			let n = "", r = !1;
			for (let f = 0; f < e.length; f++) {
				let u = e[f], o = ct(u);
				if (o === void 0) continue;
				let l = "";
				if (s.length === 0 ? l = o : l = `${s}.${o}`, o === t.textNodeName) {
					let c = u[o];
					ht(l, t) || (c = t.tagValueProcessor(o, c), c = oe(c, t)), r && (n += i), n += c, r = !1;
					continue;
				} else if (o === t.cdataPropName) {
					r && (n += i), n += `<![CDATA[${u[o][0][t.textNodeName]}]]>`, r = !1;
					continue;
				} else if (o === t.commentPropName) {
					n += i + `<!--${u[o][0][t.textNodeName]}-->`, r = !0;
					continue;
				} else if (o[0] === "?") {
					let c = re(u[":@"], t), A = o === "?xml" ? "" : i, T = u[o][0][t.textNodeName];
					T = T.length !== 0 ? " " + T : "", n += A + `<${o}${T}${c}?>`, r = !0;
					continue;
				}
				let a = i;
				a !== "" && (a += t.indentBy);
				let g = i + `<${o}${re(u[":@"], t)}`, N = ie(u[o], t, l, a);
				t.unpairedTags.indexOf(o) !== -1 ? t.suppressUnpairedNode ? n += g + ">" : n += g + "/>" : (!N || N.length === 0) && t.suppressEmptyNode ? n += g + "/>" : N && N.endsWith(">") ? n += g + `>${N}${i}</${o}>` : (n += g + ">", N && i !== "" && (N.includes("/>") || N.includes("</")) ? n += i + t.indentBy + N + i : n += N, n += `</${o}>`), r = !0;
			}
			return n;
		}
		function ct(e) {
			let t = Object.keys(e);
			for (let s = 0; s < t.length; s++) {
				let i = t[s];
				if (e.hasOwnProperty(i) && i !== ":@") return i;
			}
		}
		function re(e, t) {
			let s = "";
			if (e && !t.ignoreAttributes) for (let i in e) {
				if (!e.hasOwnProperty(i)) continue;
				let n = t.attributeValueProcessor(i, e[i]);
				n = oe(n, t), n === !0 && t.suppressBooleanAttributes ? s += ` ${i.substr(t.attributeNamePrefix.length)}` : s += ` ${i.substr(t.attributeNamePrefix.length)}="${n}"`;
			}
			return s;
		}
		function ht(e, t) {
			e = e.substr(0, e.length - t.textNodeName.length - 1);
			let s = e.substr(e.lastIndexOf(".") + 1);
			for (let i in t.stopNodes) if (t.stopNodes[i] === e || t.stopNodes[i] === "*." + s) return !0;
			return !1;
		}
		function oe(e, t) {
			if (e && e.length > 0 && t.processEntities) for (let s = 0; s < t.entities.length; s++) {
				let i = t.entities[s];
				e = e.replace(i.regex, i.val);
			}
			return e;
		}
		ue.exports = dt;
	});
	var ae = b((Mt, le) => {
		"use strict";
		var gt = fe(), pt = {
			attributeNamePrefix: "@_",
			attributesGroupName: !1,
			textNodeName: "#text",
			ignoreAttributes: !0,
			cdataPropName: !1,
			format: !1,
			indentBy: "  ",
			suppressEmptyNode: !1,
			suppressUnpairedNode: !0,
			suppressBooleanAttributes: !0,
			tagValueProcessor: function(e, t) {
				return t;
			},
			attributeValueProcessor: function(e, t) {
				return t;
			},
			preserveOrder: !1,
			commentPropName: !1,
			unpairedTags: [],
			entities: [
				{
					regex: /* @__PURE__ */ new RegExp("&", "g"),
					val: "&amp;"
				},
				{
					regex: /* @__PURE__ */ new RegExp(">", "g"),
					val: "&gt;"
				},
				{
					regex: /* @__PURE__ */ new RegExp("<", "g"),
					val: "&lt;"
				},
				{
					regex: /* @__PURE__ */ new RegExp("'", "g"),
					val: "&apos;"
				},
				{
					regex: /* @__PURE__ */ new RegExp("\"", "g"),
					val: "&quot;"
				}
			],
			processEntities: !0,
			stopNodes: [],
			oneListGroup: !1
		};
		function y(e) {
			this.options = Object.assign({}, pt, e), this.options.ignoreAttributes || this.options.attributesGroupName ? this.isAttribute = function() {
				return !1;
			} : (this.attrPrefixLen = this.options.attributeNamePrefix.length, this.isAttribute = Et), this.processTextOrObjNode = Nt, this.options.format ? (this.indentate = bt, this.tagEndChar = `>
`, this.newLine = `
`) : (this.indentate = function() {
				return "";
			}, this.tagEndChar = ">", this.newLine = "");
		}
		y.prototype.build = function(e) {
			return this.options.preserveOrder ? gt(e, this.options) : (Array.isArray(e) && this.options.arrayNodeName && this.options.arrayNodeName.length > 1 && (e = { [this.options.arrayNodeName]: e }), this.j2x(e, 0).val);
		};
		y.prototype.j2x = function(e, t) {
			let s = "", i = "";
			for (let n in e) if (Object.prototype.hasOwnProperty.call(e, n)) if (typeof e[n] > "u") this.isAttribute(n) && (i += "");
			else if (e[n] === null) this.isAttribute(n) ? i += "" : n[0] === "?" ? i += this.indentate(t) + "<" + n + "?" + this.tagEndChar : i += this.indentate(t) + "<" + n + "/" + this.tagEndChar;
			else if (e[n] instanceof Date) i += this.buildTextValNode(e[n], n, "", t);
			else if (typeof e[n] != "object") {
				let r = this.isAttribute(n);
				if (r) s += this.buildAttrPairStr(r, "" + e[n]);
				else if (n === this.options.textNodeName) {
					let f = this.options.tagValueProcessor(n, "" + e[n]);
					i += this.replaceEntitiesValue(f);
				} else i += this.buildTextValNode(e[n], n, "", t);
			} else if (Array.isArray(e[n])) {
				let r = e[n].length, f = "";
				for (let u = 0; u < r; u++) {
					let o = e[n][u];
					typeof o > "u" || (o === null ? n[0] === "?" ? i += this.indentate(t) + "<" + n + "?" + this.tagEndChar : i += this.indentate(t) + "<" + n + "/" + this.tagEndChar : typeof o == "object" ? this.options.oneListGroup ? f += this.j2x(o, t + 1).val : f += this.processTextOrObjNode(o, n, t) : f += this.buildTextValNode(o, n, "", t));
				}
				this.options.oneListGroup && (f = this.buildObjectNode(f, n, "", t)), i += f;
			} else if (this.options.attributesGroupName && n === this.options.attributesGroupName) {
				let r = Object.keys(e[n]), f = r.length;
				for (let u = 0; u < f; u++) s += this.buildAttrPairStr(r[u], "" + e[n][r[u]]);
			} else i += this.processTextOrObjNode(e[n], n, t);
			return {
				attrStr: s,
				val: i
			};
		};
		y.prototype.buildAttrPairStr = function(e, t) {
			return t = this.options.attributeValueProcessor(e, "" + t), t = this.replaceEntitiesValue(t), this.options.suppressBooleanAttributes && t === "true" ? " " + e : " " + e + "=\"" + t + "\"";
		};
		function Nt(e, t, s) {
			let i = this.j2x(e, s + 1);
			return e[this.options.textNodeName] !== void 0 && Object.keys(e).length === 1 ? this.buildTextValNode(e[this.options.textNodeName], t, i.attrStr, s) : this.buildObjectNode(i.val, t, i.attrStr, s);
		}
		y.prototype.buildObjectNode = function(e, t, s, i) {
			if (e === "") return t[0] === "?" ? this.indentate(i) + "<" + t + s + "?" + this.tagEndChar : this.indentate(i) + "<" + t + s + this.closeTag(t) + this.tagEndChar;
			{
				let n = "</" + t + this.tagEndChar, r = "";
				return t[0] === "?" && (r = "?", n = ""), (s || s === "") && e.indexOf("<") === -1 ? this.indentate(i) + "<" + t + s + r + ">" + e + n : this.options.commentPropName !== !1 && t === this.options.commentPropName && r.length === 0 ? this.indentate(i) + `<!--${e}-->` + this.newLine : this.indentate(i) + "<" + t + s + r + this.tagEndChar + e + this.indentate(i) + n;
			}
		};
		y.prototype.closeTag = function(e) {
			let t = "";
			return this.options.unpairedTags.indexOf(e) !== -1 ? this.options.suppressUnpairedNode || (t = "/") : this.options.suppressEmptyNode ? t = "/" : t = `></${e}`, t;
		};
		y.prototype.buildTextValNode = function(e, t, s, i) {
			if (this.options.cdataPropName !== !1 && t === this.options.cdataPropName) return this.indentate(i) + `<![CDATA[${e}]]>` + this.newLine;
			if (this.options.commentPropName !== !1 && t === this.options.commentPropName) return this.indentate(i) + `<!--${e}-->` + this.newLine;
			if (t[0] === "?") return this.indentate(i) + "<" + t + s + "?" + this.tagEndChar;
			{
				let n = this.options.tagValueProcessor(t, e);
				return n = this.replaceEntitiesValue(n), n === "" ? this.indentate(i) + "<" + t + s + this.closeTag(t) + this.tagEndChar : this.indentate(i) + "<" + t + s + ">" + n + "</" + t + this.tagEndChar;
			}
		};
		y.prototype.replaceEntitiesValue = function(e) {
			if (e && e.length > 0 && this.options.processEntities) for (let t = 0; t < this.options.entities.length; t++) {
				let s = this.options.entities[t];
				e = e.replace(s.regex, s.val);
			}
			return e;
		};
		function bt(e) {
			return this.options.indentBy.repeat(e);
		}
		function Et(e) {
			return e.startsWith(this.options.attributeNamePrefix) && e !== this.options.textNodeName ? e.substr(this.attrPrefixLen) : !1;
		}
		le.exports = y;
	});
	var ce = b((kt, de) => {
		"use strict";
		var Tt = x();
		de.exports = {
			XMLParser: ne(),
			XMLValidator: Tt,
			XMLBuilder: ae()
		};
	});
	var he = b((O) => {
		"use strict";
		Object.defineProperty(O, "__esModule", { value: !0 });
		O.getValueFromTextNode = void 0;
		var At = (e) => {
			let t = "#text";
			for (let s in e) e.hasOwnProperty(s) && e[s][t] !== void 0 ? e[s] = e[s][t] : typeof e[s] == "object" && e[s] !== null && (e[s] = (0, O.getValueFromTextNode)(e[s]));
			return e;
		};
		O.getValueFromTextNode = At;
	});
	var { XMLParser: wt, XMLBuilder: Pt } = ce(), { getValueFromTextNode: Ot } = he();
	module.exports = {
		XMLParser: wt,
		XMLBuilder: Pt,
		getValueFromTextNode: Ot
	};
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/lib/index.js
var require_lib = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var aws;
	var xml;
	function marshaller(method, obj, options) {
		if (!aws) aws = require_aws();
		/* istanbul ignore next */
		options = options || {};
		/* istanbul ignore next */
		let { awsjson: awsjsonSetting, config = {} } = options;
		let { awsjsonMarshall, awsjsonUnmarshall } = config;
		let marshallOptions = method === "marshall" ? awsjsonMarshall : awsjsonUnmarshall;
		if (marshallOptions) {
			let { is } = require_validate();
			if (!is.object(marshallOptions)) throw ReferenceError("AWS JSON marshall/unmarshall options must be an object");
		}
		if (Array.isArray(awsjsonSetting)) return Object.entries(obj).reduce((acc, [k, v]) => {
			if (awsjsonSetting.includes(k)) acc[k] = aws[method](v, marshallOptions);
			else acc[k] = v;
			return acc;
		}, {});
		return aws[method](obj, marshallOptions);
	}
	var awsjson = {
		marshall: marshaller.bind({}, "marshall"),
		unmarshall: marshaller.bind({}, "unmarshall")
	};
	var copy = (obj) => JSON.parse(JSON.stringify(obj));
	async function exists(file) {
		let { stat } = __require("node:fs/promises");
		try {
			await stat(file);
			return true;
		} catch {
			return false;
		}
	}
	function tidyPathPrefix(pathPrefix) {
		if (pathPrefix === "/") return;
		if (!pathPrefix.startsWith("/")) pathPrefix = "/" + pathPrefix;
		if (pathPrefix.endsWith("/")) pathPrefix = pathPrefix.substring(0, pathPrefix.length - 1);
		return pathPrefix;
	}
	var tidyObj = (obj) => Object.keys(obj).forEach((k) => !obj[k] && delete obj[k]);
	function getEndpointParams(input) {
		if (input.endpoint || input.url) try {
			let url = new URL(input.endpoint || input.url);
			let params = {
				pathPrefix: tidyPathPrefix(url.pathname),
				host: url.hostname,
				port: Number(url.port),
				protocol: url.protocol
			};
			tidyObj(params);
			return params;
		} catch {
			return { host: input.endpoint || input.url };
		}
		let { pathPrefix, host, hostname, port, protocol } = input;
		try {
			host = new URL(host || hostname).hostname;
		} catch {}
		if (pathPrefix) pathPrefix = tidyPathPrefix(pathPrefix);
		if (port) port = Number(port);
		if (typeof protocol === "string" && !protocol.endsWith(":")) protocol += ":";
		validateProtocol(protocol);
		let params = {
			pathPrefix,
			host: host || hostname,
			port,
			protocol
		};
		tidyObj(params);
		return params;
	}
	var profileName = /^profile\s/;
	async function loadAwsConfig(params) {
		if (isInLambda()) return;
		let { awsConfigFile, profile } = params;
		let { AWS_SDK_LOAD_CONFIG, AWS_CONFIG_FILE, AWS_SHARED_CREDENTIALS_FILE } = process.env;
		let { join } = __require("node:path");
		let home = getHomedir();
		let awsConfig;
		if (AWS_SDK_LOAD_CONFIG || awsConfigFile) {
			let configFile = AWS_CONFIG_FILE || join(home, ".aws", "config");
			if (typeof awsConfigFile === "string") configFile = awsConfigFile;
			let config = await readIni(configFile);
			/* istanbul ignore next: TODO remove + test */
			if (config) {
				awsConfig = {};
				awsConfig.config = config;
				let profiles = {};
				Object.entries(config).forEach(([name, data]) => {
					if (name === "default" || profileName.test(name)) profiles[name.replace(profileName, "")] = data;
				});
				if (Object.keys(profiles).length) awsConfig.profiles = profiles;
			}
		}
		let creds = await readIni(AWS_SHARED_CREDENTIALS_FILE || join(home, ".aws", "credentials"));
		/* istanbul ignore next: TODO remove + test */
		if (creds) {
			awsConfig = awsConfig || {};
			awsConfig.creds = creds;
			if (!awsConfig.profiles) awsConfig.profiles = {};
			Object.entries(creds).forEach(([name, data]) => awsConfig.profiles[name] = data);
		}
		if (awsConfig) {
			if (awsConfig?.profiles?.[profile]) awsConfig.currentProfile = awsConfig.profiles[profile];
			else throw ReferenceError(`Profile not found: ${profile}`);
		}
		return awsConfig;
	}
	var cache = {};
	/* istanbul ignore next */
	async function readFile(file) {
		if (cache[file]) return cache[file];
		if (!await exists(file)) return;
		let { readFile } = __require("node:fs/promises");
		cache[file] = await readFile(file);
		return cache[file];
	}
	async function readIni(file) {
		if (cache[file]) return cache[file];
		if (!await exists(file)) return;
		let data = await readFile(file);
		/* istanbul ignore next */
		if (!data) return;
		cache[file] = parseAwsIni(data.toString());
		return cache[file];
	}
	function getHomedir() {
		return __require("node:os").homedir();
	}
	function isInLambda() {
		return !!process.env.AWS_LAMBDA_FUNCTION_NAME;
	}
	var iniRegex = /^\[([^\]]+)\]\s*(?:#.*)?$|^([a-z_]+)\s*=\s*(.+?)\s*(?:#.*)?$/;
	function parseAwsIni(ini) {
		let section;
		let out = Object.create(null);
		/* istanbul ignore next */
		ini.split(/\r?\n/).forEach((line) => {
			let match = line.match(iniRegex);
			if (!match) return;
			if (match[1]) {
				section = match[1];
				if (out[section] == null) out[section] = Object.create(null);
			} else if (section) out[section][match[2]] = match[3];
		});
		return out;
	}
	function tidyQuery(obj) {
		let qs = __require("node:querystring");
		let tidied = {};
		Object.entries(obj).forEach(([k, v]) => {
			if (v || v === false || v === 0 || v === "") tidied[k] = v;
		});
		if (Object.keys(tidied).length) return qs.stringify(tidied);
	}
	var nonLocalEnvs = ["staging", "production"];
	function useAWS() {
		let { ARC_ENV, ARC_LOCAL, ARC_SANDBOX } = process.env;
		if (ARC_ENV === "testing") return false;
		if (nonLocalEnvs.includes(ARC_ENV) && ARC_SANDBOX && !ARC_LOCAL) return false;
		return true;
	}
	var textNodeName = "#text";
	function maybeConvertString(str) {
		if (str === "true") return true;
		else if (str === "false") return false;
		else if (str === "null") return null;
		else if (str === "") return str;
		else if (str?.match(/^[ ]+$/)) return str;
		else if (!isNaN(Number(str))) return Number(str);
		try {
			/* istanbul ignore else */
			if (new Date(Date.parse(str)).toISOString() === str) return new Date(str);
		} catch {}
		return str;
	}
	function coerceXMLValues(obj) {
		Object.keys(obj).forEach((k) => {
			/* istanbul ignore next */
			if (typeof obj[k] === "string") obj[k] = maybeConvertString(obj[k]);
			else if (Array.isArray(obj[k])) obj[k] = obj[k].map((i) => {
				if (typeof i === "object" && !Array.isArray(i)) return coerceXMLValues(i);
				return maybeConvertString(i);
			});
			else if (typeof obj[k] === "object") coerceXMLValues(obj[k]);
		});
		return obj;
	}
	/* istanbul ignore next */
	function instantiateXml() {
		if (xml) return;
		let vendor = require_xml();
		xml = {
			parser: new vendor.XMLParser({
				attributeNamePrefix: "",
				htmlEntities: true,
				ignoreAttributes: false,
				ignoreDeclaration: true,
				parseTagValue: false,
				trimValues: false,
				tagValueProcessor: (_, val) => val.trim() === "" && val.includes("\n") ? "" : void 0
			}),
			builder: new vendor.XMLBuilder()
		};
		xml.parser.addEntity("#xD", "\r");
		xml.parser.addEntity("#10", "\n");
		xml.parser.getValueFromTextNode = vendor.getValueFromTextNode;
	}
	function buildXML(obj, params) {
		instantiateXml();
		let payload = xml.builder.build(obj);
		if (params?.xmlns) {
			let parent = Object.keys(obj)[0];
			payload = payload.replace(`<${parent}>`, `<${parent} xmlns="${params.xmlns}">`);
		}
		return payload;
	}
	function parseXML(body) {
		instantiateXml();
		let parsed = xml.parser.parse(body);
		let key = Object.keys(parsed)[0];
		let payloadToReturn = parsed[key];
		/* istanbul ignore next: TODO remove + test */
		if (payloadToReturn[textNodeName]) {
			payloadToReturn[key] = payloadToReturn[textNodeName];
			delete payloadToReturn[textNodeName];
		}
		return coerceXMLValues(xml.parser.getValueFromTextNode(payloadToReturn));
	}
	function validateProtocol(protocol) {
		if (protocol && !["https:", "http:"].includes(protocol)) throw ReferenceError("Protocol must be `https:` or `http:`");
	}
	var JSONregex = /application\/json/;
	var JSONContentType = (ct) => ct.match(JSONregex);
	var AwsJSONregex = /application\/x-amz-json/;
	var AwsJSONContentType = (ct) => ct.match(AwsJSONregex);
	var XMLregex = /(application|text)\/xml/;
	var XMLContentType = (ct) => ct.match(XMLregex);
	module.exports = {
		awsjson,
		copy,
		exists,
		getEndpointParams,
		getHomedir,
		isInLambda,
		loadAwsConfig,
		readIni,
		tidyQuery,
		useAWS,
		buildXML,
		parseXML,
		validateProtocol,
		JSONContentType,
		AwsJSONContentType,
		XMLContentType
	};
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/config/get-plugins.js
var require_get_plugins = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = async function getPlugin(config) {
		let { autoloadPlugins = false, plugins = [] } = config;
		if (!Array.isArray(plugins)) throw TypeError("Plugins must be an array");
		if (!autoloadPlugins && !plugins.length) return [];
		if (plugins.length) {
			let { is } = require_validate();
			let resolved = [];
			for (let item of plugins) {
				if (item?.then && typeof item.then === "function") {
					let plugin = await item;
					/* istanbul ignore next: our plugins export default, but others may not */
					plugin = plugin.default ? plugin.default : plugin;
					resolved.push(plugin);
					continue;
				} else if (is.object(item)) {
					/* istanbul ignore next: our plugins export default, but others may not */
					let plugin = item.default ? item.default : item;
					resolved.push(plugin);
					continue;
				}
				throw TypeError("Plugins must be an imported / required module or an import statement");
			}
			return resolved;
		}
		/* istanbul ignore else */
		if (autoloadPlugins) {
			let { exists } = require_lib();
			let { join } = __require("node:path");
			let dedupe = (arr) => [...new Set(arr)];
			let packageJsonFile = join(process.cwd(), "package.json");
			let processNodeModulesDir = join(process.cwd(), "node_modules");
			let relativeNodeModulesDir;
			try {
				relativeNodeModulesDir = __require.resolve("@aws-lite/client").split(awsLite)[0];
			} catch {}
			let pluginsToLoad = [];
			if (await exists(processNodeModulesDir)) {
				let found = await scanNodeModulesDir(processNodeModulesDir);
				if (found.length) pluginsToLoad.push(...dedupe(plugins.concat(found)));
			} else if (relativeNodeModulesDir && await exists(relativeNodeModulesDir)) {
				let found = await scanNodeModulesDir(relativeNodeModulesDir);
				if (found.length) pluginsToLoad.push(...dedupe(plugins.concat(found)));
			} else if (await exists(packageJsonFile)) {
				let { readFile } = __require("node:fs/promises");
				let { dependencies: deps } = JSON.parse(await readFile(packageJsonFile));
				if (deps) {
					let found = Object.keys(deps).filter((m) => m.startsWith("@aws-lite/") && !m.endsWith("-types") || m.startsWith("aws-lite-plugin-")).filter(tidy);
					if (found.length) pluginsToLoad.push(...dedupe(plugins.concat(found)));
				}
			}
			if (pluginsToLoad.length) for (let pluginName of pluginsToLoad) {
				let plugin;
				/* istanbul ignore next */
				try {
					plugin = __require(pluginName);
					if (plugin.__esModule) plugins.push(plugin.default);
					else plugins.push(plugin);
				} catch (err) {
					if (hasEsmError(err)) {
						let path = pluginName;
						if (process.platform.startsWith("win")) try {
							path = "file://" + __require.resolve(path);
						} catch {
							path = "file://" + pluginName;
						}
						let mod = await import(path);
						plugin = mod.default ? mod.default : mod;
						plugins.push(plugin);
					} else throw err;
				}
			}
			return plugins;
		}
	};
	var awsLite = "@aws-lite";
	var ignored = ["@aws-lite/client", "@aws-lite/arc"];
	var tidy = (p) => !ignored.includes(p) && !p.endsWith("-types");
	async function scanNodeModulesDir(dir) {
		let found = [];
		let { join } = __require("node:path");
		let { readdir } = __require("node:fs/promises");
		let mods = await readdir(dir);
		/* istanbul ignore next: TODO code path not run in 14.x tests, remove once deprecated */
		if (mods.includes(awsLite)) {
			let knownPlugins = await readdir(join(dir, awsLite));
			found.push(...knownPlugins.map((p) => `@aws-lite/${p}`));
		}
		mods.forEach((p) => p.startsWith("aws-lite-plugin-") && found.push(p));
		return found.filter(tidy);
	}
	var esmErrors = [
		"Cannot use import statement outside a module",
		`Unexpected token 'export'`,
		"require() of ES Module",
		"Must use import to load ES Module"
	];
	var hasEsmError = (err) => esmErrors.some((msg) => err.message.includes(msg));
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/config/get-endpoint.js
var require_get_endpoint = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { getEndpointParams, loadAwsConfig } = require_lib();
	module.exports = async function getEndpoint(params) {
		let { config, awsConfig } = params;
		if (config.endpoint || config.url || config.host || config.hostname) return getEndpointParams(config);
		let { AWS_ENDPOINT_URL } = process.env;
		if (AWS_ENDPOINT_URL) return getEndpointParams({ endpoint: AWS_ENDPOINT_URL });
		awsConfig = params.awsConfig = awsConfig || await loadAwsConfig(config);
		if (awsConfig) {
			let url = awsConfig?.currentProfile?.endpoint_url;
			if (url) return getEndpointParams({ endpoint: url });
		}
	};
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/testing.js
var require_testing = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/* istanbul ignore next */
	var debug = (params = {}) => {
		let { print } = params;
		if (print) {
			console.error("[aws-lite] Testing debug:");
			console.dir(methods.data, { depth: null });
		}
		return methods.data;
	};
	function disable() {
		reset();
		methods.data.enabled = false;
		methods.data.usePluginResponseMethod = false;
	}
	function enable(params = {}) {
		let { usePluginResponseMethod } = params;
		reset();
		methods.data.enabled = true;
		methods.data.usePluginResponseMethod = usePluginResponseMethod || false;
	}
	function getAllRequests(target) {
		if (!target) return methods.data.allRequests;
		let { service, method } = getMethod(target);
		return methods.data?.[service]?.[method]?.requests;
	}
	function getAllResponses(target) {
		if (!target) return methods.data.allResponses;
		let { service, method } = getMethod(target);
		return methods.data?.[service]?.[method]?.responses;
	}
	function getLastRequest(target) {
		if (!target) return lastItem(methods.data.allRequests);
		let { service, method } = getMethod(target);
		return lastItem(methods.data?.[service]?.[method]?.requests);
	}
	function getLastResponse(target) {
		if (!target) return lastItem(methods.data.allResponses);
		let { service, method } = getMethod(target);
		return lastItem(methods.data?.[service]?.[method]?.responses);
	}
	var isEnabled = () => methods.data.enabled;
	function mock(target, mock) {
		let { service, method } = getMethod(target);
		initMethod(service, method);
		methods.data[service][method].mocks = Array.isArray(mock) ? mock : [mock];
	}
	function reset() {
		let { enabled, usePluginResponseMethod } = methods.data || {};
		methods.data = {
			enabled,
			usePluginResponseMethod,
			allRequests: [],
			allResponses: []
		};
	}
	var methods = {
		debug,
		disable,
		enable,
		getAllRequests,
		getAllResponses,
		getLastRequest,
		getLastResponse,
		isEnabled,
		mock,
		reset
	};
	disable();
	module.exports = methods;
	/**
	* Internal methods
	*/
	function getMethod(target) {
		if (target === "client") return {
			service: "aws-lite",
			method: "client"
		};
		let bits = target.split(".");
		if (bits.length !== 2) throw ReferenceError(`Invalid test method: ${target}`);
		return {
			service: bits[0],
			method: bits[1]
		};
	}
	function initMethod(service, method) {
		if (!methods.data?.[service]) methods.data[service] = {};
		if (!methods.data?.[service]?.[method]) methods.data[service][method] = {
			requests: [],
			responses: [],
			mocks: []
		};
	}
	var lastItem = (arr) => arr[arr.length - 1];
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/lib/services.js
var require_services = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = {
		services: [
			"access-analyzer",
			"access-analyzer-fips",
			"acm",
			"acm-fips",
			"acm-pca",
			"acm-pca-fips",
			"amplify",
			"amplifybackend",
			"amplifyuibuilder",
			"aos",
			"api-fips.sagemaker",
			"api.detective",
			"api.detective-fips",
			"api.ecr",
			"api.sagemaker",
			"api.tunneling.iot",
			"api.tunneling.iot-fips",
			"apigateway",
			"apigateway-fips",
			"appconfig",
			"appconfigdata",
			"appflow",
			"applicationinsights",
			"appmesh",
			"appmesh-fips",
			"appsync",
			"appwizard",
			"arc-zonal-shift",
			"athena",
			"athena-fips",
			"auditmanager",
			"autoscaling",
			"autoscaling-plans",
			"backup",
			"backup-fips",
			"batch",
			"braket",
			"budgets",
			"cassandra",
			"cloud9",
			"cloudcontrolapi",
			"cloudcontrolapi-fips",
			"cloudformation",
			"cloudformation-fips",
			"cloudfront",
			"cloudfront-fips",
			"cloudhsmv2",
			"cloudsearch",
			"cloudshell",
			"cloudtrail",
			"cloudtrail-fips",
			"codebuild",
			"codebuild-fips",
			"codecommit",
			"codecommit-fips",
			"codedeploy",
			"codedeploy-fips",
			"codepipeline",
			"codepipeline-fips",
			"codestar",
			"codestar-connections",
			"codestar-notifications",
			"cognito-identity",
			"cognito-identity-fips",
			"cognito-idp",
			"cognito-idp-fips",
			"compute-optimizer",
			"config",
			"config-fips",
			"data-ats.iot",
			"data.iot-fips",
			"databrew",
			"databrew-fips",
			"dataexchange",
			"datasync",
			"datasync-fips",
			"dax",
			"devops-guru",
			"devops-guru-fips",
			"directconnect",
			"directconnect-fips",
			"dkr.ecr-fips",
			"dlm",
			"dms",
			"dms-fips",
			"drs",
			"ds",
			"ds-fips",
			"dynamodb",
			"dynamodb-fips",
			"ebs",
			"ebs-fips",
			"ec2",
			"ec2-fips",
			"ec2-instance-connect",
			"ecr",
			"ecr-fips",
			"ecs",
			"ecs-fips",
			"eks",
			"elasticache",
			"elasticache-fips",
			"elasticbeanstalk",
			"elasticfilesystem",
			"elasticfilesystem-fips",
			"elasticmapreduce",
			"elasticmapreduce-fips",
			"elastictranscoder",
			"email",
			"es",
			"es-fips",
			"events",
			"events-fips",
			"execute-api",
			"fips.batch",
			"fips.eks",
			"fips.transcribe",
			"firehose",
			"firehose-fips",
			"fis",
			"fms",
			"fms-fips",
			"fsx",
			"fsx-fips",
			"gamelift",
			"glacier",
			"glacier-fips",
			"globalaccelerator",
			"glue",
			"glue-fips",
			"guardduty",
			"guardduty-fips",
			"iam",
			"iam-fips",
			"identitystore",
			"imagebuilder",
			"inspector",
			"inspector-fips",
			"inspector2",
			"inspector2-fips",
			"internetmonitor",
			"internetmonitor-fips",
			"iot",
			"iot-fips",
			"kafka",
			"kafka-fips",
			"kafkaconnect",
			"kinesis",
			"kinesis-fips",
			"kinesisanalytics",
			"kms",
			"kms-fips",
			"lakeformation",
			"lakeformation-fips",
			"lambda",
			"lambda-fips",
			"license-manager",
			"license-manager-fips",
			"logs",
			"logs-fips",
			"m2",
			"m2-fips",
			"macie2",
			"macie2-fips",
			"mediaconnect",
			"mediaconvert",
			"mediapackage",
			"mediapackage-vod",
			"mediapackagev2",
			"memory-db",
			"memory-db-fips",
			"metering.marketplace",
			"mgn",
			"mgn-fips",
			"monitoring",
			"monitoring-fips",
			"mq",
			"mq-fips",
			"network-firewall",
			"network-firewall-fips",
			"oam",
			"opsworks",
			"opsworks-cm",
			"organizations",
			"osis",
			"outposts",
			"outposts-fips",
			"pi",
			"pi-fips",
			"pipes",
			"polly",
			"polly-fips",
			"prefix.jobs.iot",
			"quicksight",
			"ram",
			"ram-fips",
			"rbin",
			"rbin-fips",
			"rds",
			"rds-data",
			"rds-fips",
			"redshift",
			"redshift-data",
			"redshift-fips",
			"redshift-serverless",
			"rekognition",
			"rekognition-fips",
			"resiliencehub",
			"resource-groups",
			"resource-groups-fips",
			"rolesanywhere",
			"route53",
			"route53-recovery-control-config",
			"route53-recovery-readiness",
			"route53resolver",
			"runtime.sagemaker",
			"s3",
			"s3-fips",
			"s3-outposts",
			"s3-outposts-fips",
			"s3.dualstack",
			"savingsplans",
			"scheduler",
			"schemas",
			"sdb",
			"secretsmanager",
			"secretsmanager-fips",
			"securityhub",
			"securityhub-fips",
			"securitylake",
			"serverlessrepo",
			"servicecatalog",
			"servicecatalog-fips",
			"servicediscovery",
			"servicediscovery-fips",
			"servicequotas",
			"shield",
			"shield-fips",
			"signer",
			"signer-fips",
			"snowball",
			"snowball-fips",
			"sns",
			"sqlworkbench",
			"sqs",
			"sqs-fips",
			"ssm",
			"ssm-fips",
			"ssm-incidents",
			"ssm-incidents-fips",
			"ssm-sap",
			"ssm-sap-fips",
			"sso",
			"stacksets",
			"states",
			"states-fips",
			"storagegateway",
			"storagegateway-fips",
			"streams.dynamodb",
			"sts",
			"sts-fips",
			"swf",
			"swf-fips",
			"sync-states",
			"sync-states-fips",
			"synthetics",
			"synthetics-fips",
			"tagging",
			"textract",
			"textract-fips",
			"transcribe",
			"transfer",
			"transfer-fips",
			"translate",
			"verifiedpermissions",
			"waf",
			"waf-fips",
			"waf-regional",
			"waf-regional-fips",
			"wafv2",
			"wafv2-fips",
			"wellarchitected",
			"xray",
			"xray-fips"
		],
		globalServices: [
			"s3",
			"sdb",
			"acm",
			"cloudfront",
			"globalaccelerator",
			"organizations",
			"route53",
			"iam",
			"sts",
			"waf",
			"waf-fips",
			"ls",
			"importexport"
		],
		semiGlobalServices: [
			"s3",
			"sdb",
			"sts"
		]
	};
}));
//#endregion
//#region node_modules/.pnpm/aws4@1.13.2/node_modules/aws4/lru.js
var require_lru = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function(size) {
		return new LruCache(size);
	};
	function LruCache(size) {
		this.capacity = size | 0;
		this.map = Object.create(null);
		this.list = new DoublyLinkedList();
	}
	LruCache.prototype.get = function(key) {
		var node = this.map[key];
		if (node == null) return void 0;
		this.used(node);
		return node.val;
	};
	LruCache.prototype.set = function(key, val) {
		var node = this.map[key];
		if (node != null) node.val = val;
		else {
			if (!this.capacity) this.prune();
			if (!this.capacity) return false;
			node = new DoublyLinkedNode(key, val);
			this.map[key] = node;
			this.capacity--;
		}
		this.used(node);
		return true;
	};
	LruCache.prototype.used = function(node) {
		this.list.moveToFront(node);
	};
	LruCache.prototype.prune = function() {
		var node = this.list.pop();
		if (node != null) {
			delete this.map[node.key];
			this.capacity++;
		}
	};
	function DoublyLinkedList() {
		this.firstNode = null;
		this.lastNode = null;
	}
	DoublyLinkedList.prototype.moveToFront = function(node) {
		if (this.firstNode == node) return;
		this.remove(node);
		if (this.firstNode == null) {
			this.firstNode = node;
			this.lastNode = node;
			node.prev = null;
			node.next = null;
		} else {
			node.prev = null;
			node.next = this.firstNode;
			node.next.prev = node;
			this.firstNode = node;
		}
	};
	DoublyLinkedList.prototype.pop = function() {
		var lastNode = this.lastNode;
		if (lastNode != null) this.remove(lastNode);
		return lastNode;
	};
	DoublyLinkedList.prototype.remove = function(node) {
		if (this.firstNode == node) this.firstNode = node.next;
		else if (node.prev != null) node.prev.next = node.next;
		if (this.lastNode == node) this.lastNode = node.prev;
		else if (node.next != null) node.next.prev = node.prev;
	};
	function DoublyLinkedNode(key, val) {
		this.key = key;
		this.val = val;
		this.prev = null;
		this.next = null;
	}
}));
//#endregion
//#region node_modules/.pnpm/aws4@1.13.2/node_modules/aws4/aws4.js
var require_aws4 = /* @__PURE__ */ __commonJSMin(((exports) => {
	var aws4 = exports;
	var url = __require("url");
	var querystring = __require("querystring");
	var crypto = __require("crypto");
	var credentialsCache = require_lru()(1e3);
	function hmac(key, string, encoding) {
		return crypto.createHmac("sha256", key).update(string, "utf8").digest(encoding);
	}
	function hash(string, encoding) {
		return crypto.createHash("sha256").update(string, "utf8").digest(encoding);
	}
	function encodeRfc3986(urlEncodedString) {
		return urlEncodedString.replace(/[!'()*]/g, function(c) {
			return "%" + c.charCodeAt(0).toString(16).toUpperCase();
		});
	}
	function encodeRfc3986Full(str) {
		return encodeRfc3986(encodeURIComponent(str));
	}
	var HEADERS_TO_IGNORE = {
		"authorization": true,
		"connection": true,
		"x-amzn-trace-id": true,
		"user-agent": true,
		"expect": true,
		"presigned-expires": true,
		"range": true
	};
	function RequestSigner(request, credentials) {
		if (typeof request === "string") request = url.parse(request);
		var headers = request.headers = Object.assign({}, request.headers || {}), hostParts = (!this.service || !this.region) && this.matchHost(request.hostname || request.host || headers.Host || headers.host);
		this.request = request;
		this.credentials = credentials || this.defaultCredentials();
		this.service = request.service || hostParts[0] || "";
		this.region = request.region || hostParts[1] || "us-east-1";
		if (this.service === "email") this.service = "ses";
		if (!request.method && request.body) request.method = "POST";
		if (!headers.Host && !headers.host) {
			headers.Host = request.hostname || request.host || this.createHost();
			if (request.port) headers.Host += ":" + request.port;
		}
		if (!request.hostname && !request.host) request.hostname = headers.Host || headers.host;
		this.isCodeCommitGit = this.service === "codecommit" && request.method === "GIT";
		this.extraHeadersToIgnore = request.extraHeadersToIgnore || Object.create(null);
		this.extraHeadersToInclude = request.extraHeadersToInclude || Object.create(null);
	}
	RequestSigner.prototype.matchHost = function(host) {
		var hostParts = ((host || "").match(/([^\.]{1,63})\.(?:([^\.]{0,63})\.)?amazonaws\.com(\.cn)?$/) || []).slice(1, 3);
		if (hostParts[1] === "es" || hostParts[1] === "aoss") hostParts = hostParts.reverse();
		if (hostParts[1] == "s3") {
			hostParts[0] = "s3";
			hostParts[1] = "us-east-1";
		} else for (var i = 0; i < 2; i++) if (/^s3-/.test(hostParts[i])) {
			hostParts[1] = hostParts[i].slice(3);
			hostParts[0] = "s3";
			break;
		}
		return hostParts;
	};
	RequestSigner.prototype.isSingleRegion = function() {
		if (["s3", "sdb"].indexOf(this.service) >= 0 && this.region === "us-east-1") return true;
		return [
			"cloudfront",
			"ls",
			"route53",
			"iam",
			"importexport",
			"sts"
		].indexOf(this.service) >= 0;
	};
	RequestSigner.prototype.createHost = function() {
		var region = this.isSingleRegion() ? "" : "." + this.region;
		return (this.service === "ses" ? "email" : this.service) + region + ".amazonaws.com";
	};
	RequestSigner.prototype.prepareRequest = function() {
		this.parsePath();
		var request = this.request, headers = request.headers, query;
		if (request.signQuery) {
			this.parsedPath.query = query = this.parsedPath.query || {};
			if (this.credentials.sessionToken) query["X-Amz-Security-Token"] = this.credentials.sessionToken;
			if (this.service === "s3" && !query["X-Amz-Expires"]) query["X-Amz-Expires"] = 86400;
			if (query["X-Amz-Date"]) this.datetime = query["X-Amz-Date"];
			else query["X-Amz-Date"] = this.getDateTime();
			query["X-Amz-Algorithm"] = "AWS4-HMAC-SHA256";
			query["X-Amz-Credential"] = this.credentials.accessKeyId + "/" + this.credentialString();
			query["X-Amz-SignedHeaders"] = this.signedHeaders();
		} else {
			if (!request.doNotModifyHeaders && !this.isCodeCommitGit) {
				if (request.body && !headers["Content-Type"] && !headers["content-type"]) headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8";
				if (request.body && !headers["Content-Length"] && !headers["content-length"]) headers["Content-Length"] = Buffer.byteLength(request.body);
				if (this.credentials.sessionToken && !headers["X-Amz-Security-Token"] && !headers["x-amz-security-token"]) headers["X-Amz-Security-Token"] = this.credentials.sessionToken;
				if (this.service === "s3" && !headers["X-Amz-Content-Sha256"] && !headers["x-amz-content-sha256"]) headers["X-Amz-Content-Sha256"] = hash(this.request.body || "", "hex");
				if (headers["X-Amz-Date"] || headers["x-amz-date"]) this.datetime = headers["X-Amz-Date"] || headers["x-amz-date"];
				else headers["X-Amz-Date"] = this.getDateTime();
			}
			delete headers.Authorization;
			delete headers.authorization;
		}
	};
	RequestSigner.prototype.sign = function() {
		if (!this.parsedPath) this.prepareRequest();
		if (this.request.signQuery) this.parsedPath.query["X-Amz-Signature"] = this.signature();
		else this.request.headers.Authorization = this.authHeader();
		this.request.path = this.formatPath();
		return this.request;
	};
	RequestSigner.prototype.getDateTime = function() {
		if (!this.datetime) {
			var headers = this.request.headers, date = new Date(headers.Date || headers.date || /* @__PURE__ */ new Date());
			this.datetime = date.toISOString().replace(/[:\-]|\.\d{3}/g, "");
			if (this.isCodeCommitGit) this.datetime = this.datetime.slice(0, -1);
		}
		return this.datetime;
	};
	RequestSigner.prototype.getDate = function() {
		return this.getDateTime().substr(0, 8);
	};
	RequestSigner.prototype.authHeader = function() {
		return [
			"AWS4-HMAC-SHA256 Credential=" + this.credentials.accessKeyId + "/" + this.credentialString(),
			"SignedHeaders=" + this.signedHeaders(),
			"Signature=" + this.signature()
		].join(", ");
	};
	RequestSigner.prototype.signature = function() {
		var date = this.getDate(), cacheKey = [
			this.credentials.secretAccessKey,
			date,
			this.region,
			this.service
		].join(), kDate, kRegion, kService, kCredentials = credentialsCache.get(cacheKey);
		if (!kCredentials) {
			kDate = hmac("AWS4" + this.credentials.secretAccessKey, date);
			kRegion = hmac(kDate, this.region);
			kService = hmac(kRegion, this.service);
			kCredentials = hmac(kService, "aws4_request");
			credentialsCache.set(cacheKey, kCredentials);
		}
		return hmac(kCredentials, this.stringToSign(), "hex");
	};
	RequestSigner.prototype.stringToSign = function() {
		return [
			"AWS4-HMAC-SHA256",
			this.getDateTime(),
			this.credentialString(),
			hash(this.canonicalString(), "hex")
		].join("\n");
	};
	RequestSigner.prototype.canonicalString = function() {
		if (!this.parsedPath) this.prepareRequest();
		var pathStr = this.parsedPath.path, query = this.parsedPath.query, headers = this.request.headers, queryStr = "", normalizePath = this.service !== "s3", decodePath = this.service === "s3" || this.request.doNotEncodePath, decodeSlashesInPath = this.service === "s3", firstValOnly = this.service === "s3", bodyHash;
		if (this.service === "s3" && this.request.signQuery) bodyHash = "UNSIGNED-PAYLOAD";
		else if (this.isCodeCommitGit) bodyHash = "";
		else bodyHash = headers["X-Amz-Content-Sha256"] || headers["x-amz-content-sha256"] || hash(this.request.body || "", "hex");
		if (query) {
			var reducedQuery = Object.keys(query).reduce(function(obj, key) {
				if (!key) return obj;
				obj[encodeRfc3986Full(key)] = !Array.isArray(query[key]) ? query[key] : firstValOnly ? query[key][0] : query[key];
				return obj;
			}, {});
			var encodedQueryPieces = [];
			Object.keys(reducedQuery).sort().forEach(function(key) {
				if (!Array.isArray(reducedQuery[key])) encodedQueryPieces.push(key + "=" + encodeRfc3986Full(reducedQuery[key]));
				else reducedQuery[key].map(encodeRfc3986Full).sort().forEach(function(val) {
					encodedQueryPieces.push(key + "=" + val);
				});
			});
			queryStr = encodedQueryPieces.join("&");
		}
		if (pathStr !== "/") {
			if (normalizePath) pathStr = pathStr.replace(/\/{2,}/g, "/");
			pathStr = pathStr.split("/").reduce(function(path, piece) {
				if (normalizePath && piece === "..") path.pop();
				else if (!normalizePath || piece !== ".") {
					if (decodePath) piece = decodeURIComponent(piece.replace(/\+/g, " "));
					path.push(encodeRfc3986Full(piece));
				}
				return path;
			}, []).join("/");
			if (pathStr[0] !== "/") pathStr = "/" + pathStr;
			if (decodeSlashesInPath) pathStr = pathStr.replace(/%2F/g, "/");
		}
		return [
			this.request.method || "GET",
			pathStr,
			queryStr,
			this.canonicalHeaders() + "\n",
			this.signedHeaders(),
			bodyHash
		].join("\n");
	};
	RequestSigner.prototype.filterHeaders = function() {
		var headers = this.request.headers, extraHeadersToInclude = this.extraHeadersToInclude, extraHeadersToIgnore = this.extraHeadersToIgnore;
		this.filteredHeaders = Object.keys(headers).map(function(key) {
			return [key.toLowerCase(), headers[key]];
		}).filter(function(entry) {
			return extraHeadersToInclude[entry[0]] || HEADERS_TO_IGNORE[entry[0]] == null && !extraHeadersToIgnore[entry[0]];
		}).sort(function(a, b) {
			return a[0] < b[0] ? -1 : 1;
		});
	};
	RequestSigner.prototype.canonicalHeaders = function() {
		if (!this.filteredHeaders) this.filterHeaders();
		return this.filteredHeaders.map(function(entry) {
			return entry[0] + ":" + entry[1].toString().trim().replace(/\s+/g, " ");
		}).join("\n");
	};
	RequestSigner.prototype.signedHeaders = function() {
		if (!this.filteredHeaders) this.filterHeaders();
		return this.filteredHeaders.map(function(entry) {
			return entry[0];
		}).join(";");
	};
	RequestSigner.prototype.credentialString = function() {
		return [
			this.getDate(),
			this.region,
			this.service,
			"aws4_request"
		].join("/");
	};
	RequestSigner.prototype.defaultCredentials = function() {
		var env = process.env;
		return {
			accessKeyId: env.AWS_ACCESS_KEY_ID || env.AWS_ACCESS_KEY,
			secretAccessKey: env.AWS_SECRET_ACCESS_KEY || env.AWS_SECRET_KEY,
			sessionToken: env.AWS_SESSION_TOKEN
		};
	};
	RequestSigner.prototype.parsePath = function() {
		var path = this.request.path || "/";
		if (/[^0-9A-Za-z;,/?:@&=+$\-_.!~*'()#%]/.test(path)) path = encodeURI(decodeURI(path));
		var queryIx = path.indexOf("?"), query = null;
		if (queryIx >= 0) {
			query = querystring.parse(path.slice(queryIx + 1));
			path = path.slice(0, queryIx);
		}
		this.parsedPath = {
			path,
			query
		};
	};
	RequestSigner.prototype.formatPath = function() {
		var path = this.parsedPath.path, query = this.parsedPath.query;
		if (!query) return path;
		if (query[""] != null) delete query[""];
		return path + "?" + encodeRfc3986(querystring.stringify(query));
	};
	aws4.RequestSigner = RequestSigner;
	aws4.sign = function(request, credentials) {
		return new RequestSigner(request, credentials).sign();
	};
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/request/request.js
var require_request$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var aws4 = require_aws4();
	var { awsjson, parseXML, useAWS, JSONContentType, AwsJSONContentType, XMLContentType } = require_lib();
	var plausiblyXML = /^</;
	var agentCache = {
		http: {
			keepAliveEnabled: null,
			keepAliveDisabled: null
		},
		https: {
			keepAliveEnabled: null,
			keepAliveDisabled: null
		}
	};
	/* istanbul ignore next */
	function getAgent(client, isHTTPS, config) {
		let http = isHTTPS ? "https" : "http";
		let keepAlive = config.keepAlive ?? useAWS();
		let agent = keepAlive ? "keepAliveEnabled" : "keepAliveDisabled";
		if (!agentCache[http][agent]) agentCache[http][agent] = new client.Agent({ keepAlive });
		return agentCache[http][agent];
	}
	module.exports = async function request(params, args) {
		let { config, metadata } = args;
		let { debug, maxAttempts, retries } = config;
		retries = maxAttempts ?? retries ?? 5;
		if (isNaN(retries)) throw ReferenceError("retries property must a number");
		for (let i = 0; i <= retries; i++) try {
			let result = await call(params, args);
			if (i === retries || reqCompleted(result.statusCode)) {
				if (isOk(result.statusCode)) return result;
				let { statusCode, headers, payload } = result;
				throw {
					statusCode,
					headers,
					error: payload,
					metadata,
					passthrough: true
				};
			}
			await retryDelay(i, `status code ${result.statusCode}`, debug);
		} catch (error) {
			let retryable = error.error && isRetryableError(error);
			if (i < retries && retryable) await retryDelay(i, retryable, debug);
			else {
				if (!error.error) throw error;
				if (error.passthrough) {
					delete error.passthrough;
					throw error;
				}
				error.error = error.error.message || /* istanbul ignore next */ error.error.code;
				throw error;
			}
		}
	};
	function call(params, args) {
		let { rawResponsePayload, streamResponsePayload } = params;
		let { creds, config, metadata, signing, streamReq } = args;
		let { debug } = config;
		let { protocol } = signing;
		return new Promise((resolve, reject) => {
			let options = aws4.sign(signing, creds);
			/* istanbul ignore next: this won't get seen by nyc */
			options.host = options.host || options.hostname;
			/* istanbul ignore next */
			if (options.hostname) delete options.hostname;
			let isHTTPS = options.host?.includes(".amazonaws.com") || protocol === "https:";
			/* istanbul ignore next */
			if (!options.protocol) options.protocol = isHTTPS ? "https:" : "http:";
			/* istanbul ignore next */
			let http = isHTTPS ? __require("node:https") : __require("node:http");
			/* istanbul ignore next */
			options.port = options.port || params.port || config.port;
			options.agent = getAgent(http, isHTTPS, config);
			let { body } = params;
			let isBuffer = body instanceof Buffer;
			/* istanbul ignore next */
			if (debug) {
				let { method = "GET", protocol, host, port, path, headers, service } = options;
				let bodyOutput;
				if (isBuffer) bodyOutput = `<body buffer of ${body.length}b>`;
				else if (streamReq) bodyOutput = `<readable stream>`;
				else bodyOutput = body || "<no body>";
				let { accessKeyId, secretAccessKey } = creds;
				let Authorization = headers.Authorization.replace(accessKeyId, accessKeyId.substring(0, 8) + "...").replace(secretAccessKey, "[redacted]");
				let sigRe = /(Signature=)[^,]*/;
				let fullSig = Authorization.match(sigRe);
				if (fullSig) {
					let redactedSig = "Signature=" + fullSig[0].split("Signature=")[1].substring(0, 8) + "...";
					Authorization = Authorization.replace(sigRe, redactedSig);
				}
				console.error("[aws-lite] Request:", {
					time: (/* @__PURE__ */ new Date()).toISOString(),
					service,
					method,
					url: `${protocol}//${host}${port ? ":" + port : ""}${path}`,
					headers: {
						...headers,
						Authorization
					},
					body: bodyOutput
				}, "\n");
			}
			let req = http.request(options, (res) => {
				let data = [];
				/* istanbul ignore next: we can always expect headers, but jic */
				let { headers = {}, statusCode } = res;
				if (streamResponsePayload) {
					/* istanbul ignore next */
					if (debug) console.error("[aws-lite] Response:", {
						time: (/* @__PURE__ */ new Date()).toISOString(),
						statusCode,
						headers,
						body: "<stream>"
					}, "\n");
					let { PassThrough } = __require("stream");
					resolve({
						statusCode,
						headers,
						payload: res.pipe(new PassThrough())
					});
					return;
				}
				res.on("data", (chunk) => data.push(chunk));
				res.on("end", () => {
					let body = Buffer.concat(data), payload;
					let contentType = config.responseContentType || headers["content-type"] || headers["Content-Type"] || "";
					if (rawResponsePayload) payload = body;
					else {
						if (body.length && (JSONContentType(contentType) || AwsJSONContentType(contentType))) {
							payload = JSON.parse(body);
							if (AwsJSONContentType(contentType)) try {
								payload = awsjson.unmarshall(payload, { config });
							} catch {}
						}
						if (body.length && XMLContentType(contentType)) {
							payload = parseXML(body);
							/* istanbul ignore next */
							if (payload.xmlns) delete payload.xmlns;
						}
						/* istanbul ignore next: TODO remove + test */
						if (body.length && !contentType) try {
							payload = JSON.parse(body);
						} catch {
							try {
								let start = body.subarray(0, 50).toString().trim();
								if (!plausiblyXML.test(start)) throw Error();
								payload = parseXML(body);
							} catch {
								payload = body.toString();
							}
						}
					}
					payload = payload || (body.length ? body : null);
					/* istanbul ignore next */
					if (debug) {
						let bodyOutput;
						if (payload instanceof Buffer) bodyOutput = body.length ? `<body buffer of ${body.length}b>` : "";
						else bodyOutput = body.toString();
						console.error("[aws-lite] Response:", {
							time: (/* @__PURE__ */ new Date()).toISOString(),
							statusCode,
							headers,
							body: bodyOutput || "<no body>"
						}, "\n");
					}
					resolve({
						statusCode,
						headers,
						payload
					});
				});
			});
			req.on("error", (error) => {
				/* istanbul ignore next */
				if (debug) console.error("[aws-lite] HTTP error:", error);
				reject({
					error,
					metadata: {
						...metadata,
						rawStack: error.stack,
						service: params.service,
						host: options.host,
						protocol: options.protocol.replace(":", ""),
						port: options.port
					}
				});
			});
			if (streamReq) {
				streamReq.pipe(req);
				/* istanbul ignore next */
				if (debug) {
					let bytes = 0;
					let interval;
					streamReq.on("data", (chunk) => {
						bytes += chunk.length;
						if (!interval) interval = setInterval(() => console.error(`Bytes streamed: ${bytes}`), 200);
					});
					streamReq.on("end", () => {
						if (interval) clearInterval(interval);
						console.error(`Total bytes streamed: ${bytes}`);
					});
				}
			} else req.end(options.body || "");
		});
	}
	var isOk = (statusCode) => statusCode >= 200 && statusCode < 303;
	var reqCompleted = (statusCode) => statusCode < 500 && statusCode !== 429;
	var retryableTimeoutErrorCodes = [
		"ECONNREFUSED",
		"ECONNRESET",
		"EPIPE",
		"ETIMEDOUT"
	].concat([
		"EADDRINFO",
		"ESOCKETTIMEDOUT",
		"ENOTFOUND",
		"EMFILE"
	]);
	var clockSkewErrorCodes = [
		"AuthFailure",
		"InvalidSignatureException",
		"RequestExpired",
		"RequestInTheFuture",
		"RequestTimeTooSkewed",
		"SignatureDoesNotMatch"
	];
	var throttlingErrorCodes = [
		"BandwidthLimitExceeded",
		"EC2ThrottledException",
		"LimitExceededException",
		"PriorRequestNotComplete",
		"ProvisionedThroughputExceededException",
		"RequestLimitExceeded",
		"RequestThrottled",
		"RequestThrottledException",
		"SlowDown",
		"ThrottledException",
		"Throttling",
		"ThrottlingException",
		"TooManyRequestsException",
		"TransactionInProgressException"
	];
	var transientErrorCodes = [
		"TimeoutError",
		"RequestTimeout",
		"RequestTimeoutException"
	];
	var delayBase = 100;
	var maxRetryBackoff = 2e4;
	async function retryDelay(i, reason, debug) {
		let rando = Math.floor(Math.random() * delayBase * Math.pow(2, i));
		let delay = Math.min(rando, maxRetryBackoff);
		/* istanbul ignore next */
		if (debug) console.error(`[aws-lite] Request failed (${reason}), retrying in ${delay} ms`);
		await new Promise((res) => setTimeout(res, delay));
	}
	function isRetryableError(error) {
		let { code, name, __type, type } = error.error;
		if (code && retryableTimeoutErrorCodes.includes(code)) return `connection error: ${code}`;
		for (let factor of [
			name,
			__type,
			type
		].filter(Boolean)) {
			let bits = String(factor).split("#");
			let errorCode = bits[bits.length - 1];
			if (clockSkewErrorCodes.includes(errorCode)) return `clock skew error: ${errorCode}`;
			if (throttlingErrorCodes.includes(errorCode)) return `throttling error: ${errorCode}`;
			if (transientErrorCodes.includes(errorCode)) return `transient error: ${errorCode}`;
		}
	}
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/request/index.js
var require_request = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { awsjson, copy, buildXML, getEndpointParams, tidyQuery, validateProtocol, AwsJSONContentType, XMLContentType } = require_lib();
	var { globalServices, semiGlobalServices } = require_services();
	var { is } = require_validate();
	var request = require_request$1();
	module.exports = async function _request(params, creds, region, config, metadata) {
		if (params.paginator?.default === "enabled" && params.paginate !== false || params.paginator && params.paginate) return await paginator(params, creds, region, config, metadata);
		return await makeRequest(params, creds, region, config, metadata);
	};
	async function makeRequest(params, creds, region, config, metadata, cursors = {}) {
		let overrides = getEndpointParams(params);
		let protocol = overrides.protocol || config.protocol;
		let host = overrides.host || config.host;
		let port = overrides.port || config.port;
		let pathPrefix = overrides.pathPrefix || config.pathPrefix;
		let path = params.path || "";
		validateProtocol(protocol);
		/* istanbul ignore next */
		if (params.endpoint) delete params.endpoint;
		/* istanbul ignore next */
		if (params.hostname) delete params.hostname;
		if (path && !path.startsWith("/")) path = "/" + path;
		if (pathPrefix) path = pathPrefix + path;
		path = (path || "/").replace(/[\/]{2,}/g, "/");
		if (params.query) {
			if (!is.object(params.query)) throw ReferenceError("Query property must be an object");
			let query = tidyQuery(Object.assign(params.query, cursors.query || {}));
			if (query) path += "?" + query;
		}
		let headers = Object.assign(params.headers || {}, cursors.headers || {});
		let contentType = headers["content-type"] || headers["Content-Type"] || "";
		/* istanbul ignore next */
		if (headers["Content-Type"]) delete headers["Content-Type"];
		let body = params.payload || params.body || params.data;
		let isBuffer = body instanceof Buffer;
		let isReqStream = is.stream(body);
		if (typeof body === "object" && !isBuffer && !isReqStream) {
			if (!contentType) contentType = "application/json";
			if (cursors.payload) body = Object.assign(body, cursors.payload);
			if (XMLContentType(contentType)) params.body = buildXML(body, params);
			else {
				if (params.awsjson || AwsJSONContentType(contentType) && params.awsjson !== false) {
					if (!AwsJSONContentType(contentType)) contentType = "application/x-amz-json-1.0";
					body = awsjson.marshall(body, {
						awsjson: params.awsjson,
						config
					});
				}
				params.body = JSON.stringify(body);
			}
		} else params.body = isReqStream ? void 0 : body;
		if (contentType) headers["content-type"] = contentType;
		else if (params.body) headers["content-type"] = "application/octet-stream";
		params.headers = headers;
		let signing = {
			region,
			...params,
			protocol,
			host,
			port,
			pathPrefix,
			path
		};
		/* istanbul ignore next */
		if (globalServices.includes(params.service)) {
			let isSemiGlobal = semiGlobalServices.includes(params.service);
			if (!isSemiGlobal || isSemiGlobal && region === "us-east-1") delete signing.region;
		}
		return await request(params, {
			creds,
			config,
			metadata,
			signing,
			streamReq: isReqStream ? body : void 0
		});
	}
	var validPaginationTypes = [
		"headers",
		"payload",
		"query"
	];
	async function paginator(params, creds, region, config, metadata) {
		let { debug } = config;
		/* istanbul ignore next */
		let { type = "payload", cursor, token, accumulator } = params.paginator;
		let isIterator = params.paginate === "iterator";
		if (!cursor || !is.string(cursor) && !is.array(cursor)) throw ReferenceError(`aws-lite paginator requires a cursor property name (string) or cursor property array`);
		if (!token || !is.string(token) && !is.array(token)) throw ReferenceError(`aws-lite paginator requires a token property name (string) or token property array`);
		if (typeof cursor !== typeof token) throw ReferenceError(`aws-lite paginator requires a token and cursor properties to both be a string or array`);
		if (!isIterator && (!accumulator || typeof accumulator !== "string")) throw ReferenceError(`aws-lite paginator requires an accumulator property name (string)`);
		if (type && !validPaginationTypes.includes(type)) throw ReferenceError(`aws-lite paginator type must be one of: ${validPaginationTypes.join(", ")}`);
		if (is.string(cursor) && is.string(token)) {
			cursor = [cursor];
			token = [token];
		}
		if (cursor.length !== token.length) throw ReferenceError(`aws-lite paginator requires an equal number of cursor and token properties`);
		let originalHeaders = copy(params.headers || {});
		let page = 1;
		if (isIterator) return async function* () {
			async function get(cursors = {}) {
				let result = await makeRequest({
					...params,
					headers: Object.assign(params.headers || {}, copy(originalHeaders))
				}, creds, region, config, metadata, cursors);
				if (!result.payload) throw ReferenceError("Pagination error: missing API response");
				if (typeof result.payload !== "object") throw ReferenceError("Pagination error: response must be valid JSON or XML");
				return result;
			}
			let result = await get();
			let foundTokens = findTokens({
				cursor,
				params,
				result,
				token,
				type
			});
			yield result;
			while (foundTokens.length) {
				page++;
				/* istanbul ignore next */
				if (debug) console.error(`[aws-lite] Paginator: getting page ${page}`);
				result = await get(getCursors(foundTokens, type));
				foundTokens = findTokens({
					cursor,
					params,
					result,
					token,
					type
				});
				yield result;
			}
		};
		let nestedAccumulator = accumulator.split(".").length > 1;
		let items = [];
		let statusCode, headers;
		async function get(cursors = {}) {
			let result = await makeRequest({
				...params,
				headers: copy(originalHeaders)
			}, creds, region, config, metadata, cursors);
			if (!result.payload) throw ReferenceError("Pagination error: missing API response");
			if (typeof result.payload !== "object") throw ReferenceError("Pagination error: response must be valid JSON or XML");
			let accumulated = nestedAccumulator ? accumulator.split(".").reduce((parent, child) => parent?.[child], result.payload) : result.payload[accumulator] || [];
			if (accumulated && !Array.isArray(accumulated)) accumulated = [accumulated];
			statusCode = result.statusCode;
			headers = result.headers;
			/* istanbul ignore next */
			if (XMLContentType(result.headers["content-type"] || result.headers["Content-Type"] || "") && !accumulated) return;
			if (!accumulated.length) return;
			items.push(...accumulated);
			let foundTokens = findTokens({
				cursor,
				params,
				result,
				token,
				type
			});
			if (foundTokens.length) {
				page++;
				/* istanbul ignore next */
				if (debug) console.error(`[aws-lite] Paginator: getting page ${page}`);
				await get(getCursors(foundTokens, type));
			}
		}
		await get();
		if (nestedAccumulator) return {
			statusCode,
			headers,
			payload: reNestAccumulated(accumulator, items)
		};
		return {
			statusCode,
			headers,
			payload: { [accumulator]: items }
		};
	}
	function reNestAccumulated(acc, items) {
		acc = Array.isArray(acc) ? acc : acc.split(".");
		if (!acc.length) return items;
		return { [acc.shift()]: reNestAccumulated(acc, items) };
	}
	function findTokens({ cursor, params, result, token, type }) {
		return token.map((t, i) => {
			let nestedToken = t.split(".").length > 1;
			params[type] = params[type] || {};
			if (nestedToken) {
				let foundNestedToken = t.split(".").reduce((parent, child) => parent?.[child], result.payload);
				if (foundNestedToken && foundNestedToken !== params[type][cursor[i]]) return [cursor[i], foundNestedToken];
			} else if (result.payload[t] && result.payload[t] !== params[type][cursor[i]]) return [cursor[i], result.payload[t]];
		}).filter(Boolean);
	}
	function getCursors(foundTokens, type) {
		let cursors = {};
		if (type === "payload" || !type) {
			cursors.payload = {};
			foundTokens.forEach(([cur, val]) => cursors.payload[cur] = val);
		}
		if (type === "headers") {
			cursors.headers = {};
			foundTokens.forEach(([cur, val]) => cursors.headers[cur] = val);
		}
		if (type === "query") {
			cursors.query = {};
			foundTokens.forEach(([cur, val]) => cursors.query[cur] = val);
		}
		return cursors;
	}
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/config/get-creds.js
var require_get_creds = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { exists, getHomedir, isInLambda, loadAwsConfig, readFile } = require_lib();
	var testing = require_testing();
	var noConnection = /(EHOSTDOWN|ECONNREFUSED|EHOSTUNREACH|ECONNRESET|ETIMEDOUT|Unknown system errno 64)/g;
	/**
	* Credential provider chain order
	* - Params
	* - Env
	* - SSO
	* - Configuration files (~/.aws/[credentials|config], etc.)
	* - Process
	* - TODO: Token file
	* - IMDS (aka "remote provider"): container (ECS) then instance (EC2) metadata
	* See also: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
	*/
	module.exports = async function getCreds(params) {
		let { config, awsConfig } = params;
		if (testing.isEnabled()) return {
			accessKeyId: "testing",
			secretAccessKey: "testing"
		};
		let configCreds = validate(config);
		if (configCreds) {
			/* istanbul ignore next */
			if (config.debug) console.error(`[aws-lite] Loaded credentials from client configuration`);
			return configCreds;
		}
		let envCreds = getCredsFromEnv();
		if (envCreds) {
			/* istanbul ignore next */
			if (config.debug) console.error(`[aws-lite] Loaded credentials from environment variables`);
			return envCreds;
		}
		awsConfig = params.awsConfig = awsConfig || await loadAwsConfig(config);
		let SSOStart = Date.now();
		let SSOCreds = await getCredsFromSSO(params);
		if (SSOCreds) {
			/* istanbul ignore next */
			if (config.debug) console.error(`[aws-lite] Loaded credentials from AWS SSO in ${Date.now() - SSOStart}ms`);
			return SSOCreds;
		}
		let profile = awsConfig?.currentProfile;
		if (awsConfig && profile) {
			let accessKeyId;
			let secretAccessKey;
			let sessionToken;
			if (profile.credential_process) {
				/* istanbul ignore next */
				if (config.debug) console.error(`[aws-lite] Loading credentials from process: ${profile.credential_process}`);
				let { execSync } = __require("child_process");
				let result = execSync(profile.credential_process, { encoding: "utf8" });
				({AccessKeyId: accessKeyId, SecretAccessKey: secretAccessKey, SessionToken: sessionToken} = JSON.parse(result));
			} else {
				/* istanbul ignore next */
				if (config.debug) console.error(`[aws-lite] Loading credentials from AWS profile`);
				({aws_access_key_id: accessKeyId, aws_secret_access_key: secretAccessKey, aws_session_token: sessionToken} = profile);
			}
			let profileCreds = validate({
				accessKeyId,
				secretAccessKey,
				sessionToken
			});
			if (profileCreds) return profileCreds;
		}
		let IMDSStart = Date.now();
		let IMDSCreds = await getCredsFromIMDS(params);
		/* istanbul ignore next: TODO remove + test */
		if (IMDSCreds) {
			/* istanbul ignore next */
			if (config.debug) console.error(`[aws-lite] Loaded credentials from IMDSv2 in ${Date.now() - IMDSStart}ms`);
			return IMDSCreds;
		}
		throw ReferenceError("Unable to find AWS credentials via params, environment variables, SSO, or credential / config files");
	};
	function getCredsFromEnv() {
		let env = process.env;
		let accessKeyId = env.AWS_ACCESS_KEY_ID || env.AWS_ACCESS_KEY;
		let secretAccessKey = env.AWS_SECRET_ACCESS_KEY || env.AWS_SECRET_KEY;
		let sessionToken = env.AWS_SESSION_TOKEN;
		return validate({
			accessKeyId,
			secretAccessKey,
			sessionToken
		});
	}
	async function getCredsFromSSO(params) {
		if (isInLambda()) return;
		let { config, awsConfig } = params;
		if (!awsConfig) return;
		let profile = awsConfig.currentProfile;
		let sessionConfig = {};
		if (profile?.sso_session) {
			let sessionName = `sso-session ${profile.sso_session}`;
			let foundSessionConfig = awsConfig?.profiles?.[sessionName] || awsConfig?.config?.[sessionName];
			if (foundSessionConfig) sessionConfig = foundSessionConfig;
			else throw ReferenceError(`Unable to load specified SSO session configuration: ${profile.sso_session}`);
		}
		let { sso_account_id, sso_region, sso_role_name, sso_start_url } = {
			...profile,
			...sessionConfig
		};
		if (!sso_start_url) return;
		if (!sso_account_id) throw ReferenceError("SSO configuration must have `sso_account_id` property");
		if (!sso_region) throw ReferenceError("SSO configuration must have `sso_region` property");
		if (!sso_role_name) throw ReferenceError("SSO configuration must have `sso_role_name` property");
		let { join } = __require("node:path");
		let { createHash } = __require("node:crypto");
		let ssoFile = createHash("sha1").update(sso_start_url).digest("hex") + ".json";
		let ssoFilename = join(getHomedir(), ".aws", "sso", "cache", ssoFile);
		let { readFile } = __require("node:fs/promises");
		if (!await exists(ssoFilename)) {
			/* istanbul ignore next */
			if (config.debug) console.error(`[aws-lite] Could not find AWS SSO token file at ${ssoFilename}`);
			return;
		}
		try {
			/* istanbul ignore next */
			if (config.debug) console.error(`[aws-lite] Loading credentials from AWS SSO token file at ${ssoFilename}`);
			let { accessToken, expiresAt } = JSON.parse(await readFile(ssoFilename));
			if (!accessToken) throw ReferenceError("SSO token file must have `accessToken` property");
			if (!expiresAt) throw ReferenceError("SSO token file must have `expiresAt` property");
			if (new Date(expiresAt).getTime() - Date.now() <= 0) throw Error("SSO token is expired, please refresh by running: aws sso login [options]");
			/* istanbul ignore next */
			if (config.debug) console.error(`[aws-lite] Requesting credentials from AWS IAM Identity Center`);
			let { roleCredentials } = (await request({
				params: {
					service: "sso",
					endpoint: config?.sso?.endpoint ? config.sso.endpoint : `https://portal.sso.${sso_region}.amazonaws.com`,
					path: "/federation/credentials",
					query: {
						account_id: sso_account_id,
						role_name: sso_role_name
					},
					headers: { "x-amz-sso_bearer_token": accessToken }
				},
				region: sso_region,
				service: "SSO"
			})).payload;
			return validate(roleCredentials);
		} catch (err) {
			console.error("Failed to load credentials via AWS IAM Identity Center");
			if (err?.error?.message) throw new Error("SSO error: " + err.error.message);
			throw err;
		}
	}
	/* istanbul ignore next: TODO remove + test */
	async function getCredsFromIMDS(params) {
		if (isInLambda()) return;
		let { config, awsConfig } = params;
		let { AWS_CONTAINER_AUTHORIZATION_TOKEN: token, AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE, AWS_CONTAINER_CREDENTIALS_RELATIVE_URI, AWS_CONTAINER_CREDENTIALS_FULL_URI, AWS_EC2_METADATA_DISABLED, AWS_EC2_METADATA_SERVICE_ENDPOINT, AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE } = process.env;
		let service = "imds";
		if (AWS_CONTAINER_CREDENTIALS_RELATIVE_URI || AWS_CONTAINER_CREDENTIALS_FULL_URI) {
			let endpoint = AWS_CONTAINER_CREDENTIALS_FULL_URI ? AWS_CONTAINER_CREDENTIALS_FULL_URI : `http://169.254.170.2${AWS_CONTAINER_CREDENTIALS_RELATIVE_URI}`;
			if (!token && AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE) {
				/* istanbul ignore next */
				if (config.debug) console.error(`[aws-lite] Loading token from auth token file at: ${AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE}`);
				token = (await readFile(AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE)).toString().trim();
			}
			if (!token) throw ReferenceError("ECS IMDSv2 token not found");
			try {
				let creds = (await request({
					params: {
						service,
						endpoint,
						headers: { Authorization: token }
					},
					service: "ECS IMDSv2"
				})).payload;
				try {
					creds = JSON.parse(creds);
				} catch {}
				return validate(normalize(creds));
			} catch (err) {
				console.error("Failed to load credentials via ECS IMDSv2");
				if (err?.error?.message) throw new Error("ECS IMDSv2 error: " + err.error.message);
				throw err;
			}
		}
		if (AWS_EC2_METADATA_DISABLED) {
			if (config.debug) console.error(`[aws-lite] IMDSv2 disabled via AWS_EC2_METADATA_DISABLED env var`);
			return;
		}
		let profile = awsConfig?.currentProfile;
		let defaultEndpoints = {
			IPv4: "http://169.254.169.254",
			IPv6: "http://[fd00:ec2::254]"
		};
		let endpoint = config?.imds?.endpoint || AWS_EC2_METADATA_SERVICE_ENDPOINT || profile?.ec2_metadata_service_endpoint;
		let mode = config?.imds?.endpointMode || AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE || profile?.ec2_metadata_service_endpoint_mode;
		if (defaultEndpoints[mode]) endpoint = defaultEndpoints[mode];
		if (!endpoint) endpoint = defaultEndpoints.IPv4;
		try {
			if (!await checkHost(endpoint, config.debug)) {
				if (config.debug) console.error(`[aws-lite] IMDSv2 host is unavailable: ${endpoint}`);
				return;
			}
			let path = "/latest/meta-data/iam/security-credentials/";
			let token = (await request({
				params: {
					method: "PUT",
					endpoint,
					path: "/latest/api/token",
					headers: { "x-aws-ec2-metadata-token-ttl-seconds": "21600" }
				},
				service: "IMDSv2 token API"
			})).payload.toString();
			let profile = (await request({
				params: {
					endpoint,
					path,
					service,
					headers: { "x-aws-ec2-metadata-token": token }
				},
				service: "IMDSv2 profile"
			})).payload.toString();
			let creds = (await request({
				params: {
					endpoint,
					path: path + profile,
					service,
					headers: { "x-aws-ec2-metadata-token": token }
				},
				service: "IMDSv2 credentials"
			})).payload;
			try {
				creds = JSON.parse(creds);
			} catch {}
			return validate(normalize(creds));
		} catch (err) {
			if (err.statusCode === 400 && err.headers.server?.includes("Microsoft-IIS") && process.env.GITHUB_ACTIONS) return;
			console.error("Failed to load credentials via ECS IMDSv2");
			if (err?.error?.message) throw new Error("ECS IMDSv2 error: " + err.error.message);
			throw err;
		}
	}
	function validate(creds) {
		let { accessKeyId, secretAccessKey, sessionToken } = creds;
		if (accessKeyId && typeof accessKeyId !== "string") throw TypeError("Access key must be a string");
		if (secretAccessKey && typeof secretAccessKey !== "string") throw TypeError("Secret access key must be a string");
		if (sessionToken && typeof sessionToken !== "string") throw TypeError("Session token must be a string");
		if (accessKeyId && !secretAccessKey || !accessKeyId && secretAccessKey) throw ReferenceError("You must supply both an access key ID & secret access key");
		if (!accessKeyId && !secretAccessKey) return false;
		return creds;
	}
	var req;
	async function request({ params, region, config, service }) {
		/* istanbul ignore next */
		region = region || "";
		if (!req) req = require_request();
		return await req(params, {
			accessKeyId: "",
			secretAccessKey: ""
		}, region, {
			...config,
			debug: false
		}, { service });
	}
	/* istanbul ignore next */
	function checkHost(endpoint, debug) {
		return new Promise((res, rej) => {
			try {
				if (hostCache[endpoint] !== void 0) res(hostCache[endpoint]);
				let { hostname: host, port } = new URL(endpoint);
				port = port || (endpoint?.startsWith("https:") ? 443 : 80);
				let net = __require("node:net");
				if (debug) console.error(`[aws-lite] Checking IMDSv2 host; ${host}:${port}`);
				let socket = net.createConnection({
					host,
					port,
					timeout: 1e3
				});
				socket.on("timeout", () => {
					if (debug) console.error(`[aws-lite] IMDSv2 host timed out`);
					terminate();
					hostCache[endpoint] = false;
					res(hostCache[endpoint]);
				});
				socket.on("connect", () => {
					if (debug) console.error(`[aws-lite] IMDSv2 host is available`);
					terminate();
					hostCache[endpoint] = true;
					res(hostCache[endpoint]);
				});
				socket.on("error", (err) => {
					if (debug) console.error(`[aws-lite] IMDSv2 connection error`, err);
					terminate();
					if (err.code.match(noConnection)) {
						hostCache[endpoint] = false;
						res(hostCache[endpoint]);
					} else rej(err);
				});
				function terminate() {
					if (!socket.destroyed) socket.destroy();
				}
			} catch (err) {
				if (debug) console.error(`[aws-lite] IMDSv2 checkHost util error`, err);
				rej(err);
			}
		});
	}
	var hostCache = {};
	/* istanbul ignore next */
	function normalize(creds) {
		if (!creds.AccessKeyId || !creds.SecretAccessKey || !creds.Token) throw ReferenceError("Invalid IMDSv2 response or missing credentials");
		return {
			accessKeyId: creds.AccessKeyId,
			secretAccessKey: creds.SecretAccessKey,
			sessionToken: creds.Token,
			expiration: new Date(creds.Expiration)
		};
	}
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/config/regions.json
var regions_exports = /* @__PURE__ */ __exportAll({ default: () => regions_default });
var regions_default;
var init_regions = __esmMin((() => {
	regions_default = [
		"us-west-2",
		"us-west-1",
		"us-gov-west-1",
		"us-gov-east-1",
		"us-east-2",
		"us-east-1",
		"sa-east-1",
		"me-south-1",
		"me-central-1",
		"il-central-1",
		"eu-west-3",
		"eu-west-2",
		"eu-west-1",
		"eu-south-2",
		"eu-south-1",
		"eu-north-1",
		"eu-central-2",
		"eu-central-1",
		"cn-northwest-1",
		"cn-north-1",
		"ca-central-1",
		"ap-southeast-4",
		"ap-southeast-3",
		"ap-southeast-2",
		"ap-southeast-1",
		"ap-south-2",
		"ap-south-1",
		"ap-northeast-3",
		"ap-northeast-2",
		"ap-northeast-1",
		"ap-east-1",
		"af-south-1"
	];
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/config/get-region.js
var require_get_region = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var regions = (init_regions(), __toCommonJS(regions_exports).default);
	module.exports = async function getRegion(params) {
		let { config } = params;
		let configRegion = validateRegion(config, config.region);
		if (configRegion) return configRegion;
		let envRegion = getRegionFromEnv(config);
		if (envRegion) return envRegion;
		let AWSConfigRegion = await getRegionFromAWSConfig(params);
		if (AWSConfigRegion) return AWSConfigRegion;
		throw ReferenceError("Unable to find AWS region via params, environment variables, or credential / config files");
	};
	function getRegionFromEnv(config) {
		let { AWS_REGION, AWS_DEFAULT_REGION, AMAZON_REGION } = process.env;
		return validateRegion(config, AWS_REGION || AWS_DEFAULT_REGION || AMAZON_REGION);
	}
	async function getRegionFromAWSConfig(params) {
		let { config, awsConfig } = params;
		let { loadAwsConfig } = require_lib();
		awsConfig = params.awsConfig = awsConfig || await loadAwsConfig(config);
		let profile = awsConfig?.currentProfile;
		if (awsConfig && profile) return validateRegion(config, profile.region);
	}
	function validateRegion(config, region) {
		if (region) {
			if (typeof region !== "string") throw TypeError("Region must be a string");
			if (!config.host && !regions.includes(region)) throw ReferenceError(`Invalid region specified: ${region}`);
			return region;
		}
		return false;
	}
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/client-factory.js
var require_client_factory = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var request = require_request();
	var { services } = require_services();
	var testing = require_testing();
	var { awsjson, copy, buildXML } = require_lib();
	var { validateInput } = require_validate();
	var errorHandler = require_error();
	var enumerable = false;
	var credentialProps = [
		"accessKeyId",
		"secretAccessKey",
		"sessionToken"
	];
	module.exports = async function clientFactory(config, creds, region) {
		let configuration = copy(config);
		credentialProps.forEach((p) => delete configuration[p]);
		let credentials = copy(creds);
		Object.defineProperty(credentials, "secretAccessKey", { enumerable });
		Object.defineProperty(credentials, "sessionToken", { enumerable });
		async function client(params = {}) {
			let selectedRegion = params.region || region;
			let verifyService = params.verifyService ?? config.verifyService ?? true;
			let isIterator = params.paginate === "iterator";
			validateService(params.service, verifyService);
			let metadata = { service: params.service };
			try {
				let mock = await getMock("aws-lite", "client", params, metadata);
				if (mock) return mock;
				let response = await request(params, creds, selectedRegion, config, metadata);
				return isIterator ? iteratorHandler({
					config,
					iterator: response,
					metadata,
					region
				}) : response;
			} catch (err) {
				errorHandler(err);
			}
		}
		client.config = {
			...configuration,
			region
		};
		client.credentials = credentials;
		/* istanbul ignore next */
		if (config.debug) {
			console.error("[aws-lite] Client instantiated with this config:", client.config);
			console.error("[aws-lite] Client instantiated with these creds:", {
				...credentials,
				secretAccessKey: credentials.secretAccessKey ? "[found / redacted]" : void 0,
				sessionToken: credentials.sessionToken ? "[found / redacted]" : void 0
			});
		}
		let { plugins } = config;
		if (plugins.length) {
			/* istanbul ignore next */
			if (config.debug) console.error("[aws-lite] Loading plugins", plugins.map(({ name, service }) => name || service), "\n");
			for (let plugin of plugins) try {
				let { service, methods, property } = plugin;
				validateService(service, config.verifyService);
				if (!methods || typeof methods !== "object" || Array.isArray(methods)) throw TypeError("Plugin must export a methods object");
				Object.values(methods).forEach((method) => {
					if (method.request && typeof method.request !== "function") throw ReferenceError(`All plugin request methods must be a function: ${service}`);
					if (method.response && typeof method.response !== "function") throw ReferenceError(`All plugin response methods must be a function: ${service}`);
					if (method.error && typeof method.error !== "function") throw ReferenceError(`All plugin error methods must be a function: ${service}`);
				});
				let pluginUtils = {
					awsjsonMarshall: awsjson.marshall,
					awsjsonUnmarshall: awsjson.unmarshall,
					buildXML,
					client,
					config: configuration,
					credentials
				};
				let clientMethods = {};
				Object.entries(methods).forEach(([name, method]) => {
					if (!method || method.disabled) return;
					clientMethods[name] = Object.defineProperty(async (input) => {
						input = input || {};
						let selectedRegion = input?.region || region;
						let metadata = {
							service,
							name,
							property
						};
						if (method.awsDoc) metadata.awsDoc = method.awsDoc;
						if (plugin?.name?.startsWith("@aws-lite/")) metadata.readme = `https://aws-lite.org/services/${service}#${name.toLowerCase()}`;
						else if (method.readme) metadata.readme = method.readme;
						if (method.validate) validateInput(method.validate, input, metadata);
						if (method.request) try {
							var req = await method.request(input, {
								...pluginUtils,
								region: selectedRegion
							});
							req = req || {};
						} catch (methodError) {
							errorHandler({
								error: methodError,
								metadata
							});
						}
						let params = {
							...input,
							...req
						};
						if (method.validate) validateInput(method.validate, params, metadata);
						let isIterator = params.paginate === "iterator";
						try {
							let response;
							let mock = await getMock(property, name, params, metadata);
							if (mock && !testing.data.usePluginResponseMethod) return mock;
							else if (mock) response = mock;
							else response = await request({
								...params,
								service
							}, creds, selectedRegion, config, metadata);
							if (method.response) {
								if (isIterator) return iteratorHandler({
									config,
									iterator: response,
									metadata,
									method,
									pluginUtils,
									region: selectedRegion
								});
								try {
									var pluginRes = await method.response(response, {
										...pluginUtils,
										region: selectedRegion
									});
									pluginRes = maybeUnmarshall(pluginRes, config);
									if (pluginRes !== void 0) response = pluginRes;
								} catch (methodError) {
									errorHandler({
										error: methodError,
										metadata
									});
								}
							}
							return response;
						} catch (err) {
							if (err?.metadata?.mock && !testing.data.usePluginResponseMethod) errorHandler(err);
							let updatedError;
							if (method.error && !(err instanceof Error)) {
								try {
									updatedError = await method.error(err, {
										...pluginUtils,
										region: selectedRegion
									});
								} catch (methodError) {
									errorHandler({
										error: methodError,
										metadata: {
											service,
											name,
											property
										}
									});
								}
								updatedError = updatedError || err;
								updatedError.metadata = {
									...updatedError.metadata,
									...metadata
								};
								errorHandler(updatedError);
							}
							errorHandler(err);
						}
					}, "name", { value: name });
				});
				let serviceName = property || service;
				client[serviceName] = clientMethods;
				let propLow = serviceName.toLowerCase();
				if (serviceName !== propLow) {
					client[propLow] = clientMethods;
					Object.defineProperty(client, propLow, { enumerable });
				}
			} catch (err) {
				/* istanbul ignore next */
				let name = plugin.name ? `: ${plugin.name}` : "";
				console.error(`Plugin error${name}`);
				throw err;
			}
		}
		return client;
	};
	function validateService(service, verify = true) {
		if (!service) throw ReferenceError("No AWS service specified");
		if (verify && !services.includes(service)) throw ReferenceError(`Invalid AWS service specified: ${service}`);
	}
	async function getMock(property, name, params, metadata) {
		if (testing.data.enabled) {
			if (!testing.data?.[property]?.[name]?.mocks?.length) throw ReferenceError(`Mock response not found: ${property}.${name}`);
			let clientResponse = property === "aws-lite" && name === "client";
			let response;
			let item = {
				method: `${property}.${name}`,
				time: (/* @__PURE__ */ new Date()).toISOString()
			};
			let req = {
				...item,
				request: params
			};
			testing.data.allRequests.push(req);
			testing.data[property][name].requests.push(req);
			if (testing.data[property][name].mocks.length === 1) response = testing.data[property][name].mocks[0];
			else response = testing.data[property][name].mocks.shift();
			if (typeof response === "function") response = response.constructor.name === "AsyncFunction" ? response(params) : await response(params);
			if (clientResponse || testing.data.usePluginResponseMethod) {
				if (!response.statusCode) {
					let method = clientResponse ? "client" : `${property}.${name}`;
					throw ReferenceError(`Mock response must include statusCode property (${method})`);
				}
				if (!response.headers) response.headers = {};
				if (!response.error) response.payload = response.payload ?? "";
			}
			let res = {
				...item,
				response
			};
			testing.data.allResponses.push(res);
			testing.data[property][name].responses.push(res);
			if (response.error) throw {
				...response,
				metadata: {
					...metadata,
					mock: true
				}
			};
			return response;
		}
	}
	async function* iteratorHandler(params) {
		const { config, iterator, metadata, method, pluginUtils, region } = params;
		let response;
		for await (let page of iterator()) try {
			if (method?.response) response = await method.response(page, {
				...pluginUtils,
				region
			});
			else response = page;
			response = maybeUnmarshall(response, config);
			yield response;
		} catch (methodError) {
			errorHandler({
				error: methodError,
				metadata
			});
		}
	}
	function maybeUnmarshall(pluginRes, config) {
		let response;
		if (pluginRes !== void 0) {
			let unmarshalling = pluginRes?.awsjson;
			if (unmarshalling) {
				delete pluginRes.awsjson;
				let unmarshalled = awsjson.unmarshall(pluginRes.payload || pluginRes, {
					awsjson: unmarshalling,
					config
				});
				response = pluginRes.payload ? {
					...pluginRes,
					payload: unmarshalled
				} : unmarshalled;
			} else response = pluginRes;
			return response;
		}
		return pluginRes;
	}
}));
//#endregion
//#region node_modules/.pnpm/@aws-lite+client@0.23.7/node_modules/@aws-lite/client/src/index.js
var require_src = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var getPlugins = require_get_plugins();
	var getEndpoint = require_get_endpoint();
	var getCreds = require_get_creds();
	var getRegion = require_get_region();
	var clientFactory = require_client_factory();
	var testing = require_testing();
	/**
	* @param {object} [config] Client configuration options
	* @param {string} [config.region] AWS service region (e.g. `us-west-1`); if not provided, defaults to `AWS_REGION`, `AWS_DEFAULT_REGION`, or `AMAZON_REGION` env vars
	* @param {string} [config.profile='default'] AWS config + credentials profile; if not provided, defaults to `AWS_PROFILE` env var, and then to the `default` profile, if present
	* @param {string} [config.accessKeyId] AWS access key; if not provided, defaults to `AWS_ACCESS_KEY_ID` or `AWS_ACCESS_KEY` env vars, and then to a `~/.aws/credentials` file, if present
	* @param {string} [config.secretAccessKey] AWS secret key; if not provided, defaults to `AWS_SECRET_ACCESS_KEY` or `AWS_SECRET_KEY` env var, and then to a `~/.aws/credentials` file, if present
	* @param {string} [config.sessionToken] AWS session token; if not provided, defaults to `AWS_SESSION_TOKEN` env var, and then to a `~/.aws/credentials` file, if present
	* @param {string} [config.imds.endpoint] Set a custom the IMDSv2 endpoint to use
	* @param {string} [config.imds.endpointMode='IPv4'] Set the IMDSv2 host via IP version; either `IPv4` or `IPv6`
	* @param {boolean} [config.autoloadPlugins=false] Automatically load installed `@aws-lite/*` + `aws-lite-plugin-*` plugins; not suggested for production use
	* @param {boolean|string} [config.awsConfigFile=false] Load configuration via ~/.aws/config (boolean), or via a passed file path
	* @param {boolean} [config.debug] Enable debug logging to console
	* @param {string} [config.endpoint] Use a custom service endpoint; must include protocol and full url (e.g. `https://foo.bar/api/path`)
	* @param {string} [config.pathPrefix] Add a path prefix to requests, helpful for local testing
	* @param {string} [config.host] Set a custom host name to use, helpful for local testing
	* @param {boolean} [config.keepAlive=true] Disable Node.js's connection keep-alive, helpful for local testing
	* @param {array} [config.plugins] Specify service plugins; each plugin can be a plugin object or a `require` or `import` statement
	* @param {number} [config.port] Set a custom port number to use, helpful for local testing
	* @param {string} [config.protocol='https'] Set the connection protocol to 'http', helpful for local testing
	* @param {string} [config.responseContentType] Set an overriding Content-Type headers for responses, helpful for local testing
	* @param {number} [config.retries=5] Set the maximum number of request retries; set to 0 to disable retrying
	* @param {boolean} [config.verifyService=true] Validate service name against aws-lite's known services
	*
	* @returns {Promise<function>} Client async function
	*/
	async function awsLite(config = {}) {
		config.profile = config.profile || process.env.AWS_PROFILE || "default";
		config.debug = config.debug || process.env.AWS_LITE_DEBUG;
		config.plugins = await getPlugins(config);
		let params = {
			config,
			awsConfig: void 0
		};
		let endpoint = await getEndpoint(params);
		if (endpoint) config = params.config = {
			...config,
			...endpoint
		};
		let creds = await getCreds(params);
		let region = await getRegion(params);
		return await clientFactory(config, creds, region);
	}
	awsLite.testing = testing;
	module.exports = awsLite;
}));
//#endregion
export default require_src();
export {};

//# sourceMappingURL=src-CZnP_mTY.js.map