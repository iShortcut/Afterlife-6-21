import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // ודא שהנתיב נכון
import { useAuth } from '../../context/AuthContext'; // ודא שהנתיב נכון
import EventList from '../events/EventList';      // ודא שהנתיב נכון
import Button from '../ui/Button';                // ודא שהנתיב נכון

const UpcomingEventsWidget = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true); // התחל כ-true כדי להציג טעינה בפתיחה
  const [error, setError] = useState<string | null>(null);
  // אין צורך לשמור את התוצאה של eventExists ב-state כאן,
  // כי הקומפוננטה EventList אחראית על הצגת האירועים עצמם.
  // המטרה של checkForEvents כאן היא בעיקר לוודא שהקריאה עובדת ולא זורקת שגיאה.

  useEffect(() => {
    const checkForEvents = async () => {
      if (!user || !user.id) { // בדיקה נוספת של user.id למקרה ש-user קיים אך ללא id
        setLoading(false); // אם אין משתמש, אין טעם לטעון
        return;
      }
      
      try {
        setLoading(true); // הגדר טעינה בתחילת הפעולה האסינכרונית
        setError(null);
        
        // Call the RPC function to check for upcoming events
        const { data: eventExists, error: rpcError } = await supabase.rpc(
          'check_upcoming_user_events', // שם פונקציית ה-SQL שיצרנו
          { p_user_id: user.id }         // פרמטרים לפונקציית ה-SQL
        );

        if(rpcError){
          console.error('RPC Error in checkForEvents:', rpcError);
          // במקרה של שגיאה מה-RPC, נזרוק אותה כדי שהיא תיתפס בבלוק ה-catch הכללי
          throw rpcError; 
        }
        
        // כאן אתה יכול להדפיס לקונסול לבדיקה אם תרצה, אך אין צורך בפעולה נוספת עם eventExists
        // מכיוון ש-EventList יטען את האירועים הרלוונטיים באופן עצמאי.
        // console.log('RPC check_upcoming_user_events successful. Event exists:', eventExists);

      } catch (err: any) { // שימוש ב-any כדי לגשת למאפיין message, אפשר להשתמש גם ב-unknown ולבצע בדיקת סוג
        console.error('Error checking for events in UpcomingEventsWidget:', err);
        // הצג הודעת שגיאה כללית, או הודעה ספציפית יותר אם תרצה לנתח את err.message
        setError('Failed to check for upcoming events.');
      } finally {
        setLoading(false);
      }
    };
    
    checkForEvents();
  }, [user]); // ה-useEffect ירוץ מחדש רק אם אובייקט המשתמש משתנה

  // הצגת מצב טעינה
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div> {/* Placeholder for title */}
        <div className="space-y-3">
          <div className="h-12 bg-slate-200 rounded"></div> {/* Placeholder for an event item */}
          <div className="h-12 bg-slate-200 rounded"></div> {/* Placeholder for another event item */}
        </div>
      </div>
    );
  }

  // הצגת הודעת שגיאה אם אירעה כזו
  // שים לב: אם checkForEvents נכשל, EventList עדיין עשוי לנסות לטעון אירועים.
  // ייתכן שתרצה מנגנון שמונע מ-EventList לרוץ אם הייתה שגיאה קריטית ב-checkForEvents,
  // או לחילופין, לא להציג את הודעת השגיאה הזו אם EventList מצליח לטעון אירועים בכל זאת.
  // כרגע, אם checkForEvents נכשל, הודעת השגיאה תופיע, ו-EventList עדיין ינסה לטעון.
  if (error && !user) { // הצג שגיאה רק אם אין משתמש והייתה שגיאה, או החלט לוגיקה אחרת
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Upcoming Events</h2>
        <p className="text-rose-600 text-sm">{error}</p>
      </div>
    );
  }
  
  // אם אין משתמש מחובר, ייתכן שלא נרצה להציג את הווידג'ט כלל, או להציג הודעה אחרת.
  // כרגע, אם אין משתמש, loading יוגדר ל-false מהר, ו-EventList יקבל userId=undefined.
  if (!user) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Upcoming Events</h2>
        <p className="text-slate-500 text-sm">Please log in to see your upcoming events.</p>
      </div>
    )
  }

  // התצוגה הראשית של הווידג'ט
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-700">Upcoming Events</h2>
        <Link to="/events/create">
          <Button size="sm" variant="outline" className="flex items-center gap-1">
            <Plus size={14} />
            <span>Create</span>
          </Button>
        </Link>
      </div>
      
      {/* הקומפוננטה EventList אחראית כעת לטעון ולהציג את האירועים.
        היא תקבל את userId ותטען את האירועים הרלוונטיים (כולל לוגיקת הסינון של creator_id או memorial_id).
        חשוב לוודא שהלוגיקה בתוך EventList מטפלת נכון בשליפת האירועים בהתאם ל-userId.
        הבדיקה שעשינו ב-checkForEvents הייתה בעיקר כדי לוודא שה-RPC עובד ולא זורק את השגיאה המקורית.
      */}
      {error && <p className="text-rose-600 text-sm mb-2">{error}</p>} {/* הצג שגיאה אם קרתה במהלך ה-RPC */}
      
      <EventList 
        userId={user?.id} 
        limit={3} 
        // ייתכן שתצטרך להעביר פרמטרים נוספים ל-EventList
        // או לוודא שהלוגיקה הפנימית שלו לשליפת אירועים
        // תואמת את מה שניסינו להשיג ב-RPC (יוצר או בעלים של memorial מקושר).
      />
    </div>
  );
};

export default UpcomingEventsWidget;