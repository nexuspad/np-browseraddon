function initLoginPage() {
  elementClick('#Signup', function() {
    chrome.tabs.create({url:'http://nexuspad.com/register'});	
  });
  elementClick('#Login', function() {
    loginSubmit();
	});
}

function loginSubmit() {
	var userName = elementInputValue('#UserName');
	var password = elementInputValue('#Password');

	if (!userName || !password) {
		showInfoOrError('', "invalid credentials");
	} else {
		getUuid(function() {
			loginData = {
				user: {
					auth: {
						login: userName,
						password: password
					}
				}
			};
			fetch(apiHost + 'user/login', {
				method: 'POST',
				mode: "cors",
				cache: "no-cache",
				headers: {
					"Content-Type": "application/json; charset=utf-8",
					'uuid': uuid
				},
				body: JSON.stringify(loginData)
			})
			.then(function(response) {
				return response.json();
			}).then(function(jsonData) {
				if (jsonData.user) {
					setValueInCookie(SESSION_COOKIE, jsonData.user.sessionId);
					window.location = "bookmark.htm";
				} else {
					showInfoOrError('', "invalid credentials")
				}
			}).catch(function(error) {
				console.log(error);
			});	
		});
	}
}