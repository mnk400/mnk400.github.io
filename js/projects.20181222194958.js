(function(d){var h=[];d.loadImages=function(a,e){"string"==typeof a&&(a=[a]);for(var f=a.length,g=0,b=0;b<f;b++){var c=document.createElement("img");c.onload=function(){g++;g==f&&d.isFunction(e)&&e()};c.src=a[b];h.push(c)}}})(window.jQuery);
$.fn.hasAttr = function(name) { var attr = $(this).attr(name); return typeof attr !== typeof undefined && attr !== false; };

var lwi=-1;function thresholdPassed(){var w=$(window).width();var p=false;var cw=0;if(w>=1200){cw++;}if(lwi!=cw){p=true;}lwi=cw;return p;}

$(document).ready(function() {
r=function(){if(thresholdPassed()){dpi=window.devicePixelRatio;if($(window).width()>=1200){$('.js-7').attr('src', (dpi>1) ? 'images/pasted-image-722.png' : 'images/pasted-image-361.png');
$('.js-8').attr('src', (dpi>1) ? 'images/pasted-image-590.png' : 'images/pasted-image-295.png');
$('.js-9').attr('src', (dpi>1) ? 'images/pasted-image-80.png' : 'images/pasted-image-40.png');
$('.js-10').attr('src', (dpi>1) ? 'images/screenshot-2018-12-22-at-6.37.58-pm-400.png' : 'images/screenshot-2018-12-22-at-6.37.58-pm-200.png');
$('.js-11').attr('src', (dpi>1) ? 'images/pasted-image-80.png' : 'images/pasted-image-40.png');}else{$('.js-7').attr('src', (dpi>1) ? 'images/pasted-image-578.png' : 'images/pasted-image-289.png');
$('.js-8').attr('src', (dpi>1) ? 'images/pasted-image-472.png' : 'images/pasted-image-236.png');
$('.js-9').attr('src', (dpi>1) ? 'images/pasted-image-64.png' : 'images/pasted-image-32.png');
$('.js-10').attr('src', (dpi>1) ? 'images/screenshot-2018-12-22-at-6.37.58-pm-320.png' : 'images/screenshot-2018-12-22-at-6.37.58-pm-160.png');
$('.js-11').attr('src', (dpi>1) ? 'images/pasted-image-64.png' : 'images/pasted-image-32.png');}}};
if(!window.HTMLPictureElement){$(window).resize(r);r();}
(function(){$('a[href^="#"]:not(.allowConsent,.noConsent,.denyConsent,.removeConsent)').each(function(){$(this).click(function(){var t=this.hash.length>1?$('[name="'+this.hash.slice(1)+'"]').offset().top:0;return $("html, body").animate({scrollTop:t},400),!1})})})();

});