---
title: "HabitBridge: A Habit Tracking App For Hackers"
description: >-
  Meet HabitBridge - a habit tracking app designed for developers, hackers, and anyone else who
  wants real control over their digital habit tracking.
published: "2025-05-24"
slug: HabitBridge
tags:
  - mobile-dev
  - show-and-tell
redirectFrom:
  - habitbridge
  - habit-bridge
---

Meet [**HabitBridge**](https://apps.apple.com/us/app/habitbridge/id6742713867) - a habit tracking app designed for developers, hackers, and anyone else who wants _real_ control over their digital habit tracking. 

![The HabitBridge home screen listing habits with daily check-off grids](/assets/resources-habit-bridge/9.png "Track habits day by day")
![A plugin challenge asking the user to conjugate an Italian verb](/assets/resources-habit-bridge/2.png "…or gate a habit behind a custom plugin challenge")

HabitBridge aims to be infinitely extensible to make habit tracking more effective and engaging. It combines "traditional" habit tracking features with a robust plugin framework and webhooks to trigger automations and integrate with any system you choose.

## Download Now

HabitBridge is available **for free** on the App Store:

[**Download HabitBridge**](https://apps.apple.com/us/app/habitbridge/id6742713867)

## What Makes HabitBridge Different?

### Smart Screen Time Management

HabitBridge lets you set limits on distracting apps and only unlocks them after you've completed your daily habits. Want to check Instagram? Complete your morning workout first.

![Screen Time permission screen showing HabitBridge requesting access to restrict app usage](/assets/resources-habit-bridge/12.png "HabitBridge asks for Screen Time access")
![Choosing which app categories to lock, such as Social and Games](/assets/resources-habit-bridge/3.png "Pick the categories to lock until habits are done")

The app integrates directly with the iOS system Screen Time APIs.

### Manual Habit Tracking

HabitBridge makes it easy to manually track granular-based habits.

![The habit list showing a piano practice timer and a push-up counter](/assets/resources-habit-bridge/10.png "Timers and counters live alongside simple check-offs")
![A habit detail screen showing 70% progress toward a 60 minute target](/assets/resources-habit-bridge/4.png "Each habit tracks progress toward its own target")


### Custom Plugin System

This is where HabitBridge truly shines. Install and build your own custom plugins in JavaScript.  A plugin defines a unique challenge required to mark that task as complete. 

Practice a language, solve math problems, complete a puzzle, or complete creative challenges. Each plugin can have its own UI and logic, allowing for endless possibilities.

Want to share your creations? Submit your plugins to the [**HabitBridge repo on GitHub**](https://github.com/joshspicer/habitbridgemarketplace) for everyone to enjoy. See below on how to build your own!

### Webhook Integration

Send your habit data to any system via webhooks, enabling powerful automations. Track your habits in spreadsheets, trigger smart home devices, or integrate with your existing productivity tools.

![HabitBridge settings with webhooks enabled and a local webhook URL](/assets/resources-habit-bridge/16.png "Point HabitBridge at any webhook URL")
![A webhook log entry showing the JSON payload sent on habit completion](/assets/resources-habit-bridge/17.png "Every delivery is logged with its payload")

This can be sent to any web service that accepts webhooks, allowing for endless integration possibilities. Every habit completion is logged with timestamps, making it easy to track your progress programmatically.

![A terminal running an echo server printing the JSON payload HabitBridge posted](/assets/resources-habit-bridge/15.png)

#### Home Assistant

I've created a [Home Assistant](https://www.home-assistant.io/) addon to trigger smart home automations based on habit completion. 


1. Add [the repository](https://github.com/joshspicer/habitbridge-addons) to your Home Assistant addon store:
   - In Home Assistant, go to Settings -> Add-ons -> Add-on Store
   - Click the menu (⋮) in the top right corner and select "Repositories"
   - Add the URL: `https://github.com/joshspicer/habitbridge-addons`
   - Click "Add"

2. Find and install the "HabitBridge" addon from the add-on store
3. Start the addon
4. Add `http://<your-home-assistant-ip>:8000/webhook` as the webhook URL in HabitBridge app settings.

After the first webhook is received, several new `habitbridge` prefixed sensors will be created in Home Assistant. 

Use these sensors to trigger automations based on habit completions.

![An LED strip switching on once the day's habits are complete](/assets/resources-habit-bridge/ha.gif "Enables an LED strip when all habits are completed for the day")

Imagine your smart lights changing color when you complete your morning routine, or your coffee maker starting when you finish your workout.


### Widgets

See your habit completions at a glance with home screen widgets. More system integrations are planned and coming soon!

![The HabitBridge home screen widget showing a completion grid](/assets/resources-habit-bridge/7.png "A home screen widget with the month's completions")

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

![The Memory Game plugin listed as a habit in HabitBridge](/assets/resources-habit-bridge/18.gif "Memory Sequence")
![The Meditation Timer plugin listed as a habit in HabitBridge](/assets/resources-habit-bridge/19.gif "Meditation Timer")

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
