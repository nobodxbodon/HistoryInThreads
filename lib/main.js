
var tabs = require("sdk/tabs");
var prefs = require("sdk/simple-prefs");
var data = require("sdk/self").data;
var { Hotkey } = require("sdk/hotkeys");

var shown = false;
var showHotKey;
var PREF_SHORTKEY_OVERRIDE = "replaceBuiltinHistory";

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
  
  function onPrefChange(prefName) {
	var comboBySystem = getComboBySystem();
	if(require("sdk/simple-prefs").prefs[prefName]){
	  showHotKey = Hotkey({
		combo: comboBySystem,
		onPress: function() {
		  if(shown)
			sidebar.hide();
		  else
			sidebar.show();
		}
	  });
	} else {
	  if(showHotKey) {
		showHotKey.destroy();
	  }
	}
  }
  
  function getComboBySystem() {
	var platform = require("sdk/system").platform;
	var combo = "accel-shift-h";
	if(platform !== 'darwin') {
	  combo = 'accel-h';
	}
	return combo;
  }
  // handle preference switch
  prefs.on(PREF_SHORTKEY_OVERRIDE, onPrefChange);
  
  // override if the preference is selected when installed (by last version)
  if(prefs.prefs[PREF_SHORTKEY_OVERRIDE]) {
	onPrefChange(PREF_SHORTKEY_OVERRIDE);
  }
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