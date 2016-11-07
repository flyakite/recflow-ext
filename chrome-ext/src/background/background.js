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
    console.log('sender', sender, 'request', request);
    if(request.type == 'content-script-init'){
      contentScriptInit(request, sender, sendResponse);
    }else if(request.type == 'start-recording'){
      startRecording(request, sender, sendResponse);
    }else if(request.type == 'command'){
      recordStep(request, sender, sendResponse);
    }else if(request.type == 'finish-recording'){
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
  var type = '';
  //Uponn init, check if the tab is the one we want to continue recording
  if(state.recording && state.tabId && state.tabId === sender.tab.id){
    type = 'continue-recording';
    chrome.browserAction.setBadgeText({'text':'recording'});
    chrome.browserAction.setBadgeBackgroundColor({color:'#ff0000'});
  }else{
    type = 'initialized';
  }
  sendResponse({type:type, state:state});
  // chrome.tabs.sendMessage(tabs[0].id, {type:type, state:state}, function(response) {
  //   console.log('responseOfContentScriptInit', response);
  // });
};

var startRecording = function(request, sender, sendResponse) {
  state.recording = true;
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    console.log('tabs[0]');
    console.log(tabs[0]);
    state.tabId = tabs[0].id;
    chrome.tabs.reload(tabs[0].id); //refresh page to start
    //TODO: sendResponse to show recording page type icon
    // chrome.tabs.sendMessage(tabs[0].id, {type:'start-recording', state:state}, function(response) {
    //   console.log('responseOfStartRecording', response);
    // });
  });
};

var recordStep = function(request, sender, sendResponse) {
  var command = request.data;
  var step;
  if(command.cmd === 'sendKeys'){
    if(recorded.steps.length == 0 || recorded.steps[-1].type !== 'sendKeys'){
      step = {
        keys: command.data.keys,
      }
    }
    else{
      recorded.steps[-1].keys += command.data.keys
    }
  }
};

var finishRecording = function(request, sender, sendResponse) {
  state.recording = false;
  chrome.browserAction.setBadgeText({'text':''});
  if(state.tabId){
    chrome.tabs.sendMessage(state.tabId, {type:'finish-recording', state:state}, function(response) {
      console.log('responseOfFinishRecording', response);
    });
  }
  state.tabId = undefined;
  //post to server
};
