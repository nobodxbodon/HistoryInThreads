//independent of searching/treeview or recommendation
com.wuxuan.fromwheretowhere.historyQuery = function(){
//const {Cc,Ci} = require("chrome");

  var pub={};
  
  //sqlite operations:

  pub.openPlacesDatabase = function(){
    var db = Components.classes["@mozilla.org/browser/nav-history-service;1"].  
                      getService(Components.interfaces.nsPIPlacesDatabase).DBConnection;  
    return db;
  };

  pub.mDBConn = pub.openPlacesDatabase();
  pub.ios = Components.classes["@mozilla.org/network/io-service;1"].
	        getService(Components.interfaces.nsIIOService);
  pub.fis = Components.classes["@mozilla.org/browser/favicon-service;1"].
          getService(Components.interfaces.nsIFaviconService);
  
  
  pub.histServ =
  	Components.classes["@mozilla.org/browser/nav-history-service;1"].
  	getService(Components.interfaces.nsINavHistoryService);

  pub.getAllVisits = function(searchterm, time){
  	console.log("get visits by words:"+searchterm);
  	var opts = pub.histServ.getNewQueryOptions();
	var query = pub.histServ.getNewQuery();
	query.absoluteBeginTime = time.since;
	query.absoluteEndTime = time.till;
	
	var result = pub.histServ.executeQuery(query, opts);
    
    // Using the results by traversing a container
	// see : https://developer.mozilla.org/en/nsINavHistoryContainerResultNode
	var cont = result.root;
    cont.containerOpen = true;
	var mapIcon = {};
	for (var i = 0; i < cont.childCount; i ++) {

    	var node = cont.getChild(i);
	
    	// "node" attributes contains the information (e.g. URI, title, time, icon...)
   		// see : https://developer.mozilla.org/en/nsINavHistoryResultNode
    	//console.log(node.icon+" "+node.uri+" "+node.title);
		mapIcon[node.uri]=node.icon;
	}
	
	var mapTerm = {};
	//get nodes with searchterm
    if(searchterm!=""){
    var query2 = pub.histServ.getNewQuery();
	query2.absoluteBeginTime = time.since;
	query2.absoluteEndTime = time.till;
    query2.searchTerms=searchterm;
    var withTerm = pub.histServ.executeQuery(query2, opts);
    
	//get those with term
	cont = withTerm.root;
    cont.containerOpen = true;
	for (var i = 0; i < cont.childCount; i ++) {

    	var node = cont.getChild(i);
	
    	// "node" attributes contains the information (e.g. URI, title, time, icon...)
   		// see : https://developer.mozilla.org/en/nsINavHistoryResultNode
    	//console.log(node.icon+" "+node.uri+" "+node.title);
		mapTerm[node.time]=true;
	}
	
    // Close container when done
    // see : https://developer.mozilla.org/en/nsINavHistoryContainerResultNode
    cont.containerOpen = false;
    }
    
    console.log("in getAllVisits, time:"+JSON.stringify(time));
  	var visits = [];
  	var range = pub.buildPeriodTerm(time, 'hv.visit_date');
  	if(range!="")
  		range=" where "+range;
  	var term = "SELECT hv.id, hv.from_visit, hv.place_id, hv.visit_date, hv.visit_type, p.url, p.title FROM moz_historyvisits hv join moz_places p on hv.place_id=p.id" + range + " order by hv.visit_date desc";
  	console.log("search term:"+term);
  	var statement = pub.mDBConn.createStatement(term);
    try {
      while (statement.executeStep()) {
		var visit={};
		visit.id=statement.getInt32(0);
		visit.from_visit=statement.getInt32(1);
		visit.placeId=statement.getInt32(2);
		visit.visit_date=statement.getInt64(3);
		visit.visit_type=statement.getInt32(4);
		visit.url=statement.getString(5);
		visit.icon=mapIcon[visit.url];
		visit.hasSearchTerm=mapTerm[visit.visit_date];
		visit.label=statement.getString(6);
		//console.log(JSON.stringify(visit));
		visits.push(visit);
      }
      statement.reset();
      console.log("visit num:"+visits.length);
      return visits;  
    } 
    catch (e) {
      console.log("error in getAllvisits:"+JSON.stringify(e));
      statement.reset();
    }
  };
  
  pub.buildPeriodTerm = function(time, field){
  	var term = "";
  	if(time.since!=-1){
  		term+=field+">="+time.since;
  	}
  	if(time.till!=Number.MAX_VALUE){
  		term+=" AND "+field+"<="+time.till;
  	}
  	return term;
  };
  
  /* for latest visits ordered by latest first, walk them from the earliest, add it to the node based on from_visit, order by visit time*/
  pub.getThreads = function(searchterm, time){
    var visits = pub.getAllVisits(searchterm, time);
	var mapId = {};
	var tops = [];
	var visit = null;
	var visitAfter = null;
  	for(var i=visits.length-1;i>=0;i--){
  	  visit = visits[i];
  	  //check if the visit after is redirect: 5- perm redirect; 6- temp
  	  // skip them
  	  if(i>=1){
  	  	visitAfter = visits[i-1];
  	  	if(visitAfter.visit_type==5 || visitAfter.visit_type==6){
  	  	//i--,visitAfter = visits[i-1])
  	  		//console.log(visitAfter.id+"<-"+visitAfter.from_visit+" to "+visitAfter.id+"<-"+visit.from_visit);
  	  		visitAfter.from_visit=visit.from_visit;
  	  		continue;
  	  	}
  	  }
  	  
  	  //if follow a link, visit_type=1
  	  var fromVisit = mapId[visit.from_visit];
  	  //console.log("fromVisit:"+fromVisit);
  	  if(fromVisit!=null){
  	    visit.level=fromVisit.level+1;
  	    fromVisit.isContainer=true;
  	  	if(fromVisit.children==null)
  	  	  fromVisit.children=[];
  	    fromVisit.children.push(visit);
  	  }//otherwise 2 - type/autocomplate; 3 - click on bookmark; 4 - embedded url
  	  else{
  	  	//console.log(visit);
  	    visit.level=0;
  	    tops.push(visit);
  	  }
  	  //add to visit_id
  	  mapId[visit.id]=visit;
  	}
  	//TODO: remove those without keywords (marked by flag)
  	if(searchterm!=""){
  	  for(var i=0;i<tops.length;i++){
  	    if(!pub.hasSearchTerm(tops[i])){
  	      console.log("remove:"+tops[i].label);
    	  tops.splice(i,1);
    	  i--;
  		}
  	  }
  	}
  	return tops;
  };
  
  pub.hasSearchTerm=function(node){
    if(node.hasSearchTerm)
      return true;
    else if(node.children==null || node.children.length==0)
      return false;
    else{
      var children = node.children;
      for(var i=0;i<children.length;i++){
        if(pub.hasSearchTerm(children[i]))
          return true;
      }
    }
    return false;
  };
  
  pub.getImagefromUrl = function(url, item){
    try{
      var uri = pub.ios.newURI(url, null, null);
      pub.fis.getFaviconURLForPage(
          uri, { onComplete: function (aURI, aDataLen, aData, aMimeType) {
            item.style.listStyleImage =
              'url("' + pub.fis.getFaviconLinkForIcon(aURI).spec + '")';
          }});
      //return pub.fis.getFaviconImageForPage(uri).spec;
    }catch(e){
      //alert(url);
      return null;
    }
  };
  
  
  // Main Datastructure for each Node
  pub.ReferedHistoryNode = function(id, placeId, label, url, isContainer, isFolded, children, level) {
    var obj = new Object();
		//id should be visitId, as moz.historyvisits.id
    obj.id = id;
    obj.placeId = placeId;
    obj.label = label;
    obj.url = url;
    obj.isContainer = isContainer;
    obj.isFolded = isFolded;
    obj.children = children;
    obj.level = level;
    return obj;
  };
  
  
  return pub;
}();