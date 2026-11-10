import './pagination.css';

// Each screen supplies its feedback, button availability and navigation handlers.
type PaginationProps = {
    message: string;
    previousDisabled: boolean;
    nextDisabled: boolean;
    onPrevious: () => void;
    onNext: () => void;
};

function Pagination(props: PaginationProps) {
    return (
        <div className="casino-pagination flex items-center">
            {/* Announce the screen's count or request feedback when it changes. */}
            <span role="status">{props.message}</span>
            <span className="casino-pagination-rule" aria-hidden="true" />

            {/* The screen's handlers perform navigation; this component displays the controls. */}
            <button
                type="button"
                onClick={props.onPrevious}
                disabled={props.previousDisabled}
            >
                ‹ Previous
            </button>
            <button
                type="button"
                onClick={props.onNext}
                disabled={props.nextDisabled}
            >
                Next ›
            </button>
        </div>
    );
}

export default Pagination;
