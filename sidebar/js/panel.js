const storage = browser.storage;
const tabs = browser.tabs;
const polyglot = new Polyglot();

polyglot.extend({
  "num_tabs": "%{smart_count} tab |||| %{smart_count} tabs",
});

class TabSweeperSideBar {
    constructor() {
        this.sessions = [];
        this.sessionContainer = $("#session-container");
        this.clearAll = $("button#clearall");
        this.timeoutId;

        this.tags = {
            DIV: "<div>",
            SPAN: "<span>",
            TABLE: "<table>",
            TR: "<tr>",
            TD: "<td>",
            BUTTON: "<button>",
            A: "<a>"
        };

        // clear all session data
        this.clearAll.click(() => this.clearSessionData());
        tabs.onRemoved.addListener(() => this.refresh());
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
            this.sessionContainer.empty().promise()
            .done(resolve)
            .fail(reject);
        });
    }

    /*
     * Output a single session's URLs
     * TODO: split this up into smaller chunks
     */
    outputSessionUrls(session, sessionIndex) {
        let created = moment(session.created).format("HH:mm:ss D/M/YYYY");
        let pluralized = polyglot.t("num_tabs", {
            smart_count: session.tabs.length
        });

        let urlPanel = $(this.tags.DIV);

        urlPanel.addClass("panel", "panel-default")
        .append(
            $(this.tags.DIV)
            .addClass("panel-heading")
            .text(`${pluralized} - ${created}`)
        );

        let urlTable = $(this.tags.TABLE);

        urlTable.addClass("table", "table-responsive");
        urlPanel.append(urlTable);

        session.tabs.forEach((tab, index) => {
            let urlTableRow = $(this.tags.TR);
            let urlTableData = $(this.tags.TD);
            let closeBtn = $(this.tags.BUTTON);

            closeBtn
            .addClass("close")
            .attr("type", "button")
            .attr("aria-label", "Close")
            .append(
                $(this.tags.SPAN)
                .attr("aria-hidden", "true")
                .append("&times;")
            )
            .click(() => this.removeTab(session, index, sessionIndex));

            urlTableData.append(closeBtn);

            let anchor = $(this.tags.A)
            .attr("href", "#")
            .text(tab.url)
            .click(() => {
                tabs.create({
                    url: tab.url
                });
            });

            urlTableData.append(anchor)
            urlTableRow.append(urlTableData)
            urlTable.append(urlTableRow);
        });

        this.sessionContainer.append(urlPanel);
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
tabSweeperSideBar.render();
