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

chrome.runtime.sendMessage({'action':'content-script-init'}, function(response) {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {
      clearInterval(readyStateCheckInterval);
      console.log(response);

  	}
	}, 10);
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('request', request);
  if(request.action == 'start-recording'){
    console.log('start-recording');
  }
});

var e1;
var ebody, einput;
document.body.addEventListener('click', function(e) {
  console.log('body', e);
  // if(!e1){
  //   e1 = e;
  // }else{
  //   for(var p in e){
  //     if(e1[p] !== e[p]){
  //       console.log('e1', p, e1[p]);
  //       console.log('e2', p, e[p]);
  //     }
  //   }
  // }
  ebody = e;
  if(einput){
    for(var p in ebody){
      if(ebody[p] !== einput[p]){
        console.log('ebody', p, ebody[p]);
        console.log('einput', p, einput[p]);
      }
    }
  }
});
// document.onclick = function(e) {
//   console.log('document', e);
// };
var els = document.getElementsByTagName('input');
// console.log(els);
for(var i = els.length;i--;){
  els[i].addEventListener('click', function(e) {
    console.log('self', e);
    einput = e;
    if(ebody){
      for(var p in ebody){
        if(ebody[p] !== einput[p]){
          console.log('ebody', p, ebody[p]);
          console.log('einput', p, einput[p]);
        }
      }
    }
  });
}
// var pp = document.getElementById('PROFILE_PHOTO');
// pp.addEventListener('change', function(e) {
//   console.log('pp changed');
//   console.dir(e);

//   //filereader
//   var reader = new FileReader();
//   reader.onload = function(eonload) {
//     console.log('onload', eonload.target.result);
//   };

//   reader.readAsDataURL(e.target.files[0]);

//   // canvas
//   // var canvas = document.createElement('canvas');
//   // context = canvas.getContext('2d')
//   // document.body.appendChild(canvas);
//   // var img = new Image();
//   // console.log('got image value', pp.value);
//   // img.src = pp.value;
//   // console.log('load image', img.src);
//   // img.onload = function() {
//   //   console.log('image loaded');
//   //   context.drawImage(img, 200, 200);
//   //   console.log(canvas.toDataURL('image/jpeg'));
//   // }
// })
// // clientX
// // clientY
// // offsetX
// // offsetY
// // detail(mouse click in short amount of time)
// // target
// // currentTarget
// // eventPhase(0:'none',1:'capturing',3:'propagating')


