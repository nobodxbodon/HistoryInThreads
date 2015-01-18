
com.wuxuan.fromwheretowhere.mainView = function(){
  var pub={};

  var devOptions=false;
	
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
        var label=this.getFirstLabel(this.visibleData[idx]);
        if(label==null || label=='')
          label=this.visibleData[idx].url;
        return label;
      } else if (column.id == "url") {
	return this.visibleData[idx].url;
      } else if (column.id == "date") {
			return pub.utils.formatDate(this.visibleData[idx].visit_date);
      }
    }
    return "NotDefined";
  },
  
  getFirstLabel: function(item){
    var label = item.label;
    if(label){
    }else if(item.children){
      return this.getFirstLabel(item.children[0]);
    }
    return label;
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
    item.isFolded = true;
    var selfRow=(item.hidden||top)?0:1;
    if(!item.hidden && !top){
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
    this.treeBox.rowCountChanged(idx + selfRow, selfRow);
    return offset;
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
      this.expandFromNodeInTree(item, idx, true);
			if(findNext){
				this.findNext(idx);
			}
    }  
    this.treeBox.invalidateRow(idx);
  },
  
  getImageSrc: function(idx, column) {
    var vis = this.visibleData;
    if(column.id == "element") {
  		return vis[idx].icon;
  	} else {
			return "";
		}
  },
  
  getProgressMode : function(idx,column) {},  
  getCellValue: function(idx, column) {},  
  cycleHeader: function(col, elem) {},  
  selectionChanged: function() {},  
  cycleCell: function(idx, column) {},  
  performAction: function(action) {}
}};
	
  pub.init = function(main){
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
