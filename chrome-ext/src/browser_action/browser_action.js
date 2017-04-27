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

var recordMobileBtn = document.getElementById('recordMobileBtn');
var recordDesktopBtn = document.getElementById('recordDesktopBtn');
var finishBtn = document.getElementById('finishBtn');
var cancelBtn = document.getElementById('cancelBtn');

//init
chrome.runtime.sendMessage({'type':'browser-action-init'}, function(response) {
  console.log(response);
  if(response.state.recording){
    recordMobileBtn.style = "display:none";
    recordDesktopBtn.style = "display:none";
  }else{
    finishBtn.style = "display:none";
    cancelBtn.style = "display:none";
  }
});


recordMobileBtn.addEventListener('click', function() {
  chrome.runtime.sendMessage({'type':'start-recording', 'deviceType':'mobile'}, function(response) {
    console.log(response);
  });
  window.close();
});

recordDesktopBtn.addEventListener('click', function() {
  chrome.runtime.sendMessage({'type':'start-recording', 'deviceType':'desktop'}, function(response) {
    console.log(response);
  });
  window.close();
});

finishBtn.addEventListener('click', function() {
  chrome.runtime.sendMessage({'type':'finish-recording'}, function(response) {
    console.log('sendMessage');
    console.log(response);
  })
  window.close();
});

cancelBtn.addEventListener('click', function(){
  chrome.runtime.sendMessage({'type':'cancel-recording'}, function(response) {
    console.log('sendMessage');
    console.log(response);
  })
  window.close();
})

var i18n_init = function(){
  document.getElementById('recordMobileBtn').innerHTML = chrome.i18n.getMessage('recordMobileBtn');
  document.getElementById('recordDesktopBtn').innerHTML = chrome.i18n.getMessage('recordDesktopBtn');
  document.getElementById('finishBtn').innerHTML = chrome.i18n.getMessage('finishBtn');
  document.getElementById('cancelBtn').innerHTML = chrome.i18n.getMessage('cancelBtn');
  document.getElementById('authenticationWarning').innerHTML = chrome.i18n.getMessage('authenticationWarning');
  document.getElementById('recordIntroduction').innerHTML = chrome.i18n.getMessage('recordIntroduction');
  
  // chrome.i18n.getMessage()
};
i18n_init();