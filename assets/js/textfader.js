//setup colour change
$('.text-fader .text-content').each(function(){
    var textSplit = $(this).text().split('');
    var returnHTML = '';
    $.each(textSplit, function (intIndex, objValue) {
      returnHTML+='<span class="letter">'+objValue+'</span>';
    });
    $(this).html(returnHTML);
  });
  
  $(".text-fader .text-content:first-child").addClass("in");
  var textFaderDelay = 3000;
  var textFaderAnimationSpeed = 1000;
  var colourChangeDelay = 0000;
  function nextText($current) {
    if ($current.next(".text-fader .text-content").length > 0) {
      var hasNext = true;
    } else {
      var hasNext = false;
    }
    
    setTimeout(function() {
      $current.removeClass("in").addClass("out");
      setTimeout(function() {
        $current.removeClass("out");
        if (hasNext) {
          $current.next(".text-fader .text-content").addClass("in");
        } else {
          $(".text-fader .text-content:first-child").addClass("in");
        }
        nextText($(".text-fader .text-content.in"));
      }, textFaderAnimationSpeed);
    }, textFaderDelay);
  }
  console.log('test');
  nextText($(".text-fader .text-content.in"));

   