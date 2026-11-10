import { FloatingCalendar } from './FloatingCalendar';

export function CalendarWidget({
    isOpen,
    onToggle,
    schedules = {},
    equipments = [],
    onOpenModal,
    onToggleComplete,
    weekCount = 0,
    tomorrowCount = 0,
    projectType,
    onOpenHistory
}) {
    return (
        <FloatingCalendar
            isOpen={isOpen}
            onToggle={onToggle}
            schedules={schedules}
            equipments={equipments}
            onOpenModal={onOpenModal}
            onToggleComplete={onToggleComplete}
            weekCount={weekCount}
            tomorrowCount={tomorrowCount}
            projectType={projectType}
            onOpenHistory={onOpenHistory}
        />
    );
}
