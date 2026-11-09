import CasinoTicket from '../../../components/casino-ticket'

type CreateUserErrorTicketProps = {
    fieldErrors: {
        first_name: string
        last_name: string
        email: string
        phone: string
        role: string
        photo: string
    }
}

export default function CreateUserErrorTicket(props: CreateUserErrorTicketProps) {
    const errors = props.fieldErrors
    const hasErrors = Object.values(errors).some(function (message) {
        return message !== ''
    })

    return (
        <div className="create-user-error-slot" hidden={!hasErrors}>
            <CasinoTicket compactEdges className="p-6 text-center">
                <h2 className="casino-heading casino-title-band mb-2 rounded-sm px-2 py-3 text-xl uppercase">
                    Hold the Deal
                </h2>
                <p className="mb-3 text-sm">Fix the details below, then try again.</p>
                <ul className="create-user-error-messages grid gap-2 text-sm min-[1200px]:max-h-40 min-[1200px]:overflow-y-auto">
                    <li hidden={errors.first_name === ''}>{errors.first_name}</li>
                    <li hidden={errors.last_name === ''}>{errors.last_name}</li>
                    <li hidden={errors.email === ''}>{errors.email}</li>
                    <li hidden={errors.phone === ''}>{errors.phone}</li>
                    <li hidden={errors.role === ''}>{errors.role}</li>
                    <li hidden={errors.photo === ''}>{errors.photo}</li>
                </ul>
            </CasinoTicket>
        </div>
    )
}
