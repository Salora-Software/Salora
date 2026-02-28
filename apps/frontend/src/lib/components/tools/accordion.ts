export function accordion(node: HTMLElement, params: { isOpen: boolean; startHeight: number }) {
	let { isOpen, startHeight } = params;
	let initialHeight: number = node.offsetHeight;
	node.style.height = isOpen ? initialHeight + 'px' : '0px';
	node.style.overflow = 'hidden';
	return {
		update(params: { isOpen: boolean; startHeight: number }) {
			let { isOpen } = params;
			let animation: Animation = node.animate(
				[
					{ height: initialHeight + 'px', overflow: 'visible' },
					{ height: (isOpen ? startHeight : 0) + 'px', overflow: 'hidden' }
				],
				{ duration: isOpen ? 100 : 0, fill: 'both' }
			);
			animation.pause();
			animation.finished.then(() => {
				node.style.height = isOpen ? 'unset !important' : '0px';
			});
			if (!isOpen) {
				animation.play();
			} else {
				animation.reverse();
			}
		}
	};
}
