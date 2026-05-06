type ColorMode = 'dark' | 'light'

type Listener = (colorMode: ColorMode) => void

const listeners = new Set<Listener>()
let cachedSystemColorMode: ColorMode | null = null
let watcherStarted = false
let colorSchemeMonitor: Bun.Subprocess<'ignore', 'pipe', 'pipe'> | null = null
let gtkThemeMonitor: Bun.Subprocess<'ignore', 'pipe', 'pipe'> | null = null

export async function getSystemColorMode(): Promise<ColorMode> {
	const colorMode = await readSystemColorMode()
	if (colorMode) {
		cachedSystemColorMode = colorMode
		return colorMode
	}

	return cachedSystemColorMode ?? 'light'
}

export async function startSystemColorModeWatcher(onChange: Listener) {
	listeners.add(onChange)

	const initialColorMode = await getSystemColorMode()
	onChange(initialColorMode)

	if (watcherStarted) return
	watcherStarted = true

	colorSchemeMonitor = startGSettingsMonitor('org.gnome.desktop.interface', 'color-scheme')
	gtkThemeMonitor = startGSettingsMonitor('org.gnome.desktop.interface', 'gtk-theme')
}

function startGSettingsMonitor(schema: string, key: string) {
	try {
		const proc = Bun.spawn(['gsettings', 'monitor', schema, key], {
			stdin: 'ignore',
			stdout: 'pipe',
			stderr: 'pipe',
		})

		void readMonitorOutput(proc.stdout)
		void proc.exited.then(() => {
			if (colorSchemeMonitor === proc) colorSchemeMonitor = null
			if (gtkThemeMonitor === proc) gtkThemeMonitor = null
		})

		return proc
	} catch {
		return null
	}
}

async function readMonitorOutput(stream: ReadableStream<Uint8Array>) {
	const reader = stream.getReader()
	const decoder = new TextDecoder()
	let buffer = ''

	try {
		while (true) {
			const { done, value } = await reader.read()
			if (done) break
			buffer += decoder.decode(value, { stream: true })

			while (buffer.includes('\n')) {
				const nextLineIndex = buffer.indexOf('\n')
				buffer = buffer.slice(nextLineIndex + 1)
				void notifyIfChanged()
			}
		}
	} catch {
		// Ignore monitor read failures. The renderer can still request the cached/current value.
	}
}

async function notifyIfChanged() {
	const previousColorMode = cachedSystemColorMode
	const nextColorMode = await getSystemColorMode()
	if (nextColorMode === previousColorMode) return

	for (const listener of listeners) listener(nextColorMode)
}

async function readSystemColorMode(): Promise<ColorMode | null> {
	return (await readGnomeColorScheme()) ?? (await readGnomeGtkTheme())
}

async function readGnomeColorScheme(): Promise<ColorMode | null> {
	const value = await readGSettings('org.gnome.desktop.interface', 'color-scheme')
	if (!value) return null
	return value.includes('prefer-dark') ? 'dark' : 'light'
}

async function readGnomeGtkTheme(): Promise<ColorMode | null> {
	const value = await readGSettings('org.gnome.desktop.interface', 'gtk-theme')
	if (!value) return null
	return value.toLowerCase().includes('dark') ? 'dark' : 'light'
}

async function readGSettings(schema: string, key: string): Promise<string | null> {
	try {
		const proc = Bun.spawn(['gsettings', 'get', schema, key], {
			stdin: 'ignore',
			stdout: 'pipe',
			stderr: 'pipe',
		})
		const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
		return exitCode === 0 ? stdout.trim() : null
	} catch {
		return null
	}
}
