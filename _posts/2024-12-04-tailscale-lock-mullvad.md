---
layout: post
title: "Tailscale Lock & Mullvad Exit Nodes"
date: 2024-12-04
permalink: tailscale-lock-mullvad
---
<!-- ![1.png]({{site.url}}/assets/resources-tailscale-lock-mullvad/1.png) -->

> I **love** Tailscale. It's my first install on any new device and an indispensible tool.  This is my first and _only_ example of a non-stellar experience.

Have you enabled the Mullvad add-on for Tailscale but not seeing any trace of Mullvad on your enabled clients?  If you have [Tailnet Lock](https://tailscale.com/kb/1226/tailnet-lock) enabled, there's an extra step that, in my opinion, is a bit [under-documented](https://tailscale.com/kb/1258/mullvad-exit-nodes#what-should-i-know-about-using-mullvad-with-tailnet-lock) in the Tailscale docs.

Neither the [Mullvad admin page](https://login.tailscale.com/admin/settings/general/mullvad) nor the `tailscale exit-node` command provide any hints.  The `tailscale lock` command provides our first hint (I haven't figured out how to do this from a non-CLI client).

```bash
$ tailscale lock

...
...

The following nodes are locked out by tailnet lock and cannot connect to other nodes:
	us-sea-wg-001.mullvad.ts.net.	100.81.73.163	nQao6faCNTRL	nodekey:f345865a014ff6a7b99c9411377b4a80ac8c987c6e75669dadac7219a89154955
	us-bos-wg-102.mullvad.ts.net.	100.81.129.199	nQxKao6CNTRL	nodekey:c1c9a6697b99c9411377d27e50e2edc019b33aa14d738c36896ccf8abcd59816d
	jp-tyo-wg-001.mullvad.ts.net.	100.120.121.29	nQuUcao6NTRL	nodekey:014a3dfd197347b536c6badb90730d9f1193ab165aaadd304ec16d8d949818322
    ...
    <very long list of exit nodes>
    ...
```

From one of your signing nodes, you'll need to sign each node you want to use. For example:

```bash
tailscale lock sign nodekey:f345865a014ff6a7b99c9411377b4a80ac8c987c6e75669dadac7cN79a89154955
```

You'll now see this node available as an exit node (on mobile clients, too!):

```bash
$ tailscale exit-node list

IP                 HOSTNAME                                   COUNTRY     CITY            STATUS  
100.14.171.146     appletv.best-tailnet.ts.net                -           -               -  
100.81.73.163      us-sea-wg-001.mullvad.ts.net               USA         Seattle, WA     -
```
 
 >_**EDIT: Tailscale has published a solution of their own, tucked away on their [support GitHub account](https://github.com/tailscale-support/mullvad-script).**_

There is a `--json` flag on the Tailscale lock command:

```bash
tailscale lock status --json | jq -j  '.FilteredPeers | map(.NodeKey) | join("\n")'

nodekey:f345865a014ff6a7b99c9411377b4a80ac8c987c6e75669dadac7219a89154955
nodekey:c1c9a6697b99c9411377d27e50e2edc019b33aa14d738c36896ccf8abcd59816d
nodekey:014a3dfd197347b536c6badb90730d9f1193ab165aaadd304ec16d8d949818322
...
...
```

Piping these keys through the CLI command will sign *all* of your pending nodes:

```
tailscale lock status --json | jq -j  '.FilteredPeers | map(.NodeKey) | join("\n")' | xargs -n1 tailscale lock sign
```

Whether that's a good idea, i'll let you decide.

