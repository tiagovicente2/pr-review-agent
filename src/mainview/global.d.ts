declare global {
	interface Window {
		electrobun?: {
			minimize: () => void;
			toggleMaximize: () => void;
			close: () => void;
		};
	}
}

export {};
