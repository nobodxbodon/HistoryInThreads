
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

  //remove all spaces \n in front and at end of a string
  pub.trimString = function (str) {
    return str.replace(/^\s*/, "").replace(/\s*$/, "");
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
	
  //remove all empty lines in between (there's no empty lines at front/end in input)
  //don't think it can be infinite loop, but just be cautious, set max loop 40
  pub.removeEmptyLine = function(str){
    var rs = "";
    rs = str.replace(/\s+\n/g, "\n");
    return rs;
  };
  
  pub.removeNonWord = function(str){
	return str.replace(/\W*(\S+\w+)(\W*)$/,"$1");
  };
  
  //remove all string that contain one other element, str is with freq
  //NOTE: a.arr is sorted by string length (ascend) already, and have no dup
  //this is very naive form of stemming
  pub.removeHaveSubstring = function(a){
    var str = a.arr;
    var freq = a.freq;
    for(var i=0;i<str.length;i++){
      for(var j=i+1;j<str.length;j++){
        if(str[j].indexOf(str[i])>-1){
          freq[str[i]]+=freq[str[j]];
          str.splice(j,1);
          freq.splice(j,1);
          j--;
        }
      }
    }
    return a;
  };
  
  //return the count of occurrences of ch in str
  pub.countChar = function(ch, str){
    var all = str.match(new RegExp(ch,"g"));
    if(all)
      return all.length;
    else
      return 0;
  };
  	
	//!TODO: handle words with both \' AND \"
	pub.getRightQuote = function(word){
		//if it has \', replace sql term with \"
		var partTerm = "";
		if(word.match(/\'/)){
			partTerm = "\"%" + word + "%\"";
		}else{
			partTerm = "'%" + word + "%'";
		}
		return partTerm;
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
  
  // PRINCIPLE: conjunction for all
  pub.getIncludeExcluded = function(keywords){
    var origkeywords = keywords;
    //this is for excluded, make sure there's one non-\" before -
    keywords=" "+keywords;
    var excludePreciseReg = /[^\"]-\"([^\"]*)\"?/g;
    var excludeQuotes = keywords.match(excludePreciseReg);
    var quotedWords = [];
    var excluded = [];
    //get all the excluded and quoted keywords, remove them
    for(var i in excludeQuotes){
      excluded.push(excludeQuotes[i].replace(excludePreciseReg, "$1"));
    }
    if(excludeQuotes){
      keywords = keywords.replace(excludePreciseReg, "");
    }
    //get all quoted phrases, put them in words and remove them from 'keywords'
    var quoteReg = /\s\"([^\"]*)\"?/g;
    var quotes = keywords.match(quoteReg);
    for(var i in quotes){
      quotedWords.push(quotes[i].replace(quoteReg, "$1"));
    }
    
    var words = [];
    if(!quotes){
      words = pub.splitWithSpaces(keywords);
    } else {
      words = pub.splitWithSpaces(keywords.replace(quoteReg, ""));
    }
    //put quoted words at the end, which will be the first to search from, more likely to reduce results
    
    var site = [];
    var time = [];
    for(var i=0; i<words.length; i++){
      //get excluded words, single '-' is rec as keyword
      if(words[i][0]=='-' && words[i].length>1){
        excluded.push(words[i].substring(1));
        words.splice(i,1);
        i--;
      //get site
      } else if(words[i].indexOf("site:")==0){
        site.push(words[i].substring(5));
        words.splice(i,1);
        i--;
      //get temporal filter
      //TODO: throw exception and feedback when invalid date
      } else if(words[i].indexOf("time:")==0){
        var ti = words[i].substring(5);
        var ts = ti.split("-");
        // can be ~, need to be smarter, but later
        if(ts.length==1)
          ts = ti.split("~");
        if(ts.length!=2){
          alert(pub.stringsBundle.getString('utils.parseTimeInterval.warn')+" "+ti+pub.stringsBundle.getString('utils.parseTime.warn.2'));
          words.splice(i,1);
          i--;
          continue;
        }
        var t=pub.parseTime(ts);
        time.push(t);
        words.splice(i,1);
        i--;
      }
    }
    return {origkeywords : origkeywords, words: quotedWords, optional : words, excluded : excluded, site : site, time : time};
  };
  
	pub.buildFeedback = function(words, optional, excluded, site, time){
		var feedback = pub.stringsBundle.getString('utils.buildFeedback.1');
		if(words.length>0){
			feedback += " "+pub.stringsBundle.getString('utils.buildFeedback.2')+" ["+words+"],";
		}
		if(optional.length>0){
			feedback += " "+pub.stringsBundle.getString('utils.buildFeedback.3')+" ["+optional+"],";
		}
		if(excluded.length>0){
			feedback += " "+pub.stringsBundle.getString('utils.buildFeedback.4')+" " + excluded;
		}
		feedback+=" "+pub.stringsBundle.getString('utils.buildFeedback.5');
		if(site.length>0){
			feedback+=", "+pub.stringsBundle.getString('utils.buildFeedback.site')+" "+site;
		}
		if(time.length>0){
			feedback+=", "+pub.stringsBundle.getString('utils.buildFeedback.time')+pub.timeInterpret(time);
		}
		return feedback;
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
	
  pub.getFFVersion = function(){
    if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)){ //test for Firefox/x.x or Firefox x.x (ignoring remaining digits);
      var ffversion=new Number(RegExp.$1) // capture x.x portion and store as a number
      return ffversion;
    }
    else
      return null;
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