const storage = browser.storage;
const tabs = browser.tabs;

let sessions = null;
let sessionContainer = $("#session-container");
let clearAll = $("button#clearall");
let polyglot = new Polyglot();
let timeoutId;

polyglot.extend({
  "num_tabs": "%{smart_count} tab |||| %{smart_count} tabs",
});

clearAll.click(clearSessionData);

/*
 * refresh the sidebar
 */
function refresh() {
    // debounce!
    if (timeoutId) {
        window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
        clearSidebar()
            .then(displaySessions)
            .catch(e => console.error(e))
    }, 25);
}

/*
 * clear the sidebar
 */
function clearSidebar() {
    return new Promise((resolve) => {
        sessionContainer.empty();
        resolve();
    });
}

/*
 * Clear all Session data
 */
function clearSessionData() {
    storage.local.set({sessions: []})
        .then(clearSidebar)
        .then(displaySessions)
        .catch(e => console.error(e));
}

/*
 * Output a single session's URLs
 */
function outputSessionUrls(session, sessionIndex) {
    let created = moment(session.created).format("HH:mm:ss D/M/YYYY");
    let pluralized = polyglot.t("num_tabs", {
        smart_count: session.tabs.length
    });

    let urlPanel = $('<div>');

    urlPanel.addClass("panel", "panel-default")
    .append(
        $('<div>')
        .addClass("panel-heading")
        .text(`${pluralized} - ${created}`)
    );

    let urlTable = $("<table>");

    urlTable.addClass("table", "table-responsive");
    urlPanel.append(urlTable);

    session.tabs.forEach((tab, index) => {
        let urlTableRow = $("<tr>");
        let urlTableData = $("<td>");
        let closeBtn = $("<button>");

        closeBtn
        .addClass("close")
        .attr("type", "button")
        .attr("aria-label", "Close")
        .append(
            $("<span>")
            .attr("aria-hidden", "true")
            .append("&times;")
        )
        .click(() => {
            session.tabs.splice(index, 1);

            if (session.tabs.length) {
                sessions[sessionIndex] = session;
            } else {
                sessions.splice(sessionIndex, 1);
            }

            saveSessions()
            .then(refresh)
            .catch(e => console.error(e))

        });
        urlTableData.append(closeBtn);


        let anchor = $("<a>")
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

    sessionContainer.append(urlPanel);
}

/*
 * save sessions to local storage
 */
function saveSessions() {
    return storage.local.set({sessions});
}

/*
 * iterate over sessions and display them
 */
function outputSessions() {
    if (!sessions) {
        // TODO: display message about no sessions
        return;
    }

    sessions.forEach(outputSessionUrls);
}

/*
 * get sessions from local storage
 */
function getSavedSessions() {
    return storage.local.get();
}

/*
 * Initialize the page with any saved sessions
 */
function displaySessions() {
    getSavedSessions()
    .then(result => {
        sessions = result.sessions;
        return outputSessions();
    })
    .catch(error => console.log(error));
}

displaySessions();

// listening for this should ensure the sidebar stays up to date
tabs.onRemoved.addListener(refresh);
