import type { UserListItem } from './load-users'

export function buildUserRows(users: UserListItem[]) {
    const userRows = []

    for (const user of users) {
        userRows.push(
            <tr key={user.id}>
                <td>
                    <div className="user-list-person flex items-center gap-3">
                        <img
                            src={user.photo_url}
                            alt=""
                            className="user-list-photo h-8 w-8 shrink-0 rounded-full border-2 object-cover"
                        />
                        <span>{user.first_name + ' ' + user.last_name}</span>
                    </div>
                </td>
                <td>{user.phone ?? 'Not Available'}</td>
                <td>{user.role.label}</td>
                <td>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" className="user-list-action" disabled>Edit</button>
                        <button type="button" className="user-list-action" disabled>Game history</button>
                        <button type="button" className="user-list-action" disabled>Transactions</button>
                    </div>
                </td>
            </tr>
        )
    }

    return userRows
}
