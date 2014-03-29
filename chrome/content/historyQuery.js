//independent of searching/treeview or recommendation
com.wuxuan.fromwheretowhere.historyQuery = function(){
//const {Cc,Ci} = require("chrome");

  var pub={};
  
  
  pub.DAYTIME=(24*60*60*1000000);
  
  pub.TODAY = 'today';
  pub.YESTERDAY = 'yesterday';
  pub.LAST7DAYS = 'last7days';
  pub.THISMONTH = 'thismonth';
  pub.THISYEAR = 'thisyear';
  pub.ALL = 'all';
  
  pub.lastPeriod = null;
  //save all the periods that got mapped icon
  pub.currentPeriod=[];
  pub.lastSearchterm = null;
  
  //map: uri -> icon
  pub.mapIcon = {};
  //map: visit_date -> if this visit has specified search term
  pub.mapTerm = {};
  //no need to update pub.tops if pub.visits stay the same, maybe no need for pub.visits
  pub.visits = [];
  pub.tops = [];
  
  pub.expanded = [];
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
  
  pub.updateVisitIcons = function(time){
    pub.mapIcon={};
    //console.log("updateVisitIcons:"+time);
  	var opts = pub.histServ.getNewQueryOptions();
	var query = pub.histServ.getNewQuery();
	query.absoluteBeginTime = time.since;
	query.absoluteEndTime = time.till;
	
	var result = pub.histServ.executeQuery(query, opts);
    
    // Using the results by traversing a container
	// see : https://developer.mozilla.org/en/nsINavHistoryContainerResultNode
	var cont = result.root;
    cont.containerOpen = true;
	for (var i = 0; i < cont.childCount; i ++) {

    	var node = cont.getChild(i);
	
    	// "node" attributes contains the information (e.g. URI, title, time, icon...)
   		// see : https://developer.mozilla.org/en/nsINavHistoryResultNode
    	//console.log(node.icon+" "+node.uri+" "+node.title);
		pub.mapIcon[node.uri]=node.icon;
	}
	
    // Close container when done
    cont.containerOpen = false;
  }
  
  pub.updateSearchResult = function(searchterm, time){
    pub.mapTerm = {};
  	var opts = pub.histServ.getNewQueryOptions();
	
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
    	//console.log(node.icon+" "+node.uri+" "+node.title);
		pub.mapTerm[node.time]=true;
	}
	
    // Close container when done
    cont.containerOpen = false;
    }
  };
  
  pub.updateVisitsInRange = function(time){
  
  	pub.visits = [];
  	var range = pub.buildPeriodTerm(time, 'hv.visit_date');
  	if(range!="")
  		range=" where "+range;
  	var term = "SELECT hv.id, hv.from_visit, hv.place_id, hv.visit_date, hv.visit_type, p.url, p.title FROM moz_historyvisits hv join moz_places p on hv.place_id=p.id" + range + " order by hv.visit_date desc";
  	//console.log("search term:"+term);
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
		visit.label=statement.getString(6);
		//console.log(JSON.stringify(visit));
		pub.visits.push(visit);
      }
      statement.reset();
      //console.log("visit num:"+pub.visits.length);
    } 
    catch (e) {
      console.log("error in getAllvisits:"+JSON.stringify(e));
      statement.reset();
    }
    
    //update tree, return top nodes
    var mapId = {};
	pub.tops = [];
	var visit = null;
	var visitAfter = null;
	//console.log("getThreads visits length:"+pub.visits.length);
  	for(var i=pub.visits.length-1;i>=0;i--){
  	  visit = pub.visits[i];
  	  
  	  //TODO: just need to assign to those with searchterm
  	  visit.icon=pub.mapIcon[visit.url];
  	  
  	  //check if the visit after is redirect: 5- perm redirect; 6- temp
  	  // skip them
  	  if(i>=1){
  	  	visitAfter = pub.visits[i-1];
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
  	    pub.tops.push(visit);
  	  }
  	  //add to visit_id
  	  mapId[visit.id]=visit;
  	}
  	//console.log("after constructing trees:"+pub.tops.length);
  };
  
  pub.includePeriod = function(small, large){
    //console.log("check include:"+small+"<"+large);
    if(small==large)
      return true;
    else if(small==pub.TODAY && (large==pub.LAST7DAYS || large==pub.THISMONTH || large==pub.THISYEAR || large==pub.ALL))
      return true;
    else if(small==pub.YESTERDAY && (large==pub.LAST7DAYS || large==pub.ALL))
      return true;
    else if((small==pub.LAST7DAYS || small==pub.THISMONTH || small==pub.THISYEAR) && large==pub.ALL)
      return true;
    else if(small==pub.THISMONTH && large==pub.THISYEAR)
      return true;
    else
      return false;
  };
  
  
  pub.getAllVisits = function(searchterm, period){
    var time=pub.getTime(period);
	var fUpdateIcon = pub.needUpdateIcon(period);
  	//console.log("get visits by words:"+searchterm+" during:"+time);
  	var i=0;
  	for(;i<pub.currentPeriod.length;i++){
  	  if(pub.includePeriod(period,pub.currentPeriod[i])){
  	    break;
  	  }
  	}
  	//console.log(searchterm+"?="+pub.lastSearchterm);
  	// when search term differs from last OR period changes, update items that have search terms 
  	if(searchterm!=pub.lastSearchterm || i==pub.currentPeriod.length){
  	  pub.updateSearchResult(searchterm, time);
  	  pub.lastSearchterm=searchterm;
  	}
  	  
  	if(i==pub.currentPeriod.length){
  	  
  	  pub.updateVisitIcons(time);
  	  pub.currentPeriod.push(period);
  	  
  	}
  	
    //console.log("in getAllVisits, time:"+JSON.stringify(time)+" "+period+" "+pub.lastPeriod);
    //don't update visits unless period changes
    if(period==pub.lastPeriod)
      return;
  	else {
  	  //update the period
  	  pub.lastPeriod = period;
  	  pub.updateVisitsInRange(time);
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
  
  
  pub.getTime = function(period) {
  	//console.log("start getTime:"+period);
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
  	return p;
  };
  
  pub.needUpdateIcon = function(period) {
  
  }
  pub.getTodayStartTime = function() {
  	var now=new Date();
  	var hour = now.getHours();
	var milli = now.getMilliseconds();
    var min = now.getMinutes();
    var sec = now.getSeconds();
    return (now-((60*hour+min)*60+sec)*1000+milli)*1000;
  };
  
  
  /* for latest visits ordered by latest first, walk them from the earliest, add it to the node based on from_visit, order by visit time*/
  pub.getThreads = function(searchterm, time){
    pub.getAllVisits(searchterm, time);
    //console.log("fold nodes:"+pub.expanded.length);
    for(var i=0;i<pub.expanded.length;i++){
      //console.log("fold:"+pub.expanded[i].label);
      pub.expanded[i].isFolded=false;
    }
    pub.expanded=[];
	var tops = [];
  	//TODO: remove those without keywords (marked by flag)
  	if(searchterm!=""){
  	  for(var i=0;i<pub.tops.length;i++){
  	    if(pub.hasSearchTerm(pub.tops[i])){
  	      //console.log("remove:"+tops[i].label);
    	  tops.push(pub.tops[i]);
  		}
  	  }
  	}else{
  	  for(var i=0;i<pub.tops.length;i++){
  	  	tops.push(pub.tops[i]);
  	  }
  	}
  	//alert("after filter by search term");
  	return tops;
  };
  
  pub.hasSearchTerm=function(node){
	var hasSearchTerm=pub.mapTerm[node.visit_date];
    if(hasSearchTerm)
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