import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import AddFriendButton from '../friends/AddFriendButton';
import StartChatButton from './StartChatButton';

interface UserProfileCardProps {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  showAddFriend?: boolean;
  showStartChat?: boolean;
  className?: string;
}

const UserProfileCard = ({
  id,
  full_name,
  username,
  avatar_url,
  bio,
  showAddFriend = true,
  showStartChat = true,
  className = ''
}: UserProfileCardProps) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={full_name || username || 'User'}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <User size={32} className="text-indigo-500" />
            </div>
          )}
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link 
                to={`/users/${id}`}
                className="hover:text-indigo-600 transition-colors"
              >
                <h3 className="font-medium text-slate-800 truncate">
                  {full_name || 'Anonymous'}
                </h3>
              </Link>
              
              {username && (
                <p className="text-sm text-slate-500 truncate">
                  @{username}
                </p>
              )}
            </div>

            <div className="flex flex-shrink-0 gap-2">
              {showStartChat && (
                <StartChatButton userId={id} />
              )}
              
              {showAddFriend && (
                <AddFriendButton profileUserId={id} />
              )}
            </div>
          </div>

          {bio && (
            <p className="mt-2 text-sm text-slate-600 line-clamp-2">
              {bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard;