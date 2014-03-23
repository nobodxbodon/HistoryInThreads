const {Cc,Ci} = require("chrome");

var view = new PlacesTreeView();

view._getCellText = view.getCellText;
view.getCellText = function (aRowIndex, aCol) {
  // Handle our special columns. As with PlacesTreeView, we'll recognize
  // them by their id's or anonid's.
  switch (aCol.id || aCol.element.getAttribute("anonid"))
  {
  // URI for all nodes (like folders), not just URI nodes (like bookmarks)
  case "fullURI":
    return this.nodeForTreeIndex(aRowIndex).uri;
    break;
  // Index of node in parent container
  case "indexInParent":
    return this.nodeForTreeIndex(aRowIndex).bookmarkIndex;
    break;
  // Is the row even or odd?
  case "parity":
    return (aRowIndex % 2 === 0 ? "even" : "odd");
    break;
  }
  // Otherwise, pass off to the original getCellText method.
  return this._getCellText(aRowIndex, aCol);
};

view._cycleHeader = view.cycleHeader;
view.cycleHeader = function (aCol) {
  switch (aCol.id || aCol.element.getAttribute("anonid"))
  {
  case "fullURI":
  case "indexInParent":
  case "parity":
    // You might resort by column here.
    break;
  default:
    this._cycleHeader(aCol);
    break;
  }
};

// Execute a query and gets its result.
var bmServ =
    Cc["@mozilla.org/browser/nav-bookmarks-service;1"].
    getService(Ci.nsINavBookmarksService);
var histServ =
  Cc["@mozilla.org/browser/nav-history-service;1"].
  getService(Ci.nsINavHistoryService);
var opts = histServ.getNewQueryOptions();
var query = histServ.getNewQuery();
query.setFolders([bmServ.placesRoot], 1);
var result = histServ.executeQuery(query, opts);

// Hook up the result's viewer and the tree's nsITreeView to our custom view.
var treeView = document.getElementById("myTreeView");
result.addObserver(view);
treeView.view = view;