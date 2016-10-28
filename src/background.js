// Regex-pattern to check URLs against. 
// It matches URLs like: http[s]://[...]fitbit.com[...]/activities/exercise/12873903
var urlRegex = /^https?:\/\/(?:[^./?#]+\.)?fitbit\.com\/activities\/exercise\/\d+/;
var myTab = null;

// A function to use as callback
function createTCX(domContent){
  var scriptText = getScriptText(domContent);
  if(isGPSActivity(scriptText)) { //just use fitbit export
    chrome.tabs.sendMessage(myTab.id, {text: 'download_fitbit_tcx'}, null);
  } else { //run our export for non GPS activities
    var activityName = extractActivityName(scriptText);

    console.log('Activity Name: ' +activityName);

    var xmlDoc = document.implementation.createDocument("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", "TrainingCenterDatabase");
    xmlDoc.documentElement.setAttribute('xmlns', "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2");
    var activitiesTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Activities');
    var activityTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Activity');
    var idTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Id');
    var dateTimeAndOffset = extractStartDateTimeAndOffset(domContent);
    var dateTimeAndOffsetText = document.createTextNode(dateTimeAndOffset);
    var startDateObj = new Date(dateTimeAndOffset);
    idTag.appendChild(dateTimeAndOffsetText);
    activityTag.appendChild(idTag);

    var lapTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Lap');
    lapTag.setAttribute('StartTime', dateTimeAndOffset);
    activityTag.appendChild(lapTag);

    var totalTimeSecondsTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'TotalTimeSeconds');
    var totalTimeSeconds = extractDuration(scriptText)/1000;
    totalTimeSecondsTag.appendChild(document.createTextNode(totalTimeSeconds));
    lapTag.appendChild(totalTimeSecondsTag);

    var distanceMetersTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'DistanceMeters');
    var totalDistMeters = extractDistance(scriptText)*1609.34;
    distanceMetersTag.appendChild(document.createTextNode(totalDistMeters));
    lapTag.appendChild(distanceMetersTag);

    var caloriesTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Calories');
    caloriesTag.appendChild(document.createTextNode(extractCalories(scriptText)));
    lapTag.appendChild(caloriesTag);

    var avgHRTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'AverageHeartRateBpm');
    avgHRTag.appendChild(document.createTextNode(extractAvgHR(scriptText)));
    lapTag.appendChild(avgHRTag);

    var intensityTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Intensity');
    intensityTag.appendChild(document.createTextNode("Active"));
    lapTag.appendChild(intensityTag);

    var triggerMethodTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'TriggerMethod');
    triggerMethodTag.appendChild(document.createTextNode("Manual"));
    lapTag.appendChild(triggerMethodTag);

    var trackTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Track');
    lapTag.appendChild(trackTag);

    var maxHR = null;
    var HRValues = extractHRValues(scriptText);
    var accumulatedMeters = 0;
    for(var i=0; i<HRValues.length; ++i){
	if(maxHR==null || Number(HRValues[i][0])>Number(maxHR)) maxHR = HRValues[i][0];
        var trackPointTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Trackpoint');
        trackTag.appendChild(trackPointTag);

        //put times in full date, time, and offset format instead of milliseconds ellapsed in activity
        var trackPointTimeTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Time');
        var trackPointDate = new Date(startDateObj.getTime());
        trackPointDate.setSeconds(trackPointDate.getSeconds()+(HRValues[i][1]/1000));
        trackPointTimeTag.appendChild(document.createTextNode(formatDate(trackPointDate)));
        trackPointTag.appendChild(trackPointTimeTag);

        var trackPointDistanceMetersTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'DistanceMeters');
        var percentOfTotalActivity = 0;
        if(i>0) percentOfTotalActivity = ((HRValues[i][1]-HRValues[i-1][1])/1000)/totalTimeSeconds;
        var timeAmortizedDistMeters = totalDistMeters * percentOfTotalActivity;
        accumulatedMeters += timeAmortizedDistMeters;
        trackPointDistanceMetersTag.appendChild(document.createTextNode(accumulatedMeters));
        trackPointTag.appendChild(trackPointDistanceMetersTag);

        var trackPointHRTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'HeartRateBpm');
        trackPointTag.appendChild(trackPointHRTag);

        var trackPointHRValueTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Value');
        trackPointHRValueTag.appendChild(document.createTextNode(HRValues[i][0]));
        trackPointHRTag.appendChild(trackPointHRValueTag);
    }

    var maxHRTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'MaximumHeartRateBpm');
    maxHRTag.appendChild(document.createTextNode(maxHR));
    if(maxHR) lapTag.appendChild(maxHRTag);

    var creatorTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Creator');
    creatorTag.setAttribute('xsi:type', "Device_t");
    creatorTag.setAttribute('xmlns:xsi', "http://www.w3.org/2001/XMLSchema-instance");
    activityTag.appendChild(creatorTag);

    var creatorNameTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'Name');
    creatorNameTag.appendChild(document.createTextNode("Fitbit Heartrate TCX Creator"));
    creatorTag.appendChild(creatorNameTag);

    var creatorUnitIdTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'UnitId');
    creatorUnitIdTag.appendChild(document.createTextNode("0"));
    creatorTag.appendChild(creatorUnitIdTag);

    var creatorProductIdTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'ProductId');
    creatorProductIdTag.appendChild(document.createTextNode("0"));
    creatorTag.appendChild(creatorProductIdTag);


    activityTag.setAttribute('Sport', activityName );
    activitiesTag.appendChild(activityTag);
    xmlDoc.documentElement.appendChild(activitiesTag);
    console.log(xmlDoc);
    var xmlText = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" + (new XMLSerializer()).serializeToString(xmlDoc);
    download(dateTimeAndOffset + "_" + activityName + ".tcx", xmlText);
  }
}

function isGPSActivity(scriptContent){
    var GPSRegex = /trackpoints: \[/;
    var GPSActivity = GPSRegex.exec(scriptContent);
    if(GPSActivity) return true;
    return false;

}

function formatDate(dateToFormat) {
    //var tzOffset = dateToFormat.getTimezoneOffset()/60;
    var tzOffset = dateToFormat.getTimezoneOffset();
    var tzSign = "+";
    pad = function(num) {
            var norm = Math.abs(Math.floor(num));
            return (norm < 10 ? '0' : '') + norm;
        };  
    if(tzOffset>0)
        tzSign = "-";

    return dateToFormat.getFullYear() 
        + "-" + pad(dateToFormat.getMonth() + 1) //Months are zero based
        + "-" + pad(dateToFormat.getDate())
        + "T" + pad(dateToFormat.getHours()) 
        + ":" + pad(dateToFormat.getMinutes()) 
        + ":" + pad(dateToFormat.getSeconds()) 
        + ".000" 
        + tzSign + pad(-tzOffset/60)
        + ":" + pad(tzOffset%60);
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
    if(ret) {
        var dateTimeAndOffset = addTimeZoneOffsetToDate(domContent, ret[1]);
        return dateTimeAndOffset;
    }

    //finally if all else fails create from startDate, startTime, timeZone
    ret = extractStartDate(domContent) + "T" + extractStartTime(domContent)+ ":00.000";
    if(ret) {
        var dateTimeAndOffset = addTimeZoneOffsetToDate(domContent, ret[1]);
        return dateTimeAndOffset;
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

function addTimeZoneOffsetToDate(domContent, atDateTime) {
    var timezoneRegex = /"timezone":"([\w/]+)"/;
    var timezone = timezoneRegex.exec(domContent);

    if(timezone){
        var dateTimeAndOffset = moment.tz(atDateTime, timezone[1]).format();
        var dateTimeMillisAndOffset;

	if(atDateTime.charAt(19)=='.'){
            //add millis
            dateTimeMillisAndOffset = dateTimeAndOffset.slice(0,19) + ".000" + dateTimeAndOffset.slice(19);
        }else{
            dateTimeMillisAndOffset = dateTimeAndOffset;
        }
        console.log("returning: " + dateTimeMillisAndOffset);
        return dateTimeMillisAndOffset;
    }
    else return atDateTime + "+00:00";
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
    myTab = tab;
    // ...check the URL of the active tab against our pattern and...
    if (urlRegex.test(myTab.url)) {
        // ...if it matches, send a message specifying a callback too
        chrome.tabs.sendMessage(myTab.id, {text: 'report_back'}, createTCX);
    }
});


function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
};

function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}