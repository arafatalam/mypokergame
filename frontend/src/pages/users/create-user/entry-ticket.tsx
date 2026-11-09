import CasinoTicket from '../../../components/casino-ticket'

type EntryTicketProps = {
    account: {
        username: string
        generated_password: string
    } | null
}

export default function EntryTicket(props: EntryTicketProps) {
    let content = (
        <p className="text-sm">
            A username and temporary password will appear after you create the account.
        </p>
    )

    // Show credentials once Laravel returns a created account.
    if (props.account !== null) {
        content = (
            <div className="grid gap-2 text-sm">
                <p className="break-all">
                    Username: <span className="create-user-credential select-all">{props.account.username}</span>
                </p>
                <p className="break-all">
                    Temporary password: <span className="create-user-credential select-all">{props.account.generated_password}</span>
                </p>
            </div>
        )
    }

    return (
        <CasinoTicket compactEdges className="create-user-first-sign-in p-6 text-center">
            <h2 className="casino-heading mb-2 text-2xl uppercase">Entry Ticket</h2>
            {content}
        </CasinoTicket>
    )
}
