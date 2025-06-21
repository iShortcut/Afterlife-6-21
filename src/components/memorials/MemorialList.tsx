// src/components/memorials/MemorialList.tsx
import { Memorial } from '../../types'; // Assuming Memorial type is defined
import MemorialCard from './MemorialCard';
import { useAuth } from '../../context/AuthContext'; // Still needed for isOwner prop in MemorialCard
import { motion } from 'framer-motion';
import Button from '../ui/Button';
import { Plus, Users } from 'lucide-react'; // Users icon for empty state

// Props that MemorialList now expects from the "smart" Dashboard.tsx
interface MemorialListProps {
  memorials: Memorial[] | undefined; // *** MODIFIED: Allow memorials to be undefined initially ***
  isLoading: boolean;   // Receives loading state from Dashboard
  onNavigateToCreate: () => void; // For the "Create" button in empty state
  isOwnerView?: boolean; // To pass down to MemorialCard or for specific logic if needed
  className?: string;
}

// Assuming MemorialWithCounts or similar structure is part of your Memorial type if needed by MemorialCard
// If MemorialCard expects tributes_count, ensure it's part of the Memorial type passed from Dashboard
interface MemorialWithPossiblyCounts extends Memorial {
    tributes_count?: number; // Make it optional if not always present or handled differently
    owner?: { id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null; } | null;
}

const MemorialList = ({
  memorials,
  isLoading,
  onNavigateToCreate,
  isOwnerView, // This prop was passed from your new Dashboard.tsx
  className = ''
}: MemorialListProps) => {
  const { user } = useAuth(); // Still potentially useful for logic within MemorialCard (e.g. showing edit buttons)

  // No more internal state for data, search, filters, sort, etc.
  // No more fetchMemorials function or useEffect for fetching.

  if (isLoading) {
    return (
      <div className="p-4 text-center py-10">
        {/* You can use a more sophisticated loader here if you have one */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-slate-500">Loading memorials...</p>
      </div>
    );
  }

  // *** MODIFIED: Check if memorials is undefined OR empty before accessing .length ***
  if (!memorials || memorials.length === 0) { 
    return (
      <div className="text-center py-12 bg-white rounded-lg">
        <Users size={48} className="mx-auto text-slate-400 mb-4" />
        <h3 className="mt-2 text-lg font-medium text-slate-800">No Memorials Found</h3>
        <p className="mt-1 text-sm text-slate-500">
          {!memorials ? "Waiting for data..." : "No memorials currently match the filter criteria."}
        </p>
        {user && (
            <Button
                variant="primary"
                size="sm"
                onClick={onNavigateToCreate}
                className="mt-6"
            >
                <Plus size={16} className="mr-1.5" /> Create Your First Memorial
            </Button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {memorials.map((memorial) => (
        <MemorialCard
          key={memorial.id}
          memorial={memorial as MemorialWithPossiblyCounts} 
          isOwner={user?.id === memorial.owner_id || isOwnerView}
        />
      ))}
    </motion.div>
  );
};

export default MemorialList;