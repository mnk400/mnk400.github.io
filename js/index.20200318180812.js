(function(d){var h=[];d.loadImages=function(a,e){"string"==typeof a&&(a=[a]);for(var f=a.length,g=0,b=0;b<f;b++){var c=document.createElement("img");c.onload=function(){g++;g==f&&d.isFunction(e)&&e()};c.src=a[b];h.push(c)}}})(window.jQuery);
$.fn.hasAttr = function(name) { var attr = $(this).attr(name); return typeof attr !== typeof undefined && attr !== false; };

var lwi=-1;function thresholdPassed(){var w=$(window).width();var p=false;var cw=0;if(w>=960){cw++;}if(lwi!=cw){p=true;}lwi=cw;return p;}
function em1(){var c="nol`511Ajdmpve/dpn";var addr="mailto:";for(var i=0;i<c.length;i++)addr+=String.fromCharCode(c.charCodeAt(i)-1);window.location.href=addr;}

$(document).ready(function() {
r=function(){if(thresholdPassed()){dpi=window.devicePixelRatio;if($(window).width()>=960){$('.js').attr('src', (dpi>1) ? 'images/email-40.png' : 'images/email-20.png');
$('.js-2').attr('src', (dpi>1) ? 'images/github-2-46.png' : 'images/github-2-23.png');
$('.js-3').attr('src', (dpi>1) ? 'images/linkedin-46.png' : 'images/linkedin-23.png');
$('.js-4').attr('src', (dpi>1) ? 'images/8956ca07-c5a6-45b8-84dc-1d8d4f5622e2-726-460-1.jpg' : 'images/8956ca07-c5a6-45b8-84dc-1d8d4f5622e2-726-230-1.jpg');}else{$('.js').attr('src', (dpi>1) ? 'images/email-34.png' : 'images/email-17.png');
$('.js-2').attr('src', (dpi>1) ? 'images/github-2-42.png' : 'images/github-2-21.png');
$('.js-3').attr('src', (dpi>1) ? 'images/linkedin-38.png' : 'images/linkedin-19.png');
$('.js-4').attr('src', (dpi>1) ? 'images/8956ca07-c5a6-45b8-84dc-1d8d4f5622e2-726-460.jpg' : 'images/8956ca07-c5a6-45b8-84dc-1d8d4f5622e2-726-230.jpg');}}};
if(!window.HTMLPictureElement){$(window).resize(r);r();}
(function(){$('a[href^="#"]:not(.allowConsent,.noConsent,.denyConsent,.removeConsent)').each(function(){$(this).click(function(){var t=this.hash.length>1?$('[name="'+this.hash.slice(1)+'"]').offset().top:0;return $("html, body").animate({scrollTop:t},400),!1})})})();

});