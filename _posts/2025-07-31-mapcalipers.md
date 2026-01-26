---
layout: post
title: "Jetlag the App ✈️"
date: 2025-07-31
permalink: mapcalipers
redirect_from:
    - MapCalipers
    - map-calipers
    - jetlag
tags: mobile-dev show-and-tell
---
<!-- ![1.png]({{site.url}}/assets/resources-mapcalipers/1.png) -->


 [**MapCalipers**](https://apps.apple.com/us/app/map-calipers/id6746725018) is a flexible mapping toolkit built to help you defeat your friends in [Jet Lag: The Game Hide and Seek Transit Game](https://store.nebula.tv/products/hideandseek)!

The iOS app helps you pinpoint your target’s location within defined boundaries, steadily shrinking the search area using interactive tools like "Radar" and "Thermometer". Leveraging standard [GTFS](https://gtfs.org/) data, freely provided by many transit authorities, the app overlays precise transit lines and stops onto your play area. Use the built-in analysis features to determine which routes and stops your target might be hiding at, then use the dynamic mapping tools to track them down!

<!-- The app is available [for free on the App Store](#)! -->

This app is [free on the App Store](https://apps.apple.com/us/app/map-calipers/id6746725018)!

<img src="{{site.url}}/assets/resources-mapcalipers/cta.png" width="250" alt="Header photo of a full map">

## App Features

### Viable Search Area

Start off by drawing the bounds of your play area. This can be a city, neighborhood, or any other defined space. The app will then display just transit that is within this area, allowing you to focus on the most relevant routes and stops.

<img src="{{site.url}}/assets/resources-mapcalipers/setup.png" width="250" alt="Setup">


### Tools

The app provides a suite of tools to help you analyze the map and your target's location. Each tool is designed to answer specific questions about the target's position relative to landmarks, transit routes, and other features. For example:

Use the **Radar Tool** to quickly drop a circle and ask if the target is inside or outside. The app creates an exclusion zone based on your answer.

<img src="{{site.url}}/assets/resources-mapcalipers/radar.png" width="250" alt="Radar tool screenshot">

Use the **Thermometer Tool** to pick two points and see which side of the line the target is on. Great for slicing the map in half.

<img src="{{site.url}}/assets/resources-mapcalipers/thermometer.png" width="250" alt="Thermometer tool screenshot">


Feel creative? Use the **Custom Polygon** tool to rule out complex shapes. Perfect for excluding irregular areas.

<img src="{{site.url}}/assets/resources-mapcalipers/custom.png" width="250" alt="Custom polygon screenshot">


### Inspect Transit

Analyze nearby bus and train routes or stops that are still within the viable search area. 

<img src="{{site.url}}/assets/resources-mapcalipers/inspect.png" width="250" alt="Inspect tool screenshot">

### Sync

Share your game state with friends or collaborate on a shared map. The app allows you to push and pull game state to/from a collaboration server using a secret passphase.

<img src="{{site.url}}/assets/resources-mapcalipers/sync.png" width="250" alt="Syncing">

### Timeline History

Every tool use is recorded in the timeline. Jump back to previous steps to fix any mistakes.

<img src="{{site.url}}/assets/resources-mapcalipers/timeline.png" width="250" alt="Timeline history screenshot">


## Self-hosting

I host a small instance of the _control server_. The server is not needed to use the app's standard features, but provides (1) a way to share game state with others and (2) pre-processes GTFS transit data for the app to overlay on the map.

You are welcome to use the pre-configured instance _without any guarantee of uptime or data integrity_. If you want to run your own instance, you can do so with the following `docker-compose.yml` file:

```
services:
  mapcalipers:
    image: ghcr.io/joshspicer/mapcalipers:latest  # Latest App Store version
    # image: ghcr.io/joshspicer/mapcalipers:1.4   # Pin to an earlier App Store version
      ports:
        - "6001:6001"
    restart: unless-stopped
    volumes:
      - ./collab_server/sessions:/app/sessions
      - ./config:/app/config
    environment:
      - DATA_DIR=/app/sessions
      - CONFIG_DIR=/app/config
      - MAX_BACKUPS=5
      - PORT=6001
      - FLASK_DEBUG=False
      # - ADMIN_PASSWORD=my-great-password
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
```

### Docker Image Versions

The MapCalipers Docker images are tagged to match App Store versions. Each release is tagged with its corresponding version number (e.g., `ghcr.io/joshspicer/mapcalipers:1.4`). The most recent App Store version is also tagged as `:latest`.

**Important:** There is no guarantee of compatibility across minor versions. To ensure proper synchronization when collaborating, make sure all users are on the same app version and using the appropriately tagged server container.  My instance will be updated shortly after App Store releases. You can check by querying the `/health` endpoint.

Then in `./config/gtfs_config.json` provide information for each city's standardized [GTFS](https://gtfs.org/) zip URL.

If you encounter errors getting your city set up, please feel free to [send me an email]({{site.url}}/contact)!

```json
[
  {
    "city": "seattle",
    "zipUrl": "https://www.soundtransit.org/GTFS-KCM/google_transit.zip"
  },
  {
    "city": "boston",
    "zipUrl": "https://cdn.mbta.com/MBTA_GTFS.zip"
  },
  {
    "city": "nyc",
    "zipUrl": "https://rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip"
  },
  {
    "city": "sf",
    "zipUrl": "https://muni-gtfs.apps.sfmta.com/data/muni_gtfs-current.zip"
  }
]
```

You can then change the URL in the app to point to your instance, e.g. `http://localhost:6001`.

## Disclaimers

### Terms of Use

This app is not affiliated with or endorsed by the creators of [Jet Lag: The Game Hide and Seek Transit Game](https://store.nebula.tv/products/hideandseek).

Use at your own risk. The app is provided "as is" without any warranties or guarantees of functionality. The developer is not responsible for any issues that arise from using the app, including but not limited to data loss, incorrect game state, or misinterpretation of transit data.

Check with your friends before using the app! Some groups may prefer the good old pen-and-paper method of tracking each other down.

### Privacy

MapCalipers collects no personal data whatsoever. There is no use of telemetry or trackers employed by the app developer.

All application data resides on-device, unless you explicitly push game state to the collaboration server.  You can choose to not use the collaboration features by disabling transit data and not pushing or pulling game state to/from the collaboration server.

The collaboration server does not collect any personal data, but it does store the game state in a session file on the server.  This file is only accessible to the users who created it via the anonymized session ID and server administrators.  The server does not intentionally log any user activity beyond the anonymized game state data.

This page will be updated with any amendments to the privacy policy. We reserve the right to update this privacy policy with subsequent app updates.

