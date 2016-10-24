// Regex-pattern to check URLs against. 
// It matches URLs like: http[s]://[...]fitbit.com[...]/activities/exercise/12873903
var urlRegex = /^https?:\/\/(?:[^./?#]+\.)?fitbit\.com\/activities\/exercise\/\d+/;

// A function to use as callback
function createTCX(domContent){
    var scriptText = getScriptText(domContent);
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
    totalTimeSecondsTag.appendChild(document.createTextNode(extractDuration(scriptText)/1000));
    lapTag.appendChild(totalTimeSecondsTag);

    var distanceMetersTag = document.createElementNS("http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 'DistanceMeters');
    distanceMetersTag.appendChild(document.createTextNode(extractDistance(scriptText)*1609.34));
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
    var timeZoneOffset = extractTimeZoneOffsetToUTC(domContent);
    if(ret) {
        if(timeZoneOffset.charAt(0)!="-") return ret[1] + "+"+timeZoneOffset;
        else return ret[1] + timeZoneOffset;
    }

    //finally if all else fails create from startDate, startTime, timeZone
    ret = extractStartDate(domContent) + "T" + extractStartTime(domContent)+ ":00.000";
    if(ret) {
        if(timeZoneOffset.charAt(0)!="-") return ret[1] + "+"+timeZoneOffset;
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
    if(timezone){
        if(timezone[1]=="America/New_York") {
            return "-04:00";
        }
    }
    else return "+00:00";
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
        //httpGetAsync(tab.url, createTCX); //for when We create a webpage instead of the chrome extension to do this
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