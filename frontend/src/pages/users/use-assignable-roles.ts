import { useEffect, useState } from 'react'
import axios from 'axios'

type RoleOption = {
    value: string
    label: string
}

function useAssignableRoles() {
    const [roles, setRoles] = useState<RoleOption[]>([])
    const [isLoadingRoles, setIsLoadingRoles] = useState(true)
    const [rolesMessage, setRolesMessage] = useState('Loading roles…')

    // Keep the request and its feedback together for this screen.
    useEffect(function () {
        let ignoreResult = false

        async function loadRoles() {
            try {
                const response = await axios.get('/api/v1/users/create-options')

                if (ignoreResult) {
                    return
                }

                setRoles(response.data.roles)
                setRolesMessage('')
                setIsLoadingRoles(false)
            } catch {
                if (ignoreResult) {
                    return
                }

                setRolesMessage('Could not load roles. Please reopen Create User to try again.')
                setIsLoadingRoles(false)
            }
        }

        void loadRoles()

        // Ignore a response after this screen closes.
        return function cleanup() {
            ignoreResult = true
        }
    }, [])

    return {
        roles,
        isLoadingRoles,
        rolesMessage,
    }
}

export default useAssignableRoles
