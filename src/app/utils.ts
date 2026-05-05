export function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error)
}

export function formatDate(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(date)
}
