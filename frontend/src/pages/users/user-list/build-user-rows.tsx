import type { MouseEvent } from 'react';
import type { UserListItem } from './load-users';

type UserRowAction = 'edit';

export function buildUserRows(
    users: UserListItem[],
    onOpenUserProfile: (userId: number) => void,
    onSelectRow: (user: UserListItem) => void,
    onViewHistory?: (player: UserListItem) => void,
) {
    const userRows = [];

    for (const user of users) {

        function handleSelectRow(event: MouseEvent<HTMLTableRowElement>) {
            // Actions in the row have their own behavior.
            if (event.target instanceof Element && event.target.closest('button')) {
                return;
            }

            onSelectRow(user);
        }

        function handleClick(action: UserRowAction) {
            if (action === 'edit') {
                onOpenUserProfile(user.id);
            }
        }

        function handleViewTransactions() {
            onViewHistory?.(user);
        }

        userRows.push(
            <tr key={user.id} onClick={handleSelectRow} className={user.role.value === 'player' ? 'cursor-pointer' : undefined}>
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
                        <button type="button" className="user-list-action" onClick={() => handleClick('edit')}>
                            Edit
                        </button>
                        {user.role.value === 'player' && onViewHistory && (
                            <button type="button" className="user-list-action" onClick={handleViewTransactions}>Transactions</button>
                        )}
                    </div>
                </td>
            </tr>
        );
    }

    return userRows;
}
