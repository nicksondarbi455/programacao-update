import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../services/supabase'; // Ajuste o caminho se necessário

export default function LogsPage({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      // Bloqueio extra na requisição
      if (user?.role !== 'adm' && user?.role !== 'master') {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('logs')
        .select('id, action, details, created_at, users(nome, email, role)')
        .order('created_at', { ascending: false })
        .limit(100); // Limite inicial para performance
        
      if (!error && data) {
        setLogs(data);
      } else {
        console.error("Erro ao buscar logs:", error);
      }
      setLoading(false);
    };
    
    fetchLogs();
  }, [user]);

  // Redirecionamento de segurança no frontend
  if (!user || (user.role !== 'adm' && user.role !== 'master')) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-6 w-full text-gray-800 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Logs do Sistema</h1>
      
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
                <th className="p-3 font-semibold text-sm">Detalhes Técnicos</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-sm whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 text-sm">
                    <span className="font-medium">{log.users?.nome || 'Desconhecido'}</span>
                    <br />
                    <span className="text-xs text-gray-500 uppercase">{log.users?.role || 'N/A'}</span>
                  </td>
                  <td className="p-3 text-sm font-medium text-blue-600">
                    {log.action}
                  </td>
                  <td className="p-3 text-xs text-gray-600 max-w-xs truncate" title={JSON.stringify(log.details)}>
                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-gray-500">
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