com.wuxuan.fromwheretowhere.UIutils = function(){
  var pub={};
    
  //return true if found a tab, false if not
  pub.switchToTab = function(doc, url){
    var foundTab = pub.findTabByDocUrl(doc, url);
    if(foundTab.tab){
      // The URL is already opened. Select this tab.
      foundTab.browser.selectedTab = foundTab.tab;
      // Focus *this* browser-window
      foundTab.window.focus();
    }
    // if the page was closed, open it first
    else{
      // as the panel belongs to the browser, when clicking gbrowser is itself the current browser
      var newTab = gBrowser.addTab(pub.currLoc);
      gBrowser.selectedTab = newTab;
      // Focus *this* browser window in case another one is currently focused
      gBrowser.ownerDocument.defaultView.focus();
    }
    return (foundTab.tab!=null);
  };

  pub.findTabByDocUrl = function(doc, url){
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                     .getService(Components.interfaces.nsIWindowMediator);
    var browserEnumerator = wm.getEnumerator("navigator:browser");

    // Check each browser instance for our URL
    // TODO: as the panel is bound to one browser instance, it's not necessary to search all
    var found = false;
    var foundTab = {window:null, browser:null, tab:null};
    while (!found && browserEnumerator.hasMoreElements()) {
      var browserWin = browserEnumerator.getNext();
      var tabbrowser = browserWin.gBrowser;
  
      // Check each tab of this browser instance
      var numTabs = tabbrowser.browsers.length;
      for (var index = 0; index < numTabs; index++) {
        var currentBrowser = tabbrowser.getBrowserAtIndex(index);
        if (doc == currentBrowser.contentDocument || url==currentBrowser.currentURI.spec) {//url=pub.currLoc
          foundTab.window = browserWin;
          foundTab.browser = tabbrowser;
          foundTab.tab = tabbrowser.tabContainer.childNodes[index];
          found = true;
          break;
        }
      }
    }
    return foundTab;
  };
  
  pub.getAllSelectedIndex = function(treeView){
    var start = new Object();
    var end = new Object();
    var numRanges = treeView.selection.getRangeCount();
    var index = [];
    for (var t = 0; t < numRanges; t++){
      treeView.selection.getRangeAt(t,start,end);
      for (var v = start.value; v <= end.value; v++){
        index.push(v);
      }
    }
    return index;
  };
  
  return pub;
}();