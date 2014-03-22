//independent of searching/treeview or recommendation
//com.wuxuan.fromwheretowhere.historyQuery = function(){
const {Cc,Ci} = require("chrome");

  var pub={};
  
  //sqlite operations:

  pub.openPlacesDatabase = function(){
    var db = Cc["@mozilla.org/browser/nav-history-service;1"].  
                      getService(Ci.nsPIPlacesDatabase).DBConnection;  
    return db;
  };

  pub.mDBConn = pub.openPlacesDatabase();
  pub.ios = Cc["@mozilla.org/network/io-service;1"].
	        getService(Ci.nsIIOService);
  pub.fis = Cc["@mozilla.org/browser/favicon-service;1"].
          getService(Ci.nsIFaviconService);
  
  pub.getAllVisits = function(){
      console.log("in getAllVisits");
  	var visits = [];
  	var statement = pub.mDBConn.createStatement("SELECT hv.id, hv.from_visit, hv.place_id, hv.visit_date, hv.visit_type, p.url, p.title FROM moz_historyvisits hv join moz_places p on hv.place_id=p.id order by hv.visit_date desc limit 43");
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
		console.log(JSON.stringify(visit));
		visits.push(visit);
      }
      statement.reset();
      console.log("visit num:"+visits.length);
      return visits;  
    } 
    catch (e) {
      statement.reset();
    }
  };
  
  /* for latest visits ordered by latest first, walk them from the earliest, add it to the node based on from_visit*/
  pub.getThreads = function(visits){
	var mapId = {};
	var tops = [];
  	for(var i=visits.length-1;i>=0;i--){
  	  var visit = visits[i];
  	  var fromVisit = mapId[visit.from_visit];
  	  if(fromVisit!=null){
  	    visit.level=fromVisit.level+1;
  	    fromVisit.isContainer=true;
  	  	if(fromVisit.children==null)
  	  	  fromVisit.children=[];
  	    fromVisit.children.push(visit);
  	  }else{
  	    visit.level=0;
  	    tops.push(visit);
  	  }
  	  //add to visit_id
  	  mapId[visit.id]=visit;
  	}
  	return tops;
  };
  
  /*type = 32, getInt32; type = 64, getInt64; type = "str", getString */
  pub.queryAll = function(statement, type, idx) {
    var children = [];
    try {
      while (statement.executeStep()) {
	if(type == "str") {
	  children.push(statement.getString(idx));
	} else if(type == 32){
	  children.push(statement.getInt32(idx));
	} else if(type == 64){
	  children.push(statement.getInt64(idx));
	} else {
	  alert("wrong type: " + type);
	}
      }
      statement.reset();
      return children;  
    } 
    catch (e) {
      statement.reset();
    }
  };
  
  /*type = 32, getInt32; type = 64, getInt64; type = "str", getString */
  pub.queryOne = function(statement, type, idx) {
    var id = null;
    try {
      if (statement.executeStep()) {
	if(type == "str") {
	  if(statement.getIsNull(idx)){
	    id = "";
	  }else{
	    id = statement.getString(idx);
	  }
	} else if(type == 32){
	  id = statement.getInt32(idx);
	} else if(type == 64){
	  id = statement.getInt64(idx);
	} else {
	  alert("wrong type: " + type);
	}
	statement.reset();
	return id;
      }
    } 
    catch (e) {
      statement.reset();
    }
  };
  
  pub.getNumOfPid = function(){
    var statement = pub.mDBConn.createStatement("SELECT count(id) FROM moz_places");
    try{
      statement.params.pid=pid;
    }catch(err){
      console.log(err);
    }
    return pub.queryAll(statement, 32, 0);
  };

  //linear search in array, may improve if in order
  pub.addInArrayNoDup = function(pid, ls){
    if(ls.indexOf(pid)==-1){
      ls.push(pid);
    }
    return ls;
  };
	
	pub.getAllChildrenfromAllPlaceId = function(placeIds) {
		var pids="";
		var lastIdx=placeIds.length-1;
		for(var i=0;i<placeIds.length;i++){
			pids+= placeIds[i];
			if(i!=lastIdx){
				pids+=",";
			}
		}
		//if add DISTINCT can cost >100x in some cases...not sure why
		var term = "SELECT place_id FROM moz_historyvisits, (SELECT id FROM moz_historyvisits where place_id IN ("+pids+")) as ids where from_visit>=ids.id and from_visit<(SELECT id FROM moz_historyvisits where id>ids.id limit 1)";
		//alert(term);
		var statement = pub.mDBConn.createStatement(term);
    return pub.queryAll(statement, 32, 0);
	};
	
	//ids: intermediate table for id that's for placeId; get place_id that has from_visit is in range of ids.id and the first id that's >ids.id
	pub.getAllChildrenfromPlaceId = function(placeId, query) {
		var term = "SELECT DISTINCT place_id FROM moz_historyvisits, (SELECT id FROM moz_historyvisits where place_id=:pid) as ids where from_visit>=ids.id and from_visit<(SELECT id FROM moz_historyvisits where id>ids.id limit 1)";
		if(query){
			if(query.site.length>0){
				term = pub.sqlStUrlFilter(term, query.site, false);
			}
			if(query.time.length>0){
				term = pub.sqlStTimeFilter(term, query.time, false);
			}
		}
		var statement = pub.mDBConn.createStatement(term);
		try{
      statement.params.pid=placeId;
    }catch(err){
      alert(err);
    }
    return pub.queryAll(statement, 32, 0);
  };
     
  pub.nodefromPlaceid = function(pid, query) {
    var potentialchildren = pub.getAllChildrenfromPlaceId(pid, query);
    var hasChildren = (potentialchildren!=null) && (potentialchildren.length>0);
    return pub.ReferedHistoryNode(null, pid, pub.getTitlefromId(pid), pub.getUrlfromId(pid), hasChildren, false, [], 0);
  };
       
  pub.nodefromPlaceidWithChildInfo = function(pid, hasChildren, query) {
    var actualThing = false;
	var potentialchildren = [];
	var label = pub.getTitlefromId(pid);
		//this has to be done because no one is above you doesn't tell if you have ones below
		if(label==null || label=="" || !hasChildren){
			potentialchildren = pub.getAllChildrenfromPlaceId(pid, query);
			actualThing = (potentialchildren!=null) && (potentialchildren.length>0);
			hasChildren = actualThing;
		}
	if(pub.DEBUG)
	  alert(label);
    return pub.ReferedHistoryNode(null, pid, label, pub.getUrlfromId(pid), hasChildren, false, [], 0);
  };
	
  pub.getIdfromUrl = function(url){
    var statement = pub.mDBConn.createStatement("SELECT id FROM moz_places where url=:url");
    if(!url) {
      return null;
    }
    statement.params.url=url;
    return pub.queryOne(statement, 32, 0);
  };
  
	pub.getTitleAndUrlfromId = function(id){
		var statement = pub.mDBConn.createStatement("SELECT title,url FROM moz_places where id=:id");
    statement.params.id=id;
		var rtn = {};
		try {
      if (statement.executeStep()) {
				rtn.title = statement.getString(0);
				rtn.url = statement.getString(1);
				statement.reset();
				return rtn;
      }
    } 
    catch (e) {
      statement.reset();
    }
	};
	
  pub.getUrlfromId = function(id){
    var statement = pub.mDBConn.createStatement("SELECT url FROM moz_places where id=:id");
    statement.params.id=id;
    return pub.queryOne(statement, "str", 0);
  };

	pub.getAllTitlefromIds = function(placeIds){
		var pids="";
		var lastIdx=placeIds.length-1;
		for(var i=0;i<placeIds.length;i++){
			pids+= placeIds[i];
			if(i!=lastIdx){
				pids+=",";
			}
		}
    var statement = pub.mDBConn.createStatement("SELECT DISTINCT title FROM moz_places where id IN ("+pids+") AND title!=''");
    return pub.queryAll(statement, "str", 0); 
  };
		
  pub.getNonEmptyTitlefromIds = function(placeIds){
	var pids="";
	  var lastIdx=placeIds.length-1;
	  for(var i=0;i<placeIds.length;i++){
		pids+= placeIds[i];
		if(i!=lastIdx){
			pids+=",";
		}
	}
	var term = "SELECT title FROM moz_places where id IN ("+pids+") AND title!='' LIMIT 1";
	if(pub.DEBUG)
	  alert(term);
    var statement = pub.mDBConn.createStatement(term);
    return pub.queryOne(statement, "str", 0); 
  };
  
  pub.getTitlefromId = function(id){
    var statement = pub.mDBConn.createStatement("SELECT title FROM moz_places where id=:id");
    statement.params.id=id;
    return pub.queryOne(statement, "str", 0); 
  };
  
  pub.getLastDatefromPid = function(pid){
    var statement = pub.mDBConn.createStatement("SELECT last_visit_date FROM moz_places where id=:pid");
    statement.params.pid=pid;
    return pub.queryOne(statement, 64, 0);
  };
  
  pub.getImagefromUrl = function(url){
    try{
      var uri = pub.ios.newURI(url, null, null);
      return pub.fis.getFaviconImageForPage(uri).spec;
    }catch(e){
      //alert(url);
      return null;
    }
  };
	
	pub.sqlStSiteFilter = function(term, site){
		if(site.length!=0){
      for(var i = site.length-1; i>=0; i--){
        term = "SELECT * FROM (" + term + ") WHERE URL LIKE '%" + site[i] + "%'";
      }
    }
		return term;
	};
	
	pub.sqlStExcludeFilter = function(term, excluded){
		if(excluded.length!=0){
      for(var i = excluded.length-1; i>=0; i--){
				// no proof to be faster to use conjunction (AND)
        term = "SELECT * FROM (" + term + ") WHERE TITLE NOT LIKE '%" + excluded[i] + "%'";
      }
    }
		return term;
	};
	
	pub.sqlStOptionalFilter = function(term, optional){
		var optionalTerm = "";
		for(var i=0;i<optional.length;i++){
			var partTerm = pub.utils.getRightQuote(optional[i]);
			if(i==0){
				optionalTerm+=" TITLE LIKE "+partTerm;//'%" + optional[i] + "%'"
			}else{
				optionalTerm+=" OR TITLE LIKE "+partTerm;//'%" + optional[i] + "%'"
			}
		}
		if(optional.length>0)
			optionalTerm = "SELECT * FROM (" + term + ") WHERE" + optionalTerm;
		else
		  optionalTerm = term;
		return optionalTerm;
	};
	
	pub.sqlStMustFilter = function(term, words){
		if(words.length==0){
			term = "SELECT id FROM (" + term + ")";
		}
    else if(words.length==1){
			var partTerm = pub.utils.getRightQuote(words[0]);
      term = "SELECT id FROM (" + term + ") WHERE TITLE LIKE "+partTerm;//'%" + words[0] + "%'";
    } else {
			var titleLike = "";
      for(var i = words.length-1; i>=0; i--){
				var partTerm = pub.utils.getRightQuote(words[i]);
				if(i==words.length-1){
          term = "SELECT * FROM (" + term + ") WHERE TITLE LIKE "+partTerm;//'%" + words[i] + "%'";
        } else if(i!=0){
          term = "SELECT * FROM (" + term + ") WHERE TITLE LIKE "+partTerm;//'%" + words[i] + "%'";
        } else {
          term = "SELECT id FROM (" + term + ") WHERE TITLE LIKE "+partTerm;//'%" + words[i] + "%'";
        }
				// no proof to be faster to use conjunction (AND)
      }
    }
		return term;
	};
	
	pub.selectIdandTitle = function(term){
		term = "SELECT id,title FROM moz_places where id IN ("+term+")";
		return term;
	};
	
  pub.searchIdbyKeywords = function(words, optional, excluded, site, time){
    //SELECT * FROM moz_places where title LIKE '%sqlite%';
    //NESTED in reverse order, with the assumption that the word in front is more frequently used, thus return more items in each SELECT
    var term = "moz_places";
		//alert("words: "+words+"\noptional: "+optional+"\nexcluded: "+excluded+"\nsite: "+site+"\ntime: "+time);
		//add site filter
		
		term = pub.sqlStSiteFilter(term, site);
		
		term = pub.sqlStExcludeFilter(term, excluded);
    
		term = pub.sqlStOptionalFilter(term, optional);
		
		term = pub.sqlStMustFilter(term, words);
		
		if(time.length>0){
			term = pub.sqlStTimeFilter(term, time, false);
			//for(var i = 0; i<time.length;i++)
			//	term = "SELECT place_id FROM moz_historyvisits where place_id in ("+term+") AND visit_date>="+time[i].since*1000+" AND visit_date<" + time[i].till*1000;
		}
		
		var oldTerm = pub.oldsearchIdbyKeywords(words, optional, excluded, site, time);
		if(term!=oldTerm){
			alert("new:\n"+term+"\n\n\nold:\n"+ oldTerm);
		}
		term = pub.selectIdandTitle(term);
		//alert(term);
    var statement = pub.mDBConn.createStatement(term);
		var rtn = {ids:[],titles:[]};
    try {
      while (statement.executeStep()) {
				rtn.ids.push(statement.getInt32(0));
				rtn.titles.push(statement.getString(1));
      }
      statement.reset();
    } 
    catch (e) {
      statement.reset();
    }
    return rtn;  
  };
	
	pub.oldsearchIdbyKeywords = function(words, optional, excluded, site, time){
    //SELECT * FROM moz_places where title LIKE '%sqlite%';
    //NESTED in reverse order, with the assumption that the word in front is more frequently used, thus return more items in each SELECT
    var term = "";
		
		//add site filter
		var siteTerm = "moz_places";

		if(site.length!=0){
      for(var i = site.length-1; i>=0; i--){
        siteTerm = "SELECT * FROM (" + siteTerm + ") WHERE URL LIKE '%" + site[i] + "%'";
      }
    }
		
		var excludeTerm = siteTerm;
    if(excluded.length!=0){
			var titleNotLike = "";
      for(var i = excluded.length-1; i>=0; i--){
				// no proof to be faster
        /*if(i==excluded.length-1){
					if(i!=0){
						titleNotLike = " TITLE NOT LIKE '%" + excluded[i] + "%' AND" + titleNotLike;
					}
        } else {*/
          excludeTerm = "SELECT * FROM (" + excludeTerm + ") WHERE" + titleNotLike + " TITLE NOT LIKE '%" + excluded[i] + "%'";
        //}
      }
    }
    
		//alert("optional:"+optional);
		var optionalTerm = "";
		for(var i=0;i<optional.length;i++){
			var partTerm = pub.utils.getRightQuote(optional[i]);
			if(i==0){
				optionalTerm+=" TITLE LIKE "+partTerm;//'%" + optional[i] + "%'"
			}else{
				optionalTerm+=" OR TITLE LIKE "+partTerm;//'%" + optional[i] + "%'"
			}
		}
		if(optional.length>0)
			optionalTerm = "SELECT * FROM (" + excludeTerm + ") WHERE" + optionalTerm;
		else
		  optionalTerm = excludeTerm;
		//alert(optionalTerm);
		
		if(words.length==0){
			term = "SELECT id FROM (" + optionalTerm + ")";
		}
    else if(words.length==1){
			var partTerm = pub.utils.getRightQuote(words[0]);
      term = "SELECT id FROM (" + optionalTerm + ") WHERE TITLE LIKE "+partTerm;//'%" + words[0] + "%'";
    } else {
			var titleLike = "";
      for(var i = words.length-1; i>=0; i--){
				var partTerm = pub.utils.getRightQuote(words[i]);
				if(i==words.length-1){
          term = "SELECT * FROM (" + optionalTerm + ") WHERE TITLE LIKE "+partTerm;//'%" + words[i] + "%'";
        } else if(i!=0){
          term = "SELECT * FROM (" + term + ") WHERE TITLE LIKE "+partTerm;//'%" + words[i] + "%'";
        } else {
          term = "SELECT id FROM (" + term + ") WHERE TITLE LIKE "+partTerm;//'%" + words[i] + "%'";
        }
				// no proof to be faster
				/*if(i!=0){
					titleLike = " title LIKE '%"+words[i]+"%' AND" + titleLike;
        } else {
          term = "SELECT id FROM (" + excludeTerm + ") WHERE" + titleLike +" TITLE LIKE '%" + words[i] + "%'";
        }*/
      }
    }
		
		if(time.length>0){
			term = pub.sqlStTimeFilter(term, time, false);
			//for(var i = 0; i<time.length;i++)
			//	term = "SELECT place_id FROM moz_historyvisits where place_id in ("+term+") AND visit_date>="+time[i].since*1000+" AND visit_date<" + time[i].till*1000;
		}
		return term;
  };
	
  //sqlite operations finish
	
	//add url filter for id, TODO: more general than id - moz_places
	//singular_table: true-singular, false-table
	pub.sqlStUrlFilter = function(term, sites, singular_table){
		var fterm = "";
		//var idx = sites.length-1;
		for(var i in sites){
			fterm = fterm + " AND url LIKE '%"+sites[i]+"%'";
			}
		if(singular_table)
			return "SELECT id FROM moz_places WHERE id=("+term+") AND url LIKE '%"+sites[i]+"%'" + fterm;
		else
			return "SELECT id FROM moz_places WHERE id in ("+term+") AND url LIKE '%"+sites[i]+"%'" + fterm;
	};

	//singular_table: true-singular, false-table
	pub.sqlStTimeFilter = function(term, times, singular_table){
		var fterm = "";
		//var idx = times.length-1;
		for(var i in times){
			var t = "";
			var fix = " AND visit_date";
			if(times[i].since!=-1){
				t = fix+">="+times[i].since*1000;
			}
			if(times[i].till!=Number.MAX_VALUE){
				t = t+fix+"<"+times[i].till*1000;
			}
			//if there's no restriction, leave the term as it was
			/*if(t==""){
				return term;
			}*/
		//	if(i==idx){
		//		}else{
			fterm = fterm + t;
		//	}
		}
		if(singular_table)
			return "SELECT DISTINCT place_id FROM moz_historyvisits WHERE place_id=("+term+ ")" + fterm;
		else
			return "SELECT DISTINCT place_id FROM moz_historyvisits WHERE place_id in ("+term+")" + fterm;
			
	};
	
	// add query restrictions to parents, time and site
  pub.getParentPlaceidsfromPlaceid = function(pid, query){
    //as id!=0, from_visit=0 doesn't matter
		if(pub.DEBUG)
			pub.querytime.tmp = (new Date()).getTime();
		var term = "SELECT place_id FROM moz_historyvisits \
					    where id IN (SELECT from_visit FROM moz_historyvisits where \
						place_id==:id)";
    var statement = pub.mDBConn.createStatement(term);
    statement.params.id=pid;
    var pids = pub.queryAll(statement, 32, 0);
		if(pub.DEBUG){
			pub.querytime.getParentEasyTime +=1;
			pub.querytime.getParentEasy += ((new Date()).getTime() - pub.querytime.tmp);
		}
		// IF there's no results, maybe it's inaccurate! REPEAT with range!
		//if(pid==10247)
    if(pids.length==0){
			if(pub.DEBUG)
				pub.querytime.tmp = (new Date()).getTime();
      var statement = pub.mDBConn.createStatement("SELECT from_visit FROM moz_historyvisits where \
						place_id=:id");
      statement.params.id=pid;
      var placeids = pub.queryAll(statement, 32, 0);
      if(placeids.length==0){
				return [];
      } else {
				var accPids=[];
				for(var i in placeids){
					if(placeids[i]==0)
						continue;
					var rangeStart = 0;
					var rangeEnd = 10;
					var initInterval = 10;
					//limit the range of "order by". Should break far before 10, just in case
					for(var j=0;j<10;j++){
						var fterm = "SELECT place_id FROM moz_historyvisits \
										where id<=:id-:start and id>:id-:end \
										order by id DESC limit 1";
						var statement1 = pub.mDBConn.createStatement(fterm);
						statement1.params.id=placeids[i];
						statement1.params.start=rangeStart;
						statement1.params.end=rangeEnd;
						var thispid = pub.queryOne(statement1, 32, 0);
						if(thispid){
							pids.push(thispid);
							break;
						}
						initInterval = initInterval * 2;
						rangeStart = rangeEnd;
						rangeEnd += initInterval;
					}
				}
      }
			if(pub.DEBUG){
				pub.querytime.getParentHardTime +=1;
				pub.querytime.getParentHard += ((new Date()).getTime() - pub.querytime.tmp);
			}
		}
		//fiter pid after all the keyword query
		if(query && (query.site.length>0 || query.time.length>0)){
			var filtered = [];
			for(var i in pids){
				var fterm = pids[i];
				if(query.site.length>0){
					fterm = pub.sqlStUrlFilter(fterm, query.site, true);
				}
				if(query.time.length>0){
					fterm = pub.sqlStTimeFilter(fterm, query.time, true);
				}
				var statement = pub.mDBConn.createStatement(fterm);
				var thispid = pub.queryOne(statement, 32, 0);
				if(thispid!=null){
					filtered.push(pids[i]);
				}
			}
			return filtered;
		}else{
			return pids;
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
  
  pub.clearReferedHistoryNode = function(node){
    for(var i in node.children){
      node.children[i] = pub.clearReferedHistoryNode(node.children[i]);
    }
    node.id = null;
		//placeid is not applicable across profiles, so don't use it for sharing at all!
		node.placeId = null;
		if(node.haveKeywords)
			node.haveKeywords = null;
		if(node.inSite)
			node.inSite = null;
    return node;
  };
  
  pub.allKnownParentPids = [];
  pub.DEBUG = false;
	pub.querytime = {};
	
	//return all the top ancesters of a placeid, and add to allKnownParents
  pub.OMGgetAllAncestorsfromPlaceid = function(pid, knownParentPids, parentNumber, query){
    var tops = [];
		var topPids = [];
    //if it's its own ancester, still display it
    if(knownParentPids.indexOf(pid)!=-1){
      if(parentNumber==1){
				var known = pub.utils.divInsert(pid, topPids);
				if(!known.exist)
					tops.push({pid:pid,knownParentPids:knownParentPids});
      }
    }else{
      var pParentPids = pub.getParentPlaceidsfromPlaceid(pid, query);
      if(pParentPids.length==0){
				var known = pub.utils.divInsert(pid, pub.allKnownParentPids);
				topPids.push(pid);
        tops.push({pid:pid,knownParentPids:knownParentPids});
      } else {
				knownParentPids.push(pid);
        //if multiple ancestors, latest first
        var parentNum = pParentPids.length;
        for(var j=parentNum-1;j>=0;j--){
					var known = pub.utils.divInsert(pParentPids[j], pub.allKnownParentPids);
					if(!known.exist){
            var anc=pub.OMGgetAllAncestorsfromPlaceid(pParentPids[j], knownParentPids, parentNum, query);
            for(var k in anc){
							var known = pub.utils.divInsert(anc[k].pid, topPids);
							if(!known.exist)
								tops.push(anc[k]);
            }
          }
        }
      }
    }
    return tops;
  };
  
	//get top nodes not from place_id, but based on moz_historyvisits where from_visit=0. use id to distinguish
	pub.getTopNodesByHistoryVisits = function(){
		var statement = pub.mDBConn.createStatement("select hv.id, hv.from_visit, hv.place_id, p.url, p.title from moz_historyvisits hv join moz_places p on hv.place_id=p.id where from_visit=0 order by visit_date DESC LIMIT 100");//id from_visit place_id visit_date visit_type session
		var nodes = [];
    try {
      while (statement.executeStep()) {
				var node = pub.ReferedHistoryNode(statement.getInt32(0), statement.getInt32(2), statement.getString(4), statement.getString(3), true, true, [], 0);
				nodes.push(node);
      }
      statement.reset();
    }
    catch (e) {
      statement.reset();
    }
		return nodes;
	};
	
  // those without parent are also added, can't only highlight the keywords instead of the whole title?
  pub.createParentNodesCheckDup = function(pids,query) {
    pub.allKnownParentPids = [];
    var nodes = [];
    var ancPids = [];
    //order by time: latest first by default
		var allpid = [];
		var topPids = [];
    for(var i=pids.length-1; i>=0; i--){
			var known = pub.utils.binInsert(pids[i], pub.allKnownParentPids);
			if(known.exist)
				continue;
			var newanc = pub.OMGgetAllAncestorsfromPlaceid(pids[i],[],0,query);
			for(var j in newanc){
				var known = pub.utils.divInsert(newanc[j].pid, topPids);
				if(!known.exist){
					ancPids.push(newanc[j]);
				}
			}
    }
		
		pub.querytime.tmp = (new Date()).getTime();
    for(var i in ancPids){
      nodes.push(pub.nodefromPlaceidWithChildInfo(ancPids[i].pid, (ancPids[i].knownParentPids.length>0), query));
    }
		pub.querytime.bindextime +=1;
		pub.querytime.bindexof  += ((new Date()).getTime() - pub.querytime.tmp);
    return nodes;
  };
  
	pub.init = function(){
		pub.utils=require("./utils");//com.wuxuan.fromwheretowhere.utils;	
	};
	
	exports.getAllVisits = pub.getAllVisits;
	exports.getThreads=pub.getThreads;
//  return pub;
//}();