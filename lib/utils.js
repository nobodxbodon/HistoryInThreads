
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

  //merge the newArray into sorted Array
  // .sort(function(a,b){return a<b;})
  pub.mergeToSortedArray = function(newArray, origArray){
    if(newArray==null)
      return;
    for(var i=0;i<newArray.length;i++){
      pub.divInsert(newArray[i], origArray, true);
    }
  };
  
  //binary search and insert
  pub.divInsert = function(ele, ar, reversed, dup){
    var pos = {};
    if(reversed){
      pos = pub.revBinInsert(ele, ar);
    }else{
      pos = pub.binInsert(ele, ar);
    }
    if(pos.exist){
      if(dup){
        ar.splice(pos.loc, 0, ele);
      }
      return {exist:true, arr:ar};
    }else{
      ar.splice(pos.loc, 0, ele);
      return {exist:false, arr:ar};
    }
  };

  //binary search and return the location to insert
  pub.revBinInsert = function(ele, ar){
    var left = 0;
    var right = ar.length;
    var center = 0;
    
    while(left<=right){
      center = (left+right)>>1;
      if(ar[center]==ele){
        return {exist:true,loc:center};
      }else if(ele<ar[center]){
        left = center+1;
      }else{
        right = center-1;
      }
    }
    var loc = 0;
    if(center>right){
      loc = center;
    }else if(left>center){
      loc = center+1;
    }
    return {exist:false,loc:loc};
  };
  
  //binary search and return the location to insert
  pub.binInsert = function(ele, ar){
    var left = 0;
    var right = ar.length;
    var center = 0;
    
    while(left<=right){
      center = (left+right)>>1;
      if(ar[center]==ele){
        return {exist:true,loc:center};
      }else if(ele<ar[center]){
        right = center-1;
      }else{
        left = center+1;
      }
    }
    var loc = 0;
    if(center>right){
      loc = center;
    }else if(left>center){
      loc = center+1;
    }
    return {exist:false,loc:loc};
  };
  
  // no seg here as the common head may be not good splitter (max length)
  // NOTE: words are reversely sorted!
	pub.getAllCommonHead = function(words){
		var newwords = [];
		var len = words.length-1;
		for(var i=0;i<len;i++){
			var w1 = words[i];
			var w2 = words[i+1];
			var maxLen = (w1.length>w2.length)?w1.length:w2.length;
			for(var j=0;j<maxLen;j++){
        //won't add if two are the same
				if(w1[j]!=w2[j]){
          //only add if longer than 1
					if(j>pub.MINWORDLENGTH){
						var w = w1.substring(0,j);
            pub.divInsert(w,newwords,true);
					}
					break;
				}
			}
			
		}
		return newwords;
	};
	
  //TODO: reg expr instead
  pub.splitWithSpaces = function(myString) {
    if(!myString){
      return [];
    }
    var words = myString.split(" ");
    for(var i=0; i<words.length; i++){
      if(words[i]==''){
        words.splice(i, 1);
        i--;
      }
    }
    return words;
  };
  
  //ts.length=2
  // time1-time2 => since time1 till time2
  // time1- => since time1
  // -time2 => till time2
  pub.parseTime = function(ts){
    var t = pub.cloneObject(pub.INTERVAL_DEF);
    if(ts[1]!=""){
      var till = new Date(ts[1]).getTime();
      if(till<t.till)
        t.till = till;
      else
        alert(pub.stringsBundle.getString('utils.parseTime.warn.1')+" "+ts[1]+pub.stringsBundle.getString('utils.parseTime.warn.2'));
    //if time1-, means since time1
    }if(ts[0]!=""){
      var since = new Date(ts[0]).getTime();
      if(since>t.since)
        t.since = since;
      else
        alert(pub.stringsBundle.getString('utils.parseTime.warn.1')+" "+ts[0]+pub.stringsBundle.getString('utils.parseTime.warn.2'));
    }
    return t;
  };
	
	pub.timeInterpret = function(times){
		var feedback = "";
		for(var i in times){
			if(times[i].since!=-1){
				if(i!=0)
					feedback = feedback+pub.stringsBundle.getString('utils.timeInterpret.and');
				feedback = feedback+pub.stringsBundle.getString('utils.timeInterpret.since')+(new Date(times[i].since));
			}
			if(times[i].till!=Number.MAX_VALUE){
				if(i!=0)
					feedback = feedback+pub.stringsBundle.getString('utils.timeInterpret.and');
				feedback = feedback+pub.stringsBundle.getString('utils.timeInterpret.till')+(new Date(times[i].till));
			}
		}
		return feedback;
	};
	
  //if branch, wrap <ol> to get indent
  //same level wrap by package <ol>
  pub.exportHTML = function(nodes){
    var src="";
    //get src for each node in the array
    for(var i=0;i<nodes.length;i++){
      src+=pub.exportHTMLforNode(nodes[i]);
      if(i!=nodes.length-1)
        src+="\n";
    }
    return pub.exportHelperWrap(src, "ol", "", "");
  };
  
  pub.exportHTMLforNode = function(node){
    var src="";
    //if branch, type=circle, else type=disc
    if(node.children.length!=0){
      src = pub.exportHTML(node.children);
    }
    var link = pub.exportHelperWrap(node.label,"a","href",node.url);
    if(node.children.length==0){
      src = pub.exportHelperWrap(link,"li","type","disc");
    }else{
      src = pub.exportHelperWrap(link+src,"li","type","circle");
    }
    return src;
  };
  
  //TODO: more general (setAttribute)
  pub.exportHelperWrap = function(orig, tag, attr, value){
    var src="";
    if(attr=="")
      src="<"+tag+">"+orig+"</"+tag+">";
    else
      src="<"+tag+" "+attr+"="+value+">"+orig+"</"+tag+">";
    return src;
  };
  
  return pub;
}();