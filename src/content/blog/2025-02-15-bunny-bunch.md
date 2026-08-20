---
title: " 🐰 Download my iPhone Game"
description: >-
  Bunny Bunch is a free adaptation of Cubirds by Pandasaurus Games. If you enjoy Bunny Bunch, please
  consider purchasing the original game! This YouTube video explains the rules...
published: "2025-02-15"
slug: bunny-bunch
tags:
  - mobile-dev
  - show-and-tell
redirectFrom:
  - bunnybunch
  - cubird
  - cubirds
  - BunnyBunch
---

<!-- ![1.png](/assets/resources-bunny-bunch/1.png) -->

> Bunny Bunch is a free adaptation of [Cubirds](https://pandasaurusgames.com/products/cubirds) by Pandasaurus Games.  If you enjoy Bunny Bunch, please consider purchasing the original game!
>
> [This YouTube video](https://www.youtube.com/watch?v=HUP9Rz_gHqM) explains the [rules](https://www.ultraboardgames.com/cubirds/game-rules.php) of Cubirds in detail.  If you learn the rules of Cubirds, you will know how to play Bunny Bunch!

## Bunny Bunch

[**Bunny Bunch**](https://apps.apple.com/us/app/bunny-bunch/id6739154162) is a turn-based strategy iOS/iPadOS/tvOS/macOS card game. The game is turn-based ("pass 'n play") and can be played with up to five players _on a single iPad_.

> The game also supports local multi-device play (in beta). More on that later!

I built Bunny Bunch as a Christmas present with the goal of creating an engaging "pass 'n play" game to whip out and kill a few minutes while traveling for the holidays. Bunny Bunch has been successfully played on trains, in airports, and even in a car!

## Rules

If you _haven't_ played Cubirds, here's an overview of the game (but really, watch [this video](https://www.youtube.com/watch?v=HUP9Rz_gHqM) or read [these instructions](https://www.ultraboardgames.com/cubirds/game-rules.php) first):

### Game Overview

In Bunny Bunch, players compete to collect groups of bunnies. Your goal is to either collect 7 different types of bunnies, or 2 types with at least 3 bunnies each.

![1.png](/assets/resources-bunny-bunch/1.png)

### Setup
- The game starts with 4 rows of 3 cards in the center
- Each player gets 8 cards in hand, plus 1 bunny to start their collection
- Each row must contain different types of bunnies

### On Your Turn

1. **Play Bunnies (Required)**
   - Choose a type of bunny from your hand
   - You must play ALL bunnies of that type from your hand
   - Place them on either end of any row
   - If you surround other cards between bunnies of the same type, collect the surrounded cards
   - If your turn results in not picking up any card, you _may_ pick up two cards from the deck

2. **Form a Bunch (Optional)**
   - If you have enough bunnies of the same type in your hand, you can form a bunch
   - Small bunch: Keep 1 bunny for your collection
   - Large bunch: Keep 2 bunnies for your collection
   - Remaining bunnies are discarded

If your turn ends with you having no cards in your hand, all players must discard their hands and draw 8 new cards (a great way to annoy your friends!)

### Winning
Win by collecting either:
- 7 different types of bunnies
- 2 types with at least 3 bunnies each

![A bunny card moving from the hand into the grid of played cards](/assets/resources-bunny-bunch/2.gif "Playing a bunny and collecting cards")

![Matching bunny cards being grouped together on the board](/assets/resources-bunny-bunch/3.gif "Forming a bunch")

![A new card being drawn from the deck into the player's hand](/assets/resources-bunny-bunch/4.gif "Drawing from the deck")

![The main menu appearing over the board](/assets/resources-bunny-bunch/5.gif "Shake your phone (or press 'M' on a mac) to access the main menu")

![Bunny Bunch running on a living room television](/assets/resources-bunny-bunch/6.jpg "Play on your TV!")

### Multi-Device Play

While pass 'n play is great, sometimes you don't trust your friends to not glance at your cards.  Using Apple's [Multipeer Connectivity](https://developer.apple.com/documentation/multipeerconnectivity) framework, Bunny Bunch supports local multi-device play.  This allows nearby devices to connect to each other and share game state.

In this mode, you select one device as the "host".  Each player then joins that game from their own device.  The player's hand is hidden on the host device and streamed to your personal device.

**This feature is a bit finicky and works best when both devices are on the same Wi-Fi network.** If you get disconnected, often quitting the app and connecting again will help.

![7.png](/assets/resources-bunny-bunch/7.png)


**Interested in playing?  Grab a friend and [download today from the App Store](https://apps.apple.com/us/app/bunny-bunch/id6739154162)**

## Acknowledgements

For any issues, feel free to let me know [on GitHub](https://github.com/joshspicer/bunnybunch-release).

Thanks to [Pandasaurus Games](https://pandasaurusgames.com) for designing an awesome game.

Finally, this game is dedicated to Emily - without her it would not exist.  Also, a huge thanks to her for the bunny artwork.
