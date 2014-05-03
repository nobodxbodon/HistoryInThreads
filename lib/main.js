
var tabs = require("sdk/tabs");
var data = require("sdk/self").data;

var shown = false;

try{
var sidebar = require("sdk/ui/sidebar").Sidebar({
  id: 'history-in-threads-sidebar',
  title: 'History in Threads',
  url: 'chrome://history_in_threads/content/historyinthreads.xul'
});

sidebar.on('show',function(){
    shown=true;
    });
sidebar.on('hide',function(){
    shown=false;
    });
var action_button = require("sdk/ui").ActionButton({
  id: "history-in-threads",
  label: "History in Threads",
  icon: data.url("icon.png"),
  onClick: function() {
    if(shown)
      sidebar.hide();
    else
	  sidebar.show();
  }
    
});
}
catch(err){
var widget = require("sdk/widget").Widget({
  id: "history-in-threads",
  label: "History in Threads",
  contentURL: data.url("icon.png"),
  onClick: function() {
    tabs.open("chrome://history_in_threads/content/historyinthreads.xul");
  }
    
});
}