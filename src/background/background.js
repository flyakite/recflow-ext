// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });

if (!chrome.runtime) {
    // Chrome 20-21
    chrome.runtime = chrome.extension;
} else if(!chrome.runtime.onMessage) {
    // Chrome 22-25
    chrome.runtime.onMessage = chrome.extension.onMessage;
    chrome.runtime.sendMessage = chrome.extension.sendMessage;
    chrome.runtime.onConnect = chrome.extension.onConnect;
    chrome.runtime.connect = chrome.extension.connect;
}



//example of using a message handler from the inject scripts
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log('request');
    console.log(request);
    console.log('sender');
  	console.log(sender);
    if(request.action == 'content-script-init'){
      contentScriptInit(request, sender, sendResponse);
    }else if(request.action == 'start-recording'){
      startRecording(request, sender, sendResponse);
    }else if(request.action == 'record-step'){
      recordStep(request, sender, sendResponse);
    }else if(request.action == 'finish-recording'){
      finishRecording(request, sender, sendResponse);

    }
  }
);

var state = {
  recording: false,
  tabId: undefined //we starts with single tab recording design
};
var recorded = {
  steps:[]
};

var contentScriptInit = function(request, sender, sendResponse) {
  var action = '';
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    //Uponn init, check if the tab is the one we want to continue recording
    if(state.recording && state.tabId && state.tabId === tabs[0].id){
      action = 'continue-recording';
      chrome.browserAction.setBadgeText({'text':'recording'});
    }
    sendResponse({action:action, state:state});
    // chrome.tabs.sendMessage(tabs[0].id, {action:action, state:state}, function(response) {
    //   console.log('responseOfContentScriptInit', response);
    // });
  });
};

var startRecording = function(request, sender, sendResponse) {
  state.recording = true;
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    state.tabId = tabs[0].id;
    chrome.tabs.reload(tabs[0].id); //refresh page to start
    //TODO: sendResponse to show recording page action icon
    // chrome.tabs.sendMessage(tabs[0].id, {action:'start-recording', state:state}, function(response) {
    //   console.log('responseOfStartRecording', response);
    // });
  });
};

var recordStep = function(request, sender, sendResponse) {

};

var finishRecording = function(request, sender, sendResponse) {
  state.recording = false;
  state.tabId = undefined;
  chrome.browserAction.setBadgeText({'text':''});
  //post to server
  
};