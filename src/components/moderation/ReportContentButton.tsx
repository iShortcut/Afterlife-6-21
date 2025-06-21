import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import ReportContentModal from './ReportContentModal';

interface ReportContentButtonProps {
  contentType: 'POST' | 'COMMENT' | 'TRIBUTE' | 'MEMORIAL' | 'PROFILE';
  contentId: string;
  reportedUserId?: string;
  variant?: 'button' | 'menu-item';
  className?: string;
}

const ReportContentButton = ({
  contentType,
  contentId,
  reportedUserId,
  variant = 'button',
  className = ''
}: ReportContentButtonProps) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (!user) return null;

  if (variant === 'menu-item') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-slate-100 flex items-center gap-2 ${className}`}
        >
          <Flag size={16} />
          <span>Report</span>
        </button>

        {showModal && (
          <ReportContentModal
            contentType={contentType}
            contentId={contentId}
            reportedUserId={reportedUserId}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        variant="outline"
        size="sm"
        className={`flex items-center gap-2 text-rose-600 ${className}`}
      >
        <Flag size={16} />
        <span>Report</span>
      </Button>

      {showModal && (
        <ReportContentModal
          contentType={contentType}
          contentId={contentId}
          reportedUserId={reportedUserId}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default ReportContentButton;