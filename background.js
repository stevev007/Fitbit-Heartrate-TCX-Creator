// Regex-pattern to check URLs against. 
// It matches URLs like: http[s]://[...]fitbit.com[...]/activities/exercise/12873903
var urlRegex = /^https?:\/\/(?:[^./?#]+\.)?fitbit\.com\/activities\/exercise\/\d+/;

// A function to use as callback
function extractActivityData(domContent) {
    var activityName = extractActivityName(domContent);
    var duration = extractDuration(domContent);
    var distance = extractDistance(domContent);
    var startTime = extractStartTime(domContent);
    var startDate = extractStartDate(domContent);
    var calories = extractCalories(domContent);
    var avgHR = extractAvgHR(domContent);
    var distUnit = extractDistUnit(domContent);
    var HRValues = extractHRValues(domContent);

    console.log('Activity Name: ' +activityName);
    console.log('Duration: ' +duration);
    console.log('Distance: ' +distance);
    console.log('Distance Unit: ' +distUnit);
    console.log('Start Time: ' +startTime);
    console.log('Start Date: ' +startDate);
    console.log('Calories: ' +calories);
    console.log('Average HR: ' +avgHR);
    for(var i=0; i<HRValues.length; ++i){
	console.log('HR Datapoint: ' + HRValues[i][0] + "@" + HRValues[i][1]);
    }

}

function extractActivityName(domContent) {
    var activityNameRegex = /\{"activityId":\d{5},"name":"(\w+)"/;
    var activityName = activityNameRegex.exec(domContent);
    return activityName[1];
}

function extractDuration(domContent) {
    var durationRegex = /,"duration":(\d+),/;
    var duration = durationRegex.exec(domContent);
    return duration[1];
}

function extractDistance(domContent) {
    var distanceRegex = /,"distance":(\d+\.\d+),/;
    var distance = distanceRegex.exec(domContent);
    return distance[1];
}

function extractStartTime(domContent) {
    var startTimeRegex = /,"startTime":"(\d{2}:\d{2})",/;
    var startTime = startTimeRegex.exec(domContent);
    return startTime[1];
}

function extractStartDate(domContent) {
    var startDateRegex = /,"startDate":"(\d{4}-\d{2}-\d{2})",/;
    var startDate = startDateRegex.exec(domContent);
    return startDate[1];
}

function extractCalories(domContent) {
    var caloriesRegex = /,"calories":(\d+),/;
    var calories = caloriesRegex.exec(domContent);
    return calories[1];
}

function extractAvgHR(domContent) {
    var avgHRRegex = /dataType: 'heart-rate',\s*average: (\d+),/;
    var avgHR = avgHRRegex.exec(domContent);
    return avgHR[1];
}

function extractDistUnit(domContent) {
    var distUnitRegex = /,"distanceUnit":"(\w+)",/;
    var distUnit = distUnitRegex.exec(domContent);
    return distUnit[1];
}

function extractHRValues(domContent) {
    var HRSeriesRegex = /dataType: 'heart-rate',[\d,\s,\w,:,']+\[([\d,\s,\w,:,',{,},"]+)]/;
    var HRSeries = HRSeriesRegex.exec(domContent);
    var HRValueRegex = /\{"duration":\d+,"value":(\d+)\}/g;
    var HRDurationRegex = /\{"duration":(\d+),"value":\d+\}/g;
    var ret = [];
    var i = 0;
    do {
        var HRValues = HRValueRegex.exec(HRSeries[1]);
        var HRDurations = HRDurationRegex.exec(HRSeries[1]);
        if(HRValues) {
            ret[i++] = [HRValues[1],HRDurations[1]];
        }
    } while(HRValues);
    return ret;
}

function extractHRDurations(domContent) {
    var HRDurationRegex = /\{"duration":(\d+),"value":\d+\}/g;
    var HRDurations = HRDurationRegex.exec(domContent);
    return HRDurations;
}

// When the browser-action button is clicked...
chrome.browserAction.onClicked.addListener(function (tab) {
    // ...check the URL of the active tab against our pattern and...
    if (urlRegex.test(tab.url)) {
        // ...if it matches, send a message specifying a callback too
        chrome.tabs.sendMessage(tab.id, {text: 'report_back'}, extractActivityData);
    }
});