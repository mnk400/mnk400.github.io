(function(d){var h=[];d.loadImages=function(a,e){"string"==typeof a&&(a=[a]);for(var f=a.length,g=0,b=0;b<f;b++){var c=document.createElement("img");c.onload=function(){g++;g==f&&d.isFunction(e)&&e()};c.src=a[b];h.push(c)}}})(window.jQuery);
$.fn.hasAttr = function(name) { var attr = $(this).attr(name); return typeof attr !== typeof undefined && attr !== false; };

var lwi=-1;function thresholdPassed(){var w=$(window).width();var p=false;var cw=0;if(w>=960){cw++;}if(w>=1200){cw++;}if(lwi!=cw){p=true;}lwi=cw;return p;}
function em1(){var c="nol`511Azbipp/dpn";var addr="mailto:";for(var i=0;i<c.length;i++)addr+=String.fromCharCode(c.charCodeAt(i)-1);window.location.href=addr;}

$(document).ready(function() {
r=function(){if(thresholdPassed()){dpi=window.devicePixelRatio;if($(window).width()>=1200){$('.js').attr('src', (dpi>1) ? 'images/pasted-image-540.png' : 'images/pasted-image-270.png');
$('.js-2').attr('src', (dpi>1) ? 'images/img_1540-528.jpg' : 'images/img_1540-264.jpg');
$('.js-3').attr('src', (dpi>1) ? 'images/pasted-image-80.png' : 'images/pasted-image-40.png');}else if($(window).width()>=960){$('.js').attr('src', (dpi>1) ? 'images/pasted-image-432.png' : 'images/pasted-image-216.png');
$('.js-2').attr('src', (dpi>1) ? 'images/img_1540-422.jpg' : 'images/img_1540-211.jpg');
$('.js-3').attr('src', (dpi>1) ? 'images/pasted-image-64.png' : 'images/pasted-image-32.png');}else{$('.js').attr('src', (dpi>1) ? 'images/pasted-image-474.png' : 'images/pasted-image-237.png');
$('.js-2').attr('src', (dpi>1) ? 'images/img_1540-452.jpg' : 'images/img_1540-226.jpg');
$('.js-3').attr('src', (dpi>1) ? 'images/pasted-image-50.png' : 'images/pasted-image-25.png');}}};
if(!window.HTMLPictureElement){$(window).resize(r);r();}
(function(){$('a[href^="#"]:not(.allowConsent,.noConsent,.denyConsent,.removeConsent)').each(function(){$(this).click(function(){var t=this.hash.length>1?$('[name="'+this.hash.slice(1)+'"]').offset().top:0;return $("html, body").animate({scrollTop:t},400),!1})})})();

});