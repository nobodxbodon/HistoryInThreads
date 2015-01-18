
com.wuxuan.fromwheretowhere.utils = function(){
  var pub={};
  
  pub.INTERVAL_DEF = {since: -1, till: Number.MAX_VALUE};
  pub.SEGMENTITERATIONLIMIT = 4;
  pub.MAXWORDLENGTH = 4;
  pub.MINWORDLENGTH = 1;
  pub.sqltime = {};
  
	// Get a reference to the strings bundle
  pub.stringsBundle = document.getElementById("fromwheretowhere.string-bundle");
	
  // Utils functions from here
  pub.cloneObject = function(obj){
    if(obj==null){
        return null;
    }
    var clone = (obj.constructor.name=="Array") ? [] : {};;
    for(var i in obj) {
      if(typeof(obj[i])=="object")
        clone[i] = pub.cloneObject(obj[i]);
      else
        clone[i] = obj[i];
    }
    return clone;
  };

  pub.formatDate = function(intDate) {
    var myDate = new Date(intDate/1000);
    var formated = myDate.toLocaleString();
    return formated;
  };

  return pub;
}();