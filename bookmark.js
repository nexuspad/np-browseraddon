function initBookmarkPage(sessionId) {
  userProfile(sessionId, function (userObj) {
    if (userObj) {
      setElementContent('#UserDisplayName', userObj.badge.name);
    } else {
      window.location = "login.htm";
    }
  });

	chrome.runtime.onMessage.addListener(function (message) {
		if (message['pageInfo']) {
			setElementInputValue('#Title', message['pageInfo'].title);
			setElementInputValue('#Url', message['pageInfo'].url);
			setElementInputValue('#Notes', message['pageInfo'].summary);		
			element('#SaveBookmark').focus();
		}
  });

	chrome.tabs.executeScript(null, {
		file: "/pageContent.js"
	});

  // load the folder tree when the page loads the script
  loadFolderTree(sessionId, function(folderTree) {
    html = displayTree(folderTree[0]);
    setElementContent('#SelectFolderDropdown', html);
    
    let childFolderToggles = element('#SelectFolderDropdown').querySelectorAll(".np-subfolder-toggle");
    childFolderToggles.forEach(function(toggle) {
      toggle.addEventListener('click', function() {
        let childId = '#' + this.id + '-SubFolders';
        if (window.getComputedStyle(element(childId)).display === 'none') {
          element(childId).style.display = 'block';
          this.classList.remove('fa-plus-square');
          this.classList.add('fa-minus-square');
        } else {
          element(childId).style.display = 'none';
          this.classList.remove('fa-minus-square');
          this.classList.add('fa-plus-square');
        }
      });
    });

    let folderSelections = element('#SelectFolderDropdown').querySelectorAll("span.np-folder-entry");
    folderSelections.forEach(function(toggle) {
      toggle.addEventListener('click', function() {
        let pieces = this.id.split('-');
        if (pieces.length > 1) {
          selectedFolder = pieces[1];
          setElementContent('#MyBookmarkFolders', this.innerHTML);
        }
      });
    });
  });

	elementClick('#MyBookmarkFolders', function () {
		anchor = this;
		document.body.addEventListener('click', function _clickListener(e) {
			/*
			 * Check 3 things before attempting to close the popout:
			 * 1. The click event is not on the anchor (popout opener).
			 * 2. The click event is not inside the popout.
			 * 3. The click event is not inside the anchor. Like this example: <a id="OpenSomething"><span>icon</span></a>
			 * 
			 * if the click is on one of the folder names
			 */
			if (e.target !== anchor && !element('#SelectFolderDropdown').contains(e.target)) {
				hideElement('#SelectFolderDropdown');
				document.body.removeEventListener('click', _clickListener);
			} else if (e.target.tagName.toLowerCase() === 'span' && e.target.classList.contains('np-folder-entry')) {
				hideElement('#SelectFolderDropdown');
				document.body.removeEventListener('click', _clickListener);
			}
		});
		showElement('#SelectFolderDropdown');
	});

	element('#Url').addEventListener('input', function () {
    if (this.value) {
			element('#SaveBookmark').focus();
		}
	});

	elementClick('#OpenMyBookmarks', function() {
		chrome.tabs.create({url: 'https://nexuspad.com/organize/bookmark'});
	});

	// when sign out clicked.
	elementClick('#Signout', function () {
		getValueInCookie(SESSION_COOKIE, function (sessionId) {
			//User is not logged in
			if (!sessionId) {
				window.close();
			} else {
				getUuid(function () {
					fetch(apiHost + 'user/logout', {
						mode: "cors",
						cache: "no-cache",
						headers: {
							"Content-Type": "application/json; charset=utf-8",
							'uuid': uuid,
							'utoken': sessionId
						}
					})
					.then(function() {
						chrome.cookies.remove({
							"url": COOKIE_DOMAIN,
							"name": SESSION_COOKIE
						});
						folderTree = null;
						window.close();
					}).catch(function(error) {
						console.log(error);
					});	
				});
			}
		});
	});

	//when u try to save the bookmark
	elementClick('#SaveBookmark', function() {
		var title = elementInputValue('#Title');
		var url = elementInputValue('#Url');
		var note = elementInputValue('#Notes');
		var tags = elementInputValue('#Tags');
	
		if (!url) {
			showInfoOrError('', 'nothing to bookmark.');
		} else {
			showInfoOrError('saving...', '');
			getValueInCookie(SESSION_COOKIE, function (sessionId) {
				getUuid(function(uuid) {
					bookmarkData = {
						entry: {
							'moduleId': 3,
							'templateId': 301,
							'webAddress': url,
							'title': title,
							'folder': {
								'moduleId': 3,
								'folderId': selectedFolder
							}
						}
					};
					if (note) {
						bookmarkData.entry.note = note;
					}
					if (tags) {
						bookmarkData.entry.tags = tags.split(',');
					}
					fetch(apiHost + 'bookmark', {
						method: 'POST',
						mode: "cors",
						cache: "no-cache",
						headers: {
							"Content-Type": "application/json; charset=utf-8",
							'utoken': sessionId,
							'uuid': uuid
						},
						body: JSON.stringify(bookmarkData)
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
							if (jsonData.errorReason) {
								showInfoOrError('', 'error saving the bookmark: ' + jsonData.errorReason);
							} else {
								showInfoOrError('', 'error saving the bookmark. Please try again later.')
							}
						}
					}).catch(function(error) {
						console.log(error);
					});	
				});	
			});
		}	
	});
}