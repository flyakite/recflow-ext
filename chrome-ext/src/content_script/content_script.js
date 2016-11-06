// https://github.com/alibaba/uirecorder
(function(){
  // var EventRecorder = require('event-recorder');
  var isIframe = self !== top;
  var isRecording = false;
  var isStopEvent = false;

  var arrPathAttrs = ['data-id', 'data-name', 'type', 'data-type', 'data-role', 'data-value'];

  var reHoverClass = /(^|[^a-z0-9])(on)?(hover|over|active|current)([^a-z0-9]|$)/i;

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

  chrome.runtime.sendMessage({'type':'content-script-init'}, function(response) {
    console.log('response', response);
    var readyStateCheckInterval = setInterval(function() {
      if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        console.log(response);
        init({backgroundResponse:response});
    	}
  	}, 10);
  });

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('request', request);
    if(request.type == 'finish-recording'){
    }
  });

  var init = function(settings) {
    console.log('init');
    if(settings && settings.backgroundResponse){
      if(settings.backgroundResponse.type === 'continue-recording'){
        startRecording();
      }
    }
  };


  var startRecording = function(options) {
    console.log('start-recording');
    isRecording = true;
    addEventListeners();

  };


  var addEventListeners = function(options) {
    console.log('addEventListeners');
    document.addEventListener('mousedown', function(event){
      console.log('mousedown');
      var target = event.target;
      if(isRecording){
        if(/^(html|select|optgroup|option)$/i.test(target.tagName) === false && isFileInput(target) === false){
          console.log(target.tagName);
          var labelTarget = getLabelTarget(target);
          if(labelTarget){
            target = labelTarget;
          }
          saveParentsOffset(target);
          var path = getDomPath(target);
          if(path !== null){
            var offset = target.getBoundingClientRect();
            var x,y;
            if(labelTarget){
              x = Math.floor(offset.width / 2);
              y = Math.floor(offset.height / 2);
            }
            else{
              x = event.clientX-offset.left;
              y = event.clientY-offset.top;
            }
            // GlobalEvents.emit('showDomPath', path);
            saveCommand('mouseDown', {
              path: path,
              x: x,
              y: y,
              button: event.button,
              text: getTargetText(target)
            });
          }
        }
      }
      else if(isStopEvent){
        event.stopPropagation();
        event.preventDefault();
      }
    }, true);

    document.addEventListener('mouseup', function(event){
      var target = event.target;
      if(isRecording){
        var tagName = target.tagName;
        if(/^(html|select|optgroup|option)$/i.test(tagName) === false && isFileInput(target) === false){
          // get offset of the fixed parent
          var labelTarget = getLabelTarget(target);
          if(labelTarget){
            target = labelTarget;
          }
          var fixedParent = getFixedParent(target);
          if(fixedParent !== null){
            var offset = target.getBoundingClientRect();
            var x,y;
            if(labelTarget){
              x = Math.floor(offset.width / 2);
              y = Math.floor(offset.height / 2);
            }
            else{
              x = event.clientX-fixedParent.left;
              y = event.clientY-fixedParent.top;
            }
            // GlobalEvents.emit('showDomPath', fixedParent.path);
            saveCommand('mouseUp', {
              path: fixedParent.path,
              x: x,
              y: y,
              button: event.button,
              text: getTargetText(target)
            });
          }
        }
      }
      else if(isStopEvent){
        event.stopPropagation();
        event.preventDefault();
      }
    }, true);

    document.addEventListener('keypress', function(event){
      var target = event.target;
      if(/^(HTML|IFRAME)$/i.test(target.tagName) === false){
        if(isRecording){
          var typedCharacter = String.fromCharCode(event.keyCode);
          if(typedCharacter !== '' && /[\r\n]/.test(typedCharacter) === false){
            saveCommand('sendKeys', {
              keys: typedCharacter
            });
          }
        }
        else if(isStopEvent){
          event.stopPropagation();
          event.preventDefault();
        }
      }
    }, true);

    document.addEventListener('compositionend', function(event){
      var target = event.target;
      if(isNotInToolsPannel(target)){
        if(isRecording){
          saveCommand('sendKeys', {
            keys:event.data
          });
        }
        else if(isStopEvent){
          event.stopPropagation();
          event.preventDefault();
        }
      }
    }, true);

    document.addEventListener('change', function(event){
      var target = event.target;
      if(isRecording){
        if(isFileInput(target)){
          var path = getDomPath(target);
          var filepath = target.value || '';
          var match = filepath.match(/[^\\\/]+$/);
          if(path !== null && match !== null){
            // GlobalEvents.emit('showDomPath', path);
            saveCommand('uploadFile', {
              path: path,
              filename: match[0],
              text: getTargetText(target)
            });
          }
        }
        else if(target.tagName === 'SELECT'){
          if(isDomVisible(target)){
            // no record invisible select
            var path = getDomPath(target);
            if(path !== null){
              var index = target.selectedIndex;
              var option = target.options[index];
              var value = option.getAttribute('value');
              var type;
              if(value){
                type = 'value';
              }
              else{
                type = 'index';
                value = index;
              }
              // GlobalEvents.emit('showDomPath', path);
              saveCommand('select', {
                path: path,
                type: type,
                value: value,
                text: getTargetText(target)
              });
            }
          }
        }
      }
      else if(isStopEvent){
        event.stopPropagation();
        event.preventDefault();
      }
    }, true);
  };


  function isFileInput(target){
    return target.tagName === 'INPUT' && target.getAttribute('type') === 'file';
  }
  function saveCommand(cmd, data){
    var frameId = getFrameId();
    var cmdData = {
      frame: frameId,
      cmd: cmd,
      data: data
    };
    if(typeof frameId === 'number'){
      parent.postMessage({
        type: 'uiRecorderFrameCommmand',
        data: cmdData
      }, '*');
    }
    else{
      chrome.runtime.sendMessage({
        type: 'command',
        data: cmdData
      });
    }
  }

  //get iframe id
  function getFrameId(){
    var frame = null;
    if(isIframe){
      try{
        var frameElement = window.frameElement;
        if(frameElement !== null){
          frame = getDomPath(frameElement);
        }
        else{
          var parentFrames = parent.frames;
          for(var i=0,len=parentFrames.length;i<len;i++){
            if(parentFrames[i] === window){
              frame = i;
              break;
            }
          }
        }
      }
      catch(e){}
    }
    return frame;
  }

  var mapParentsOffset = {};
  function saveParentsOffset(target){
    var documentElement = document.documentElement;
    mapParentsOffset = {};
    while(target !== null){
      var nodeName = target.nodeName.toLowerCase();
      var path = getDomPath(target);
      var rect = target.getBoundingClientRect();
      mapParentsOffset[path] = {
        left: rect.left,
        top: rect.top
      };
      if(nodeName === 'html'){
        target = null;
      }
      else{
        target = target.parentNode;
      }
    }
  }

  function getTargetText(target){
    var nodeName = target.nodeName;
    var id = target.getAttribute('id');
    var text = '';
    if(nodeName === 'INPUT'){
      var type = target.getAttribute('type');
      switch(type){
        case 'button':
        case 'reset':
        case 'submit':
          text = target.getAttribute('value');
          break;
        default:
          var parentNode = target.parentNode;
          if(parentNode.nodeName === 'LABEL'){
            text = parentNode.textContent;
          }
          else if(id){
            var labelForElement = findDomPathElement('label[for="'+id+'"]');
            if(labelForElement.length > 0){
              text = labelForElement[0].textContent;
            }
            else{
              text = target.getAttribute('name');
            }
          }
          else{
            text = target.getAttribute('name');
          }
      }
    }
    else if(nodeName === 'SELECT'){
      text = target.getAttribute('name');
    }
    else{
      text = target.textContent;
    }
    text = text || '';
    text = text.replace(/\s*\r?\n\s*/g,' ');
    text = text.replace(/^\s+|\s+$/g, '');
    var textLen = byteLen(text);
    if(textLen <= 60){
      text = textLen > 20 ? leftstr(text, 20) + '...' : text;
    }
    else{
      text = '';
    }
    return text;
  }

  function byteLen(text){
    var count = 0;
    for(var i=0,len=text.length;i<len;i++){
      char = text.charCodeAt(i);
      count += char > 255 ? 2 : 1;
    }
    return count;
  }
  function getClosestIdNode(target){
    var current = target;
    var body = target.ownerDocument.body;
    while(current !== null){
      if(current.nodeName !== 'HTML'){
        var idValue = current.getAttribute && current.getAttribute('id');
        if(idValue && reAttrValueBlack.test(idValue) === false && checkUniqueSelector(body, '#'+idValue)){
          return {
            node: current,
            path: '#'+idValue
          };
        }
        current = current.parentNode;
      }
      else{
        current = null;
      }
    }
    return null;
  }

  function getDomPath(target){
    var relativeNode = target.ownerDocument, relativePath = '';
    var tagName = target.nodeName.toLowerCase();
    var tempPath;
    var idValue = target.getAttribute && target.getAttribute('id');
    var nameValue = target.getAttribute && target.getAttribute('name');
    var typeValue = target.getAttribute && target.getAttribute('type');
    var valueValue = target.getAttribute && target.getAttribute('value');
    // 检查目标元素自身是否有唯一id
    if(idValue && reAttrValueBlack.test(idValue) === false && checkUniqueSelector(relativeNode, '#'+idValue)){
      // id定位
      return '#'+idValue;
    }
    else if(tagName === 'input'){
      // 表单项特殊校验
      tempPath = nameValue ? tagName + '[name="'+nameValue+'"]' : tagName;
      switch(typeValue){
        case 'radio':
        case 'checkbox':
          tempPath += '[value="'+valueValue+'"]';
          break;
      }
      tempPath += (childPath ? ' > ' + childPath : '');
      if(checkUniqueSelector(relativeNode, tempPath)){
        return tempPath;
      }
    }
    else if(nameValue){
      // 非input，但有name值
      tempPath = tagName + '[name="'+nameValue+'"]'
      if(tempPath && reAttrValueBlack.test(nameValue) === false && checkUniqueSelector(relativeNode, tempPath)){
        return tempPath;
      }
    }
    else{
      // 检查目标是否有父容器有唯一id
      var idNodeInfo = getClosestIdNode(target);
      if(idNodeInfo){
        relativeNode = idNodeInfo.node;
        relativePath = idNodeInfo.path + ' ';
      }
    }
    var current = target;
    var childPath = '';
    while(current !== null){
      if(current !== relativeNode){
        childPath = getSelectorElement(current, relativeNode, childPath);
        if(childPath.substr(0,1) === '!'){
          return relativePath + childPath.substr(1);
        }
        current = current.parentNode;
      }
      else{
        current = null;
      }
    }
    return null;
  }

  function getSelectorElement(target, relativeNode, childPath){
    var tagName = target.nodeName.toLowerCase();
    var elementPath = tagName, tempPath;
    // 校验tagName是否能唯一定位
    tempPath = elementPath + (childPath ? ' > ' + childPath : '');
    if(checkUniqueSelector(relativeNode, tempPath)){
      return '!' + tempPath;
    }
    // 校验class能否定位
    var relativeClass = null;
    var classValue = target.getAttribute && target.getAttribute('class');
    if(classValue){
      var arrClass = classValue.split(/\s+/);
      for(var i in arrClass){
        var className = arrClass[i];
        if(className && reHoverClass.test(className) === false){
          tempPath = elementPath + '.'+arrClass[i] + (childPath ? ' > ' + childPath : '');
          if(checkUniqueSelector(relativeNode, tempPath)){
            return '!' + tempPath;
          }
          else{
            // 无法绝对定位,再次测试是否可以在父节点中相对定位自身
            var parent = target.parentNode;
            if(parent){
              var element = parent.querySelectorAll('.'+className);
              if(element.length === 1){
                relativeClass = className;
              }
            }
          }
        }
      }
    }
    // 校验属性是否能定位
    var attrName, attrValue;
    for(var i in arrPathAttrs){
      attrName = arrPathAttrs[i];
      attrValue = target.getAttribute && target.getAttribute(attrName);
      if(attrValue && reAttrValueBlack.test(attrValue) === false){
        elementPath += '['+attrName+'="'+attrValue+'"]';
        tempPath = elementPath + (childPath ? ' > ' + childPath : '');
        if(checkUniqueSelector(relativeNode, tempPath)){
          return '!' + tempPath;
        }
      }
    }
    // 父元素定位
    if(relativeClass){
      elementPath += '.' + relativeClass;
    }
    else{
      var index = getChildIndex(target);
      if(index !== -1){
        elementPath += ':nth-child('+index+')';
      }
    }
    tempPath = elementPath + (childPath ? ' > ' + childPath : '');
    if(checkUniqueSelector(relativeNode, tempPath)){
      return '!' + tempPath;
    }
    return tempPath;
  }

  function checkUniqueSelector(relativeNode, path){
    try{
      var elements = relativeNode.querySelectorAll(path);
      var count = 0;
      for(var i=0;i<elements.length;i++){
        if(!isHidden(elements[i]))count ++;
      }
      return count === 1;
    }
    catch(e){return false;}
  }

  function getChildIndex(el){
    var index = -1;
    var parentNode = el.parentNode;
    if(parentNode){
      var childNodes = parentNode.childNodes;
      var total = 0;
      var node;
      for (var i = 0, len=childNodes.length; i < len; i++) {
        node = childNodes[i];
        if(node.nodeType === 1){
          total++;
          if ( node === el) {
            index = total;
          }
        }
      }
    }
    if(total === 1){
      index = -1;
    }
    return index;
  }

  function curCSS(elem, name){
    var curStyle = elem.currentStyle;
    var style = elem.style;
    return (curStyle && curStyle[name]) || (style && style[name]);
  }

  function isHidden(elem){
    return ( elem.offsetWidth === 0 && elem.offsetHeight === 0 ) || (curCSS( elem, "display" ) === "none");
  }
  function findDomPathElement(path){
    var elements = document.querySelectorAll(path);
    var newElements = [], element;
    for(var i=0;i<elements.length;i++){
        element = elements[i];
      if(!isHidden(element))newElements.push(element);
    }
    return newElements;
  }
  function getLabelTarget(target){
    var labelDom;
    if(target.nodeName !== 'INPUT'){
      if(target.nodeName === 'LABEL'){
        labelDom = target;
      }
      else if(target.parentNode.nodeName === 'LABEL'){
        labelDom = target.parentNode;
      }
    }
    if(labelDom){
      // label标签，替换为目标表单项
      var forValue = labelDom.getAttribute && labelDom.getAttribute('for');
      var labelTargets;
      if(forValue){
        // 有指定for
        labelTargets = findDomPathElement('#'+forValue);
        if(labelTargets.length === 1 && isDomVisible(labelTargets[0])){
          return labelTargets[0];
        }
      }
      else{
        // 没有指定for
        labelTargets = labelDom.querySelectorAll('input');
        if(labelTargets.length === 1 && isDomVisible(labelTargets[0])){
          return labelTargets[0];
        }
      }
    }
  }

  function isDomVisible(target){
    var offset = target.getBoundingClientRect();
    return offset.width > 0 && offset.height > 0;
  }


  function getFixedParent(target){
      var documentElement = document.documentElement;
      var node = target;
      var nodeName, path, offset, left, top, savedParent;
      while(node !== null){
        nodeName = node.nodeName.toLowerCase();
        path = getDomPath(node);
        if(path === null){
          break;
        }
        offset = node.getBoundingClientRect();
        left = offset.left;
        top = offset.top;
        savedParent = mapParentsOffset[path];
        if(savedParent && left === savedParent.left && top === savedParent.top){
          return {
            path: path,
            left: left,
            top: top
          };
        }
        if(nodeName === 'html'){
          node = null;
        }
        else{
          node = node.parentNode;
        }
      }
      path = getDomPath(target);
      if(path !== null){
        offset = target.getBoundingClientRect();
        return {
          path: path,
          left: offset.left,
          top: offset.top
        };
      }
      else{
        return null;
      }
    }
// var e1;
// var ebody, einput;
// document.body.addEventListener('click', function(e) {
//   console.log('body', e);
//   ebody = e;
//   if(einput){
//     for(var p in ebody){
//       if(ebody[p] !== einput[p]){
//         console.log('ebody', p, ebody[p]);
//         console.log('einput', p, einput[p]);
//       }
//     }
//   }
// });
// document.onclick = function(e) {
//   console.log('document', e);
// };
// var els = document.getElementsByTagName('input');
// for(var i = els.length;i--;){
//   els[i].addEventListener('click', function(e) {
//     console.log('self', e);
//     einput = e;
//     if(ebody){
//       for(var p in ebody){
//         if(ebody[p] !== einput[p]){
//           console.log('ebody', p, ebody[p]);
//           console.log('einput', p, einput[p]);
//         }
//       }
//     }
//   });
// }
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

})();
