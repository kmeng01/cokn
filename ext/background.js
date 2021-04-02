'use strict';

chrome.tabs.onActivated.addListener(function(info) {
    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
        var url = tabs[0].url;
        // @TODO do something
    });
});

listenForBadge();

function listenForBadge() {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, tabs => {
        chrome.tabs.sendMessage(
            tabs[0].id, { from: 'popup', subject: 'badgeInfo' },
            updateBadge);
    });

    setTimeout(listenForBadge, 1000);
}

const updateBadge = res => {
    if (chrome.runtime.lastError) {
        chrome.browserAction.setBadgeText({text: ""});
        return;
    }

    chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });

    if (res.id == '-1') {
        chrome.browserAction.setBadgeText({text: "⭯"});
        chrome.browserAction.setBadgeBackgroundColor({ color: [230, 149, 0, 255] });
    } else chrome.browserAction.setBadgeText({text: String(res.content)});

    if (res.id == '200-cc') {
        chrome.browserAction.setBadgeBackgroundColor({ color: [77, 140, 255, 255] });
    }
}