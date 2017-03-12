// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });

var SERVER_FULL_PATH = 'http://console.recflow.com';

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
    if(request.type == 'browser-action-init'){
      browserActionInit(request, sender, sendResponse);
    }else if(request.type == 'content-script-init'){
      contentScriptInit(request, sender, sendResponse);
    }else if(request.type == 'panel-init'){
      panelInit(request, sender, sendResponse);
    }else if(request.type == 'start-recording'){
      startRecording(request, sender, sendResponse);
    }else if(request.type == 'command'){
      recordStep(request, sender, sendResponse);
    }else if(request.type == 'finish-recording'){
      finishRecording(request, sender, sendResponse);
    }else if(request.type == 'cancel-recording'){
      cancelRecording(request, sender, sendResponse);
    }else{
      console.log('unknown request.type:' + request.type);
    }
  }
);

var MOBILE_INFO = {
  iphonex:{
    width: 375,
    height: 667,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/603.1.23 (KHTML, like Gecko) Version/10.0 Mobile/14E5239e Safari/602.1"
  }
};

var state = {
  recording: false,
  // tabId: undefined,
  recordingTabIDs: [],
  panelWindowID: undefined,
  panelTabID: undefined,
  origWindowSize: undefined
};
var recorded = {
  start_url:'',
  actions:[]
};
chrome.browserAction.setBadgeText({'text':''});


var browserActionInit = function(request, sender, sendResponse) {
  sendResponse({state:state});
};

var panelInit = function(request, sender, sendResponse) {
  state.panelTabID = sender.tab.id;
  sendResponse({state:state});
};

var recordStartTime;
var contentScriptInit = function(request, sender, sendResponse) {
  var type = '';
  //Upon init, check if the tab is the one we want to continue recording (deprecated)
  // if(state.recording && state.tabId && state.tabId === sender.tab.id){
  if(state.recording){
    type = 'continue-recording';
    chrome.browserAction.setBadgeText({'text':'Record'});
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
    state.recordingTabIDs.push(tabs[0].id);
    chrome.tabs.reload(tabs[0].id); //refresh page to start
    //TODO: sendResponse to show recording page type icon
    // chrome.tabs.sendMessage(tabs[0].id, {type:'start-recording', state:state}, function(response) {
    //   console.log('responseOfStartRecording', response);
    // });
  });
  saveWindowSize();
  setMobileWindowSize(MOBILE_INFO.iphonex);
  createPanel();
};

var lastRecoredStepTime;
var recordStep = function(request, sender, sendResponse) {
  var command = request.data;
  var step, waitFor;
  if(recorded.actions.length === 0){
    lastRecoredStepTime = recordStartTime
  }
  commandTime = command.time || (new Date()).getTime();
  waitBefore = commandTime - lastRecoredStepTime;
  console.log('waitBefore', waitBefore);
  lastRecoredStepTime = commandTime;
  if(command.cmd === 'sendKeys'){
    if(recorded.actions.length === 0 || 
      (recorded.actions[recorded.actions.length-1] && recorded.actions[recorded.actions.length-1].type !== 'sendKeys') ||
      (recorded.actions[recorded.actions.length-1].start_url !== sender.url) ||
      (recorded.actions[recorded.actions.length-1].value && recorded.actions[recorded.actions.length-1].value.substr(0,7) == '!@Keys.') ||
      (command.data.keys.substr(0,7) == '!@Keys.')
      ){
      step = {
        wait_before: waitBefore,
        start_url: sender.url,
        type: 'sendKeys',
        value: command.data.keys,
        target: {
          tag: command.data.tag,
          id: command.data.id,
          class_name: command.data.class_name,
          text: command.data.text,
          xpath: command.data.path
        }
      };
      recorded.actions.push(step);
    }
    else{
      recorded.actions[recorded.actions.length-1].value += command.data.keys
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
    recorded.actions.push(step);
  }else if(command.cmd.toLowerCase() == 'mouseup'){
    step = recorded.actions[recorded.actions.length-1];
    if(waitBefore < 500 && 
      step && 
      step.type == 'mousedown' &&
      (step.target.id == command.data.id || 
      step.target.path == command.data.path)){
      
      recorded.actions[recorded.actions.length-1].type = 'click';
    }
  }else if(command.cmd.toLowerCase() == 'select'){
    step = {
      wait_before: waitBefore,
      start_url: sender.url,
      type: 'select',
      value: command.data.value,
      target: {
        tag: command.data.tag,
        id: command.data.id,
        class_name: command.data.class_name,
        text: command.data.text,
        xpath: command.data.path,
      }
    };
    recorded.actions.push(step);
  }else if(command.cmd.toLowerCase() == 'filechange'){
    //file change, file upload is not supported
    // step = {
    //   wait_before: waitBefore,
    //   start_url: sender.url,
    //   type: 'file_change',
    //   target: {
    //     tag: command.data.tag,
    //     id: command.data.id,
    //     class_name: command.data.class_name,
    //     text: command.data.text,
    //     xpath: command.data.path,
    //     value: command.data.value
    //   }
    // };
    // recorded.actions.push(step);
  }

  sendStepsToPanel(recorded.actions, state);
  console.log(recorded.actions[recorded.actions.length-1]);
};

var cancelRecording = function(request, sender, sendResponse) {
  console.log('cancelRecording');
  chrome.browserAction.setBadgeText({'text':''});
  for(var i=state.recordingTabIDs.length;i--;){
    chrome.tabs.sendMessage(state.recordingTabIDs[i], {type:'cancel-recording', state:state}, function(response) {
      console.log('responseOfCancelRecording', response);
    });
  }
  state.recordingTabIDs = [];
  recorded.start_url = '';
  recorded.actions = [];
  restoreWindowSize();
};
var finishRecording = function(request, sender, sendResponse) {
  console.log('finishRecording');
  console.log(recorded);
  //TODO: if no recorded actions
  recorded.start_url = recorded.actions[0].start_url;
  state.recording = false;
  chrome.browserAction.setBadgeText({'text':''});
  for(var i=state.recordingTabIDs.length;i--;){
    chrome.tabs.sendMessage(state.recordingTabIDs[i], {type:'finish-recording', state:state}, function(response) {
      console.log('responseOfFinishRecording', response);
    });
  }
  state.recordingTabIDs = [];
  //remove panel
  deletePanel();
  //post to server
  var url = SERVER_FULL_PATH + '/api/test-scenario';
  postToServer(url, {
    'record': JSON.stringify(recorded)
  }, function(response) {
    console.log(response.status);
    if(response.status == 200){
      console.log(response.data);
      var data = JSON.parse(response.data);
      if(data['test-scenario']){
        var sid = data['test-scenario'].sid;
        window.open(SERVER_FULL_PATH + '/prototype/record-test-case?sid=' + sid);
      }else{
        console.error('no test scenario');
        //TODO
      }
    }else{
      console.error(response);
      //TODO
    }
  });
  recorded.start_url = '';
  recorded.actions = [];
  restoreWindowSize();
};

var postToServer = function(url, params, callback) {
  var xhr = new XMLHttpRequest();
  var params_string = '';
  for(var k in params){
    if(params_string != "") params_string += "&";
    params_string += k + "=" + encodeURIComponent(params[k]);
  }
  console.log('posting to ' + url);
  console.log(params_string);
  xhr.open('POST', url, true);
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhr.onreadystatechange = function() {//Call a function when the state changes.
    if(xhr.readyState == 4) {
      callback({status:xhr.status, data:xhr.responseText});
    }
  };
  xhr.send(params_string);
};


//when recording, change User Agent
chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    if(state.recording){
      var userAgentString = MOBILE_INFO.iphonex.ua;
      for (var i = 0; i < details.requestHeaders.length; ++i) {
        if (details.requestHeaders[i].name === 'User-Agent') {
          // console.log(details.requestHeaders[i])
          details.requestHeaders[i].value = userAgentString;
          // console.log(details.requestHeaders[i].value);
          break;
        }
      }
    }
    return {requestHeaders: details.requestHeaders};
  },
  {urls: ["<all_urls>"]},
  ["requestHeaders"]);

var saveWindowSize = function(){
  chrome.windows.getLastFocused({populate: false}, //getCurrent
    function(currentWindow){ 
      state.origWindowSize = {
        left: currentWindow.left,
        top: currentWindow.top,
        width: currentWindow.width,
        height: currentWindow.height
      };
    });
};

var restoreWindowSize = function(){
  chrome.windows.getLastFocused({populate: false}, //getCurrent
    function(currentWindow){ 
      chrome.windows.update(currentWindow.id, state.origWindowSize);
    });
};
var setWindowSize = function(left, top, width, height) {
  chrome.windows.getLastFocused({populate: false}, //getCurrent
    function(currentWindow){ 
      chrome.windows.update(currentWindow.id, {
        left:left,
        top:top,
        width:width,
        height:height
      });
    });
};
var setMobileWindowSize = function(device){
  var maxWidth = window.screen.availWidth;
  var maxHeight = window.screen.availHeight;
  var left = Math.round((maxWidth - device.width)/2);
  var top = 0; //Math.round((maxHeight - device.height)/2);
  setWindowSize(left, top, device.width, device.height);
};

var createPanel = function(){
  chrome.windows.create({
    url: chrome.extension.getURL('src/background/panel.html'),
    left: 0,
    top: 0,
    width: 400,
    height: window.screen.availHeight,
    focused: false,
    // type: "popup"
  }, function(panelWindow){
    state.panelWindowID = panelWindow.id;
  });
};

var deletePanel = function(){
  chrome.windows.remove(state.panelWindowID);
};

var sendStepsToPanel = function(steps, state){
  //{type:'command', steps:recorded.actions, state:state}
  chrome.tabs.sendMessage(state.panelTabID, {type:'steps', steps:steps, state:state}, function(response) {
    console.log('command sent to panel');
  });
};