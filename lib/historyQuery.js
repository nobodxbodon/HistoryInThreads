if(!com)
  var com={};
  
if(!com.wuxuan)
  com.wuxuan={};
  
if(!com.wuxuan.fromwheretowhere)
  com.wuxuan.fromwheretowhere = {};
  
//independent of searching/treeview or recommendation
com.wuxuan.fromwheretowhere.historyQuery = function(){
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
		//console.log(JSON.stringify(visit));
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
  
  /* for latest visits ordered by latest first, walk them from the earliest, add it to the node based on from_visit, order by visit time*/
  pub.getThreads = function(visits){
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
  	return tops;
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
  
  
  return pub;
}();

exports.getAllVisits = com.wuxuan.fromwheretowhere.historyQuery.getAllVisits;
exports.getThreads=com.wuxuan.fromwheretowhere.historyQuery.getThreads;