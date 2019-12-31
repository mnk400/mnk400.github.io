(function(d){var h=[];d.loadImages=function(a,e){"string"==typeof a&&(a=[a]);for(var f=a.length,g=0,b=0;b<f;b++){var c=document.createElement("img");c.onload=function(){g++;g==f&&d.isFunction(e)&&e()};c.src=a[b];h.push(c)}}})(window.jQuery);
$.fn.hasAttr = function(name) { var attr = $(this).attr(name); return typeof attr !== typeof undefined && attr !== false; };

function em1(){var c="nol`511Ajdmpve/dpn";var addr="mailto:";for(var i=0;i<c.length;i++)addr+=String.fromCharCode(c.charCodeAt(i)-1);window.location.href=addr;}

$(document).ready(function() {
r=function(){dpi=window.devicePixelRatio;$('.js').attr('src', (dpi>1) ? 'images/pasted-image-1600.jpg' : 'images/pasted-image-800.jpg');
$('.js-2').attr('src', (dpi>1) ? 'images/8956ca07-c5a6-45b8-84dc-1d8d4f5622e2-726.jpeg' : 'images/8956ca07-c5a6-45b8-84dc-1d8d4f5622e2-363.jpeg');
$('.js-3').attr('src', (dpi>1) ? 'images/at-42.png' : 'images/at-21.png');
$('.js-4').attr('src', (dpi>1) ? 'images/github-52.png' : 'images/github-26.png');
$('.js-5').attr('src', (dpi>1) ? 'images/linkedin-letters-42.png' : 'images/linkedin-letters-21.png');};
if(!window.HTMLPictureElement){r();}
(function(){$('a[href^="#"]:not(.allowConsent,.noConsent,.denyConsent,.removeConsent)').each(function(){$(this).click(function(){var t=this.hash.length>1?$('[name="'+this.hash.slice(1)+'"]').offset().top:0;return $("html, body").animate({scrollTop:t},400),!1})})})();

});