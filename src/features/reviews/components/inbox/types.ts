export type SearchMode = 'smart' | 'repo' | 'author' | 'title' | 'review-requested'

export const searchModeLabels: Record<SearchMode, string> = {
	smart: 'All',
	repo: 'Repo',
	author: 'Author',
	title: 'Title',
	'review-requested': 'Reviewer',
}

export const searchPlaceholders: Record<SearchMode, string> = {
	smart: 'Repo name, owner/repo, @author, title text, or PR URL',
	repo: 'owner/repo',
	author: '@username',
	title: 'Text in PR title',
	'review-requested': '@username',
}
