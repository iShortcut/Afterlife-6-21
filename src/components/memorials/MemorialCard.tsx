import { Link } from 'react-router-dom';
import { Edit, Lock, Eye } from 'lucide-react';
import { format } from 'date-fns'; // Ensure date-fns is installed
import { Memorial } from '../../types'; // Assuming your types are here

interface MemorialCardProps {
  memorial: Memorial; // Assuming Memorial type includes tributes_count, is_public
  isOwner?: boolean;
}

const MemorialCard = ({ memorial, isOwner = false }: MemorialCardProps) => {
  // Log to check the received props, especially isOwner
  console.log(`MemorialCard - ID: ${memorial.id}, Title: ${memorial.title}, isOwner prop: ${isOwner}`);

  const formattedLifespan = () => {
    const birthDate = memorial.birth_date ? new Date(memorial.birth_date) : null;
    const deathDate = memorial.death_date ? new Date(memorial.death_date) : null;
    
    const birthYear = birthDate && !isNaN(birthDate.getFullYear()) ? birthDate.getFullYear() : '?';
    const deathYear = deathDate && !isNaN(deathDate.getFullYear()) ? deathDate.getFullYear() : '?';
    
    if (birthYear === '?' && deathYear === '?') return 'Dates not specified';
    return `${birthYear} - ${deathYear}`;
  };

  const defaultCoverImage = "https://images.pexels.com/photos/19294922/pexels-photo-19294922.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1";
  const defaultProfileImage = "https://images.pexels.com/photos/19721600/pexels-photo-19721600.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1";

  // Defensive check for tributes_count if it might be missing from the Memorial type/data
  const tributesCount = (memorial as any).tributes_count !== undefined ? (memorial as any).tributes_count : 0;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div 
        className="h-32 bg-cover bg-center"
        style={{ backgroundImage: `url(${memorial.cover_image_url || defaultCoverImage})` }}
        role="img"
        aria-label={`${memorial.title || 'Memorial'} cover image`}
      />
      
      <div className="px-4 pt-10 pb-4 relative">
        <div className="absolute -top-10 left-4">
          <div 
            className="w-20 h-20 rounded-full border-4 border-white bg-cover bg-center shadow-sm" // Added shadow-sm
            style={{ backgroundImage: `url(${memorial.profile_image_url || defaultProfileImage})` }}
            role="img"
            aria-label={`${memorial.title || 'Memorial'} profile image`}
          />
        </div>
        
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-serif font-medium text-slate-800 line-clamp-1" title={memorial.title}>
            {memorial.title || 'Untitled Memorial'}
          </h3>
          
          {/* Assuming memorial.visibility exists and is of type 'public' | 'private' | 'friends_only' */}
          {memorial.visibility && memorial.visibility !== 'public' && (
            <Lock size={16} className="text-slate-500 flex-shrink-0" aria-label={`${memorial.visibility} memorial`} />
          )}
        </div>
        
        <p className="text-sm text-slate-500 mb-3">{formattedLifespan()}</p>
        
        <p className="text-sm text-slate-600 line-clamp-2 mb-4 h-10"> {/* Added fixed height for 2 lines */}
          {memorial.bio || 'No biography available.'}
        </p>
        
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
          <div className="text-xs text-slate-500">
            {tributesCount} {tributesCount === 1 ? 'tribute' : 'tributes'}
          </div>
          
          <div className="flex gap-2">
            {isOwner && (
              <Link 
                to={`/edit-memorial/${memorial.id}`}
                onClick={(e) => { 
                  // e.preventDefault(); // Uncomment this if you want to PREVENT navigation for debugging the click
                  console.log(`Edit button clicked for memorial ID: ${memorial.id}, Title: ${memorial.title}`); 
                }}
                className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 text-sm"
                aria-label={`Edit memorial ${memorial.title || ''}`}
              >
                <Edit size={14} aria-hidden="true" />
                <span>Edit</span>
              </Link>
            )}
            
            <Link 
              to={`/memorials/${memorial.id}`}
              className="text-slate-600 hover:text-slate-800 transition-colors flex items-center gap-1 text-sm"
              aria-label={`View memorial ${memorial.title || ''}`}
            >
              <Eye size={14} aria-hidden="true" />
              <span>View</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemorialCard;