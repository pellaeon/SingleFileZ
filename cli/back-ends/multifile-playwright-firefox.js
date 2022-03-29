/*
 * Copyright 2010-2020 Gildas Lormeau
 * contact : gildas.lormeau <at> gmail.com
 * 
 * This file is part of SingleFile.
 *
 *   The code in this file is free software: you can redistribute it and/or 
 *   modify it under the terms of the GNU Affero General Public License 
 *   (GNU AGPL) as published by the Free Software Foundation, either version 3
 *   of the License, or (at your option) any later version.
 * 
 *   The code in this file is distributed in the hope that it will be useful, 
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of 
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero 
 *   General Public License for more details.
 *
 *   As additional permission under GNU AGPL version 3 section 7, you may 
 *   distribute UNMODIFIED VERSIONS OF THIS file without the copy of the GNU 
 *   AGPL normally required by section 4, provided you include this license 
 *   notice and a URL through which recipients can access the Corresponding 
 *   Source.
 */

/* global singlefile, infobar, require, exports */

const playwright = require("playwright");
const scripts = require("./common/scripts.js");

const NETWORK_IDLE_STATE = "networkidle";

var browser, context;

exports.initialize = async options => {
	browser = await playwright.firefox.launch(getBrowserOptions(options));
};

exports.getPageData = async options => {
	let page;
	try {
		context = await browser.newContext({
			bypassCSP: options.browserBypassCSP === undefined || options.browserBypassCSP
		});
		await setContextOptions(context, options);
		page = await context.newPage();
		await setPageOptions(page, options);
		return await getPageData(page, options);
	} finally {
		if (page) {
			await page.close();
		}
	}
};

exports.closeBrowser = () => {
	if (browser) {
		return browser.close();
	}
};

function getBrowserOptions(options) {
	const browserOptions = {};
	if (options.browserHeadless !== undefined) {
		browserOptions.headless = options.browserHeadless && !options.browserDebug;
	}
	browserOptions.args = options.browserArgs ? JSON.parse(options.browserArgs) : [];
	if (options.browserExecutablePath) {
		browserOptions.executablePath = options.browserExecutablePath || "firefox";
	}
	return browserOptions;
}

async function setContextOptions(context, options) {
	if (options.browserCookies && options.browserCookies.length) {
		await context.addCookies(options.browserCookies);
	}
}

async function setPageOptions(page, options) {
	if (options.browserWidth && options.browserHeight) {
		await page.setViewportSize({
			width: options.browserWidth,
			height: options.browserHeight
		});
	}
	if (options.httpHeaders) {
		page.setExtraHTTPHeaders(options.httpHeaders);
	}
}

async function getPageData(page, options) {
	const injectedScript = await scripts.get(options);
	await page.addInitScript(injectedScript);
	if (options.browserDebug) {
		await page.waitForTimeout(3000);
	}
	try {
		await page.goto(options.url, {
			timeout: options.browserLoadMaxTime || 0,
			waitUntil: options.browserWaitUntil && options.browserWaitUntil.startsWith("networkidle") ? NETWORK_IDLE_STATE : options.browserWaitUntil || NETWORK_IDLE_STATE
		});
	} catch (error) {
		if (error instanceof playwright.errors.TimeoutError) {
			/* Some pages have trackers that regularly tries to send XHR, so networkidle will never fire.
			 * In this case we wait for 'load' event instead. For such pages, they should be already
			 * loaded so it'll just return immediately and continue our next step.*/
			await page.waitForLoadState();
		} else {
			throw error;
		}
	}

	if (options.browserWaitDelay) {
		await page.waitForTimeout(options.browserWaitDelay);
	}
	// Set up event listener to print injected script's console logs
	page.on('console', async msg => {
		if ( msg.type() === 'log' || msg.type() === 'trace' ) {
			const values = [];
			for (const arg of msg.args())
				values.push(await arg.jsonValue());
			console.log(...values);
		}
	});
	await page.exposeBinding('contextGetCSS', contextGetCSS);
	var pageData = await page.evaluate(async options => {
		options.compressContent = false;
		// singlefile here is defined in ../src/single-file/index.js
		options.getFileContent = singlefile.getFileContent;
		//options.fetch = window.contextGetCSS;
		const pageData = await singlefile.getPageData(options);
		if (options.includeInfobar) {
			await infobar.includeScript(pageData);
		}
		return pageData;
	}, options);
	// TODO fetch and fill resource content before return
	await fetchAndFillPageResources(pageData);
	if ( !options.browserHeadless ) await page.waitForTimeout(300000);
	return pageData;
}

// Function modified from lib/single-file/processors/compression/compression.js addPageResources
async function fetchAndFillPageResources(pageData) {
	for (const resourceType of Object.keys(pageData.resources)) {
		for (const resourceFile of pageData.resources[resourceType]) {
			if ( !resourceFile.hasOwnProperty('content') || resourceFile.content === undefined || resourceFile.content.length == 0) {
				if ( resourceFile.url && !resourceFile.url.startsWith("data:") && resourceType != "frames") {
					// FIXME should not await here, should parallelize
					resourceFile.content = await fetchAndFillFile(resourceFile);
				}
			}
		}
	}
	/*
	await Promise.all(Object.keys(pageData.resources).map(async resourceType =>
		Promise.all(pageData.resources[resourceType].map(resourceFile => {
			/* FIXME don't handle frames for now
			if (resourceType == "frames") {
				return fetchAndFillPageResources(data);
			} else {
				return addFile(zipWriter, prefixName, data, true);
			}
			return resourceFile.content;
		}))
	));
	*/
	//console.log(pageData.resources);
}

async function fetchAndFillFile(resourceFile) {
	console.log("Handling resourceFile: "+resourceFile.url);
	return context.request.get(resourceFile.url).
		then(apiresponse => apiresponse.body());
}

/* When in injected script mode, fetch will be subjected to CORS limitation.
 * For example, a page may include a stylesheet using <link>, the browser will load the page with no problem,
 * but when we fetch the stylesheet from injectes js, browser blocks us because the stylesheet URL is not
 * allowed in CORS.
 * This is overcome by fetching the URL from Playwright context. contextGetCSS is exposed to the injected script
 * for it to call.
 */
async function contextGetCSS(context, url, options = {}) {
	//return context2.page.request.get("https://addons.books.com.tw/G/ADbanner/2022/02/body790.jpg");
	let contextGetOptions = options.headers || {};
	if ( options.referrer ) contextGetOptions['referrer'] = options.referrer;
	var resp = await context.page.request.get(url, contextGetOptions);
	var contenttype = resp.headers()['Content-Type'] || resp.headers()['content-type'];
	if ( contenttype == 'text/css' ) {
		console.log("contextGetCSS "+url);
		// Unfortunately it seems that we can't return the resp directly because playwright will fail to serialize it
		// So we have to construct a new object without functions
		function toArrayBuffer(buf) {
			    const ab = new ArrayBuffer(buf.length);
			    const view = new Uint8Array(ab);
			    for (let i = 0; i < buf.length; ++i) {
					        view[i] = buf[i];
					    }
			    return ab;
		}
		//var bodybuf = await resp.body().then(buffer => toArrayBuffer(buffer));
		var bodybuf = await resp.body();
		var arr = new Uint8Array(bodybuf.length);
		bodybuf.copy(arr)
		let ret = {
			'arrayBuffer': arr,
			'contentType': contenttype,
			'url': resp.url(),
			'status': resp.status()
		}
		return ret;
	} else {
		throw Error('contextGetCSS only handles CSS, server returned '+contenttype);
	}
}
