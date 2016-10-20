// Regex-pattern to check URLs against. 
// It matches URLs like: http[s]://[...]fitbit.com[...]/activities/exercise/12873903
var urlRegex = /^https?:\/\/(?:[^./?#]+\.)?fitbit\.com\/activities\/exercise\/\d+/;

// A function to use as callback
function createTCX(domContent){
    var scriptText = getScriptText(domContent);
    var activityName = extractActivityName(scriptText);
    var duration = extractDuration(scriptText);
    var distance = extractDistance(scriptText);
    var startTime = extractStartTime(scriptText);
    var timeZoneOffset = extractTimeZoneOffsetToUTC(domContent);
    var startDate = extractStartDate(scriptText);
    var calories = extractCalories(scriptText);
    var avgHR = extractAvgHR(scriptText);
    var distUnit = extractDistUnit(scriptText);
    var HRValues = extractHRValues(scriptText);

    console.log('Activity Name: ' +activityName);
    console.log('Duration: ' +duration);
    console.log('Distance: ' +distance);
    console.log('Distance Unit: ' +distUnit);
    console.log('Start Time: ' +startTime);
    console.log('Timezone Offset: ' + timeZoneOffset );
    console.log('Start Date: ' +startDate);
    console.log('Calories: ' +calories);
    console.log('Average HR: ' +avgHR);
    for(var i=0; i<HRValues.length; ++i){
	//console.log('HR Datapoint: ' + HRValues[i][0] + "@" + HRValues[i][1]);
    }

    var xmlDoc = document.implementation.createDocument("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", "TrainingCenterDatabase");
    var activitiesTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Activities');
    var activityTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Activity');
    var idTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Id');
    var dateTimeAndOffsetText = document.createTextNode(extractStartDateTimeAndOffset(domContent));
    idTag.appendChild(dateTimeAndOffsetText);
    activityTag.setAttribute('Sport', activityName );
    activityTag.appendChild(idTag);
    activitiesTag.appendChild(activityTag);
    xmlDoc.documentElement.appendChild(activitiesTag);
    console.log(xmlDoc);
}

function getScriptText(domContent){
    var scriptRegex = /(<script id="scripts"[\w\s\d-="/>(['\]);.{:,@}*&#?%]+<\/script>)/;
    var script = scriptRegex.exec(domContent);
    if(script) return script[1];
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
    var distanceRegex = /,"distance":(\d+\.\d+),/;
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

function extractStartDateTimeAndOffset(domContent){
    var ret = "";
    //first look for whole thing 
    //ex. trackpoints: [{"date":"2016-10-02T07:22:34.000-04:00"
    var startDateTimeAndOffsetRegex = /\[{"date":"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+-\d{2}:\d{2})",/;
    ret = startDateTimeAndOffsetRegex.exec(domContent);
    if(ret) return ret[1];

    //if that fails, look for all but offset
    //ex. <h2 class="component date">...<time datetime="2016-10-19T12:10:30.000">...</h2>
    var startDateTimeRegex = /<time datetime="(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+)"/;
    ret = startDateTimeRegex.exec(domContent);
    var timeZoneOffset = extractTimeZoneOffsetToUTC(domContent);
    if(ret) {
        if(timeZoneOffset[0]!="-") return ret[1] + "+"+timeZoneOffset;
        else return ret[1] + timeZoneOffset;
    }

    //finally if all else fails create from startDate, startTime, timeZone
    ret = extractStartDate(domContent) + "T" + extractStartTime(domContent)+ ":00.000";
    if(ret) {
        if(timeZoneOffset[0]!="-") return ret[1] + "+"+timeZoneOffset;
        else return ret[1] + timeZoneOffset;
    }

    return null;
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

function extractTimeZoneOffsetToUTC(domContent) {
    var timezoneRegex = /"timezone":"([\w/]+)"/;
    var timezone = timezoneRegex.exec(domContent);
    if(timezone) {
        return "-04:00";
    }
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
        chrome.tabs.sendMessage(tab.id, {text: 'report_back'}, createTCX);
    }
});