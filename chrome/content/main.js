
com.wuxuan.fromwheretowhere.main = function(){
  var pub={};

	// Get a reference to the strings bundle
  //pub.stringsBundle = document.getElementById("fromwheretowhere.string-bundle");
  pub.DAYTIME=(24*60*60*1000000);
  pub.TODAY = 'today';
  pub.YESTERDAY = 'yesterday';
  pub.LAST7DAYS = 'last7days';
  pub.THISMONTH = 'thismonth';
  pub.THISYEAR = 'thisyear';
  pub.ALL = 'all';
  
  pub.getCurrentURI = function() {
    if(!window.opener){
      return "none";
    }
    return window.opener.getBrowser().mCurrentBrowser.currentURI.spec;
  };
  
  pub.getURLfromNode = function(treeView) {
    var sel = pub.getCurrentSelected();
		//only when 1 selected, may switch to current tab
		if(sel.length==1){
			var switchToTab = document.getElementById("switchToTab");
			var foundTab = null;
			if(!switchToTab.fromwheretowhere || !switchToTab.fromwheretowhere.foundTab){
				var node = pub.treeView.visibleData[pub.treeView.selection.currentIndex];
				//check if the tab is opened already
				foundTab = pub.UIutils.findTabByDocUrl(null, node.url);
			}else{
				foundTab = switchToTab.fromwheretowhere.foundTab;
			}
			if(foundTab.tab){
				// The URL is already opened. Select this tab.
				foundTab.browser.selectedTab = foundTab.tab;
				// Focus *this* browser-window
				foundTab.window.focus();
			}else
				window.open(sel[0].url);
		}else{
			for(var i in sel){
				window.open(sel[i].url);
			}
		}
  };
  
	pub.DEBUG = false;
  // Utils functions finish
  pub.keywords = "";
  pub.currentURI = Application.storage.get("currentURI", false);

	//if a node's level==0, seen as start of a session
	pub.isNewSession = function(item){
		return item.level==0;
	};
	
pub.mainThread = function(threadID, item, idx, query, findNext) {
  this.threadID = threadID;
  this.item = item;
  this.idx = idx;
	this.query = query;
	this.findNext = findNext;
};

pub.mainThread.prototype = {
  run: function() {
    try {
			if(pub.isNewSession(this.item))
				pub.alreadyExpandedPids = [];
			pub.alreadyExpandedPids.push(this.item.placeId);
      //CAN'T alert here!! will crash!
      /*if(this.item.isContainer){
				//if there are children already, means local notes
				if(this.item.children.length==0){
					var onTopic = false;
					if(this.item.notRelated){
						//thought not related, but user is interested. learn from this record
						pub.topicTracker.learnFromCase(this.item);
						this.item.notRelated=false;
					}
					if(pub.topicTracker)
						onTopic = pub.topicTracker.followContent(this.item.label, pub.isNewSession(this.item));
					//TODO: if still !onTopic, need to re-learn
					//the start of a session, always expand
					this.item = pub.allChildrenfromPid(this.item, this.query);
				} else {
					//TODO: make sure after this, the title will be guarantee "onTopic"
					// walk through the already existed children list, and mark "noNeedExpand"
					this.item = pub.checkIfExpand(this.item, true);
				}
      }*/
      //alert(pub.timestats1);
      // This is where we react to the completion of the working thread.
      pub.treeView.delSuspensionPoints(this.idx);
      pub.treeView.expandFromNodeInTree(this.item, this.idx);
			if(this.findNext){
				//alert("find Next");
				pub.treeView.findNext(this.idx);
			}
    } catch(err) {
      Components.utils.reportError(err);
    }
  },
  
  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsIRunnable) ||
        iid.equals(Components.interfaces.nsISupports)) {
            return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};


  pub.selectNodeLocal = null;
  pub.showMenuItems = function(){
    var localItem = document.getElementById("local");
		var switchToTab = document.getElementById("switchToTab");
    var openinnewtab = document.getElementById("openinnewtab");
    var shareThread = document.getElementById("share");
    
	//if # of selected item > 1, just show "open in new tab"
	if(pub.treeView.selection.count==1){
	  var node = pub.treeView.visibleData[pub.treeView.selection.currentIndex];
	  if(node){
		var exists = false;//com.wuxuan.fromwheretowhere.sb.urls.indexOf(node.url);
		pub.selectNodeLocal = exists;
		localItem.hidden = (exists == -1);
	  }
		//check if the tab is opened already
		var foundTab = pub.UIutils.findTabByDocUrl(null, node.url);
		openinnewtab.hidden = (node==null || foundTab.tab!=null);
		switchToTab.hidden = (foundTab.tab==null);
		switchToTab.fromwheretowhere = {};
		switchToTab.fromwheretowhere.foundTab = foundTab;
	}else if(pub.treeView.selection.count==0){
    /*var selectedIndex = pub.UIutils.getAllSelectedIndex(pub.treeView);
    var propertyItem = document.getElementById("export-menu");
		var noneSelected = (selectedIndex.length==0);
    propertyItem.hidden = noneSelected;*/
		shareThread.hidden = noneSelected;
	}else{
	  openinnewtab.hidden = false;
	  switchToTab.hidden =true;
	}
  };
  
  /* to fix #2, side effect: checking menu items always */
  pub.doubleClickTreeItem = function(){
	pub.showMenuItems();
	pub.openlink();
  };
  
  pub.openlink = function(){
    pub.getURLfromNode(pub.treeView);
  };
  
  pub.getCurrentSelected = function(){
    var selectCount = pub.treeView.selection.count;
    var selectedIndex = pub.UIutils.getAllSelectedIndex(pub.treeView);
    //verify 
    if(selectCount!=selectedIndex.length){
      alert("Error when getting selected rows");
    }
    var selected = [];
    for(var i in selectedIndex){
      var node = pub.treeView.visibleData[selectedIndex[i]];
      //clean away id/pid from the node, as it's useless for other instances of FF
      selected.push(pub.history.clearReferedHistoryNode(pub.utils.cloneObject(node)));
    }
    return selected;
  };
  
  /* for now there's no circular reference within nodes, so JSON has no problem.
    TOIMPROVE until there's built-in support, as it should make loop detection more elegant? */
  //if it's a container, but never opened before, then it has no children.
  //For now have to manually open it first to get all the children, and then "export the whole trace"
  pub.exportJSON = function() {
		var tosave = pub.getCurrentSelected();
    var json = JSON.stringify(tosave);
    pub.openPropertyDialog(json);
  };
  
	pub.exportHTML = function() {
		var tosave = pub.getCurrentSelected();
		var htmlSrc = pub.utils.exportHTML(tosave);
		pub.openPropertyDialog(htmlSrc);
	};
	
  pub.pidwithKeywords = [];
  	
	//TODO: call getIncludeExclude here, save passing arguments?
  pub.searchThread = function(threadID, query) {
    this.threadID = threadID;
    this.keywords = query.origkeywords;
    this.words = query.words;
		this.optional = query.optional;
    this.excluded = query.excluded;
		this.site = query.site;
		this.time = query.time;
		this.query = query;
  };
  
  pub.searchThread.prototype = {
    run: function() {
      try {
      	
		var querytime = {};
        var topNodes = [];
        //if(this.words.length!=0 ||  this.optional.length!=0){
          
          var visits = pub.history.getAllVisits(this.time);
          topNodes = pub.history.getThreads(visits).reverse(); //need to reverse to get the latest visits on top
          console.log("got tops:"+topNodes.length);
          
		//}		
				//refresh tree, remove all visibledata and add new ones
        pub.treeView.delSuspensionPoints(-1);
        
        //when allPpids = null/[], show "no result with xxx", to distinguish with normal nothing found
				if(topNodes.length==0)
          topNodes.push(pub.history.ReferedHistoryNode(-1, -1, pub.utils.buildFeedback(this.words, this.optional, this.excluded, this.site, this.time), null, false, false, [], 1));
        console.log(topNodes);
        pub.treeView.visibleData = topNodes;
        pub.treeView.treeBox.rowCountChanged(0, pub.treeView.visibleData.length);
        console.log("done refresh tree");
      } catch(err) {
        Components.utils.reportError(err);
      }
    },
  
    QueryInterface: function(iid) {
      if (iid.equals(Components.interfaces.nsIRunnable) ||
          iid.equals(Components.interfaces.nsISupports)) {
              return this;
      }
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
  };
  
  pub.search = function(event) {
  
  	
  	var period = pub.TODAY;
  	if(event!=null)
  		period = event.target.getAttribute("id");
    console.log("search with period:"+JSON.stringify(period));
    //alert(Application.storage.get("currentPage", false));
    pub.treeView.treeBox.rowCountChanged(0, -pub.treeView.visibleData.length);
    pub.treeView.addSuspensionPoints(-1, -1);
    pub.keywords = document.getElementById("keywords").value;
		pub.query = pub.utils.getIncludeExcluded(pub.keywords);
	pub.query.time=pub.getTime(period);
	console.log(pub.query.time);
    pub.main.dispatch(new pub.searchThread(1, pub.query), pub.main.DISPATCH_NORMAL);
    Application.storage.set("currentURI", "");
  };

  pub.getTime = function(period) {
  	console.log("start getTime:"+period);
    var p = {since: -1, till: Number.MAX_VALUE};
  	if(period==pub.TODAY){
  	  p.since=pub.getTodayStartTime();
  	}else if(period==pub.YESTERDAY){
  	  p.till=pub.getTodayStartTime();
  	  p.since=p.till-pub.DAYTIME;
  	}else if(period==pub.LAST7DAYS){
  	  p.since=pub.getTodayStartTime()-pub.DAYTIME*7;
  	}else if(period==pub.THISMONTH){
  	  var date = new Date();
  	  var year = date.getFullYear();
  	  var month = date.getMonth();
  	  p.since=new Date(year,month,1)*1000;
  	}else if(period==pub.THISYEAR){
  	  var year = new Date().getFullYear();
  	  p.since=new Date(year,0,1)*1000;
  	}
  	console.log("in getTime:"+p);
  	return p;
  };
  
  pub.getTodayStartTime = function() {
  	var now=new Date();
  	var hour = now.getHours();
	var milli = now.getMilliseconds();
    var min = now.getMinutes();
    var sec = now.getSeconds();
    return (now-((60*hour+min)*60+sec)*1000+milli)*1000;
  };
  
	pub.findNext = function(){
		//pub.treeView.toggleOpenState(0);
		pub.treeView.findNext();
	};
	
  pub.keypress = function(event) {
    if(!event){
      alert("no event!");
      return;
    }
    var keyunicode=event.charCode || event.keyCode;
    if(keyunicode==13){
      pub.search();
    }
  };
  
  pub.mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
        .getInterface(Components.interfaces.nsIWebNavigation)
        .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
        .rootTreeItem
        .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
        .getInterface(Components.interfaces.nsIDOMWindow);
 
  pub.init = function() {
          console.log("main init");
      
    pub.aserv=Components.classes["@mozilla.org/atom-service;1"].
                getService(Components.interfaces.nsIAtomService);
    pub.main = Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread;
	pub.utils = com.wuxuan.fromwheretowhere.utils;
	pub.history = com.wuxuan.fromwheretowhere.historyQuery;
  }
  
  return pub;
}();