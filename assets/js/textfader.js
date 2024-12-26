// Setup text splitting
$('.text-fader .text-content').each(function () {
    var textSplit = $(this).text().split('');
    var returnHTML = textSplit.map(function (char) {
        return '<span class="letter">' + char + '</span>';
    }).join('');
    $(this).html(returnHTML);
});

// Text fading configuration
var textFaderDelay = 3000;
var textFaderAnimationSpeed = 1000;

// Initialize text fading
function initTextFader() {
    var $textContents = $(".text-fader .text-content");

    // Immediately show first text
    $textContents.first().addClass("in");

    function cycleTexts($current) {

        var $next = $current.next(".text-fader .text-content");
        if ($next.length === 0) {
            $next = $textContents.first();
        }

        $current.removeClass("in").addClass("out");

        setTimeout(function () {
            $current.removeClass("out");
            $next.addClass("in");

            setTimeout(function () {
                cycleTexts($next);
            }, textFaderDelay);
        }, textFaderAnimationSpeed);
    }

    // Start cycling after first delay
    setTimeout(function () {
        cycleTexts($textContents.first());
    }, textFaderDelay);
}

// Initialize on document ready
$(document).ready(initTextFader);