import { useCallback, useState } from 'react'
import { appRpc } from '@/app/rpc'
import type { AsyncState } from '@/app/types'
import type { AgentAvailability } from '@/shared/settings'

export function useAgentAvailability() {
	const [agentAvailability, setAgentAvailability] = useState<AgentAvailability[]>([])
	const [agentsState, setAgentsState] = useState<AsyncState>('idle')

	const refreshAgents = useCallback(async () => {
		setAgentsState('loading')
		try {
			setAgentAvailability(await appRpc.request.listAgentAvailability())
			setAgentsState('idle')
		} catch {
			setAgentsState('error')
		}
	}, [])

	return { agentAvailability, agentsState, refreshAgents }
}
