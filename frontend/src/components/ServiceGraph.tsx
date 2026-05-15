'use client';

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface NodeData {
  label: string;
  status: 'healthy' | 'warning' | 'critical';
  error_rate: string;
}

interface ServiceGraphProps {
  data: {
    nodes: any[];
    edges: any[];
  } | null;
}

export default function ServiceGraph({ data }: ServiceGraphProps) {
  const nodes = useMemo(() => {
    if (!data?.nodes) return [];
    return data.nodes.map((node, index) => ({
      id: node.id,
      position: { x: 100 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 150 },
      data: { 
        label: (
          <div className="flex flex-col items-center gap-1 p-2">
            <div className="text-xs font-bold uppercase tracking-wider">{node.label}</div>
            <div className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${
              node.status === 'critical' ? 'bg-red-500 text-white' :
              node.status === 'warning' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              {node.error_rate}
            </div>
          </div>
        )
      },
      style: {
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(8px)',
        borderRadius: '16px',
        border: node.status === 'critical' ? '2px solid #ef4444' : 
                node.status === 'warning' ? '2px solid #f59e0b' : '1px solid rgba(0,0,0,0.1)',
        width: 150,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      },
      type: 'default',
    }));
  }, [data]);

  const edges = useMemo(() => {
    if (!data?.edges) return [];
    return data.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: true,
      label: edge.type === 'dependency' ? '' : edge.type,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b',
      },
      style: { stroke: '#64748b', strokeWidth: 2 },
    }));
  }, [data]);

  if (!data || nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 italic">
        No topology data available for this analysis.
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-[32px] border border-white/20 bg-white/10 backdrop-blur-xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        colorMode="system"
      >
        <Background color="#94a3b8" gap={20} />
        <Controls />
        <Panel position="top-right" className="rounded-xl border border-white/40 bg-white/60 p-2 text-[10px] font-bold backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60">
          SERVICE TOPOLOGY
        </Panel>
      </ReactFlow>
    </div>
  );
}
