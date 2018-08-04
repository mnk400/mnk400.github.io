(function(d){var h=[];d.loadImages=function(a,e){"string"==typeof a&&(a=[a]);for(var f=a.length,g=0,b=0;b<f;b++){var c=document.createElement("img");c.onload=function(){g++;g==f&&d.isFunction(e)&&e()};c.src=a[b];h.push(c)}}})(window.jQuery);
$.fn.hasAttr = function(name) { var attr = $(this).attr(name); return typeof attr !== typeof undefined && attr !== false; };

var lwi=-1;function thresholdPassed(){var w=$(window).width();var p=false;var cw=0;if(w>=768){cw++;}if(w>=960){cw++;}if(w>=1200){cw++;}if(lwi!=cw){p=true;}lwi=cw;return p;}
shapesData = {"shape":[[9,0,484,0,0,42],[],[],[]]};
$(document).ready(function() {
r=function(){if(thresholdPassed()){dpi=window.devicePixelRatio;if($(window).width()>=1200){$('.js').attr('src', (dpi>1) ? 'images/img_8136-1200.jpg' : 'images/img_8136-600.jpg');
$('.js-2').attr('src', (dpi>1) ? 'images/twitter-58.png' : 'images/twitter-29.png');
$('.js-3').attr('src', (dpi>1) ? 'images/instagram-58.png' : 'images/instagram-29.png');
$('.js-4').attr('src', (dpi>1) ? 'images/github-62.png' : 'images/github-31.png');
$('.js-5').attr('src', (dpi>1) ? 'images/medium-66.png' : 'images/medium-33.png');}else if($(window).width()>=960){$('.js').attr('src', (dpi>1) ? 'images/img_8136-960.jpg' : 'images/img_8136-480.jpg');
$('.js-2').attr('src', (dpi>1) ? 'images/twitter-48.png' : 'images/twitter-24.png');
$('.js-3').attr('src', (dpi>1) ? 'images/instagram-46.png' : 'images/instagram-23.png');
$('.js-4').attr('src', (dpi>1) ? 'images/github-50.png' : 'images/github-25.png');
$('.js-5').attr('src', (dpi>1) ? 'images/medium-52.png' : 'images/medium-26.png');}else if($(window).width()>=768){$('.js').attr('src', (dpi>1) ? 'images/img_8136-890.jpg' : 'images/img_8136-445.jpg');
$('.js-2').attr('src', (dpi>1) ? 'images/twitter-46.png' : 'images/twitter-23.png');
$('.js-3').attr('src', (dpi>1) ? 'images/instagram-44.png' : 'images/instagram-22.png');
$('.js-4').attr('src', (dpi>1) ? 'images/github-48.png' : 'images/github-24.png');
$('.js-5').attr('src', (dpi>1) ? 'images/medium-50.png' : 'images/medium-25.png');}else{$('.js').attr('src', (dpi>1) ? 'images/img_8136-584.jpg' : 'images/img_8136-292.jpg');
$('.js-2').attr('src', (dpi>1) ? 'images/twitter-48-1.png' : 'images/twitter-24-1.png');
$('.js-3').attr('src', (dpi>1) ? 'images/instagram-48.png' : 'images/instagram-24.png');
$('.js-4').attr('src', (dpi>1) ? 'images/github-54.png' : 'images/github-27.png');
$('.js-5').attr('src', (dpi>1) ? 'images/medium-50-1.png' : 'images/medium-25-1.png');}}};
if(!window.HTMLPictureElement){$(window).resize(r);r();}
(function(){$('a[href^="#"]:not(.allowConsent,.noConsent,.denyConsent,.removeConsent)').each(function(){$(this).click(function(){var t=this.hash.length>1?$('[name="'+this.hash.slice(1)+'"]').offset().top:0;return $("html, body").animate({scrollTop:t},400),!1})})})();

});