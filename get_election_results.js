var async   = require('async'),      
    cheerio = require('cheerio'),
    request = require('request'),
    fs      = require('fs'),
    _       = require('underscore');

var voter_turnout = require('./voter_turnout');

var url     = "http://enrarchives.sos.mo.gov/enrnet/CountyResults.aspx",
    tableId = "#MainContent_dgrdResults",
    electionValue = '750002299'; // CHANGE THIS VALUE TO CORRESPOND WITH THE ELECTION VALUE BELOW

var elections = {
  "750003143": "General Election November 2014",
  "750002907": "Primary Election August 2014",
  "750002497": "General Election November 2012",
  "750002299": "Primary Election August 2012"
};

var electionType = elections[electionValue].indexOf('General') !== -1 ? "general" : "primary";

var counties  = {"001":"Adair","003":"Andrew","005":"Atchison","007":"Audrain","009":"Barry","011":"Barton","013":"Bates","015":"Benton","017":"Bollinger","019":"Boone","021":"Buchanan","023":"Butler","025":"Caldwell","027":"Callaway","029":"Camden","031":"Cape Girardeau","033":"Carroll","035":"Carter","037":"Cass","039":"Cedar","041":"Chariton","043":"Christian","045":"Clark","047":"Clay","049":"Clinton","051":"Cole","053":"Cooper","055":"Crawford","057":"Dade","059":"Dallas","061":"Daviess","063":"De Kalb","065":"Dent","067":"Douglas","069":"Dunklin","071":"Franklin","073":"Gasconade","075":"Gentry","077":"Greene","079":"Grundy","081":"Harrison","083":"Henry","085":"Hickory","087":"Holt","089":"Howard","091":"Howell","093":"Iron","095":"Jackson","097":"Jasper","099":"Jefferson","101":"Johnson","095A":"Kansas City","103":"Knox","105":"Laclede","107":"Lafayette","109":"Lawrence","111":"Lewis","113":"Lincoln","115":"Linn","117":"Livingston","119":"Macon","121":"Madison","123":"Maries","125":"Marion","127":"McDonald","129":"Mercer","131":"Miller","133":"Mississippi","135":"Moniteau","137":"Monroe","139":"Montgomery","141":"Morgan","143":"New Madrid","145":"Newton","147":"Nodaway","149":"Oregon","151":"Osage","153":"Ozark","155":"Pemiscot","157":"Perry","159":"Pettis","161":"Phelps","163":"Pike","165":"Platte","167":"Polk","169":"Pulaski","171":"Putnam","173":"Ralls","175":"Randolph","177":"Ray","179":"Reynolds","181":"Ripley","195":"Saline","197":"Schuyler","199":"Scotland","201":"Scott","203":"Shannon","205":"Shelby","183":"St. Charles","185":"St. Clair","187":"St. Francois","189":"St. Louis","510":"St. Louis City","188":"Ste. Genevieve","207":"Stoddard","209":"Stone","211":"Sullivan","213":"Taney","215":"Texas","217":"Vernon","219":"Warren","221":"Washington","223":"Wayne","225":"Webster","227":"Worth","229":"Wright"};

var countyIds = Object.keys(counties),
    results   = [],
    count     = 0;

function requestCounty(countyId, callback) {
  count ++;
  console.log('Processing ' + counties[countyId] + ' - ' + count + ' of ' + countyIds.length);
  
  var reqData = [{"name": "ctl00%24sm1", "value": "ctl00%24MainContent%24UpdatePanel1%7Cctl00%24MainContent%24btnCountyChange"}, {"name": "__EVENTTARGET", "value": ""}, {"name": "__EVENTARGUMENT", "value": ""}, {"name": "__VIEWSTATE", "value": "%2FwEPDwULLTE0NDg1NDY2NzMPZBYCZg9kFgICAw9kFgYCBw9kFgICAw9kFgJmD2QWCgIDDw8WAh4EVGV4dAU3U3RhdGUgb2YgTWlzc291cmkgLSBHZW5lcmFsIEVsZWN0aW9uIC0gTm92ZW1iZXIgNCwgMjAxNGRkAgUPDxYCHwAFEE9mZmljaWFsIFJlc3VsdHNkZAIHDw8WAh8ABUFBcyBhbm5vdW5jZWQgYnkgdGhlIEJvYXJkIG9mIFN0YXRlIENhbnZhc3NlcnMgb24gRGVjZW1iZXIgMywgMjAxNGRkAgkPEA8WBh4ORGF0YVZhbHVlRmllbGQFCkVsZWN0aW9uSWQeDURhdGFUZXh0RmllbGQFC0Rlc2NyaXB0aW9uHgtfIURhdGFCb3VuZGdkEBUKI0dlbmVyYWwgRWxlY3Rpb24gLSBOb3ZlbWJlciA0LCAyMDE0M1NwZWNpYWwgLSBMZWdpc2xhdGl2ZSBEaXN0cmljdCAxNTEgLSBBdWd1c3QgNSwgMjAxNDJTcGVjaWFsIC0gTGVnaXNsYXRpdmUgRGlzdHJpY3QgNjcgLSBBdWd1c3QgNSwgMjAxNCFQcmltYXJ5IEVsZWN0aW9uIC0gQXVndXN0IDUsIDIwMTQzU3BlY2lhbCAtIExlZ2lzbGF0aXZlIERpc3RyaWN0IDEyMCAtIEF1Z3VzdCA1LCAyMDE0MVNwZWNpYWwgLSBDb25ncmVzc2lvbmFsIERpc3RyaWN0IDggLSBKdW5lIDQsIDIwMTMyU3BlY2lhbCAtIExlZ2lzbGF0aXZlIERpc3RyaWN0IDE1NyAtIEFwcmlsIDIsIDIwMTMxU3BlY2lhbCAtIExlZ2lzbGF0aXZlIERpc3RyaWN0IDc2IC0gQXByaWwgMiwgMjAxMyNHZW5lcmFsIEVsZWN0aW9uIC0gTm92ZW1iZXIgNiwgMjAxMiFQcmltYXJ5IEVsZWN0aW9uIC0gQXVndXN0IDcsIDIwMTIVCgk3NTAwMDMxNDMINTU1MjIyMjIINTU1MzMzMzMJNzUwMDAyOTA3CDU1NTExMTExCTc1MDAwMjY1OAk3NTAwMDI2MjkJNzUwMDAyNjI4CTc1MDAwMjQ5Nwk3NTAwMDIyOTkUKwMKZ2dnZ2dnZ2dnZ2RkAg0PEA8WBh8BBQdKU19Db2RlHwIFCkNvdW50eU5hbWUfA2dkEBV0BUFkYWlyBkFuZHJldwhBdGNoaXNvbgdBdWRyYWluBUJhcnJ5BkJhcnRvbgVCYXRlcwZCZW50b24JQm9sbGluZ2VyBUJvb25lCEJ1Y2hhbmFuBkJ1dGxlcghDYWxkd2VsbAhDYWxsYXdheQZDYW1kZW4OQ2FwZSBHaXJhcmRlYXUHQ2Fycm9sbAZDYXJ0ZXIEQ2FzcwVDZWRhcghDaGFyaXRvbglDaHJpc3RpYW4FQ2xhcmsEQ2xheQdDbGludG9uBENvbGUGQ29vcGVyCENyYXdmb3JkBERhZGUGRGFsbGFzB0Rhdmllc3MHRGUgS2FsYgREZW50B0RvdWdsYXMHRHVua2xpbghGcmFua2xpbglHYXNjb25hZGUGR2VudHJ5BkdyZWVuZQZHcnVuZHkISGFycmlzb24FSGVucnkHSGlja29yeQRIb2x0Bkhvd2FyZAZIb3dlbGwESXJvbgdKYWNrc29uBkphc3BlcglKZWZmZXJzb24HSm9obnNvbgtLYW5zYXMgQ2l0eQRLbm94B0xhY2xlZGUJTGFmYXlldHRlCExhd3JlbmNlBUxld2lzB0xpbmNvbG4ETGlubgpMaXZpbmdzdG9uBU1hY29uB01hZGlzb24GTWFyaWVzBk1hcmlvbghNY0RvbmFsZAZNZXJjZXIGTWlsbGVyC01pc3Npc3NpcHBpCE1vbml0ZWF1Bk1vbnJvZQpNb250Z29tZXJ5Bk1vcmdhbgpOZXcgTWFkcmlkBk5ld3RvbgdOb2Rhd2F5Bk9yZWdvbgVPc2FnZQVPemFyawhQZW1pc2NvdAVQZXJyeQZQZXR0aXMGUGhlbHBzBFBpa2UGUGxhdHRlBFBvbGsHUHVsYXNraQZQdXRuYW0FUmFsbHMIUmFuZG9scGgDUmF5CFJleW5vbGRzBlJpcGxleQZTYWxpbmUIU2NodXlsZXIIU2NvdGxhbmQFU2NvdHQHU2hhbm5vbgZTaGVsYnkLU3QuIENoYXJsZXMJU3QuIENsYWlyDFN0LiBGcmFuY29pcwlTdC4gTG91aXMOU3QuIExvdWlzIENpdHkOU3RlLiBHZW5ldmlldmUIU3RvZGRhcmQFU3RvbmUIU3VsbGl2YW4FVGFuZXkFVGV4YXMGVmVybm9uBldhcnJlbgpXYXNoaW5ndG9uBVdheW5lB1dlYnN0ZXIFV29ydGgGV3JpZ2h0FXQDMDAxAzAwMwMwMDUDMDA3AzAwOQMwMTEDMDEzAzAxNQMwMTcDMDE5AzAyMQMwMjMDMDI1AzAyNwMwMjkDMDMxAzAzMwMwMzUDMDM3AzAzOQMwNDEDMDQzAzA0NQMwNDcDMDQ5AzA1MQMwNTMDMDU1AzA1NwMwNTkDMDYxAzA2MwMwNjUDMDY3AzA2OQMwNzEDMDczAzA3NQMwNzcDMDc5AzA4MQMwODMDMDg1AzA4NwMwODkDMDkxAzA5MwMwOTUDMDk3AzA5OQMxMDEEMDk1QQMxMDMDMTA1AzEwNwMxMDkDMTExAzExMwMxMTUDMTE3AzExOQMxMjEDMTIzAzEyNQMxMjcDMTI5AzEzMQMxMzMDMTM1AzEzNwMxMzkDMTQxAzE0MwMxNDUDMTQ3AzE0OQMxNTEDMTUzAzE1NQMxNTcDMTU5AzE2MQMxNjMDMTY1AzE2NwMxNjkDMTcxAzE3MwMxNzUDMTc3AzE3OQMxODEDMTk1AzE5NwMxOTkDMjAxAzIwMwMyMDUDMTgzAzE4NQMxODcDMTg5AzUxMAMxODgDMjA3AzIwOQMyMTEDMjEzAzIxNQMyMTcDMjE5AzIyMQMyMjMDMjI1AzIyNwMyMjkUKwN0Z2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dkZAIJDw8WAh8AZWRkAgsPDxYCHwAFDjE0LjA4LjAxLjE3IHM5ZGQYAQUdY3RsMDAkTWFpbkNvbnRlbnQkZGdyZFJlc3VsdHMPZ2RWTus67Xcx%2FiaHWQBWmPnO0GtB7prvAxPo%2BcfsJfRYWw%3D%3D"}, {"name": "ctl00%24MainContent%24cboElectionNames", "value": electionValue}, {"name": "__ASYNCPOST", "value": "false"}, {"name": "ctl00%24MainContent%24btnCountyChange", "value": "Submit"}, { "name": "ctl00%24MainContent%24cboCounty", "value": countyId }];
  reqData = parametersToString(reqData);

  request({url: url, method: 'POST', form: reqData}, function(err, res, body) {
    parseCounty(body, countyId, callback);
  });
}

function parseCounty(data, countyId, callback) {
  var $ = cheerio.load(data);
  var table = $(tableId);

  var rawResults = [];

  $(tableId).find('tr').each(function(i, tr) {
    var row = [];

    $(tr).find('td').each(function(j, td) {
      row.push($(td).text().trim());
    });

    if (row.length < 0)
      return;

    rawResults.push(row);
  });

  processCounty(rawResults, countyId, callback);
}

function processCounty(data, countyId, callback) {
  var countyResults = {},
      ballot,
      party,
      totals = {},
      cont = false;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];

    if (cont)
      continue;

    if (row[0] && !row[1] && !row[2]) {
      // is ballot position
      if (row[0].indexOf('Court') !== -1 || row[0].indexOf('Amendment') !== -1) {
        cont = true;
        continue;
      }

      ballot = cleanBallot(row[0])
      countyResults[ballot] = [];
    } 
    else if (row[0] && row[1]) {
      // is candidate
      party = row[1];

      var candidateObject = {
        candidate: row[0],
        votes: cleanCount(row[2]),
        party: party
      }
      
      countyResults[ballot].push(candidateObject);
    }

    else if (row[1] && row[2]) {
      // is a total
      var total = cleanCount(row[2]);
      
      var isTotal = row[1].indexOf('Party') == -1;

      if (electionType === 'primary' && !isTotal) {
        // is party total
        var cleanParty = party.toLowerCase();

        // must calculate voter turnout
        if (!totals.hasOwnProperty(cleanParty)) {
          totals[cleanParty] = total;
        } else {
          totals[cleanParty] = total > totals[cleanParty] ? total : totals[cleanParty];
        }
      }

      for (var key in countyResults[ballot]) {
        var thisCandidate = countyResults[ballot][key];
        var totalNomenclature = electionType == 'general' || isTotal ? 'total_votes' : 'party_total';

        if ((thisCandidate.party == party && !isTotal) || isTotal) {
          thisCandidate[totalNomenclature] = total;
          thisCandidate['percentage'] = roundToTwo((thisCandidate.votes / total) * 100)
        }
      };
    }
  };

  if (electionType == 'general') {
    totals = voter_turnout[getElectionName(electionValue)][getCountyNameById(countyId)];
  }
  else {
    var overall = 0;
    for (var key in totals) { overall += totals[key]; };

    totals['overall'] = overall;
  }

  var countyObject = {
    id: getCountyNameById(countyId),
    name: counties[countyId],
    totals: totals,
    results: countyResults
  };
  
  results.push(countyObject);

  callback(null);
};

var processCountyResultsQueue = async.queue(requestCounty);
processCountyResultsQueue.push(countyIds);

processCountyResultsQueue.drain = function() {
  results = _.sortBy(results, function(results) { return results.id; })

  jsonResults = JSON.stringify(results, null, 2);
  var fileName = getElectionName(electionValue);

  fs.writeFile('./results/'+fileName+'.json', jsonResults);
}


// utilities
function cleanCount(string) {
  return parseInt(string.replace(/,/g, ''));
}

function cleanBallot(string) {
  return string.replace(/\./g, '').replace(/\-/, '').replace('  ', ' ')
    .replace(/ /g, '_').toLowerCase();
}

function getCountyNameById(countyId) {
  var county = counties[countyId];
  return county.replace('.', '').replace(/ /g, '_').toLowerCase();
}

function getElectionName(electionId) {
  return elections[electionId].replace(/ /g, '_').toLowerCase();
}

function roundToTwo(num) {
  return Math.round(num * 100) / 100;
}

function parametersToString(parameters, encode) {
  var params = [];

  for (var i = 0; i < parameters.length; i++) {
    var val = parameters[i].value;
    val = encode == true ? encodeURIComponent(val) : val;
    params.push(parameters[i].name+"="+val);
  };

  return params.join('&');
}