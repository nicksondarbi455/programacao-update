import { TopBar } from '../organisms/TopBar';
import { NocTable } from '../organisms/NocTable';
import { FloatingCalendar } from '../organisms/FloatingCalendar';
import { Modals } from '../organisms/Modals';

export function NocTemplate(props) {
    return (
        <>
            <TopBar {...props} />
            <div className="main-content">
                <NocTable {...props} />
            </div>
            <FloatingCalendar {...props} />
            <Modals {...props} />
        </>
    );
}