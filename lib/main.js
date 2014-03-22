
var historyQuery = require("./historyQuery");

var visits = historyQuery.getAllVisits();
console.log(JSON.stringify(visits));