(function(d){var h=[];d.loadImages=function(a,e){"string"==typeof a&&(a=[a]);for(var f=a.length,g=0,b=0;b<f;b++){var c=document.createElement("img");c.onload=function(){g++;g==f&&d.isFunction(e)&&e()};c.src=a[b];h.push(c)}}})(window.jQuery);
$.fn.hasAttr = function(name) { var attr = $(this).attr(name); return typeof attr !== typeof undefined && attr !== false; };

var lwi=-1;function thresholdPassed(){var w=$(window).width();var p=false;var cw=0;if(w>=480){cw++;}if(w>=768){cw++;}if(w>=960){cw++;}if(w>=1200){cw++;}if(lwi!=cw){p=true;}lwi=cw;return p;}
function em1(){var c="nol`511Azbipp/dpn";var addr="mailto:";for(var i=0;i<c.length;i++)addr+=String.fromCharCode(c.charCodeAt(i)-1);window.location.href=addr;}

$(document).ready(function() {
r=function(){if(thresholdPassed()){dpi=window.devicePixelRatio;if($(window).width()>=1200){$('.js-6').attr('src', (dpi>1) ? 'images/back-button-56.png' : 'images/back-button-28-1.png');
$('.js-7').attr('src', (dpi>1) ? 'images/letter-70.png' : 'images/letter-35.png');
$('.js-8').attr('src', (dpi>1) ? 'images/github-76.png' : 'images/github-38-1.png');
$('.js-9').attr('src', (dpi>1) ? 'images/instagram-74.png' : 'images/instagram-37.png');
$('.js-10').attr('src', (dpi>1) ? 'images/medium-76.png' : 'images/medium-38.png');
$('.js-11').attr('src', (dpi>1) ? 'images/twitter-76.png' : 'images/twitter-38.png');
$('.js-12').attr('src', (dpi>1) ? 'images/line-1854.png' : 'images/line-927.png');
$('.js-13').attr('src', (dpi>1) ? 'images/arrow-1790.png' : 'images/arrow-895.png');
$('.js-14').attr('src', (dpi>1) ? 'images/resume-800.png' : 'images/resume-400.png');}else if($(window).width()>=960){$('.js-6').attr('src', (dpi>1) ? 'images/back-button-46.png' : 'images/back-button-23.png');
$('.js-7').attr('src', (dpi>1) ? 'images/letter-56.png' : 'images/letter-28.png');
$('.js-8').attr('src', (dpi>1) ? 'images/github-60.png' : 'images/github-30.png');
$('.js-9').attr('src', (dpi>1) ? 'images/instagram-60.png' : 'images/instagram-30.png');
$('.js-10').attr('src', (dpi>1) ? 'images/medium-60.png' : 'images/medium-30-1.png');
$('.js-11').attr('src', (dpi>1) ? 'images/twitter-60.png' : 'images/twitter-30-1.png');
$('.js-12').attr('src', (dpi>1) ? 'images/line-1482.png' : 'images/line-741.png');
$('.js-13').attr('src', (dpi>1) ? 'images/arrow-1432.png' : 'images/arrow-716.png');
$('.js-14').attr('src', (dpi>1) ? 'images/resume-638.png' : 'images/resume-319.png');}else if($(window).width()>=768){$('.js-6').attr('src', (dpi>1) ? 'images/back-button-36.png' : 'images/back-button-18.png');
$('.js-7').attr('src', (dpi>1) ? 'images/letter-46.png' : 'images/letter-23.png');
$('.js-8').attr('src', (dpi>1) ? 'images/github-48.png' : 'images/github-24.png');
$('.js-9').attr('src', (dpi>1) ? 'images/instagram-48.png' : 'images/instagram-24.png');
$('.js-10').attr('src', (dpi>1) ? 'images/medium-48.png' : 'images/medium-24.png');
$('.js-11').attr('src', (dpi>1) ? 'images/twitter-48.png' : 'images/twitter-24.png');
$('.js-12').attr('src', (dpi>1) ? 'images/line-1182.png' : 'images/line-591.png');
$('.js-13').attr('src', (dpi>1) ? 'images/arrow-1146.png' : 'images/arrow-573.png');
$('.js-14').attr('src', (dpi>1) ? 'images/resume-504.png' : 'images/resume-252.png');}else if($(window).width()>=480){$('.js-6').attr('src', (dpi>1) ? 'images/back-button-28.png' : 'images/back-button-14.png');
$('.js-7').attr('src', (dpi>1) ? 'images/letter-36.png' : 'images/letter-18.png');
$('.js-8').attr('src', (dpi>1) ? 'images/github-38.png' : 'images/github-19.png');
$('.js-9').attr('src', (dpi>1) ? 'images/instagram-34.png' : 'images/instagram-17.png');
$('.js-10').attr('src', (dpi>1) ? 'images/medium-36.png' : 'images/medium-18.png');
$('.js-11').attr('src', (dpi>1) ? 'images/twitter-36.png' : 'images/twitter-18.png');
$('.js-12').attr('src', (dpi>1) ? 'images/line-738.png' : 'images/line-369.png');
$('.js-13').attr('src', (dpi>1) ? 'images/arrow-936.png' : 'images/arrow-468.png');
$('.js-14').attr('src', (dpi>1) ? 'images/resume-310.png' : 'images/resume-155.png');}else{$('.js-6').attr('src', (dpi>1) ? 'images/back-button-24.png' : 'images/back-button-12.png');
$('.js-7').attr('src', (dpi>1) ? 'images/letter-30.png' : 'images/letter-15.png');
$('.js-8').attr('src', (dpi>1) ? 'images/github-28.png' : 'images/github-14.png');
$('.js-9').attr('src', (dpi>1) ? 'images/instagram-28.png' : 'images/instagram-14.png');
$('.js-10').attr('src', (dpi>1) ? 'images/medium-30.png' : 'images/medium-15.png');
$('.js-11').attr('src', (dpi>1) ? 'images/twitter-30.png' : 'images/twitter-15.png');
$('.js-12').attr('src', (dpi>1) ? 'images/line-486.png' : 'images/line-243.png');
$('.js-13').attr('src', (dpi>1) ? 'images/arrow-578.png' : 'images/arrow-289.png');
$('.js-14').attr('src', (dpi>1) ? 'images/resume-206.png' : 'images/resume-103.png');}}};
if(!window.HTMLPictureElement){$(window).resize(r);r();}
(function(){$('a[href^="#"]:not(.allowConsent,.noConsent,.denyConsent,.removeConsent)').each(function(){$(this).click(function(){var t=this.hash.length>1?$('[name="'+this.hash.slice(1)+'"]').offset().top:0;return $("html, body").animate({scrollTop:t},400),!1})})})();

});