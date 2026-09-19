import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TopologyNode, TopologyConnection, DeviceStatus } from '../../types';
import { DeviceTypeIcon } from '../common/DeviceTypeIcon';
import {
  Save,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Link2,
  Trash2,
  Maximize2,
  X,
  Layers,
} from 'lucide-react';

interface TopologyCanvasProps {
  nodes: TopologyNode[];
  connections: TopologyConnection[];
  onSaveLayout: (updatedNodes: { id: number; pos_x: number; pos_y: number }[]) => Promise<void>;
  onCreateConnection?: (sourceNodeId: number, targetNodeId: number) => Promise<void>;
  onDeleteConnection?: (connectionId: number) => Promise<void>;
  onSelectNode?: (node: TopologyNode) => void;
  isEditorMode?: boolean;
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  nodes: initialNodes,
  connections,
  onSaveLayout,
  onCreateConnection,
  onDeleteConnection,
  onSelectNode,
  isEditorMode = true,
}) => {
  const [nodes, setNodes] = useState<TopologyNode[]>(initialNodes);
  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [connectingSourceId, setConnectingSourceId] = useState<number | null>(null);

  // Connection selection & delete
  const [selectedConnId, setSelectedConnId] = useState<number | null>(null);
  const [hoveredConnId, setHoveredConnId] = useState<number | null>(null);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState<boolean>(false);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  // Fit all nodes into view
  const handleFitToView = useCallback(() => {
    if (nodes.length === 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const minX = Math.min(...nodes.map((n) => n.pos_x));
    const maxX = Math.max(...nodes.map((n) => n.pos_x + 60));
    const minY = Math.min(...nodes.map((n) => n.pos_y));
    const maxY = Math.max(...nodes.map((n) => n.pos_y + 80));

    const contentW = Math.max(maxX - minX, 120);
    const contentH = Math.max(maxY - minY, 120);
    const padding = 50;

    const scaleX = (rect.width - padding * 2) / contentW;
    const scaleY = (rect.height - padding * 2) / contentH;
    const newZoom = Math.min(1.2, Math.max(0.65, Math.min(scaleX, scaleY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(newZoom);
    setPan({
      x: rect.width / 2 - centerX * newZoom,
      y: rect.height / 2 - centerY * newZoom,
    });
  }, [nodes]);

  // Initial fit on load
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        handleFitToView();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialNodes.length]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If user clicked background (not on a node or link hit area)
    const target = e.target as HTMLElement;
    if (target.closest('.topology-node') || target.closest('.topology-link')) {
      return;
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setSelectedNodeId(null);
    setSelectedConnId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation();
    if (!isEditorMode) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (connectingSourceId !== null && connectingSourceId !== nodeId) {
      // Complete connection creation
      if (onCreateConnection) {
        onCreateConnection(connectingSourceId, nodeId);
      }
      setConnectingSourceId(null);
      return;
    }

    setDraggingNodeId(nodeId);
    setSelectedNodeId(nodeId);
    setSelectedConnId(null);
    if (onSelectNode) onSelectNode(node);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: (e.clientX - rect.left - pan.x) / zoom - node.pos_x,
        y: (e.clientY - rect.top - pan.y) / zoom - node.pos_y,
      });
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
        return;
      }

      if (draggingNodeId !== null && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newX = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
        const newY = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;

        setNodes((prev) =>
          prev.map((n) =>
            n.id === draggingNodeId
              ? {
                  ...n,
                  pos_x: Math.max(20, Math.min(2000, newX)),
                  pos_y: Math.max(20, Math.min(1500, newY)),
                }
              : n
          )
        );
        setHasChanges(true);
      }
    },
    [isPanning, panStart, draggingNodeId, dragOffset, zoom, pan]
  );

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(2.0, Math.max(0.4, z * zoomFactor)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = nodes.map((n) => ({ id: n.id, pos_x: n.pos_x, pos_y: n.pos_y }));
      await onSaveLayout(payload);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConn = async (connId: number) => {
    if (onDeleteConnection) {
      await onDeleteConnection(connId);
      if (selectedConnId === connId) {
        setSelectedConnId(null);
      }
    }
  };

  const getNodeColor = (status?: DeviceStatus | string) => {
    const s = (status || 'UNKNOWN').toUpperCase();
    if (s === 'UP')
      return {
        border: 'border-emerald-500',
        bg: 'bg-emerald-950/40',
        text: 'text-emerald-400',
        shadow: 'shadow-[0_0_15px_#10B981]',
      };
    if (s === 'DEGRADED')
      return {
        border: 'border-amber-500',
        bg: 'bg-amber-950/40',
        text: 'text-amber-400',
        shadow: 'shadow-[0_0_15px_#F59E0B]',
      };
    if (s === 'DOWN')
      return {
        border: 'border-rose-500',
        bg: 'bg-rose-950/40',
        text: 'text-rose-400',
        shadow: 'shadow-[0_0_15px_#F43F5E]',
      };
    return {
      border: 'border-cyan-500',
      bg: 'bg-cyan-950/40',
      text: 'text-cyan-400',
      shadow: 'shadow-[0_0_15px_#06B6D4]',
    };
  };

  const selectedConn = connections.find((c) => c.id === selectedConnId);
  const selectedConnSrc = selectedConn ? nodes.find((n) => n.id === selectedConn.source_node_id) : null;
  const selectedConnTgt = selectedConn ? nodes.find((n) => n.id === selectedConn.target_node_id) : null;

  return (
    <div className="flex flex-col h-full noc-card rounded-xl overflow-hidden border border-gray-800 relative">
      {/* Topology Toolbar */}
      <div className="bg-[#0E1424] border-b border-gray-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono z-20">
        <div className="flex items-center gap-2.5">
          <span className="text-gray-400 uppercase tracking-wider font-semibold">Cyber Grid</span>
          <span className="text-gray-600">//</span>
          <span className="text-cyan-400 font-bold">{nodes.length} Nodes</span>
          <span className="text-gray-600">&bull;</span>
          <span className="text-emerald-400 font-bold">{connections.length} Jalur Links</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Connect Nodes Tool */}
          {isEditorMode && (
            <button
              onClick={() => setConnectingSourceId(selectedNodeId)}
              disabled={selectedNodeId === null}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition ${
                connectingSourceId !== null
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-black/30 text-gray-300 border-gray-700 hover:border-cyan-500/40 disabled:opacity-40'
              }`}
              title="Select a node then click this button to link to another node"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{connectingSourceId ? 'Click Target Node' : 'Hubungkan Node'}</span>
            </button>
          )}

          {/* Links Management Modal Trigger */}
          <button
            onClick={() => setIsLinksModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-gray-700 bg-black/30 text-gray-300 hover:border-cyan-500/40 hover:text-cyan-300 transition"
            title="Lihat & Hapus Jalur Koneksi Jaringan"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Kelola Jalur ({connections.length})</span>
          </button>

          {/* Zoom & Fit Controls */}
          <div className="flex items-center bg-black/40 border border-gray-800 rounded p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
              className="p-1 hover:text-cyan-400 text-gray-400 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] text-gray-300 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
              className="p-1 hover:text-cyan-400 text-gray-400 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitToView}
              className="p-1 hover:text-cyan-400 text-gray-400 transition border-l border-gray-800 pl-1.5 ml-0.5"
              title="Fit to View / Auto Center"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1 hover:text-cyan-400 text-gray-400 transition"
              title="Reset Zoom & Pan"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Save Layout Button */}
          {isEditorMode && hasChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-500 text-black font-semibold hover:bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Layout'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Canvas Area with drag pan support */}
      <div
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`relative flex-1 bg-[#090D16] overflow-hidden select-none min-h-[520px] ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 75%),
            linear-gradient(to right, rgba(31, 41, 55, 0.35) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(31, 41, 55, 0.35) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 32px 32px, 32px 32px',
        }}
      >
        {/* SVG Links Layer */}
        <svg
          className="absolute inset-0 w-full h-full overflow-visible"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <defs>
            <linearGradient id="linkCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="linkFiber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Render Connections */}
          {connections.map((conn) => {
            const src = nodes.find((n) => n.id === conn.source_node_id);
            const tgt = nodes.find((n) => n.id === conn.target_node_id);
            if (!src || !tgt) return null;

            const isFiber = conn.link_type === 'FIBER';
            const isWireless = conn.link_type === 'WIRELESS';
            const isHovered = hoveredConnId === conn.id;
            const isSelected = selectedConnId === conn.id;

            const midX = (src.pos_x + tgt.pos_x) / 2 + 28;
            const midY = (src.pos_y + tgt.pos_y) / 2 + 28;

            return (
              <g key={conn.id} className="topology-link">
                {/* Wide invisible hit area for mouse hover & click */}
                <line
                  x1={src.pos_x + 28}
                  y1={src.pos_y + 28}
                  x2={tgt.pos_x + 28}
                  y2={tgt.pos_y + 28}
                  stroke="transparent"
                  strokeWidth="22"
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredConnId(conn.id)}
                  onMouseLeave={() => setHoveredConnId((prev) => (prev === conn.id ? null : prev))}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedConnId(conn.id);
                  }}
                />

                {/* Visible Glow Line */}
                <line
                  x1={src.pos_x + 28}
                  y1={src.pos_y + 28}
                  x2={tgt.pos_x + 28}
                  y2={tgt.pos_y + 28}
                  stroke={
                    isSelected
                      ? '#F43F5E'
                      : isHovered
                      ? '#38BDF8'
                      : isFiber
                      ? '#8B5CF6'
                      : '#06B6D4'
                  }
                  strokeWidth={isSelected ? '4' : isHovered ? '3.5' : '2'}
                  strokeDasharray={isWireless ? '5 5' : undefined}
                  opacity={isSelected ? '1' : isHovered ? '0.95' : '0.65'}
                  style={{ pointerEvents: 'none' }}
                />

                {/* Animated pulsating dot along connection link */}
                <circle r={isSelected ? '4.5' : '3.5'} fill={isSelected ? '#FDA4AF' : isFiber ? '#A78BFA' : '#67E8F9'}>
                  <animateMotion
                    path={`M ${src.pos_x + 28} ${src.pos_y + 28} L ${tgt.pos_x + 28} ${tgt.pos_y + 28}`}
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </circle>

                {/* Quick Delete Badge on Link Hover or Selection */}
                {(isHovered || isSelected) && isEditorMode && (
                  <g
                    transform={`translate(${midX}, ${midY})`}
                    style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConn(conn.id);
                    }}
                  >
                    <title>Klik untuk Hapus Jalur Ini</title>
                    <circle
                      r="13"
                      fill="#E11D48"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      className="shadow-lg hover:scale-110 transition-transform"
                    />
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill="#FFFFFF"
                      fontSize="12"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      ✕
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Render Interactive Nodes Layer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {nodes.map((node) => {
            const style = getNodeColor(node.status);
            const isSelected = selectedNodeId === node.id;
            const isSource = connectingSourceId === node.id;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                className={`topology-node absolute w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-transform duration-100 pointer-events-auto ${
                  style.border
                } ${style.bg} ${style.shadow} ${
                  isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0B0F19]' : ''
                } ${isSource ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
                style={{
                  left: `${node.pos_x}px`,
                  top: `${node.pos_y}px`,
                }}
              >
                <DeviceTypeIcon type={node.device_type || 'OTHER'} className={`w-6 h-6 ${style.text}`} />

                {/* Node Label Centered Below with Truncation to Prevent Collision */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-max max-w-[155px] text-center pointer-events-none z-10">
                  <span
                    className="text-[10px] font-mono font-medium text-gray-200 bg-[#0E1424]/95 px-2 py-0.5 rounded-md border border-gray-700/90 shadow-lg block truncate leading-tight select-none"
                    title={node.label}
                  >
                    {node.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Connection Action Bar (when a link is selected) */}
        {selectedConn && selectedConnSrc && selectedConnTgt && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0E1424]/95 border border-rose-500/50 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-mono z-30 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 text-rose-300">
              <Link2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Jalur: <strong className="text-white">{selectedConnSrc.label}</strong> ➔{' '}
                <strong className="text-white">{selectedConnTgt.label}</strong>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/50 border border-gray-700 text-cyan-400 uppercase">
                {selectedConn.link_type}
              </span>
            </div>

            <button
              onClick={() => handleDeleteConn(selectedConn.id)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold font-mono text-xs transition shadow-lg shrink-0"
              title="Hapus jalur koneksi ini"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Jalur</span>
            </button>

            <button
              onClick={() => setSelectedConnId(null)}
              className="text-gray-400 hover:text-white p-1 ml-1"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pan navigation hint */}
        <div className="absolute top-3 left-3 pointer-events-none text-[10px] font-mono text-gray-500 bg-black/40 px-2 py-1 rounded border border-gray-800/60 hidden sm:block">
          Klik &amp; geser background untuk Pan &bull; Scroll untuk Zoom &bull; Klik garis untuk Hapus Jalur
        </div>
      </div>

      {/* Modal: Kelola Jalur Koneksi Jaringan */}
      {isLinksModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="noc-card rounded-2xl w-full max-w-lg p-5 border border-cyan-500/40 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold font-sans text-white">
                  Kelola Jalur Koneksi Network ({connections.length} Jalur)
                </h3>
              </div>
              <button
                onClick={() => setIsLinksModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-gray-400">
              Daftar seluruh link yang menghubungkan antar perangkat node pada grid topology. Klik tombol "Hapus" untuk memutuskan jalur.
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {connections.length === 0 ? (
                <div className="text-center py-8 text-gray-500 italic">
                  Belum ada jalur koneksi yang terpasang. Gunakan tombol "Hubungkan Node" untuk membuat link baru.
                </div>
              ) : (
                connections.map((conn) => {
                  const src = nodes.find((n) => n.id === conn.source_node_id);
                  const tgt = nodes.find((n) => n.id === conn.target_node_id);
                  return (
                    <div
                      key={conn.id}
                      className="p-2.5 rounded-xl bg-[#090D16] border border-gray-800 hover:border-gray-700 flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-gray-200 font-bold truncate">
                          <span className="truncate">{src?.label || `Node #${conn.source_node_id}`}</span>
                          <span className="text-cyan-400 shrink-0">➔</span>
                          <span className="truncate">{tgt?.label || `Node #${conn.target_node_id}`}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span className="px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 uppercase">
                            {conn.link_type}
                          </span>
                          <span>Status: {conn.link_status || 'UP'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteConn(conn.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs transition shrink-0"
                        title="Hapus Jalur Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Jalur</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-800">
              <button
                onClick={() => setIsLinksModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
