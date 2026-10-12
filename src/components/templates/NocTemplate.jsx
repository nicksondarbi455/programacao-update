import { TopBar } from '../organisms/TopBar';
import { NocTable } from '../organisms/NocTable';
import { FloatingCalendar } from '../organisms/FloatingCalendar';
import { Modals } from '../organisms/Modals';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';

export function NocTemplate({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, hasCalendar, ...props }) {
    return (
        <>
            <TopBar {...props} />
            
            <div className="main-content" style={{ padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Barra de Filtros e Pesquisa Avançada */}
                <div style={{ background: '#ffffff', padding: '10px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '250px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Pesquisar:</span>
                        <Input 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            placeholder="Pesquisar em qualquer coluna..." 
                            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Filtrar:</span>
                        <Button size="sm" variant={statusFilter === 'all' ? 'primary' : 'secondary'} style={statusFilter !== 'all' ? { background: '#e2e8f0', color: '#1e293b' } : {}} onClick={() => setStatusFilter('all')}>Todos</Button>
                        <Button size="sm" variant={statusFilter === 'pending' ? 'primary' : 'secondary'} style={statusFilter !== 'pending' ? { background: '#e2e8f0', color: '#1e293b' } : {}} onClick={() => setStatusFilter('pending')}>Pendentes</Button>
                        <Button size="sm" variant={statusFilter === 'completed' ? 'primary' : 'secondary'} style={statusFilter !== 'completed' ? { background: '#e2e8f0', color: '#1e293b' } : {}} onClick={() => setStatusFilter('completed')}>Concluídos</Button>
                    </div>
                </div>

                <NocTable {...props} searchTerm={searchTerm} statusFilter={statusFilter} />
            </div>

            {/* Renderiza o calendário apenas se o projeto tiver a opção ativada */}
            {hasCalendar && <FloatingCalendar {...props} />}
            <Modals {...props} />
        </>
    );
}