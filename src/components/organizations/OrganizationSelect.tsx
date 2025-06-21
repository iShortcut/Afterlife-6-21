import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Organization } from '../../types';
import { useAuth } from '../../context/AuthContext'; // <-- Step 1: Import useAuth

interface OrganizationSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  label?: string; // Added optional label prop
  placeholder?: string; // Added optional placeholder prop
  helpText?: string; // Added optional help text prop
  required?: boolean; // Added optional required prop
  disabled?: boolean; // Added optional disabled prop
}

const OrganizationSelect = ({ 
  value, 
  onChange, 
  className = '',
  label = 'Organization', // Default label
  placeholder = 'Select an organization', // Default placeholder
  helpText = 'Optional: Associate this with an organization you belong to.', // Default help text
  required = false,
  disabled = false
}: OrganizationSelectProps) => {
  
  const { user } = useAuth(); // <-- Step 2: Get user from context
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      // <-- Step 3: Check if user is available before proceeding
      if (!user) {
        setOrganizations([]); // Clear organizations if no user is logged in
        setLoading(false);
        // setError("Please log in to see organizations."); // Optionally set an error
        return; // Exit early if no user
      }

      try {
        setLoading(true);
        setError(null);

        // Get organization IDs where the current user is a member
        const { data: memberships, error: membershipError } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id); // <-- Step 4: Use user.id from the context

        if (membershipError) {
           console.error('Error fetching memberships:', membershipError);
           throw new Error('Failed to fetch your organization memberships.'); // Throw a more descriptive error
        }

        // Handle case where user is not a member of any organization
        const orgIds = memberships?.map(m => m.organization_id) || [];
        if (orgIds.length === 0) {
          setOrganizations([]);
          setLoading(false); // Ensure loading is set to false
          return; // Exit early
        }

        // Get details for the organizations the user is a member of
        const { data: orgs, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name') // Select only needed fields
          .in('id', orgIds)
          .order('name'); // Order alphabetically by name

        if (orgsError) {
           console.error('Error fetching organization details:', orgsError);
           throw new Error('Failed to load organization details.'); // Throw descriptive error
        }
        
        setOrganizations(orgs || []); // Set the fetched organizations

      } catch (err: any) { // Catch any error from the try block
        console.error('Error fetching organizations:', err);
        setError(err.message || 'Failed to load organizations'); // Set error state message
      } finally {
        setLoading(false); // Ensure loading is always set to false
      }
    };

    fetchOrganizations();
  }, [user]); // <-- Step 5: Add user as dependency to re-run useEffect if user changes

  // --- Render Logic ---

  // Loading State (Improved Skeleton)
  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        {label && <div className="block text-sm font-medium text-slate-700 mb-1 h-5 bg-slate-200 rounded w-1/4" />}
        <div className="h-10 bg-slate-200 rounded w-full" />
        {helpText && <div className="mt-1 text-sm text-slate-500 h-4 bg-slate-200 rounded w-3/4" />}
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={`text-sm text-rose-600 border border-rose-200 bg-rose-50 p-3 rounded ${className}`}>
         <strong>Error:</strong> {error}
      </div>
    );
  }

  // No organizations available for the user (and not loading/error)
  // For a dropdown, often rendering the dropdown with only the placeholder is sufficient.
  // if (organizations.length === 0) {
  //   return (
  //     <div className={`text-sm text-slate-500 italic ${className}`}>
  //       You are not a member of any organizations.
  //     </div>
  //   );
  // }

  // Render the Select Dropdown
  return (
    <div className={className}>
      {label && (
        <label htmlFor="organization-select" className="block text-sm font-medium text-slate-700 mb-1">
          {label}{required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <select
        id="organization-select" // Added id for label association
        value={value || ''} // Ensure value is controlled, default to empty string if null
        onChange={(e) => onChange(e.target.value || null)} // Pass null if empty string selected
        required={required}
        disabled={disabled || loading || organizations.length === 0} // Disable if loading or no orgs
        className={`w-full px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md text-sm
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                    disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none
                    ${error ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-500' : ''}
                  `}
      >
        {/* Improved placeholder handling */}
        <option value="" disabled={required}>
          {organizations.length > 0 ? placeholder : "No organizations available"} 
        </option>
        
        {organizations.map(org => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
      {helpText && (
        <p className="mt-1 text-xs text-slate-500"> {/* Adjusted text size */}
          {helpText}
        </p>
      )}
    </div>
  );
};

export default OrganizationSelect;