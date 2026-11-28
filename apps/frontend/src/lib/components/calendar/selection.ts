import type { SelectionAnchor } from './types';

export type DragSelectConfig = {
	hourHeight: number;
	dayStart: Date;
	snapMinutes?: number;
	onPreview: (range: { startMin: number; endMin: number } | null) => void;
	onCreate: (start: Date, end: Date, anchor: SelectionAnchor) => void;
};

const MINUTES_PER_DAY = 24 * 60;

/**
 * Click-or-drag on an empty grid column to create a time range. A plain click
 * creates a single snap-sized slot; dragging selects a longer range. The
 * selection stays visible after release so the create popover can anchor to it.
 */
export function dragSelect(node: HTMLElement, config: DragSelectConfig) {
	let cfg = config;
	let anchorMin = 0;
	let currentMin = 0;
	let active = false;

	const step = () => cfg.snapMinutes ?? 15;

	function minuteAt(clientY: number): number {
		const rect = node.getBoundingClientRect();
		const y = Math.min(Math.max(0, clientY - rect.top), rect.height);
		const raw = (y / cfg.hourHeight) * 60;
		const size = step();
		return Math.min(MINUTES_PER_DAY, Math.max(0, Math.round(raw / size) * size));
	}

	function normalized(): { startMin: number; endMin: number } {
		const start = Math.min(anchorMin, currentMin);
		const end = Math.max(anchorMin, currentMin);
		const endMin = Math.min(MINUTES_PER_DAY, end <= start ? start + step() : end);
		return { startMin: start, endMin };
	}

	function buildAnchor(startMin: number, endMin: number): SelectionAnchor {
		return {
			getBoundingClientRect() {
				const rect = node.getBoundingClientRect();
				const top = rect.top + (startMin / 60) * cfg.hourHeight;
				const bottom = rect.top + (endMin / 60) * cfg.hourHeight;
				return {
					x: rect.left,
					y: top,
					width: rect.width,
					height: bottom - top,
					top,
					left: rect.left,
					right: rect.left + rect.width,
					bottom
				};
			}
		};
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0) return;
		active = true;
		anchorMin = minuteAt(event.clientY);
		currentMin = anchorMin + step();
		node.setPointerCapture(event.pointerId);
		cfg.onPreview(normalized());
		event.preventDefault();
	}

	function onPointerMove(event: PointerEvent) {
		if (!active) return;
		currentMin = minuteAt(event.clientY);
		cfg.onPreview(normalized());
	}

	function onPointerUp(event: PointerEvent) {
		if (!active) return;
		active = false;
		try {
			node.releasePointerCapture(event.pointerId);
		} catch {
			// pointer capture may already be released
		}
		const { startMin, endMin } = normalized();
		cfg.onCreate(
			new Date(cfg.dayStart.getTime() + startMin * 60000),
			new Date(cfg.dayStart.getTime() + endMin * 60000),
			buildAnchor(startMin, endMin)
		);
	}

	function onPointerCancel() {
		if (!active) return;
		active = false;
		cfg.onPreview(null);
	}

	node.addEventListener('pointerdown', onPointerDown);
	node.addEventListener('pointermove', onPointerMove);
	node.addEventListener('pointerup', onPointerUp);
	node.addEventListener('pointercancel', onPointerCancel);

	return {
		update(next: DragSelectConfig) {
			cfg = next;
		},
		destroy() {
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('pointermove', onPointerMove);
			node.removeEventListener('pointerup', onPointerUp);
			node.removeEventListener('pointercancel', onPointerCancel);
		}
	};
}
