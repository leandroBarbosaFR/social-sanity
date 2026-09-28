import { s as isRecord, t as require_dist } from "../index.js";
//#region node_modules/.pnpm/@sanity+client@8.7.0_vitest@5.0.1_@opentelemetry+api@1.9.1_@types+node@24.19.0_jsdom@29_94485a72285fb30450eb265e81f4725b/node_modules/@sanity/client/dist/stegaEncodeSourceMap-CO1HKnm2.js
var import_dist = require_dist();
/** @internal */
function isDraftId(id) {
	return id.startsWith("drafts.");
}
/** @internal */
function isVersionId(id) {
	return id.startsWith("versions.");
}
/** @internal */
function isPublishedId(id) {
	return !isDraftId(id) && !isVersionId(id);
}
function asPublishedId(value) {
	return value;
}
/**
*  @internal
*  Given an id, returns the versionId if it exists.
*  e.g. `versions.summer-drop.foo` = `summer-drop`
*  e.g. `drafts.foo` = `undefined`
*  e.g. `foo` = `undefined`
*/
function getVersionFromId(id) {
	if (!isVersionId(id)) return;
	let [_versionPrefix, versionId, ..._publishedId] = id.split(".");
	return versionId;
}
/** @internal */
function getPublishedId(id) {
	if (isVersionId(id)) return asPublishedId(id.split(".").slice(2).join("."));
	if (isDraftId(id)) return asPublishedId(id.slice(7));
	if (isPublishedId(id)) return id;
	throw Error(`Unable to resolve a published id from "${id}"`);
}
/** @internal */
var reKeySegment = /_key\s*==\s*['"](.*)['"]/;
/** @internal */
function isKeySegment(segment) {
	return typeof segment == "string" ? reKeySegment.test(segment.trim()) : typeof segment == "object" && "_key" in segment;
}
/** @alpha */
function toString(path) {
	if (!Array.isArray(path)) throw Error("Path is not an array");
	return path.reduce((target, segment, i) => {
		let segmentType = typeof segment;
		if (segmentType === "number") return `${target}[${segment}]`;
		if (segmentType === "string") return `${target}${i === 0 ? "" : "."}${segment}`;
		if (isKeySegment(segment) && segment._key) return `${target}[_key=="${segment._key}"]`;
		if (Array.isArray(segment)) {
			let [from, to] = segment;
			return `${target}[${from}:${to}]`;
		}
		throw Error(`Unsupported path segment \`${JSON.stringify(segment)}\``);
	}, "");
}
var ESCAPE = {
	"\f": "\\f",
	"\n": "\\n",
	"\r": "\\r",
	"	": "\\t",
	"'": "\\'",
	"\\": "\\\\"
};
var UNESCAPE = {
	"\\f": "\f",
	"\\n": "\n",
	"\\r": "\r",
	"\\t": "	",
	"\\'": "'",
	"\\\\": "\\"
};
/**
* @internal
*/
function jsonPath(path) {
	return `$${path.map((segment) => typeof segment == "string" ? `['${segment.replace(/[\f\n\r\t'\\]/g, (match) => ESCAPE[match])}']` : typeof segment == "number" ? `[${segment}]` : segment._key === "" ? `[${segment._index}]` : `[?(@._key=='${segment._key.replace(/['\\]/g, (match) => ESCAPE[match])}')]`).join("")}`;
}
/**
* @internal
*/
function jsonPathArray(path) {
	return path.map((segment) => typeof segment == "string" ? `['${segment.replace(/[\f\n\r\t'\\]/g, (match) => ESCAPE[match])}']` : typeof segment == "number" ? `[${segment}]` : segment._key === "" ? `[${segment._index}]` : `[?(@._key=='${segment._key.replace(/['\\]/g, (match) => ESCAPE[match])}')]`);
}
/**
* @internal
*/
function parseJsonPath(path) {
	let parsed = [], parseRe = /\['(.*?)'\]|\[(\d+)\]|\[\?\(@\._key=='(.*?)'\)\]/g, match;
	for (; (match = parseRe.exec(path)) !== null;) {
		if (match[1] !== void 0) {
			let key = match[1].replace(/\\(\\|f|n|r|t|')/g, (m) => UNESCAPE[m]);
			parsed.push(key);
			continue;
		}
		if (match[2] !== void 0) {
			parsed.push(parseInt(match[2], 10));
			continue;
		}
		if (match[3] !== void 0) {
			let _key = match[3].replace(/\\(\\')/g, (m) => UNESCAPE[m]);
			parsed.push({
				_key,
				_index: -1
			});
			continue;
		}
	}
	return parsed;
}
/**
* @internal
*/
function jsonPathToStudioPath(path) {
	return path.map((segment) => {
		if (typeof segment == "string" || typeof segment == "number") return segment;
		if (segment._key !== "") return { _key: segment._key };
		if (segment._index !== -1) return segment._index;
		throw Error(`invalid segment:${JSON.stringify(segment)}`);
	});
}
/**
* @internal
*/
function jsonPathToMappingPath(path) {
	return path.map((segment) => {
		if (typeof segment == "string" || typeof segment == "number") return segment;
		if (segment._index !== -1) return segment._index;
		throw Error(`invalid segment:${JSON.stringify(segment)}`);
	});
}
/** @internal */
function createEditUrl(options) {
	let { baseUrl, workspace: _workspace = "default", tool: _tool = "default", id: _id, type, path, projectId, dataset } = options;
	if (!baseUrl) throw Error("baseUrl is required");
	if (!path) throw Error("path is required");
	if (!_id) throw Error("id is required");
	if (baseUrl !== "/" && baseUrl.endsWith("/")) throw Error("baseUrl must not end with a slash");
	let workspace = _workspace === "default" ? void 0 : _workspace, tool = _tool === "default" ? void 0 : _tool, id = getPublishedId(_id), stringifiedPath = Array.isArray(path) ? toString(jsonPathToStudioPath(path)) : path, searchParams = new URLSearchParams({
		baseUrl,
		id,
		type,
		path: stringifiedPath
	});
	if (workspace && searchParams.set("workspace", workspace), tool && searchParams.set("tool", tool), projectId && searchParams.set("projectId", projectId), dataset && searchParams.set("dataset", dataset), isPublishedId(_id)) searchParams.set("perspective", "published");
	else if (isVersionId(_id)) {
		let versionId = getVersionFromId(_id);
		searchParams.set("perspective", versionId);
	}
	let segments = [baseUrl === "/" ? "" : baseUrl];
	workspace && segments.push(workspace);
	let routerParams = [
		"mode=presentation",
		`id=${id}`,
		`type=${type}`,
		`path=${encodeURIComponent(stringifiedPath)}`
	];
	return tool && routerParams.push(`tool=${tool}`), segments.push("intent", "edit", `${routerParams.join(";")}?${searchParams}`), segments.join("/");
}
/**
* @internal
*/
function resolveMapping(resultPath, csm) {
	if (!csm?.mappings) return;
	let resultMappingPath = jsonPath(jsonPathToMappingPath(resultPath));
	if (csm.mappings[resultMappingPath] !== void 0) return {
		mapping: csm.mappings[resultMappingPath],
		matchedPath: resultMappingPath,
		pathSuffix: ""
	};
	let resultMappingPathArray = jsonPathArray(jsonPathToMappingPath(resultPath));
	for (let i = resultMappingPathArray.length - 1; i >= 0; i--) {
		let key = `$${resultMappingPathArray.slice(0, i).join("")}`, mappingFound = csm.mappings[key];
		if (mappingFound) return {
			mapping: mappingFound,
			matchedPath: key,
			pathSuffix: resultMappingPath.substring(key.length)
		};
	}
}
/** @internal */
function resolveStudioBaseRoute(studioUrl) {
	let baseUrl = typeof studioUrl == "string" ? studioUrl : studioUrl.baseUrl;
	return baseUrl !== "/" && (baseUrl = baseUrl.replace(/\/$/, "")), typeof studioUrl == "string" ? { baseUrl } : {
		...studioUrl,
		baseUrl
	};
}
/** @internal */
function isArray(value) {
	return value !== null && Array.isArray(value);
}
/**
* generic way to walk a nested object or array and apply a mapping function to each value
* @internal
*/
function walkMap(value, mappingFn, path = []) {
	if (isArray(value)) return value.map((v, idx) => {
		if (isRecord(v)) {
			let _key = v._key;
			if (typeof _key == "string") return walkMap(v, mappingFn, path.concat({
				_key,
				_index: idx
			}));
		}
		return walkMap(v, mappingFn, path.concat(idx));
	});
	if (isRecord(value)) {
		if (value._type === "block" || value._type === "span") {
			let result = { ...value };
			return value._type === "block" ? result.children = walkMap(value.children, mappingFn, path.concat("children")) : value._type === "span" && (result.text = walkMap(value.text, mappingFn, path.concat("text"))), result;
		}
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walkMap(v, mappingFn, path.concat(k))]));
	}
	return mappingFn(value, path);
}
/**
* @internal
*/
function encodeIntoResult(result, csm, encoder) {
	return walkMap(result, (value, path) => {
		if (typeof value != "string") return value;
		let resolveMappingResult = resolveMapping(path, csm);
		if (!resolveMappingResult) return value;
		let { mapping, matchedPath } = resolveMappingResult;
		if (mapping.type !== "value" || mapping.source.type !== "documentValue") return value;
		let sourceDocument = csm.documents[mapping.source.document], sourcePath = csm.paths[mapping.source.path], matchPathSegments = parseJsonPath(matchedPath);
		return encoder({
			sourcePath: parseJsonPath(sourcePath).concat(path.slice(matchPathSegments.length)),
			sourceDocument,
			resultPath: path,
			value
		});
	});
}
var filterDefault = ({ sourcePath, resultPath, value }) => {
	if (isValidDate(value) || isValidURL(value)) return !1;
	let endPath = sourcePath.at(-1);
	return !(sourcePath.at(-2) === "slug" && endPath === "current" || typeof endPath == "string" && (endPath.startsWith("_") || endPath.endsWith("Id")) || sourcePath.some((path) => path === "meta" || path === "metadata" || path === "openGraph" || path === "seo") || hasTypeLike(sourcePath) || hasTypeLike(resultPath) || typeof endPath == "string" && denylist.has(endPath));
};
var denylist = /* @__PURE__ */ new Set(/* @__PURE__ */ "color.colour.currency.email.format.gid.hex.href.hsl.hsla.icon.id.index.key.language.layout.link.linkAction.locale.lqip.page.path.ref.rgb.rgba.route.secret.slug.status.tag.template.theme.type.textTheme.unit.url.username.variant.website".split("."));
function isValidDate(dateString) {
	return /^\d{4}-\d{2}-\d{2}/.test(dateString) ? !!Date.parse(dateString) : !1;
}
var allowedProtocols = /* @__PURE__ */ new Set([
	"app:",
	"data:",
	"discord:",
	"file:",
	"ftp:",
	"ftps:",
	"geo:",
	"http:",
	"https:",
	"imap:",
	"javascript:",
	"magnet:",
	"mailto:",
	"maps:",
	"ms-excel:",
	"ms-powerpoint:",
	"ms-word:",
	"slack:",
	"sms:",
	"spotify:",
	"steam:",
	"teams:",
	"tel:",
	"vscode:",
	"zoom:"
]);
function isValidURL(url) {
	try {
		let { protocol } = new URL(url, url.startsWith("/") ? "https://acme.com" : void 0);
		return allowedProtocols.has(protocol) || protocol.startsWith("web+");
	} catch {
		return !1;
	}
}
function hasTypeLike(path) {
	return path.some((segment) => typeof segment == "string" && segment.match(/type/i) !== null);
}
/**
* Uses `@vercel/stega` to embed edit info JSON into strings in your query result.
* The JSON payloads are added using invisible characters so they don't show up visually.
* The edit info is generated from the Content Source Map (CSM) that is returned from Sanity for the query.
* @public
*/
function stegaEncodeSourceMap(result, resultSourceMap, config) {
	let { filter, logger, enabled } = config;
	if (!enabled) {
		let msg = "config.enabled must be true, don't call this function otherwise";
		throw logger?.error?.(`[@sanity/client]: ${msg}`, {
			result,
			resultSourceMap,
			config
		}), TypeError(msg);
	}
	if (!resultSourceMap) return logger?.error?.("[@sanity/client]: Missing Content Source Map from response body", {
		result,
		resultSourceMap,
		config
	}), result;
	if (!config.studioUrl) {
		let msg = "config.studioUrl must be defined";
		throw logger?.error?.(`[@sanity/client]: ${msg}`, {
			result,
			resultSourceMap,
			config
		}), TypeError(msg);
	}
	let report = {
		encoded: [],
		skipped: []
	}, resultWithStega = encodeIntoResult(result, resultSourceMap, ({ sourcePath, sourceDocument, resultPath, value }) => {
		if ((typeof filter == "function" ? filter({
			sourcePath,
			resultPath,
			filterDefault,
			sourceDocument,
			value
		}) : filterDefault({
			sourcePath,
			resultPath,
			filterDefault,
			sourceDocument,
			value
		})) === !1) return logger && report.skipped.push({
			path: prettyPathForLogging(sourcePath),
			value: `${value.slice(0, 20)}${value.length > 20 ? "..." : ""}`,
			length: value.length
		}), value;
		logger && report.encoded.push({
			path: prettyPathForLogging(sourcePath),
			value: `${value.slice(0, 20)}${value.length > 20 ? "..." : ""}`,
			length: value.length
		});
		let { baseUrl, workspace, tool } = resolveStudioBaseRoute(typeof config.studioUrl == "function" ? config.studioUrl(sourceDocument) : config.studioUrl);
		if (!baseUrl) return value;
		let { _id: id, _type: type, _projectId: projectId, _dataset: dataset } = sourceDocument;
		return (0, import_dist.vercelStegaCombine)(value, {
			origin: "sanity.io",
			href: createEditUrl({
				baseUrl,
				workspace,
				tool,
				id,
				type,
				path: sourcePath,
				...!config.omitCrossDatasetReferenceData && {
					dataset,
					projectId
				}
			})
		}, !1);
	});
	if (logger) {
		let isSkipping = report.skipped.length, isEncoding = report.encoded.length;
		if ((isSkipping || isEncoding) && ((logger?.groupCollapsed || logger.log)?.("[@sanity/client]: Encoding source map into result"), logger.log?.(`[@sanity/client]: Paths encoded: ${report.encoded.length}, skipped: ${report.skipped.length}`)), report.encoded.length > 0 && (logger?.log?.("[@sanity/client]: Table of encoded paths"), (logger?.table || logger.log)?.(report.encoded)), report.skipped.length > 0) {
			let skipped = /* @__PURE__ */ new Set();
			for (let { path } of report.skipped) skipped.add(path.replace(reKeySegment, "0").replace(/\[\d+\]/g, "[]"));
			logger?.log?.("[@sanity/client]: List of skipped paths", [...skipped.values()]);
		}
		(isSkipping || isEncoding) && logger?.groupEnd?.();
	}
	return resultWithStega;
}
function prettyPathForLogging(path) {
	return toString(jsonPathToStudioPath(path));
}
//#endregion
export { encodeIntoResult, stegaEncodeSourceMap };

//# sourceMappingURL=stegaEncodeSourceMap-CO1HKnm2-C88WoO7l.js.map