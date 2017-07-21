const notifications = browser.notifications;
const tabs = browser.tabs;
const storage = browser.storage;
const disallowedURLs = [
    "chrome:",
    "javascript:",
    "data:",
    "file:",
    "moz-extension:",
    "about:"
];

let tabWweeperNotification = "tabWweeper save success";

/*
 * Display a message
 */
function notify(message, title) {
    return notifications.create(tabWweeperNotification, {
        type: "basic",
        message,
        title,
        iconUrl: browser.extension.getURL("icons/tabsweeper.png")
    }).then(id => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                notifications.clear(id).then(resolve, reject);
            });
        });
    });
}

/*
 * save sessions to local storage
 */
function saveSessions(sessions) {
    return storage.local.set({sessions});
}

/*
 * close a set of tabs
 */
function closeTabs(tabIDs) {
    return tabs.remove(tabIDs);
}

/*
 * Create a blank tab, so the window stays open
 */
function createBlankTab() {
    return tabs.create({});
}

/*
 * get sessions from local storage
 */
function getSavedSessions() {
    return storage.local.get();
}

/*
 * get open tabs in the window that aren't pinned
 */
function getTabs() {
    return tabs.query({
        currentWindow: true,
        pinned: false
    });
}

/*
 * get open tabs
 */
function cleanup() {
    let tabs,
        tabIDs,
        allTabsClosing = false,
        nothingToClean = false;

    getTabs()
    .then(openTabs => {

        let tabCount = openTabs.length;

        // filter out disallowed URLs
        openTabs = openTabs.filter(tab =>
            !disallowedURLs.some(scheme => tab.url.startsWith(scheme))
        );

        if (openTabs.length === 0) {
            return nothingToClean = true;
        }

        tabIDs = openTabs.map(tab => tab.id);

        tabs = openTabs.map(tab => {
            return {
                url: tab.url,
                title: tab.title,
                favIconUrl: tab.favIconUrl
            }
        });

        if (tabCount === tabIDs.length) {
            allTabsClosing = true;
        }

        return getSavedSessions();
    })
    .then(result => {
        if (nothingToClean) {
            return notify("Your browser tabs are already clean!", "Success");
        }

        if (!result || !result.sessions) {
            result.sessions = [];
        }

        let created = Date.now();

        result.sessions.unshift({ created, tabs });

        return saveSessions(result.sessions)
        .then(() => {
            if (allTabsClosing) {
                return createBlankTab()
            }
            return Promise.resolve();
        })
        .then(() => closeTabs(tabIDs))
        .then(() => notify("Tabs saved and closed!", "Success"));
    })
    .catch(e => console.error(e));
}

browser.browserAction.onClicked.addListener(cleanup);

browser.commands.onCommand.addListener(function(command) {
  if (command == "open-list-in-tab") {
    tabs.create({
        url: "/sidebar/panel.html"
    });
  }
});
