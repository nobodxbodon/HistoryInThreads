const {Cc,Ci} = require("chrome");

var utils = require("sdk/window/utils");
	
var widgets = require("sdk/widget");
var tabs = require("sdk/tabs");
var data = require("sdk/self").data;

var sidebar = require("sdk/ui").Sidebar({
  id: 'history-in-threads-sidebar',
  title: 'History in Threads',
  url: 'chrome://history_in_threads/content/historyinthreads.xul'
});

var shown = false;
sidebar.on('show',function(){
    shown=true;
    });
sidebar.on('hide',function(){
    shown=false;
    });

var widget = widgets.Widget({
  id: "history-in-threads",
  label: "History in Threads",
  contentURL: data.url("icon.png"),
  onClick: function() {
    //tabs.open("chrome://history_in_threads/content/historyinthreads.xul");
    if(shown)
      sidebar.hide();
    else
	  sidebar.show();
  }
    
});