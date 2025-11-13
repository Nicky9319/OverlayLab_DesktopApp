# Widget Window

A minimal, floating widget that provides quick access to AI conversation features.

## Features

- **Floating Button**: A small, circular button with a green status indicator
- **Task Bar**: Horizontal bar with three main functions:
  - Voice input/output toggle
  - Text message input
  - Conversation history viewer
- **Conversation Interface**: Chat-like interface showing human and AI messages

## Usage

1. **Hover** over the floating button to see "Active" status
2. **Click** the button to expand the task bar
3. **Voice Button**: Toggle voice input/output (green when active)
4. **Text Button**: Click to open a text input box
5. **Conversation Button**: Click to view conversation history

## Design

- Fixed to top-left of screen
- Always on top
- Transparent background
- Glassmorphism design with blur effects
- Responsive and mobile-friendly

## Development

The widget is built with React and uses:
- CSS animations and transitions
- SVG icons for buttons
- Local state management
- Click-outside detection for closing modals
