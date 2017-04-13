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
    // if(state.recording){
    //   document.getElementById('status-bar').innerHTML = 'Recording';
    //   document.getElementById('status-helper').className = '';
    // }else{
    //   document.getElementById('status-bar').innerHTML = 'Idle';
    // }
    // var steps = settings.backgroundResponse.steps;
    // if(steps && steps.length != 0){
    //   showSteps(steps);
    // }
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

// var stepToHTML = function(step){
//   return "<div class='step'>" + 
//    "<div class='wait-before'> wait for " + 0.001 * parseInt(step.wait_before, 10) + " seconds </div>" +
//    "<div class='step-main'>" +
//    "<span class='step-type'>" + stepTypeText[step.type] + "</span>" +
//    "<span class='step-value'>" + stepValueToText(step.value) + "</span>" +
//    "<span class='step-target'>" + stepTargetToText(step.target) + "</span>" +
//    "<div class='start-url'>" + step.start_url + "</div>" +
//    "</div>" +
//    "</div>";
// };

var showSteps = function(steps, options){
  console.log('showSteps', options);
  if(!panelApp.recordingFinished){
    panelApp.rewriteSteps(steps);
  }
  // var stepsHTML = '';
  // for(var i=0; i<steps.length; i++){
  //   stepsHTML += stepToHTML(steps[i]);
  // }
  // document.getElementById('finish-recording').disabled = false;
  // document.getElementById('steps-section').innerHTML = stepsHTML;
};

// document.getElementById('finish-recording').addEventListener('click', function(e){
//   document.getElementById('status-bar').innerHTML = 'Finished';
//   chrome.runtime.sendMessage({'type':'finish-recording'}, function(response) {
//     console.log(response);
//   });
//   return false;
// });

var panelApp = new Vue({
  el: '#panel-app',
  data: {
    steps: [],
    statusAction: 'Recording',
    recordingFinished: false
  },
  computed:{
    ok: function() {
      console.log(steps.length);
      return steps.length
    }
  },
  methods:{
    rewriteSteps: function(steps){
      for(var i=steps.length;i--;){
        if(steps[i].wait_before){
          steps[i].wait_before_seconds = steps[i].wait_before / 1000.0;
        }
      }
      this.steps = steps;
    },
    removeStep: function(step) {
      this.steps.splice(this.steps.indexOf(step), 1);
    },
    finishRecording: function(event) {
      this.recordingFinished = true;
      this.statusAction = 'Editing';
    },
    finishEditing: function(event){
      var steps = this.steps;
      for(var i=steps.length;i--;){
        if(typeof(steps[i].wait_before_seconds) != 'undefined'){
          steps[i].wait_before = Math.round(steps[i].wait_before_seconds * 1000);
        }
      }
      chrome.runtime.sendMessage({'type':'finish-recording', steps:steps}, function(response) {
        console.log(response);
      });
    }
  },
  filters:{
    stepTypeToText: function(value){
      if(stepTypeText.hasOwnProperty(value)){
        return stepTypeText[value]
      }else{
        return ''
      }
    },
    stepValueToText: function(value){
      var text = "";
      if(typeof value !== 'undefined'){
        text = value;
      }
      return text
    },
    stepTargetToText: function(target){
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
    }
  }
});

// panelApp.$mount('#panel-app');
panelApp.steps = [{
  start_url: "https://vuejs.org/v2/guide/installation.html#CSP-environments",
  target: {
    tag: "A",
    text: "Browserify + vueify",
    xpath: "#main p:nth-child(54) > a:nth-child(2)",
  },
  type: "click",
  wait_before: 49730,
  wait_before_seconds: 49
}];
