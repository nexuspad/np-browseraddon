// var apiHost = 'http://localhost:8080/api/';
// var SESSION_COOKIE = '_t';
// var COOKIE_DOMAIN = 'http://localhost:8081';

var apiHost = 'https://api.nexuspad.com/api/';
var SESSION_COOKIE = '_t';
var COOKIE_DOMAIN = 'https://nexuspad.com';

// global variables
var uuid = null;
var folderTree;
var folders;
var selectedFolder = 0;

getUuid();

// this will be executed on every pages
document.addEventListener('DOMContentLoaded', function () {
	getValueInCookie(SESSION_COOKIE, function (sessionId) {
		if (!sessionId) {
			if (currentPage() === 'login') {
				initLoginPage();
			} else {
				window.location = 'login.htm';
			}
		} else {
			if (currentPage() === 'bookmark') {
				initBookmarkPage(sessionId);
			} else {
				window.location = 'bookmark.htm';
			}
		}
	});
});

chrome.contextMenus.removeAll(function() {
	chrome.contextMenus.create({
		id: "np-save-web-clipping",
		title: "Save to NexusPad",
		contexts: ["selection"],
		onclick: function(info) {
			chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
				postWebClipping(tabs[0].url, info.selectionText);
			});
		}
	});	
});

function getUuid(callBackFunc) {
	if (uuid) {
		if (callBackFunc)
			callBackFunc(uuid);
		return;
	}
	options = {
		excludes: { userAgent: true, language: true, canvas: true, webgl: true, adBlock: true, audio: true, enumerateDevices: true }
	}
	if (window.requestIdleCallback) {
		requestIdleCallback(function () {
			Fingerprint2.get(options, function (components) {
				uuid = Fingerprint2.x64hash128(components.map((c) => c.value).join(''), 31);
				if (callBackFunc)
					callBackFunc(uuid);
			});
		})
	} else {
		setTimeout(function () {
			Fingerprint2.get(options, function (components) {
				uuid = Fingerprint2.x64hash128(components.map((c) => c.value).join(''), 31);
				if (callBackFunc)
					callBackFunc(uuid);
			});
		}, 500);
	}
}

function userProfile(sessionId, callBackFunc) {
	getUuid(function(uuid) {
		fetch(apiHost + 'user/hello/' + sessionId, {
			mode: "cors",
			cache: "no-cache",
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				'uuid': uuid
			}
		})
		.then(function(response) {
			return response.json();
		}).then(function(jsonData) {
			if (jsonData && jsonData.user) {
				callBackFunc(jsonData.user);
			} else {
				callBackFunc(false);
			}
		}).catch(function(error) {
			console.log(error);
		});	
	});
}

function currentPage() {
	if (document.querySelector('#LoginPage')) {
		return 'login';
	} else if (document.querySelector('#BookmarkPage')) {
		return 'bookmark';
	}
	return 'landing';
}

function showInfoOrError(info, error) {
	hideElement('#InfoMessage');
	hideElement('#ErrorMessage');

	if (info.length > 0) {
		setElementContent('#InfoMessage', info);
		showElement('#InfoMessage');
	}

	if (error.length > 0) {
		setElementContent('#ErrorMessage', error);
		showElement('#ErrorMessage');
	}
}

function element(id) {
	return document.querySelector(id);
}

function elementClick(id, callBackFunc) {
	if (!element(id)) return;
	element(id).addEventListener('click', callBackFunc);
}

function elementRemoveClass(id, className) {
	if (!element(id)) return;
	element(id).classList.remove(className);
}

function showElement(id) {
	let elem = element(id);
	if (!elem) return;
	elem.classList.remove('hidden');
	if (window.getComputedStyle(elem).display === 'none') {
		elem.style.display = 'block';
	}
}

function hideElement(id) {
	let elem = element(id);
	if (!elem) return;
	elem.classList.add('hidden');
	if (window.getComputedStyle(elem).display !== 'none') {
		elem.style.display = 'none';
	}
}

function elementIsHidden(id) {
	let elem = element(id);
	if (!elem) return false;
	if (window.getComputedStyle(elem).visibility === 'hidden' || window.getComputedStyle(elem).display === 'none') {
		return true;
	}
	return false;
}

function elementInputValue(id) {
	if (!element(id)) return;
	return element(id).value;
}

function setElementInputValue(id, value) {
	if (!element(id)) return;
	element(id).value = value;
}

function setElementContent(id, content) {
	if (!element(id)) return;
	element(id).innerHTML = content;
}

function getValueInCookie(name, callBackFunc) {
	chrome.cookies.get({
		"url": COOKIE_DOMAIN,
		"name": name
	}, function (cookie) {
		if (cookie) {
			callBackFunc(cookie.value);
		} else {
			callBackFunc(false);
		}
	});
}

function setValueInCookie(name, value) {
	chrome.cookies.set({
		url: COOKIE_DOMAIN,
		name: name,
		value: value
	});
}

function postWebClipping(url, clipping) {
	let parser = document.createElement('a');
	parser.href = url;
	let hostName = parser.hostname;
	if (hostName.indexOf('www.') === 0) {
		hostName = hostName.substring(4);
	}
	let now = new Date();
	let title = 'web clipping from ' + hostName + ' ' + now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

	getValueInCookie(SESSION_COOKIE, function (sessionId) {
		getUuid(function(uuid) {
			docData = {
				entry: {
					'moduleId': 4,
					'templateId': 401,
					'folder': {
						'moduleId': 4,
						'folderId': 0
					},
					'title': title,
					'note': clipping
				}
			};

			fetch(apiHost + 'doc', {
				method: 'POST',
				mode: "cors",
				cache: "no-cache",
				headers: {
					"Content-Type": "application/json; charset=utf-8",
					'utoken': sessionId,
					'uuid': uuid
				},
				body: JSON.stringify(docData)
			})
			.then(function(response) {
				return response.json();
			}).then(function(jsonData) {
				if (jsonData && jsonData.entry) {
					showInfoOrError('saved to NexusPad.', '');
					setTimeout(
						function () {
							window.close();
						}, 400);
				} else {
          chrome.tabs.create({  
            url: 'https://nexuspad.com'
          });  
          if (jsonData.errorReason) {
						showInfoOrError('', 'error saving the bookmark: ' + jsonData.errorReason);
					} else {
						showInfoOrError('', 'error saving the bookmark. Please try again later.')
					}
				}
			}).catch(function(error) {
				chrome.tabs.create({  
					url: 'https://nexuspad.com'
				});
				console.log(error);
			});	
		});	
	});
}