import type { KitItemId } from '#lib/content.js';

export type KitView = 'closed' | 'open' | 'inspect';

/**
 * Single source of truth for the Blackout Communication Kit viewer.
 * Both the HTML controls and the Threlte scene read and write this,
 * so the scene can unmount/remount without losing state.
 */
export class KitState {
	view = $state<KitView>('closed');
	selected = $state<KitItemId | null>(null);
	reducedMotion = $state(false);

	get isOpen() {
		return this.view !== 'closed';
	}

	open() {
		this.view = 'open';
		this.selected = null;
	}

	close() {
		this.view = 'closed';
		this.selected = null;
	}

	inspect(id: KitItemId) {
		this.selected = id;
		this.view = 'inspect';
	}

	back() {
		this.view = 'open';
		this.selected = null;
	}
}
