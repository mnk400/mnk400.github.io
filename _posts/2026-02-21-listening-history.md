---
layout: post
title: "A Decade of Listening"
description: "Analyzing a decade of Last.fm scrobbles"
date: 2026-02-21
scripts: [/assets/js/utils/canvas-utils.js, /assets/js/media/lastfm-blog.js]
---

Sometime around 2016 I set up a [last.fm](https://www.last.fm/user/mnk_400) account, which I initially forgot about but have been tracking more closely in recent years. What I've never done is sit down and analyze how my taste has evolved. A decade later, I have around <span id="scrobble-count">xx,xxx</span> tracked plays and it felt like the right time to actually look at what all that data says.

This is less of a rigorous analysis and more of a personal dig through the numbers. what changed, what surprised me, and what I'd forgotten about entirely.

<div class="lastfm-charts data-range">
  <span class="data-range__label">Show data through</span>
  {% assign range_options = "written:Feb 2026,latest:Latest" | split: "," %}
  {% include selection-switch.html id="data-range-toggle" size="small" options=range_options default_active="written" %}
</div>

---

## Genre drift

Each line in the graph below tracks a genre's relative share of my total listening for a given period.

To a complete non-surprise to me, one genre has been steadily climbing since 2018.

<div class="lastfm-charts" id="genre-drift-chart">
  <div class="chart-controls">
    {% assign res_options = "quarterly:Quarterly,monthly:Monthly" | split: "," %}
    {% include selection-switch.html id="genre-drift-resolution" size="small" options=res_options default_active="quarterly" %}
  </div>
  <div class="chart-container">
    <canvas></canvas>
  </div>
  <div class="chart-legend"></div>
</div>

<sup>Click a genre in the legend to isolate it.</sup>

I've always listened to a fair bit of indie, but when I first started tracking I was deep in a hip-hop era. Frank Ocean's Blonde had just come out, and my 18 year old self genuinely thought it changed my life; oh how naive.

I remember November of '16 when I was not particularly excited about listening to anything besides Blonde and The Life of Pablo.

By 2025, indie alone accounts for over 40% of my listening. The stuff that grew alongside it tells the same story: folk, singer-songwriter, lo-fi, and shoegaze all gained footing over the years. I guess I've grown into a real "indiehead" as they call it.

---

## Obscurity 

I've never cared much about how "obscure or mainstream" an artist is, but I figured I'd look anyway.

<div class="lastfm-charts" id="tier-chart">
  <div class="chart-controls">
    {% assign tier_options = "quarterly:Quarterly,monthly:Monthly" | split: "," %}
    {% include selection-switch.html id="tier-resolution" size="small" options=tier_options default_active="quarterly" %}
  </div>
  <div class="chart-container">
    <canvas></canvas>
  </div>
  <div class="chart-legend"></div>
</div>

<span class="note">Note: This would be obscurity vs other last.fm users. Obscurity is calculated using the listener count of each artist on the platform.</span>

Mostly confirms my priors, consistent throughout the years, not too underground, not too mainstream. Solidly in the "serious indie fan" zone.

The interesting bit is that my peak obscurity was around 2020–2021, possibly a pandemic effect where everyone was digging deeper into the catalogue.

---

## Artist arcs

Not every artist sticks around forever. Here are the ones I listened to in bursts: heavy phases that eventually fizzled out.

<div class="lastfm-charts" id="artist-lifecycle-chart">
  <div class="lifecycle-list"></div>
</div>

BROCKHAMPTON clustered entirely around 2018–2019 is hilarious. I caught the tail of their peak during my hip-hop phase, and it died down just as fast.

Duster is a funny one too, 500 plays almost entirely concentrated in a single quarter. Absolutely love Duster though; shoutout Stratosphere.

If nothing else, this reminds me to listen to more Duster and underscores.

---

## Discovery rate

Am I still discovering new music, or have I mostly settled into what I love?

<div class="lastfm-charts" id="discovery-chart">
  <div class="chart-controls">
    {% assign disc_options = "quarterly:Quarterly,monthly:Monthly" | split: "," %}
    {% include selection-switch.html id="discovery-resolution" size="small" options=disc_options default_active="quarterly" %}
  </div>
  <div class="chart-container">
    <canvas></canvas>
  </div>
</div>

Early on, almost everything was new, but that's just the cold-start effect of a fresh account. By 2019, it leveled off to a steadier baseline. There's a notable spike in mid-2024, which I believe was a deliberate effort on my part to branch out.

The most recent quarters are at their lowest point ever, which is a bit disappointing to see. I think I'd like to get back into discovering new music.

---

## A day in music

Lastly, I wanted to see how my listening patterns look throughout the day.

<div class="lastfm-charts" id="day-in-music">
  <div class="hourly-bars"></div>
  <div class="hourly-labels"></div>
  <div class="time-blocks"></div>
</div>

Radiohead is the only artist that shows up in every single time block. The Strokes come close, but they're juuuuust missing the late night slot. Which is fair. I love The Strokes, but sleeping music they are not.

The late night block skews exactly how you'd expect: Mogwai, Gonzales — the kind of stuff I want playing while I fall asleep. Compare that to daytime, where Charli xcx is the only pop artist to crack the list.

Wilco almost exclusively shows up in the early morning slot. I can't fully explain it, but Wilco is great morning commute music.

---

Ten years of data and the main takeaway is that I slowly turned into an indiehead who really needs to listen to more genre's again. Could be worse. If anything, going through all of this has me wanting to fix that last part.

<sup>See my recent scrobbles on the [music page](/more/music) or listen to some music on the [iPod](/more/ipod).</sup>
