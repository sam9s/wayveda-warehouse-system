# Cream Theme Reference

## Purpose

This folder captures the current WayVeda cream theme in a reusable format so it can be recreated in another project without reverse-engineering the live app again.

Primary source files:

- `frontend/src/styles/variables.css`
- `frontend/src/components/layout/Layout.module.css`

Reference asset in this folder:

- `cream-theme-reference.css`

## Theme Intent

The cream theme is not plain white.

It is meant to feel:

- warm
- premium
- soft on the eyes
- operational, not decorative

The visual direction is:

- dark espresso sidebar
- warm cream main canvas
- soft gold accent
- translucent off-white cards
- subtle amber hover/active states

## Topology

### 1. Shell Layers

There are three main background layers:

- outer shell background
- content-area background
- sidebar background

The cream theme depends on the contrast between:

- a warm dark sidebar
- a light warm workspace

### 2. Surface System

Main surfaces are not flat white.

Use:

- `surface-card`
- `surface-card-strong`
- `surface-card-soft`
- `surface-muted`

These should stay creamy and slightly translucent.

### 3. Accent System

Primary accent is warm gold / caramel:

- `accent-700`
- `accent-600`

This accent drives:

- section eyebrows
- focus rings
- chips
- sidebar active state
- hover highlights

### 4. Sidebar Behavior

The cream theme works because the sidebar remains dark.

Keep:

- dark brown vertical gradient
- warm amber hover state
- stronger active gradient for selected nav item
- light cream text with softer muted labels

### 5. Header and Workspace

The header should feel like part of the cream canvas, not a separate stark white bar.

Keep:

- soft cream header background
- warm date chip
- subtle borders
- card surfaces slightly lighter than the background

## Interaction Notes

### Sidebar Hover

The hover effect should remain visible even in cream mode.

Use:

- warm amber translucent hover fill
- slightly brighter active gradient

### Buttons and Pills

Avoid pure white ghost buttons where possible.

They should sit on:

- cream card surfaces
- cream header surfaces

### Cards

Cards should never collapse into bright white unless intentionally emphasized.

The correct feel is:

- creamy surface
- mild translucency
- gentle border
- soft shadow

## Rebuild Checklist

If recreating this theme in another project, preserve these elements:

1. Dark warm sidebar
2. Cream workspace gradient
3. Gold accent tokens
4. Cream card surfaces instead of white cards
5. Strong sidebar hover and active states
6. Warm header strip and date chip
7. Same typography pairing if possible:
   - `IBM Plex Sans`
   - `Sora`

## What Not To Do

- do not replace the cream workspace with flat bright white
- do not make the sidebar light
- do not switch the accent to yellow neon
- do not remove the warm translucent card treatment

## Porting Guidance

When recreating this theme elsewhere:

- start with the token values in `cream-theme-reference.css`
- replicate the shell / sidebar / content-area layering first
- then match hover states and card surfaces
- only after that tune typography and spacing

This order matters because the topology is what makes the theme recognizable.
