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
    var currentIndex = parseInt(localStorage.getItem('textFaderIndex')) || 0;
    var lastUpdateTime = parseInt(localStorage.getItem('textFaderLastUpdate')) || 0;
    var now = Date.now();
    var timeDiff = now - lastUpdateTime;

    if (lastUpdateTime > 0) {
        var cyclesPassed = Math.floor(timeDiff / (textFaderDelay + textFaderAnimationSpeed));
        currentIndex = (currentIndex + cyclesPassed) % $textContents.length;
    }

    $textContents.removeClass('in out');

    $textContents.eq(currentIndex).addClass('in');

    function cycleTexts($current, index) {
        var nextIndex = (index + 1) % $textContents.length;
        var $next = $textContents.eq(nextIndex);

        $current.removeClass('in').addClass('out');

        // Store current state
        localStorage.setItem('textFaderIndex', nextIndex);
        localStorage.setItem('textFaderLastUpdate', Date.now());

        setTimeout(function () {
            $current.removeClass('out');
            $next.addClass('in');

            setTimeout(function () {
                cycleTexts($next, nextIndex);
            }, textFaderDelay);
        }, textFaderAnimationSpeed);
    }

    setTimeout(function () {
        cycleTexts($textContents.eq(currentIndex), currentIndex);
    }, textFaderDelay);
}

$(document).ready(initTextFader);