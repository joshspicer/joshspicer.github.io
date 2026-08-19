---
title: Cinnamon Photo of the Day
description: >-
  I have a cat named Cinnamon. She's the best. Here's a daily photo of her. (I'd recommend
  bookmarking this page...)
published: "2017-08-17"
slug: cinnamon
tags:
  - show-and-tell
---

> I have a cat named Cinnamon. She's the best. Here's a daily photo of her.
> (I'd recommend bookmarking this page...)

```javascript
  // Pick a photo of the day
  var date = new Date()
  var num = (date.getDay() * date.getYear() * date.getMonth()) % 119
  var photo = "/assets/cinnamon/" + num + ".jpg"
  document.getElementById("cinnaImage").src = photo;
```

<img class="cinnamon" id="cinnaImage" src="" alt="Cinnamon the cat, chosen for today" title="Today's Cinnamon"/>

<script src="/js/whichCinnamon.js"></script>
