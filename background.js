// background.js - v4.0 with Job Title, Company Name, Website URL support
const DEFAULT_STATE = {
    sites: [],
    currentIndex: 0,
    status: 'idle',
    log: [],
    userCredentials: {
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        zipCode: '',
        customMessage: '',
        jobTitle: '',
        companyName: '',
        websiteUrl: '',
    },
    processingTabId: null,
    siteTimeout: 15000,
    enableScrolling: true,
    processingUrl: null,
    isPaused: false,
};

let state = { ...DEFAULT_STATE };
let processingTimeout = null;
let tabUpdatedListener = null;

async function loadStateFromStorage() {
    const storedState = await chrome.storage.local.get(['extensionState']);
    if (storedState.extensionState) {
        state = { ...state, ...storedState.extensionState };
        if (!state.userCredentials) state.userCredentials = { ...DEFAULT_STATE.userCredentials };
        if (state.userCredentials.jobTitle === undefined) state.userCredentials.jobTitle = '';
        if (state.userCredentials.companyName === undefined) state.userCredentials.companyName = '';
        if (state.userCredentials.websiteUrl === undefined) state.userCredentials.websiteUrl = '';
        console.log('State loaded from storage.');
    }
}

function saveStateToStorage() {
    chrome.storage.local.set({ extensionState: state }).catch(err => console.error("Error saving state:", err));
}

function updateStateAndNotify(changes) {
    Object.assign(state, changes);
    saveStateToStorage();
    chrome.runtime.sendMessage({ action: "UPDATE_UI", payload: state }).catch(() => {});
}

function addLog(message, type = 'info') {
    state.log.unshift({ message, type, timestamp: new Date().toLocaleTimeString() });
    if (state.log.length > 100) state.log.pop();
    updateStateAndNotify({});
}

function closeProcessingTab() {
    if (tabUpdatedListener) {
        chrome.tabs.onUpdated.removeListener(tabUpdatedListener);
        tabUpdatedListener = null;
    }
    if (state.processingTabId !== null) {
        chrome.tabs.remove(state.processingTabId).catch(() => {});
        state.processingTabId = null;
    }
    if (processingTimeout) {
        clearTimeout(processingTimeout);
        processingTimeout = null;
    }
    state.processingUrl = null;
}

async function processNextSite() {
    if (state.status === 'paused') return;
    if (state.status !== 'running') return;

    if (state.currentIndex >= state.sites.length) {
        addLog('All sites have been processed.', 'success');
        updateStateAndNotify({ status: 'completed' });
        closeProcessingTab();
        return;
    }

    const url = state.sites[state.currentIndex];

    if (state.processingUrl === url) {
        console.log('URL already being processed, skipping:', url);
        moveToNextSite();
        return;
    }

    state.processingUrl = url;
    addLog(`(${state.currentIndex + 1}/${state.sites.length}) Processing: ${url}`, 'info');
    updateStateAndNotify({});

    chrome.tabs.create({ url: url, active: false }, (tab) => {
        if (!tab || !tab.id) {
            addLog(`Error creating tab for ${url}`, 'error');
            moveToNextSite();
            return;
        }

        state.processingTabId = tab.id;

        processingTimeout = setTimeout(() => {
            addLog(`Timeout for ${url} after ${state.siteTimeout/1000}s, moving to next site.`, 'warning');
            moveToNextSite();
        }, state.siteTimeout);

        tabUpdatedListener = (tabId, changeInfo, tab) => {
            if (tabId === state.processingTabId && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(tabUpdatedListener);
                tabUpdatedListener = null;

                if (tab && tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('about:'))) {
                    addLog(`Tab showing error page: ${tab.url}`, 'error');
                    moveToNextSite();
                    return;
                }

                setTimeout(() => {
                    if (state.status !== 'running') return;

                    chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['content.js'] }, () => {
                        if (chrome.runtime.lastError) {
                            addLog(`Error injecting script: ${chrome.runtime.lastError.message}`, 'error');
                            moveToNextSite();
                        } else {
                            if (processingTimeout) {
                                clearTimeout(processingTimeout);
                                processingTimeout = setTimeout(() => {
                                    addLog(`Form processing timeout for ${url}, moving to next site.`, 'warning');
                                    moveToNextSite();
                                }, 12000);
                            }

                            chrome.tabs.sendMessage(tabId, {
                                action: "AUTOFILL_FORM",
                                data: state.userCredentials,
                                enableScrolling: state.enableScrolling
                            });
                        }
                    });
                }, 5000);
            }
        };

        chrome.tabs.onUpdated.addListener(tabUpdatedListener);
    });
}

function moveToNextSite() {
    closeProcessingTab();
    state.currentIndex++;
    updateStateAndNotify({});
    setTimeout(() => {
        processNextSite();
    }, 3000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        switch (request.action) {
            case "GET_STATE":
                sendResponse(state);
                break;
            case "SAVE_CREDENTIALS":
                state.userCredentials = { ...DEFAULT_STATE.userCredentials, ...request.data };
                saveStateToStorage();
                sendResponse({ success: true });
                break;
            case "CLEAR_STATE":
                state = { ...DEFAULT_STATE };
                saveStateToStorage();
                closeProcessingTab();
                sendResponse({ success: true });
                break;
            case "UPDATE_TIMEOUT":
                if (request.timeout && request.timeout >= 5000) {
                    state.siteTimeout = request.timeout;
                    saveStateToStorage();
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: 'Timeout must be at least 5000ms' });
                }
                break;
            case "UPDATE_SCROLL_SETTING":
                state.enableScrolling = request.enableScrolling;
                saveStateToStorage();
                sendResponse({ success: true });
                break;
            case "START_PROCESSING":
                if (state.status === 'running' || state.status === 'paused') {
                    sendResponse({ error: "Already processing or paused." });
                    return;
                }
                state.sites = request.sites.map(url => url.startsWith('http') ? url : 'https://' + url);
                state.userCredentials = { ...DEFAULT_STATE.userCredentials, ...request.data };
                state.enableScrolling = request.enableScrolling !== undefined ? request.enableScrolling : state.enableScrolling;
                state.currentIndex = 0;
                state.processingUrl = null;
                state.isPaused = false;
                state.log = [];
                addLog('Process started.', 'success');
                updateStateAndNotify({ status: 'running' });
                processNextSite();
                sendResponse({ success: true });
                break;
            case "PAUSE_PROCESSING":
                if (state.status === 'running') {
                    state.isPaused = true;
                    addLog('Process paused.', 'warning');
                    updateStateAndNotify({ status: 'paused' });
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: "Not currently running" });
                }
                break;
            case "STOP_PROCESSING":
                if (state.status !== 'idle' && state.status !== 'stopped') {
                    addLog('Process stopped by user.', 'error');
                    updateStateAndNotify({ status: 'stopped', currentIndex: 0, sites: [], processingUrl: null, isPaused: false });
                    closeProcessingTab();
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: "Not currently running" });
                }
                break;
            case "RESUME_PROCESSING":
                if (state.status === 'paused') {
                    state.isPaused = false;
                    addLog('Process resumed.', 'success');
                    updateStateAndNotify({ status: 'running' });
                    processNextSite();
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: "Not currently paused" });
                }
                break;
        }
    } catch (e) {
        console.error('Error handling message:', e);
        sendResponse({ success: false, error: e.message });
    }
    return true;
});

loadStateFromStorage();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === "SCRIPT_COMPLETE") {
            const { status, message } = request;
            addLog(`Result for ${sender.tab ? sender.tab.url : 'unknown'}: ${message}`, status);
            moveToNextSite();
        }
    } catch (e) {
        console.error('Error handling content script message:', e);
    }
});