import { useEffect, useRef } from "react";

/**
 * A custom hook that executes a callback function at specified intervals
 * @param callback Function to be called at each interval
 * @param delay Delay in milliseconds between each callback execution. If null, the interval is paused
 */
export function useInterval(callback: () => void, delay: number | null) {
	const savedCallback = useRef<() => void>(() => {});

	// Remember the latest callback
	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	// Set up the interval
	useEffect(() => {
		if (delay === null) {
			return;
		}

		const tick = () => {
			savedCallback.current();
		};

		const id = setInterval(tick, delay);
		return () => clearInterval(id);
	}, [delay]);
}
