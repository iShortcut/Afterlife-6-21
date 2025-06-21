import { ExternalLink, Mail, MapPin, Calendar, Globe, Link as LinkIcon } from 'lucide-react';
import { Profile } from '../../types';
import { format } from 'date-fns';

interface UserProfileViewProps {
  profile: Profile;
}

const UserProfileView = ({ profile }: UserProfileViewProps) => {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-slate-800 mb-4 border-b pb-2">Basic Information</h3>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <span className="text-sm font-medium text-slate-500 w-32">Full Name</span>
            <span className="text-slate-700">{profile.full_name || 'Not provided'}</span>
          </div>
          
          {profile.username && (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-sm font-medium text-slate-500 w-32">Username</span>
              <span className="text-slate-700">@{profile.username}</span>
            </div>
          )}
          
          {profile.birth_date && (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-sm font-medium text-slate-500 w-32">Birth Date</span>
              <span className="text-slate-700 flex items-center gap-1.5">
                <Calendar size={16} className="text-slate-400" />
                {format(new Date(profile.birth_date), 'MMMM d, yyyy')}
              </span>
            </div>
          )}
          
          {profile.location && (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-sm font-medium text-slate-500 w-32">Location</span>
              <span className="text-slate-700 flex items-center gap-1.5">
                <MapPin size={16} className="text-slate-400" />
                {profile.location}
              </span>
            </div>
          )}
          
          {profile.phone_number && (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-sm font-medium text-slate-500 w-32">Phone</span>
              <span className="text-slate-700">{profile.phone_number}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Bio */}
      {profile.bio && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4 border-b pb-2">About Me</h3>
          <p className="text-slate-700 whitespace-pre-line">{profile.bio}</p>
        </div>
      )}
      
      {/* Online Presence */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-slate-800 mb-4 border-b pb-2">Online Presence</h3>
        
        <div className="space-y-4">
          {profile.website && (
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-sm font-medium text-slate-500 w-32">Website</span>
              <a 
                href={profile.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
              >
                <Globe size={16} />
                {profile.website}
              </a>
            </div>
          )}
          
          {profile.external_links && profile.external_links.length > 0 && (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-500 mb-2">External Links</span>
              <div className="space-y-2 ml-0 sm:ml-32 -mt-2 sm:mt-0">
                {profile.external_links.map((link, index) => (
                  <a 
                    key={index}
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
                  >
                    <ExternalLink size={16} />
                    <span>{link.type || 'Link'}: {link.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {!profile.website && (!profile.external_links || profile.external_links.length === 0) && (
            <p className="text-slate-500 italic">No online presence information provided.</p>
          )}
        </div>
      </div>
      
      {/* Privacy Settings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-slate-800 mb-4 border-b pb-2">Privacy Settings</h3>
        
        <div className="flex flex-col sm:flex-row sm:items-center">
          <span className="text-sm font-medium text-slate-500 w-32">Profile Visibility</span>
          <span className="text-slate-700 capitalize">{profile.visibility || 'public'}</span>
        </div>
      </div>
    </div>
  );
};

export default UserProfileView;