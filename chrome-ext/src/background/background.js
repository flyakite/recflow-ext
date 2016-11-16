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
chrome.browserAction.setBadgeText({'text':''});

var recordStartTime;
var contentScriptInit = function(request, sender, sendResponse) {
  var type = '';
  //Uponn init, check if the tab is the one we want to continue recording
  if(state.recording && state.tabId && state.tabId === sender.tab.id){
    type = 'continue-recording';
    chrome.browserAction.setBadgeText({'text':'recording'});
    chrome.browserAction.setBadgeBackgroundColor({color:'#ff0000'});
    recordStartTime = (new Date()).getTime();
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

var lastRecoredStepTime;
var recordStep = function(request, sender, sendResponse) {
  var command = request.data;
  var step, waitFor;
  if(recorded.steps.length === 0){
    lastRecoredStepTime = recordStartTime
  }
  commandTime = command.time || (new Date()).getTime();
  waitBefore = commandTime - lastRecoredStepTime;
  console.log('waitBefore', waitBefore);
  lastRecoredStepTime = commandTime;
  if(command.cmd === 'sendKeys'){
    if(recorded.steps.length === 0 || 
      (recorded.steps[recorded.steps.length-1] && recorded.steps[recorded.steps.length-1].type !== 'sendKeys') ||
      (recorded.steps[recorded.steps.length-1].start_url !== sender.url) ||
      (recorded.steps[recorded.steps.length-1].keys.substr(0,7) == '!@Keys.') ||
      (command.data.keys.substr(0,7) == '!@Keys.')
      ){
      step = {
        wait_before: waitBefore,
        start_url: sender.url,
        type: 'sendKeys',
        keys: command.data.keys,
      };
      recorded.steps.push(step);
    }
    else{
      recorded.steps[recorded.steps.length-1].keys += command.data.keys
    }
  }else if(command.cmd.toLowerCase() == 'mousedown'){
    step = {
      wait_before: waitBefore,
      start_url: sender.url,
      type: 'mousedown',
      target: {
        tag: command.data.tag,
        id: command.data.id,
        class_name: command.data.class_name,
        text: command.data.text,
        xpath: command.data.path
      }
    };
    recorded.steps.push(step);
  }else if(command.cmd.toLowerCase() == 'mouseup'){
    lastCommand = recorded.steps[recorded.steps.length-1];
    if(waitBefore < 500 && 
      lastCommand && 
      lastCommand.type == 'mousedown' &&
      (lastCommand.target.id == command.data.id || 
      lastCommand.target.path == command.data.path)){
      
      recorded.steps[recorded.steps.length-1].type = 'click';
    }
  }
  console.log(recorded.steps[recorded.steps.length-1]);
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
