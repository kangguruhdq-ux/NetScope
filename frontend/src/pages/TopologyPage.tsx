import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TopologyGraph, TopologyNode, TopologyConnection } from '../types';
import { TopologyCanvas } from '../components/topology/TopologyCanvas';
import { StatusBadge } from '../components/common/StatusBadge';
import { DeviceTypeIcon } from '../components/common/DeviceTypeIcon';
import { useToast } from '../context/ToastContext';
import { Share2, RefreshCw, Layers, ShieldCheck, X, Link2, Trash2 } from 'lucide-react';

export const TopologyPage: React.FC = () => {
  const toast = useToast();
  const [graph, setGraph] = useState<TopologyGraph>({ nodes: [], connections: [] });
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchTopology = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTopology();
      setGraph(data);
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
  }, []);

  const handleSaveLayout = async (updatedNodes: { id: number; pos_x: number; pos_y: number }[]) => {
    await api.saveTopologyLayout(updatedNodes);
    setNotification('Topology coordinates successfully saved to database.');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateConnection = async (sourceNodeId: number, targetNodeId: number) => {
    try {
      await api.createConnection({
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        link_type: 'ETHERNET',
      });
      fetchTopology();
      toast.success('Jalur koneksi jaringan baru berhasil dihubungkan.', 'Koneksi Dibuat');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat sambungan jalur', 'Gagal Menghubungkan');
    }
  };

  const handleDeleteConnection = async (connId: number) => {
    try {
      await api.deleteConnection(connId);
      toast.delete(`Jalur koneksi link #${connId} berhasil dihapus dari topologi.`, 'Jalur Dihapus');
      fetchTopology();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus jalur koneksi.', 'Gagal');
    }
  };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-8rem)] min-h-[580px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
            Interactive Cyber Grid Topology
          </h1>
          <p className="text-xs font-mono text-cyan-400 mt-0.5">
            Institutional Network Map &bull; Live Visual Flow &amp; Drag-and-Drop Editor
          </p>
        </div>

        <button
          onClick={fetchTopology}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-800 bg-[#111827] hover:border-cyan-500/40 text-gray-300 text-xs font-mono transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-xs font-mono text-cyan-300 flex items-center justify-between shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      {/* Main Grid: Canvas + Inspector */}
      <div className="flex-1 flex gap-5 min-h-0">
        <div className="flex-1 min-h-0">
          <TopologyCanvas
            nodes={graph.nodes}
            connections={graph.connections}
            onSaveLayout={handleSaveLayout}
            onCreateConnection={handleCreateConnection}
            onDeleteConnection={handleDeleteConnection}
            onSelectNode={(node) => setSelectedNode(node)}
            isEditorMode={true}
          />
        </div>

        {/* Selected Node Details Side Inspector */}
        {selectedNode && (
          <div className="w-80 noc-card rounded-xl p-5 border border-cyan-500/30 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <DeviceTypeIcon type={selectedNode.device_type || 'OTHER'} className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold text-sm text-white">{selectedNode.label}</span>
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <span className="text-gray-400 block mb-0.5">IP Address:</span>
                  <span className="text-cyan-300 font-bold">{selectedNode.ip_address}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Node Status:</span>
                  <StatusBadge status={selectedNode.status || 'UNKNOWN'} size="sm" />
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Coordinates:</span>
                  <span className="text-gray-300">
                    X: {Math.round(selectedNode.pos_x)}, Y: {Math.round(selectedNode.pos_y)}
                  </span>
                </div>
              </div>

              {/* Connected Links from this Node */}
              <div className="pt-2 border-t border-gray-800">
                <span className="text-xs font-mono font-semibold text-gray-300 mb-2 block">
                  Connected Links
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {graph.connections
                    .filter(
                      (c) =>
                        c.source_node_id === selectedNode.id ||
                        c.target_node_id === selectedNode.id
                    )
                    .map((conn) => {
                      const peerNode = graph.nodes.find(
                        (n) =>
                          n.id ===
                          (conn.source_node_id === selectedNode.id
                            ? conn.target_node_id
                            : conn.source_node_id)
                      );
                      return (
                        <div
                          key={conn.id}
                          className="p-2 bg-black/40 rounded border border-gray-800 flex items-center justify-between text-[11px] font-mono"
                        >
                          <div className="flex items-center gap-1.5">
                            <Link2 className="w-3 h-3 text-cyan-400" />
                            <span className="text-gray-200">{peerNode?.label || `Node #${conn.id}`}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteConnection(conn.id)}
                            className="text-gray-500 hover:text-rose-400 p-1"
                            title="Disconnect Link"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 text-[11px] font-mono text-gray-400">
              Tip: Drag nodes anywhere to re-arrange. Click "Save Layout" when done.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
