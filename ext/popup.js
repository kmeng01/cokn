var demo = false;

chrome.storage.local.set({lastID: null}, function() {});

function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

const updateClaimAreaResults = res => {
    msgArea = document.getElementById("msg-area")
    
    if (chrome.runtime.lastError) {
        $("#loadingSpinner").hide();
        $("#msg-area").show();
        $("#vericlaim-pct").hide();

        msgArea.innerHTML = '<claim class="unsure">Please refresh page to use COKN</claim>';
        return;
    }

    var id = res.id;

    chrome.storage.local.get(['lastID'], function(result) {
        if (id == result.lastID) {
            return;
        }

        chrome.storage.local.set({lastID: id}, function() {});
    
        $("#loadingSpinner").hide();
        $("#msg-area").show();
        $("#vericlaim-pct").hide();
        $("#mass_agree_spinner").show();$("#mass_discuss_spinner").show();$("#mass_disagree_spinner").show();
            $("#mass_agree_pct").hide();$("#mass_discuss_pct").hide();$("#mass_disagree_pct").hide();
    
        if (id == 'not-support') {
            msgArea.innerHTML = '<claim class="false">Page not supported</claim>';
        } else if (id == 'loading-cs') {
            $("#loadingSpinner").show();
            $("#vericlaim-pct").show();
            msgArea.innerHTML = '<loading-pulse>Page is currently being analyzed</loading-pulse>';
        } else if (res.cwSentences == 0) {
            msgArea.innerHTML = "<claim class='true'>We didn't find anything here!</claim>";
        } else if (id == '200-cs') {
            var textList = res.cwSentences;
            var claimArea = document.getElementById("claim-area")
            claimArea.style.height = "60px";

            $("#loadingSpinner").show();
            $("#vericlaim-pct").show();

            msgArea.innerHTML = "<loading-pulse>Claims are being matched with Google databases</loading-pulse>";
    
            var cnt = 1;
            for (var i = 0; i < textList.length; i++) {
                if (textList[i].split(" ").length < 2) continue;
                if (textList[i].includes("img")) continue;
    
                var newRetField = document.createElement("p");
    
                if (cnt == 1) {
                    newRetField.style = 'padding-top: 0px;';
                }
    
                newRetField.innerHTML = '<claim class="unsure">Claim ' + cnt.toString() + '</claim> ' + textList[i];
                claimArea.appendChild(newRetField);
                cnt++;
            }
        } else if (id == '200-cc') {
            var textList = res.cwSentences;
            var results = res.gResults;

            var claimArea = document.getElementById("claim-area")
            claimArea.style.height = "60px";
            claimArea.innerHTML = "";
    
            $("#loadingSpinner").hide();
            $("#msg-area").hide();
            $("#vericlaim-pct").show();

            var cnt = 1;
            for (var i = 0; i < textList.length; i++) {
                if (textList[i].split(" ").length < 2) continue;
                if (textList[i].includes("img")) continue;
    
                var newRetField = document.createElement("p");
    
                if (cnt == 1) {
                    newRetField.style = 'padding-top: 0px;';
                }

                var ver = "unsure";
                var infoHTML = "";
                console.log(results[i]);
                if (!results[i].empty) {
                    ver = "google-found";
                    // var publisherHTML = '<a target="_blank" href="' + results[i]['claimReview'][0]['url'] + '"><claim class="' + results[i]['claimReview'][0]['class'] + '">' + results[i]['claimReview'][0]['publisher']['name'] + '</claim></a>';
                    var publisherHTML = '<a target="_blank" href="' + results[i]['claimReview'][0]['url'] + '"><claim class="' + results[i]['claimReview'][0]['class'] + '">' + results[i]['claimReview'][0]['publisher']['name'] + '</claim></a>';
                    var verdictHTML = results[i]['claimReview'][0]['textualRating'];

                    var claimHTML = '<div class="google-res first">' + '<claim class="label">Related Claim:</claim> ' + results[i]['text'] + '</div>';
                    var checkHTML = '<div class="google-res second">' + publisherHTML + ' ' + verdictHTML + '</div>';

                    infoHTML = '<div id="suppinfo_' + cnt + '">' + claimHTML + checkHTML + '</div>';
                }

                newRetField.innerHTML = '<a href="#" id="claimclick_' + cnt + '"><claim class="' + ver + '">Claim ' + cnt.toString() + '</claim></a> ' + textList[i] + infoHTML;
                
                claimArea.appendChild(newRetField);
                cnt++;
            }

            for (var i=1; i<textList.length + 1; i++) {
                var clk = "#claimclick_" + i;
                var sup = "#suppinfo_" + i;
                $(clk).click(function() {
                    $(sup).toggle();
                });
            }
        }
    });
};

window.addEventListener('DOMContentLoaded', () => {
    listenForResults();
});

function listenForResults() {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, tabs => {
        chrome.tabs.sendMessage(
            tabs[0].id, { from: 'popup', subject: 'DOMInfo' },
            updateClaimAreaResults);
    });

    setTimeout(listenForResults, 1000);
}