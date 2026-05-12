import type { ReactNode } from 'react'
import { Box, HStack } from 'styled-system/jsx'

export function InlineField({
	children,
	label,
	labelAccessory,
}: {
	children: ReactNode
	label: string
	labelAccessory?: ReactNode
}) {
	return (
		<HStack
			justify="space-between"
			gap="4"
			borderBottomWidth="1px"
			borderColor="border.subtle"
			py="2"
		>
			<HStack alignItems="center" gap="1.5">
				<Box fontWeight="medium" textStyle="sm">
					{label}
				</Box>
				{labelAccessory}
			</HStack>
			{children}
		</HStack>
	)
}
