chrome.contextMenus.create({
  "title" : "Tag image",
  "type" : "normal",
  "contexts" : ["image"],
  "onclick" : function(info, tab){
    var url = info.linkUrl || info.srcUrl;
    //Local.ws.send({cmd: 'local.download', url: url});
    chrome.tabs.sendMessage(tab.id, {cmd: 'push', src: url});
  }
});

//var ipfs = IpfsApi();


var DB = new zango.Db(Cfg.db.name, {
    files: ['id', 'domain', 'path', 'owner'],
    'ab': ['time', 'id', 'url']
});

window.Pic = {
  integrating: false,
  integrate: function(id){
    var cb = function(){};

    var jsonUser = JSON.stringify(Pic.user);

    Pic.integrating = true;
    new ScriptExecution(null)
      .executeScripts(
        "lib/jquery.js"
      )
      .then(s => s.executeCodes('console.log("libs loaded")'))
      .then(s => s.executeCodes('var User = '+jsonUser+';'))
      .then(s => s.executeScripts(
        "cfg.js", "lib/functions.js", "run.js"
      ))
      .then(s => s.injectCss("ext.css"))
      .then(function(){
         Pic.integrating = false;
      }).then(function(){
        //chrome.tabs.sendMessage(id, {cmd: 'auth', user: Pic.user});
      }).then(cb);
    chrome.storage.local.get('height', function(d){
      Pic.transform(d.height || 100);
    });
  },

  transform: function(px){
    if(Cfg.fixed) return;
    chrome.tabs.insertCSS(null, {
      code: "body{transform: "+(px?('translateY('+px+'px)'):'none')+"}"
    });
  },

  check: function(tabId){
      chrome.tabs.sendMessage(tabId, {cmd: 'carousel', do: (Pic.tabs[tabId]?'hide':'show')}, function(r){
        if(!r){
          Pic.integrate();
          Pic.tabs[tabId] = true;
          return;
        }
        Pic.transform(r.visible?r.height:false);
        Pic.tabs[tabId] = r.visible;
      });
  },

  sendAll: function(msg){
    Object.keys(Pic.tabs).forEach(function(tabId){
      chrome.tabs.sendMessage(parseInt(tabId), msg);
    });
  },

  toggle: function(id){
    if(Pic.tabs[id] == undefined){
      Pic.integrate();
      Pic.tabs[id] = true;
    }
    else
      Pic.check(id);
    return;
  },

  tabs: {},
  ready: []
}


var ws = new WS({
  server: Cfg.server,
  name: 'main',
  autoReconnect: true
});
S = ws.on;

S.session = function(m){
  //$.cookie('sid', m.sid);

  Pic.ready.forEach(function(f){
    f();
  });
}

var fileHandle;
var writeHandle;

const fileOpts = {
  type: 'saveFile',
  accepts: [{
    description: 'Choose text file'
  }],
};

var inserted;
chrome.browserAction.onClicked.addListener(function(tab){
  Pic.toggle(tab.id);
});

chrome.runtime.onMessage.addListener(function(d, sender, sendResponse){
  console.log(d);
  var m = d;
  if(d.cmd == 'resize'){
    Pic.transform(d.height);
    sendResponse({cmd: 'transformed'});
  }
  else
  if(d.cmd == 'readFile'){
    var readFile = async handle => {

      const file = await handle.getFile();
      const content = await file.text();

      sendResponse({content});
    };

    if(fileHandle) readFile(fileHandle);
    else window.chooseFileSystemEntries().then(async handle => {
      fileHandle = handle;
      readFile(fileHandle)
    });

    return true;
  }
  else
  if(d.cmd == 'closeTab'){
    chrome.tabs.remove(d.id);
  }
  else
  if(d.cmd == 'listTabs'){
    chrome.tabs.getAllInWindow(null, list => {
      console.log(list);
      sendResponse({list});
    });
    return true;
  }
  else
  if(d.cmd == 'list'){
    let collection = DB.collection(d.collection);

    collection.find(m.filter || {}).sort({time: 1}).toArray().then(items => {
      console.log(items);
      sendResponse({items});
    });
    return true;
  }
  else
  if(d.cmd == 'get'){
    let collection = DB.collection(d.collection);

    var filter = m.id?{id: m.id}:m.filter;

    collection.findOne(filter, (err, item) => {
      console.log(err, item)
      sendResponse({item});
    });
    return true;
  }
  else
  if(d.cmd == 'add'){
    let collection = DB.collection(m.collection);

    collection.insert(m.item);
  }
  else
  if(d.cmd == 'update'){
    let collection = DB.collection(m.collection);

    collection.update({id: m.id}, {$set: m.set});
  }
  else  
  if(d.cmd == 'writeFile'){
    var writeFile = async (handle, content) => {
      const writer = await handle.createWriter();
      await writer.write(0, content);
      await writer.close();
    }

    if(writeHandle) writeFile(writeHandle, d.content);
    else window.chooseFileSystemEntries(fileOpts).then(async handle => {
      writeHandle = handle;
      writeFile(writeHandle, d.content)
      
    });
  }
  else
  if(d.cmd == 'ws'){
    console.log(d);
    ws.send(d.d, function(r){
      sendResponse(r);
    });
    return true;
  }
  else
  if(d.cmd == 'download'){
    ws.download(d.id).then(function(data, file){
      console.log(data);
      if(!data) return;

      var blob = new Blob([data], {type: 'image/jpeg'});
      sendResponse(URL.createObjectURL(blob));
    });
    return true;
  }
  else
  if(d.cmd == 'shot'){
    console.log(d);

    chrome.tabs.captureVisibleTab(null, {}, function(src){
      var image = new Image;

      image.onload = function(){
        var ctx = document.createElement('canvas').getContext('2d');
        ctx.canvas.width = d.width || image.width;
        ctx.canvas.height = (d.height || image.height) - (d.skip || 0);

        var l = (d.left - (d.scrollLeft || 0)) || 0,
            t = (d.top - (d.scrollTop || 0)) || d.skip || 0;

        ctx.drawImage(this, l, t,
          ctx.canvas.width, ctx.canvas.height, 0, 0,
          ctx.canvas.width, ctx.canvas.height
        );

        ctx.canvas.toBlob(function(blob){
          ws.upload(blob, function(file){
            if(file){
              var url = Cfg.files+file.id;
              chrome.tabs.sendMessage(sender.tab.id, {
                cmd: 'shot',
                src: url,
                left: l,
                top: t,
                skip: d.skip,
                width: ctx.canvas.width,
                height: ctx.canvas.height
              });
            }
          });
        }, 'image/jpeg');

      };

      //console.log(src);
      image.src = src;
    });
  }
  else
  if(d.cmd == 'carousel.updated'){
    Object.keys(Pic.tabs).forEach(function(tabId){
      if(sender.tab.id != tabId)
        chrome.tabs.sendMessage(parseInt(tabId), {
          cmd: 'carousel.update',
          path: d.path
        });
    });
  }
  else
  if(d.cmd == 'files'){
    //sendResponse({files: Local.files});
  }
  else
  if(d.cmd == 'download'){
    //Local.ws.send({cmd: 'local.download', url: d.url});
  }
  else
  if(d.cmd == 'upload'){
    ipfs.add(d.buf, function(ev, hash){
      console.log(ev, hash);
    })
  }
})

chrome.tabs.onUpdated.addListener(function(tabId,i,tab){
  if(i.status == 'loading'){
    if(Pic.integrating) return;

    if(Pic.tabs[tabId] === true)
      chrome.tabs.sendMessage(tabId, {cmd: 'carousel'}, function(r){
        if(!r)
          Pic.integrate();
      });
  }
});

Pic.ready.push(function(){
  /*
  ws.send({
    cmd: "load",
    collection: "pix8",
    filter: {
      path: "chromeExt"
    }
  }, function(r){
    console.log(r);
  });
*/
});

chrome.commands.onCommand.addListener(function(command){
  console.log('tog ', command);
  if(command === "toggle"){
    chrome.tabs.query({currentWindow: true, active: true}, (tabArray) => {
        console.log(tabArray, 111);
          var tab = tabArray[0];
          Pic.toggle(tab.id);
        }
    );
  }
});


chrome.identity.getProfileUserInfo(function(user){
  user.name = user.email.split('@')[0];
  Pic.user = user;
  Pic.gid = Pic.user.id = /*Cfg.gid || */user.id;
  Pic.email = user.email;
  console.log(user);
});
