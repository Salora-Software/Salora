import Root from './divarea.svelte';

type FormDivAreaEvent<T extends Event = Event> = T & {
	currentTarget: EventTarget & HTMLTextAreaElement;
};

type DivAreaEvents = {
	blur: FormDivAreaEvent<FocusEvent>;
	change: FormDivAreaEvent<Event>;
	click: FormDivAreaEvent<MouseEvent>;
	focus: FormDivAreaEvent<FocusEvent>;
	keydown: FormDivAreaEvent<KeyboardEvent>;
	keypress: FormDivAreaEvent<KeyboardEvent>;
	keyup: FormDivAreaEvent<KeyboardEvent>;
	mouseover: FormDivAreaEvent<MouseEvent>;
	mouseenter: FormDivAreaEvent<MouseEvent>;
	mouseleave: FormDivAreaEvent<MouseEvent>;
	paste: FormDivAreaEvent<ClipboardEvent>;
	input: FormDivAreaEvent<InputEvent>;
};

export {
	Root,
	//
	Root as divarea,
	type DivAreaEvents,
	type FormDivAreaEvent
};
