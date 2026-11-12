
import CasinoTicket from '../../../components/casino-ticket.tsx';
import PlayerTab from '../../../components/player-tab.tsx';
import '../../../components/pagination.css';
import './user-list.css';
import { useState, useEffect } from 'react';
import { loadUsers } from './load-users';
import type { UserListItem } from './load-users';
import type { RoleOption } from '../shared-resources/role-option';
import {buildUserRows} from './build-user-rows.tsx';
import { buildRoleOptions } from '../shared-resources/build-role-options';
import type { ChangeEvent } from 'react';

type UserListProps = {
    onOpenUserProfile: (userId: number) => void;
    onCreateUser?: () => void;
    onViewHistory?: (player: UserListItem) => void;
    onRecordPayment?: (playerId: number) => void;
    suspendPlayerTab?: boolean;
};

function UserList(props: UserListProps) {

    const [selectedPlayer, setSelectedPlayer] = useState<UserListItem | null>(null);
    const [users, setUsers] = useState<UserListItem[]>([]);

    const [searchText, setSearchText] = useState('');

    const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
    const [selectedRole, setSelectedRole] = useState('all');

    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    const [requestedPage, setRequestedPage] = useState(1);

    const [usersMessage, setUsersMessage] = useState('Loading users…');
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    useEffect(function populateUserTable() {

        let ignoreResult = false;
        async function fetchUsers(page: number, role: string, search: string) {
            try {
                const result = await loadUsers('/api/v1/users', page, role, search);

                // An older request can finish after the filters change.
                if (ignoreResult) {
                    return;
                }

                // Update the table only after Laravel returns the requested page.
                setUsers(result.data);
                setRoleOptions(result.role_options);
                setCurrentPage(result.meta.current_page);
                setLastPage(result.meta.last_page);

                const pagination = result.meta;

                if (pagination.total === 0) {
                    setUsersMessage('No users found.');
                } else {
                    setUsersMessage(pagination.from + '–' + pagination.to + ' of ' + pagination.total);
                }

            } catch {
                if (ignoreResult) {
                    return;
                }
                setUsersMessage('Could not load users.');
            } finally {
                // Only the current request can unlock pagination.
                if (!ignoreResult) {
                    setIsLoadingUsers(false);
                }
            }
        }

        // Show feedback while Laravel fetches the requested page.
        setIsLoadingUsers(true);
        setUsersMessage('Loading users…');
        void fetchUsers(requestedPage, selectedRole, searchText);

        return function cleanup() {
            ignoreResult = true;
        };

    }, [requestedPage, selectedRole, searchText]);

    function handleSelectRow(user: UserListItem) {
        if (isLoadingUsers) {
            return;
        }

        if (user.role.value === 'player') {
            setSelectedPlayer(user);
        } else {
            setSelectedPlayer(null);
        }
    }

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        setSelectedPlayer(null);
        setSearchText(event.currentTarget.value);
        setRequestedPage(1);
    }

    function handleRoleChange(event: ChangeEvent<HTMLSelectElement>) {
        setSelectedPlayer(null);
        setSelectedRole(event.currentTarget.value);
        setRequestedPage(1);
    }

    async function handleNext() {
        setSelectedPlayer(null);
        setRequestedPage(currentPage + 1);
    }

    async function handlePrevious() {
        setSelectedPlayer(null);
        setRequestedPage(currentPage - 1);
    }


    return (
        <section className="user-list-layout user-list-screen w-full" aria-labelledby="user-list-title">
            {/* Let the taller ticket set the row height and stretch both tickets to match. */}
            <div className="grid items-stretch gap-4 lg:grid-cols-6">
                <CasinoTicket compactEdges className="user-list-ticket relative min-w-0 lg:col-span-5">
                    <div className="user-list-filters flex items-end col-span-12">
                        <label className="user-list-search">
                            Search Player
                            {/* Position the icon relative to the input, below the label. */}
                            <span className="user-list-search-field relative block">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg>
                                <input
                                    type="search"
                                    maxLength={100}
                                    value={searchText}
                                    onChange={handleSearchChange}
                                />
                            </span>
                        </label>

                        <label className="user-list-role-filter">
                            Role
                            <select className="casino-select" value={selectedRole} onChange={handleRoleChange}>
                                <option value="all">All</option>
                                {buildRoleOptions(roleOptions)}
                            </select>
                        </label>
                        {props.onCreateUser && (
                            <button className="user-list-create" type="button" onClick={props.onCreateUser}>Create Account</button>
                        )}
                    </div>

                    {/* Keep wide columns scrollable inside the ticket. */}
                    <div className="user-list-scroll overflow-x-auto" role="region" aria-labelledby="user-list-title" tabIndex={0}>
                        <table className="user-list-table w-full text-left">
                            <thead>
                                <tr>
                                    <th scope="col">User</th>
                                    <th scope="col">Phone</th>
                                    <th scope="col">Role</th>
                                    <th scope="col">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {buildUserRows(users, props.onOpenUserProfile, handleSelectRow, props.onViewHistory)}
                            </tbody>

                        </table>
                    </div>

                    <div className="casino-pagination flex items-center">

                        <span>{usersMessage}</span>

                        <span className="casino-pagination-rule" aria-hidden="true" />
                        <button
                            type="button"
                            onClick={handlePrevious}
                            disabled={isLoadingUsers || currentPage <= 1}
                        >
                            ‹ Previous
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={isLoadingUsers || currentPage >= lastPage}
                        >
                            Next ›
                        </button>
                    </div>
                </CasinoTicket>
                {selectedPlayer && !props.suspendPlayerTab && (
                    <aside className="user-list-player-sidebar flex min-w-0 flex-col [&>.player-tab]:flex-1" aria-label="Player details">
                        <PlayerTab key={selectedPlayer.id} player={selectedPlayer} onRecordPayment={props.onRecordPayment} onViewHistory={props.onViewHistory} />
                    </aside>
                )}
            </div>
        </section>
    );
}

export default UserList;
