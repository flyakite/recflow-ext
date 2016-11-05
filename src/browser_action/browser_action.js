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

var recordBtn = document.getElementById('record-btn');
var finishBtn = document.getElementById('finish-btn');
recordBtn.innerHTML = chrome.i18n.getMessage('recordBtnText');
finishBtn.innerHTML = chrome.i18n.getMessage('finishBtnText');

recordBtn.addEventListener('click', function() {
  chrome.runtime.sendMessage({'action':'start-recording'}, function(response) {
    console.log('sendMessage');
    console.log(response);
  })
  window.close();
});

finishBtn.addEventListener('click', function() {
  chrome.runtime.sendMessage({'action':'finish-recording'}, function(response) {
    console.log('sendMessage');
    console.log(response);
  })
  window.close();
});