import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionLineType,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { User, Loader2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

interface FamilyTreeProps {
  memorialId: string;
  isOwner?: boolean;
  className?: string;
}

interface FamilyMember {
  id: string;
  first_name: string;
  last_name: string | null;
  birth_date: string | null;
  death_date: string | null;
  avatar_url: string | null;
}

interface FamilyRelationship {
  id: string;
  member1_id: string;
  member2_id: string;
  relationship_type: 'PARENT_CHILD' | 'SPOUSE' | 'SIBLING';
  start_date: string | null;
  end_date: string | null;
}

// Custom node component for family members
const FamilyMemberNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-3 border border-slate-200 min-w-[180px]">
      <div className="flex items-center gap-3">
        {data.avatar_url ? (
          <img
            src={data.avatar_url}
            alt={data.label}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <User size={20} className="text-indigo-500" />
          </div>
        )}
        <div className="flex-grow">
          <div className="font-medium text-slate-800 text-sm">{data.label}</div>
          {data.dates && (
            <div className="text-xs text-slate-500">{data.dates}</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Node types definition
const nodeTypes = {
  familyMember: FamilyMemberNode,
};

const FamilyTree = ({ memorialId, isOwner = false, className = '' }: FamilyTreeProps) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetchFamilyData = async () => {
    try {
      setLoading(true);
      
      // Fetch family members
      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select('*')
        .eq('memorial_id', memorialId)
        .order('birth_date', { ascending: true });
        
      if (membersError) throw membersError;

      // Fetch relationships
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('family_relationships')
        .select('*')
        .eq('memorial_id', memorialId);
        
      if (relationshipsError) throw relationshipsError;
      
      setMembers(membersData || []);
      setRelationships(relationshipsData || []);
    } catch (err) {
      console.error('Error fetching family data:', err);
      setError('Failed to load family tree data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyData();
    
    // Subscribe to changes
    const channel = supabase
      .channel(`memorial-${memorialId}-family`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_members',
          filter: `memorial_id=eq.${memorialId}`
        },
        () => {
          fetchFamilyData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_relationships',
          filter: `memorial_id=eq.${memorialId}`
        },
        () => {
          fetchFamilyData();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [memorialId]);

  // Convert data to React Flow format
  useEffect(() => {
    if (members.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Create nodes from family members
    const flowNodes: Node[] = members.map((member, index) => {
      // Format dates for display
      const birthDate = member.birth_date ? format(new Date(member.birth_date), 'yyyy') : '?';
      const deathDate = member.death_date ? format(new Date(member.death_date), 'yyyy') : '';
      const dateString = deathDate ? `${birthDate} - ${deathDate}` : birthDate;

      return {
        id: member.id,
        type: 'familyMember',
        position: { 
          x: 100 + (index % 3) * 250, 
          y: 100 + Math.floor(index / 3) * 150 
        },
        data: {
          label: `${member.first_name} ${member.last_name || ''}`,
          dates: dateString,
          avatar_url: member.avatar_url,
          birth_date: member.birth_date,
          death_date: member.death_date
        }
      };
    });

    // Create edges from relationships
    const flowEdges: Edge[] = relationships.map((rel) => {
      let label = '';
      let edgeType = '';
      
      switch (rel.relationship_type) {
        case 'PARENT_CHILD':
          label = 'Parent';
          edgeType = 'smoothstep';
          break;
        case 'SPOUSE':
          label = 'Spouse';
          edgeType = 'straight';
          break;
        case 'SIBLING':
          label = 'Sibling';
          edgeType = 'default';
          break;
      }

      return {
        id: rel.id,
        source: rel.member1_id,
        target: rel.member2_id,
        label,
        type: edgeType as ConnectionLineType,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: '#64748b',
        },
        style: {
          strokeWidth: 2,
          stroke: '#64748b',
        },
        labelStyle: {
          fill: '#64748b',
          fontWeight: 500,
          fontSize: 12,
        },
        labelBgStyle: {
          fill: '#f8fafc',
        },
      };
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [members, relationships, setNodes, setEdges]);

  const onLayout = useCallback(() => {
    // Simple auto-layout algorithm
    const newNodes = [...nodes];
    
    // Group members by generation (approximated by birth date)
    const generations: Record<string, Node[]> = {};
    
    newNodes.forEach(node => {
      const birthYear = node.data.birth_date 
        ? new Date(node.data.birth_date).getFullYear().toString().slice(0, 3) + '0' // Group by decade
        : 'unknown';
      
      if (!generations[birthYear]) {
        generations[birthYear] = [];
      }
      
      generations[birthYear].push(node);
    });
    
    // Sort generations by year
    const sortedGenerations = Object.keys(generations).sort();
    
    // Position nodes by generation
    let yPos = 50;
    sortedGenerations.forEach(gen => {
      const genNodes = generations[gen];
      const xStep = Math.max(200, 1000 / (genNodes.length + 1));
      
      genNodes.forEach((node, i) => {
        const nodeIndex = newNodes.findIndex(n => n.id === node.id);
        if (nodeIndex !== -1) {
          newNodes[nodeIndex] = {
            ...newNodes[nodeIndex],
            position: {
              x: 50 + (i + 1) * xStep,
              y: yPos
            }
          };
        }
      });
      
      yPos += 150;
    });
    
    setNodes(newNodes);
  }, [nodes, setNodes]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-80 bg-white rounded-lg shadow-sm ${className}`}>
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="ml-2 text-slate-600">Loading family tree...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg ${className}`}>
        {error}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className={`text-center py-8 bg-white rounded-lg shadow-sm ${className}`}>
        <User className="mx-auto h-12 w-12 text-slate-300 mb-2" />
        <p className="text-slate-600">No family members added yet</p>
        {isOwner && (
          <p className="text-sm text-indigo-600 mt-2">
            Add family members to build the family tree
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      <div style={{ height: 500 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
        >
          <Controls />
          <Background />
          <Panel position="top-right">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onLayout}
                className="flex items-center gap-1"
              >
                <RefreshCw size={14} />
                <span>Auto Layout</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchFamilyData()}
                className="flex items-center gap-1"
              >
                <RefreshCw size={14} />
                <span>Refresh</span>
              </Button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

export default FamilyTree;