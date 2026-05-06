export type ColorModePreference = 'dark' | 'light' | 'system'
export type CodeAgent = 'pi' | 'claude' | 'opencode'
export type ReviewLanguage = 'english' | 'portuguese'

export type AvailablePiModel = {
	id: string
	label: string
	provider: string
	model: string
}

export type AppSettings = {
	colorMode: ColorModePreference
	codeAgent: CodeAgent
	model: string
	reviewLanguage: ReviewLanguage
	reviewerInstructions: string
	reviewerInstructionsPath: string
}

export type SaveAppSettingsParams = {
	colorMode: ColorModePreference
	codeAgent: CodeAgent
	model: string
	reviewLanguage: ReviewLanguage
	reviewerInstructions: string
}
