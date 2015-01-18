
com.wuxuan.fromwheretowhere.main = function(){
  var pub={};

	// Get a reference to the strings bundle
  //pub.stringsBundle = document.getElementById("fromwheretowhere.string-bundle");
  
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
  
	pub.expandTree = function(treeView) {
		for (var i = 0; i < treeView.rowCount; i++) {
			if (treeView.isContainer(i) && !treeView.isContainerOpen(i) && treeView.getLevel(i)==0)
				treeView.toggleOpenState(i);
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

  pub.selectNodeLocal = null;
  pub.showMenuItems = function(){
		var switchToTab = document.getElementById("switchToTab");
    var openinnewtab = document.getElementById("hit_open_new_tab");
    
	//if # of selected item > 1, just show "open in new tab"
	if(pub.treeView.selection.count==1){
	  var node = pub.treeView.visibleData[pub.treeView.selection.currentIndex];
	  
		//check if the tab is opened already
		var foundTab = pub.UIutils.findTabByDocUrl(null, node.url);
		openinnewtab.hidden = (node==null || foundTab.tab!=null);
		switchToTab.hidden = (foundTab.tab==null);
		switchToTab.fromwheretowhere = {};
		switchToTab.fromwheretowhere.foundTab = foundTab;
	}else if(pub.treeView.selection.count==0){
		
	}else{
	  openinnewtab.hidden = false;
	  switchToTab.hidden =true;
	}
  };
  
  pub.openlink = function(){
    pub.getURLfromNode(pub.treeView);
  };
  
	pub.expandAll = function(){
		pub.expandTree(pub.treeView);
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
      selected.push(pub.utils.cloneObject(node));
    }
    return selected;
  };
  
  pub.pidwithKeywords = [];
  	
	//TODO: call getIncludeExclude here, save passing arguments?
  pub.searchThread = function(threadID, query) {
    this.threadID = threadID;
		this.period = query.period;
		this.query = query.keyword;
  };
  
  pub.searchThread.prototype = {
    run: function() {
      try {
      	var querytime = {};
        var topNodes = [];
          topNodes = pub.history.getThreads(this.query, this.period); //need to reverse to get the latest visits on top
          topNodes.reverse();
          
				//refresh tree, remove all visibledata and add new ones
        //when allPpids = null/[], show "no result with xxx", to distinguish with normal nothing found
		
        pub.treeView.visibleData = topNodes;
        pub.treeView.treeBox.rowCountChanged(0, topNodes.length);
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
  	var period = pub.history.lastPeriod==null?pub.history.TODAY:pub.history.lastPeriod;
  	if(event!=null){
  	  period = event.target.getAttribute("id");
  	}
  	
    pub.treeView.treeBox.rowCountChanged(0, -pub.treeView.visibleData.length);
    pub.query = document.getElementById("keywords").value;
    pub.main.dispatch(new pub.searchThread(1, {keyword: pub.query, period: period}), pub.main.DISPATCH_NORMAL);
    Application.storage.set("currentURI", "");
  };

	pub.findNext = function(){
		pub.treeView.findNext();
	};
  
  pub.externalCall = function(func){
    func(pub);
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
  
	pub.onTreeClicked = function(event){
		var tree = document.getElementById("elementList");
		var tbo = tree.treeBoxObject;
	
		// get the row, col and child element at the point
		var row = { }, col = { }, child = { };
		tbo.getCellAt(event.clientX, event.clientY, row, col, child);
	
		var url = tree.view.getCellText(row.value, {"id":"url"});
		if(event.button === 1) {
			window.open(url);
		}
	};

  pub.mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
        .getInterface(Components.interfaces.nsIWebNavigation)
        .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
        .rootTreeItem
        .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
        .getInterface(Components.interfaces.nsIDOMWindow);
 
  pub.init = function() {
      
    pub.aserv=Components.classes["@mozilla.org/atom-service;1"].
                getService(Components.interfaces.nsIAtomService);
    pub.main = Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread;
	pub.utils = com.wuxuan.fromwheretowhere.utils;
	pub.history = com.wuxuan.fromwheretowhere.historyQuery;
	pub.UIutils = com.wuxuan.fromwheretowhere.UIutils;
  }
  
  return pub;
}();