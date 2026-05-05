import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { css } from 'styled-system/css'
import { Box } from 'styled-system/jsx'

export function MarkdownContent({ children }: { children: string }) {
	return (
		<Box
			className={css({
				color: 'fg.muted',
				lineHeight: '1.7',
				textStyle: 'sm',
				'& h1, & h2, & h3, & h4': {
					color: 'fg.default',
					fontWeight: 'semibold',
					marginBottom: '2',
					marginTop: '4',
				},
				'& p': { marginY: '2' },
				'& ul, & ol': { marginY: '2', paddingLeft: '5' },
				'& li': { marginY: '1' },
				'& a': { color: 'cyan.11', textDecoration: 'underline' },
				'& code': {
					backgroundColor: 'gray.3',
					borderRadius: 'l1',
					color: 'fg.default',
					fontFamily: 'mono',
					paddingX: '1',
				},
				'& pre': {
					backgroundColor: 'gray.2',
					borderRadius: 'l2',
					overflowX: 'auto',
					padding: '3',
				},
				'& pre code': { backgroundColor: 'transparent', padding: '0' },
				'& blockquote': {
					borderLeftColor: 'cyan.8',
					borderLeftWidth: '3px',
					color: 'fg.muted',
					paddingLeft: '3',
				},
				'& table': {
					borderCollapse: 'collapse',
					display: 'block',
					overflowX: 'auto',
					width: '100%',
				},
				'& th, & td': { borderColor: 'border.default', borderWidth: '1px', padding: '2' },
				'& img': { borderRadius: 'l2', maxWidth: '100%', marginY: '3' },
				'& details': {
					backgroundColor: 'gray.2',
					borderColor: 'border.default',
					borderRadius: 'l2',
					borderWidth: '1px',
					marginY: '3',
					padding: '3',
				},
				'& summary': { color: 'fg.default', cursor: 'pointer', fontWeight: 'semibold' },
			})}
		>
			<ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
				{children}
			</ReactMarkdown>
		</Box>
	)
}
