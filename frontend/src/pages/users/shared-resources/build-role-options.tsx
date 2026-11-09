import type { RoleOption } from './role-option'

export function buildRoleOptions(roleOptions: RoleOption[]) {
    const options = []

    for (const roleOption of roleOptions) {
        options.push(
            <option key={roleOption.value} value={roleOption.value}>
                {roleOption.label}
            </option>
        )
    }

    return options
}
