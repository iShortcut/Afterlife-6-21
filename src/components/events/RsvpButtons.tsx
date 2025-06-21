// File: src/components/events/RsvpButtons.tsx
// Last Updated: 2025-06-20, 14:15 (Fixed RSVP icon size and button padding)
// Task: Implement icon-based RSVP controls as per user's specific request for Line 1.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
// ייבוא אייקונים עבור פקדי RSVP
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import clsx from 'clsx'; // לניהול קלאסים מותנים

interface RsvpButtonsProps {
  eventId: string;
  onRsvpUpdated?: () => void; // קריאה חוזרת לרענון נתונים באב
}

// *** תיקון קריטי כאן: יישור עם ערכי ה-ENUM בבסיס הנתונים ***
type RsvpStatus = 'accepted' | 'maybe' | 'declined';

const RsvpButtons: React.FC<RsvpButtonsProps> = ({ eventId, onRsvpUpdated }) => {
  const { user } = useAuth();
  const [currentRsvp, setCurrentRsvp] = useState<RsvpStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // פונקציה לשליפת ה-RSVP הנוכחי של המשתמש
  const fetchUserRsvp = useCallback(async () => {
    if (!user || !eventId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('status')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }
      // וודא שהסטטוס שמגיע מה-DB תואם ל-RsvpStatus
      setCurrentRsvp(data ? (data.status as RsvpStatus) : null);
    } catch (err: any) {
      console.error('Error fetching user RSVP:', err.message);
      toast.error('Failed to load your RSVP status.');
    } finally {
      setLoading(false);
    }
  }, [user, eventId]);

  useEffect(() => {
    fetchUserRsvp();
  }, [fetchUserRsvp]);

  const handleRsvp = async (status: RsvpStatus) => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('event_attendees')
        .upsert(
          { event_id: eventId, user_id: user.id, status: status },
          { onConflict: 'event_id,user_id' } // וודא שיש unique constraint ב-DB על event_id ו-user_id
        );

      if (error) {
        // טיפול ספציפי בשגיאות ENUM מבסיס הנתונים
        if (error.message.includes("invalid input value for enum rsvp_status")) {
            console.error("Supabase ENUM error:", error.message);
            toast.error(`RSVP update failed: Invalid status. Please contact support if this persists.`);
        } else {
            throw error; // זרוק כל שגיאה אחרת לטיפול כללי
        }
        return;
      }

      setCurrentRsvp(status); // עדכון הסטייט המקומי מיד
      
      // *** שינוי כאן: הצגת הודעה ידידותית למשתמש על בסיס הסטטוס ***
      const displayStatusText = status === 'accepted' ? 'Going' : status === 'declined' ? 'Not Going' : 'Maybe';
      toast.success(`RSVP updated to ${displayStatusText}!`);
      
      onRsvpUpdated?.(); // קריאה חוזרת לרענון נתונים באב (EventDetailsPage)
    } catch (err: any) {
      console.error('Error updating RSVP:', err.message);
      toast.error('Failed to update RSVP. An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // *** תיקון קריטי כאן: יישור הסטטוסים של האייקונים עם ה-ENUM של בסיס הנתונים ***
  const icons = [
    { status: 'accepted' as RsvpStatus, Icon: CheckCircle2, label: 'Going', colorClass: 'text-green-500' },
    { status: 'maybe' as RsvpStatus, Icon: HelpCircle, label: 'Maybe', colorClass: 'text-yellow-500' },
    { status: 'declined' as RsvpStatus, Icon: XCircle, label: 'Not Going', colorClass: 'text-red-500' },
  ];

  return (
    <div className="flex items-center gap-2">
      {icons.map(({ status, Icon, label, colorClass }) => (
        <button
          key={status}
          onClick={() => handleRsvp(status)}
          disabled={loading}
          className={clsx(
            'p-1.5 rounded-full transition-colors flex items-center justify-center', // зменתי p-2 ל-p-1.5
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700',
            currentRsvp === status // הדגשה אם זה הסטטוס הנבחר
              ? `${colorClass} bg-opacity-20 bg-current` // צבעוני עם רקע שקוף קלות
              : 'text-slate-500 dark:text-slate-400' // צבע ברירת מחדל לא פעיל
          )}
          title={label}
        >
          <Icon size={20} className={colorClass} /> {/* הקטנתי size={24} ל-size={20} */}
        </button>
      ))}
    </div>
  );
};

export default RsvpButtons;