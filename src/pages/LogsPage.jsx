import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../services/supabase'; // Confirme se o caminho é este

export default function LogsPage({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      // O seu sistema utiliza is_admin e is_master no perfil do utilizador
      if (!user?.is_admin && !user?.is_master) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, created_at, user_email, action, entity_type, project_id, details')
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (!error && data) {
        setLogs(data);
      } else {
        console.error("Erro ao buscar logs:", error);
      }
      setLoading(false);
    };
    
    fetchLogs();
  }, [user]);

  // Bloqueio visual para quem não é administrador ou master
  if (!user || (!user.is_admin && !user.is_master)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-6 w-full text-gray-800 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Logs de Atividade</h1>
      
      {loading ? (
        <div className="flex justify-center p-10">A carregar registos...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3 font-semibold text-sm">Data/Hora</th>
                <th className="p-3 font-semibold text-sm">Utilizador</th>
                <th className="p-3 font-semibold text-sm">Ação</th>
                <th className="p-3 font-semibold text-sm">Entidade / Projeto</th>
                <th className="p-3 font-semibold text-sm">Detalhes Técnicos</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-sm whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 text-sm font-medium">
                    {log.user_email || 'Sistema'}
                  </td>
                  <td className="p-3 text-sm font-bold text-blue-600">
                    {log.action}
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {log.entity_type ? <span className="uppercase text-xs font-bold mr-1">{log.entity_type}</span> : ''}
                    {log.project_id ? log.project_id : '-'}
                  </td>
                  <td className="p-3 text-xs text-gray-600 max-w-xs truncate" title={JSON.stringify(log.details)}>
                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-500">
                    Nenhum log registado até ao momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}