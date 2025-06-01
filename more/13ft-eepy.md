---
layout: post
title: 13 Feet Ladder (so eepy)
description: Self-hosted paywall detection
permalink: /more/13ft
category: Projects
---

This is my personal fork of [13ft](https://github.com/wasi-master/13ft){:target="_blank"} by wasi-master, which is itself a similar project to the famous paywall-bypassing service 12ft.

13ft helps detect paywalls on the internet by pretending to be GoogleBot (Google's web crawler) and attempting to fetch the same content that Google does.

This fork overhauls the UI and adds fallback options for the Wayback Machine and Archive.is.

{% capture 13ft-ios-shortcut %}
<div class="13ft-ios-shortcut">
  <img src="/assets/images/blogs/13ft-ios-shortcut.jpg" alt="13ft iOS Shortcut" class="img-curved-edges">
  <p>There's also an iOS Shortcut for this service that lets you quickly pass your currently active URL to my instance of 13ft. You can also modify it to work with your self-hosted instance.</p>
  <p><a href="https://www.icloud.com/shortcuts/751a7127fd7742f4a9800f1aa1de5564">Click here to install the shortcut.</a></p>
</div>
{% endcapture %}

{% include expandable-section.html 
  id="13ft-ios-shortcut" 
  title="<b>Install the iOS Shortcut!</b>" 
  content=13ft-ios-shortcut 
  expanded=false 
%}

<div class="controls">
    <a href="https://unlock.eepy.pink" target="_blank" rel="noopener noreferrer"><button class="normal-btn">Link to my instance of 13ft (so eepy)</button></a>
    <a href="https://www.github.com/mnk400/13ft" target="_blank" rel="noopener noreferrer"><button class="normal-btn">Link to code</button></a>
</div>
