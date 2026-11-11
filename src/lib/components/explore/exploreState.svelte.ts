import { chapters, type Ui } from './chapters.js';

/**
 * Shared between the page (HTML controls) and the 3D scene: which chapter is
 * showing and how to get there.
 */
export class ExploreState {
	index = $state(0);
	/** Bumped on every navigation, so going to the same chapter again still registers. */
	seq = $state(0);
	/**
	 * `play` runs the chapter's choreography from its start (Next, autoplay);
	 * `settle` goes straight for its settled state (jumps, Previous, deep links);
	 * `replay` first rewinds to where the previous chapter ended.
	 */
	mode: 'play' | 'settle' | 'replay' = 'settle';
	reduced = $state(false);
	choice = $state<Ui['choice']>('public');
	pageTurned = $state(true);
	/** Ids of the labels showing right now (set by the scene). */
	shown = $state<string[]>([]);
	/** Ids of the chips filled green right now (set by the scene). */
	lit = $state<string[]>([]);
	/** True while anything is moving (set by the scene). */
	busy = $state(false);

	get chapter() {
		return chapters[this.index];
	}
	get ui(): Ui {
		return { choice: this.choice, pageTurned: this.pageTurned };
	}

	go(i: number, mode: ExploreState['mode'] = 'settle') {
		const next = Math.max(0, Math.min(chapters.length - 1, i));
		if (next === this.index && mode !== 'replay') return false;
		this.index = next;
		this.mode = mode;
		this.pageTurned = true;
		this.seq++;
		return true;
	}
}
