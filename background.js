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
    if(activityName) return activityName[1];
    else return null;
}

function extractDuration(domContent) {
    var durationRegex = /,"duration":(\d+),/;
    var duration = durationRegex.exec(domContent);
    if(duration) return duration[1];
    else return null;
}

function extractDistance(domContent) {
    var distanceRegex = /,"distance":(\d+.\d+),/;
    var distance = distanceRegex.exec(domContent);
    if(distance) return distance[1];
    else return null;
}

function extractStartTime(domContent) {
    var startTimeRegex = /,"startTime":"(\d{2}:\d{2})",/;
    var startTime = startTimeRegex.exec(domContent);
    if(startTime) return startTime[1];
    else return null;
}

function extractStartDate(domContent) {
    var startDateRegex = /,"startDate":"(\d{4}-\d{2}-\d{2})",/;
    var startDate = startDateRegex.exec(domContent);
    if(startDate) return startDate[1];
    else return null;
}

function extractCalories(domContent) {
    var caloriesRegex = /,"calories":(\d+),/;
    var calories = caloriesRegex.exec(domContent);
    if(calories) return calories[1];
    else return null;
}

function extractAvgHR(domContent) {
    var avgHRRegex = /dataType: 'heart-rate',\s*average: (\d+),/;
    var avgHR = avgHRRegex.exec(domContent);
    if(avgHR) return avgHR[1];
    else return null;
}

function extractDistUnit(domContent) {
    var distUnitRegex = /,"distanceUnit":"(\w+)",/;
    var distUnit = distUnitRegex.exec(domContent);
    if(distUnit) return distUnit[1];
    else return null;
}

function extractHRValues(domContent) {
    var HRSeriesRegex = /dataType: 'heart-rate',[\d\s\w:,']+\[([\d\s\w:'{},."]+])/;
    var HRSeries = HRSeriesRegex.exec(domContent);
    if(!HRSeries) { 
        return null;
    }
    var HRValueRegex = /"value":(\d+)/g;
    var HRDurationRegex = /"duration":(\d+)/g;
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

// When the browser-action button is clicked...
chrome.browserAction.onClicked.addListener(function (tab) {
    // ...check the URL of the active tab against our pattern and...
    if (urlRegex.test(tab.url)) {
        // ...if it matches, send a message specifying a callback too
        chrome.tabs.sendMessage(tab.id, {text: 'report_back'}, extractActivityData);
    }
});