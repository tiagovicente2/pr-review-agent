import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { Box, Stack } from 'styled-system/jsx'

type ToastTone = 'success' | 'error' | 'info'

type Toast = {
	id: string
	title: string
	description?: string
	tone: ToastTone
}

type ToastContextValue = {
	showToast: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([])

	const removeToast = useCallback((id: string) => {
		setToasts((current) => current.filter((toast) => toast.id !== id))
	}, [])

	const showToast = useCallback(
		(toast: Omit<Toast, 'id'>) => {
			const id = crypto.randomUUID()
			setToasts((current) => [...current, { ...toast, id }])
			window.setTimeout(() => removeToast(id), 4000)
		},
		[removeToast],
	)

	const value = useMemo(() => ({ showToast }), [showToast])

	return (
		<ToastContext.Provider value={value}>
			{children}
			<Stack
				bottom="5"
				gap="3"
				position="fixed"
				right="5"
				w="min(24rem, calc(100vw - 2.5rem))"
				zIndex="toast"
			>
				{toasts.map((toast) => (
					<Box
						bg="gray.2"
						borderColor={toastBorderColor(toast.tone)}
						borderLeftWidth="4px"
						borderRadius="l2"
						boxShadow="lg"
						key={toast.id}
						p="4"
					>
						<Box fontWeight="semibold">{toast.title}</Box>
						{toast.description ? (
							<Box color="fg.muted" mt="1" textStyle="sm">
								{toast.description}
							</Box>
						) : null}
					</Box>
				))}
			</Stack>
		</ToastContext.Provider>
	)
}

export function useToast() {
	const context = useContext(ToastContext)
	if (!context) {
		throw new Error('useToast must be used inside ToastProvider')
	}
	return context
}

function toastBorderColor(tone: ToastTone) {
	if (tone === 'success') {
		return 'green.9'
	}
	if (tone === 'error') {
		return 'red.9'
	}
	return 'cyan.9'
}
