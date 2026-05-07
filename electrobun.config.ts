import type { ElectrobunConfig } from 'electrobun'

export default {
	app: {
		name: 'PR Review Agent',
		identifier: 'dev.local.pr-review-agent',
		version: '0.1.1',
	},
	build: {
		copy: {
			'dist/index.html': 'views/mainview/index.html',
			'dist/assets': 'views/mainview/assets',
		},
		watchIgnore: ['dist/**'],
		mac: {
			bundleCEF: false,
			icons: 'icon.iconset',
		},
		linux: {
			bundleCEF: false,
			icon: 'assets/icon.png',
		},
		win: {
			bundleCEF: false,
			icon: 'assets/icon.ico',
		},
	},
} satisfies ElectrobunConfig
