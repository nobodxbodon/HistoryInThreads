// save to local .sqlite, support management (query, delete, rename, etc.)
  
com.wuxuan.fromwheretowhere.localmanager = function(){
  var pub={};
  
  pub.LOCALRECORDFILE = "fwtw_local_record.sqlite";
  pub.RECORDTABLENAME = "localRecord_0_20_0";
  
  pub.getBrowserWindow = function(){
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]  
                   .getService(Components.interfaces.nsIWindowMediator);  
    var enumerator = wm.getEnumerator("navigator:browser");
    var i = 0;
    while(enumerator.hasMoreElements()) {  
      var win = enumerator.getNext();  
      if(win==pub.mainWindow){
        alert("the top windows is a browser for sure!");
      }else{
        alert(i++);
      }
    }
  };

  pub.localRecord = function(){
    var file = Components.classes["@mozilla.org/file/directory_service;1"]  
                      .getService(Components.interfaces.nsIProperties)  
                      .get("ProfD", Components.interfaces.nsIFile);  
    file.append(pub.LOCALRECORDFILE);  
   
    var storageService = Components.classes["@mozilla.org/storage/service;1"]  
                         .getService(Components.interfaces.mozIStorageService);  
    return storageService.openDatabase(file);
  }();
  
  //for now no automatic merging. No checking for duplicate content (json). 
  pub.addRecord = function(type, name, url, term, currenturi, content, date){
    var q = "INSERT INTO " + pub.RECORDTABLENAME + "(type, name, url, searchterm, currentURI, content, savedate) VALUES (:type, :name, :url, :term, :currenturi, :content, :date)";
    var statement = pub.localRecord.createStatement(q);
    statement.params.type = type;
    statement.params.name = name;
    statement.params.content = content;
    statement.params.url = url;
    statement.params.date = date;
    //alert("statement done");
    if(term!=""){
      statement.params.term = term;
    } else if(currenturi!=""){
      statement.params.currenturi = currenturi;
    }
    
    try {
      statement.executeStep();
      return 0;
    } 
    catch (e) {
      alert("Add record failed. Sorry don't know why yet.");
      statement.reset();
      return -1;
    }
  };
  
  //delete >1
  pub.deleteRecords = function(recordIds){
  	var pids="";
    var lastIdx=recordIds.length-1;
		for(var i=0;i<recordIds.length;i++){
			pids+= recordIds[i];
			if(i!=lastIdx){
				pids+=",";
			}
		}
    var str = "DELETE FROM " + pub.RECORDTABLENAME + " WHERE rowid IN ("+pids+")";
    
    var statement = pub.localRecord.createStatement(str);
    try {
      statement.executeStep();
    } 
    catch (e) {
      alert("delete record exception!");
      statement.reset();
    }
  };
		
  
  pub.queryAll = function(){
    var statement = pub.localRecord.createStatement("SELECT rowid,* from " + pub.RECORDTABLENAME);
    var items = [];
    try {
      while (statement.executeStep()) {
        var item = {};
        item.id = statement.getInt64(0);
        item.name = statement.getString(2);
        item.url = statement.getString(3);
        item.date = statement.getInt64(7);
        items.push(item);
      }
      statement.reset();
      return items;  
    } 
    catch (e) {
      statement.reset();
    }
  };
  
  pub.getNodesRawfromURI = function(uri){
    var statement = pub.localRecord.createStatement("SELECT content from " + pub.RECORDTABLENAME + " where content LIKE '%" + uri + "%'");
    var nodes = [];
    try {
      while (statement.executeStep()) {
        nodes.push(statement.getString(0));
      }
      statement.reset();
      return nodes;  
    } 
    catch (e) {
      statement.reset();
    }
  };
  
  pub.searchNotesbyKeywords = function(words, optional, excluded, site){
		//add site filter
		var term = pub.RECORDTABLENAME;
		if(site.length!=0){
      for(var i = site.length-1; i>=0; i--){
        term = "(SELECT content FROM " + term + " WHERE content LIKE '%" + site[i] + "%')";
      }
    }

    if(words.length!=0){
      for(var i = words.length-1; i>=0; i--){
        var partTerm = pub.utils.getRightQuote(words[i]);
        if(i==words.length-1){
          term = "SELECT content FROM " + term + " WHERE content LIKE "+partTerm;//'%" + words[i] + "%'";
        } else if(i!=0){
          term = "SELECT content FROM (" + term + ") WHERE content LIKE "+partTerm;//'%" + words[i] + "%'";
        }
      }
    }
    
    var optionalTerm = "";
		for(var i=0;i<optional.length;i++){
      var partTerm = pub.utils.getRightQuote(optional[i]);
			if(i==0){
				optionalTerm+=" content LIKE "+partTerm;//'%" + optional[i] + "%'"
			}else{
				optionalTerm+=" OR content LIKE "+partTerm;//'%" + optional[i] + "%'"
			}
		}
    if(optional.length>0)
      term = "SELECT content FROM (" + term + ") WHERE" + optionalTerm;
    
    //alert(term);
    var statement = pub.localRecord.createStatement(term);
    var nodes = [];
    try {
      while (statement.executeStep()) {
        //decode, walk through each node for confirmation
        var str = statement.getString(0);
        //alert(str);
        var maybeNotes = JSON.parse(str);
        nodes = nodes.concat(maybeNotes);//(pub.walkAll(maybeNotes, words, excluded, site));
      }
      
      statement.reset();
      return pub.filterTree(nodes, words, optional, excluded, site);  
    } 
    catch (e) {
      statement.reset();
    }
  };
  
  pub.getNodeContent = function(rowid){
    var statement = pub.localRecord.createStatement("SELECT content from " + pub.RECORDTABLENAME + " where rowid=" + rowid);
    try {
      if (statement.executeStep()) {
        return statement.getString(0);
      }
      statement.reset();
      return items;  
    } 
    catch (e) {
      statement.reset();
    }
  };
  
	//walk and search through node, TODO: more generic
	//RM flag: remove or not
  //TODO: index to speed up
  pub.walkAll = function(maybes, words, optional, excluded, site){
		var matches = [];
    for(var i in maybes){
      if(pub.walkNode(maybes[i], words, optional, excluded, site).length!=0){
        matches.push(maybes[i]);
      }
    }
    return matches;
  };
  
	pub.matchQuery = function(maybe, label, url, words, optional, excluded, site){
		for(var s in site){
      if(url.indexOf(site[s])==-1){
        return false;
      }
    }
		if(site.length>0)
			maybe.inSite=true;
		for(var w in words){
      if(label.indexOf(words[w])==-1){
        return false;
      }
    }
    var i=0;
    for(;i<optional.length;i++){
      if(label.indexOf(optional[i])>-1){
        return true;
      }
    }
    if(i==optional.length && i!=0)
      return false;
    for(var e in excluded){
      if(label.indexOf(excluded[e])!=-1){
        return false;
      }
    }
		return true;
	};
	
  //indexOf is case-sensitive!
  pub.walkNode = function(maybe, words, optional, excluded, site){
    if(maybe.label){
			var label = maybe.label.toLowerCase();
			var url = maybe.url.toLowerCase();
			//just to check keywords match
			if(!pub.matchQuery(maybe, label, url, words, optional, excluded, site)){
				return pub.walkAll(maybe.children, words, optional, excluded, site);
			}else{
				maybe.haveKeywords = true;
				pub.walkAll(maybe.children, words, optional, excluded, site);
				return [].push(maybe);
			}
		}else{
			return pub.walkAll(maybe.children, words, optional, excluded, site);
		}
  };
	
	//return the subtrees that are inSite
	//TODO: fix - isContainer wrong for "gbrowser site:google"
	pub.filterSiteFromLocal = function(nodes){
		var haveKeyWords=false;
		for(var i=0; i<nodes.length; i++){
			var after = pub.filterSiteFromLocal(nodes[i].children);
			if(!nodes[i].inSite){
				nodes.splice(i,1);
				i--;
				pub.filtered=pub.filtered.concat(after);
			}else {
				nodes[i].children = after;
				//sync with isContainer to avoid phantom container (expandable but empty)
				if(after.length==0){
					nodes[i].isContainer = false;
				}
			}
		}
		return nodes;
	};
	
	//depth searching, return whether there's a leaf having keywords in tree
	pub.haveKeywordsInTree = function(node){
		if(node.haveKeywords)
			return true;
		var haveKeywords = false;
		for(var i in node.children){
			haveKeywords = pub.haveKeywordsInTree(node.children[i]);
			if(haveKeywords)
				return true;
		}
		return haveKeywords;
	};
  
  pub.filterTree = function(maybeNodes, words, optional, excluded, site){
    var filtered = [];
    for(var w in words){
			words[w] = words[w].toLowerCase();
		}
    for(var o in optional){
			optional[o] = optional[o].toLowerCase();
		}
		for(var e in excluded){
			excluded[e] = excluded[e].toLowerCase();
		}
		for(var s in site){
			site[s] = site[s].toLowerCase();
		}
		var localNodes = pub.walkAll(maybeNodes, words, optional, excluded, site);
		//UGLY way to filter those within site, TOOPT later~~
		if(site.length>0){
			pub.filtered = [];
			localNodes = pub.filterSiteFromLocal(localNodes);
			localNodes=localNodes.concat(pub.filtered);
		}
		for(var i in localNodes){
			//only add those that have >0 leaf that has keywords
			if(pub.haveKeywordsInTree(localNodes[i]))
				filtered.push(localNodes[i]);
		}
    return filtered;
  }
  
  //built-in rowid, can't guarantee same order as savedate, if renaming is allowed
  pub.init = function(){
    pub.utils = com.wuxuan.fromwheretowhere.utils;
    //TODO: add pre-processing to check table from former version if format changes
    var statement = pub.localRecord.createStatement("CREATE TABLE IF NOT EXISTS " + pub.RECORDTABLENAME + "(type INTEGER, name STRING, url STRING, searchterm STRING, currentURI STRING, content STRING, savedate INTEGER)");
    try {
      if (statement.executeStep()) {
        //alert("table opened");
      }
      statement.reset();
    } 
    catch (e) {
      alert(e);
      statement.reset();
    }
  };
  
  return pub;
}();

