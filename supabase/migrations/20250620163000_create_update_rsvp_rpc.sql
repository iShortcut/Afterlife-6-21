-- פונקציה זו מרכזת את לוגיקת עדכון הסטטוס
-- היא רצה עם הרשאות המגדיר (SECURITY DEFINER) אך מוודאת שהשינוי חל רק על המשתמש המאומת
CREATE OR REPLACE FUNCTION public.update_event_attendee_status(
  event_id_input uuid,
  new_status rsvp_status
)
RETURNS void -- הפונקציה לא מחזירה ערך
LANGUAGE plpgsql
SECURITY DEFINER -- רץ עם הרשאות גבוהות יותר, אך הלוגיקה הפנימית מאבטחת אותו
SET search_path = public -- מבטיח שהפונקציה תמצא את הטבלאות בסכמה הנכונה
AS $$
BEGIN
  -- עדכון הסטטוס בטבלת event_attendees
  UPDATE event_attendees
  SET
    status = new_status,
    responded_at = now() -- עדכון שדה זמן התגובה
  WHERE
    event_id = event_id_input AND user_id = auth.uid(); -- הגבלה למשתמש הנוכחי ולאירוע הספציפי
END;
$$;