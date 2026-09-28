import { a as parseJsonText, i as httpResponseFromFetch, n as ClientError, o as require_cjs, r as ServerError } from "../index.js";
//#region node_modules/.pnpm/@sanity+client@8.7.0_vitest@5.0.1_@opentelemetry+api@1.9.1_@types+node@24.19.0_jsdom@29_94485a72285fb30450eb265e81f4725b/node_modules/@sanity/client/dist/browserUpload-QxCD0Hp6.js
var import_cjs = require_cjs();
/**
* Run an asset upload through `XMLHttpRequest` so we can surface per-chunk
* upload progress events. get-it v9 / fetch has no equivalent hook in the
* browser, so the observable asset-upload API falls back to this path when
* `XMLHttpRequest` is available.
*
* @internal
*/
function uploadWithProgress(options) {
	return new import_cjs.Observable((subscriber) => {
		let xhr = new XMLHttpRequest(), { url, method, headers, body, withCredentials, timeout, signal } = options;
		xhr.open(method, url), xhr.withCredentials = withCredentials, typeof timeout == "number" && timeout > 0 && (xhr.timeout = timeout);
		for (let [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
		xhr.upload.onprogress = (e) => {
			subscriber.next({
				type: "progress",
				stage: "upload",
				percent: e.lengthComputable ? Math.round(e.loaded / e.total * 100) : 0,
				total: e.total || void 0,
				loaded: e.loaded,
				lengthComputable: e.lengthComputable
			});
		}, xhr.onload = () => {
			if (xhr.status >= 400) {
				let errorHeaders = parseXhrResponseHeaders(xhr.getAllResponseHeaders()), canonical = httpResponseFromFetch({
					status: xhr.status,
					statusText: xhr.statusText,
					headers: errorHeaders,
					body: parseJsonText(xhr.responseText, errorHeaders),
					url: xhr.responseURL
				}, url, method);
				subscriber.error(xhr.status >= 500 ? new ServerError(canonical) : new ClientError(canonical));
				return;
			}
			let responseBody;
			try {
				responseBody = JSON.parse(xhr.responseText);
			} catch {
				subscriber.error(/* @__PURE__ */ Error("Failed to parse upload response as JSON"));
				return;
			}
			subscriber.next({
				type: "response",
				body: responseBody
			}), subscriber.complete();
		}, xhr.onerror = () => {
			subscriber.error(/* @__PURE__ */ Error("XHR upload network error"));
		}, xhr.ontimeout = () => {
			subscriber.error(new DOMException(`The operation timed out after ${timeout}ms while attempting to reach ${url}`, "TimeoutError"));
		}, xhr.onabort = () => {
			subscriber.error(new DOMException("Upload aborted", "AbortError"));
		};
		let onSignalAbort = () => xhr.abort();
		if (signal) {
			if (signal.aborted) {
				subscriber.error(new DOMException("Upload aborted", "AbortError"));
				return;
			}
			signal.addEventListener("abort", onSignalAbort, { once: !0 });
		}
		return xhr.send(body), () => {
			signal?.removeEventListener("abort", onSignalAbort), xhr.abort();
		};
	});
}
/**
* Parse `XMLHttpRequest.getAllResponseHeaders()` output (CRLF-separated
* `name: value` lines) into a `Headers` instance.
*/
function parseXhrResponseHeaders(raw) {
	let headers = new Headers();
	for (let line of raw.split("\r\n")) {
		let separator = line.indexOf(":");
		if (!(separator <= 0)) try {
			headers.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
		} catch {}
	}
	return headers;
}
//#endregion
export { uploadWithProgress };

//# sourceMappingURL=browserUpload-QxCD0Hp6-b_5_gUAO.js.map