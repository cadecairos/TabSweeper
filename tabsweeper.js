const notifications = browser.notifications;
const tabs = browser.tabs;
const storage = browser.storage;

class TabSweeper {
    constructor() {
        this.urls = {
            iconUrl: "icons/tabsweeper.png",
            sidebarUrl: "/sidebar/panel.html"
        };

        this.messages = {
            pressToOpen: "\n\nPress Ctrl+Shift+Y to toggle the Tab Sweeper sidebar",
            nothingToClean: "Your browser tabs are already clean!",
            tabsSaved: "Tabs saved and closed!"
        };

        this.disallowedURLs = [
            "chrome:",
            "javascript:",
            "data:",
            "file:",
            "moz-extension:",
            "about:"
        ];

        this.sessions = [];

        browser.browserAction.onClicked.addListener(() => this.cleanup());
        browser.commands.onCommand.addListener((command) => this.onCommand(command));
    }

    /*
     * Clean up open tabs and save data to local storage
     */
    cleanup() {
        this.getTabs()
        .then(result => this.filterTabs(result))
        .then(result => this.loadSavedSessions(result))
        .then(result => this.saveSession(result))
        .catch(e => console.error(e));
    }

    /*
     * get open tabs in the window that aren't pinned
     */
    getTabs() {
        return tabs.query({
            currentWindow: true,
            pinned: false
        }).then(openTabs => {
            return { openTabs };
        });
    }

    /*
     * Filter the open tabs list for unsupported URI schemes
     * extract and store information about tab count and URLs
     */
    filterTabs(result) {
        let openTabs = result.openTabs;
        let tabCount = openTabs.length;

        // filter out disallowed URLs
        openTabs = openTabs.filter(tab =>
            !this.disallowedURLs.some(scheme => tab.url.startsWith(scheme))
        );
        if (openTabs.length === 0) {
            result.nothingToClean = true;
            return result;
        }

        result.nothingToClean = false;

        result.tabIDs = openTabs.map(tab => tab.id);

        result.tabsToSave = openTabs.map(tab => {
            return {
                url: tab.url,
                title: tab.title,
                favIconUrl: tab.favIconUrl
            }
        });

        result.allTabsClosing = tabCount === result.tabIDs.length;

        return result;//loadSavedSessions();
    }

    /*
     * get sessions from local storage
     */
    loadSavedSessions(result) {
        return storage.local.get()
        .then(storageData => {
            if (storageData && storageData.sessions) {
                this.sessions = storageData.sessions;
            }
            return result;
        });
    }

    /*
     * Save the session to local storage
     */
    saveSession(result) {
        console.log(result.nothingToClean)
        if (result.nothingToClean) {
            return this.notify(`${this.messages.nothingToClean}${this.messages.pressToOpen}`);
        }

        this.sessions.unshift({
            created: Date.now(),
            tabs: result.tabsToSave
        });

        return this.saveSessionsToStorage(result)
        .then((result) => this.createBlankTab(result))
        .then((result) => this.closeTabs(result))
        .then(() => this.notify(`${this.messages.tabsSaved}${this.messages.pressToOpen}`));
    }

    /*
     * save sessions to local storage
     */
    saveSessionsToStorage(result) {
        return storage.local.set({ sessions: this.sessions })
        .then(() => result);
    }

    /*
     * Create a blank tab, so the window stays open
     */
    createBlankTab(result) {
        if (result.allTabsClosing) {
           return tabs.create({})
           .then(() => result);
        }

        return result;
    }

    /*
     * close a set of tabs
     */
    closeTabs(result) {
        return tabs.remove(result.tabIDs).then(() => result);
    }

    /*
     * Display a notification
     */
    notify(message) {
        return notifications.create("TabSweeper-notify", {
            message,
            type: "basic",
            title: "Complete",
            iconUrl: browser.extension.getURL(this.urls.iconUrl)
        }).then(id => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    notifications.clear(id).then(resolve, reject);
                });
            });
        });
    }

    onCommand(command) {
        if (command == "execute-cleanup") {
            this.cleanup();
        }
    }
}

new TabSweeper();