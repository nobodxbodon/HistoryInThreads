
com.wuxuan.fromwheretowhere.mainView = function(){
  var pub={};

  var devOptions=false;
  //var testConstruct=(function(){alert("mainView cons here");})();
  
  pub.createView = function(main){
    return {
  // have to separate the looks of node from the content!!!!!!
  
  visibleData : [],
  treeBox: null,  
  selection: null,  
  
  get rowCount()                     { return this.visibleData.length; },
  
  //fold all top nodes
  getVisibleLength: function(visibleData){
    var len = 0;
    for(var i in visibleData){
        visibleData[i].isFolded=false;
    }
    return len;
  },
  
  // to set tree from sidebar (local notes)
  setTree: function(treeBox){
    //get the length of last visibleData, for rowCountChanged
    var lastVisibleLen = 0;
    if(this.visibleData!=null){
        lastVisibleLen = this.visibleData.length;
    }
    var newNodes = Application.storage.get("fromwheretowhere.currentData", false);
    //ugly solution for passing the nodes from sidebar to main TV:
    //always make sure this "global" currentData is reset every time after the treeview.js loads visibleData from it
    Application.storage.set("fromwheretowhere.currentData", false);
    if(treeBox!=null){
      this.treeBox = treeBox;
    }else{
      Application.storage.set("currentURI", "");
    }
    //refresh the tree
    //what's this for??
    if(newNodes.length>0){
      this.visibleData = [];
      this.treeBox.rowCountChanged(0, -1);
    }
    //??
    for (var i = 0; i < newNodes.length; i++) {
      newNodes[i]=main.putNodeToLevel0(newNodes[i]);
      this.visibleData.splice(this.visibleData.length, 0, newNodes[i]);
    }
    this.treeBox.rowCountChanged(lastVisibleLen,this.visibleData.length-lastVisibleLen+1);
  },
  
  getCellText: function(idx, column) {
    if(this.visibleData[idx]) {
      if(column.id == "element") {
        return this.visibleData[idx].label;
      } else if (column.id == "url") {
	return this.visibleData[idx].url;
      } else if (column.id == "date") {
			return pub.utils.formatDate(this.visibleData[idx].visit_date);
      }
    }
    return "NotDefined";
  },
    
  isContainer: function(idx){
    if(this.visibleData[idx]){
      return this.visibleData[idx].isContainer;
    } else {
      return false;
    }
  },  
  isContainerOpen: function(idx)     { return this.visibleData[idx].isFolded; },  
  isContainerEmpty: function(idx)    { return false; },  
  isSeparator: function(idx)         { return false; },  
  isSorted: function()               { return false; },  
  isEditable: function(idx, column)  { return false; },  
  
  getParentIndex: function(idx) {  
    //if (this.isContainer(idx)) return -1;  
    for (var t = idx - 1; t >= 0 ; t--) {  
      if (this.visibleData[t].level<this.visibleData[idx].level) return t;  
    }
    return -1;
  },  
  getLevel: function(idx) {
    if(this.visibleData[idx]){
      return this.visibleData[idx].level;
    }
    return 0;
  },
  // UNrefed now
  hasNextSibling: function(idx, after) {  
    var thisLevel = this.getLevel(idx);  
    for (var t = after + 1; t < this.visibleData.length; t++) {  
      var nextLevel = this.getLevel(t);  
      if (nextLevel == thisLevel) return true;  
      if (nextLevel < thisLevel) break;  
    }  
    return false;  
  },
  
  //expand using the children cached in item, hopefully save expanding time
  expandFromNodeInTree: function(item, idx, top) {
    var vis = this.visibleData;
    //console.log(item.id+" hidden: "+item.hidden);
    item.isFolded = true;
    var selfRow=(item.hidden||top)?0:1;
    if(!item.hidden && !top){
      //console.log("insert "+item.id+" "+(idx + 1));
      vis.splice(idx + 1, 0, item);
    }
    // adjust the index offset of the node to expand
    var offset = 0;
    
    var shownChildren=0;
    if(item.children){
      for (var i = 0; i < item.children.length; i++) {
        var child = item.children[i];
        offset += this.expandFromNodeInTree(child, idx+selfRow+offset);
      }
    }
    //only add the length of its own direct children, the children will count in the length of their own children themselves
    //console.log("expand "+item.id+" "+(idx + selfRow) + " "+selfRow);
    this.treeBox.rowCountChanged(idx + selfRow, selfRow);
    return offset;
  },
  
  addSuspensionPoints: function(level, idx) {
    var sp = main.history.ReferedHistoryNode(-1, -1, "...", null, false, false, [], level+1);
    this.visibleData.splice(idx+ 1, 0, sp);
    this.treeBox.rowCountChanged(idx + 1, 1);
  },
  delSuspensionPoints: function(idx) {
    this.visibleData.splice(idx+ 1, 1);
    this.treeBox.rowCountChanged(idx + 1, -1);
  },
  
  //search from selection, get the one with keywords or the src page (blue or red)
  findNext: function(idx){
    if(idx==null &&this.selection!=null)
      idx = this.selection.currentIndex;
    if(idx==-1)
      idx=0;
    for(var i=idx; ;i++){
      var node = this.visibleData[i];
      if(node==null){
        break;
      }
      var pid = node.placeId;
      var haveKeywords = main.pidwithKeywords.indexOf(pid);
      if(i!=idx && ((pid && pid==main.retrievedId)
                  || (haveKeywords!=-1 || (pid==null && node.haveKeywords)))) {
        this.selection.select(i);
        this.treeBox.ensureRowIsVisible(i);
        break; 
      }else{
        //if it's folded, expand first
        if(node.isContainer && !node.isFolded){
          this.toggleOpenState(i, true);
          //break here or it'll open the following nodes because of threads
          break;
        }
      }
    }
  },
  
  toggleOpenState: function(idx, findNext) {  
    var item = this.visibleData[idx];  
    //console.log(item);
    if (!item.isContainer) return;  
  
    if (item.isFolded) {  
      item.isFolded = false;  
  
      var thisLevel = this.getLevel(idx);  
      var deletecount = 0;  
      for (var t = idx + 1;; t++) {
        if (this.visibleData[t] != null && (this.getLevel(t) > thisLevel)) deletecount++;  
        else break;  
      }  
      if (deletecount) {  
        this.visibleData.splice(idx + 1, deletecount);  
        this.treeBox.rowCountChanged(idx + 1, -deletecount);  
      }
    }  
    else {
      //add expanded item to history
      main.history.expanded.push(item);
      //FIX: Warning: reference to undefined property main.main.query
      if(main.query)
        main.main.dispatch(new main.mainThread(1, item, idx, main.query, findNext), main.main.DISPATCH_NORMAL);
      else
        main.main.dispatch(new main.mainThread(1, item, idx, null, findNext), main.main.DISPATCH_NORMAL);
      
    }  
    this.treeBox.invalidateRow(idx);
  },  
  
  getImageSrc: function(idx, column) {
  	
    var vis = this.visibleData;
    /*var treeItem = this.view.getItemAtIndex(idx);
    if(column.id == "element") {
      main.history.getImagefromUrl(vis[idx].url, treeItem);
    }*/
    if(column.id == "element") {
  		return vis[idx].icon;
  	}
  },
  
  getProgressMode : function(idx,column) {},  
  getCellValue: function(idx, column) {},  
  cycleHeader: function(col, elem) {},  
  selectionChanged: function() {},  
  cycleCell: function(idx, column) {},  
  performAction: function(action) {},  
  performActionOnCell: function(action, index, column) {},  
  getRowProperties: function(idx, column, prop) {},  
  
  getCellProperties: function(row,col,props){
    var vis = this.visibleData;
    var pid = vis[row].placeId;
    var haveKeywords = main.pidwithKeywords.indexOf(pid);
		var prop = "";
    //CAN'T alert here!
    //in case pid is null, which means new imported nodes
    if(pid && pid==main.retrievedId){
      prop+="makeItRed ";
    }else if(haveKeywords!=-1 || (vis[row].placeId==null && vis[row].haveKeywords)){
      prop+="makeItBlue ";
    }
    if(devOptions){
      var pIdx = this.getParentIndex(row);
      if(pIdx!=-1 && this.visibleData[row].label==this.visibleData[pIdx].label){
				prop+="makeItSmall";
      }
    }
		return prop;
  },
  
  getColumnProperties: function(column, element, prop) {},
  click: function() {}
}};
	
  pub.init = function(main){
    //console.log("treeview init");
    main.init();
    // Main Tree definition
    pub.utils = com.wuxuan.fromwheretowhere.utils;
    pub.treeView = pub.createView(main);
    //TODO: remove this, pass as parameter
    main.treeView = pub.treeView;
    document.getElementById("elementList").view = pub.treeView;
    main.search();
  };
  
  return pub;
}();
