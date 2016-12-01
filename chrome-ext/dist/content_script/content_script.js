(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// https://github.com/alibaba/uirecorder
(function(){
  // var EventRecorder = require('event-recorder');
  var isIframe = self !== top;
  var isRecording = false;
  var isStopEvent = false;

  var testVars = {};
  var arrPathAttrs = ['data-id', 'data-name', 'type', 'data-type', 'data-role', 'data-value'];
  var reAttrValueBlack = /^$/;
  var specLists = [];

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
              tag: target.tagName,
              id: target.id,
              class_name: target.className,
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
              tag: target.tagName,
              id: target.id,
              class_name: target.className,
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

    var modifierKeys = {
      17: 'CTRL', // Ctrl
      18: 'ALT', // Alt
      16: 'SHIFT', // Shift
      91: 'META' // Command/Meta
    };

    var NonTextKeys = {
      8: 'BACK_SPACE', // BACK_SPACE
      9: 'TAB', // TAB
      13: 'ENTER', // ENTER
      19: 'PAUSE', // PAUSE
      27: 'ESCAPE', // ESCAPE
      33: 'PAGE_UP', // PAGE_UP
      34: 'PAGE_DOWN', // PAGE_DOWN
      35: 'END', // END
      36: 'HOME', // HOME
      37: 'LEFT', // LEFT
      38: 'UP', // UP
      39: 'RIGHT', // RIGHT
      40: 'DOWN', // DOWN
      45: 'INSERT', // INSERT
      46: 'DELETE' // DELETE
    };

    // catch keydown event
    var lastModifierKeydown = null;
    var isModifierKeyRecord = false; // save modifier keys?
    document.addEventListener('keydown', function(event){
      var target = event.target;
      if(isNotInToolsPannel(target)){
        var keyCode = event.keyCode;
        var modifierKey = modifierKeys[keyCode];
        var NonTextKey = NonTextKeys[keyCode];
        if(isRecording){
          var stickModifierKey;
          if(event.ctrlKey){
            stickModifierKey = 'CTRL';
          }
          else if(event.altKey){
            stickModifierKey = 'ALT';
          }
          else if(event.shiftKey){
            stickModifierKey = 'SHIFT';
          }
          else if(event.metaKey){
            stickModifierKey = 'META';
          }
          if(modifierKey){
            // modifier key trigger keyDown once
            if(isModifierKeyRecord && modifierKey !== lastModifierKeydown){
              lastModifierKeydown = modifierKey;
              saveCommand('keyDown', {
                character: modifierKey
              });
            }
          }
          else if(NonTextKey){
            if(stickModifierKey && isModifierKeyRecord === false){
              isModifierKeyRecord = true;
              saveCommand('keyDown', {
                character: stickModifierKey
              });
            }
            saveCommand('sendKeys', {
              keys: '!@Keys.'+NonTextKey
            });
          }
          else if(stickModifierKey === 'CTRL'){
            var typedCharacter = String.fromCharCode(keyCode);
            if(/^[azcxv]$/i.test(typedCharacter)){
              if(isModifierKeyRecord === false){
                isModifierKeyRecord = true;
                saveCommand('keyDown', {
                  character: stickModifierKey
                });
              }
              // saveCommand('sendKeys', {
              //   keys: typedCharacter.toLowerCase()
              // });
            }
          }
        }
        else if(isStopEvent){
          event.stopPropagation();
          event.preventDefault();
        }
      }
    }, true);

    // catch keyup event
    document.addEventListener('keyup', function(event){
      var target= event.target;
      if(isNotInToolsPannel(target)){
        var modifierKey = modifierKeys[event.keyCode];
        if(isRecording){
          if(isModifierKeyRecord && modifierKey){
            isModifierKeyRecord = false;
            lastModifierKeydown = null;
            saveCommand('keyUp', {
              character: modifierKey
            });
          }
        }
        else{
          if(!isRecording && event.keyCode === 27){
            setGlobalWorkMode('record');
          }
          if(isStopEvent){
            event.stopPropagation();
            event.preventDefault();
          }
        }
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

    // var inputs = document.getElementsByTagName('input');
    // console.log(inputs);
    // for(var i=inputs.length; i--;){
    //   inputs[i].addEventListener('change', function(e) {
    //     console.log('change!!', e);
    //   });
    // }

    document.addEventListener('change', function(event){
      var target = event.target;
      console.log('change event', target, isRecording, isFileInput(target), isDomVisible(target), getDomPath(target));
      if(isRecording){
        if(isFileInput(target)){
          var path = getDomPath(target);
          var filepath = target.value || '';
          var match = filepath.match(/[^\\\/]+$/);
          console.log(target.value, filepath, match);
          if(path !== null && match !== null){
            // GlobalEvents.emit('showDomPath', path);
            saveCommand('fileChange', {
              path: path,
              filename: match[0],
              tag: target.tagName,
              id: target.id,
              class_name: target.className,
              text: getTargetText(target),
              value: match[0] || target.value
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
                tag: target.tagName,
                id: target.id,
                class_name: target.className,
                text: getTargetText(target)
              });
            }else{
              console.log('path is null', target);
            }
          }else{
            console.log('targt !isDomVisible', target);
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
    data.time = (new Date()).getTime();
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

  function byteLen(text){
    var count = 0;
    for(var i=0,len=text.length;i<len;i++){
      char = text.charCodeAt(i);
      count += char > 255 ? 2 : 1;
    }
    return count;
  }

  function leftstr(text, limit){
    var substr = '';
    var count = 0;
    var char;
    for(var i=0,len=text.length;i<len;i++){
      char = text.charCodeAt(i);
      substr += text.charAt(i);
      count += char > 255 ? 2 : 1;
      if(count >= limit){
        return substr;
      }
    }
    return substr;
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
    // only one target with this id?
    if(idValue && reAttrValueBlack.test(idValue) === false && checkUniqueSelector(relativeNode, '#'+idValue)){
      // locate element by id
      return '#'+idValue;
    }
    else if(tagName === 'input'){
      // special form validation
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
      // not an input, but has a 'name'
      tempPath = tagName + '[name="'+nameValue+'"]'
      if(tempPath && reAttrValueBlack.test(nameValue) === false && checkUniqueSelector(relativeNode, tempPath)){
        return tempPath;
      }
    }
    else{
      // parent has unique id?
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
    // validate if target can be located by tagName
    tempPath = elementPath + (childPath ? ' > ' + childPath : '');
    if(checkUniqueSelector(relativeNode, tempPath)){
      return '!' + tempPath;
    }
    // validate if target can be located by className
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
            // not able to locate the target by abosolute path, try relative path
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
    // locate target by attribute
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
    // locate parent
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
      // replaced lable by target element
      var forValue = labelDom.getAttribute && labelDom.getAttribute('for');
      var labelTargets;
      if(forValue){
        // has a 'for'
        labelTargets = findDomPathElement('#'+forValue);
        if(labelTargets.length === 1 && isDomVisible(labelTargets[0])){
          return labelTargets[0];
        }
      }
      else{
        // no 'for'
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

    function isNotInToolsPannel(target){
      return true;
    }
})();

},{}]},{},[1]);
