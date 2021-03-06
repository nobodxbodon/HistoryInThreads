//independent of searching/treeview or recommendation
com.wuxuan.fromwheretowhere.historyQuery = function(){

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
  
  pub.histServ =
  	Components.classes["@mozilla.org/browser/nav-history-service;1"].
  	getService(Components.interfaces.nsINavHistoryService);
  
  pub.updateVisitIcons = function(time){
    pub.mapIcon={};
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
		pub.mapTerm[node.time]=true;
	}
	
    // Close container when done
    cont.containerOpen = false;
    }
  };
  
  pub.updateVisitsInRange = function(time){
  
  	var visits = [];
  	var range = pub.buildPeriodTerm(time, 'hv.visit_date');
  	if(range!="")
  		range=" where "+range;
  	var term = "SELECT hv.id, hv.from_visit, hv.place_id, hv.visit_date, hv.visit_type, p.url, p.title FROM moz_historyvisits hv join moz_places p on hv.place_id=p.id" + range + " order by hv.visit_date desc";
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
		visits.push(visit);
      }
      statement.reset();
    } 
    catch (e) {
      statement.reset();
    }
    
    //update tree, return top nodes
    var mapId = {};
	pub.tops = [];
	var visit = null;
	var visitAfter = null;
  	for(var i=visits.length-1;i>=0;i--){
  	  visit = visits[i];
  	  
  	  //TODO: just need to assign to those with searchterm
  	  visit.icon=pub.mapIcon[visit.url];
  	  
  	  //if follow a link, visit_type=1
  	  var fromVisit = mapId[visit.from_visit];
  	  if(fromVisit!=null){
  	    fromVisit.isContainer=true;
  	  	if(fromVisit.children==null)
  	  	  fromVisit.children=[];
  	    fromVisit.children.push(visit);
  	  }//otherwise 2 - type/autocomplate; 3 - click on bookmark; 4 - embedded url
  	  else{
  	    visit.level=0;
  	    pub.tops.push(visit);
  	  }
  	  //add to visit_id
  	  mapId[visit.id]=visit;
  	}
  	
  	//go through all top nodes and mark hidden
  	
  	for(var i=0;i<pub.tops.length;i++){
  	  var top = pub.tops[i];
  	  pub.hideRedirection(top);
  	  
  	  //fix: there are top nodes going to redirect immediately: top node always shown
  	  top.hidden=false;
  	  pub.setLevel(top,-1);
  	  
  	}
  };
  
  pub.hideRedirection=function(node){
    var children = node.children;
    if(children){
      for(var i=0;i<children.length;i++){
        if(pub.hideRedirection(children[i])){
          node.hidden=true;
        }
      }
    }
    
    if(node.visit_type==5 || node.visit_type==6)
      return true;
    return false;
  };
  
  pub.setLevel=function(node, level){
    if(node.hidden){
      node.level=level;
    }else{
      node.level=level+1;
    }
    var children = node.children;
    if(children){
      for(var i=0;i<children.length;i++){
        pub.setLevel(children[i], node.level);
      }
    }
  };
  
  pub.includePeriod = function(small, large){
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
    var startTime = new Date();
    var time=pub.getTime(period);
  	var i=0;
  	for(;i<pub.currentPeriod.length;i++){
  	  if(pub.includePeriod(period,pub.currentPeriod[i])){
  	    break;
  	  }
  	}
  	// when search term differs from last OR period changes, update items that have search terms 
  	if(searchterm!=pub.lastSearchterm || i==pub.currentPeriod.length){
  		pub.updateSearchResult(searchterm, time);
  	  pub.lastSearchterm=searchterm;
  	}
  	  
  	if(i==pub.currentPeriod.length){
  	  pub.updateVisitIcons(time);
  	  pub.currentPeriod.push(period);
  	  
  	}
  	
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
    for(var i=0;i<pub.expanded.length;i++){
      pub.expanded[i].isFolded=false;
    }
    pub.expanded=[];
		var tops = [];
  	//TODO: remove those without keywords (marked by flag)
  	if(searchterm!=""){
  	  for(var i=0;i<pub.tops.length;i++){
  	    if(pub.hasSearchTerm(pub.tops[i])){
    	  tops.push(pub.tops[i]);
  		}
  	  }
  	}else{
  	  for(var i=0;i<pub.tops.length;i++){
  	  	tops.push(pub.tops[i]);
  	  }
  	}
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
  
  
  
  return pub;
}();