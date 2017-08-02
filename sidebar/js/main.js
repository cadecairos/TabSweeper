import Polyglot from 'node-polyglot';

const storage = browser.storage;
const tabs = browser.tabs;
const polyglot = new Polyglot();

polyglot.extend({
  "num_tabs": "%{smart_count} tab |||| %{smart_count} tabs",
});


class TabSweeperSideBar {
    constructor() {
        this.sessions = [];
        this.sessionContainer = document.querySelector("#session-container");
        this.clearAll = document.querySelector("button#clearall");
        this.timeoutId;

        this.tags = {
            DIV: "div",
            SPAN: "span",
            TABLE: "table",
            TR: "tr",
            TD: "td",
            BUTTON: "button",
            A: "a"
        };

        // clear all session data
        this.clearAll.click(() => this.clearSessionData());
        tabs.onRemoved.addListener(() => this.refresh());

        this.render();
    }

    /*
     * Initialize the page with any saved sessions
     */
    render() {
        this.getSavedSessions()
        .then(result => this.outputSessions(result))
        .catch(e => console.error(e));
    }

    /*
     * iterate over sessions and display them
     */
    outputSessions() {
        if (!this.sessions || !this.sessions.length) {
            // TODO: display message about no sessions
            return;
        }

        this.sessions.forEach(this.outputSessionUrls, this);
    }

    /*
     * get sessions from local storage
     */
    getSavedSessions() {
        return storage.local.get()
        .then(result => {
            this.sessions = result.sessions
        });
    }

    /*
     * refresh the sidebar
     */
    refresh() {
        // debounce!
        if (this.timeoutId) {
            window.clearTimeout(this.timeoutId);
        }

        this.timeoutId = window.setTimeout(() => {
            this.clearSessionContainer()
            .then(() => this.getSavedSessions())
            .then(() => this.render())
            .catch(e => console.error(e))
        }, 25);
    }

    /*
     * Clear all Session data
     */
    clearSessionData() {
        storage.local.set({sessions: []})
        .then(() => this.refresh())
        .catch(e => console.error(e));
    }

    /*
     * empty sessionContainer
     */
    clearSessionContainer() {
        return new Promise((resolve, reject) => {
            let container = this.sessionContainer;
            while(container.firstChild) {
                container.removeChild(container.firstChild);
            }
            resolve();
        });
    }

    /*
     * Output a single session's URLs
     * TODO: split this up into smaller chunks
     */
    outputSessionUrls(session, sessionIndex) {
        let created =  "asdf";// TODO replace moment
        let pluralized = polyglot.t("num_tabs", {
            smart_count: session.tabs.length
        });

        // set up panel
        let urlPanel = document.createElement(this.tags.DIV);
        urlPanel.classList.add("panel", "panel-default");

        // set up panel heading
        let panelHeading = document.createElement(this.tags.DIV);
        panelHeading.classList.add("panel-heading");
        panelHeading.textContent = `${pluralized} - ${created}`;

        // set up table element
        let urlTable = document.createElement(this.tags.TABLE);
        urlTable.classList.add("table", "table-responsive");

        // append panel heading and table to the panel
        urlPanel.appendChild(panelHeading);
        urlPanel.appendChild(urlTable);

        session.tabs.forEach((tab, index) => {
            let urlTableRow = document.createElement(this.tags.TR);
            let urlTableData = document.createElement(this.tags.TD);
            let closeBtn = document.createElement(this.tags.BUTTON);
            let closeSpan = document.createElement(this.tags.SPAN);
            let anchor = document.createElement(this.tags.A)

            closeBtn.classList.add("close");
            closeBtn.setAttribute("type", "button");
            closeBtn.setAttribute("aria-label", "Close");

            closeSpan.innerHTML = "&times;";

            closeBtn.appendChild(closeSpan);

            closeBtn.addEventListener("click", () => this.removeTab(session, index, sessionIndex));

            urlTableData.appendChild(closeBtn);

            anchor.setAttribute("href", "#");
            anchor.textContent = tab.url;
            anchor.addEventListener("click", () => {
                tabs.create({
                    url: tab.url
                });
            });

            urlTableData.appendChild(anchor)
            urlTableRow.appendChild(urlTableData)
            urlTable.appendChild(urlTableRow);
        });

        this.sessionContainer.appendChild(urlPanel);
    }

    removeTab(session, index, sessionIndex) {
        session.tabs.splice(index, 1);

        if (session.tabs.length) {
            this.sessions[sessionIndex] = session;
        } else {
            this.sessions.splice(sessionIndex, 1);
        }

        this.saveSessions()
        .then(() => this.refresh())
        .catch(e => console.error(e))
    }

    /*
     * save sessions to local storage
     */
    saveSessions() {
        let sessions = this.sessions;
        return storage.local.set({sessions});
    }
}

let tabSweeperSideBar = new TabSweeperSideBar();
