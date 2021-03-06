const ALLOW_ALL = true;
const MAX_DEPTH = 0;

var allowed_sites = [];
var prohibit_tag = ["script", "style", "noscript"];
var delim = '`!@!$`';

var eList = [];
var eListContent = [];

var cwTexts = [];
var cwScores = [];
var cwSentences = [];

var gResults = [];

function allowed(str) {
    if (ALLOW_ALL) {
        return true;
    }

    for (var i = 0; i < allowed_sites.length; i++)
        if (str.toLowerCase().includes(allowed_sites[i].toLowerCase()))
            return true;

    return false;
}

function prohibited(str) {
    for (var i=0; i<prohibit_tag.length; i++) {
        if (str.toLowerCase().includes(prohibit_tag[i].toLocaleString()))
            return true;
    }
    return false;
}

function count_maximum_depth(el) {
    var ret = 0;
    if (prohibited(el.tagName)) ret = 100; // arbitrary large number

    var c = el.children;
    for (var i=0; i<c.length; i++) {
        ret = Math.max(count_maximum_depth(c[i]) + 1, ret);
    }

    return ret;
}

function createCORSRequest(method, url, api_key=null) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    if (method == "POST") {
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    }
    return xhr;
}

function applyClaimSpottingAPI(respondLoading, badgeLenLoading) {
    var tot = ""

    for (var i=0; i<eList.length; i++) {
        tot += eList[i].innerText.trim();
        if (i < eList.length - 1) tot += '$&@!@&!*'
    }

    var base_url = "https://idir.uta.edu/misinfo-api/query_claimbuster?rtoks=1";
        
    var xhr = createCORSRequest('POST', base_url);
    if (!xhr) {
        alert('CORS not supported');
        return;
    }

    xhr.onload = function() {
        console.log(xhr.responseText);
        var ret = JSON.parse(xhr.responseText);

        for (var i = 0; i < ret.length; i++) {
            var tmp1 = [];
            var tmp2 = [];
            for (var j = 0; j < ret[i].length; j++) {
                tmp1.push(ret[i][j][0]);
                tmp2.push(ret[i][j][1]);
            }
            cwTexts.push(tmp1);
            cwScores.push(tmp2);
        }

        for (var i = 0; i < ret.length; i++) {
            var curHTML = eList[i].innerText.trim();
            eListContent.push(curHTML);
            
            for (var j = 0; j < ret[i].length; j++) {
                if (cwScores[i][j] < threshold) continue;

                cwSentences.push(cwTexts[i][j]);
                var start = curHTML.indexOf(cwTexts[i][j]);
                var end = start + cwTexts[i][j].length;

                var decCode = Math.round(cwScores[i][j] * 255);
                var tCode = decCode.toString(16);
                var colorcode = "background: -webkit-gradient(linear, left top, right top, from(#fce3ec" + tCode + "), to(#ffe8cc" + tCode + "));";

                var newHTML = "<claim style='" + colorcode + "'>" + cwTexts[i][j] + "</claim>";
                newHTML = '<div class="tooltip-vericlaim">' + newHTML + '<span class="tooltiptext-vericlaim">Check-Worthiness Score: ' + (cwScores[i][j] * 100).toFixed(2) + '%. See extension for details.</span></div>';
                // newHTML = '<div class="has-tooltip">' + newHTML + '<span class="tooltip-wrapper"><span class="tooltip">Check-Worthiness Score: ' + (cwScores[i][j] * 100).toFixed(2) + '%. See extension for details.</span></span></div>';

                curHTML = curHTML.substring(0, start) + newHTML + curHTML.substring(end);
            }
            eList[i].innerHTML = curHTML;
        }

        var csListener = function (msg, sender, response) {
            if ((msg.from === 'popup') && (msg.subject === 'DOMInfo')) {
                response({
                    id: '200-cs',
                    cwSentences: cwSentences,
                    gResults: []
                });
            }
        }
        chrome.runtime.onMessage.removeListener(respondLoading);
        chrome.runtime.onMessage.addListener(csListener);
    
        var badgeLenListener = function (msg, sender, response) {
            if ((msg.from === 'popup') && (msg.subject === 'badgeInfo')) {
                response({
                    id: "200-cs",
                    content: cwSentences.length
                });
            }
        }
        chrome.runtime.onMessage.removeListener(badgeLenLoading);
        chrome.runtime.onMessage.addListener(badgeLenListener);
    
        applyGoogleAPI();
        
        processClaimCheckingResults(csListener, badgeLenListener);
    };

    xhr.onerror = function() {
        console.log('There was an error making the request');
    };

    xhr.send(tot);
}

function applyGoogleAPI() {
    var url = "https://idir.uta.edu/misinfo-api/query_google";

    var tot = "";
    for (var i=0; i<cwSentences.length; i++) {
        tot += cwSentences[i];
        if (i < cwSentences.length - 1) tot += "$&@!@&!*";
    }
    
    var xhr = createCORSRequest('POST', url);
    if (!xhr) {
        alert('CORS not supported');
        return;
    }
  
    xhr.onload = function() {
        gResults = JSON.parse(xhr.responseText);

        var retIdx = 0;
        for (var i = 0; i < cwScores.length; i++) {
            var curHTML = eListContent[i];
            for (var j = 0; j < cwScores[i].length; j++) {
                if (cwScores[i][j] < threshold) continue;

                var curRes = gResults[retIdx++];

                var start = curHTML.indexOf(cwTexts[i][j]);
                var end = start + cwTexts[i][j].length;

                var decCode = Math.round(cwScores[i][j] * 255);
                var tCode = decCode.toString(16);

                var startColor = (curRes.empty ? "fce3ec" : "00ff66");
                var endColor = (curRes.empty ? "ffe8cc" : "00d4ff");
                var colorcode = "background: -webkit-gradient(linear, left top, right top, from(#" + startColor + tCode + "), to(#" + endColor + tCode + "));";

                var newHTML = "<claim style='" + colorcode + "'>" + cwTexts[i][j] + "</claim>";

                var tooltipHTML = '<span class="tooltiptext-vericlaim">Check-Worthiness Score: ' + (cwScores[i][j] * 100).toFixed(2) + '%';

                if (!curRes.empty) {
                    var googleFcURL = "https://toolbox.google.com/factcheck/explorer/search/" + fixedEncodeURIComponent(cwTexts[i][j]) + ";hl=en";
                    tooltipHTML = '<a target="_blank" href="' + googleFcURL + '">' + tooltipHTML + '. Click me to see relevant fact-checks!</span>' + '</a>';
                } else {
                    tooltipHTML += '</span>';
                }

                newHTML = '<div class="tooltip-vericlaim">' + newHTML + tooltipHTML + '</div>';

                curHTML = curHTML.substring(0, start) + newHTML + curHTML.substring(end);
            }
            eList[i].innerHTML = curHTML;
        }
    };
  
    xhr.onerror = function() {
        console.log('There was an error making the request');
    };
  
    xhr.send(tot);
}

function processClaimCheckingResults(csListener, badgeLenListener) {
    if (gResults.length != cwSentences.length) {
        setTimeout(processClaimCheckingResults, 200, csListener, badgeLenListener);
        return;
    }

    console.log(gResults);

    var ccListener = function (msg, sender, response) {
        if ((msg.from === 'popup') && (msg.subject === 'DOMInfo')) {
            response({
                id: '200-cc',
                cwSentences: cwSentences,
                gResults: gResults
            });
        }
    }
    chrome.runtime.onMessage.removeListener(csListener);
    chrome.runtime.onMessage.addListener(ccListener);

    var badgeLenCcListener = function (msg, sender, response) {
        if ((msg.from === 'popup') && (msg.subject === 'badgeInfo')) {
            response({
                id: "200-cc",
                content: cwSentences.length
            });
        }
    }
    chrome.runtime.onMessage.removeListener(badgeLenListener);
    chrome.runtime.onMessage.addListener(badgeLenCcListener);
}

var threshold;
var viewmode;

chrome.storage.sync.get(['threshold'], function(result) {
    if (result.threshold == undefined) {
        chrome.storage.sync.set({threshold: 0.6}, function() {});
        threshold = 0.6;
    } else {
        threshold = result.threshold;
    }
});

function get_candidate_claims(els) {
    var ret = []

    for (var i = 0; i < els.length; i++) {
        el = els[i];
        max_depth = count_maximum_depth(el);

        if (max_depth > MAX_DEPTH) continue;
        if (typeof el.innerText == 'undefined') continue;
        txt = el.innerText.trim();
        if (txt.split(' ').length < 5) continue;

        // ret.push(txt);
        ret.push(el);
    }
    
    return ret;
}

if (allowed(document.URL)) {
    console.log("COKN Health Info Check will operate on this site")

    respondLoading = function(msg, sender, response) {
        if ((msg.from === 'popup') && (msg.subject === 'DOMInfo')) {
            response({
                id: 'loading-cs',
                cwSentences: [],
                gResults: []
            });
        }
    }
    chrome.runtime.onMessage.addListener(respondLoading);

    var badgeLenLoading = function (msg, sender, response) {
        if ((msg.from === 'popup') && (msg.subject === 'badgeInfo')) {
            response({
                id: "-1",
                content: []
            });
        }
    }
    chrome.runtime.onMessage.addListener(badgeLenLoading);

    var style = document.createElement('style');
    style.innerHTML = `
    claim {
        -webkit-box-decoration-break: clone;
        box-decoration-break: clone;
        border-radius: .4em;
        padding-left: .15em;
        padding-right: .15em;
        padding-top: .05em;
        padding-bottom: .05em;
        color: black;
    }
    /* Tooltip container */
    .tooltip-vericlaim {
        position: relative;
        display: inline;
    }

    /* Tooltip text */
    .tooltip-vericlaim .tooltiptext-vericlaim {
        visibility: hidden;
        width: 20em;
        background-color: black;
        color: #fff;
        text-align: center;
        padding: 5px 0;
        border-radius: 6px;
        font-size: 10pt;
        font-weight: bold;
        
        /* Position the tooltip text - see examples below! */
        position: absolute;
        z-index: 9999;
    }

    /* Show the tooltip text when you mouse over the tooltip container */
    .tooltip-vericlaim:hover .tooltiptext-vericlaim {
        visibility: visible;
    }
    `;

    // style.innerHTML = `
    // .has-tooltip {
    //     /*position: relative;*/
    //     display: inline;
    // }
    // .tooltip-wrapper {
    //     position: absolute;
    //     visibility: hidden;
    // }
    // .has-tooltip:hover .tooltip-wrapper {
    //     visibility: visible;
    //     opacity: 0.7;
    //     /*top: 30px;*/
    //     /*left: 50%;*/
    //     /*margin-left: -76px;*/
    //     z-index: 9999;
    // }
    
    // .tooltip {
    //     display: block;
    //     position: relative;
    //     top: 2em;
    //     right: 100%;
    //     width: 140px;
    //     height: 96px;
    //     /*margin-left: -76px;*/
    //     color: #FFFFFF;
    //     background: #000000;
    //     line-height: 96px;
    //     text-align: center;
    //     border-radius: 8px;
    //     box-shadow: 4px 3px 10px #800000;
    // }
    // .tooltip:after {
    //     content: '';
    //     position: absolute;
    //     bottom: 100%;
    //     left: 50%;
    //     margin-left: -8px;
    //     width: 0;
    //     height: 0;
    //     border-bottom: 8px solid #000000;
    //     border-right: 8px solid transparent;
    //     border-left: 8px solid transparent;
    // }    
    // `

    document.head.appendChild(style);

    eList = get_candidate_claims(document.body.querySelectorAll('*:not(style):not(script):not(noscript)'));
    applyClaimSpottingAPI(respondLoading, badgeLenLoading);
} else {
    chrome.runtime.onMessage.addListener((msg, sender, response) => {
        if ((msg.from === 'popup') && (msg.subject === 'DOMInfo')) {
            response({
                id: 'not-support',
                cwSentences: [],
                gResults: []
            });
        }
    });
}

function fixedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}