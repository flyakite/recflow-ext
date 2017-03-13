chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log('sender', sender, 'request', request);
    if(request.type == 'steps'){
      showSteps(request.steps, {request:request, sender:sender, sendResponse:sendResponse});
    }
  }
);

chrome.runtime.sendMessage({'type':'panel-init'}, function(response) {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
      clearInterval(readyStateCheckInterval);
      init({backgroundResponse:response});
    }
  }, 10);
});


var init = function(settings) {
  console.log('init recflow');
  if(settings && settings.backgroundResponse){
    console.log(settings.backgroundResponse.state);
    var state = settings.backgroundResponse.state;
    if(state.recording){
      document.getElementById('status-bar').innerHTML = 'Recording';
      document.getElementById('status-helper').className = '';
    }else{
      document.getElementById('status-bar').innerHTML = 'Idle';
    }
    var steps = settings.backgroundResponse.steps;
    if(steps && steps.length != 0){
      showSteps(steps);
    }
  }
};

var stepTypeText = {
  sendKeys: 'Send Keys',
  mousedown: 'Mouse Down',
  mouseup: 'Mouse Up',
  click: 'Click',
  select: 'Select'
};

var stepTargetToText = function(target){
  var text = "";
  if(typeof target.tag !== 'undefined' && target.tag !== ""){
    text += target.tag;
  }
  if(typeof target.id !== 'undefined' && target.id !== ""){
    text += '#' + target.id;
  }else if(typeof target.xpath !== 'undefined' && target.xpath !== ""){
    text += '(' + target.xpath + ')';
  }else if(typeof target.class_name !== 'undefined' && target.class_name !== ""){
    text += '.' + target.class_name.split(' ').join('.');
  }
  if(typeof target.text !== 'undefined' && target.text !== ""){
    text += ' ' + target.text;
  }
  return text
};

var stepValueToText = function(value){
  var text = "";
  if(typeof value !== 'undefined'){
    text = value;
  }
  return text;
};

var stepToHTML = function(step){
  return "<div class='step'>" + 
   "<div class='wait-before'> wait for " + 0.001 * parseInt(step.wait_before, 10) + " seconds </div>" +
   "<div class='step-main'>" +
   "<span class='step-type'>" + stepTypeText[step.type] + "</span>" +
   "<span class='step-value'>" + stepValueToText(step.value) + "</span>" +
   "<span class='step-target'>" + stepTargetToText(step.target) + "</span>" +
   "<div class='start-url'>" + step.start_url + "</div>" +
   "</div>" +
   "</div>";
};

var showSteps = function(steps, options){
  console.log('showSteps', options);
  var stepsHTML = '';
  for(var i=0; i<steps.length; i++){
    stepsHTML += stepToHTML(steps[i]);
  }
  document.getElementById('finish-recording').disabled = false;
  document.getElementById('steps-section').innerHTML = stepsHTML;
};

document.getElementById('finish-recording').addEventListener('click', function(e){
  document.getElementById('status-bar').innerHTML = 'Finished';
  chrome.runtime.sendMessage({'type':'finish-recording'}, function(response) {
    console.log(response);
  });
  return false;
});

