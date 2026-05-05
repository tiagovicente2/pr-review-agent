const args = Bun.argv.slice(2)
const hiddenLinuxMenuWarning =
	'Application menus are not supported on Linux. Implement menu UI in your webview HTML instead.'

const child = Bun.spawn(['electrobun', ...args], {
	env: Bun.env,
	stdin: 'inherit',
	stdout: 'pipe',
	stderr: 'pipe',
})

function pipeFiltered(
	stream: ReadableStream<Uint8Array>,
	output: typeof Bun.stdout | typeof Bun.stderr,
) {
	void (async () => {
		const decoder = new TextDecoder()
		let pending = ''

		for await (const chunk of stream) {
			pending += decoder.decode(chunk, { stream: true })
			const lines = pending.split('\n')
			pending = lines.pop() ?? ''

			for (const line of lines) {
				if (!line.includes(hiddenLinuxMenuWarning)) {
					output.write(`${line}\n`)
				}
			}
		}

		if (pending && !pending.includes(hiddenLinuxMenuWarning)) {
			output.write(pending)
		}
	})()
}

pipeFiltered(child.stdout, Bun.stdout)
pipeFiltered(child.stderr, Bun.stderr)

const forwardSignal = (signal: NodeJS.Signals) => {
	try {
		child.kill(signal)
	} catch {
		// The child may have already exited.
	}
}

process.on('SIGINT', forwardSignal)
process.on('SIGTERM', forwardSignal)

process.exit(await child.exited)
