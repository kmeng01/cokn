var activated = false;
var threshold;

chrome.storage.sync.get(['threshold'], function(result) {
    if (result.threshold == undefined) {
        chrome.storage.sync.set({threshold: 0.6}, function() {});
        threshold = 0.6;
    } else {
        threshold = result.threshold;
    }
});
  
$(function() {
    $("#slider-threshold").slider({
        min: 0,
        max: 1,
        step: 0.01,
        values: [threshold],
        slide: function(event, ui) {
            $("#thresholdValue").text(ui.values[0]);
            threshold = ui.values[0];

            chrome.storage.sync.set({threshold: threshold}, function() {});
        }
    });
  
    $("#thresholdValue").text(threshold);
});

function refreshTooltip() {
    $(function () {
        $('[data-toggle="tooltip"]').tooltip({
            trigger: 'hover'
        });
    })
}

$(document).ready(function() {
    refreshTooltip();
});