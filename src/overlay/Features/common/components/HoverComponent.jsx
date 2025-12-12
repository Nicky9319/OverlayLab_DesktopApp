import React, { useRef, useEffect } from 'react'

// Global state to coordinate multiple HoverComponent instances
let globalHoverCount = 0
let globalDisableTimeout = null
let globalClickTimeout = null

// Global function to force click-through restoration (useful for dropdown interactions)
window.forceClickThroughRestore = () => {
	if (globalClickTimeout) {
		clearTimeout(globalClickTimeout)
		globalClickTimeout = null
	}
	if (globalDisableTimeout) {
		clearTimeout(globalDisableTimeout)
		globalDisableTimeout = null
	}
	
	// Only disable interaction if no components are currently hovered
	if (globalHoverCount === 0) {
		try {
			if (window.electronAPI?.setIgnoreMouseEvents) {
				window.electronAPI.setIgnoreMouseEvents(true);
			}
		} catch (error) {
			console.error('Error forcing click-through restore:', error);
		}
	}
}

// Makes wrapped region clickable even when the window is globally click-through
// by enabling interaction on hover and disabling it when the pointer leaves.
const HoverComponent = ({ children, className, style, onClick }) => {
	const hoverDepthRef = useRef(0)

	const enableInteraction = () => {
		try {
			// For widget window, use setIgnoreMouseEvents directly
			if (window.electronAPI?.setIgnoreMouseEvents) {
				window.electronAPI.setIgnoreMouseEvents(false);
			}
		} catch (error) {
			console.error('Error enabling interaction:', error);
		}
	}

	const disableInteraction = () => {
		try {
			// For widget window, use setIgnoreMouseEvents directly
			if (window.electronAPI?.setIgnoreMouseEvents) {
				window.electronAPI.setIgnoreMouseEvents(true);
			}
		} catch (error) {
			console.error('Error disabling interaction:', error);
		}
	}

	useEffect(() => {
		return () => {
			// Cleanup: reduce global count by this instance's hover depth
			if (hoverDepthRef.current > 0) {
				globalHoverCount = Math.max(globalHoverCount - hoverDepthRef.current, 0)
				hoverDepthRef.current = 0
				
				// If no instances are hovered, disable interaction
				if (globalHoverCount === 0) {
					if (globalDisableTimeout) {
						clearTimeout(globalDisableTimeout)
						globalDisableTimeout = null
					}
					if (globalClickTimeout) {
						clearTimeout(globalClickTimeout)
						globalClickTimeout = null
					}
					disableInteraction()
				}
			}
		}
	}, [])

	const handlePointerEnter = () => {
		// Clear any pending disable timeout
		if (globalDisableTimeout) {
			clearTimeout(globalDisableTimeout)
			globalDisableTimeout = null
		}
		
		// Clear any pending click timeout
		if (globalClickTimeout) {
			clearTimeout(globalClickTimeout)
			globalClickTimeout = null
		}

		// Increment this instance's hover depth
		hoverDepthRef.current += 1

		// If this is the first hover for this instance, increment global count
		if (hoverDepthRef.current === 1) {
			globalHoverCount += 1
			
			// Enable interaction if this is the first hovered instance globally
			if (globalHoverCount === 1) {
				enableInteraction()
			}
		}
	}

	const handlePointerLeave = () => {
		// Decrement this instance's hover depth
		hoverDepthRef.current = Math.max(hoverDepthRef.current - 1, 0)

		// If this instance is no longer hovered, decrement global count
		if (hoverDepthRef.current === 0) {
			globalHoverCount = Math.max(globalHoverCount - 1, 0)
			
			// If no instances are hovered globally, disable interaction after delay
			if (globalHoverCount === 0) {
				// Clear any existing click timeout since we're leaving hover
				if (globalClickTimeout) {
					clearTimeout(globalClickTimeout)
					globalClickTimeout = null
				}
				
				// Small delay prevents flicker when moving between components
				globalDisableTimeout = setTimeout(() => {
					disableInteraction()
					globalDisableTimeout = null
				}, 75)
			}
		}
	}

	const handlePointerDown = () => {
		// Ensure we are interactive right before handling the click
		enableInteraction()
	}

	const handleClick = (e) => {
		// Ensure we are interactive when clicked
		enableInteraction()
		
		// Clear any existing click timeout
		if (globalClickTimeout) {
			clearTimeout(globalClickTimeout)
			globalClickTimeout = null
		}
		
		// Call the onClick callback if provided
		if (onClick && typeof onClick === 'function') {
			onClick(e)
		}
		
		// Set a timeout to restore click-through behavior after click interactions
		// This is especially important for dropdown interactions
		globalClickTimeout = setTimeout(() => {
			// Only disable interaction if no components are currently hovered
			if (globalHoverCount === 0) {
				disableInteraction()
			}
			globalClickTimeout = null
		}, 150) // Increased timeout to allow for dropdown interactions
	}

	return (
		<div
			className={className}
			style={{ pointerEvents: 'auto', ...style }}
			onPointerEnter={handlePointerEnter}
			onPointerLeave={handlePointerLeave}
			onPointerDown={handlePointerDown}
			onClick={handleClick}
		>
			{children}
		</div>
	)
}

export default HoverComponent
