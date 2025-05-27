---
layout: post
title: "HabitBridge: A Habit Tracking App For Hackers"
date: 2025-05-24
permalink: HabitBridge
redirect_from:
    - habitbridge
    - habit-bridge
---

Meet [**HabitBridge**](https://apps.apple.com/us/app/habitbridge/id6742713867) - a habit tracking app designed for developers, hackers, and anyone else who wants _real_ control over their digital habit tracking. 

<div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 250px; padding-right: 10px;">
    <img src="{{site.url}}/assets/resources-habit-bridge/9.png" width="250">
  </div>
  <div style="flex: 1; min-width: 250px;">
    <img src="{{site.url}}/assets/resources-habit-bridge/2.png" width="250">
  </div>
</div>
<br>

HabitBridge aims to be infinitely extensible to make habit tracking more effective and engaging. It combines "traditional" habit tracking features with a robust plugin framework and webhooks to trigger automations and integrate with any system you choose.

## Download Now

HabitBridge is available **for free** on the App Store:

[**Download HabitBridge**](https://apps.apple.com/us/app/habitbridge/id6742713867)

## What Makes HabitBridge Different?

### Smart Screen Time Management

HabitBridge lets you set limits on distracting apps and only unlocks them after you've completed your daily habits. Want to check Instagram? Complete your morning workout first.

<div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 250px; padding-right: 10px;">
  <img src="{{site.url}}/assets/resources-habit-bridge/12.png" alt="Screen Time permission screen showing HabitBridge requesting access to restrict app usage" width="250">
  </div>
  <div style="flex: 1; min-width: 250px;">
    <img src="{{site.url}}/assets/resources-habit-bridge/3.png" alt="" width="250">
  </div>
</div>
<br>

The app integrates directly with the iOS system Screen Time APIs.

### Manual Habit Tracking

HabitBridge makes it easy to manually track granular-based habits.

<div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 250px; padding-right: 10px;">
  <img src="{{site.url}}/assets/resources-habit-bridge/10.png" width="250">
  </div>
  <div style="flex: 1; min-width: 250px;">
    <img src="{{site.url}}/assets/resources-habit-bridge/4.png" width="250">
  </div>
</div>
<br>


### Custom Plugin System

This is where HabitBridge truly shines. Install and build your own custom plugins in JavaScript.  A plugin defines a unique challenge required to mark that task as complete. 

Practice a language, solve math problems, complete a puzzle, or complete creative challenges. Each plugin can have its own UI and logic, allowing for endless possibilities.

Want to share your creations? Submit your plugins to the [**HabitBridge repo on GitHub**](https://github.com/joshspicer/habitbridgemarketplace) for everyone to enjoy. See below on how to build your own!

### Webhook Integration

Send your habit data to any system via webhooks, enabling powerful automations. Track your habits in spreadsheets, trigger smart home devices, or integrate with your existing productivity tools.

<div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 250px; padding-right: 10px;">
  <img src="{{site.url}}/assets/resources-habit-bridge/16.png" alt="" width="250">
  </div>
  <div style="flex: 1; min-width: 250px;">
    <img src="{{site.url}}/assets/resources-habit-bridge/17.png" alt="" width="250">
  </div>
</div>
<br>

This can be sent to any web service that accepts webhooks, allowing for endless integration possibilities. Every habit completion is logged with timestamps, making it easy to track your progress programmatically.

<img src="{{site.url}}/assets/resources-habit-bridge/15.png" alt="" width="700">

#### Home Assistant

I plan to release a [Home Assistant](https://www.home-assistant.io/) integration to trigger smart home automations based on habit completion. Imagine your smart lights changing color when you complete your morning routine, or your coffee maker starting when you finish your workout.

_Subscribe to this blog's [RSS Feed](https://joshspicer.com/feed.xml) for updates._

<!-- *Video demo of Home Assistant integration coming soon!* -->


### Widgets

See your habit completions at a glance with home screen widgets. More system integrations are planned and coming soon!

<img src="{{site.url}}/assets/resources-habit-bridge/7.png" width="400">

## Privacy & Data

HabitBridge is designed with [privacy in mind](https://raw.githubusercontent.com/joshspicer/HabitBridge-release/refs/heads/main/privacy.md). Your habit data stays on your device unless you explicitly choose to export it or send it via webhooks to systems you control.  The app contains no ads, trackers, or analytics. 

### Export Your Data

 HabitBridge supports full manual exports as JSON, making it easy to migrate to other systems or perform your own analysis.  Import that data back into HabitBridge at any time.


## Building Your Own Plugin

The real power of HabitBridge comes from its extensible plugin system. Here's what you need to know to create your own plugins:

#### Plugin Structure

Each plugin consists of two key files:
1. `plugin.js` - The JavaScript code that powers your plugin
2. `manifest.json` - Metadata that describes your plugin

#### API Reference

| Method | Description |
|--------|-------------|
| `app.init(callback)` | Entry point for your plugin |
| `app.renderHTML(htmlString)` | Renders your plugin's UI |
| `app.complete()` | Marks the habit as complete |

#### Global Scope Access

Plugins can expose functions to the global scope for UI interaction in the app's HTML. This allows you to define event handlers that can be called from HTML elements:

```javascript
// Make functions accessible from HTML event handlers
window.functionName = () => {
  // Function logic
};

app.init(() => {
  app.renderHTML(`
    <button onclick="functionName()">Click me</button>
  `);
});
```

#### Get Creative!

Get creative with your plugins! The [Morse Code](https://github.com/joshspicer/HabitBridgeMarketplace/blob/main/morse-code/plugin.js) plugin demonstrates how to access device audio capabilities:

```javascript
// Audio context creation example
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Basic audio playback
function playSound() {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.1); // Short beep
}
```

#### Example

Here's a simple example of a HabitBridge plugin that tracks button clicks as a habit challenge. The user must click a button 3 times to complete the habit.

```javascript
app.init(() => {
  let clicks = 0;
  
  app.renderHTML(`
    <h1>Click the button to complete</h1>
    <button onclick="buttonClick()" class="btn">Click me</button>
    <div id="counter">Clicks: 0</div>
    <style>.btn { padding: 10px; }</style>
  `);
  
  window.buttonClick = () => {
    clicks++;
    document.getElementById("counter").textContent = `Clicks: ${clicks}`;
    if (clicks >= 3) {
      app.complete();
    }
  };
});
```

Need some more ideas? Check out the [Memory Sequence](https://github.com/joshspicer/HabitBridgeMarketplace/tree/main/memory-sequence) or [Meditation Timer](https://github.com/joshspicer/HabitBridgeMarketplace/tree/main/meditation-timer) plugin source code.

<div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
  <div style="flex: 1; min-width: 250px; padding-right: 10px;">
  <img src="{{site.url}}/assets/resources-habit-bridge/18.gif" alt="" width="250">
  </div>
  <div style="flex: 1; min-width: 250px;">
    <img src="{{site.url}}/assets/resources-habit-bridge/19.gif" alt="" width="250">
  </div>
</div>
<br>

#### Publishing Your Plugin

Once you've created your plugin:

1. Clone the [HabitBridge repo](https://github.com/joshspicer/habitbridgemarketplace) and create a new folder, named to match the id of your plugin
2. Add your `plugin.js` file
3. Add a `manifest.json` file with your plugin information

```json
{
  "id": "word-scramble",
  "name": "Word Scramble Challenge",
  "description": "Unscramble randomly selected words to complete your habit."
}
```

4. Submit a pull request to have your plugin added to the marketplace

> Want to instead use your own marketplace instance?  Configure this under 'Advanced Settings' in HabitBridge. There you will change the [index URL](https://joshspicer.com/HabitBridgeMarketplace/index.json) to a URL of your choosing.


## Issue Reporting

Find an issue with HabitBridge?  Please [open an issue on GitHub](https://github.com/joshspicer/habitbridge-release/issues) or [contact me](https://joshspicer.com/contact). Thanks for reading!
