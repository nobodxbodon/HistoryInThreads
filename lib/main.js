const {Cc,Ci} = require("chrome");

var historyQuery = require("./historyQuery");
var utils = require("sdk/window/utils");
	
var visits = historyQuery.getAllVisits();
//console.log(JSON.stringify(visits));

var widgets = require("sdk/widget");
var tabs = require("sdk/tabs");
 
function treeLoad() {
	var tree = document.createElement("tree");
	tree.setAttribute("seltype", "single");
	tree.setAttribute("rows", "10");
	tree.setAttribute("flex", "1");
	tree.setAttribute("type", "places");

	var columns = document.createElement("treecols");

	var column1 = document.createElement("treecol");
	column1.setAttribute("id", "tree_title");
	column1.setAttribute("anonid", "title");
	column1.setAttribute("label", "Title");
	column1.setAttribute("flex", "1");
	columns.appendChild(column1);

	var splitter1 = document.createElement("splitter");
	// splitter1.setAttribute("class", "tree-splitter");
	columns.appendChild(splitter1);

	var column2 = document.createElement("treecol");
	column2.setAttribute("id", "tree_url");
	column2.setAttribute("anonid", "url");
	column2.setAttribute("label", "URL");
	column2.setAttribute("flex", "2");
	columns.appendChild(column2);
	tree.appendChild(columns);

	var children = document.createElement("treechildren");
	children.setAttribute("alternatingbackground", true);
	tree.appendChild(children);
	document.documentElement.appendChild(tree);

	var historyService = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
	var query = historyService.getNewQuery();
	query.domainIsHost = true;
	query.domain = "developer.mozilla.org";

	var options = historyService.getNewQueryOptions();
	options.resultType = historyService.RESULTS_AS_URI;
	options.queryType = historyService.QUERY_TYPE_HISTORY;
	
	var uri = historyService.queriesToQueryString([query], 1, opts);  
	tree.place = uri;
}

var widget = widgets.Widget({
  id: "mozilla-link",
  label: "Mozilla website",
  contentURL: "http://www.mozilla.org/favicon.ico",
  onClick: function() {
    console.log("in on click!!!");
    tabs.open("chrome://history_in_threads/content/historyinthreads.xul");
	
    console.log("after open dialog on click!!!");
    //tabs.open("about:blank", "chrome");
  }
});