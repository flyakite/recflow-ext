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

var recordBtn = document.getElementById('recordBtn');
var finishBtn = document.getElementById('finishBtn');

//init
chrome.runtime.sendMessage({'type':'browser-action-init'}, function(response) {
  console.log(response);
  if(response.state.recording){
    recordBtn.style = "display:none";
  }else{
    finishBtn.style = "display:none";
  }
});


recordBtn.addEventListener('click', function() {
  chrome.runtime.sendMessage({'type':'start-recording'}, function(response) {
    console.log('sendMessage');
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


var i18n_init = function(){
  document.getElementById('recordBtn').innerHTML = chrome.i18n.getMessage('recordBtn');
  document.getElementById('finishBtn').innerHTML = chrome.i18n.getMessage('finishBtn');
  document.getElementById('authenticationWarning').innerHTML = chrome.i18n.getMessage('authenticationWarning');
  document.getElementById('recordIntroduction').innerHTML = chrome.i18n.getMessage('recordIntroduction');
  
  // chrome.i18n.getMessage()
};
i18n_init();